# -*- coding: utf-8 -*-
"""Prepare la mise en ligne de la presentation sonorisee.

  python tools/publier_presentation_web.py

Produit, sous `presentation/<jeton>/`, de quoi consulter le dossier depuis un
telephone sans rien installer :
 - une page par langue qui enchaine les diapositives (image + commentaire),
 - les images en JPEG et les commentaires re-encodes en mp3 mono leger,
 - les deux .pptx complets, pour qui veut le fichier d'origine.

Le dossier porte un nom tire au sort : le lien se partage, mais ne se devine
pas et n'est reference nulle part (meta noindex + aucun lien depuis le site).
Le tout se deploie ensuite avec `bash deploy.sh path presentation`.
"""

import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DOCS = RACINE / "docs"
CIBLE = RACINE / "presentation"

LANGUES = {
    "fr": {
        "pptx": "Narjiss-argumentaire-direction-FR.pptx",
        "titre": "narjiss.company — De la vitrine au véritable outil de vente",
        "sous": "Dossier de présentation à la direction · Août 2026",
        "lancer": "Lancer la présentation",
        "reprendre": "Reprendre",
        "pause": "Pause",
        "texte": "Texte",
        "plein": "Plein écran",
        "telecharger": "Télécharger le PowerPoint",
        "sur": "sur",
        "autre": "النسخة العربية",
        "autre_href": "ar.html",
        "dir": "ltr",
    },
    "ar": {
        "pptx": "Narjiss-argumentaire-direction-AR.pptx",
        "titre": "narjiss.company — من موقع للعرض إلى أداة بيع حقيقية",
        "sous": "ملف تقديمي إلى إدارة نرجس للعقار · غشت 2026",
        "lancer": "ابدأ العرض",
        "reprendre": "استئناف",
        "pause": "إيقاف مؤقت",
        "texte": "النص",
        "plein": "ملء الشاشة",
        "telecharger": "تحميل ملف PowerPoint",
        "sur": "من",
        "autre": "Version française",
        "autre_href": "fr.html",
        "dir": "rtl",
    },
}

VERSION = "v5"   # a incrementer a chaque retouche des pages
LARGEUR_JPEG = 1400
QUALITE_JPEG = 80


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def exporter(langue, dossier):
    """Images des diapositives + duree de chaque commentaire, via PowerPoint."""
    import win32com.client
    from PIL import Image
    import time

    pptx = DOCS / LANGUES[langue]["pptx"]
    ppt = win32com.client.Dispatch("PowerPoint.Application")
    ppt.Visible = True
    pres = ppt.Presentations.Open(str(pptx), ReadOnly=1, Untitled=0, WithWindow=0)
    brut = Path(tempfile.mkdtemp(prefix="diapos-"))
    diapos = []
    try:
        for i in range(1, pres.Slides.Count + 1):
            diapo = pres.Slides(i)
            png = brut / ("d%02d.png" % i)
            for essai in range(4):        # PowerPoint refuse parfois d'ecrire
                try:
                    diapo.Export(str(png), "PNG", 1600, 900)
                    break
                except Exception:
                    time.sleep(2)
            else:
                sys.exit("Export impossible pour la diapositive %d" % i)

            jpg = dossier / ("d%02d.jpg" % i)
            with Image.open(png) as im:
                im = im.convert("RGB")
                h = round(im.height * LARGEUR_JPEG / im.width)
                im.resize((LARGEUR_JPEG, h), Image.LANCZOS).save(
                    jpg, "JPEG", quality=QUALITE_JPEG, optimize=True,
                    progressive=True)

            duree = 0.0
            for k in range(1, diapo.Shapes.Count + 1):
                if diapo.Shapes(k).Type == 16:
                    duree = diapo.Shapes(k).MediaFormat.Length / 1000.0
            notes = diapo.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text
            diapos.append({"n": i, "duree": round(duree, 1),
                           "texte": notes.replace("\r", " ").strip()})
            print("   diapo %2d/%d  %s  %5.1f s"
                  % (i, pres.Slides.Count, jpg.name, duree))
    finally:
        pres.Close()
    shutil.rmtree(brut, ignore_errors=True)
    return diapos


def alleger_sons(langue, dossier):
    """Les mp3 d'origine sont en stereo 128 kbit/s : mono 48 kbit/s suffit
    largement pour une voix, et divise le poids par trois."""
    source = DOCS / "voix-presentation" / langue
    exe = ffmpeg()
    total = 0
    for mp3 in sorted(source.glob("diapo-*.mp3")):
        numero = int(mp3.name.split("-")[1])
        sortie = dossier / ("s%02d.mp3" % numero)
        subprocess.run([exe, "-y", "-loglevel", "error", "-i", str(mp3),
                        "-ac", "1", "-b:a", "48k", str(sortie)], check=True)
        total += sortie.stat().st_size
    print("   sons : %d fichiers, %.1f Mo" % (len(list(dossier.glob("s*.mp3"))),
                                              total / 1048576))


PAGE = """<!doctype html>
<html lang="__LANG__" dir="__DIR__" translate="no">
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>__TITRE__</title>
<style>
  :root { --encre:#16211C; --ocre:#BD6B16; --gris:#9AA29B; --creme:#FAF7F2;
          /* jaune pastel : les boutons se detachaient mal du fond sombre */
          --pastel:#F4E5B8; --pastel-bord:#DFCB90; --lien:#E9A64F; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--encre); color:var(--creme);
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
         -webkit-text-size-adjust:100%; }
  header { padding:14px 16px 10px; }
  h1 { margin:0; font-size:15px; font-weight:600; line-height:1.35; }
  .sous { margin-top:3px; font-size:12px; color:var(--gris); }
  .scene { position:relative; background:#000; }
  .scene img { display:block; width:100%; height:auto; }
  .zone { position:absolute; top:0; bottom:0; width:32%; cursor:pointer; }
  .zone.g { inset-inline-start:0; } .zone.d { inset-inline-end:0; }
  .barre { height:3px; background:#2B3730; }
  .barre i { display:block; height:100%; width:0; background:var(--ocre);
             transition:width .25s linear; }
  /* Plein ecran fait main plutot qu'API Fullscreen : Safari iOS refuse de
     passer autre chose qu'une video en plein ecran, et c'est justement sur
     iPhone qu'on en a le plus besoin. Un simple position:fixed marche partout. */
  .scene.zoom { position:fixed; inset:0; z-index:50; background:#000;
                display:flex; align-items:center; justify-content:center;
                height:100vh; height:100dvh; }
  /* Chaque mesure est donnee deux fois : les navigateurs anterieurs a Safari
     15.4 / Chrome 108 ignorent `dvh` et gardent la ligne `vh` qui precede.
     Sans ce repli, l'image pivotee n'a plus aucune limite de taille. */
  .scene.zoom img { width:auto; height:auto;
                    max-width:100vw; max-height:100vh; max-height:100dvh; }
  /* Aucune page web ne peut coucher un telephone : c'est la diapositive qui
     pivote. L'appareil reste debout, l'image occupe toute la hauteur d'ecran
     dans le sens de la lecture. Apres rotation, largeur et hauteur s'echangent,
     d'ou les contraintes croisees.
     C'est une media query et non du JavaScript : le style se reevalue seul a
     la rotation, alors que resize/orientationchange ne se declenchent pas de
     facon fiable sur tous les telephones. */
  @media (orientation:portrait) and (max-width:760px) {
    .scene.zoom.pivot-auto img { transform:rotate(90deg);
                                 max-width:100vh; max-width:100dvh;
                                 max-height:100vw; }
  }
  /* choix explicite du lecteur (bouton ⟳) : passe apres, donc l'emporte */
  .scene.zoom.pivot-oui img { transform:rotate(90deg);
                              max-width:100vh; max-width:100dvh;
                              max-height:100vw; }
  .scene.zoom.pivot-non img { transform:none; max-width:100vw;
                              max-height:100vh; max-height:100dvh; }
  body.fige { overflow:hidden; }
  /* La barre d'outils du navigateur flotte par-dessus la page en paysage :
     sans cette marge, les boutons se retrouvent dessous, invisibles. */
  .flottant { display:none; position:fixed; z-index:51; inset-inline:0;
              bottom:calc(14px + env(safe-area-inset-bottom));
              justify-content:center; gap:10px; padding:10px;
              pointer-events:none; }
  .flottant button { pointer-events:auto; box-shadow:0 2px 14px rgba(0,0,0,.6); }
  body.fige .flottant { display:flex; }
  .flottant button { background:rgba(244,229,184,.95); }
  /* Telephone couche : la diapositive prend tout, le reste s'efface. */
  /* max-width:899px : reservee aux telephones couches. Sans cette borne, une
     fenetre d'ordinateur peu haute perdait aussi son titre et son pied de page. */
  @media (orientation:landscape) and (max-height:560px) and (max-width:899px) {
    header { display:none; }
    .scene { display:flex; justify-content:center; }
    .scene img { width:auto; max-width:100vw; max-height:calc(100vh - 72px); }
    .cmd { padding:7px 12px; gap:8px; }
    button { padding:6px 11px; font-size:13px; }
    footer { display:none; }
  }
  .cmd { display:flex; align-items:center; gap:10px; padding:12px 16px; flex-wrap:wrap; }
  button { font:inherit; font-size:14px; font-weight:600; color:var(--encre);
           background:var(--pastel); border:1px solid var(--pastel-bord);
           border-radius:9px; padding:9px 14px; cursor:pointer; }
  button.primaire { padding:14px 26px; }
  .compte { margin-inline-start:auto; font-size:13px; color:var(--gris);
            font-variant-numeric:tabular-nums; }
  .texte { display:none; padding:0 16px 18px; font-size:14px; line-height:1.6;
           color:#D7DCD6; }
  .texte.ouvert { display:block; }
  footer { padding:4px 16px 30px; font-size:13px; }
  footer a { color:var(--lien); text-decoration:none; }
  footer .ver { color:#5C665F; font-size:12px; margin-inline-start:18px; }
  footer a + a { margin-inline-start:18px; }
  .voile { position:absolute; inset:0; display:flex; align-items:center;
           justify-content:center; background:rgba(10,16,13,.62); }
  .voile button { font-size:16px; }
  /* Sur grand ecran, c'est la fenetre qui commande : la page tient dans la
     hauteur disponible et l'image prend ce qui reste, plutot qu'une largeur
     fixe qui repoussait les commandes sous la ligne de flottaison. */
  @media (min-width:900px) {
    h1 { font-size:18px; }
    header, .cmd, .texte, footer { max-width:1400px; margin-inline:auto; }
    body { height:100vh; height:100dvh; display:flex; flex-direction:column;
           overflow:hidden; }
    header, .barre, .cmd, footer { flex:0 0 auto; }
    footer { padding-bottom:14px; }
    .scene { flex:1 1 auto; min-height:0; display:flex;
             align-items:center; justify-content:center; }
    .scene img { width:auto; max-width:min(100%, 1400px); max-height:100%; }
    .texte { flex:0 1 auto; overflow-y:auto; }
  }
</style>
<header>
  <h1>__TITRE__</h1>
  <div class="sous">__SOUS__</div>
</header>
<div class="scene">
  <img id="vue" src="d01.jpg" alt="">
  <div class="zone g" id="zg"></div><div class="zone d" id="zd"></div>
  <div class="voile" id="voile"><button class="primaire" id="demarrer">__LANCER__</button></div>
  <div class="flottant">
    <button id="fprec">‹</button><button id="flecture">__PAUSE__</button>
    <button id="fsuiv">›</button><button id="pivot">⟳</button>
    <button id="fermer">✕</button>
  </div>
</div>
<div class="barre"><i id="jauge"></i></div>
<div class="cmd">
  <button id="prec">‹</button>
  <button id="lecture">__PAUSE__</button>
  <button id="suiv">›</button>
  <button id="btexte">__TEXTE__</button>
  <button id="plein">__PLEIN__</button>
  <span class="compte"><b id="num">1</b> __SUR__ __TOTAL__</span>
</div>
<div class="texte" id="transcription"></div>
<footer>
  <a href="__PPTX__" download>__TELECHARGER__</a>
  <a href="__AUTRE_HREF__">__AUTRE__</a>
  <span class="ver">__VERSION__</span>
</footer>
<audio id="son" preload="none"></audio>
<script>
const D = __DIAPOS__;
const flecture = document.getElementById('flecture');
const vue = document.getElementById('vue'), son = document.getElementById('son'),
      jauge = document.getElementById('jauge'), num = document.getElementById('num'),
      lecture = document.getElementById('lecture'), voile = document.getElementById('voile'),
      transcription = document.getElementById('transcription');
let i = 0, demarre = false;

function precharger(k) {
  if (D[k]) { const im = new Image(); im.src = 'd' + String(k + 1).padStart(2, '0') + '.jpg'; }
}
function afficher(k, jouer) {
  i = Math.max(0, Math.min(D.length - 1, k));
  vue.src = 'd' + String(i + 1).padStart(2, '0') + '.jpg';
  num.textContent = i + 1;
  transcription.textContent = D[i].texte;
  jauge.style.width = '0%';
  son.src = 's' + String(i + 1).padStart(2, '0') + '.mp3';
  precharger(i + 1);
  if (jouer) son.play().catch(() => {});
}
son.addEventListener('timeupdate', () => {
  if (son.duration) jauge.style.width = (100 * son.currentTime / son.duration) + '%';
});
son.addEventListener('ended', () => {
  if (i < D.length - 1) afficher(i + 1, true);
  else lecture.textContent = '__REPRENDRE__';
});
son.addEventListener('play', () => lecture.textContent = '__PAUSE__');
son.addEventListener('pause', () => lecture.textContent = '__REPRENDRE__');

document.getElementById('demarrer').onclick = () => {
  demarre = true; voile.remove(); afficher(0, true);
  // sur un petit ecran, la diapositive n'est lisible qu'en grand : on y va
  // directement plutot que d'imposer deux gestes de plus.
  if (innerWidth < 760) zoom(true);
};
lecture.onclick = () => { if (!demarre) return; son.paused ? son.play() : son.pause(); };
document.getElementById('prec').onclick = () => afficher(i - 1, demarre && !son.paused);
document.getElementById('suiv').onclick = () => afficher(i + 1, demarre && !son.paused);
document.getElementById('zg').onclick = () => afficher(i - 1, demarre && !son.paused);
document.getElementById('zd').onclick = () => afficher(i + 1, demarre && !son.paused);
document.getElementById('btexte').onclick = () => transcription.classList.toggle('ouvert');
const scene = document.querySelector('.scene');
function zoom(actif) {
  scene.classList.toggle('zoom', actif);
  document.body.classList.toggle('fige', actif);
  scene.classList.remove('pivot-oui', 'pivot-non');
  scene.classList.toggle('pivot-auto', actif);
  // en plus, le vrai plein ecran quand le navigateur le propose : il escamote
  // la barre d'adresse et autorise le verrouillage en paysage.
  if (actif && scene.requestFullscreen) {
    scene.requestFullscreen().then(() => {
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  } else if (!actif && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}
document.getElementById('plein').onclick = () => zoom(!scene.classList.contains('zoom'));
document.getElementById('pivot').onclick = () => {
  // on lit l'etat reellement affiche plutot qu'un drapeau : c'est le CSS qui
  // decide tant que le lecteur n'a rien impose.
  const couche = getComputedStyle(vue).transform !== 'none';
  scene.classList.remove('pivot-auto', 'pivot-oui', 'pivot-non');
  scene.classList.add(couche ? 'pivot-non' : 'pivot-oui');
};
document.getElementById('fermer').onclick = () => zoom(false);
document.getElementById('fprec').onclick = () => afficher(i - 1, demarre && !son.paused);
document.getElementById('fsuiv').onclick = () => afficher(i + 1, demarre && !son.paused);
document.getElementById('flecture').onclick = () => lecture.onclick();
son.addEventListener('play', () => flecture.textContent = '__PAUSE__');
son.addEventListener('pause', () => flecture.textContent = '__REPRENDRE__');
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && scene.classList.contains('zoom')) zoom(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') afficher(i + 1, demarre && !son.paused);
  if (e.key === 'ArrowLeft') afficher(i - 1, demarre && !son.paused);
  if (e.key === ' ') { e.preventDefault(); lecture.onclick(); }
  if (e.key === 'Escape') zoom(false);
});
precharger(1);
</script>
</html>
"""

ACCUEIL = """<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>narjiss.company — dossier de présentation</title>
<style>
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#16211C;color:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,
      "Segoe UI",Roboto,Arial,sans-serif;padding:24px;}
 .carte{max-width:420px;width:100%;text-align:center}
 .k{color:#BD6B16;font-size:13px;letter-spacing:.22em;font-weight:700}
 h1{font-size:21px;font-weight:600;line-height:1.4;margin:14px 0 6px}
 p{color:#9AA29B;font-size:14px;margin:0 0 26px}
 a{display:block;padding:15px;margin-bottom:11px;border-radius:11px;
   background:#F4E5B8;border:1px solid #DFCB90;color:#16211C;text-decoration:none;
   font-size:16px;font-weight:600}
</style>
<div class="carte">
  <div class="k">narjiss.company</div>
  <h1>Dossier de présentation à la direction</h1>
  <p>Août 2026 · 28 diapositives commentées</p>
  <a href="fr.html">Version française — 17 min</a>
  <a href="ar.html">النسخة العربية — 20 دقيقة</a>
</div>
</html>
"""


def ecrire_page(langue, dossier, diapos):
    (dossier / "diapos.json").write_text(
        json.dumps(diapos, ensure_ascii=False), encoding="utf-8")
    L = LANGUES[langue]
    page = PAGE
    for cle, valeur in (
            ("__LANG__", langue), ("__DIR__", L["dir"]), ("__TITRE__", L["titre"]),
            ("__SOUS__", L["sous"]), ("__LANCER__", L["lancer"]),
            ("__PAUSE__", L["pause"]), ("__REPRENDRE__", L["reprendre"]),
            ("__TEXTE__", L["texte"]), ("__PLEIN__", L["plein"]),
            ("__SUR__", L["sur"]),
            ("__TOTAL__", str(len(diapos))), ("__PPTX__", L["pptx"]),
            ("__TELECHARGER__", L["telecharger"]), ("__AUTRE__", L["autre"]),
            ("__AUTRE_HREF__", L["autre_href"]), ("__VERSION__", VERSION),
            ("__DIAPOS__", json.dumps(diapos, ensure_ascii=False))):
        page = page.replace(cle, valeur)
    (dossier / (langue + ".html")).write_text(page, encoding="utf-8")


def main():
    pages_seules = "--pages" in sys.argv
    CIBLE.mkdir(exist_ok=True)
    jeton_fichier = CIBLE / ".jeton"
    if jeton_fichier.exists():
        jeton = jeton_fichier.read_text(encoding="utf-8").strip()
    else:
        jeton = secrets.token_urlsafe(9).replace("-", "x").replace("_", "y")
        jeton_fichier.write_text(jeton, encoding="utf-8")
    racine = CIBLE / jeton
    racine.mkdir(exist_ok=True)

    for langue in ("fr", "ar"):
        print("Langue %s" % langue)
        dossier = racine / langue
        dossier.mkdir(exist_ok=True)
        if pages_seules:
            diapos = json.loads((dossier / "diapos.json").read_text(encoding="utf-8"))
        else:
            diapos = exporter(langue, dossier)
            alleger_sons(langue, dossier)
        ecrire_page(langue, dossier, diapos)
        if not pages_seules:
            # la page vit a cote de ses medias : un seul dossier a servir
            shutil.copy2(DOCS / LANGUES[langue]["pptx"],
                         dossier / LANGUES[langue]["pptx"])
        # lien vers l'autre langue : ../<autre>/<autre>.html
        page = dossier / (langue + ".html")
        autre = "ar" if langue == "fr" else "fr"
        page.write_text(page.read_text(encoding="utf-8").replace(
            'href="%s.html"' % autre,
            'href="../%s/%s.html?%s"' % (autre, autre, VERSION)),
            encoding="utf-8")

    accueil = ACCUEIL.replace('href="fr.html"', 'href="fr/fr.html?%s"' % VERSION)
    accueil = accueil.replace('href="ar.html"', 'href="ar/ar.html?%s"' % VERSION)
    (racine / "index.html").write_text(accueil, encoding="utf-8")

    poids = sum(f.stat().st_size for f in racine.rglob("*") if f.is_file())
    print("\nDossier pret : %s  (%.1f Mo)" % (racine, poids / 1048576))
    print("URL une fois deploye : https://www.narjiss.company/presentation/%s/"
          % jeton)


if __name__ == "__main__":
    main()
