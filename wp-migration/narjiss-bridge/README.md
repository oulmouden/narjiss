# Narjiss Bridge

Petit plugin de migration pour tester rapidement la transformation du site statique Narjiss en site WordPress.

## Ce que le plugin ajoute

- Type de contenu WordPress : `Projets Narjiss`
- Taxonomie : `Types de projets`
- Champs meta exposés à l'API REST, donc exploitables par Elementor / JetEngine
- Import des 12 projets depuis `data/projects.json`
- Import automatique des médias projets dans la médiathèque WordPress
- Import des images du slider accueil dans l'option `narjiss_home_slider_attachment_ids`
- Shortcode `[narjiss_home]` pour une page d'accueil de démo
- Shortcode `[narjiss_projects]` pour une grille de projets
- Shortcode `[narjiss_map]` pour une carte Leaflet
- Shortcode `[narjiss_project_detail]` pour une fiche projet dynamique
- Template automatique pour les permaliens `Projets Narjiss`

## Installation

1. Copier le dossier `narjiss-bridge` dans `wp-content/plugins/`.
2. Activer `Narjiss Bridge` depuis l'administration WordPress.
3. Aller dans `Outils > Narjiss Bridge`.
4. Cliquer sur `Importer / mettre à jour les projets`.
5. Cliquer sur `Importer les médias dans WordPress`.

## Utilisation dans Elementor

Ajouter un widget `Shortcode`, puis utiliser :

```text
[narjiss_home]
```

ou :

```text
[narjiss_projects]
```

ou :

```text
[narjiss_map]
```

ou, dans un template de fiche projet :

```text
[narjiss_project_detail]
```

## Notes

L'import média est idempotent : relancer le bouton réutilise les pièces jointes déjà importées au lieu de les dupliquer.
