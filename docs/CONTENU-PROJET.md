# Contenu d'un projet — données à préparer et outils d'import

Checklist de mise en ligne d'un projet, de la fiche vide au parcours client
complet. Chaque bloc indique **ce qu'il faut fournir**, **où ça s'importe** et
**ce qui dépend de quoi**.

L'ordre compte : les blocs 1 à 3 conditionnent tous les autres.

---

## 1. Le projet lui-même

**Outil** — `admin/projects.php` → *Nouveau projet*, puis `admin/project-edit.php`.
Écrit dans `data/projects.json`.

| Donnée | Format | Remarque |
|---|---|---|
| `id` | `[a-z0-9_-]+` | Sert de clé partout, **ne se change plus** après coup |
| `folder` | nom de dossier | Où vivront les CSV de POI (défaut : l'id) |
| `status` | `live` / `soon` | `soon` grise la carte sur l'accueil |
| `type` | appartements / terrains… | Alimente le badge de la vignette |
| `lat` / `lng` | décimal | **Le point doit tomber au milieu du bâti** : il sert au marqueur, au cadrage de la démo et à l'itinéraire « Y aller » |
| `poi_count` | entier | Affiché sur la vignette d'accueil |

À préparer côté métier : relever la coordonnée sur une carte satellite, pas
sur une adresse postale.

## 2. Les textes, en quatre langues

**Outil** — même page, onglets **Français / English / العربية / Español**.

Trois champs par langue : **nom**, **localisation**, **description**.

Une langue laissée vide n'est pas remplacée par le français : elle s'affiche
vide. Prévoir donc les 12 saisies, ou au minimum vérifier après traduction.

*État actuel : complet sur les 12 projets.*

## 3. Les images

**Outil** — même page, champs d'upload. Le fichier est écrit au bon endroit
**et** le chemin est enregistré dans `projects.json` : ne remplacez pas les
fichiers à la main, le chemin ne suivrait pas.

| Champ | Rôle réel | Format conseillé |
|---|---|---|
| **Logo** | Malgré son nom, c'est la **grande vignette de l'accueil** | ~1200 px de large, JPEG q85 |
| **Hero** | Bandeau de la fiche projet | ~1920 px de large |
| **Plan (floorplan)** | Plan d'étage, **prérequis du bloc 7** | Le plus net possible, JPEG ou PNG |
| **Brochure** | PDF téléchargeable | — |
| **Slider** | Plusieurs images pour la vignette d'accueil | Un chemin par ligne ; **remplace le logo** sur l'accueil quand il est rempli |

Optimiser avant l'upload : la vignette s'affiche vers 550 px, une photo de
4000 px ne fait que ralentir la page.

*État actuel : logo, hero et plan présents sur les 12 projets. Slider : seul
`amical`. Brochure : seul `jawhara`.*

## 4. Les POI du quartier et les repères

**Outil** — pas d'écran d'admin : **fichiers CSV déposés dans le dossier du
projet**, lus directement par `localisation.js`.

```
<folder>/<slug>_<lang>.csv          → POI du quartier   (onglet « Quartier »)
<folder>/<slug>_major_<lang>.csv    → grands repères    (onglet « Repères »)
```

Un fichier par langue (`fr`, `en`, `ar`, `es`). En cas d'absence, repli
automatique sur `_fr`. Les repères sont facultatifs : sans le fichier, l'onglet
n'apparaît pas.

En-tête, séparateur **point-virgule** :

```
Catégorie;Emoji;Nom;Adresse;Note;Latitude;Longitude;Nb Avis;Téléphone;Horaires / Notes
```

La première ligne de données est le projet lui-même (catégorie `home`).

À préparer : un relevé des commerces, écoles, pharmacies, mosquées, banques du
quartier avec leurs coordonnées — c'est le poste le plus long, comptez une
demi-journée par projet. Les mêmes fichiers alimentent l'hôtesse IA via
`api/project-pois.php`.

*État actuel : les 4 langues sont présentes et réellement traduites sur les
12 projets.*

## 5. La grille de lots

**Outil** — `admin/lots-import.php` (CSV **ou** classeur Excel), puis
`admin/lots.php` pour les corrections au fil de l'eau. Stocké en MySQL
(tables `lots`, `lot_status_history`, `lot_imports`).

L'import se fait **en deux temps** : téléversement → aperçu des changements →
confirmation. Un import écrase des prix et des disponibilités, il ne part
jamais à l'aveugle.

Colonnes **obligatoires** :

```
projet, numero_lot, typologie, surface_habitable, prix_dh, statut, orientation
```

Colonnes reconnues en plus : `immeuble`, `niveau`, `niveau_ordre`,
`surface_balcon`, `nb_chambres`, `nb_sdb`, `exposition`, `ascenseur`,
`parking`, `date_fin_option`, `notes`.

`statut` ∈ `disponible` / `optionne` / `reserve` / `vendu`.

Modèles fournis dans `data/lots/` (`…-modele.csv`, `…-modele.xlsx`).

Sans grille, le sélecteur de lots et le parcours client ne s'affichent pas
pour ce projet.

## 6. Les vidéos et la galerie

**Outil** — champs `videos` et `gallery` de `projects.json`, fichiers dans
`data/videos/<projet>/`. Déploiement par `bash deploy.sh videos`.

Prévoir un **poster** par vidéo. Recette d'encodage : H.264, et JPEG q85 pour
les posters.

*État actuel : seul `jawhara` a des vidéos (5) et une galerie.*

## 7. Les zones cliquables du plan

**Outil** — `admin/plan-zones.php`. Stocké en MySQL (table `plan_zones`).

**Prérequis : le plan (bloc 3) et la grille de lots (bloc 5).** On choisit un
lot dans la liste, puis on trace son contour sur le plan ; un polygone
appartient toujours à un lot.

C'est ce qui rend la maquette cliquable dans `disponibilites.html`. Comptez
quelques minutes par lot — c'est long sur un immeuble de 67 lots, mais ça se
fait par étage et se reprend à tout moment.

## 8. La visite virtuelle 3DVista

**Outil** — pas d'import : publication depuis le logiciel 3DVista vers un
dossier du site, puis renseignement du champ dans `project-edit.php`.

1. Publier depuis 3DVista vers `<projet>/<Dossier-Tour>/` (option **Web/Mobile**).
2. Renseigner `tour_url` (visite du projet) et/ou `apartment_tour_url`
   (visite d'un appartement témoin) — chemin vers `index.htm`.
3. Cocher **Visite disponible** (`has_tour`).
4. Déployer : `bash deploy.sh tours`.

Points de vigilance :

- Le bucket `tours` **exclut les sources `.vtp` / `.vts`** : elles n'ont rien
  à faire en ligne, et le `.vtp` contient en clair le mot de passe de la Live
  Guided Tour.
- Après chaque republication, **incrémenter `MEDIA_V`** dans
  `disponibilites.js` et `project.js`, sinon les navigateurs déjà venus — et
  surtout la borne du bureau de vente — continueront d'afficher l'ancienne
  visite.
- Pour la **Live Guided Tour** : le guide s'y connecte par **clic droit** sur
  la visite ouverte dans un navigateur desktop → « Démarrer une session guidée
  en direct en tant qu'hôte ». Cocher **TURN Service** dans Publish avant
  d'exploiter la fonction avec un client à distance.

*État actuel : seul `jawhara` a une visite.*

## 9. Les commerciaux

**Outil** — inscription autonome sur `espace-agent.html`, puis validation dans
`admin/agents.php`. Les gestionnaires peuvent valider les commerciaux de leur
propre bureau.

À préparer : la liste des commerciaux par bureau de vente, et leur
rattachement projet. Leur présence (`bureau` / `en ligne` / `occupé` /
`absent`) est ensuite gérée par eux-mêmes et exposée par
`api/agent-presence.php`.

## 10. Les fiches client

**Outil** — `admin/fiches.php` (consultation, passage prospect → client) et
`admin/fiche-qr.php` (affichettes QR à poser au bureau de vente : le client
scanne et remplit lui-même).

Rien à préparer en amont, sinon les affichettes à imprimer.

---

## Récapitulatif de l'état actuel

Les blocs 1 à 4 sont **complets sur les 12 projets** : identité, textes en
quatre langues, images de base, POI et repères traduits.

Ce qui manque pour du contenu « réel complet » est presque entièrement sur
**11 projets sur 12** — seul `jawhara` est allé au bout :

| Bloc | Fait | Reste |
|---|---|---|
| Brochure PDF | jawhara | 11 projets |
| Vidéos / galerie | jawhara | 11 projets |
| Slider d'accueil | amical | 11 projets |
| Visite virtuelle | jawhara | 11 projets |
| Grille de lots | à vérifier en base | — |
| Zones de plan | à vérifier en base | — |

## Ordre de travail conseillé pour un projet neuf

1. Fiche projet + coordonnée GPS **vérifiée sur satellite** (blocs 1–2)
2. Images : logo, hero, plan (bloc 3)
3. Grille de lots (bloc 5) — débloque le parcours client
4. Zones du plan (bloc 7) — nécessite 2 et 3
5. POI et repères, 4 langues (bloc 4) — le plus long, parallélisable
6. Brochure, vidéos, galerie (blocs 3 et 6)
7. Visite virtuelle (bloc 8)
8. Commerciaux et affichettes QR (blocs 9–10)

## Déploiement

```bash
bash deploy.sh code      # pages, scripts, projects.json, contacts.json, CSV de POI
bash deploy.sh images    # images/
bash deploy.sh videos    # data/videos/
bash deploy.sh tours     # visites 3DVista (sources exclues)
bash deploy.sh verify    # contrôle md5 local ↔ en ligne
```

Les CSV de POI voyagent avec le bucket `code` : ils sont légers (516 Ko pour les
douze projets et les quatre langues) et se désynchronisent silencieusement, la
carte se contentant d'afficher moins de points sans jamais signaler d'erreur.

Les lots, les zones de plan et les comptes agents vivent en **base de
données** : ils ne passent pas par `deploy.sh`. Le back-office de production
écrit directement dans la base du VPS.
