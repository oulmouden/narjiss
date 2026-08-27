# -*- coding: utf-8 -*-
"""Genere les pages du menu « Guides » a partir des sources Markdown.

POURQUOI UN GENERATEUR
----------------------
Les guides sont le seul contenu du site dont la raison d'etre est le
referencement. Or les robots d'apercu social (WhatsApp, Facebook) et, pour une
large part, les moteurs, ne lisent PAS le JavaScript : un guide injecte par JS
comme le reste du site serait invisible. Le texte doit donc etre dans le HTML
servi.

Cela impose une page HTML par guide ET par langue -> 5 guides x 4 langues = 20
pages que personne ne veut maintenir a la main. D'ou ce generateur : on ecrit
du Markdown dans data/guides/, on lance ce script, il produit les 20 pages plus
la page d'accueil des guides.

USAGE
-----
    python tools/generer-guides.py
    python tools/generer-guides.py --verifier   # signale sans rien ecrire

APRES GENERATION, toujours enchainer :
    python tools/versionner.py
(le generateur ecrit les liens CSS/JS SANS ?v= ; c'est versionner.py qui pose
les empreintes de cache, comme pour toutes les autres pages du site.)

SOURCES
-------
    data/guides/guides.json          index : ordre, slug, icone, statut, date
    data/guides/<slug>/<lang>.md     un fichier par langue

En-tete d'un .md (avant la ligne ---) :
    titre:       titre de la page (balise <title> et <h1>)
    description: 150-160 caracteres, sert a la meta description et a l'apercu
    chapeau:     phrase d'accroche affichee sous le titre

Markdown reconnu (sous-ensemble volontairement restreint) :
    ## titre     ### sous-titre
    - puce       1. numero
    | a | b |    tableau (la 2e ligne de tirets est ignoree)
    > texte      encadre d'information
    !> texte     encadre « a faire confirmer » (jaune, tres visible)
    **gras**  *italique*  [texte](url)
"""
import os
import io
import re
import sys
import json

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(RACINE, 'data', 'guides')
SORTIE = os.path.join(RACINE, 'guides')

LANGUES = ('fr', 'en', 'ar', 'es')
RTL = ('ar',)

# Adresse publique du site : necessaire pour canonical et og:url, que les
# robots exigent en absolu. Lue dans data/site.json, partagee avec
# tools/generer-sitemap.py : deux domaines divergents produiraient des
# canonical qui se contredisent, le pire cas pour un moteur.
def site_url():
    with io.open(os.path.join(RACINE, 'data', 'site.json'), encoding='utf-8') as fh:
        return json.load(fh)['url'].rstrip('/')


SITE = site_url()

# Libelles de l'ossature des pages. Le contenu des guides vient des .md ;
# seuls les elements de structure vivent ici.
UI = {
    'fr': {
        'hub_titre': 'Guides de l\'achat immobilier au Maroc',
        'hub_chapeau': 'Ce qu\'il faut savoir avant d\'acheter : les frais réels, la vente sur plan, le crédit, l\'achat depuis l\'étranger et le choix du quartier.',
        'hub_meta': 'Guides pratiques NARJISS : frais d\'acquisition, achat sur plan (VEFA), crédit immobilier, achat depuis l\'étranger et quartiers d\'Agadir.',
        'lire': 'Lire le guide',
        'retour': 'Tous les guides',
        'maj': 'Mis à jour le',
        'sommaire': 'Dans ce guide',
        'brouillon': 'Guide en cours de complément — les montants et taux exacts y seront ajoutés après validation par notre notaire. Les mécanismes décrits, eux, sont à jour.',
        'brouillon_court': 'En cours de complément',
        'avertissement': 'Ce guide a une valeur d\'information générale. Les montants, taux et délais dépendent de la loi de finances en vigueur et de votre situation : faites-les confirmer par votre notaire ou votre conseiller avant tout engagement.',
        'aide_titre': 'Une question sur votre projet ?',
        'aide_texte': 'Nos conseillers répondent en français, arabe, anglais et espagnol.',
        'aide_bouton': 'Nous contacter',
        'aide_projets': 'Voir nos projets',
        'verif': 'À confirmer',
    },
    'en': {
        'hub_titre': 'Guides to buying property in Morocco',
        'hub_chapeau': 'What to know before you buy: the real costs, off-plan purchase, mortgages, buying from abroad and choosing the right area.',
        'hub_meta': 'NARJISS practical guides: acquisition costs, off-plan purchase (VEFA), mortgages, buying from abroad and the districts of Agadir.',
        'lire': 'Read the guide',
        'retour': 'All guides',
        'maj': 'Updated on',
        'sommaire': 'In this guide',
        'brouillon': 'Guide being expanded — exact amounts and rates will be added once validated by our notary. The mechanisms described are up to date.',
        'brouillon_court': 'Being expanded',
        'avertissement': 'This guide is general information. Amounts, rates and timeframes depend on the finance act in force and on your own situation: have them confirmed by your notary or adviser before committing.',
        'aide_titre': 'A question about your project?',
        'aide_texte': 'Our advisers answer in French, Arabic, English and Spanish.',
        'aide_bouton': 'Contact us',
        'aide_projets': 'See our projects',
        'verif': 'To be confirmed',
    },
    'ar': {
        'hub_titre': 'أدلة شراء العقار بالمغرب',
        'hub_chapeau': 'ما ينبغي معرفته قبل الشراء: التكاليف الحقيقية، الشراء على التصميم، القرض العقاري، الشراء من الخارج، واختيار الحي.',
        'hub_meta': 'أدلة عملية من نرجس: مصاريف الاقتناء، الشراء على التصميم، القرض العقاري، الشراء من الخارج، وأحياء أكادير.',
        'lire': 'قراءة الدليل',
        'retour': 'كل الأدلة',
        'maj': 'آخر تحديث',
        'sommaire': 'في هذا الدليل',
        'brouillon': 'دليل قيد الإتمام — ستُضاف المبالغ والنسب الدقيقة بعد مصادقة الموثق. أما الآليات الموصوفة فهي محيَّنة.',
        'brouillon_court': 'قيد الإتمام',
        'avertissement': 'هذا الدليل للإعلام العام. المبالغ والنسب والآجال تتوقف على قانون المالية الجاري به العمل وعلى وضعيتكم الخاصة: يرجى تأكيدها لدى الموثق أو المستشار قبل أي التزام.',
        'aide_titre': 'هل لديكم سؤال حول مشروعكم؟',
        'aide_texte': 'مستشارونا يجيبون بالفرنسية والعربية والإنجليزية والإسبانية.',
        'aide_bouton': 'اتصلوا بنا',
        'aide_projets': 'مشاريعنا',
        'verif': 'للتأكيد',
    },
    'es': {
        'hub_titre': 'Guías para comprar vivienda en Marruecos',
        'hub_chapeau': 'Lo que hay que saber antes de comprar: los gastos reales, la compra sobre plano, el crédito, la compra desde el extranjero y la elección del barrio.',
        'hub_meta': 'Guías prácticas NARJISS: gastos de adquisición, compra sobre plano (VEFA), crédito hipotecario, compra desde el extranjero y barrios de Agadir.',
        'lire': 'Leer la guía',
        'retour': 'Todas las guías',
        'maj': 'Actualizado el',
        'sommaire': 'En esta guía',
        'brouillon': 'Guía en proceso de ampliación — los importes y tipos exactos se añadirán tras la validación de nuestro notario. Los mecanismos descritos sí están actualizados.',
        'brouillon_court': 'En ampliación',
        'avertissement': 'Esta guía tiene valor informativo general. Los importes, tipos y plazos dependen de la ley de finanzas vigente y de su situación: haga que se los confirme su notario o su asesor antes de comprometerse.',
        'aide_titre': '¿Tiene una pregunta sobre su proyecto?',
        'aide_texte': 'Nuestros asesores responden en francés, árabe, inglés y español.',
        'aide_bouton': 'Contáctenos',
        'aide_projets': 'Ver nuestros proyectos',
        'verif': 'Por confirmar',
    },
}

# Noms de mois. L'arabe retenu est celui EMPLOYE AU MAROC (غشت, شتنبر...),
# pas la nomenclature levantine (أغسطس, سبتمبر) : le lecteur vise est
# marocain, et les deux jeux ne se ressemblent pas.
MOIS = {
    'fr': ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
           'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July',
           'August', 'September', 'October', 'November', 'December'],
    'es': ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
           'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    'ar': ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز',
           'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
}


def date_lisible(iso, lang):
    """2026-08-25 -> « 25 août 2026 ». La date est affichee au lecteur et
    participe de la credibilite du guide : la laisser en format machine
    donnait un air de page non finie."""
    try:
        annee, mois, jour = [int(x) for x in iso.split('-')]
        nom = MOIS.get(lang, MOIS['fr'])[mois - 1]
    except Exception:
        return iso
    if lang == 'es':
        return '%d de %s de %d' % (jour, nom, annee)
    return '%d %s %d' % (jour, nom, annee)


# Locales completes pour og:locale (les robots refusent « fr » seul).
OG_LOCALE = {'fr': 'fr_FR', 'en': 'en_US', 'ar': 'ar_MA', 'es': 'es_ES'}


# ---------------------------------------------------------------------------
# Lecture des sources
# ---------------------------------------------------------------------------

def lire_index():
    chemin = os.path.join(SOURCES, 'guides.json')
    with io.open(chemin, encoding='utf-8') as fh:
        return json.load(fh)


def lire_source(slug, lang):
    """Retourne (entete, corps_markdown) ou None si la traduction manque."""
    chemin = os.path.join(SOURCES, slug, lang + '.md')
    if not os.path.exists(chemin):
        return None
    with io.open(chemin, encoding='utf-8') as fh:
        brut = fh.read()

    entete = {}
    corps = brut
    if '\n---\n' in brut:
        tete, corps = brut.split('\n---\n', 1)
        for ligne in tete.splitlines():
            if ':' in ligne:
                cle, valeur = ligne.split(':', 1)
                entete[cle.strip()] = valeur.strip()
    return entete, corps.strip()


# ---------------------------------------------------------------------------
# Markdown -> HTML (sous-ensemble)
# ---------------------------------------------------------------------------

def echapper(txt):
    return (txt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
               .replace('"', '&quot;'))


def enrichir(txt):
    """Gras, italique et liens, sur un texte deja echappe."""
    txt = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', txt)
    txt = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', txt)
    txt = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', txt)
    return txt


def ligne_html(txt):
    return enrichir(echapper(txt))


def rendre(markdown, lang):
    """Convertit le corps Markdown en HTML, et retourne (html, sommaire).

    Le sommaire liste les titres de niveau 2 : c'est ce qui permet au lecteur
    de savoir en trois secondes si le guide repond a sa question.
    """
    html = []
    sommaire = []
    notes = []
    section_courante = ''
    lignes = markdown.split('\n')
    i = 0
    n_titre = 0

    def fermer(balise):
        if html and html[-1].startswith('<' + balise):
            pass

    while i < len(lignes):
        ligne = lignes[i].rstrip()

        if not ligne.strip():
            i += 1
            continue

        # Titres
        if ligne.startswith('### '):
            html.append('<h3>' + ligne_html(ligne[4:].strip()) + '</h3>')
            i += 1
            continue
        if ligne.startswith('## '):
            n_titre += 1
            ancre = 's' + str(n_titre)
            texte = ligne[3:].strip()
            sommaire.append((ancre, texte))
            section_courante = texte
            html.append('<h2 id="' + ancre + '">' + ligne_html(texte) + '</h2>')
            i += 1
            continue

        # Note « a confirmer » : elle s'adresse a l'equipe, pas au lecteur.
        # Elle est COLLECTEE, jamais ecrite dans la page. Un masquage CSS ne
        # suffirait pas : le texte resterait lisible dans le code source de
        # la page, donc publie de fait.
        if ligne.startswith('!> '):
            bloc = []
            while i < len(lignes) and lignes[i].startswith('!> '):
                bloc.append(lignes[i][3:].strip())
                i += 1
            notes.append((section_courante, ' '.join(bloc)))
            continue

        # Encadre d'information
        if ligne.startswith('> '):
            bloc = []
            while i < len(lignes) and lignes[i].startswith('> '):
                bloc.append(lignes[i][2:].strip())
                i += 1
            html.append('<div class="guide-note"><p>' + ligne_html(' '.join(bloc)) + '</p></div>')
            continue

        # Tableau
        if ligne.startswith('|'):
            rangees = []
            while i < len(lignes) and lignes[i].strip().startswith('|'):
                cellules = [c.strip() for c in lignes[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c or '') for c in cellules):
                    rangees.append(cellules)
                i += 1
            if rangees:
                out = ['<div class="guide-tableau"><table>']
                out.append('<thead><tr>' + ''.join(
                    '<th>' + ligne_html(c) + '</th>' for c in rangees[0]) + '</tr></thead>')
                out.append('<tbody>')
                for r in rangees[1:]:
                    out.append('<tr>' + ''.join('<td>' + ligne_html(c) + '</td>' for c in r) + '</tr>')
                out.append('</tbody></table></div>')
                html.append(''.join(out))
            continue

        # Liste a puces
        if ligne.startswith('- '):
            items = []
            while i < len(lignes) and lignes[i].startswith('- '):
                items.append('<li>' + ligne_html(lignes[i][2:].strip()) + '</li>')
                i += 1
            html.append('<ul>' + ''.join(items) + '</ul>')
            continue

        # Liste numerotee
        if re.match(r'^\d+\.\s', ligne):
            items = []
            while i < len(lignes) and re.match(r'^\d+\.\s', lignes[i]):
                items.append('<li>' + ligne_html(re.sub(r'^\d+\.\s', '', lignes[i]).strip()) + '</li>')
                i += 1
            html.append('<ol>' + ''.join(items) + '</ol>')
            continue

        # Paragraphe : on agrege les lignes jusqu'a la suivante vide
        bloc = []
        while i < len(lignes) and lignes[i].strip() and not re.match(
                r'^(#{2,3}\s|-\s|\d+\.\s|\||>\s|!>\s)', lignes[i]):
            bloc.append(lignes[i].strip())
            i += 1
        html.append('<p>' + ligne_html(' '.join(bloc)) + '</p>')

    return '\n'.join(html), sommaire, notes


# ---------------------------------------------------------------------------
# Gabarits
# ---------------------------------------------------------------------------

TETE_COMMUNE = """<script>(function(){try{var t=localStorage.getItem("nj-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="manifest" href="{base}manifest.json">
<link rel="apple-touch-icon" href="{base}images/icones/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="Narjiss">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1F2430" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/jpeg" href="{base}images/logo-narjiss.jpg">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500&family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}shared/menu.css">
<link rel="stylesheet" href="{base}shared/guides.css">"""


def bloc_seo(titre, description, url, image, lang, alternatives, noindex):
    """Balises que les robots lisent AVANT tout JavaScript.

    Ecrites en dur dans le HTML servi : c'est toute la raison d'etre de ce
    generateur. Un apercu WhatsApp ou Facebook ne verrait rien si elles etaient
    posees par script.
    """
    out = []
    out.append('<meta name="description" content="' + echapper(description) + '">')
    if noindex:
        # Un brouillon dont les chiffres ne sont pas valides ne doit surtout pas
        # etre indexe : une donnee fiscale fausse dans Google survit des mois.
        out.append('<meta name="robots" content="noindex, nofollow">')
    out.append('<link rel="canonical" href="' + url + '">')
    for l, u in alternatives:
        out.append('<link rel="alternate" hreflang="' + l + '" href="' + u + '">')
    out.append('<link rel="alternate" hreflang="x-default" href="' + alternatives[0][1] + '">')
    out.append('<meta property="og:type" content="article">')
    out.append('<meta property="og:site_name" content="NARJISS">')
    out.append('<meta property="og:title" content="' + echapper(titre) + '">')
    out.append('<meta property="og:description" content="' + echapper(description) + '">')
    out.append('<meta property="og:url" content="' + url + '">')
    out.append('<meta property="og:locale" content="' + OG_LOCALE[lang] + '">')
    out.append('<meta property="og:image" content="' + image + '">')
    out.append('<meta name="twitter:card" content="summary_large_image">')
    out.append('<meta name="twitter:title" content="' + echapper(titre) + '">')
    out.append('<meta name="twitter:description" content="' + echapper(description) + '">')
    out.append('<meta name="twitter:image" content="' + image + '">')
    return '\n'.join(out)


def page_guide(fiche, lang, entete, corps_html, sommaire, index):
    t = UI[lang]
    slug = fiche['slug']
    brouillon = fiche.get('statut') != 'publie'
    url = SITE + '/guides/' + slug + '-' + lang + '.html'
    image = SITE + '/' + fiche.get('image', 'images/logo-narjiss.jpg')
    alternatives = [(l, SITE + '/guides/' + slug + '-' + l + '.html') for l in LANGUES]

    jsonld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": entete.get('titre', ''),
        "description": entete.get('description', ''),
        "inLanguage": lang,
        "datePublished": fiche.get('date_publication', fiche.get('date_maj', '')),
        "dateModified": fiche.get('date_maj', ''),
        "image": image,
        "author": {"@type": "Organization", "name": "NARJISS IMMOBILIERE"},
        "publisher": {
            "@type": "Organization",
            "name": "NARJISS IMMOBILIERE",
            "logo": {"@type": "ImageObject", "url": SITE + "/images/logo-narjiss.jpg"},
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
    }

    alt_js = json.dumps({l: slug + '-' + l + '.html' for l in LANGUES}, ensure_ascii=False)

    som = ''
    if len(sommaire) > 1:
        liens = ''.join('<li><a href="#' + a + '">' + ligne_html(x) + '</a></li>'
                        for a, x in sommaire)
        som = ('<nav class="guide-sommaire" aria-label="' + t['sommaire'] + '">'
               '<h2>' + t['sommaire'] + '</h2><ol>' + liens + '</ol></nav>')

    autres = ''.join(
        '<a class="guide-suite-carte" href="' + f['slug'] + '-' + lang + '.html">'
        '<span class="guide-suite-icone" aria-hidden="true">' + f.get('icone', '') + '</span>'
        '<span>' + echapper(f['_titres'][lang]) + '</span></a>'
        for f in index if f['slug'] != slug and lang in f['_titres'])

    return """<!DOCTYPE html>
<html lang="{lang}" dir="{dir}">
<head>
{tete}
<title>{titre_page}</title>
{seo}
<script type="application/ld+json">{jsonld}</script>
</head>
<body>
<div id="mainMenu"></div>
<main class="guide-page">
  <article class="guide-article">
    {banniere}
    <nav class="guide-fil"><a href="../guides.html#{lang}">{retour}</a></nav>
    <header class="guide-entete">
      <div class="guide-icone" aria-hidden="true">{icone}</div>
      <h1>{h1}</h1>
      <p class="guide-chapeau">{chapeau}</p>
      <p class="guide-date">{maj} {date}</p>
    </header>
    {sommaire}
    <div class="guide-corps">
{corps}
    </div>
    <p class="guide-avertissement">{avertissement}</p>
  </article>

  <aside class="guide-aide">
    <h2>{aide_titre}</h2>
    <p>{aide_texte}</p>
    <div class="guide-aide-actions">
      <a class="guide-btn guide-btn-plein" href="../contact.html#{lang}">{aide_bouton}</a>
      <a class="guide-btn" href="../explorer.html#{lang}">{aide_projets}</a>
    </div>
  </aside>

  <section class="guide-suite">
    <h2>{retour}</h2>
    <div class="guide-suite-grille">{autres}</div>
  </section>
</main>
<div id="mainFooter"></div>

<script src="../shared/menu.js"></script>
<script>
/* Une page = une langue. Les boutons FR/EN/AR/ES du menu ne peuvent donc pas
   se contenter de rebasculer les libelles : ils doivent emmener le lecteur sur
   le fichier de la langue choisie. */
var PAGE_LANG = '{lang}';
var GUIDE_ALT = {alt_js};

// On pose le hash AVANT initPage() : sans lui, le menu s'afficherait en
// francais sur une page arabe. replaceState evite de polluer l'historique.
if (!/^#(fr|en|ar|es)$/.test(window.location.hash)) {{
  history.replaceState(null, '', '#' + PAGE_LANG);
}}

window.onLanguageChange = function (lang) {{
  if (lang !== PAGE_LANG && GUIDE_ALT[lang]) window.location.href = GUIDE_ALT[lang];
}};

document.addEventListener('DOMContentLoaded', function () {{
  initPage('guides', '../');
}});
</script>
</body>
</html>
""".format(
        lang=lang,
        dir='rtl' if lang in RTL else 'ltr',
        tete=TETE_COMMUNE.replace('{base}', '../'),
        titre_page=echapper(entete.get('titre', '') + ' — NARJISS'),
        seo=bloc_seo(entete.get('titre', ''), entete.get('description', ''), url,
                     image, lang, alternatives, brouillon),
        jsonld=json.dumps(jsonld, ensure_ascii=False),
        banniere=('<div class="guide-brouillon">' + t['brouillon'] + '</div>') if brouillon else '',
        retour=t['retour'],
        icone=fiche.get('icone', ''),
        h1=ligne_html(entete.get('titre', '')),
        chapeau=ligne_html(entete.get('chapeau', '')),
        maj=t['maj'],
        date=date_lisible(fiche.get('date_maj', ''), lang),
        sommaire=som,
        corps=corps_html,
        avertissement=t['avertissement'],
        aide_titre=t['aide_titre'],
        aide_texte=t['aide_texte'],
        aide_bouton=t['aide_bouton'],
        aide_projets=t['aide_projets'],
        alt_js=alt_js,
        autres=autres,
    )


def page_hub(index):
    """Page d'accueil des guides : une seule page, quatre langues en JS.

    Contrairement aux articles, ce n'est pas une cible de referencement (elle
    n'apporte aucun contenu propre) : la convention du site — un fichier, un
    hash de langue — s'applique donc sans reserve.
    """
    donnees = {}
    for lang in LANGUES:
        donnees[lang] = {
            'titre': UI[lang]['hub_titre'],
            'chapeau': UI[lang]['hub_chapeau'],
            'lire': UI[lang]['lire'],
            'brouillon': UI[lang]['brouillon_court'],
            'maj': UI[lang]['maj'],
            'guides': [
                {
                    'slug': f['slug'],
                    'icone': f.get('icone', ''),
                    'titre': f['_titres'].get(lang, ''),
                    'description': f['_descriptions'].get(lang, ''),
                    'date': f.get('date_maj', ''),
                    'brouillon': f.get('statut') != 'publie',
                }
                for f in index if lang in f['_titres']
            ],
        }

    alternatives = [(l, SITE + '/guides.html#' + l) for l in LANGUES]

    return """<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
{tete}
<title>{titre} — NARJISS</title>
{seo}
</head>
<body>
<div id="mainMenu"></div>
<main class="guide-page">
  <header class="guide-hub-entete">
    <h1 id="hubTitre">{titre}</h1>
    <p id="hubChapeau">{chapeau}</p>
  </header>
  <div class="guide-hub-grille" id="hubGrille"></div>
</main>
<div id="mainFooter"></div>

<script src="shared/menu.js"></script>
<script>
var GUIDES = {donnees};

window.onLanguageChange = function (lang) {{
  var d = GUIDES[lang] || GUIDES.fr;
  document.getElementById('hubTitre').textContent = d.titre;
  document.getElementById('hubChapeau').textContent = d.chapeau;

  var html = '';
  for (var i = 0; i < d.guides.length; i++) {{
    var g = d.guides[i];
    html += '<a class="guide-carte" href="guides/' + g.slug + '-' + lang + '.html">' +
      (g.brouillon ? '<span class="guide-carte-brouillon">' + d.brouillon + '</span>' : '') +
      '<span class="guide-carte-icone" aria-hidden="true">' + g.icone + '</span>' +
      '<h2>' + g.titre + '</h2>' +
      '<p>' + g.description + '</p>' +
      '<span class="guide-carte-lire">' + d.lire + '</span>' +
      '</a>';
  }}
  document.getElementById('hubGrille').innerHTML = html;
}};

document.addEventListener('DOMContentLoaded', function () {{
  initPage('guides', '');
}});
</script>
</body>
</html>
""".format(
        tete=TETE_COMMUNE.replace('{base}', ''),
        titre=echapper(UI['fr']['hub_titre']),
        chapeau=echapper(UI['fr']['hub_chapeau']),
        seo=bloc_seo(UI['fr']['hub_titre'], UI['fr']['hub_meta'],
                     SITE + '/guides.html', SITE + '/images/logo-narjiss.jpg',
                     'fr', alternatives, False),
        donnees=json.dumps(donnees, ensure_ascii=False),
    )


# ---------------------------------------------------------------------------

def ecrire_liste_relecture(collecte, index):
    """Ecrit docs/guides-a-valider.md : ce que l'equipe doit faire confirmer.

    Ces notes ne figurent PLUS dans les pages. Sans ce document elles
    seraient perdues — et un guide partirait en ligne avec des trous que
    plus personne ne saurait identifier.

    Le fichier vit dans docs/, qui est interdit d'exploration par
    robots.txt et absent du lot de deploiement : il ne quitte pas le poste.
    """
    lignes = ['# Guides — points à faire valider', '']
    lignes.append('Document **généré** par `tools/generer-guides.py`. Ne pas le corriger à la main :')
    lignes.append('les notes vivent dans les sources `data/guides/<slug>/<langue>.md`, préfixées `!>`.')
    lignes.append('')
    lignes.append("Une note disparaît d'ici quand elle disparaît de la source, c'est-à-dire")
    lignes.append('quand le chiffre a été obtenu et écrit dans les **quatre** langues.')
    lignes.append('')

    total = 0
    for fiche in index:
        slug = fiche['slug']
        par_langue = collecte.get(slug, {})
        if not any(par_langue.values()):
            continue
        titre = fiche['_titres'].get('fr', slug)
        lignes.append('## ' + titre)
        lignes.append('')
        lignes.append('`data/guides/' + slug + '/` — statut : **' +
                      (fiche.get('statut') or 'brouillon') + '**')
        lignes.append('')
        # Les quatre langues portent les memes notes : on n'affiche que le
        # francais, et on signale toute divergence, qui trahirait une
        # traduction desynchronisee.
        reference = [n[1] for n in par_langue.get('fr', [])]
        for section, texte in par_langue.get('fr', []):
            total += 1
            lignes.append('- [ ] **' + (section or 'Introduction') + '** — ' + texte)
        for lang in LANGUES:
            if lang == 'fr':
                continue
            autres = [n[1] for n in par_langue.get(lang, [])]
            if len(autres) != len(reference):
                lignes.append('')
                lignes.append('> ⚠ La version `' + lang + '` porte ' + str(len(autres)) +
                              ' note(s) contre ' + str(len(reference)) + ' en français :')
                lignes.append('> les traductions ont divergé, à reprendre avant publication.')
        lignes.append('')

    if total == 0:
        lignes.append('Aucune note en attente : tous les chiffres ont été validés.')
        lignes.append('')
        lignes.append('Les guides peuvent passer en `statut: publie` dans')
        lignes.append('`data/guides/guides.json`, puis être régénérés.')

    with io.open(os.path.join(RACINE, 'docs', 'guides-a-valider.md'), 'w',
                 encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(lignes) + '\n')
    return total


def main():
    verifier = '--verifier' in sys.argv
    index = lire_index()

    # Premiere passe : lire toutes les sources (les cartes « autres guides »
    # ont besoin des titres des voisins).
    for fiche in index:
        fiche['_titres'] = {}
        fiche['_descriptions'] = {}
        fiche['_sources'] = {}
        for lang in LANGUES:
            lu = lire_source(fiche['slug'], lang)
            if not lu:
                print('  ! traduction manquante : %s / %s' % (fiche['slug'], lang))
                continue
            entete, corps = lu
            fiche['_titres'][lang] = entete.get('titre', fiche['slug'])
            fiche['_descriptions'][lang] = entete.get('description', '')
            fiche['_sources'][lang] = (entete, corps)

    if not os.path.isdir(SORTIE):
        os.makedirs(SORTIE)

    ecrits = 0
    collecte = {}
    for fiche in index:
        collecte[fiche['slug']] = {}
        for lang, (entete, corps) in sorted(fiche['_sources'].items()):
            corps_html, sommaire, notes = rendre(corps, lang)
            collecte[fiche['slug']][lang] = notes
            page = page_guide(fiche, lang, entete, corps_html, sommaire, index)
            cible = os.path.join(SORTIE, fiche['slug'] + '-' + lang + '.html')
            if verifier:
                print('  = %s' % os.path.relpath(cible, RACINE))
            else:
                with io.open(cible, 'w', encoding='utf-8', newline='\n') as fh:
                    fh.write(page)
                ecrits += 1

    hub = os.path.join(RACINE, 'guides.html')
    if verifier:
        print('  = guides.html')
    else:
        with io.open(hub, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(page_hub(index))
        ecrits += 1

    brouillons = [f['slug'] for f in index if f.get('statut') != 'publie']
    print('%d page(s) %s.' % (ecrits, 'a ecrire' if verifier else 'ecrites'))
    if not verifier:
        restant = ecrire_liste_relecture(collecte, index)
        print('%d point(s) a faire valider -> docs/guides-a-valider.md' % restant)
    if brouillons:
        print('Brouillons (noindex, hors sitemap) : ' + ', '.join(brouillons))
    print('Enchainer avec : python tools/versionner.py')


if __name__ == '__main__':
    main()
