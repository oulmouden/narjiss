-- =====================================================================
--  Narjiss Immobiliere - Parcours client / selecteur de lots
--
--  Base cible : narjiss  (celle qui heberge deja fiches, agents,
--  agent_presence, access_requests). Ce schema se GREFFE dessus :
--  il ne cree ni table client ni table conseiller, il reutilise
--  `fiches` (le prospect) et `agents` (le conseiller) qui existent.
--
--  Conventions reprises de l'existant :
--    - pas de prefixe de table
--    - le projet est un slug `projet` VARCHAR(64), sans cle etrangere
--      (data/projects.json reste la source de verite des projets)
--    - InnoDB / utf8mb4_unicode_ci, enums en minuscules
--    - created_at DATETIME NOT NULL renseigne par l'application
--
--  Usage :
--    mysql --defaults-extra-file=C:/xampp/mysql/bin/narjiss.cnf narjiss \
--      < sql/001_parcours_client.sql
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. LOTS
--    Une ligne = un logement, bureau ou commerce.
--    Colonnes alignees sur data/lots/*.xlsx pour que l'import CSV soit
--    une correspondance directe (l'import normalise juste la casse).
--
--    surface_totale et prix_m2 sont GENEREES par MariaDB : on ne les
--    importe pas, elles ne peuvent donc pas diverger des valeurs saisies.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lots` (
  `id`                int(10) unsigned NOT NULL AUTO_INCREMENT,
  `projet`            varchar(64)  NOT NULL COMMENT 'slug, ex: jawhara',
  `immeuble`          varchar(32)  NOT NULL DEFAULT '' COMMENT 'batiment / tranche',
  `niveau`            varchar(8)   NOT NULL DEFAULT '' COMMENT 'RDC, 1, 2... SS = sous-sol',
  `niveau_ordre`      tinyint(4)   NOT NULL DEFAULT 0 COMMENT 'RDC=0, SS=-1 : tri et filtre >= etage',
  `numero_lot`        varchar(32)  NOT NULL COMMENT 'unique dans le projet, ex: A-2-03',

  `typologie`         enum('studio','f2','f3','f4','f5','duplex','bureau','commerce') NOT NULL,
  `surface_habitable` decimal(7,2) NOT NULL,
  `surface_balcon`    decimal(7,2) NOT NULL DEFAULT 0.00,
  `surface_totale`    decimal(8,2) AS (`surface_habitable` + `surface_balcon`) STORED,
  `nb_chambres`       tinyint(3) unsigned NOT NULL DEFAULT 0,
  `nb_sdb`            tinyint(3) unsigned NOT NULL DEFAULT 0,

  `orientation`       enum('rue','cour','jardin','double','angle') NOT NULL DEFAULT 'rue',
  `exposition`        enum('nord','nord-est','est','sud-est','sud','sud-ouest','ouest','nord-ouest') DEFAULT NULL,
  `ascenseur`         tinyint(1)   NOT NULL DEFAULT 1,
  `parking`           enum('aucun','sous-sol','exterieur','box') NOT NULL DEFAULT 'aucun',

  `prix_dh`           decimal(12,2) NOT NULL,
  `prix_m2`           decimal(10,2) AS (
                        CASE WHEN `surface_habitable` > 0
                             THEN `prix_dh` / `surface_habitable` END
                      ) STORED,

  -- bloque = retire de la vente (logement temoin, litige) : visible du
  -- conseiller, masque au client par la vue v_lots_publics
  `statut`            enum('disponible','optionne','reserve','vendu','bloque')
                        NOT NULL DEFAULT 'disponible',
  `date_fin_option`   date DEFAULT NULL COMMENT 'echeance d une option, pour reliberer le lot',

  `plan_fichier`      varchar(255) DEFAULT NULL,
  `notes`             varchar(500) NOT NULL DEFAULT '' COMMENT 'argument de vente, visible client',
  `notes_internes`    varchar(500) NOT NULL DEFAULT '' COMMENT 'jamais expose au client',

  `created_at`        datetime NOT NULL,
  `updated_at`        datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (`id`),
  -- cle metier : rend l'import CSV idempotent (reimporter = mettre a jour)
  UNIQUE KEY `uniq_lot_projet` (`projet`,`numero_lot`),
  KEY `idx_recherche` (`projet`,`statut`,`typologie`,`prix_dh`),
  KEY `idx_surface` (`projet`,`statut`,`surface_habitable`),
  KEY `idx_niveau` (`projet`,`immeuble`,`niveau_ordre`),
  KEY `idx_option_expiree` (`statut`,`date_fin_option`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Qui a change quel statut, quand. Alimente par l'application (et non
-- par un TRIGGER) pour pouvoir enregistrer l'auteur de la modification.
CREATE TABLE IF NOT EXISTS `lot_status_history` (
  `id`             int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lot_id`         int(10) unsigned NOT NULL,
  `ancien_statut`  varchar(20) NOT NULL DEFAULT '',
  `nouveau_statut` varchar(20) NOT NULL,
  `auteur`         varchar(120) NOT NULL DEFAULT '' COMMENT 'login admin ou "import-csv"',
  `commentaire`    varchar(255) NOT NULL DEFAULT '',
  `created_at`     datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lot` (`lot_id`,`created_at`),
  CONSTRAINT `fk_hist_lot` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. PARCOURS
--    Un visiteur explore d'abord ANONYMEMENT (surtout sur la borne du
--    bureau de vente). Il ne s'identifie qu'a l'etape 5. La session
--    porte donc la selection avant qu'une fiche existe, puis on la
--    rattache a la fiche creee.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `parcours_sessions` (
  `id`         int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token`      varchar(40) NOT NULL COMMENT 'jeton aleatoire, sert aussi au QR code',
  `projet`     varchar(64) NOT NULL DEFAULT '',
  `canal`      enum('web','kiosque','salon','conseiller') NOT NULL DEFAULT 'web',
  `source_note` varchar(120) NOT NULL DEFAULT '' COMMENT 'nom du salon, poste borne...',
  `langue`     char(2) NOT NULL DEFAULT 'fr',

  -- criteres saisis a l etape 1
  `critere_type`        varchar(32) NOT NULL DEFAULT '',
  `critere_budget_min`  decimal(12,2) DEFAULT NULL,
  `critere_budget_max`  decimal(12,2) DEFAULT NULL,
  `critere_surface_min` decimal(7,2)  DEFAULT NULL,
  `critere_chambres`    tinyint(3) unsigned DEFAULT NULL,

  `etape`      tinyint(3) unsigned NOT NULL DEFAULT 1 COMMENT 'derniere etape atteinte (1-5)',
  -- rattachement a la fiche prospect existante, une fois le client identifie
  `fiche_reference` varchar(20) DEFAULT NULL,
  `agent_id`   int(10) unsigned DEFAULT NULL COMMENT 'conseiller qui pilotait la borne',

  `created_at` datetime NOT NULL,
  `last_seen`  datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_token` (`token`),
  KEY `idx_fiche` (`fiche_reference`),
  KEY `idx_canal` (`canal`,`created_at`),
  CONSTRAINT `fk_session_fiche` FOREIGN KEY (`fiche_reference`)
    REFERENCES `fiches` (`reference`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_session_agent` FOREIGN KEY (`agent_id`)
    REFERENCES `agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- La short-list (etape 4). C'est elle qui transforme un contact en lead
-- qualifie : le conseiller sait deja quoi montrer a la visite.
CREATE TABLE IF NOT EXISTS `parcours_selection` (
  `session_id` int(10) unsigned NOT NULL,
  `lot_id`     int(10) unsigned NOT NULL,
  `rang`       tinyint(3) unsigned NOT NULL DEFAULT 1 COMMENT 'ordre de preference',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`session_id`,`lot_id`),
  KEY `idx_lot` (`lot_id`),
  CONSTRAINT `fk_sel_session` FOREIGN KEY (`session_id`)
    REFERENCES `parcours_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sel_lot` FOREIGN KEY (`lot_id`)
    REFERENCES `lots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. VISITES physiques (etape 5)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `visites` (
  `id`          int(10) unsigned NOT NULL AUTO_INCREMENT,
  `fiche_reference` varchar(20) DEFAULT NULL,
  `session_id`  int(10) unsigned DEFAULT NULL,
  `projet`      varchar(64) NOT NULL,
  `date_visite` datetime NOT NULL,
  `duree_min`   smallint(5) unsigned NOT NULL DEFAULT 60,
  `agent_id`    int(10) unsigned DEFAULT NULL,
  `statut`      enum('demande','confirme','annule','honore','absent') NOT NULL DEFAULT 'demande',
  `canal_confirmation` enum('whatsapp','sms','email','telephone') DEFAULT NULL,
  `commentaire` varchar(500) NOT NULL DEFAULT '',
  `created_at`  datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_agenda` (`date_visite`,`statut`),
  KEY `idx_fiche` (`fiche_reference`),
  KEY `idx_projet` (`projet`),
  CONSTRAINT `fk_visite_fiche` FOREIGN KEY (`fiche_reference`)
    REFERENCES `fiches` (`reference`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_visite_session` FOREIGN KEY (`session_id`)
    REFERENCES `parcours_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_visite_agent` FOREIGN KEY (`agent_id`)
    REFERENCES `agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. JOURNAL DES IMPORTS CSV
--    Sans ce journal, un import rate un jour de salon est indebuggable.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lot_imports` (
  `id`         int(10) unsigned NOT NULL AUTO_INCREMENT,
  `projet`     varchar(64) NOT NULL,
  `fichier`    varchar(255) NOT NULL,
  `auteur`     varchar(120) NOT NULL DEFAULT '',
  `lignes_lues`     smallint(5) unsigned NOT NULL DEFAULT 0,
  `lignes_creees`   smallint(5) unsigned NOT NULL DEFAULT 0,
  `lignes_majs`     smallint(5) unsigned NOT NULL DEFAULT 0,
  `lignes_rejetees` smallint(5) unsigned NOT NULL DEFAULT 0,
  `rapport`    longtext DEFAULT NULL COMMENT 'JSON des erreurs ligne par ligne',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_projet` (`projet`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. VUE PUBLIQUE
--    Ce que le site a le droit de montrer au client. Les lots bloques et
--    les notes internes n'en sortent jamais : le front ne lit que cette
--    vue, ce qui evite une fuite par oubli dans une requete.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_lots_publics` AS
SELECT `id`, `projet`, `immeuble`, `niveau`, `niveau_ordre`, `numero_lot`,
       `typologie`, `surface_habitable`, `surface_balcon`, `surface_totale`,
       `nb_chambres`, `nb_sdb`, `orientation`, `exposition`, `ascenseur`,
       `parking`, `prix_dh`, `prix_m2`, `statut`, `plan_fichier`, `notes`
FROM `lots`
WHERE `statut` <> 'bloque';
