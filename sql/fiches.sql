-- sql/fiches.sql — schéma de référence des fiches de renseignement client.
--
-- En développement, api/db.php crée la base et cette table automatiquement.
-- Ce fichier sert au déploiement manuel en production (revue DBA, migrations).
--
-- ⚠️ Cette base ne stocke QUE des données structurées. Les copies de pièces
-- d'identité restent des fichiers dans le coffre privé hors htdocs.

CREATE DATABASE IF NOT EXISTS `narjiss`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `narjiss`;

CREATE TABLE IF NOT EXISTS fiches (
  reference    VARCHAR(20)  NOT NULL PRIMARY KEY,        -- NJ-AAAAMMJJ-XXXX
  created_at   DATETIME     NOT NULL,                    -- issu du champ ISO 'date'
  projet       VARCHAR(64)  NOT NULL,
  projet_nom   VARCHAR(191) NOT NULL DEFAULT '',
  conseiller   VARCHAR(120) NOT NULL DEFAULT '',
  statut       ENUM('prospect','client') NOT NULL DEFAULT 'prospect',
  expiration   DATETIME     NULL,

  -- champs plats : recherche / liste / tri
  nom          VARCHAR(120) NOT NULL DEFAULT '',
  prenom       VARCHAR(120) NOT NULL DEFAULT '',
  telephone    VARCHAR(40)  NOT NULL DEFAULT '',
  email        VARCHAR(160) NOT NULL DEFAULT '',
  ville        VARCHAR(100) NOT NULL DEFAULT '',
  budget       VARCHAR(60)  NOT NULL DEFAULT '',

  -- groupes imbriqués conservés tels quels (JSON encodé en LONGTEXT)
  identite           LONGTEXT NULL,
  coordonnees        LONGTEXT NULL,
  situation_pro      LONGTEXT NULL,
  projet_acquisition LONGTEXT NULL,
  origine_contact    LONGTEXT NULL,
  consentement       LONGTEXT NULL,
  pieces             LONGTEXT NULL,   -- map type→nom de fichier (octets sur disque)

  INDEX idx_statut (statut),
  INDEX idx_projet (projet),
  INDEX idx_expiration (expiration),
  INDEX idx_created (created_at),
  INDEX idx_nom (nom, prenom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
