# Guides — rédiger, générer, publier

Le menu **Guides** remplace l'ancienne entrée **Carte** dans la barre de
navigation. Les articles sont écrits en Markdown, puis convertis en pages HTML
statiques par un générateur. Ce document explique le circuit complet.

---

## 1. Pourquoi des pages générées, et pas du JavaScript

Tout le reste du site injecte son contenu par JavaScript, avec un hash de
langue (`#ar`). Les guides font exception, pour une raison unique : **ils
existent pour le référencement**.

Les robots d'aperçu social (WhatsApp, Facebook) ne lisent pas le JavaScript, et
les moteurs ne le lisent qu'imparfaitement. Un guide injecté par script serait
donc invisible là où il doit précisément être visible. Le texte doit être dans
le HTML servi — d'où une page HTML **par guide et par langue** :

```
guides.html                              page d'accueil (JS, 4 langues)
guides/<slug>-fr.html                    article, une langue par fichier
guides/<slug>-en.html
guides/<slug>-ar.html
guides/<slug>-es.html
```

Les quatre fichiers d'un même guide se déclarent mutuellement en `hreflang` :
Google comprend que c'est le même article en quatre langues, et sert la bonne
version selon le visiteur. Les boutons FR/EN/AR/ES du menu, sur un article,
emmènent vers le fichier de la langue choisie au lieu de recharger les libellés.

## 2. Où vivent les sources

```
data/guides/guides.json          index : slug, icône, statut, dates
data/guides/<slug>/fr.md         un fichier par langue
data/guides/<slug>/en.md
data/guides/<slug>/ar.md
data/guides/<slug>/es.md
```

En-tête d'un `.md`, avant la ligne `---` :

| Champ | Rôle |
|---|---|
| `titre` | Balise `<title>` et `<h1>` |
| `description` | Méta description **et** texte de l'aperçu WhatsApp. 150-160 caractères |
| `chapeau` | Phrase d'accroche sous le titre |

Markdown reconnu — sous-ensemble volontairement restreint :

```
## titre de section        ### sous-titre
- puce                     1. numéro
| colonne | colonne |      tableau
> texte                    encadré d'information (bleu), lu par le visiteur
!> texte                   note interne : JAMAIS publiée, sort dans
                           docs/guides-a-valider.md
**gras**  *italique*  [texte](url)
```

## 3. Le circuit de publication

```bash
python tools/generer-guides.py
```

```bash
python tools/versionner.py
```

**Les deux commandes, dans cet ordre, à chaque modification.** Le générateur
écrit les liens CSS/JS sans `?v=` ; c'est `versionner.py` qui pose les
empreintes de cache — sans lui, les visiteurs déjà venus garderaient l'ancienne
feuille de style pendant dix ans (durée du cache nginx en production).

`python tools/generer-guides.py --verifier` liste les pages sans rien écrire.

## 4. Deux audiences, deux canaux

C'est le point le plus important de ce document.

Les notes `!>` des sources s'adressent à **votre équipe** : « faire confirmer
par le notaire », « ne pas publier sans validation de la direction
commerciale ». Elles ne sont **jamais écrites dans les pages générées**. Un
simple masquage CSS ne suffirait pas : le texte resterait lisible dans le code
source de la page, donc publié de fait.

Elles sortent à la place dans **`docs/guides-a-valider.md`**, une liste à cocher
groupée par guide, avec la section à laquelle chaque point se rapporte. Ce
fichier vit dans `docs/`, interdit d'exploration par `robots.txt` et absent du
lot de déploiement : il ne quitte pas le poste.

Le générateur annonce à chaque passage combien de points restent en attente, et
signale toute divergence du nombre de notes entre les quatre langues — signe
d'une traduction désynchronisée.

### Statut d'un guide

| Statut | Effet |
|---|---|
| `brouillon` (défaut) | `robots: noindex, nofollow`, exclu du `sitemap.xml`, bandeau d'information en haut de page et pastille sur la vignette |
| `publie` | Page normale, indexable, entre au sitemap |

Le `noindex` est le garde-fou qui compte : une donnée fiscale fausse indexée par
Google survit des mois, et elle se lit comme un engagement de NARJISS.

Le bandeau, lui, s'adresse au **visiteur**, pas à l'équipe. Il dit ce qui lui
est utile — « les montants et taux exacts y seront ajoutés après validation par
notre notaire ; les mécanismes décrits, eux, sont à jour » — et non l'état
d'avancement interne du fichier.

**Procédure de mise en ligne d'un guide :**

1. Ouvrir `docs/guides-a-valider.md`, faire répondre chaque point par la
   personne compétente (notaire, comptable, direction commerciale).
2. Écrire les chiffres obtenus dans les **quatre** fichiers de langue, et
   supprimer les lignes `!>` correspondantes.
3. Régénérer : le point disparaît de la liste. Quand la liste d'un guide est
   vide, il est validable.
4. Passer `statut` à `publie` dans `guides.json`, mettre `date_maj` à jour.
5. Relancer les deux commandes de la section 3.

Tant qu'un guide a des points dans `docs/guides-a-valider.md`, il reste en
`brouillon`.

## 5. Entretien

Les guides parlent de fiscalité et de droit : **ils périment**. Prévoir une
relecture **chaque janvier**, après la loi de finances, et mettre à jour
`date_maj` même si le texte ne change pas — la date est affichée au lecteur et
fait partie de la crédibilité.

Chaque page porte en pied un avertissement traduit rappelant que les montants
dépendent de la loi de finances en vigueur et doivent être confirmés.

## 6. Ajouter un guide

1. Créer `data/guides/<slug>/` avec les quatre `.md`.
2. Ajouter l'entrée dans `data/guides/guides.json` (slug, icône, statut, dates).
3. Générer, versionner.

Le nouveau guide apparaît automatiquement sur la page d'accueil des guides et
dans le bloc « Tous les guides » en bas de chaque article. Aucune page HTML
n'est à modifier à la main.

> Les quatre traductions ne sont pas facultatives : un guide sans son fichier
> `ar.md` produit un lien mort depuis la version arabe du site. Le générateur
> signale les traductions manquantes au lancement.

## 7. Ce que la carte est devenue

`carte.html` n'a pas été supprimée. Elle reste atteignable depuis le pied de
page et depuis les deux boutons de la page d'accueil. Seule son entrée dans la
barre de navigation a cédé la place aux guides : les douze projets étant tous
situés dans un rayon d'une quinzaine de kilomètres autour d'Agadir, une carte
« globale du Maroc » n'apportait rien que la carte de `explorer.html` — qui
affiche les mêmes marqueurs avec les filtres et la liste — ne fasse déjà mieux.
