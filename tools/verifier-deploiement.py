# -*- coding: utf-8 -*-
"""Le site en ligne a-t-il bien recu ce qu'on vient de deployer ?

A LANCER UNE FOIS, JUSTE APRES `bash deploy.sh code`.

    python tools/verifier-deploiement.py

CE N'EST PAS UN MONITEUR
------------------------
tools/verifier-prod.js surveille en continu l'IDENTITE du serveur (bonne IP,
bon certificat, notre PHP), et il evite deliberement de controler des versions :
une sonde qui crie au loup finit ignoree. Ce script-ci fait l'inverse et
l'assume : c'est un test de RECETTE, joue une fois, a un moment ou l'on sait
exactement ce qu'on vient d'envoyer. Les deux ne se marchent pas dessus.

POURQUOI IL EXISTE
------------------
Trois fois deja, des fichiers sont restes sur le poste local sans qu'aucun
message ne le signale : les CSV de points d'interet (Jawhara est reste des
semaines en ligne avec 18 POI au lieu de 77), les visites 3DVista republiees,
puis le dossier guides/ tout entier. Le point commun : `deploy.sh` ne se plaint
jamais de ce qu'il n'a pas ramasse. Seule une verification depuis l'exterieur
le voit.

CE QU'IL CONTROLE
-----------------
  - les deux noms de domaine aboutissent bien sur une page qui repond ;
  - chaque page attendue repond 200 ;
  - le menu en ligne connait l'entree Guides (preuve que shared/menu.js est a
    jour, et pas seulement present) ;
  - sitemap.xml et robots.txt sont servis, et leur contenu correspond au local ;
  - les feuilles de style versionnees referencees par l'accueil existent en
    ligne (une empreinte ?v= qui pointe dans le vide = page sans style).

Sort en code 1 si quelque chose manque.
"""
import io
import os
import sys
import json
import re
import urllib.request
import urllib.error

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGUES = ('fr', 'en', 'ar', 'es')
DELAI = 20


def site_url():
    with io.open(os.path.join(RACINE, 'data', 'site.json'), encoding='utf-8') as fh:
        return json.load(fh)['url'].rstrip('/')


SITE = site_url()
APEX = SITE.replace('://www.', '://')

ok_total = []
ko_total = []


def recuperer(url):
    """Retourne (code, corps_texte_ou_None, url_finale)."""
    req = urllib.request.Request(url, headers={'User-Agent': 'narjiss-verif/1.0'})
    try:
        r = urllib.request.urlopen(req, timeout=DELAI)
        brut = r.read()
        try:
            corps = brut.decode('utf-8', 'replace')
        except Exception:
            corps = None
        return r.getcode(), corps, r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, None, url
    except Exception as e:
        return repr(e), None, url


def controle(libelle, condition, detail=''):
    if condition:
        ok_total.append(libelle)
        print('  OK   %s' % libelle)
    else:
        ko_total.append((libelle, detail))
        print('  ECHEC %s   %s' % (libelle, detail))


def guides_attendus():
    """Slugs presents dans data/guides/guides.json, quel que soit leur statut :
    un brouillon est en noindex mais reste une page qui doit exister en ligne."""
    chemin = os.path.join(RACINE, 'data', 'guides', 'guides.json')
    if not os.path.exists(chemin):
        return []
    with io.open(chemin, encoding='utf-8') as fh:
        return [g['slug'] for g in json.load(fh)]


def main():
    print('Verification de %s' % SITE)
    print()

    print('Domaines')
    for nom in (APEX, SITE):
        code, _, final = recuperer(nom + '/')
        controle('%s aboutit sur une page' % nom, code == 200,
                 'code=%s final=%s' % (code, final))

    print()
    print('Pages principales')
    for chemin in ('/', '/explorer.html', '/disponibilites.html', '/guides.html',
                   '/carte.html', '/contact.html'):
        code, _, _ = recuperer(SITE + chemin)
        controle('%-24s' % chemin, code == 200, 'code=%s' % code)

    print()
    print('Menu a jour')
    code, corps, _ = recuperer(SITE + '/shared/menu.js')
    controle('shared/menu.js servi', code == 200, 'code=%s' % code)
    controle("le menu contient l'entree Guides",
             bool(corps) and 'guides.html' in corps,
             'menu.js en ligne encore sans Guides -> deploiement incomplet')

    print()
    print('Guides (%d x %d langues)' % (len(guides_attendus()), len(LANGUES)))
    manquants = 0
    for slug in guides_attendus():
        for lang in LANGUES:
            code, _, _ = recuperer('%s/guides/%s-%s.html' % (SITE, slug, lang))
            if code != 200:
                manquants += 1
                print('  ECHEC guides/%s-%s.html   code=%s' % (slug, lang, code))
    controle('les %d pages de guides repondent' % (len(guides_attendus()) * len(LANGUES)),
             manquants == 0, '%d manquante(s)' % manquants)

    print()
    print('Referencement')
    for nom in ('sitemap.xml', 'robots.txt'):
        code, corps, _ = recuperer(SITE + '/' + nom)
        local = os.path.join(RACINE, nom)
        attendu = io.open(local, encoding='utf-8').read() if os.path.exists(local) else None
        controle('%-12s servi' % nom, code == 200, 'code=%s' % code)
        if corps is not None and attendu is not None:
            controle('%-12s identique au local' % nom,
                     corps.strip() == attendu.strip(),
                     'le fichier en ligne differe : deploiement partiel ?')

    print()
    print('Ressources versionnees de l\'accueil')
    code, corps, _ = recuperer(SITE + '/')
    refs = re.findall(r'(?:href|src)="((?:shared|assets)/[^"]+\.(?:css|js)\?v=[0-9a-f]{8})"',
                      corps or '')
    if not refs:
        controle('references ?v= trouvees sur l\'accueil', False,
                 'aucune : page inattendue ?')
    for ref in sorted(set(refs)):
        c, _, _ = recuperer(SITE + '/' + ref)
        controle('%-42s' % ref, c == 200, 'code=%s' % c)

    print()
    print('-' * 60)
    print('%d controle(s) OK, %d en echec.' % (len(ok_total), len(ko_total)))
    if ko_total:
        print()
        print('A regarder :')
        for libelle, detail in ko_total:
            print('  - %s   %s' % (libelle, detail))
        print()
        print('Reflexe le plus frequent : un bucket de deploy.sh qui ne ramasse')
        print('pas le fichier. Verifier avec : bash deploy.sh code --dry-run')
        sys.exit(1)
    print('Tout ce qui etait attendu est en ligne.')


if __name__ == '__main__':
    main()
