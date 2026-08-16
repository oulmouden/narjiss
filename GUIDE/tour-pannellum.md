# Visite 360° maison (Pannellum) — preuve de concept

Visionneuse de remplacement pour les tours 3DVista, servie **entièrement par
notre serveur**. Objectif : ne plus dépendre de `remote.3dvista.com`, qui rend
le Live Tour capricieux sur smartphone.

**Aucune image n'est dupliquée.** Les tuiles de l'export 3DVista sont réutilisées
telles quelles.

---

## 1. Utilisation

```
tour-360.html?tour=jawhara/Tour
tour-360.html?tour=jawhara/Tour-FloorPlan
tour-360.html?tour=jawhara/tour-bureau
```

Sans paramètre, `jawhara/Tour` est affiché.

## 2. Régénérer après un ré-export 3DVista

**À refaire à chaque fois que le tour est ré-exporté** : la description des
scènes est figée dans un fichier, elle ne se met pas à jour toute seule.

```bash
node tools/extract_3dvista_tour.js jawhara/Tour
```

Cela écrit `jawhara/Tour/tour-pannellum.json` (13 scènes, 42 passages pour le
tour actuel). L'outil signale en clair tout panorama qu'il n'a pas su traiter.

## 3. Comment ça marche

L'extracteur **exécute** `script_general.js` dans un bac à sable Node avec un
faux `TDV`, et récupère l'objet que le tour lui tend. Une extraction à
l'expression régulière casserait au premier ré-export — le fichier est un
`var script = {…}` de 150 Ko mêlé de références JS, pas du JSON.

Il en tire : les panoramas, leurs libellés (« Salon », « Cuisine »…), la vue
d'arrivée de chaque pièce, les vignettes, et les passages d'une pièce à l'autre
(direction et inclinaison de chaque flèche, prises sur l'overlay que 3DVista
associe à l'adjacence).

### La numérotation des niveaux — le piège de ce portage

Les deux outils numérotent **en sens inverse** : chez 3DVista le dossier `0` est
le plus détaillé, chez Pannellum c'est `maxLevel`. Et le gabarit d'URL de
Pannellum (`%l`) est une simple substitution de chaîne — impossible d'y inverser
un compteur.

**Se contenter du niveau le plus fin avec `maxLevel: 1` ne marche pas**, et
c'est une erreur qui ne se voit qu'à l'écran : Pannellum construit toujours ses
nœuds racines au niveau 1 avec **une seule tuile par face**
(`new ka(face, side, 1, 0, 0, path)` dans `pannellum.js`), puis subdivise.
Déclarer une face de 2048 au niveau 1 lui fait étirer la tuile `0_0` — 512 px du
coin supérieur gauche — sur la face entière. L'image devient méconnaissable,
avec les arêtes du cube en évidence. Les panoramas à 512 px, eux, n'ayant qu'un
seul niveau, restaient corrects : la panne était partielle, donc traître.

La solution : **reconstruire l'arborescence dans la numérotation de Pannellum**,
sous `<tour>/pannellum/`.

```
dossier 3DVista = (nombre de niveaux) − (niveau Pannellum)

face de 2048 en trois niveaux :
  Pannellum 1 (512, 1 tuile)  ←  3DVista 2
  Pannellum 2 (1024, 2×2)     ←  3DVista 1
  Pannellum 3 (2048, 4×4)     ←  3DVista 0
```

Rien n'est ré-encodé : ce sont les **mêmes fichiers**, posés en **liens
physiques**. Pour `jawhara/Tour`, l'arborescence complète pèse **104 Ko** en
face de 45 Mo de médias. Copie de secours si le système refuse les liens.

> Au déploiement, `tar` préserve les liens physiques quand les deux chemins
> sont dans le même envoi — ce qui est le cas, `build_tours_list` prend tout le
> dossier de visite. Si jamais il ne les préservait pas, le serveur recevrait
> des doublons : ça marcherait quand même, en occupant le double.

### Le contrôle automatique

Comme cette erreur ne se voit qu'à l'œil, l'extracteur **rejoue la formule de
Pannellum** sur ce qu'il vient de produire :

```
d = cubeResolution × 2^(niveau − maxLevel)     tuiles = ceil(d / tileResolution)
```

Il vérifie que chaque tuile attendue existe et, surtout, que **le niveau 1 n'en
compte qu'une**. Il sort en erreur sinon.

### Le plan de sol

Bouton **« 🗺️ Plan »** en haut à droite : le plan de l'étage, une pastille par
pièce, celle où l'on se trouve mise en évidence, et un clic pour s'y rendre.

3DVista éparpille ces informations à trois endroits :

| Ce qu'on cherche | Où c'est |
|---|---|
| Dimensions du plan | objet `Map` (ici 1467 × 1112) |
| Position d'une pièce | `AreaHotspotMapOverlay` → `image.x` / `image.y` |
| Pièce visée | **enfouie dans la chaîne d'action `click`** de la zone cliquable |

Ce dernier point est le seul lien disponible : la zone ne référence pas le
panorama proprement, elle porte un bout de code
`this.setPanoramaCameraWithSpot(…, this.PanoramaPlayListItem_XXX, …)`. On le lit
donc à l'expression régulière, puis on résout l'élément de playlist vers son
panorama.

L'URL de l'image est **absente** du script (les niveaux ont une `url` vide) : on
la retrouve sur le disque, où 3DVista la nomme `<idMap>_<langue>_0.webp`.
L'extracteur essaie `fr`, `en`, `ar`, `es`, puis sans suffixe.

Les pastilles sont posées en **pourcentage** des dimensions logiques du plan, et
non en pixels : le panneau peut donc être redimensionné librement — il l'est
d'ailleurs selon la taille de l'écran.

> Toutes les pièces n'ont pas forcément de pastille : sur `jawhara/Tour`, le
> Couloir n'en a pas — 3DVista ne lui en donne pas non plus. L'extracteur le
> signale (`12 pastilles pour 13 scènes`) et le repère reste simplement éteint
> dans cette pièce.

### Les faces du cube

Vérifié objectivement plutôt que supposé : en mesurant l'écart entre les bords
adjacents des faces, le tour d'horizon ressort en **f → r → b → l → f** avec un
écart de raccord de 1,8 à 3,1 sur 255, contre 40 à 95 pour tout autre
appariement. C'est exactement la convention de Pannellum : mêmes lettres, même
sens, ni rotation ni miroir.

### Les pastilles de passage — ne jamais animer leur `transform`

Pannellum place chaque hotspot en écrivant un `transform` **en ligne** sur son
div, réécrit à chaque image :

```
transform: translate(302.4px, 264.9px) translateZ(9999px) rotate(0deg)
```

Or **une animation CSS l'emporte sur le style en ligne**. Une règle aussi
anodine que

```css
.passage { animation: pulse 2.2s infinite; }
@keyframes pulse { 50% { transform: scale(1.12); } }
```

remplace donc le positionnement par un simple `scale` : le `transform` calculé
retombe à `matrix(1, 0, 0, 1, 0, 0)` et **toutes les pastilles s'empilent à
l'origine du conteneur**, décalées hors écran par leur marge négative. Elles
restent présentes dans le DOM et cliquables — simplement invisibles, ce qui rend
la panne difficile à relier à sa cause.

D'où la répartition retenue : le div ne porte que la **position** et la zone de
clic ; toute l'apparence, animation comprise, vit dans un élément **interne**
(`.passage b`). Le clic sur cet enfant remonte au div, la navigation fonctionne.

> Symptôme à reconnaître : `getBoundingClientRect()` renvoie la même position
> pour tous les hotspots, typiquement l'opposé de leur marge.

## 4. Visite guidée en direct

**C'est ici que la boucle se referme** : contrairement au tour 3DVista, cette
page est pilotable à distance par un conseiller. Angle, zoom **et pièce** sont
synchronisés (voir [visite-guidee.md](visite-guidee.md) pour le code d'accès).

```
tour-360.html?tour=jawhara/Tour&lghost=1     ← conseiller
tour-360.html?tour=jawhara/Tour&lg=<session> ← visiteur
```

La page charge `shared/menu.js` uniquement pour `installLiveGuide()` : elle est
autonome et n'a pas le reste du site. `initPage()` n'est jamais appelé, donc
aucun menu n'est construit.

Côté visiteur, tout est bridé : rotation, zoom, flèches de passage et vignettes
deviennent inertes (classe `suit-le-guide`). Sans ça, un visiteur qui clique sur
une flèche serait ramené 200 ms plus tard par la resynchronisation — un
va-et-vient incompréhensible.

Le verrou `sceneEnCours` de `liveguide.js` mérite un mot : `loadScene()` est
asynchrone et l'hôte réémet son état toutes les 200 ms. Sans verrou, le
chargement serait relancé une dizaine de fois de suite et la pièce ne
s'afficherait jamais. Un filet de sécurité de 8 s le relâche si le chargement
échoue, pour ne pas figer le suivi.

## 5. Sur téléphone

C'est le motif de tout ce chantier, donc les points traités explicitement :

- **Hauteur du panorama.** `pannellum.css` impose `height: 100%` à son
  conteneur, ce qui écrasait le calage par `inset` : l'image débordait sous le
  bandeau de vignettes et son centre optique se retrouvait caché. D'où une
  hauteur **explicite** en `calc()`, avec un sélecteur par identifiant qui
  l'emporte sur la classe.
- **`100dvh` plutôt que `100%`**, pour suivre le repli des barres du navigateur.
- **`overscroll-behavior: none`** : sans ça, un glissement vers le bas dans le
  panorama déclenche le « tirer pour rafraîchir » de Chrome Android au lieu de
  tourner la vue.
- **`touch-action: none`** sur la scène : les gestes appartiennent à Pannellum.
- **Encoche et barre d'accueil** : `env(safe-area-inset-bottom)` est intégré à
  la hauteur du bandeau et à son remplissage.
- **Paysage** (`max-height: 480px`) : bandeau compacté à 62 px. Sinon il
  mangeait 26 % d'un écran de 375 px de haut — or c'est justement l'orientation
  qu'on prend pour regarder un panorama.
- **Barre de visite guidée** : sa hauteur varie (deux ou trois lignes sur un
  téléphone). Elle est mesurée en JS dans `--barre`, et le panorama s'arrête
  juste au-dessus. Pannellum ne surveillant que le redimensionnement de la
  *fenêtre*, on appelle `resize()` à chaque changement, sinon sa toile garde
  l'ancienne hauteur et l'image s'étire.

### Ce que ça coûte en données

Poids des six faces, par niveau (tour `jawhara/Tour`) :

| | niveau 1 | niveau 2 | niveau 3 | total |
|---|---|---|---|---|
| Couloir (512) | 30 Ko | — | — | **30 Ko** |
| Entrée réelle (1024) | 25 Ko | 67 Ko | — | **92 Ko** |
| Cuisine (2048) | 48 Ko | 123 Ko | 317 Ko | **488 Ko** |
| Balcon virtuel (1024) | 149 Ko | 376 Ko | — | **525 Ko** |

**Le tour entier, tous niveaux et toutes faces : 3 Mo.** Et Pannellum ne
télécharge que le niveau 1 des faces visibles à l'arrivée — quelques dizaines
de kilo-octets — puis affine. L'entrée dans la visite est donc quasi instantanée
même en 4G, ce qui est exactement le reproche fait au lecteur 3DVista.

## 6. Ce qui manque encore

- Pas de vidéos incrustées, pas de mode VR, pas de mesures.

## 7. Qualité des sources

Les panoramas ne sont pas tous exportés à la même finesse — la taille de face
va de 512 à 2048 px selon la pièce :

| Face | Pièces (tour `jawhara/Tour`) |
|---|---|
| 2048 px | Cuisine, Cuisine Virtuelle |
| 1024 px | Entrée, Balcon, chambre parentale, chambre enfants virtuelle… |
| **512 px** | **Couloir, Salon, Salon virtuel, chambre enfants** |

Les pièces à 512 px paraîtront floues en plein écran, y compris dans 3DVista :
c'est la source qui est limitée, pas la visionneuse. À corriger au ré-export si
le rendu ne convient pas — le Salon étant une pièce clé, ça vaut le coup.

## 8. Fichiers

- `tools/extract_3dvista_tour.js` — l'extracteur (Node, sans dépendance).
- `tour-360.html` — la visionneuse. **À la racine du site** : `deploy.sh`
  n'envoie que les `.html` de la racine (bucket « code ») ; une page rangée dans
  `jawhara/` ne partirait jamais.
- `<tour>/tour-pannellum.json` et `<tour>/pannellum/` — **générés**, partent
  avec le bucket « tours ».
- `assets/vendor/pannellum/` — la bibliothèque, déjà présente pour les vues 360°
  des fiches projet.
