# -*- coding: utf-8 -*-
"""Genere la page « Immobilier a Agadir », une par langue.

POURQUOI CETTE PAGE
-------------------
Sur une requete locale comme « immobilier Agadir », le resultat qui gagne a
presque toujours une page dont l'URL, le titre et le H1 disent exactement ca.
Or l'accueil du site s'appelle « Narjiss - Immobilier au Maroc », son H1 parle
d'investir sereinement, et le mot « Agadir » n'apparait NULLE PART dans son
HTML : les localites arrivent par JavaScript depuis data/projects.json. Le
moteur n'avait donc rien a se mettre sous la dent.

UNE PAGE PAR LANGUE, ET DE VRAIS FICHIERS
-----------------------------------------
Le reste du site porte sa langue dans une ancre (index.html#ar). Google ignore
tout ce qui suit le # : les versions arabe, anglaise et espagnole n'existent
pas dans son index. Le hub des guides fait meme l'erreur de declarer ses
hreflang sur ces ancres, ce qui ne sert a rien. On produit donc ici quatre
fichiers distincts, relies par des hreflang qui pointent sur de vraies URL.

CONTENU GENERE, PAS REDIGE
--------------------------
La liste des projets vient de data/projects.json : ajouter un projet et
relancer ce script suffit. Rien n'est invente — les champs absents (prix,
livraison, standing) ne sont tout simplement pas affiches. Une page locale qui
annonce des chiffres faux se paie beaucoup plus cher qu'une page sobre.

USAGE
-----
    python tools/generer-page-ville.py
    python tools/generer-page-ville.py --verifier

APRES, toujours :
    python tools/generer-sitemap.py
    python tools/versionner.py
"""
import io
import json
import os
import sys
import importlib.util

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# On emprunte le bloc SEO au generateur de guides plutot que de le recopier :
# deux implementations divergeraient au premier ajustement, et c'est exactement
# le genre d'ecart qui produit des canonical contradictoires. Le nom du fichier
# comporte des tirets, d'ou le chargement explicite.
_spec = importlib.util.spec_from_file_location(
    'generer_guides', os.path.join(RACINE, 'tools', 'generer-guides.py'))
_g = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_g)

echapper = _g.echapper
bloc_seo = _g.bloc_seo
SITE = _g.SITE
LANGUES = _g.LANGUES
RTL = _g.RTL

SLUG = 'immobilier-agadir'
VILLE = 'Agadir'

UI = {
    'fr': {
        'titre': 'Immobilier à Agadir — appartements et terrains',
        'h1': 'Immobilier à Agadir',
        'meta': "Nos programmes immobiliers à Agadir : {n} projets NARJISS, appartements et terrains à bâtir, avec visites virtuelles 360° et plans de masse.",
        'chapeau': "NARJISS est promoteur immobilier à Agadir depuis 1990. Retrouvez ici l'ensemble de nos programmes dans la ville et ses environs — appartements neufs et terrains à bâtir — avec pour chacun son quartier, ses plans et, quand elle existe, sa visite virtuelle à 360°.",
        'projets': 'Nos projets à Agadir',
        'appartements': 'Appartements neufs',
        'terrains': 'Terrains à bâtir',
        'voir': 'Voir le projet →',
        'quartier': 'Quartier',
        'guides_titre': 'Acheter à Agadir : ce qu\'il faut savoir',
        'guides_texte': "Avant de vous décider, ces guides répondent aux questions qui reviennent le plus souvent.",
        'guides_hub': "Tous nos guides de l'achat immobilier",
        'cta_titre': 'Un projet à Agadir ?',
        'cta_texte': "Nos conseillers connaissent chaque quartier de la ville. Dites-nous ce que vous cherchez, nous vous orientons.",
        'cta_bouton': 'Nous contacter',
        'cta_dispo': 'Voir les disponibilités',
        'compte': '{n} projets en commercialisation',
    },
    'en': {
        'titre': 'Real estate in Agadir — apartments and land',
        'h1': 'Real estate in Agadir',
        'meta': "Our property developments in Agadir: {n} NARJISS projects, new apartments and building plots, with 360° virtual tours and site plans.",
        'chapeau': "NARJISS has been a property developer in Agadir since 1990. Here are all our developments in and around the city — new apartments and building plots — each with its neighbourhood, its plans and, where available, its 360° virtual tour.",
        'projets': 'Our projects in Agadir',
        'appartements': 'New apartments',
        'terrains': 'Building plots',
        'voir': 'View project →',
        'quartier': 'Neighbourhood',
        'guides_titre': 'Buying in Agadir: what to know',
        'guides_texte': 'Before you decide, these guides answer the questions that come up most often.',
        'guides_hub': "All our property buying guides",
        'cta_titre': 'A project in Agadir?',
        'cta_texte': 'Our advisors know every neighbourhood in the city. Tell us what you are looking for and we will point you the right way.',
        'cta_bouton': 'Contact us',
        'cta_dispo': 'See availability',
        'compte': '{n} projects currently on sale',
    },
    'ar': {
        'titre': 'عقارات في أكادير — شقق وأراضٍ',
        'h1': 'عقارات في أكادير',
        'meta': "مشاريعنا العقارية في أكادير: {n} مشروعًا من نرجس، شقق جديدة وأراضٍ للبناء، مع جولات افتراضية 360° وتصاميم عامة.",
        'chapeau': "نرجس منعش عقاري بأكادير منذ 1990. تجد هنا جميع مشاريعنا في المدينة وضواحيها — شقق جديدة وأراضٍ للبناء — مع الحي والتصاميم، والجولة الافتراضية 360° حيثما توفرت.",
        'projets': 'مشاريعنا في أكادير',
        'appartements': 'شقق جديدة',
        'terrains': 'أراضٍ للبناء',
        'voir': 'عرض المشروع ←',
        'quartier': 'الحي',
        'guides_titre': 'الشراء في أكادير: ما يجب معرفته',
        'guides_texte': 'قبل أن تقرر، تجيب هذه الأدلة عن الأسئلة الأكثر تكرارًا.',
        'guides_hub': "جميع أدلة الشراء العقاري لدينا",
        'cta_titre': 'مشروع في أكادير؟',
        'cta_texte': 'مستشارونا يعرفون كل حي في المدينة. أخبرنا بما تبحث عنه ونوجهك.',
        'cta_bouton': 'اتصل بنا',
        'cta_dispo': 'عرض المتوفر',
        'compte': '{n} مشروعًا في التسويق',
    },
    'es': {
        'titre': 'Inmobiliaria en Agadir — pisos y terrenos',
        'h1': 'Inmobiliaria en Agadir',
        'meta': "Nuestras promociones en Agadir: {n} proyectos NARJISS, pisos nuevos y terrenos edificables, con visitas virtuales 360° y planos generales.",
        'chapeau': "NARJISS es promotor inmobiliario en Agadir desde 1990. Aquí están todas nuestras promociones en la ciudad y sus alrededores — pisos nuevos y terrenos edificables — cada una con su barrio, sus planos y, cuando existe, su visita virtual de 360°.",
        'projets': 'Nuestros proyectos en Agadir',
        'appartements': 'Pisos nuevos',
        'terrains': 'Terrenos edificables',
        'voir': 'Ver el proyecto →',
        'quartier': 'Barrio',
        'guides_titre': 'Comprar en Agadir: lo que hay que saber',
        'guides_texte': 'Antes de decidir, estas guías responden a las preguntas más frecuentes.',
        'guides_hub': "Todas nuestras guías de compra",
        'cta_titre': '¿Un proyecto en Agadir?',
        'cta_texte': 'Nuestros asesores conocen cada barrio de la ciudad. Díganos qué busca y le orientamos.',
        'cta_bouton': 'Contáctenos',
        'cta_dispo': 'Ver disponibilidad',
        'compte': '{n} proyectos en comercialización',
    },
}


def tr(champ, lang):
    """Un champ multilingue de projects.json, avec repli sur le francais."""
    if not isinstance(champ, dict):
        return champ or ''
    return champ.get(lang) or champ.get('fr') or champ.get('en') or ''


def lire_projets():
    with io.open(os.path.join(RACINE, 'data', 'projects.json'), encoding='utf-8') as fh:
        tous = json.load(fh)
    # Seuls les projets de la ville, et seulement ceux qui sont en ligne : une
    # page locale qui liste des projets non publies enverrait le visiteur sur
    # une fiche vide, et le moteur sur une impasse.
    return [p for p in tous
            if VILLE.lower() in tr(p.get('location'), 'fr').lower()
            and p.get('status') == 'live']


def lire_guides():
    chemin = os.path.join(RACINE, 'data', 'guides', 'guides.json')
    if not os.path.isfile(chemin):
        return []
    with io.open(chemin, encoding='utf-8') as fh:
        index = json.load(fh)
    fiches = index.get('guides', index) if isinstance(index, dict) else index
    # Aucun repli sur les brouillons, et c'est délibéré : un brouillon est
    # généré en noindex et reste hors du sitemap. Faire pointer notre meilleure
    # page locale vers des pages que le moteur a ordre d'ignorer diluerait son
    # maillage interne au lieu de le renforcer. Tant que rien n'est publié, la
    # section renvoie vers le hub des guides, lui indexable.
    return [f for f in fiches if f.get('statut') == 'publie']


def titre_guide(slug, lang):
    """Le titre d'un guide vit dans l'en-tête du .md, pas dans guides.json."""
    source = _g.lire_source(slug, lang) or _g.lire_source(slug, 'fr')
    return (source[0].get('titre') if source else '') or slug


def url_page(lang):
    return SITE + '/' + SLUG + '-' + lang + '.html'


def carte_projet(p, lang, t):
    """Une carte de projet, ENTIEREMENT dans le HTML servi.

    C'est tout l'objet de cette page : les memes cartes existent deja sur
    explorer.html, mais construites en JavaScript — invisibles pour un robot
    d'apercu social, et faiblement prises en compte par les moteurs.
    """
    nom = echapper(tr(p.get('name'), lang))
    lieu = echapper(tr(p.get('location'), lang))
    desc = echapper(tr(p.get('description'), lang))
    href = 'project.html?id=' + p['id'] + '#' + lang
    logo = p.get('images', {}).get('logo') or ''
    img = ('<img src="' + echapper(logo) + '" alt="' + nom + '" loading="lazy" width="72" height="72">'
           if logo else '')
    return (
        '      <li class="ville-projet">\n'
        '        <a href="' + href + '">\n'
        '          ' + img + '\n'
        '          <span class="ville-projet-txt">\n'
        '            <strong>' + nom + '</strong>\n'
        '            <span class="ville-projet-lieu">📍 ' + lieu + '</span>\n'
        + ('            <span class="ville-projet-desc">' + desc + '</span>\n' if desc else '') +
        '            <span class="ville-projet-lire">' + echapper(t['voir']) + '</span>\n'
        '          </span>\n'
        '        </a>\n'
        '      </li>\n')


def jsonld(projets, lang, t):
    """RealEstateAgent + la liste des projets.

    L'adresse est ce qui rattache l'entreprise a Agadir aux yeux du moteur —
    c'est le signal que la page entiere existe pour porter.
    """
    elements = []
    for i, p in enumerate(projets, 1):
        elements.append({
            '@type': 'ListItem',
            'position': i,
            'name': tr(p.get('name'), lang),
            'url': SITE + '/project.html?id=' + p['id'],
        })
    data = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'RealEstateAgent',
                '@id': SITE + '/#organisation',
                'name': 'NARJISS',
                'url': SITE + '/',
                'image': SITE + '/images/logo-narjiss.jpg',
                'address': {
                    '@type': 'PostalAddress',
                    'addressLocality': VILLE,
                    'addressCountry': 'MA',
                },
                'areaServed': {'@type': 'City', 'name': VILLE},
            },
            {
                '@type': 'ItemList',
                'name': t['projets'],
                'numberOfItems': len(projets),
                'itemListElement': elements,
            },
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=None)


def page(lang, projets, guides):
    t = UI[lang]
    titre = t['titre']
    meta = t['meta'].format(n=len(projets))
    alternatives = [(l, url_page(l)) for l in LANGUES]
    seo = bloc_seo(titre, meta, url_page(lang), SITE + '/images/logo-narjiss.jpg',
                   lang, alternatives, False)

    apparts = [p for p in projets if p.get('type') == 'appartements']
    terrains = [p for p in projets if p.get('type') == 'terrains']
    autres = [p for p in projets if p.get('type') not in ('appartements', 'terrains')]

    groupes = []
    for titre_groupe, lot in ((t['appartements'], apparts),
                              (t['terrains'], terrains),
                              (t['projets'], autres)):
        if not lot:
            continue
        groupes.append('    <h3>' + echapper(titre_groupe) + ' <span class="ville-compte">('
                       + str(len(lot)) + ')</span></h3>\n    <ul class="ville-liste">\n'
                       + ''.join(carte_projet(p, lang, t) for p in lot)
                       + '    </ul>\n')

    if guides:
        liens_guides = ''.join(
            '      <li><a href="guides/' + g['slug'] + '-' + lang + '.html">'
            + echapper(titre_guide(g['slug'], lang)) + '</a></li>\n'
            for g in guides)
    else:
        liens_guides = ('      <li><a href="guides.html#' + lang + '">'
                        + echapper(t['guides_hub']) + '</a></li>\n')

    return (
        '<!DOCTYPE html>\n'
        '<html lang="' + lang + '" dir="' + ('rtl' if lang in RTL else 'ltr') + '">\n'
        '<head>\n'
        '<script>(function(){try{var t=localStorage.getItem("nj-theme");'
        'if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>\n'
        '<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        '<link rel="manifest" href="manifest.json">\n'
        '<link rel="apple-touch-icon" href="images/icones/apple-touch-icon.png">\n'
        '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">\n'
        '<meta name="theme-color" content="#1F2430" media="(prefers-color-scheme: dark)">\n'
        '<link rel="icon" type="image/jpeg" href="images/logo-narjiss.jpg">\n'
        '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500'
        '&family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">\n'
        '<link rel="stylesheet" href="shared/menu.css">\n'
        '<link rel="stylesheet" href="shared/guides.css">\n'
        '<title>' + echapper(titre) + ' — NARJISS</title>\n'
        + seo + '\n'
        '<script type="application/ld+json">' + jsonld(projets, lang, t) + '</script>\n'
        '</head>\n'
        '<body>\n'
        '<div id="mainMenu"></div>\n'
        '<main class="guide-page">\n'
        '  <header class="guide-hub-entete">\n'
        '    <h1>' + echapper(t['h1']) + '</h1>\n'
        '    <p>' + echapper(t['chapeau']) + '</p>\n'
        '    <p class="ville-compte-total">' + echapper(t['compte'].format(n=len(projets))) + '</p>\n'
        '  </header>\n'
        '  <section class="ville-projets">\n'
        '    <h2>' + echapper(t['projets']) + '</h2>\n'
        + ''.join(groupes) +
        '  </section>\n'
        + ('  <section class="ville-guides">\n'
           '    <h2>' + echapper(t['guides_titre']) + '</h2>\n'
           '    <p>' + echapper(t['guides_texte']) + '</p>\n'
           '    <ul>\n' + liens_guides + '    </ul>\n'
           '  </section>\n' if liens_guides else '') +
        '  <section class="ville-cta">\n'
        '    <h2>' + echapper(t['cta_titre']) + '</h2>\n'
        '    <p>' + echapper(t['cta_texte']) + '</p>\n'
        '    <p>\n'
        '      <a class="btn btn-primary" href="contact.html#' + lang + '">' + echapper(t['cta_bouton']) + '</a>\n'
        '      <a class="btn btn-outline" href="disponibilites.html#' + lang + '">' + echapper(t['cta_dispo']) + '</a>\n'
        '    </p>\n'
        '  </section>\n'
        '</main>\n'
        '<div id="mainFooter"></div>\n'
        '<script src="shared/menu.js"></script>\n'
        '<script>\n'
        '/* Une page = une langue, comme pour les guides. Les boutons FR/EN/AR/ES\n'
        '   du menu ne peuvent donc pas se contenter de retraduire les libelles :\n'
        "   ils doivent emmener le lecteur sur le fichier de la langue choisie. */\n"
        "var PAGE_LANG = '" + lang + "';\n"
        'var VILLE_ALT = ' + json.dumps({l: SLUG + '-' + l + '.html' for l in LANGUES}) + ';\n'
        '\n'
        '/* Le hash est pose AVANT initPage(). Celui-ci lit la langue dans\n'
        "   l'ancre et, sans elle, retombe sur le francais : la page arabe\n"
        '   s\'affichait avec un menu francais, lang="fr" et dir="ltr" — donc un\n'
        '   contenu arabe rendu de gauche a droite. replaceState evite de\n'
        "   polluer l'historique. */\n"
        'if (!/^#(fr|en|ar|es)$/.test(window.location.hash)) {\n'
        "  history.replaceState(null, '', '#' + PAGE_LANG);\n"
        '}\n'
        '\n'
        'window.onLanguageChange = function (lang) {\n'
        '  if (lang !== PAGE_LANG && VILLE_ALT[lang]) window.location.href = VILLE_ALT[lang];\n'
        '};\n'
        '\n'
        "document.addEventListener('DOMContentLoaded', function () { initPage('projects', ''); });\n"
        '</script>\n'
        '</body>\n'
        '</html>\n')


def main():
    verifier = '--verifier' in sys.argv
    projets = lire_projets()
    if not projets:
        print('Aucun projet « %s » publie : rien a generer.' % VILLE)
        return
    guides = lire_guides()

    ecrits = 0
    for lang in LANGUES:
        html = page(lang, projets, guides)
        chemin = os.path.join(RACINE, SLUG + '-' + lang + '.html')
        ancien = ''
        if os.path.isfile(chemin):
            with io.open(chemin, encoding='utf-8') as fh:
                ancien = fh.read()
        if ancien == html:
            print('%-28s inchangee' % os.path.basename(chemin))
            continue
        if not verifier:
            with io.open(chemin, 'w', encoding='utf-8', newline='') as fh:
                fh.write(html)
        ecrits += 1
        print('%-28s %s' % (os.path.basename(chemin), 'a ecrire' if verifier else 'ecrite'))

    print('\n%d projet(s) a %s, %d page(s) %s.'
          % (len(projets), VILLE, ecrits, 'a ecrire' if verifier else 'ecrites'))
    if not verifier:
        print('Enchainer avec : python tools/generer-sitemap.py puis python tools/versionner.py')


if __name__ == '__main__':
    main()
