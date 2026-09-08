# -*- coding: utf-8 -*-
"""Presentation sonorisee en DIAPOSITIVES HTML — francais et arabe.

  python tools/publier_presentation_html.py --langue tout          # les deux
  python tools/publier_presentation_html.py --langue fr            # une seule
  python tools/publier_presentation_html.py --langue tout --pages  # HTML seul,
                                                                   # pas un centime
  python tools/publier_presentation_html.py --langue fr --voix ash # autre voix

Produit sous presentation/<jeton>/ :
  index.html    le choix de la langue
  francais/     32 diapositives + 32 commentaires en francais
  darija/       32 diapositives en arabe litteraire, commentees en DARIJA

CE QUI CHANGE PAR RAPPORT A publier_presentation_web.py
Celui-la exportait chaque diapositive de PowerPoint en JPEG : une image de
1400 px par ecran. Lisible, mais c'est une photo de texte — elle pese, elle
floute en zoomant, elle ne se recompose pas, et sur un telephone en portrait il
fallait la faire PIVOTER pour etre lisible.

Ici chaque diapositive est du HTML. Consequences :
 - le texte se recompose tout seul en portrait : plus de rotation, plus de
   pincement pour zoomer, et il reste net a n'importe quelle taille ;
 - le tableau comparatif devient une pile de fiches sur telephone au lieu de
   treize colonnes illisibles ;
 - le poids s'effondre : les pages entieres tiennent dans ce que pesait une
   seule diapositive JPEG. Seules les captures d'ecran restent des images.

SOURCE DU CONTENU
Le texte affiche et les images sont lus dans le .docx correspondant a chaque
execution : corriger le Word et relancer suffit, rien n'est recopie ici. Le
decoupage suit les titres du document (un titre de niveau 1 ou 2 = une nouvelle
diapositive), donc il survit aux retouches.

Le texte LU est ailleurs, un fichier par langue :
  tools/narration_fr.py          francais
  tools/narration_darija_ar.py   darija (voir son en-tete : on AFFICHE du fusha
                                 et on LIT de la darija, et pourquoi)
"""

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

RACINE = Path(__file__).resolve().parent.parent
PRESENTATION = RACINE / "presentation" / "N7t6V6Hv8R0y"

# Tout ce qui distingue une langue de l'autre est ici, et nulle part ailleurs :
# ajouter une langue, c'est ajouter une entree et un fichier de narration.
#
# Le dossier arabe s'appelle « darija » et non « ar » parce que c'est la langue
# PARLEE qui le distingue de la version images deja en ligne : le texte affiche,
# lui, est du fusha dans les deux.
LANGUES = {
    "ar": {
        "docx": "NarjissargumentairedirectionAR.docx",
        "narration": "narration_darija_ar",
        "dossier": "darija",
        "cache": "ar-darija",
        "html_lang": "ar",
        "dir": "rtl",
        "polices": "family=Cairo:wght@400;600;700",
        "corps": "'Cairo'",
        "titres": "'Cairo'",
        # En RTL on avance vers la GAUCHE : les chevrons sont donc inverses par
        # rapport au francais, et la fleche gauche du clavier fait « suivant ».
        "fleche_prec": "&#10095;",
        "fleche_suiv": "&#10094;",
        "textes": {
            "titre": "narjiss.company — من موقع للعرض إلى أداة بيع حقيقية",
            "baseline": "من موقع للعرض إلى أداة بيع حقيقية",
            "titre_court": "نرجس دوت كومباني — ملف الإدارة",
            "sous": "ملف تقديمي إلى إدارة نرجس للعقار · غشت 2026 · التعليق بالدارجة المغربية",
            "lancer": "ابدأ العرض",
            "pause": "إيقاف",
            "reprendre": "استئناف",
            "texte": "النص",
            "plein": "ملء الشاشة",
            "sur": "من",
            "autre": "Version française",
            "autre_href": "../francais/",
            "pied": "نرجس للعقار · وثيقة داخلية",
        },
    },
    "fr": {
        "docx": "NarjissargumentairedirectionFR.docx",
        "narration": "narration_fr",
        "dossier": "francais",
        "cache": "fr-html",
        "html_lang": "fr",
        "dir": "ltr",
        # Les polices du site lui-meme, pour que le dossier ne paraisse pas
        # venir d'ailleurs : Playfair pour les titres, Outfit pour le texte.
        "polices": "family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@500;700",
        "corps": "'Outfit'",
        "titres": "'Playfair Display'",
        "fleche_prec": "&#10094;",
        "fleche_suiv": "&#10095;",
        "textes": {
            "titre": "narjiss.company — De la vitrine au véritable outil de vente",
            "baseline": "De la vitrine au véritable outil de vente",
            "titre_court": "narjiss.company — dossier direction",
            "sous": "Dossier de présentation à la direction de Narjiss Immobilière · Août 2026",
            "lancer": "Lancer la présentation",
            "pause": "Pause",
            "reprendre": "Reprendre",
            "texte": "Texte",
            "plein": "Plein écran",
            "sur": "sur",
            "autre": "النسخة العربية بالدارجة",
            "autre_href": "../darija/",
            "pied": "Narjiss Immobilière · document interne",
        },
    },
}

VERSION = "h1"          # affichee en pied de page : sert a demander au user
                        # ce qu'il lit, au lieu de deviner s'il a la bonne page
LARGEUR_JPEG = 1400
QUALITE_JPEG = 80

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


# --------------------------------------------------------- lecture du .docx

def lire_docx(chemin):
    """Suite ordonnee de blocs : titres, paragraphes, puces, images, tableaux.

    On lit le XML directement (python-docx n'est pas installe sur ce poste et
    n'apporterait rien ici : on ne veut que l'ordre et le style des blocs).
    """
    z = zipfile.ZipFile(chemin)
    rels = {r.get("Id"): r.get("Target")
            for r in ET.fromstring(z.read("word/_rels/document.xml.rels"))}
    corps = ET.fromstring(z.read("word/document.xml")).find(W + "body")

    def texte(p):
        return "".join(t.text or "" for t in p.iter(W + "t"))

    blocs = []
    for el in corps:
        if el.tag == W + "p":
            style = el.find(W + "pPr/" + W + "pStyle")
            style = style.get(W + "val") if style is not None else ""
            for blip in el.iter(A + "blip"):
                rid = blip.get(R + "embed")
                if rid in rels:
                    blocs.append({"t": "image", "src": rels[rid]})
            t = texte(p=el).strip()
            if t:
                blocs.append({"t": style or "p", "txt": t})
        elif el.tag == W + "tbl":
            lignes = []
            for tr in el.findall(W + "tr"):
                lignes.append([
                    " ".join(texte(p).strip() for p in tc.findall(W + "p")).strip()
                    for tc in tr.findall(W + "tc")])
            blocs.append({"t": "tableau", "lignes": lignes})
    return z, blocs


def decouper(blocs):
    """Une diapositive par titre de niveau 1 ou 2, plus la couverture."""
    diapos = [{"niveau": 0, "titre": None, "blocs": []}]
    for b in blocs:
        if b["t"] == "Titre1":
            diapos.append({"niveau": 1, "titre": b["txt"], "blocs": []})
        elif b["t"] == "Titre2":
            diapos.append({"niveau": 2, "titre": b["txt"], "blocs": []})
        else:
            diapos[-1]["blocs"].append(b)
    return diapos


# ------------------------------------------------------------------ images

def extraire_images(z, diapos, dossier):
    """Les captures du Word en JPEG 1400 px : c'est tout ce qui reste lourd."""
    from PIL import Image
    import io

    img = dossier / "img"
    img.mkdir(parents=True, exist_ok=True)
    for vieux in img.glob("*.jpg"):
        vieux.unlink()

    total = 0
    for d in diapos:
        for b in d["blocs"]:
            if b["t"] != "image":
                continue
            nom = Path(b["src"]).stem + ".jpg"
            cible = img / nom
            if not cible.exists():
                with Image.open(io.BytesIO(z.read("word/" + b["src"]))) as im:
                    im = im.convert("RGB")
                    if im.width > LARGEUR_JPEG:
                        h = round(im.height * LARGEUR_JPEG / im.width)
                        im = im.resize((LARGEUR_JPEG, h), Image.LANCZOS)
                    im.save(cible, "JPEG", quality=QUALITE_JPEG,
                            optimize=True, progressive=True)
                total += cible.stat().st_size
            b["fichier"] = "img/" + nom
    print("   images : %d fichiers, %.1f Mo"
          % (len(list(img.glob("*.jpg"))), total / 1048576))


# ------------------------------------------------------------ synthese vocale

def env(nom):
    """Une valeur de api/.env, ou None si absente ou laissee vide."""
    m = re.search(r"^%s=(.*)$" % nom,
                  (RACINE / "api" / ".env").read_text(encoding="utf-8"), re.M)
    val = m.group(1).strip().strip('"').strip("'") if m else ""
    return val or None


# Voix par defaut de chaque moteur.
#
# OpenAI n'a AUCUNE locale marocaine : on lui donne un texte en darija et on le
# pousse vers l'accent par la consigne de jeu. Le resultat est de l'arabe teinte.
# Azure a un vrai modele ar-MA (prononciation de Casablanca-Marrakech), donc la
# darija n'y est pas une imitation : c'est la langue du modele.
VOIX_DEFAUT = {"openai": "onyx", "azure": "ar-MA-JamalNeural"}
VOIX_AZURE = ("ar-MA-JamalNeural", "ar-MA-MounaNeural")


def _tts_openai(texte, voix, modele, consigne):
    import openai
    cle = env("OPENAI_API_KEY")
    if not cle:
        sys.exit("OPENAI_API_KEY absente de api/.env")
    client = openai.OpenAI(api_key=cle)
    return client.audio.speech.create(
        model=modele, voice=voix, input=texte,
        instructions=consigne, response_format="mp3").content


def _tts_azure(texte, voix):
    """API REST de Azure Speech. Pas de SDK : une requete POST suffit.

    On passe par `requests` et non par urllib : Azure repond en
    « chunked », et urllib leve alors IncompleteRead a la fin du flux —
    l'audio arrive, mais la lecture echoue juste avant le dernier morceau.
    """
    import requests
    from xml.sax.saxutils import escape

    cle, region = env("AZURE_SPEECH_KEY"), env("AZURE_SPEECH_REGION")
    if not cle or not region:
        sys.exit(
            "\nAZURE_SPEECH_KEY / AZURE_SPEECH_REGION absentes de api/.env.\n"
            "Portail Azure > la ressource Speech > « Cles et point de terminaison ».\n"
            "La region est le champ « Emplacement », en minuscules sans espace\n"
            "(francecentral, westeurope...).")

    # rate=-6% : le debit par defaut est trop rapide pour une presentation ;
    # c'est l'equivalent Azure du « ne te presse pas » de la consigne OpenAI.
    ssml = ("<speak version='1.0' xml:lang='ar-MA'>"
            "<voice name='%s'><prosody rate='-6%%'>%s</prosody></voice>"
            "</speak>" % (voix, escape(texte)))

    r = requests.post(
        "https://%s.tts.speech.microsoft.com/cognitiveservices/v1" % region,
        data=ssml.encode("utf-8"), timeout=90,
        headers={
            "Ocp-Apim-Subscription-Key": cle,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "narjiss-presentation",
        })
    if r.status_code != 200:
        detail = r.text[:300]
        if r.status_code == 401:
            detail += "\n  -> cle refusee, ou region ne correspondant pas a la cle."
        if r.status_code == 400:
            detail += "\n  -> SSML refuse : nom de voix inconnu ?"
        sys.exit("Azure a repondu %s : %s" % (r.status_code, detail))
    if not r.content:
        sys.exit("Azure a repondu 200 mais sans audio.")
    return r.content


def synthetiser(textes, moteur, voix, modele, consigne, dossier,
                comparer=False):
    """Un mp3 par diapositive. Le cache porte sur le contenu exact (moteur,
    voix, consigne, texte) : relancer ne repaie que ce qui a change, et changer
    de moteur ne detruit pas ce qui a deja ete paye ailleurs.

    En production on n'a qu'une voix a la fois, donc on evince les mp3 devenus
    caducs pour la meme diapositive. `comparer=True` desactive cette eviction et
    met la voix dans le nom : sinon, generer une deuxieme voix pour l'ecouter a
    cote de la premiere effacerait justement celle qu'on voulait comparer.
    """
    dossier.mkdir(parents=True, exist_ok=True)

    sons = []
    for i, texte in enumerate(textes, start=1):
        # Le moteur est dans le NOM, pas dans l'empreinte : ainsi les mp3 deja
        # payes avant l'ajout d'Azure restent valides apres un simple renommage.
        empreinte = hashlib.sha1(
            ("%s|%s|%s|%s" % (modele, voix, consigne, texte))
            .encode("utf-8")).hexdigest()[:10]
        if comparer:
            chemin = dossier / ("diapo-%02d-%s-%s.mp3" % (i, moteur, voix))
        else:
            chemin = dossier / ("diapo-%02d-%s-%s.mp3" % (i, moteur, empreinte))
        if not chemin.exists():
            if not comparer:
                for vieux in dossier.glob("diapo-%02d-%s-*.mp3" % (i, moteur)):
                    vieux.unlink()
            if moteur == "azure":
                donnees = _tts_azure(texte, voix)
            else:
                donnees = _tts_openai(texte, voix, modele, consigne)
            chemin.write_bytes(donnees)
            print("   voix %2d/%d  %5d signes  %s"
                  % (i, len(textes), len(texte), chemin.name))
        else:
            print("   voix %2d/%d  (cache)   %s" % (i, len(textes), chemin.name))
        sons.append(chemin)
    return sons


def alleger(sons, dossier):
    """Mono 48 kbit/s : largement assez pour une voix, trois fois plus leger."""
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    total = 0
    for i, src in enumerate(sons, start=1):
        cible = dossier / ("s%02d.mp3" % i)
        subprocess.run([exe, "-y", "-loglevel", "error", "-i", str(src),
                        "-ac", "1", "-b:a", "48k", str(cible)], check=True)
        total += cible.stat().st_size
    print("   sons : %d fichiers, %.1f Mo" % (len(sons), total / 1048576))


# ------------------------------------------------------------------- pages

def e(t):
    return html.escape(t, quote=True)


def rendre_diapo(d, n, narration):
    """Le HTML d'une diapositive. La legende d'une image est le paragraphe qui
    la suit immediatement dans le Word — c'est la convention du document."""
    out = []
    blocs = d["blocs"]
    apres_image = False

    if d["niveau"] == 0:                     # couverture
        titres = [b["txt"] for b in blocs if b["t"] == "p"][:4]
        out.append('<div class="couv">')
        if titres:
            out.append('<p class="marque">%s</p>' % e(titres[0]))
        if len(titres) > 1:
            out.append('<h1 class="baseline">%s</h1>' % e(titres[1]))
        for t in titres[2:4]:
            out.append('<p class="meta">%s</p>' % e(t))
        out.append("</div>")
        reste = [b for b in blocs if b["t"] != "p" or b["txt"] not in titres]
    else:
        balise = "h1" if d["niveau"] == 1 else "h2"
        classe = "titre-section" if (d["niveau"] == 1 and not blocs) else ""
        out.append('<%s class="%s">%s</%s>'
                   % (balise, classe, e(d["titre"]), balise))
        reste = blocs

    puces = []
    for b in reste:
        if b["t"] == "Paragraphedeliste":
            # Aujourd'hui toute image du document est suivie de sa legende, mais
            # si une liste venait juste apres une image, la figure resterait
            # ouverte autour du <ul>.
            if apres_image:
                out.append("</figure>")
                apres_image = False
            puces.append(b["txt"])
            continue
        if puces:
            out.append("<ul>" + "".join("<li>%s</li>" % e(p) for p in puces) + "</ul>")
            puces = []

        if b["t"] == "image":
            out.append('<figure><img src="%s" alt="" loading="lazy" decoding="async">'
                       % e(b.get("fichier", "")))
            apres_image = True
            continue
        if b["t"] == "tableau":
            if apres_image:
                out.append("</figure>")
                apres_image = False
            out.append(rendre_tableau(b["lignes"]))
            continue
        if b["t"] == "p":
            if apres_image:
                out.append("<figcaption>%s</figcaption></figure>" % e(b["txt"]))
                apres_image = False
            else:
                out.append("<p>%s</p>" % e(b["txt"]))
    if apres_image:
        out.append("</figure>")
    if puces:
        out.append("<ul>" + "".join("<li>%s</li>" % e(p) for p in puces) + "</ul>")

    corps = "\n".join(out)
    return ('<section class="diapo n%d" data-n="%d" aria-hidden="true">\n'
            '<div class="feuille">%s</div>\n'
            '<div class="transcription" hidden><p>%s</p></div>\n'
            "</section>" % (d["niveau"], n, corps, e(narration)))


def rendre_tableau(lignes):
    """Vrai tableau sur grand ecran ; sur telephone, CSS le replie en fiches,
    chaque cellule etant etiquetee par son en-tete via data-c."""
    if not lignes:
        return ""
    entete = lignes[0]
    out = ['<div class="tableau"><table><thead><tr>']
    out += ["<th>%s</th>" % e(c) for c in entete]
    out.append("</tr></thead><tbody>")
    for ligne in lignes[1:]:
        out.append("<tr>")
        for j, cel in enumerate(ligne):
            etiquette = entete[j] if j < len(entete) else ""
            balise = "th" if j == 0 else "td"
            out.append('<%s data-c="%s">%s</%s>' % (balise, e(etiquette), e(cel), balise))
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


GABARIT = """<!doctype html>
<html lang="__LANG__" dir="__DIR__" translate="no">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="google" content="notranslate">
<meta name="theme-color" content="#16211C">
<title>__TITRE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?__POLICES__&display=swap" rel="stylesheet">
<style>
:root{
  --encre:#16211C; --ocre:#BD6B16; --ambre:#E9A64F;
  --creme:#F4E5B8; --papier:#F6F3EA; --gris:#9AA69E;
  --fond:#0F1713;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{
  background:var(--fond); color:var(--papier);
  font-family:__CORPS__,-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;
  -webkit-text-size-adjust:100%;
}
#app{display:flex;flex-direction:column;height:100vh;height:100dvh;overflow:hidden}
header,footer{flex:0 0 auto;padding:10px 16px;display:flex;
  justify-content:space-between;align-items:center;gap:12px}
header{border-bottom:1px solid #24322B}
footer{border-top:1px solid #24322B;color:var(--gris);font-size:12px}
/* min-width:0 est indispensable : sans lui un enfant de flex refuse de
   retrecir sous sa largeur de contenu, et l'ellipse ne se declenche jamais. */
.titre-doc{font-size:13px;color:var(--gris);font-weight:600;min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.compteur{font-size:13px;color:var(--creme);font-variant-numeric:tabular-nums;flex:0 0 auto}

/* Barre de progression du commentaire en cours */
.jauge{flex:0 0 auto;height:3px;background:#24322B}
.jauge span{display:block;height:100%;width:0;background:var(--ocre);
  transition:width .25s linear}

/* La scene est l'element mis en plein ecran : TOUT l'habillage doit vivre
   dedans, sinon le navigateur le raye de l'ecran en plein ecran natif. */
.scene{flex:1 1 auto;min-height:0;position:relative;overflow:hidden;
  background:var(--fond)}
.piste{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;
  -webkit-overflow-scrolling:touch;padding:22px 18px 96px}

.diapo{display:none;max-width:900px;margin:0 auto}
.diapo.actif{display:block;animation:entree .35s ease both}
@keyframes entree{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.feuille h1,.feuille h2{color:var(--creme);line-height:1.35;margin:0 0 14px;
  font-family:__TITRES__,Georgia,serif}
.feuille h1{font-size:clamp(22px,5.4vw,34px)}
.feuille h2{font-size:clamp(19px,4.6vw,27px)}
.feuille h1.titre-section{margin:12vh 0;text-align:center;
  font-size:clamp(26px,7vw,44px);color:var(--ambre)}
.feuille p{font-size:clamp(15px,3.9vw,19px);line-height:1.85;margin:0 0 14px}
.feuille ul{margin:0 0 14px;padding-inline-start:22px}
.feuille li{font-size:clamp(15px,3.9vw,19px);line-height:1.8;margin-bottom:10px}
.feuille li::marker{color:var(--ocre)}

figure{margin:18px 0}
figure img{width:100%;height:auto;display:block;border-radius:10px;
  background:#24322B}
figcaption{margin-top:8px;font-size:13px;line-height:1.7;color:var(--gris)}

/* Couverture */
.couv{padding:8vh 0 4vh;text-align:center}
.couv .marque{font-size:clamp(20px,5.6vw,30px);color:var(--ocre);
  font-weight:700;letter-spacing:.5px;direction:ltr;margin:0 0 10px}
.couv .baseline{font-size:clamp(22px,6vw,38px);color:var(--creme);margin:0 0 18px;
  font-family:__TITRES__,Georgia,serif}
.couv .meta{font-size:clamp(13px,3.4vw,16px);color:var(--gris);margin:0 0 4px}

/* Tableau : vrai tableau au large, fiches empilees sur telephone */
.tableau{margin:16px 0;overflow-x:auto}
.tableau table{border-collapse:collapse;width:100%;font-size:14px}
.tableau th,.tableau td{border:1px solid #2C3B33;padding:9px 11px;
  text-align:start;line-height:1.6;vertical-align:top}
.tableau thead th{background:#1D2A23;color:var(--creme);font-weight:600}
.tableau tbody th{background:#18231D;color:var(--papier);font-weight:600}
@media (max-width:700px){
  .tableau table,.tableau thead,.tableau tbody,.tableau tr,
  .tableau th,.tableau td{display:block;width:100%}
  .tableau thead{display:none}
  .tableau tr{border:1px solid #2C3B33;border-radius:10px;
    margin-bottom:12px;overflow:hidden}
  .tableau th,.tableau td{border:0;border-bottom:1px solid #24322B}
  .tableau tbody th{background:#1D2A23;font-size:15px}
  .tableau td::before{content:attr(data-c);display:block;
    font-size:11px;color:var(--ambre);margin-bottom:3px}
  .tableau tr td:last-child{border-bottom:0}
}

.transcription{margin:18px 0 0;padding:14px 16px;border-radius:10px;
  background:#18231D;border:1px solid #2C3B33}
.transcription p{margin:0;font-size:15px;line-height:1.9;color:#D9E2DA}

/* Commandes flottantes — DANS .scene (voir plus haut) */
.flottant{position:absolute;inset-inline:0;
  bottom:calc(14px + env(safe-area-inset-bottom));
  display:flex;justify-content:center;gap:8px;padding:0 12px;
  pointer-events:none;flex-wrap:wrap}
.flottant button{pointer-events:auto;border:0;cursor:pointer;
  font-family:inherit;font-size:14px;font-weight:600;
  padding:11px 16px;border-radius:999px;
  background:var(--creme);color:var(--encre);
  box-shadow:0 4px 14px rgba(0,0,0,.45)}
.flottant button:disabled{opacity:.4;cursor:default}
.flottant button.rond{padding:11px 15px;font-size:17px;line-height:1}
.flottant button.secondaire{background:#24322B;color:var(--creme)}

/* Ecran de lancement : sur mobile, un geste est OBLIGATOIRE pour que le
   navigateur autorise le son. */
#depart{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:18px;text-align:center;
  padding:24px;background:var(--fond);z-index:5}
/* « narjiss.company » est un mot latin insecable au milieu d'un titre arabe :
   sans overflow-wrap il impose sa largeur et fait deborder toute la page. */
#depart .marque{margin:0;font-size:clamp(19px,5.4vw,28px);color:var(--ocre);
  font-weight:700;direction:ltr}
#depart h1{margin:0;font-size:clamp(20px,5.4vw,30px);color:var(--creme);
  line-height:1.5;max-width:20ch;overflow-wrap:anywhere;
  font-family:__TITRES__,Georgia,serif}
#depart p{margin:0;color:var(--gris);font-size:15px;line-height:1.8;max-width:34ch}
#depart button{border:0;cursor:pointer;font-family:inherit;font-weight:700;
  font-size:17px;padding:15px 30px;border-radius:999px;
  background:var(--ocre);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.5)}
#depart .lien{color:var(--ambre);font-size:14px;text-decoration:none}

/* Plein ecran fait main : Safari iOS refuse de passer un <div> en plein
   ecran natif, donc on ne peut pas compter sur l'API seule. */
.scene.plein{position:fixed;inset:0;z-index:50;background:var(--fond)}
body.verrou{overflow:hidden}
@media (orientation:landscape) and (max-height:560px) and (max-width:899px){
  header,footer{display:none}
  .piste{padding:14px 16px 88px}
}
</style>

<div id="app">
 <header>
  <div class="titre-doc">__TITRE_COURT__</div>
  <div class="compteur"><span id="pos">1</span> __SUR__ __TOTAL__</div>
 </header>
 <div class="jauge"><span id="jauge"></span></div>

 <main class="scene" id="scene">
  <div class="piste" id="piste">
__DIAPOS__
  </div>

  <div class="flottant">
   <button class="rond secondaire" id="prec" title="__PREC__">__FLECHE_PREC__</button>
   <button id="lecture">__PAUSE__</button>
   <button class="rond secondaire" id="suiv" title="__SUIV__">__FLECHE_SUIV__</button>
   <button class="secondaire" id="txt">__TEXTE__</button>
   <button class="secondaire" id="plein">__PLEIN__</button>
  </div>

  <div id="depart">
   <p class="marque">narjiss.company</p>
   <h1>__BASELINE__</h1>
   <p>__SOUS__</p>
   <button id="lancer">__LANCER__</button>
   <a class="lien" href="__AUTRE_HREF__">__AUTRE__</a>
  </div>
 </main>

 <footer>
  <span>__PIED__</span>
  <span>__VERSION__</span>
 </footer>
</div>

<audio id="son" preload="none"></audio>

<script>
(function(){
 var diapos = [].slice.call(document.querySelectorAll('.diapo'));
 var son = document.getElementById('son');
 var piste = document.getElementById('piste');
 var scene = document.getElementById('scene');
 var pos = document.getElementById('pos');
 var jauge = document.getElementById('jauge');
 var bLecture = document.getElementById('lecture');
 var bTxt = document.getElementById('txt');
 var i = 0, demarre = false;

 function src(n){ return 's' + (n < 9 ? '0' : '') + (n + 1) + '.mp3'; }

 function precharger(n){
  if (n >= diapos.length) return;
  var l = document.createElement('link');
  l.rel = 'prefetch'; l.href = src(n); l.as = 'audio';
  document.head.appendChild(l);
 }

 function afficher(n, jouer){
  i = Math.max(0, Math.min(diapos.length - 1, n));
  diapos.forEach(function(d, k){
   d.classList.toggle('actif', k === i);
   d.setAttribute('aria-hidden', k === i ? 'false' : 'true');
  });
  pos.textContent = i + 1;
  piste.scrollTop = 0;
  jauge.style.width = '0%';
  document.getElementById('prec').disabled = (i === 0);
  document.getElementById('suiv').disabled = (i === diapos.length - 1);
  son.src = src(i);
  if (jouer) { var p = son.play(); if (p && p.catch) p.catch(function(){}); }
  // Lien profond : #12 ouvre la douzieme diapositive. Sert a renvoyer
  // quelqu'un directement sur un ecran precis.
  if (history.replaceState) history.replaceState(null, '', '#' + (i + 1));
  precharger(i + 1);
 }

 function depart(){
  var n = parseInt((location.hash || '').replace('#', ''), 10);
  return (n >= 1 && n <= diapos.length) ? n - 1 : 0;
 }

 son.addEventListener('timeupdate', function(){
  if (son.duration) jauge.style.width = (son.currentTime / son.duration * 100) + '%';
 });
 // Enchainement automatique : c'est ce qui en fait une presentation et non
 // un document a faire defiler.
 son.addEventListener('ended', function(){
  if (i < diapos.length - 1) afficher(i + 1, true);
 });
 son.addEventListener('play',  function(){ bLecture.textContent = '__PAUSE__'; });
 son.addEventListener('pause', function(){ bLecture.textContent = '__REPRENDRE__'; });

 document.getElementById('prec').onclick = function(){ afficher(i - 1, demarre); };
 document.getElementById('suiv').onclick = function(){ afficher(i + 1, demarre); };
 bLecture.onclick = function(){
  if (son.paused) { var p = son.play(); if (p && p.catch) p.catch(function(){}); }
  else son.pause();
 };
 bTxt.onclick = function(){
  var t = diapos[i].querySelector('.transcription');
  if (t) t.hidden = !t.hidden;
 };

 document.getElementById('plein').onclick = function(){
  var actif = scene.classList.toggle('plein');
  document.body.classList.toggle('verrou', actif);
  if (actif && scene.requestFullscreen) {
   scene.requestFullscreen().then(function(){
    if (screen.orientation && screen.orientation.lock)
     screen.orientation.lock('landscape').catch(function(){});
   }).catch(function(){});
  } else if (!actif && document.fullscreenElement && document.exitFullscreen) {
   document.exitFullscreen().catch(function(){});
  }
 };

 document.getElementById('lancer').onclick = function(){
  document.getElementById('depart').style.display = 'none';
  demarre = true;
  afficher(depart(), true);
 };

 document.addEventListener('keydown', function(ev){
  // En RTL on lit vers la gauche : la fleche gauche AVANCE, alors qu'en
  // francais c'est la droite. Sans cette bascule les fleches sont inversees
  // dans l'une des deux langues.
  var av = __RTL__ ? 'ArrowLeft' : 'ArrowRight';
  var ar = __RTL__ ? 'ArrowRight' : 'ArrowLeft';
  if (ev.key === av) afficher(i + 1, demarre);
  if (ev.key === ar) afficher(i - 1, demarre);
  if (ev.key === ' ') { ev.preventDefault(); bLecture.onclick(); }
 });

 // Arriver sur #12 doit montrer la diapositive 12 tout de suite, derriere
 // l'ecran de lancement — sinon le lien profond ne veut rien dire.
 afficher(depart(), false);
 if (depart() > 0) document.getElementById('depart').style.display = 'none';
})();
</script>
"""

def ecrire_page(diapos, narration, dossier, langue):
    """Le lecteur complet : une seule page qui porte les 32 diapositives.

    Une page par diapositive obligerait a un chargement reseau a chaque clic ;
    ici tout est la des le depart (le HTML pese ~60 Ko), seules les images et les
    sons se chargent au fur et a mesure.
    """
    L = LANGUES[langue]
    t = L["textes"]
    corps = "\n".join(rendre_diapo(d, n, narration[n])
                      for n, d in enumerate(diapos))
    jetons = {
        "__DIAPOS__": corps,
        "__LANG__": L["html_lang"],
        "__DIR__": L["dir"],
        "__POLICES__": L["polices"],
        "__CORPS__": L["corps"],
        "__TITRES__": L["titres"],
        "__FLECHE_PREC__": L["fleche_prec"],
        "__FLECHE_SUIV__": L["fleche_suiv"],
        "__RTL__": "true" if L["dir"] == "rtl" else "false",
        "__PREC__": e(t["reprendre"]),
        "__SUIV__": e(t["texte"]),
        "__TITRE_COURT__": e(t["titre_court"]),
        "__TITRE__": e(t["titre"]),
        "__BASELINE__": e(t["baseline"]),
        "__SOUS__": e(t["sous"]),
        "__LANCER__": e(t["lancer"]),
        "__PAUSE__": e(t["pause"]),
        "__REPRENDRE__": e(t["reprendre"]),
        "__TEXTE__": e(t["texte"]),
        "__PLEIN__": e(t["plein"]),
        "__SUR__": e(t["sur"]),
        "__AUTRE__": e(t["autre"]),
        "__AUTRE_HREF__": e(t["autre_href"]),
        "__PIED__": e(t["pied"]),
        "__TOTAL__": str(len(diapos)),
        "__VERSION__": VERSION,
    }
    page = GABARIT
    # __DIAPOS__ en dernier : le contenu du Word pourrait contenir une suite de
    # caracteres ressemblant a un jeton, et serait alors reecrit.
    for cle in sorted(jetons, key=lambda k: k == "__DIAPOS__"):
        page = page.replace(cle, jetons[cle])
    (dossier / "index.html").write_text(page, encoding="utf-8")
    print("   page : index.html, %.0f Ko"
          % ((dossier / "index.html").stat().st_size / 1024))


COMPARATIF = """<!doctype html>
<html lang="ar" dir="rtl" translate="no">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>مقارنة الأصوات — الدارجة</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
 body{margin:0;padding:22px 16px 60px;background:#0F1713;color:#F6F3EA;
      font-family:'Cairo',Arial,sans-serif;line-height:1.8}
 .bloc{max-width:760px;margin:0 auto 34px;background:#16211C;border:1px solid #2C3B33;
       border-radius:12px;padding:18px}
 h1{max-width:760px;margin:0 auto 8px;font-size:22px;color:#F4E5B8}
 .chapeau{max-width:760px;margin:0 auto 26px;color:#9AA69E;font-size:14px}
 h2{font-size:17px;color:#E9A64F;margin:0 0 10px}
 .texte{font-size:15px;color:#D9E2DA;margin:0 0 16px}
 .voix{border-top:1px solid #24322B;padding-top:12px;margin-top:12px}
 .nom{font-size:13px;font-weight:600;color:#F4E5B8;margin-bottom:6px}
 .nom small{display:block;font-weight:400;color:#9AA69E;font-size:12px}
 audio{width:100%}
</style>
<h1>مقارنة الأصوات — التعليق بالدارجة</h1>
<p class="chapeau">نفس المقطع بثلاثة أصوات. اسمع وقارن، ثم اختر.<br>
Même passage, trois voix. Azure = voix marocaines natives (ar-MA).
OpenAI = voix arabe orientée vers l'accent par consigne.</p>
__BLOCS__
</html>
"""


def ecrire_comparatif(dossier, titres, textes):
    """Page d'ecoute : le meme passage par chaque voix presente dans le dossier.

    Elle existe parce que je ne peux pas juger ce que je produis — je n'entends
    pas les mp3. Le choix de la voix revient a l'oreille du user.
    """
    etiquettes = {
        "azure-ar-MA-JamalNeural": ("Azure — Jamal (ar-MA)",
                                    "voix marocaine native, homme"),
        "azure-ar-MA-MounaNeural": ("Azure — Mouna (ar-MA)",
                                    "voix marocaine native, femme"),
        "openai-onyx": ("OpenAI — onyx",
                        "arabe poussé vers l'accent par consigne (version actuelle)"),
    }
    blocs = []
    for n, (titre, texte) in enumerate(zip(titres, textes), start=1):
        lignes = ['<div class="bloc"><h2>%s</h2><p class="texte">%s</p>'
                  % (e(titre), e(texte))]
        for mp3 in sorted(dossier.glob("diapo-%02d-*.mp3" % n)):
            cle = mp3.stem.split("-", 2)[2]
            nom, detail = etiquettes.get(cle, (cle, ""))
            lignes.append('<div class="voix"><div class="nom">%s<small>%s</small></div>'
                          '<audio controls preload="none" src="%s"></audio></div>'
                          % (e(nom), e(detail), e(mp3.name)))
        lignes.append("</div>")
        blocs.append("\n".join(lignes))
    (dossier / "comparatif.html").write_text(
        COMPARATIF.replace("__BLOCS__", "\n".join(blocs)), encoding="utf-8")
    print("   page d'ecoute : %s" % (dossier / "comparatif.html"))


# --------------------------------------------------------------------- main

ACCUEIL = """<!doctype html>
<html lang="fr" translate="no">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="google" content="notranslate">
<meta name="theme-color" content="#0F1713">
<title>narjiss.company — dossier de présentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
 *{box-sizing:border-box}
 body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
      background:#0F1713;color:#F6F3EA;font-family:'Outfit',-apple-system,'Segoe UI',Arial,sans-serif;
      padding:28px 20px}
 .carte{max-width:440px;width:100%}
 .marque{color:#BD6B16;font-size:13px;letter-spacing:.22em;font-weight:700;
         text-align:center;margin:0 0 12px}
 h1{font-size:21px;font-weight:600;line-height:1.45;margin:0 0 6px;text-align:center;color:#F4E5B8}
 .sous{color:#9AA69E;font-size:14px;margin:0 0 28px;text-align:center;line-height:1.6}
 a.choix{display:block;padding:16px 18px;margin-bottom:12px;border-radius:12px;
         background:#F4E5B8;border:1px solid #DFCB90;color:#16211C;text-decoration:none;
         font-size:17px;font-weight:600}
 a.choix small{display:block;font-weight:400;font-size:12.5px;opacity:.75;margin-top:4px}
 a.ar{font-family:'Cairo',Arial,sans-serif;direction:rtl;text-align:right}
 .note{margin-top:26px;color:#6D766F;font-size:12px;text-align:center;line-height:1.7}
 .anciennes{margin-top:22px;text-align:center}
 .anciennes a{color:#E9A64F;font-size:12.5px;text-decoration:none;margin:0 8px}
</style>
<div class="carte">
  <p class="marque">narjiss.company</p>
  <h1>Dossier de présentation à la direction</h1>
  <p class="sous">Août 2026 · __TOTAL__ diapositives commentées · environ __DUREE__</p>

  <a class="choix" href="francais/">Français
    <small>Diapositives et commentaire en français</small></a>

  <a class="choix ar" href="darija/">النسخة العربية · التعليق بالدارجة
    <small>النص بالعربية الفصحى، والشرح بالدارجة المغربية</small></a>

  <p class="note">Document interne. À ouvrir de préférence dans le navigateur du
     téléphone plutôt que dans celui de WhatsApp.</p>

  <div class="anciennes">Versions précédentes, en images :
    <a href="fr/fr.html?v5">FR</a>·<a href="ar/ar.html?v5">AR</a>
  </div>
</div>
</html>
"""


def ecrire_accueil():
    """La page qui offre le choix de la langue, a la racine du dossier.

    Elle remplace l'ancien index qui ne listait que les versions en images ;
    celles-ci restent accessibles en bas, car leur lien a deja circule.
    """
    import re as _re

    total, duree = 0, 0.0
    for L in LANGUES.values():
        d = PRESENTATION / L["dossier"]
        pages = list(d.glob("s*.mp3"))
        total = max(total, len(pages))
    # La duree n'est pas relue des mp3 (il faudrait ffprobe pour chacun) : on
    # l'estime sur le poids, a 48 kbit/s constants — c'est l'encodage impose par
    # alleger(), donc le calcul est juste a la seconde pres.
    for L in LANGUES.values():
        d = PRESENTATION / L["dossier"]
        octets = sum(f.stat().st_size for f in d.glob("s*.mp3"))
        duree = max(duree, octets * 8 / 48000.0)

    page = (ACCUEIL
            .replace("__TOTAL__", str(total or 32))
            .replace("__DUREE__", "%d minutes" % round(duree / 60) if duree else "17 minutes"))
    (PRESENTATION / "index.html").write_text(page, encoding="utf-8")
    print("\nAccueil : presentation/N7t6V6Hv8R0y/index.html")
    print("Deploiement :  bash deploy.sh path presentation/N7t6V6Hv8R0y")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--langue", default="ar", choices=("ar", "fr", "tout"),
                    help="ar = arabe affiche, voix darija ; fr = francais ; "
                         "tout = les deux a la suite")
    ap.add_argument("--pages", action="store_true",
                    help="refaire le HTML seulement (aucun appel a la synthese)")
    # Defaut = openai, tranche a l'oreille le 2026-08-28. Azure a pourtant de
    # vraies voix marocaines ar-MA, la ou OpenAI n'a qu'un modele arabe pousse
    # vers l'accent par consigne — mais les ar-MA sont d'une generation plus
    # ancienne, et le naturel de la voix l'emporte sur l'authenticite de la
    # locale. Azure reste disponible : --moteur azure.
    ap.add_argument("--moteur", default="openai", choices=("azure", "openai"),
                    help="openai = voix la plus naturelle (defaut, choix du user) ; "
                         "azure = voix marocaines natives ar-MA, moins naturelles")
    ap.add_argument("--voix", default=None,
                    help="azure : ar-MA-JamalNeural, ar-MA-MounaNeural ; "
                         "openai : onyx, ash, sage, nova...")
    ap.add_argument("--modele", default="gpt-4o-mini-tts",
                    help="modele OpenAI (sans effet sur Azure)")
    ap.add_argument("--echantillon", action="store_true",
                    help="ne synthetiser que 2 diapositives, pour comparer des "
                         "voix a l'oreille sans tout refaire")
    args = ap.parse_args()
    voix = args.voix or VOIX_DEFAUT[args.moteur]

    sys.path.insert(0, str(RACINE / "tools"))
    langues = ["ar", "fr"] if args.langue == "tout" else [args.langue]
    for langue in langues:
        construire(langue, args, voix)
    ecrire_accueil()


def construire(langue, args, voix):
    import importlib

    L = LANGUES[langue]
    narration_mod = importlib.import_module(L["narration"])
    NARRATION, CONSIGNE = narration_mod.NARRATION, narration_mod.CONSIGNE
    docx = RACINE / "docs" / L["docx"]
    sortie = PRESENTATION / L["dossier"]
    cache = RACINE / "docs" / "voix-presentation" / L["cache"]

    print("\n [%s] Lecture de %s" % (langue, docx.name))
    z, blocs = lire_docx(docx)
    diapos = decouper(blocs)
    print("   %d blocs -> %d diapositives" % (len(blocs), len(diapos)))

    if len(NARRATION) != len(diapos):
        sys.exit(
            "\nARRET : %s donne %d diapositives, %s.py en compte %d.\n"
            "Le document a bouge. Remettre le fichier de narration au meme\n"
            "nombre (une entree par titre de niveau 1 ou 2, plus la couverture),\n"
            "dans l ordre du document."
            % (docx.name, len(diapos), L["narration"], len(NARRATION)))

    # Un echantillon ne touche ni les pages ni la version en place : il sert
    # uniquement a trancher entre deux voix avant de lancer les 32.
    if args.echantillon:
        indices = [1, 8]            # une diapositive dense, une avec image
        dossier = RACINE / "docs" / "voix-presentation" / ("echantillons-" + langue)
        print("Echantillon (%s, voix %s) — diapositives %s"
              % (args.moteur, voix, ", ".join(str(i + 1) for i in indices)))
        synthetiser([NARRATION[i] for i in indices], args.moteur, voix,
                    args.modele, CONSIGNE, dossier=dossier, comparer=True)
        ecrire_comparatif(dossier,
                          [diapos[i]["titre"] or "?" for i in indices],
                          [NARRATION[i] for i in indices])
        return

    sortie.mkdir(parents=True, exist_ok=True)
    extraire_images(z, diapos, sortie)
    ecrire_page(diapos, NARRATION, sortie, langue)

    if args.pages:
        print("   --pages : synthese vocale ignoree.")
    else:
        print("   Synthese vocale (%s, voix %s)" % (args.moteur, voix))
        sons = synthetiser(NARRATION, args.moteur, voix, args.modele, CONSIGNE,
                           dossier=cache)
        alleger(sons, sortie)

    total = sum(f.stat().st_size for f in sortie.rglob("*") if f.is_file())
    print("   Pret dans %s (%.1f Mo)"
          % (sortie.relative_to(RACINE), total / 1048576))


if __name__ == "__main__":
    main()
