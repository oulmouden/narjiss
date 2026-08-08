-- =====================================================================
--  Narjiss — documents propres a chaque lot
--
--  Jusqu'ici la table `lots` ne portait qu'une colonne media,
--  `plan_fichier`, jamais remplie : la page disponibilites retombait donc
--  systematiquement sur les documents du PROJET (plan_architecte_url,
--  plan_visuel_url, tour_url de data/projects.json), identiques pour tous
--  les lots. Le conseiller ne pouvait pas montrer le plan du F3 qu'il est
--  en train de vendre.
--
--  On ajoute les trois chemins manquants, en miroir des champs projet :
--  chaque lot peut desormais avoir son plan d'architecte, son plan
--  commercial et sa visite 360. Les colonnes restent facultatives : vide
--  = on retombe sur le document du projet, comportement actuel inchange.
--
--  Chemins relatifs a la racine du site, comme dans projects.json
--  (ex : jawhara/floorplan/plan-architecte.png).
--
--  Idempotent : rejouable sans risque.
-- =====================================================================

SET NAMES utf8mb4;

-- MySQL/MariaDB n'ont pas de ADD COLUMN IF NOT EXISTS portable : on passe
-- par information_schema pour rester rejouable sur les deux.
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `lots`
       ADD COLUMN `plan_architecte` varchar(255) DEFAULT NULL
         COMMENT ''plan d architecte du lot, vide = celui du projet''
         AFTER `plan_fichier`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'lots'
    AND COLUMN_NAME  = 'plan_architecte'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `lots`
       ADD COLUMN `plan_visuel` varchar(255) DEFAULT NULL
         COMMENT ''plan commercial du lot, vide = celui du projet''
         AFTER `plan_architecte`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'lots'
    AND COLUMN_NAME  = 'plan_visuel'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `lots`
       ADD COLUMN `visite_360` varchar(255) DEFAULT NULL
         COMMENT ''visite virtuelle du lot, vide = celle du projet''
         AFTER `plan_visuel`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'lots'
    AND COLUMN_NAME  = 'visite_360'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- La vue publique doit exposer les trois nouveaux chemins, sinon le front
-- (qui ne lit que cette vue) ne les verra jamais.
CREATE OR REPLACE VIEW `v_lots_publics` AS
SELECT `id`, `projet`, `immeuble`, `niveau`, `niveau_ordre`, `numero_lot`,
       `typologie`, `surface_habitable`, `surface_balcon`, `surface_totale`,
       `nb_chambres`, `nb_sdb`, `orientation`, `exposition`, `ascenseur`,
       `parking`, `prix_dh`, `prix_m2`, `statut`, `plan_fichier`,
       `plan_architecte`, `plan_visuel`, `visite_360`, `notes`
FROM `lots`
WHERE `statut` <> 'bloque';
