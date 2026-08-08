#!/usr/bin/env python3
"""
tools/plan-zones.py — deduit les zones cliquables d'un plan d'etage.

Sur les plans commerciaux d'Andalusia, chaque appartement est deja peint d'un
aplat pastel distinct (violet, rose, jaune, vert...). Plutot que de tracer 110
polygones a la main, on lit ces aplats : segmentation par couleur, puis un
polygone par appartement.

Deux difficultes traitees ici :

  - les cloisons noires decoupent un appartement en pieces. Une simple
    recherche de composantes connexes rendrait 6 blobs par logement. On dilate
    donc le masque avant l'etiquetage pour franchir les cloisons, puis on
    re-erode : les pieces d'un meme logement se recollent.

  - deux logements peuvent partager la meme couleur (deux violets sur malaga).
    C'est la connexite spatiale, pas la couleur, qui les separe.

Le resultat est volontairement RELU PAR UN HUMAIN : le script ne sait pas quel
polygone est le lot B-01. Il numerote, produit un calque de controle, et
l'affectation des numeros de lot se fait ensuite dans l'editeur d'admin.

Usage :
    python tools/plan-zones.py andalusia/plans/malaga.jpeg [--out DOSSIER]
"""

import argparse
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

# Aplats reperes sur les plans Andalusia (quantifies au pas de 24).
# La liste sert de palette de rattachement : chaque pixel rejoint la teinte la
# plus proche, ce qui absorbe le bruit JPEG en bordure d'aplat.
PALETTE = {
    "vert":     (192, 216, 192),
    "cyan":     (192, 216, 216),
    "jaune":    (240, 216, 144),
    "peche":    (240, 216, 192),
    "rose":     (240, 192, 192),
    "violet":   (216, 192, 240),
    "lavande":  (216, 216, 240),
    "magenta":  (240, 216, 240),
}

TOLERANCE_COULEUR = 30   # distance max au centre de palette (euclidienne RVB)
RECOUVREMENT_MAX  = 0.30 # deux blobs qui se recouvrent autant sont le meme logement
OUVERTURE         = 2    # rayon d ouverture : efface les liseres JPEG le long des traits
PONT_CLOISON      = 5    # rayon de dilatation, en px : doit couvrir l'epaisseur d'un mur
AIRE_MIN          = 2500 # px : sous ce seuil c'est une legende ou une cartouche
AIRE_MAX          = 260000
SIMPLIFICATION    = 2.5  # px : tolerance Douglas-Peucker


def masque_palette(rgb):
    """Rattache chaque pixel a une teinte de PALETTE, ou -1 s'il en est loin."""
    h, w, _ = rgb.shape
    plat = rgb.reshape(-1, 3).astype(np.int16)
    noms = list(PALETTE)
    centres = np.array([PALETTE[n] for n in noms], dtype=np.int16)

    meilleur = np.full(plat.shape[0], -1, dtype=np.int8)
    distance = np.full(plat.shape[0], 1e9, dtype=np.float32)
    for i, c in enumerate(centres):
        d = np.sqrt(((plat - c) ** 2).sum(axis=1))
        prend = d < distance
        distance[prend] = d[prend]
        meilleur[prend] = i
    meilleur[distance > TOLERANCE_COULEUR] = -1

    return meilleur.reshape(h, w), noms


def dilate(masque, rayon):
    """Dilatation binaire separable (max glissant) — evite une dependance a scipy."""
    if rayon <= 0:
        return masque.copy()
    out = masque.copy()
    for axe in (0, 1):
        acc = out.copy()
        for d in range(1, rayon + 1):
            acc |= np.roll(out, d, axis=axe)
            acc |= np.roll(out, -d, axis=axe)
        out = acc
    return out


def erode(masque, rayon):
    """Erosion binaire : dilatation du complementaire. Annule le debordement
    laisse par la dilatation, sans quoi le polygone franchirait les murs et
    mordrait sur l'appartement voisin."""
    if rayon <= 0:
        return masque.copy()
    bord = np.zeros_like(masque)
    bord[0, :] = bord[-1, :] = bord[:, 0] = bord[:, -1] = True
    return ~dilate(~masque | bord, rayon)


def composantes(masque):
    """Etiquetage 4-connexe par remplissage en balayage de lignes."""
    h, w = masque.shape
    labels = np.zeros((h, w), dtype=np.int32)
    courant = 0
    for y0 in range(h):
        ligne = masque[y0]
        for x0 in range(w):
            if not ligne[x0] or labels[y0, x0]:
                continue
            courant += 1
            pile = deque([(x0, y0)])
            while pile:
                x, y = pile.pop()
                if labels[y, x]:
                    continue
                # etend a gauche puis a droite sur la ligne courante
                g = x
                while g > 0 and masque[y, g - 1] and not labels[y, g - 1]:
                    g -= 1
                d = x
                while d < w - 1 and masque[y, d + 1] and not labels[y, d + 1]:
                    d += 1
                labels[y, g:d + 1] = courant
                for vy in (y - 1, y + 1):
                    if 0 <= vy < h:
                        seg = masque[vy, g:d + 1] & (labels[vy, g:d + 1] == 0)
                        idx = np.nonzero(seg)[0]
                        for i in idx:
                            pile.append((g + int(i), vy))
    return labels, courant


def contour(masque):
    """Trace le contour externe (Moore) du plus grand bloc du masque."""
    ys, xs = np.nonzero(masque)
    if len(xs) == 0:
        return []
    depart = (int(xs[np.argmin(ys)]), int(ys.min()))

    voisins = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    h, w = masque.shape

    def plein(p):
        x, y = p
        return 0 <= x < w and 0 <= y < h and masque[y, x]

    points = [depart]
    p = depart
    dirn = 6  # on arrive par le haut
    for _ in range(400000):
        trouve = False
        for k in range(8):
            d = (dirn + 6 + k) % 8
            q = (p[0] + voisins[d][0], p[1] + voisins[d][1])
            if plein(q):
                p, dirn, trouve = q, d, True
                break
        if not trouve:
            break
        if p == depart and len(points) > 3:
            break
        points.append(p)
    return points


def simplifier(points, tol):
    """Douglas-Peucker iteratif."""
    if len(points) < 3:
        return points
    garde = [False] * len(points)
    garde[0] = garde[-1] = True
    pile = [(0, len(points) - 1)]
    while pile:
        i, j = pile.pop()
        if j <= i + 1:
            continue
        ax, ay = points[i]
        bx, by = points[j]
        dx, dy = bx - ax, by - ay
        norme = (dx * dx + dy * dy) ** 0.5 or 1.0
        pire, dmax = -1, tol
        for k in range(i + 1, j):
            px, py = points[k]
            d = abs(dy * (px - ax) - dx * (py - ay)) / norme
            if d > dmax:
                pire, dmax = k, d
        if pire >= 0:
            garde[pire] = True
            pile.append((i, pire))
            pile.append((pire, j))
    return [p for p, g in zip(points, garde) if g]


def analyser(chemin, dossier_sortie, cadre=None):
    image = Image.open(chemin).convert("RGB")
    rgb = np.asarray(image)
    h, w, _ = rgb.shape

    # Le bandeau vert de droite porte un plan de situation miniature, aux memes
    # teintes que les logements : hors du cadre utile, il produirait des zones
    # fantomes. `cadre` = x0,y0,x1,y1 en pixels.
    utile = None
    if cadre:
        utile = np.zeros((h, w), dtype=bool)
        x0, y0, x1, y1 = cadre
        utile[y0:y1, x0:x1] = True

    teintes, noms = masque_palette(rgb)

    # --- 1) un blob par (teinte, composante connexe) --------------------------
    blobs = []
    for i, nom in enumerate(noms):
        brut = teintes == i
        if utile is not None:
            brut &= utile
        if brut.sum() < AIRE_MIN:
            continue
        # Ouverture (erosion puis dilatation) : la compression JPEG laisse un
        # lisere pastel d'un ou deux pixels le long de chaque trait noir, dans
        # tout le plan. Ces liserés se touchent une fois dilates et soudent des
        # appartements pourtant separes par un mur. On les efface d'abord.
        brut = dilate(erode(brut, OUVERTURE), OUVERTURE) & brut
        if brut.sum() < AIRE_MIN:
            continue
        # dilate pour franchir les cloisons, etiquete, puis re-erode : les
        # pieces d'un meme logement se recollent, mais le polygone revient
        # contre les murs au lieu de mordre sur l'appartement voisin.
        labels, n = composantes(dilate(brut, PONT_CLOISON))
        for lab in range(1, n + 1):
            enfle = labels == lab
            bloc = enfle & brut
            if bloc.sum() < AIRE_MIN // 3:
                continue
            blobs.append({"noms": [nom], "forme": erode(enfle, PONT_CLOISON) | bloc, "coeur": bloc})

    # --- 2) fusion des doublons ----------------------------------------------
    # Le bruit JPEG fait basculer un meme aplat entre deux teintes voisines
    # (violet 216,192,240 / lavande 216,216,240 : 24 d'ecart) : un appartement
    # ressortait alors en deux zones superposees. Les fusionner APRES coup, sur
    # le recouvrement reel, evite le chainage d'un regroupement par couleur —
    # qui, lui, finissait par coller tous les pastels du plan ensemble.
    fusion = True
    while fusion:
        fusion = False
        for a in range(len(blobs)):
            for b in range(a + 1, len(blobs)):
                inter = int((blobs[a]["forme"] & blobs[b]["forme"]).sum())
                if not inter:
                    continue
                petit = min(int(blobs[a]["forme"].sum()), int(blobs[b]["forme"].sum()))
                if inter / petit >= RECOUVREMENT_MAX:
                    blobs[a]["forme"] |= blobs[b]["forme"]
                    blobs[a]["coeur"] |= blobs[b]["coeur"]
                    blobs[a]["noms"] = sorted(set(blobs[a]["noms"] + blobs[b]["noms"]))
                    del blobs[b]
                    fusion = True
                    break
            if fusion:
                break

    # --- 3) polygones ---------------------------------------------------------
    zones = []
    for blob in blobs:
        aire = int(blob["coeur"].sum())
        if not (AIRE_MIN <= aire <= AIRE_MAX):
            continue
        ys, xs = np.nonzero(blob["coeur"])
        pts = simplifier(contour(blob["forme"]), SIMPLIFICATION)
        if len(pts) < 4:
            continue
        zones.append({
            "couleur": "+".join(blob["noms"]),
            "aire": aire,
            "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
            "centre": [int(xs.mean()), int(ys.mean())],
            "points": [[int(x), int(y)] for x, y in pts],
        })

    zones.sort(key=lambda z: (z["centre"][1] // 120, z["centre"][0]))
    for n, z in enumerate(zones, 1):
        z["index"] = n
        z["numero_lot"] = ""   # a renseigner dans l'editeur d'admin

    os.makedirs(dossier_sortie, exist_ok=True)
    base = os.path.splitext(os.path.basename(chemin))[0]

    sortie = {
        "plan": chemin.replace("\\", "/"),
        "largeur": w, "hauteur": h,
        "zones": zones,
    }
    fjson = os.path.join(dossier_sortie, base + "-zones.json")
    with open(fjson, "w", encoding="utf-8") as f:
        json.dump(sortie, f, ensure_ascii=False, indent=1)

    # Calque de controle : c'est lui qu'on regarde pour juger la detection. Le
    # remplissage est peint sur une couche separee puis composite, sinon PIL
    # ecrase le plan au lieu de le teinter.
    fond = image.convert("RGBA")
    couche = Image.new("RGBA", fond.size, (0, 0, 0, 0))
    dessin = ImageDraw.Draw(couche, "RGBA")
    teintes_calque = [(230, 30, 30), (20, 110, 220), (0, 150, 90), (200, 120, 0),
                      (150, 40, 200), (0, 150, 170), (200, 0, 120), (90, 100, 0)]
    for z in zones:
        c = teintes_calque[(z["index"] - 1) % len(teintes_calque)]
        dessin.polygon([tuple(p) for p in z["points"]],
                       fill=c + (70,), outline=c + (255,), width=3)
    for z in zones:
        c = teintes_calque[(z["index"] - 1) % len(teintes_calque)]
        cx, cy = z["centre"]
        dessin.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=c + (255,))
        dessin.text((cx - 5 * len(str(z["index"])), cy - 8), str(z["index"]), fill="white")
    fpng = os.path.join(dossier_sortie, base + "-controle.png")
    Image.alpha_composite(fond, couche).convert("RGB").save(fpng, quality=88)

    return zones, fjson, fpng


def main():
    global PONT_CLOISON
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("--out", default="outputs/plan-zones")
    ap.add_argument("--cadre", default="", help="x0,y0,x1,y1 : zone utile du plan")
    ap.add_argument("--pont", type=int, default=PONT_CLOISON,
                    help="rayon de franchissement des cloisons, en px")
    args = ap.parse_args()

    PONT_CLOISON = args.pont
    cadre = [int(v) for v in args.cadre.split(",")] if args.cadre else None

    zones, fjson, fpng = analyser(args.plan, args.out, cadre)
    print("%d zones detectees" % len(zones))
    for z in zones:
        print("  %2d  %-8s aire=%6d px  bbox=%s  %d sommets"
              % (z["index"], z["couleur"], z["aire"], z["bbox"], len(z["points"])))
    print("JSON   :", fjson)
    print("Calque :", fpng)


if __name__ == "__main__":
    main()
