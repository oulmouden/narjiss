"""
Agent IA vocal — hôtesse d'accueil du bureau de vente Narjiss Immobilière.

Rejoint les rooms « bureau-<projet>-<lang>-<rand> » (accueil virtuel du bureau
de vente d'un projet), accueille le visiteur et le guide vocalement. Peut
transmettre une demande de rendez-vous / de rappel (outil demander_rendezvous).

Le préfixe « bureau- » est propre à narjiss : l'agent de Domiciliation écoute
« accueil- ». Les deux peuvent donc tourner en même temps sur le même serveur
LiveKit sans se voler les visiteurs.

Prérequis : LiveKit local en marche + OPENAI_API_KEY dans api/.env.
Lancer :   python agent.py dev      (mode auto-dispatch : rejoint les nouvelles rooms)
           python agent.py console  (test micro/haut-parleur en terminal)
"""
import os, sys, json, urllib.request, urllib.parse
# Console Windows en UTF-8 : évite les « Logging error » quand on journalise
# de l'arabe / darija (cp1252 ne peut pas les encoder).
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, RoomInputOptions, function_tool, RunContext
from livekit.plugins import openai, silero

load_dotenv()
APP_URL = os.environ.get("APP_URL", "http://localhost/narjiss")

ROOM_PREFIX = "bureau-"

INSTRUCTIONS = (
    "Tu es l'hôtesse d'accueil virtuelle du bureau de vente du projet immobilier "
    "« {project} », à {city}, au Maroc, commercialisé par Narjiss Immobilière. "
    "Le visiteur est en train de parcourir la visite virtuelle 360° du bureau de vente. "
    "Accueille-le {lang}, puis adapte-toi : réponds TOUJOURS dans la langue qu'il emploie, "
    "en changeant en cours de conversation s'il en change. S'il mélange le français et l'arabe "
    "marocain — usage courant au Maroc — fais de même, naturellement. "
    "Réponds avec chaleur et concision (2 à 3 phrases maximum). "
    "Ton projet d'accueil est « {project} », mais tu connais TOUTE l'offre de Narjiss "
    "Immobilière : la section « CATALOGUE » ci-dessous liste l'ensemble des projets avec "
    "leur ville, leur type de bien, leur avancement, leurs typologies (surfaces, nombre de "
    "pièces, unités encore disponibles), leur date de livraison, leurs équipements et les "
    "POINTS D'INTÉRÊT proches (repères marquants comme l'aéroport, la plage ou l'hôpital, et "
    "le décompte des commodités du quartier : écoles, pharmacies, banques, transports…). "
    "Appuie-toi UNIQUEMENT sur ces données ; n'invente jamais un projet, une surface ou une "
    "disponibilité qui n'y figure pas. "
    "Tu peux : présenter « {project} » et son emplacement ; citer et comparer les AUTRES "
    "projets Narjiss quand on te le demande (« quels projets avez-vous ? », « avez-vous des "
    "terrains ? », « un autre projet à Agadir ? ») ; détailler les types de biens, les "
    "surfaces, les typologies, la disponibilité, la date de livraison et les équipements ; "
    "décrire le quartier et les commodités alentour de N'IMPORTE lequel des projets à partir "
    "des points d'intérêt du CATALOGUE (repères marquants et décompte des commodités) ; "
    "inviter à poursuivre la visite virtuelle, à consulter la brochure, ou à venir sur place. "
    "Quand on te demande la liste des projets, donne-la à l'oral de façon fluide et brève "
    "(les noms, éventuellement regroupés par ville ou par type) plutôt qu'une longue "
    "énumération de fiches ; propose ensuite d'en détailler un. "
    "Si le visiteur veut parler MAINTENANT à un commercial (par ex. « je veux parler "
    "à Rachid » ou « un conseiller est-il là ? »), demande-lui son prénom, puis appelle "
    "l'outil demander_conseiller (avec le nom du commercial s'il en cite un). "
    "Selon la réponse : si le commercial est prévenu, dis au visiteur de patienter un "
    "instant puis de te redemander son code d'accès — que tu obtiens avec l'outil "
    "obtenir_code_acces et que tu lui dictes chiffre par chiffre. S'il n'y a personne "
    "de disponible, propose plutôt un rappel via demander_rendezvous. "
    "Si le visiteur veut seulement un rendez-vous ou être rappelé plus tard, "
    "demande-lui son nom et son téléphone (ou son e-mail), puis appelle l'outil "
    "demander_rendezvous. "
    "SEULE EXCEPTION à ce que tu peux dire : les PRIX. Ne cite JAMAIS de prix ni "
    "d'estimation de tarif — ils sont communiqués sur demande par un conseiller. Sur les "
    "prix, propose un rappel via demander_rendezvous. Ne promets rien d'autre. Reste naturelle."
)

GREETINGS = {
    "fr": "Bienvenue au bureau de vente de {project} ! Je suis l'hôtesse d'accueil virtuelle. Comment puis-je vous aider ?",
    "en": "Welcome to the {project} sales office! I'm the virtual receptionist. How can I help you?",
    "es": "¡Bienvenido a la oficina de venta de {project}! Soy la recepcionista virtual. ¿En qué puedo ayudarle?",
    "ar": "مرحباً بكم في مكتب بيع {project}! أنا موظفة الاستقبال الافتراضية. كيف يمكنني مساعدتكم؟",
    "darija": "مرحبا بيكم فـ مكتب البيع ديال {project}! أنا موظفة الاستقبال. كيفاش نقدر نعاونكم؟",
}
LANG_LABEL = {
    "fr": "en français", "en": "in English", "es": "en español",
    "ar": "بالعربية الفصحى",
    "darija": "بالدارجة المغربية (اللهجة المغربية العامية، بالحروف العربية)",
}


def project_info(project_id: str):
    """Récupère (nom du projet, ville) depuis l'API PHP."""
    try:
        url = f"{APP_URL}/api/project-info.php?id={urllib.parse.quote(project_id)}"
        with urllib.request.urlopen(url, timeout=6) as r:
            d = json.loads(r.read().decode())
        return d.get("name") or "notre projet", d.get("city") or "Agadir"
    except Exception as e:
        print("[project-info] err:", e)
        return "notre projet", "Agadir"


# Types de biens et statuts d'avancement rendus en clair pour l'hôtesse.
_TYPE_LABEL = {
    "appartements": "appartements", "appartement": "appartements",
    "villas": "villas", "villa": "villas",
    "terrains": "terrains", "terrain": "terrains",
    "commerces": "commerces", "bureaux": "bureaux",
}
_STATE_LABEL = {
    "en-construction": "en construction", "livre": "livré", "livré": "livré",
    "termine": "terminé", "a-venir": "à venir", "planifie": "planifié",
}


def _catalog_line(p: dict) -> str:
    """Une ligne compacte, lisible à l'oral, décrivant un projet du catalogue."""
    name = (p.get("name") or {}).get("fr") or p.get("id") or "Projet"
    bits = [name]

    city = p.get("city") or p.get("location") or ""
    if city:
        bits.append(f"à {city}")

    typ = _TYPE_LABEL.get((p.get("type") or "").lower(), p.get("type") or "")
    if typ:
        bits.append(typ)

    if p.get("standing"):
        bits.append(str(p["standing"]).replace("-", " "))

    deliv = p.get("delivery") or {}
    if deliv.get("date") or deliv.get("state"):
        state = _STATE_LABEL.get((deliv.get("state") or "").lower(), deliv.get("state") or "")
        when = " ".join(x for x in [state, f"livraison {deliv['date']}" if deliv.get("date") else ""] if x).strip()
        if when:
            bits.append(when)

    # Typologies : label (surfaces m², disponibilité)
    typos = []
    for t in (p.get("typologies") or []):
        seg = t.get("label") or ""
        smin, smax = t.get("surface_min"), t.get("surface_max")
        if smin and smax:
            seg += f" {smin}-{smax} m²"
        elif smin:
            seg += f" {smin} m²"
        avail = t.get("units_available")
        if avail is not None:
            seg += f", {avail} dispo" if avail else ", complet"
        if seg.strip():
            typos.append(seg.strip())
    if typos:
        bits.append("typologies : " + " ; ".join(typos))

    feats = p.get("features") or []
    if feats:
        bits.append("équipements : " + ", ".join(str(f).replace("-", " ") for f in feats[:8]))

    if p.get("has_tour"):
        bits.append("visite 360° disponible")

    # POI proches : repères marquants + commodités du quartier (décompte).
    pois = p.get("pois") or {}
    landmarks = pois.get("landmarks") or []
    if landmarks:
        bits.append("à proximité : " + " ; ".join(landmarks[:6]))
    counts = pois.get("counts") or {}
    if counts:
        top = list(counts.items())[:6]
        bits.append("commodités du quartier : " + ", ".join(f"{n} {label}" for label, n in top))

    return "- " + " — ".join(bits) + "."


def projects_catalog() -> str:
    """Catalogue complet (tous les projets Narjiss) formaté pour le prompt.

    Renvoie une chaîne vide en cas d'échec : l'hôtesse retombe alors sur son
    seul projet d'accueil, sans planter.
    """
    try:
        url = f"{APP_URL}/api/projects-list.php"
        with urllib.request.urlopen(url, timeout=8) as r:
            raw = r.read().decode()
        # Tolère un éventuel préambule (avertissement PHP) avant le JSON.
        projects = json.loads(raw[raw.index("["):])
    except Exception as e:
        print("[projects-list] err:", e)
        return ""
    if not isinstance(projects, list) or not projects:
        return ""
    lines = [_catalog_line(p) for p in projects]
    return (
        "\n\nCATALOGUE — projets actuellement commercialisés par Narjiss Immobilière "
        f"({len(lines)} projets) :\n" + "\n".join(lines)
    )


class ReceptionAgent(Agent):
    def __init__(self, instructions: str, project_id: str):
        super().__init__(instructions=instructions)
        self.project_id = project_id

    @function_tool()
    async def demander_rendezvous(self, context: RunContext, nom: str, telephone: str = "",
                                  email: str = "", sujet: str = ""):
        """Transmet à Narjiss Immobilière une demande de rendez-vous ou de rappel.

        Args:
            nom: le nom du visiteur
            telephone: son numéro de téléphone (optionnel)
            email: son adresse e-mail (optionnel)
            sujet: l'objet de la demande (optionnel)
        """
        try:
            payload = urllib.parse.urlencode({
                "projet": self.project_id,
                "nom": nom or "Visiteur",
                "telephone": telephone or "",
                "email": email or "",
                "sujet": sujet or "",
            }).encode()
            req = urllib.request.Request(f"{APP_URL}/api/rendezvous.php", data=payload)
            with urllib.request.urlopen(req, timeout=8) as r:
                res = json.loads(r.read().decode())
            if res.get("ok"):
                return ("C'est noté, votre demande est transmise à Narjiss Immobilière, "
                        "un conseiller vous recontactera. Souhaitez-vous autre chose ?")
            return ("Je n'ai pas réussi à transmettre la demande à l'instant. "
                    "Vous pouvez aussi utiliser le bouton « Prendre rendez-vous » à l'écran.")
        except Exception as e:
            print("[demander_rendezvous] err:", e)
            return ("Désolée, la transmission a échoué. Le bouton « Prendre rendez-vous » "
                    "à l'écran reste disponible.")

    @function_tool()
    async def demander_conseiller(self, context: RunContext, nom_visiteur: str,
                                  conseiller: str = ""):
        """Prévient un commercial du bureau qu'un visiteur souhaite lui parler en direct.

        Vérifie d'abord que le commercial est bien connecté / présent. Ne crée la
        demande que dans ce cas ; sinon, invite à laisser un rendez-vous.

        Args:
            nom_visiteur: le prénom du visiteur présent dans la visite
            conseiller: le nom du commercial demandé (optionnel ; vide = n'importe lequel)
        """
        try:
            payload = urllib.parse.urlencode({
                "action": "create",
                "projet": self.project_id,
                "visitor": nom_visiteur or "Visiteur",
                "conseiller": conseiller or "",
            }).encode()
            req = urllib.request.Request(f"{APP_URL}/api/agent-access.php", data=payload)
            with urllib.request.urlopen(req, timeout=8) as r:
                res = json.loads(r.read().decode())
        except Exception as e:
            print("[demander_conseiller] err:", e)
            return ("Je n'arrive pas à joindre l'équipe commerciale pour l'instant. "
                    "Souhaitez-vous que je note une demande de rappel ?")

        if not res.get("found"):
            if conseiller:
                return (f"Je ne trouve pas de commercial au nom de « {conseiller} » pour ce "
                        "bureau. Voulez-vous parler à un autre conseiller, ou être rappelé ?")
            return ("Aucun commercial n'est rattaché à ce bureau pour le moment. "
                    "Je peux noter une demande de rappel si vous le souhaitez.")

        who = res.get("agent_name") or "le commercial"
        if not res.get("online"):
            return (f"{who} n'est pas connecté(e) là, tout de suite. Voulez-vous que je "
                    "prenne vos coordonnées pour qu'il/elle vous rappelle ?")
        return (f"C'est noté, je préviens {who} qui est en ligne. Patientez un petit "
                "instant, puis redemandez-moi votre code d'accès pour être mis en relation.")

    @function_tool()
    async def obtenir_code_acces(self, context: RunContext, nom_visiteur: str):
        """Donne le code d'accès si le commercial a autorisé le visiteur.

        Args:
            nom_visiteur: le prénom du visiteur qui a fait la demande
        """
        try:
            payload = urllib.parse.urlencode({
                "action": "code-for-visitor",
                "projet": self.project_id,
                "visitor": nom_visiteur or "",
            }).encode()
            req = urllib.request.Request(f"{APP_URL}/api/agent-access.php", data=payload)
            with urllib.request.urlopen(req, timeout=8) as r:
                res = json.loads(r.read().decode())
        except Exception as e:
            print("[obtenir_code_acces] err:", e)
            return "Je n'arrive pas à récupérer votre code à l'instant, réessayez dans un moment."

        if not res.get("found"):
            return ("Je n'ai pas encore de demande enregistrée à votre nom. Dites-moi qui "
                    "vous souhaitez voir et je préviens le commercial.")
        statut = res.get("statut")
        if statut == "approved" and res.get("code"):
            digits = " ".join(str(res["code"]))
            return (f"C'est bon, {res.get('agent_name','le commercial')} vous attend ! "
                    f"Votre code est le {digits}. Saisissez-le dans l'encadré à l'écran "
                    "pour être mis en relation.")
        if statut == "denied":
            return "Le commercial n'est pas disponible pour le moment. Souhaitez-vous être rappelé ?"
        return f"{res.get('agent_name','Le commercial')} n'a pas encore répondu, patientez un petit instant."


async def entrypoint(ctx: agents.JobContext):
    room = ctx.room.name or ""
    # L'agent ne prend en charge QUE l'accueil des bureaux de vente narjiss.
    if not room.startswith(ROOM_PREFIX):
        print(f"[Agent] room '{room}' ignorée (hors bureau de vente narjiss).")
        return

    # bureau-<projet>-<lang>-<rand> ; les ids de projet ne contiennent pas de tiret.
    parts = room.split("-")
    project_id = parts[1] if len(parts) > 1 else ""
    lang_code  = parts[2] if len(parts) > 2 and parts[2] in LANG_LABEL else "fr"
    project, city = project_info(project_id)

    instructions = INSTRUCTIONS.format(project=project, city=city, lang=LANG_LABEL[lang_code])

    # Catalogue complet injecté une fois : l'hôtesse peut citer et comparer
    # TOUS les projets Narjiss, pas seulement son bureau d'accueil.
    instructions += projects_catalog()

    # Renforcement spécifique DARIJA : le visiteur a explicitement choisi de parler
    # en darija marocaine. On demande une darija naturelle et chaleureuse.
    if lang_code == "darija":
        instructions += (
            " TRÈS IMPORTANT — LANGUE : le visiteur veut discuter en DARIJA marocaine. "
            "Parle UNIQUEMENT en darija marocaine authentique (écrite en caractères arabes), "
            "comme une vraie hôtesse d'Agadir/Casablanca : phrases courtes, ton chaleureux et "
            "familier, expressions courantes (مرحبا بيك، أهلا، واخا، دابا، مزيان، بزاف، إيوا، "
            "بصّح، صافي، إن شاء الله). Intègre naturellement les mots français que les Marocains "
            "emploient au quotidien (rendez-vous، bureau، appartement، étage، prix). "
            "N'utilise NI l'arabe classique/littéraire (فصحى) NI le français seul. "
            "Si le visiteur passe au français ou à un autre parler, suis-le, mais reviens à la "
            "darija dès qu'il y revient."
        )

    greeting = GREETINGS.get(lang_code, GREETINGS["fr"]).format(project=project)
    print(f"[Agent] Hôtesse dans '{room}' — {project} / {city} / {lang_code}")

    await ctx.connect()
    try:
        await ctx.room.local_participant.set_name("Hôtesse d'accueil")
    except Exception:
        pass

    session = AgentSession(
        # Pas de "language=" : Whisper detecte la langue a chaque tour de parole,
        # ce qui permet au visiteur de changer de langue en pleine conversation.
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(voice="shimmer"),
        vad=silero.VAD.load(),
    )
    await session.start(
        room=ctx.room,
        agent=ReceptionAgent(instructions, project_id),
        room_input_options=RoomInputOptions(),
    )
    await session.generate_reply(
        instructions=f"Accueille le visiteur en disant, en substance : « {greeting} »"
    )


if __name__ == "__main__":
    # Pas d'agent_name → dispatch automatique sur les nouvelles rooms ; le filtre
    # sur « bureau-* » est fait dans entrypoint.
    #
    # job_executor_type=THREAD : sous Windows, l'exécuteur PROCESS par défaut
    # relance un python.exe enfant par visiteur, et ce process enfant échoue à
    # charger livekit_ffi.dll (« Image incorrecte », erreur SxS 0xc0e90002) alors
    # que le process parent la charge sans problème. En exécutant les jobs dans un
    # thread du process principal — qui a déjà chargé la DLL — on évite ce crash.
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        job_executor_type=agents.JobExecutorType.THREAD,
    ))
