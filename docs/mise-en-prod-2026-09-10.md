# Mise en production — projets réels, fiche projet, tableau de bord (10/09/2026)

Neuf commits locaux (`28b4c0d` → `6236af4`), 288 fichiers. Le VPS sert encore les 12 projets de démonstration.

## 0. Avant de toucher au serveur

| # | Opération | Commande / où | Résultat attendu |
|---|---|---|---|
| 0.1 | Contrôle d'identité du serveur | `node tools/verifier-prod.js` | « Tout est conforme » |
| 0.2 | Clé SSH chargée dans l'agent | Git Bash interactif : `ssh narjiss-vps 'hostname'` | répond sans mot de passe |
| 0.3 | Sauvegarde de la base prod | `ssh narjiss-vps 'mysqldump narjiss > /root/narjiss-$(date +%F).sql'` (identifiants dans `api/.env` du VPS) | fichier daté dans /root |
| 0.4 | Sauvegarde du projects.json prod | `curl -s https://www.narjiss.company/data/projects.json > data/backups/projects-prod-$(date +%F).json` | 12 projets |
| 0.5 | Pousser les commits | `git push origin main` | `6236af4` sur GitHub |
| 0.6 | Répétition à blanc | `bash deploy.sh code --dry-run 2>&1 \| less` | liste sans `.env`, sans `config.php`, sans `data/lots` |

## 1. Fichiers (site en maintenance : ~5 min)

| # | Opération | Commande | Note |
|---|---|---|---|
| 1.1 | Maintenance ON | `bash maintenance.sh on` | vérifie les DEUX sondes |
| 1.2 | Code : pages, JS, API, admin, `data/projects.json` | `bash deploy.sh code` | inclut `api/lots-public.php`, `admin/index.php`, les 4 lang, `project.js`, `explorer.js`, `shared/menu.js`, les 44 pages ré-estampillées |
| 1.3 | Images des projets | `bash deploy.sh images` | 73 fichiers nouveaux, ~25 Mo |
| 1.4 | Dossiers POI des 16 nouveaux projets | `bash deploy.sh path afrah ait_melloul andalusia_03 arifane drarga_ahaga jawhara_j3 lc_andalousia_03 lc_j3 lc_perle mektoub nassime_timersit oum_lkhir perle_bureaux rouchdi souiri tamount` | hors bucket `code` : sans cette étape, cartes vides |
| 1.5 | Migration et outil de migration | `bash deploy.sh path sql/005_lots_terrain.sql sql/migrer.php sql/etat.php` | |
| 1.6 | Grilles de lots (source d'import, pas servies) | `bash deploy.sh path data/lots` | 26 CSV `narjiss-lots-<slug>.csv` |
| 1.7 | Retirer Azrou du serveur | `bash deploy.sh rm azrou images/projects/azrou` | projet supprimé en local |

## 2. Base de données (toujours en maintenance)

| # | Opération | Commande (SSH, depuis le docroot) | Contrôle |
|---|---|---|---|
| 2.1 | État des migrations | `php sql/etat.php` | 001–004 présentes |
| 2.2 | Type `terrain` | `php sql/migrer.php sql/005_lots_terrain.sql` | `SHOW COLUMNS FROM lots LIKE 'typologie'` contient `terrain` |
| 2.3 | Purger les lots de DÉMO d'Andalusia | `DELETE FROM lots WHERE projet='andalusia' AND numero_lot LIKE 'MAL-%' OR …` — à faire sur la liste réelle (voir §2.3 ci-dessous) | sinon la vraie grille se mélange à la démo |
| 2.4 | Répétition à blanc des grilles | `php tools/importer-lots-reels.php --a-blanc` | « 26 projet(s), 1257 ligne(s) — à blanc » ; le script vérifie lui-même que `terrain` est accepté |
| 2.5 | Importer les 26 grilles réelles | `php tools/importer-lots-reels.php` | créées 1257, rejetées 0 ; bilan par projet en sortie |
| 2.6 | École de J3 bloquée | portée par le CSV (statut `bloque`) | `SELECT statut FROM lots WHERE numero_lot='ECOLE PRV'` → `bloque` |
| 2.7 | Importer les 10 comptes | `bash deploy.sh path data/equipe.csv` puis, en SSH, `php tools/importer-equipe.php data/equipe.csv /root/narjiss-equipe-acces.txt` | « 10 compte(s) créé(s) » ; le script **refuse** d'écrire les accès sous le docroot ; ensuite `rm data/equipe.csv` sur le VPS |

§2.3 — la démo Andalusia en prod : `SELECT numero_lot FROM lots WHERE projet='andalusia'` avant de supprimer ; les lots de démo commencent par `MAL-`, `ALM-`… (immeubles Malaga, Almeria…), les vrais par `D1 `, `D2 `… Supprimer uniquement la démo.

## 3. Sortie de maintenance et vérification

| # | Contrôle | Attendu |
|---|---|---|
| 3.1 | `bash maintenance.sh off` | les deux sondes en 200/405 |
| 3.2 | `curl -s https://www.narjiss.company/data/projects.json \| python -c "import json,sys;print(len(json.load(sys.stdin)))"` | 27 |
| 3.3 | `curl -s 'https://www.narjiss.company/api/lots-public.php?projet=andalusia_03&resume=1'` | `total:264`, `prix_max` présent |
| 3.4 | `curl -s 'https://www.narjiss.company/api/lots-public.php?projet=tamount&resume=1'` | typologie `terrain` |
| 3.5 | Navigateur : `project.html?id=andalusia_03#ar` | photo en ouverture, prix en chiffres LTR |
| 3.6 | Navigateur : `explorer.html` | 27 cartes, vignettes = fiches |
| 3.7 | Admin : `admin/` connecté | tableau de bord, 26 lignes, 29 % vendus |
| 3.8 | Admin : `admin/agents.php` | 10 comptes réels actifs + 5 démo + existants |
| 3.9 | Ctrl+F5 sur une page déjà visitée | plus de « Prix sur demande » sur Andalusia 03 (cache 10 ans : seules les URL `?v=` neuves passent) |
| 3.10 | `node tools/verifier-prod.js` | conforme |

## 4. Après coup

- Transmettre les mots de passe provisoires à l'équipe ; supprimer le fichier de /root une fois fait.
- Le bureau de vente reprend la main : grilles de lots par `admin/lots-import.php`, fiches par `admin/project-edit.php` — **désormais l'édition courante se fait sur la prod**, le local ne sert qu'au développement.
- Reste ouvert : typologies réelles de Jawhara J3, logos des 16 nouveaux projets, champs supplémentaires côté client.

## Ce qui ne part PAS

`api/.env`, `admin/includes/config.php`, `data/narjiss-adassat-export-*.xlsx` (nominatif), `data/adassat-projets/`, `data/poi-adassat/`, `data/equipe-acces-provisoires.txt`, `data/backups/`, les `.docx`. Le garde-fou de `deploy.sh` refuse déjà `.env`, `backups/`, `narjiss-prive` ; les autres sont hors des buckets.
