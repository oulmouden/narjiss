#!/usr/bin/env python3
"""
tools/lots-demo-andalusia.py — jeu de lots FICTIF pour la demo Andalusia.

Andalusia a ses plans (andalusia/plans/*.jpeg) mais pas encore sa grille de
lots : sans lignes en base, l'explorateur de plans n'a rien a afficher au clic
et les filtres n'ont rien a filtrer. Ce script fabrique un jeu credible en
attendant le vrai fichier du bureau de vente.

CE N'EST PAS DE LA DONNEE REELLE. Prix, statuts et disponibilites sont
inventes. Le fichier produit porte « demo » dans son nom, comme celui de
Jawhara, et doit etre remplace des que la grille reelle arrive.

La trame vient du plan d'etage courant de MALAGA : 8 appartements par niveau,
aux surfaces lues sur le plan (65, 65, 92, 62, 72, 70, 60, 66 m2). Les autres
immeubles reprennent la meme trame — c'est une demo, pas un releve.

Sortie : data/lots/narjiss-lots-andalusia-demo.csv (format d'import inchange,
separateur « ; », BOM UTF-8), pret pour admin/lots-import.php.

Usage :
    python tools/lots-demo-andalusia.py
"""

import csv
import io
import os
import random

# Immeubles = les plans disponibles dans andalusia/plans/.
IMMEUBLES = ["Malaga", "Almeria", "Denia", "Lerida", "Murcia",
             "Ronda", "Tarifa", "Toledo", "Zaragoza"]

# Trame d'un etage courant, relevee sur malaga.jpeg.
# (suffixe, surface habitable, balcon, typologie, chambres, sdb, orientation)
ETAGE = [
    ("01", 65.0,  8.0, "F3", 2, 1, "Rue"),
    ("02", 65.0,  7.5, "F3", 2, 1, "Rue"),
    ("03", 92.0, 12.0, "F4", 3, 2, "Angle"),
    ("04", 62.0,  9.0, "F3", 2, 1, "Cour"),
    ("05", 72.0, 10.5, "F3", 2, 2, "Double"),
    ("06", 70.0,  9.5, "F3", 2, 1, "Jardin"),
    ("07", 60.0,  8.5, "F3", 2, 1, "Cour"),
    ("08", 66.0,  9.0, "F3", 2, 1, "Rue"),
]

# Rez-de-chaussee : commerces sur rue et un plateau de bureau.
RDC = [
    ("C1", 46.0, "Commerce", "Angle",  "Local commercial d'angle, double vitrine"),
    ("C2", 38.0, "Commerce", "Rue",    "Local commercial avec vitrine sur voie principale"),
    ("C3", 41.0, "Commerce", "Rue",    "Local commercial, reserve et sanitaire"),
    ("B1", 58.0, "Bureau",   "Cour",   "Plateau de bureau modulable, entree independante"),
]

EXPOSITIONS = {
    "Rue": ["sud", "sud-ouest", "ouest"],
    "Cour": ["nord", "nord-est", "est"],
    "Angle": ["sud-est", "sud"],
    "Double": ["est", "ouest"],
    "Jardin": ["sud-est", "sud"],
}

# Repartition visee des statuts : une demo tout-disponible ne montre pas le
# code couleur du plan, une demo tout-vendu ne montre pas les filtres.
STATUTS = (["Disponible"] * 55 + ["Optionne"] * 14 + ["Reserve"] * 12
           + ["Vendu"] * 16 + ["Bloque"] * 3)

ARGUMENTS = [
    "Sejour traversant, tres lumineux",
    "Cuisine equipee, cellier attenant",
    "Balcon filant sur toute la facade",
    "Suite parentale avec salle d'eau privative",
    "Vue degagee sur les espaces verts",
    "Etage eleve, calme, sans vis-a-vis",
    "Proche de l'entree pietonne et de la creche",
    "Rangements integres dans les deux chambres",
]

PRIX_M2_BASE = 11200          # DH/m2 au 1er etage
PRIX_M2_PAR_ETAGE = 260       # la vue se paie
BONUS_ORIENTATION = {"Angle": 700, "Double": 500, "Jardin": 450,
                     "Rue": 0, "Cour": -350}

ENTETE = ["projet", "immeuble", "niveau", "numero_lot", "typologie",
          "surface_habitable", "surface_balcon", "surface_totale",
          "nb_chambres", "nb_sdb", "orientation", "exposition", "ascenseur",
          "parking", "prix_dh", "prix_m2", "statut", "date_fin_option",
          "plan_fichier", "plan_architecte", "plan_visuel", "visite_360", "notes"]


def plan_de(immeuble):
    return "andalusia/plans/%s.jpeg" % immeuble.lower()


def ligne(immeuble, niveau, suffixe, typologie, hab, balcon, ch, sdb,
          orientation, exposition, parking, prix_m2, statut, echeance, note):
    total = round(hab + balcon, 2)
    prix = int(round(hab * prix_m2 / 1000.0) * 1000)
    return {
        "projet": "andalusia",
        "immeuble": immeuble,
        "niveau": niveau,
        "numero_lot": "%s-%s-%s" % (immeuble[:3].upper(), niveau, suffixe),
        "typologie": typologie,
        "surface_habitable": "%.1f" % hab,
        "surface_balcon": "%.1f" % balcon,
        "surface_totale": "%.1f" % total,
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
        "plan_visuel": plan_de(immeuble),
        "visite_360": "",
        "notes": note,
    }


def generer():
    rnd = random.Random(20260806)   # graine fixe : le fichier est reproductible
    lignes = []

    for immeuble in IMMEUBLES:
        # --- rez-de-chaussee ---
        for suffixe, hab, typologie, orientation, note in RDC:
            statut = rnd.choice(STATUTS)
            prix_m2 = 14500 + BONUS_ORIENTATION[orientation] + rnd.randint(-400, 400)
            lignes.append(ligne(
                immeuble, "RDC", suffixe, typologie, hab, 0.0, 0, 1,
                orientation, rnd.choice(EXPOSITIONS[orientation]), "Aucun",
                prix_m2, statut,
                "2026-09-%02d" % rnd.randint(10, 28) if statut == "Optionne" else "",
                note))

        # --- etages courants ---
        for etage in range(1, 5):
            for suffixe, hab, balcon, typologie, ch, sdb, orientation in ETAGE:
                statut = rnd.choice(STATUTS)
                prix_m2 = (PRIX_M2_BASE + (etage - 1) * PRIX_M2_PAR_ETAGE
                           + BONUS_ORIENTATION[orientation] + rnd.randint(-300, 300))
                parking = rnd.choice(["sous-sol", "sous-sol", "exterieur", "box", "Aucun"])
                lignes.append(ligne(
                    immeuble, str(etage), suffixe, typologie, hab, balcon, ch, sdb,
                    orientation, rnd.choice(EXPOSITIONS[orientation]), parking,
                    prix_m2, statut,
                    "2026-09-%02d" % rnd.randint(10, 28) if statut == "Optionne" else "",
                    rnd.choice(ARGUMENTS)))

    return lignes


def main():
    racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sortie = os.path.join(racine, "data", "lots", "narjiss-lots-andalusia-demo.csv")

    lignes = generer()
    # BOM + « ; » : Excel francais ouvre le fichier sans boite de dialogue.
    with io.open(sortie, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=ENTETE, delimiter=";")
        writer.writeheader()
        writer.writerows(lignes)

    compte = {}
    for l in lignes:
        compte[l["statut"]] = compte.get(l["statut"], 0) + 1
    print("%d lots ecrits dans %s" % (len(lignes), sortie))
    print("  immeubles :", len(IMMEUBLES))
    for s, n in sorted(compte.items(), key=lambda x: -x[1]):
        print("  %-11s %3d  (%.0f%%)" % (s, n, 100.0 * n / len(lignes)))


if __name__ == "__main__":
    main()
