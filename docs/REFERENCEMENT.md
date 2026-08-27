# Référencement — plan de site, robots, domaine

État du chantier SEO au 25 août 2026. Ce document couvre ce qui est en place
(`sitemap.xml`, `robots.txt`, domaine canonique, `noindex` des pages privées) et
ce qui reste à faire.

---

## 1. Le domaine canonique — un seul endroit

```
data/site.json  →  { "url": "https://www.narjiss.company" }
```

C'est la **source unique** de toute URL absolue du site : `sitemap.xml`,
`robots.txt`, et les `canonical` / `hreflang` / `og:url` des guides.

**La forme canonique est AVEC `www`** — constaté sur le serveur le 25/08/2026,
pas supposé :

```
https://narjiss.company/            301  →  https://www.narjiss.company/
https://narjiss.company/guides.html 301  →  https://www.narjiss.company/guides.html
https://www.narjiss.company/        200
```

La redirection conserve le chemin **et** les paramètres, y compris
`project.html?id=jawhara`. C'est la configuration nginx/CloudPanel en place, et
elle est cohérente avec le docroot `www.narjiss.company` de `deploy.sh`.

Un `canonical` qui pointe vers une URL redirigée est un défaut : le moteur suit
la redirection et se demande laquelle des deux formes fait autorité. D'où
l'alignement sur `www`.

Pour standardiser plutôt sur le domaine nu — choix également valable — il faut
**d'abord inverser la redirection côté nginx**, puis changer la seule ligne de
`data/site.json` et relancer les deux générateurs. Jamais l'inverse.

## 2. Le plan de site

```bash
python tools/generer-sitemap.py
```

Produit `sitemap.xml` et `robots.txt` à la racine. `--verifier` affiche la liste
sans rien écrire.

**37 URL aujourd'hui**, construites depuis les mêmes sources que le site :

| Type | Nombre | Source |
|---|---|---|
| Pages fixes | 11 | liste dans le script |
| Fiches projet `project.html?id=` | 12 | `data/projects.json`, statut `live` |
| Localisation `localisation.html?id=` | 12 | présence d'un fichier POI `<slug>_fr.csv` |
| Albums `medias.html?id=` | 2 | présence de photos ou vidéos déclarées |
| Guides | 0 | tous en brouillon (voir plus bas) |

Le sitemap est **généré, jamais écrit à la main** : une liste figée se
désynchroniserait au premier projet ajouté. À relancer après tout ajout de
projet, de guide ou de page publique.

### Ce qui n'y entre pas, et pourquoi

- **Les guides en brouillon.** Ils portent `robots: noindex`. Les inscrire au
  sitemap reviendrait à demander l'indexation de pages qu'on interdit
  d'indexer — signal contradictoire. Ils y entreront automatiquement dès que
  leur `statut` passera à `publie` (voir [GUIDES.md](GUIDES.md)).
- **Les pages sans contenu propre.** `medias.html` n'est annoncé que pour les
  projets ayant réellement un album. Dix projets sur douze n'ont aujourd'hui que
  leur image de couverture : leur page d'album serait une page mince, et
  annoncer des pages minces dessert le site entier. *C'est un manque de contenu,
  pas un défaut technique — dès que les photos sont ajoutées au back-office, le
  sitemap les inclut.*
- **Les langues.** Le site sert ses quatre langues sur la **même URL** avec un
  hash (`#ar`), et un hash n'est pas une URL distincte pour un moteur. Seuls les
  guides, qui ont un fichier HTML par langue, sont déclarés en quatre versions
  reliées par `hreflang`.
- **`changefreq` et `priority`.** Google a publiquement indiqué qu'il les
  ignore. Les écrire donnerait l'illusion d'un réglage qui n'en est pas un.

## 3. robots.txt — deux pièges évités

**Piège 1 : `robots.txt` n'empêche pas l'indexation.** Il empêche la *visite*.
Une URL interdite d'exploration mais liée depuis ailleurs peut apparaître dans
les résultats, sans titre ni résumé — le pire des deux mondes. Pour qu'une page
disparaisse vraiment, il lui faut un `<meta name="robots" content="noindex">`,
et donc rester explorable pour que le moteur puisse le lire.

C'est pourquoi les pages privées ou à données personnelles ne sont **pas**
dans `robots.txt` mais portent le `noindex` sur la page :

| Page | État |
|---|---|
| `fiche.html` | `noindex` (préexistant) |
| `espace-agent.html` | `noindex` (préexistant) |
| `visite-editeur.html` | `noindex` (préexistant) |
| `ma-selection.html` | `noindex` **ajouté** |
| `bureaudevente.html` | `noindex` **ajouté** |

**Piège 2 : ne jamais bloquer une ressource nécessaire au rendu.** Tout le
contenu du site est injecté en JavaScript depuis `data/*.json` et `api/*.php`.
Bloquer `/data/` ou `/api/` — réflexe courant — ferait voir à Google des pages
**vides**. Ces deux dossiers restent donc explorables, à dessein.

Ne sont interdits que les répertoires sans intérêt public et sans rôle dans le
rendu : `/admin/`, `/presentation/`, `/outputs/`, `/docs/`, `/tools/`, `/sql/`,
`/kb/`, plus `maintenance.html`, `qr.php` et `ecoute.php`.

## 4. Déploiement — un piège déjà rencontré

`deploy.sh` construisait sa liste racine avec `ls -1 *.html *.js *.css *.json`.
Conséquences, avant correction :

- `sitemap.xml` et `robots.txt` ne partaient **pas** (mauvaises extensions) ;
- le dossier `guides/` n'appartenait à **aucun bucket** — les vingt pages de
  guides seraient restées sur le poste local indéfiniment.

C'est exactement le scénario déjà vécu avec les CSV de points d'intérêt et les
visites 3DVista, documenté dans les commentaires de `deploy.sh` : aucun message
d'erreur, le site s'affiche simplement plus pauvre qu'il ne l'est.

Les trois sont désormais dans le bucket `code`. À vérifier après le prochain
déploiement :

```bash
bash deploy.sh code --dry-run
```

## 5. Après la première mise en ligne

1. Déclarer le site dans **Google Search Console**, propriété sur le domaine
   canonique (`www.narjiss.company`), et y soumettre
   `https://www.narjiss.company/sitemap.xml`.
2. Vérifier dans l'outil d'inspection d'URL qu'une fiche projet est bien
   **rendue avec son contenu** — c'est le test qui prouve que `/data/` et
   `/api/` sont accessibles au robot.
3. Surveiller la couverture : les URL à paramètre (`?id=`) sont valides mais
   parfois lentes à être explorées.

## 6. Ce qui reste du chantier SEO

Le sitemap et robots.txt sont faits. Il manque encore, sur les pages **hors
guides** :

- `meta description` par page — aucune n'en a aujourd'hui ;
- balises `og:` et `twitter:` — un lien collé dans WhatsApp s'affiche toujours
  en texte nu, sans image ni titre. C'est le canal n° 1 au Maroc ;
- une image de partage par projet (1200 × 630) ;
- `canonical` sur les pages fixes et les fiches projet ;
- le JSON-LD `Organization` / `LocalBusiness` sur l'accueil et
  `Residence` / `RealEstateListing` sur `project.html`.

Rappel valable pour tout ce qui précède : ces balises **doivent être dans le
HTML servi**. Les robots d'aperçu social n'exécutent pas le JavaScript. Pour
`project.html`, cela suppose soit une génération côté serveur, soit une page
pré-générée par projet — le même choix que celui fait pour les guides.

## 7. Entretien

| Quand | Quoi |
|---|---|
| Après ajout d'un projet | `python tools/generer-sitemap.py` |
| Après publication d'un guide | `python tools/generer-guides.py` puis `generer-sitemap.py` |
| Après ajout de photos à un projet | `python tools/generer-sitemap.py` (l'album entre au sitemap) |
| Si le domaine change | une ligne dans `data/site.json`, puis les deux générateurs |

Et systématiquement, après tout passage d'un générateur :

```bash
python tools/versionner.py
```
