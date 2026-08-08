#!/usr/bin/env python3
"""
tools/lots-demo-jawhara.py — grille de lots de démo pour Jawhara, calée sur le plan.

L'ancienne grille (`narjiss-lots-jawhara-demo.csv`, 90 lots) était une trame
inventée de toutes pièces : 3 immeubles x 5 niveaux x 6 lots. Le plan de masse
dit tout autre chose. Un conseiller qui connaît le projet le verrait
immédiatement, et les contours tracés dans l'éditeur n'auraient pas de lot à
qui se rattacher.

CE QUI EST MESURÉ (compté sur `jawhara/PLAN DE MASSE.pdf`, vectoriel, en
relevant les libellés de pièces par immeuble — voir le tableau ci-dessous) :
le nombre de magasins au rez-de-chaussée, le nombre de logements par étage
courant, et le nombre moyen de chambres par logement.

    immeuble   magasins   logements/étage   chambres/logement
       A          22            20                 2.0
       B           2             9                 1.3
       C           4             9                 2.2

Le comptage a été validé par le client : 22 magasins au RDC de l'immeuble A.
Les totaux par immeuble reconstituent exactement les totaux de la page
(28 magasins, 38 cuisines), donc aucune zone n'a été oubliée ni comptée deux
fois.

CE QUI RESTE INVENTÉ : les surfaces, les prix, les statuts, les expositions et
les arguments de vente. Le fichier porte « demo » dans son nom et doit être
remplacé par la grille du bureau de vente dès qu'elle existe.

R+3 : rez-de-chaussée commercial + étages 1 à 3, conformément au plan.
Les équipements de l'immeuble B (crèche, local syndic, salle polyvalente) ne
sont pas des lots à vendre et n'apparaissent pas dans la grille.

Sortie : data/lots/narjiss-lots-jawhara-demo.csv

Usage :
    python tools/lots-demo-jawhara.py
"""

import csv
import io
import os
import random

# Relevé sur le plan. (magasins au RDC, logements par étage, mix de typologies)
# Le mix suit la moyenne de chambres par logement mesurée : B est nettement
# plus petit que A et C, d'où sa proportion de F2.
IMMEUBLES = {
    'A': {'magasins': 22, 'logements': 20, 'mix': ['F3'] * 14 + ['F2'] * 3 + ['F4'] * 3},
    'B': {'magasins':  2, 'logements':  9, 'mix': ['F2'] * 6 + ['F3'] * 3},
    'C': {'magasins':  4, 'logements':  9, 'mix': ['F3'] * 5 + ['F4'] * 3 + ['F2'] * 1},
}

ETAGES = ['1', '2', '3']          # R+3 : le RDC est commercial

# Surfaces plausibles par typologie : (habitable min, max, balcon)
SURFACES = {
    'F2': (52.0, 62.0, 6.5),
    'F3': (68.0, 82.0, 9.0),
    'F4': (92.0, 106.0, 12.5),
}
CHAMBRES = {'F2': 1, 'F3': 2, 'F4': 3}
SDB      = {'F2': 1, 'F3': 1, 'F4': 2}

ORIENTATIONS = ['rue', 'cour', 'double', 'angle', 'jardin']
EXPOSITIONS = {
    'rue': ['sud', 'sud-ouest', 'ouest'],
    'cour': ['nord', 'nord-est', 'est'],
    'angle': ['sud-est', 'sud'],
    'double': ['est', 'ouest'],
    'jardin': ['sud-est', 'sud'],
}

# Une démo tout-disponible ne montre pas le code couleur du plan ;
# une démo tout-vendu ne montre pas les filtres.
STATUTS = (['Disponible'] * 52 + ['Optionne'] * 15 + ['Reserve'] * 12
           + ['Vendu'] * 18 + ['Bloque'] * 3)

ARGUMENTS = [
    "Sejour traversant, tres lumineux",
    "Balcon filant sur toute la facade",
    "Cuisine equipee avec cellier",
    "Etage eleve, calme, sans vis-a-vis",
    "Vue sur les espaces verts interieurs",
    "Proche de la creche et de la place",
    "Suite parentale avec salle d'eau",
    "Rangements integres dans les chambres",
]
ARGUMENTS_COMMERCE = [
    "Local commercial avec vitrine sur voie principale",
    "Local d'angle, double vitrine",
    "Local avec reserve et sanitaire",
    "Local en pied d'immeuble, forte visibilite",
]

PRIX_M2_LOGEMENT = 11800          # DH/m2 au 1er etage
PRIX_M2_PAR_ETAGE = 280
PRIX_M2_COMMERCE = 15200
BONUS_ORIENTATION = {'angle': 750, 'double': 520, 'jardin': 460, 'rue': 0, 'cour': -380}

ENTETE = ["projet", "immeuble", "niveau", "numero_lot", "typologie",
          "surface_habitable", "surface_balcon", "surface_totale",
          "nb_chambres", "nb_sdb", "orientation", "exposition", "ascenseur",
          "parking", "prix_dh", "prix_m2", "statut", "date_fin_option",
          "plan_fichier", "plan_architecte", "plan_visuel", "visite_360", "notes"]


def ligne(immeuble, niveau, rang, typologie, hab, balcon, ch, sdb,
          orientation, exposition, parking, prix_m2, statut, echeance, note):
    prix = int(round(hab * prix_m2 / 1000.0) * 1000)
    return {
        "projet": "jawhara",
        "immeuble": immeuble,
        "niveau": niveau,
        # Convention indispensable au report d'un étage sur les autres dans
        # l'éditeur de zones : <immeuble>-<niveau>-<rang sur 2 chiffres>.
        "numero_lot": "%s-%s-%02d" % (immeuble, niveau, rang),
        "typologie": typologie,
        "surface_habitable": "%.1f" % hab,
        "surface_balcon": "%.1f" % balcon,
        "surface_totale": "%.1f" % round(hab + balcon, 2),
        "nb_chambres": ch,
        "nb_sdb": sdb,
        "orientation": orientation,
        "exposition": exposition,
        "ascenseur": "Oui",
        "parking": parking,
        "prix_dh": prix,
        "prix_m2": int(round(prix / hab)),
        "statut": statut,
        "date_fin_option": echeance,
        "plan_fichier": "",
        "plan_architecte": "",
        "plan_visuel": "jawhara/plans/immeuble-%s.jpg" % immeuble,
        "visite_360": "",
        "notes": note,
    }


def generer():
    rnd = random.Random(20260807)      # graine fixe : fichier reproductible
    lignes = []

    for imm, spec in IMMEUBLES.items():
        # --- rez-de-chaussee : uniquement des magasins ---
        for rang in range(1, spec['magasins'] + 1):
            hab = round(rnd.uniform(28.0, 58.0), 1)
            orientation = 'angle' if rang in (1, spec['magasins']) else 'rue'
            statut = rnd.choice(STATUTS)
            prix_m2 = PRIX_M2_COMMERCE + BONUS_ORIENTATION[orientation] + rnd.randint(-500, 500)
            lignes.append(ligne(
                imm, 'RDC', rang, 'Commerce', hab, 0.0, 0, 1,
                orientation, rnd.choice(EXPOSITIONS[orientation]), 'Aucun',
                prix_m2, statut,
                "2026-09-%02d" % rnd.randint(10, 28) if statut == 'Optionne' else "",
                rnd.choice(ARGUMENTS_COMMERCE)))

        # --- etages courants : la meme trame se repete du 1er au 3e ---
        # Les surfaces et typologies sont figees par rang : le lot 03 est le
        # meme logement a tous les etages, comme dans la realite. Seuls le
        # statut et le prix varient.
        trame = []
        mix = list(spec['mix'])
        rnd.shuffle(mix)
        for rang in range(1, spec['logements'] + 1):
            typo = mix[(rang - 1) % len(mix)]
            mini, maxi, balcon = SURFACES[typo]
            trame.append({
                'typo': typo,
                'hab': round(rnd.uniform(mini, maxi), 1),
                'balcon': round(balcon + rnd.uniform(-1.5, 2.5), 1),
                'orientation': ('angle' if rang in (1, spec['logements'])
                                else rnd.choice(ORIENTATIONS)),
            })

        for niveau in ETAGES:
            for rang, t in enumerate(trame, 1):
                statut = rnd.choice(STATUTS)
                prix_m2 = (PRIX_M2_LOGEMENT + (int(niveau) - 1) * PRIX_M2_PAR_ETAGE
                           + BONUS_ORIENTATION[t['orientation']] + rnd.randint(-350, 350))
                lignes.append(ligne(
                    imm, niveau, rang, t['typo'], t['hab'], t['balcon'],
                    CHAMBRES[t['typo']], SDB[t['typo']],
                    t['orientation'], rnd.choice(EXPOSITIONS[t['orientation']]),
                    rnd.choice(['sous-sol', 'sous-sol', 'exterieur', 'box', 'Aucun']),
                    prix_m2, statut,
                    "2026-09-%02d" % rnd.randint(10, 28) if statut == 'Optionne' else "",
                    rnd.choice(ARGUMENTS)))

    return lignes


def main():
    racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sortie = os.path.join(racine, "data", "lots", "narjiss-lots-jawhara-demo.csv")

    lignes = generer()
    with io.open(sortie, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=ENTETE, delimiter=";")
        w.writeheader()
        w.writerows(lignes)

    print("%d lots ecrits dans %s" % (len(lignes), sortie))
    par_imm = {}
    for l in lignes:
        par_imm.setdefault(l['immeuble'], {}).setdefault(l['niveau'], 0)
        par_imm[l['immeuble']][l['niveau']] += 1
    for imm in sorted(par_imm):
        detail = '  '.join('%s:%d' % (n, par_imm[imm][n]) for n in ['RDC'] + ETAGES)
        print('  immeuble %s  %s   total %d' % (imm, detail, sum(par_imm[imm].values())))
    compte = {}
    for l in lignes:
        compte[l['statut']] = compte.get(l['statut'], 0) + 1
    for s, n in sorted(compte.items(), key=lambda x: -x[1]):
        print('  %-11s %3d  (%.0f%%)' % (s, n, 100.0 * n / len(lignes)))


if __name__ == "__main__":
    main()
