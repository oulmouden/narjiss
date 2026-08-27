# -*- coding: utf-8 -*-
"""Versionne automatiquement les CSS et JS locaux des pages HTML.

POURQUOI
--------
Le serveur renvoie des en-tetes de cache tres longs :
    narjiss.company (nginx) : max-age=315360000  -> 10 ans
Un fichier .css ou .js modifie n'atteindrait donc jamais les visiteurs
deja venus. La seule parade fiable est de changer son URL.

COMMENT
-------
Chaque reference recoit ?v=<empreinte>, ou l'empreinte est calculee sur
le CONTENU du fichier. Consequence :
  - un fichier modifie  -> nouvelle empreinte -> retelecharge aussitot
  - un fichier inchange -> meme empreinte     -> reste en cache
C'est superieur a un compteur manuel : rien a incrementer, rien a
oublier, et seuls les fichiers reellement modifies sont retelecharges.

USAGE
-----
    python tools/versionner.py            # applique
    python tools/versionner.py --verifier # signale sans rien modifier
"""
import os
import io
import re
import sys
import hashlib

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Dossiers ignores : outils, sauvegardes, migrations, contenus generes.
EXCLUS = ('.git', '.claude', '.agents', 'node_modules', 'old-site-images',
          'wp-migration', 'resido-migration', '.tmp_qrcode_pkg', 'docs',
          'GUIDE', 'mimosas-report', 'outputs', 'visites', 'jawhara',
          'andalusia', 'api', 'sql', 'kb')

# href="..." ou src="..." pointant vers un .css/.js local, avec ou sans ?v=
MOTIF = re.compile(r'((?:href|src)=")(?!https?:|//)([^"?]+?\.(?:css|js))(\?[^"]*)?(")')

_cache = {}


def empreinte(chemin):
    """8 caracteres issus du SHA-1 du contenu."""
    if chemin in _cache:
        return _cache[chemin]
    with open(chemin, 'rb') as fh:
        h = hashlib.sha1(fh.read()).hexdigest()[:8]
    _cache[chemin] = h
    return h


def pages_html():
    for dirpath, dirnames, filenames in os.walk(RACINE):
        dirnames[:] = [d for d in dirnames if d not in EXCLUS]
        for name in filenames:
            if name.endswith('.html'):
                yield os.path.join(dirpath, name)



# ---------------------------------------------------------------
# Ressources injectees par JavaScript
# ---------------------------------------------------------------
# liveguide.css/.js/-config.js ne figurent dans aucune page HTML :
# menu.js les insere a l'execution en utilisant la constante
# LIVEGUIDE_VERSION. Elle etait bumpee a la main ("28"), donc oubliee
# des qu'on modifiait liveguide.js sans y penser. On la derive ici de
# l'empreinte combinee des trois fichiers.
INJECTES = {
    'shared/menu.js': (
        re.compile(r"(var LIVEGUIDE_VERSION = ')([^']*)(')"),
        ['shared/liveguide.css', 'shared/liveguide.js', 'shared/liveguide-config.js'],
    ),
}


def versionner_injectes():
    resultats = []
    for fichier, (motif, dependances) in INJECTES.items():
        chemin = os.path.join(RACINE, fichier)
        if not os.path.isfile(chemin):
            continue
        h = hashlib.sha1()
        absentes = []
        for dep in dependances:
            dchemin = os.path.join(RACINE, dep)
            if os.path.isfile(dchemin):
                with open(dchemin, 'rb') as fh:
                    h.update(fh.read())
            else:
                absentes.append(dep)
        empreinte_combinee = h.hexdigest()[:8]
        source = io.open(chemin, encoding='utf-8').read()
        nouveau = motif.sub(lambda m: m.group(1) + empreinte_combinee + m.group(3), source)
        change = nouveau != source
        if change:
            io.open(chemin, 'w', encoding='utf-8').write(nouveau)
        resultats.append((fichier, empreinte_combinee, change, absentes))
    return resultats

def main():
    verif = '--verifier' in sys.argv
    total = introuvables = modifiees = 0
    manquants = []

    # D'abord les ressources injectees : cela modifie shared/menu.js, dont
    # l'empreinte doit ensuite etre repercutee dans les pages HTML.
    if not verif:
        for fichier, emp, change, absentes in versionner_injectes():
            print('%-34s LIVEGUIDE_VERSION = %s  %s'
                  % (fichier, emp, 'mis a jour' if change else 'deja a jour'))
            for dep in absentes:
                print('   ATTENTION : %s introuvable' % dep)

    for page in sorted(pages_html()):
        source = io.open(page, encoding='utf-8').read()
        dossier = os.path.dirname(page)
        compte = [0]

        def remplacer(m):
            prefixe, chemin, ancien, fin = m.group(1), m.group(2), m.group(3), m.group(4)
            absolu = os.path.normpath(os.path.join(dossier, chemin))
            if not os.path.isfile(absolu):
                manquants.append((os.path.relpath(page, RACINE), chemin))
                return m.group(0)
            compte[0] += 1
            return prefixe + chemin + '?v=' + empreinte(absolu) + fin

        nouveau = MOTIF.sub(remplacer, source)
        total += compte[0]

        rel = os.path.relpath(page, RACINE).replace(os.sep, '/')
        if nouveau != source:
            modifiees += 1
            if not verif:
                io.open(page, 'w', encoding='utf-8').write(nouveau)
            print('%-34s %2d reference(s)  %s' % (rel, compte[0],
                                                  'a mettre a jour' if verif else 'mis a jour'))
        else:
            print('%-34s %2d reference(s)  deja a jour' % (rel, compte[0]))

    print()
    print('%d references versionnees dans %d page(s)' % (total, modifiees))
    if manquants:
        print()
        print('ATTENTION - fichiers references mais introuvables :')
        for page, chemin in manquants:
            print('  %s -> %s' % (page, chemin))
        introuvables = len(manquants)
    if verif:
        print()
        print('(mode verification : aucun fichier modifie)')
    return 1 if introuvables else 0


if __name__ == '__main__':
    sys.exit(main())
