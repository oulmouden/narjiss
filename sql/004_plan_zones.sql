-- =====================================================================
--  Narjiss — zones cliquables des plans d'etage
--
--  Un plan commercial (andalusia/plans/malaga.jpeg) est une image plate :
--  rien ne relie le rectangle « B 03 / 92 m2 » dessine dessus a la ligne
--  correspondante de la table `lots`. Le conseiller ne peut donc pas laisser
--  le client cliquer sur un appartement pour en voir le prix et le statut.
--
--  Cette table porte le chainon manquant : un polygone par lot, en
--  coordonnees de l'image d'origine.
--
--  Deux choix a expliquer :
--
--  - le lien vers le lot se fait par `numero_lot` (texte), pas par
--    `lots.id`. C'est la meme cle metier que l'import CSV : reimporter la
--    grille recree des lignes `lots` avec de nouveaux id, mais les numeros
--    de lot, eux, ne bougent pas. Un lien par id serait casse a chaque
--    reimport.
--
--  - `largeur` / `hauteur` figent la resolution de reference. Le jour ou un
--    plan est re-exporte plus grand, les polygones restent interpretables :
--    on sait dans quel repere ils ont ete traces, donc on peut les mettre a
--    l'echelle au lieu de tout retracer.
--
--  L'editeur (admin/plan-zones.php) part TOUJOURS du lot : on choisit le lot
--  dans la liste, puis on trace son contour. Un polygone a donc toujours un
--  proprietaire, et `numero_lot` n'est jamais vide en pratique. La colonne
--  reste sans contrainte NOT NULL utile : la valeur vide sert uniquement de
--  garde-fou cote application, qui refuse d'ecrire une zone orpheline.
--
--  Idempotent : rejouable sans risque.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `plan_zones` (
  `id`         int(10) unsigned NOT NULL AUTO_INCREMENT,
  `projet`     varchar(64)  NOT NULL COMMENT 'slug, ex: andalusia',
  `plan`       varchar(255) NOT NULL COMMENT 'chemin relatif a la racine du site',
  `numero_lot` varchar(32)  NOT NULL DEFAULT '' COMMENT 'vide = zone non affectee',
  `points`     mediumtext   NOT NULL COMMENT 'JSON [[x,y],...] en pixels image',
  `largeur`    smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'resolution de reference',
  `hauteur`    smallint(5) unsigned NOT NULL DEFAULT 0,
  `origine`    enum('auto','manuel') NOT NULL DEFAULT 'manuel'
                 COMMENT 'auto = issue de tools/plan-zones.py, relue ou non',

  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),

  PRIMARY KEY (`id`),
  -- pas d'unicite sur numero_lot : un lot peut s'etaler sur deux polygones
  -- (duplex, logement traversant coupe par une cage d'escalier), et plusieurs
  -- zones non affectees coexistent avec un numero vide.
  KEY `idx_plan` (`projet`,`plan`),
  KEY `idx_lot`  (`projet`,`numero_lot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
