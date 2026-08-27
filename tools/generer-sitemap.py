# -*- coding: utf-8 -*-
"""Genere sitemap.xml et robots.txt a partir du contenu reel du site.

POURQUOI
--------
Sans plan de site, Google decouvre les pages au hasard des liens. Or l'essentiel
du contenu de Narjiss vit derriere un parametre d'URL (project.html?id=jawhara)
ou dans un dossier sans page d'index (guides/). Un sitemap est le seul moyen
fiable de dire au moteur : voici les 40 pages qui existent, avec leur date.

Il est GENERE, jamais ecrit a la main : une liste figee se serait desynchronisee
au premier projet ajoute. Ici les projets viennent de data/projects.json et les
guides de data/guides/guides.json — les memes sources que le site lui-meme.

CE QUI N'Y ENTRE PAS
--------------------
- Les guides en brouillon : ils portent robots=noindex. Les mettre au sitemap
  reviendrait a demander l'indexation de pages qu'on interdit d'indexer.
- Les espaces prives (admin, api, espace commercial, bureau de vente).
- Les pages qui traitent des donnees personnelles (fiche de renseignement,
  selection d'un visiteur) : elles n'ont rien a faire dans un index public.
- Les pages qui n'existent pas sans parametre (tour-360.html seul).
- Les langues : le site sert ses quatre langues sur la MEME URL avec un hash
  (#ar), et un hash n'est pas une URL distincte pour un moteur. Seuls les
  guides, qui ont un fichier par langue, sont declares en quatre versions
  reliees par hreflang.

USAGE
-----
    python tools/generer-sitemap.py
    python tools/generer-sitemap.py --verifier   # affiche sans rien ecrire

A relancer apres tout ajout de projet, de guide, ou de page publique.
"""
import os
import io
import re
import sys
import json
import datetime

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGUES = ('fr', 'en', 'ar', 'es')


def site_url():
    """Adresse canonique, lue dans data/site.json (source unique du domaine)."""
    with io.open(os.path.join(RACINE, 'data', 'site.json'), encoding='utf-8') as fh:
        return json.load(fh)['url'].rstrip('/')


SITE = site_url()

# ---------------------------------------------------------------------------
# Pages publiques a URL fixe.
#   (chemin local, chemin publie)
# L'accueil est publie a la racine : nginx sert index.html sur « / », et
# declarer les deux formes creerait un doublon aux yeux du moteur.
# ---------------------------------------------------------------------------
PAGES_FIXES = [
    ('index.html', '/'),
    ('explorer.html', '/explorer.html'),
    ('disponibilites.html', '/disponibilites.html'),
    ('guides.html', '/guides.html'),
    # Page ville, une par langue (tools/generer-page-ville.py). Ce sont de VRAIS
    # fichiers, pas des ancres : c'est ce qui les rend indexables, contrairement
    # aux formes #en / #ar des autres pages, que le moteur ne distingue pas de
    # leur version francaise.
    ('immobilier-agadir-fr.html', '/immobilier-agadir-fr.html'),
    ('immobilier-agadir-en.html', '/immobilier-agadir-en.html'),
    ('immobilier-agadir-ar.html', '/immobilier-agadir-ar.html'),
    ('immobilier-agadir-es.html', '/immobilier-agadir-es.html'),
    ('carte.html', '/carte.html'),
    ('demo.html', '/demo.html'),
    ('apropos.html', '/apropos.html'),
    ('contact.html', '/contact.html'),
    ('mentions-legales.html', '/mentions-legales.html'),
    ('confidentialite.html', '/confidentialite.html'),
    ('conditions.html', '/conditions.html'),
]

# Chemins interdits d'exploration.
#
# DEUX PIEGES, tous deux evites ici :
#
# 1. robots.txt empeche la VISITE, pas l'indexation. Une URL interdite mais
#    liee ailleurs peut apparaitre dans les resultats, sans titre ni resume.
#    Pour la faire disparaitre il faut un <meta name="robots" content="noindex">
#    SUR la page — et donc la laisser explorable pour que le moteur le lise.
#    C'est ce que portent desormais fiche.html, ma-selection.html,
#    espace-agent.html, bureaudevente.html et visite-editeur.html : elles ne
#    figurent volontairement PAS dans cette liste.
#
# 2. Interdire une ressource necessaire au rendu revient a se saborder. Tout le
#    contenu du site est injecte en JavaScript depuis data/*.json et api/*.php :
#    bloquer /data/ ou /api/ ferait voir a Google des pages vides. Ces deux
#    dossiers restent donc explorables, a dessein.
INTERDITS = [
    '/admin/',
    '/presentation/',
    '/outputs/',
    '/docs/',
    '/tools/',
    '/sql/',
    '/kb/',
    '/maintenance.html',
    '/qr.php',
    '/ecoute.php',
]


def date_fichier(*chemins):
    """Date de derniere modification la plus recente parmi les fichiers donnes.

    Le lastmod d'une fiche projet ne depend pas que de project.html : si
    projects.json change, le contenu de la page change aussi.
    """
    dates = []
    for c in chemins:
        p = os.path.join(RACINE, c)
        if os.path.exists(p):
            dates.append(os.path.getmtime(p))
    if not dates:
        return None
    return datetime.date.fromtimestamp(max(dates)).isoformat()


def projets():
    with io.open(os.path.join(RACINE, 'data', 'projects.json'), encoding='utf-8') as fh:
        return json.load(fh)


def guides_publies():
    """Guides dont le statut est « publie ». Les brouillons sont noindex."""
    chemin = os.path.join(RACINE, 'data', 'guides', 'guides.json')
    if not os.path.exists(chemin):
        return []
    with io.open(chemin, encoding='utf-8') as fh:
        index = json.load(fh)
    return [g for g in index if g.get('statut') == 'publie']


def a_des_poi(projet):
    """Vrai si le projet a un fichier de points d'interet : sans lui la page
    de localisation n'a rien a montrer, et on ne l'annonce pas au moteur."""
    dossier = projet.get('folder') or projet['id']
    return os.path.exists(os.path.join(RACINE, dossier, projet['id'] + '_fr.csv'))


def a_des_medias(projet, sliders):
    """Vrai si l'album du projet a un contenu propre.

    Memes sources que medias.js : `gallery`, `media.gallery`, `panoramas`,
    `videos`, et data/project-sliders.json. On EXCLUT volontairement le repli
    sur l'image hero : une page d'album qui ne montre que la photo deja vue en
    couverture est une page mince, et annoncer des pages minces au moteur
    dessert le site entier.
    """
    media = projet.get('media') or {}
    return bool(projet.get('gallery') or media.get('gallery')
                or projet.get('panoramas') or projet.get('videos')
                or sliders.get(projet['id']))


def construire_urls():
    """Retourne la liste des entrees du sitemap : (url, lastmod, alternatives)."""
    urls = []

    for local, publie in PAGES_FIXES:
        if not os.path.exists(os.path.join(RACINE, local)):
            print('  ! page absente, ignoree : ' + local)
            continue
        urls.append((SITE + publie, date_fichier(local, 'data/projects.json'), []))

    # Fiches projet et leurs pages satellites.
    sliders_path = os.path.join(RACINE, 'data', 'project-sliders.json')
    sliders = {}
    if os.path.exists(sliders_path):
        with io.open(sliders_path, encoding='utf-8') as fh:
            sliders = json.load(fh)

    for p in projets():
        # Un projet annonce « bientot » n'a pas de page a proposer : la vignette
        # elle-meme ne pointe nulle part.
        if p.get('status') != 'live':
            continue
        pid = p['id']
        urls.append((SITE + '/project.html?id=' + pid,
                     date_fichier('project.html', 'project.js', 'data/projects.json'), []))
        if a_des_poi(p):
            urls.append((SITE + '/localisation.html?id=' + pid,
                         date_fichier('localisation.html', 'localisation.js',
                                      (p.get('folder') or pid) + '/' + pid + '_fr.csv'), []))
        if a_des_medias(p, sliders):
            urls.append((SITE + '/medias.html?id=' + pid,
                         date_fichier('medias.html', 'medias.js',
                                      'data/project-sliders.json', 'data/projects.json'), []))

    # Guides publies : un fichier par langue, les quatre relies par hreflang.
    for g in guides_publies():
        slug = g['slug']
        alternatives = []
        presents = []
        for lang in LANGUES:
            rel = 'guides/%s-%s.html' % (slug, lang)
            if os.path.exists(os.path.join(RACINE, rel)):
                presents.append((lang, SITE + '/' + rel))
        alternatives = presents
        for lang, url in presents:
            urls.append((url, g.get('date_maj') or date_fichier('guides/%s-%s.html' % (slug, lang)),
                         alternatives))

    return urls


def echapper(url):
    return (url.replace('&', '&amp;').replace("'", '&apos;')
               .replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;'))


def rendre_sitemap(urls):
    out = ['<?xml version="1.0" encoding="UTF-8"?>']
    out.append('<!-- Genere par tools/generer-sitemap.py - ne pas editer a la main. -->')
    out.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
               ' xmlns:xhtml="http://www.w3.org/1999/xhtml">')
    for url, lastmod, alternatives in urls:
        out.append('  <url>')
        out.append('    <loc>' + echapper(url) + '</loc>')
        if lastmod:
            out.append('    <lastmod>' + lastmod + '</lastmod>')
        # changefreq et priority sont volontairement absents : Google a
        # publiquement indique qu'il les ignore. Les ecrire donnerait
        # l'illusion d'un reglage qui n'en est pas un.
        for lang, alt in alternatives:
            out.append('    <xhtml:link rel="alternate" hreflang="' + lang
                       + '" href="' + echapper(alt) + '"/>')
        out.append('  </url>')
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


def rendre_robots():
    lignes = [
        '# Genere par tools/generer-sitemap.py - ne pas editer a la main.',
        '',
        'User-agent: *',
    ]
    for chemin in INTERDITS:
        lignes.append('Disallow: ' + chemin)
    lignes += [
        '',
        '# Le plan de site liste les pages publiques, y compris celles qui vivent',
        "# derriere un parametre d'URL et qu'aucun lien ne revele.",
        'Sitemap: ' + SITE + '/sitemap.xml',
        '',
    ]
    return '\n'.join(lignes)


def main():
    verifier = '--verifier' in sys.argv
    urls = construire_urls()

    if verifier:
        for url, lastmod, alt in urls:
            print('  %s  %s%s' % (lastmod or '----------', url,
                                  '  (+%d langues)' % len(alt) if alt else ''))
        print('%d URL.' % len(urls))
        return

    with io.open(os.path.join(RACINE, 'sitemap.xml'), 'w',
                 encoding='utf-8', newline='\n') as fh:
        fh.write(rendre_sitemap(urls))
    with io.open(os.path.join(RACINE, 'robots.txt'), 'w',
                 encoding='utf-8', newline='\n') as fh:
        fh.write(rendre_robots())

    guides = len([u for u in urls if '/guides/' in u[0]])
    print('sitemap.xml : %d URL (dont %d pages de guides).' % (len(urls), guides))
    print('robots.txt  : %d chemins interdits, sitemap declare.' % len(INTERDITS))
    if guides == 0:
        print('Aucun guide au sitemap : tous sont en brouillon (noindex). '
              'Normal tant que les chiffres ne sont pas valides.')


if __name__ == '__main__':
    main()
