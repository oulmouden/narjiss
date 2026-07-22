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
    "Tu peux : présenter le projet et son emplacement ; expliquer les types de biens "
    "proposés ; parler du quartier et des commodités alentour (écoles, commerces, "
    "santé, transports) ; inviter à poursuivre la visite virtuelle, à consulter la "
    "brochure, ou à venir sur place. "
    "Si le visiteur veut un rendez-vous, être rappelé, ou parler à un conseiller, "
    "demande-lui son nom et son téléphone (ou son e-mail), puis appelle l'outil "
    "demander_rendezvous. "
    "Ne cite JAMAIS de prix, de surface, de disponibilité ou de délai de livraison : "
    "tu ne les connais pas. Sur ces sujets, propose de faire rappeler par un conseiller. "
    "Ne promets rien d'autre. Reste naturelle, ne récite pas de longues listes."
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
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
