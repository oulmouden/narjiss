# Base de données des fiches client

Les fiches de renseignement sont stockées dans **MySQL / MariaDB** (fourni par
XAMPP). Les copies de pièces d'identité restent, elles, des **fichiers dans le
coffre privé hors htdocs** (`C:\xampp\narjiss-prive\fiches\pieces\`) — rien de
sensible ne transite par la base.

## Mise en service

1. **Démarrer MySQL** dans le panneau de contrôle XAMPP.

2. **Configurer les identifiants** dans `api/.env` (voir `api/.env.example`) :

   ```
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=narjiss
   DB_USER=root
   DB_PASS=<mot de passe root, vide si non défini>
   ```

   La base `narjiss` et la table `fiches` sont **créées automatiquement** au
   premier accès (voir `api/db.php`). Pour un déploiement manuel/prod, le schéma
   de référence est dans `sql/fiches.sql`.

3. **Migrer les fiches existantes** (si un ancien `fiches.json` existe) :

   ```bash
   php api/migrate-fiches-to-db.php
   ```

   Idempotent (relançable sans doublon). En cas de succès, l'ancien
   `fiches.json` est archivé en `fiches.json.imported`.

## Back-office

`admin/fiches.php` : liste avec **recherche** (nom, téléphone, e-mail,
référence), **filtres** (statut, projet, « à purger »), **pagination**,
**export CSV**, détail, bascule prospect/client (recalcule la conservation),
suppression (ligne + pièces sur disque).

## Exploitation

- **Purge** des fiches expirées (durées : prospect 3 ans / client 10 ans) :

  ```bash
  php api/purge-fiches.php            # simulation
  php api/purge-fiches.php --appliquer
  ```

  À planifier une fois par jour (Planificateur de tâches Windows).

- **Sauvegarde** recommandée de la base :

  ```bash
  mysqldump -u root -p narjiss > sauvegarde-narjiss.sql
  ```

## Sécurité (inchangé)

- Aucune image en base ni sous htdocs ; CNIE servie uniquement par
  `admin/fiche-piece.php` sous session, avec journalisation (`acces.log`).
- Prod : envisager un compte MySQL dédié à privilèges limités (au lieu de root)
  et le chiffrement de la sauvegarde.
