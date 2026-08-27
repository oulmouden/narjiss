# -*- coding: utf-8 -*-
"""Pose les balises SEO manquantes sur les pages ecrites a la main.

POURQUOI
--------
Les guides et la page ville sont generes : leurs balises viennent du
generateur. Les autres pages du site sont ecrites a la main et n'avaient
AUCUNE meta description, aucune balise og: ni twitter:. Consequences :

  - Google fabriquait lui-meme le resume affiche sous le titre, souvent a
    partir d'un fragment de menu ;
  - un lien du site colle dans WhatsApp s'affichait en texte nu, sans titre ni
    image. C'est le premier canal de partage au Maroc.

CE SCRIPT EST IDEMPOTENT
------------------------
Une page qui porte deja une meta description est laissee INTACTE : on ne
recrit jamais par-dessus un texte choisi a la main. Relancer le script apres
avoir ajuste une description ne l'ecrase donc pas.

Les textes vivent ici, en francais, parce que c'est la langue du HTML servi :
le reste du site est traduit par JavaScript, que les robots d'apercu social ne
lisent pas. Une page qui existerait vraiment en quatre langues demanderait
quatre fichiers, comme la page ville.

USAGE
-----
    python tools/poser-seo-pages.py
    python tools/poser-seo-pages.py --verifier
"""
import io
import json
import os
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def site_url():
    with io.open(os.path.join(RACINE, 'data', 'site.json'), encoding='utf-8') as fh:
        return json.load(fh)['url'].rstrip('/')


SITE = site_url()

# Image de partage. Le logo depanne, mais une vraie image 1200x630 par page
# ferait bien mieux : c'est elle que voit le destinataire avant de cliquer.
IMAGE = SITE + '/images/logo-narjiss.jpg'

# (fichier, url publiee, titre de partage, description)
# Descriptions visees a 150-160 caracteres : au-dela, Google tronque.
PAGES = [
    ('index.html', '/',
     'NARJISS — Promoteur immobilier à Agadir',
     "NARJISS, promoteur immobilier à Agadir depuis 1990 : appartements neufs et terrains à bâtir, visites virtuelles 360° et cartes de quartier interactives."),
    ('explorer.html', '/explorer.html',
     'Nos projets immobiliers à Agadir — NARJISS',
     "Tous les programmes NARJISS à Agadir : appartements et terrains à bâtir, avec plans, photos et visites 360° pour choisir avant de vous déplacer."),
    ('disponibilites.html', '/disponibilites.html',
     'Logements et lots disponibles à Agadir — NARJISS',
     "Les lots et logements encore disponibles dans les programmes NARJISS à Agadir : surfaces, typologies et plans de masse, tenus à jour par nos équipes."),
    ('carte.html', '/carte.html',
     'Carte de nos projets à Agadir — NARJISS',
     "Carte interactive des programmes NARJISS à Agadir : situez chaque résidence et découvrez les commerces, écoles et services de son quartier."),
    ('demo.html', '/demo.html',
     'Démonstration guidée — NARJISS',
     "Découvrez en quelques minutes ce que permet le site NARJISS : visites virtuelles 360°, cartes de quartier et sélection de lots, expliquées pas à pas."),
    ('apropos.html', '/apropos.html',
     'À propos de NARJISS Immobilière',
     "NARJISS, promoteur immobilier à Agadir depuis 1990 : notre histoire, nos engagements et notre façon d'accompagner les acquéreurs jusqu'à la remise des clés."),
    ('contact.html', '/contact.html',
     'Contacter NARJISS à Agadir',
     "Joignez nos conseillers à Agadir par téléphone, WhatsApp ou e-mail, pour un projet d'achat, une question ou la visite d'un de nos programmes."),
    ('guides.html', '/guides.html', None, None),          # deja pourvue par le generateur
    ('project.html', '/project.html',
     'Nos programmes immobiliers à Agadir — NARJISS',
     "Plans, typologies, photos, visite virtuelle 360° et environnement du quartier : tout ce qu'il faut savoir sur un programme NARJISS avant de se déplacer."),
    ('medias.html', '/medias.html',
     'Photos et vidéos de nos programmes — NARJISS',
     "Photos, vidéos et panoramas 360° des programmes immobiliers NARJISS à Agadir, pour découvrir chaque résidence à distance."),
    ('localisation.html', '/localisation.html',
     'Le quartier de nos programmes à Agadir — NARJISS',
     "Commerces, écoles, santé, transports : découvrez en détail l'environnement de chaque programme NARJISS à Agadir, sur une carte interactive."),
    ('mentions-legales.html', '/mentions-legales.html',
     'Mentions légales — NARJISS Immobilière',
     "Mentions légales du site de NARJISS Immobilière, promoteur immobilier à Agadir : éditeur, hébergeur et propriété intellectuelle."),
    ('confidentialite.html', '/confidentialite.html',
     'Confidentialité — NARJISS Immobilière',
     "Quelles données NARJISS Immobilière collecte, pourquoi, combien de temps elle les conserve, et comment exercer vos droits."),
    ('conditions.html', '/conditions.html',
     "Conditions d'utilisation — NARJISS Immobilière",
     "Les conditions d'utilisation du site de NARJISS Immobilière : usage du contenu, des visites virtuelles et des services en ligne."),
]

# Donnees structurees de l'entreprise, sur l'accueil uniquement.
#
# C'est la fiche d'identite que le moteur rattache au site : le type
# RealEstateAgent et la localite Agadir sont ce qui inscrit NARJISS dans le
# paysage local. A poser sur UNE page seulement — repetee partout, elle perd
# son sens de declaration d'identite.
def jsonld_organisation():
    data = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        '@id': SITE + '/#organisation',
        'name': 'NARJISS Immobilière',
        'alternateName': 'NARJISS',
        'url': SITE + '/',
        'logo': SITE + '/images/logo-narjiss.jpg',
        'image': SITE + '/images/logo-narjiss.jpg',
        'description': "Promoteur immobilier à Agadir depuis 1990 : appartements neufs et terrains à bâtir.",
        'foundingDate': '1990',
        'address': {'@type': 'PostalAddress', 'addressLocality': 'Agadir', 'addressCountry': 'MA'},
        'areaServed': {'@type': 'City', 'name': 'Agadir'},
        'knowsLanguage': ['fr', 'ar', 'en', 'es'],
    }
    return json.dumps(data, ensure_ascii=False)


def echapper(txt):
    return (str(txt).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


def balises(url, titre, description, avec_jsonld):
    out = [
        '<!-- Balises lues par les moteurs et les apercus de messagerie AVANT tout',
        '     JavaScript. Posees par tools/poser-seo-pages.py ; modifiables a la main,',
        '     le script ne recrit jamais par-dessus. -->',
        '<meta name="description" content="' + echapper(description) + '">',
        '<link rel="canonical" href="' + SITE + url + '">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="NARJISS">',
        '<meta property="og:title" content="' + echapper(titre) + '">',
        '<meta property="og:description" content="' + echapper(description) + '">',
        '<meta property="og:url" content="' + SITE + url + '">',
        '<meta property="og:locale" content="fr_FR">',
        '<meta property="og:image" content="' + IMAGE + '">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + echapper(titre) + '">',
        '<meta name="twitter:description" content="' + echapper(description) + '">',
        '<meta name="twitter:image" content="' + IMAGE + '">',
    ]
    if avec_jsonld:
        out.append('<script type="application/ld+json">' + jsonld_organisation() + '</script>')
    return '\n'.join(out) + '\n'


def main():
    verifier = '--verifier' in sys.argv
    touches = ignorees = 0

    for fichier, url, titre, description in PAGES:
        chemin = os.path.join(RACINE, fichier)
        if not os.path.isfile(chemin):
            print('%-26s absente' % fichier)
            continue
        if titre is None:
            print('%-26s generee ailleurs, laissee telle quelle' % fichier)
            ignorees += 1
            continue

        with io.open(chemin, encoding='utf-8') as fh:
            html = fh.read()

        if 'name="description"' in html:
            print('%-26s deja pourvue' % fichier)
            ignorees += 1
            continue
        if '</head>' not in html:
            print('%-26s pas de </head> : ignoree' % fichier)
            continue

        bloc = balises(url, titre, description, fichier == 'index.html')
        html = html.replace('</head>', bloc + '</head>', 1)
        if not verifier:
            with io.open(chemin, 'w', encoding='utf-8', newline='') as fh:
                fh.write(html)
        touches += 1
        print('%-26s %s' % (fichier, 'a completer' if verifier else 'completee'))

    print('\n%d page(s) %s, %d laissee(s) telle(s) quelle(s).'
          % (touches, 'a completer' if verifier else 'completees', ignorees))
    if not verifier and touches:
        print('Enchainer avec : python tools/versionner.py')


if __name__ == '__main__':
    main()
