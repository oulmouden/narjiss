<?php
/**
 * api/db.php — connexion MySQL/MariaDB partagée (PDO).
 *
 * Les identifiants sont lus dans api/.env (voir api/config.php), avec des
 * valeurs par défaut adaptées à XAMPP pour un démarrage « clé en main » en
 * local. La base et la table des fiches sont créées à la volée au premier
 * accès : aucune étape SQL manuelle n'est requise en développement.
 *
 * ⚠️ Cette base ne contient QUE des données structurées. Les copies de pièces
 * d'identité restent des fichiers dans le coffre privé hors htdocs
 * (voir api/fiche-config.php). Rien de sensible ne transite par MySQL.
 */

require_once __DIR__ . '/config.php';

/** Connexion PDO unique, mise en cache pour toute la durée de la requête. */
function nj_db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $host = nj_config('DB_HOST', '127.0.0.1');
  $port = nj_config('DB_PORT', '3306');
  $name = nj_config('DB_NAME', 'narjiss');
  $user = nj_config('DB_USER', 'root');
  $pass = nj_config('DB_PASS', '');

  // Un nom de base ne devrait jamais contenir de backtick ; on le retire par
  // prudence, car il n'est pas paramétrable dans une requête préparée.
  $name = str_replace('`', '', $name);

  $opts = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ];

  // Connexion au serveur sans sélectionner de base : on peut ainsi la créer
  // si elle n'existe pas encore, puis basculer dessus.
  $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, $opts);
  $pdo->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  $pdo->exec("USE `$name`");

  nj_db_init($pdo);
  return $pdo;
}

/** Crée la table des fiches si elle n'existe pas (idempotent, gardé en statique). */
function nj_db_init(PDO $pdo): void {
  static $done = false;
  if ($done) return;

  $sql = <<<'SQL'
CREATE TABLE IF NOT EXISTS fiches (
  reference    VARCHAR(20)  NOT NULL PRIMARY KEY,
  created_at   DATETIME     NOT NULL,
  projet       VARCHAR(64)  NOT NULL,
  projet_nom   VARCHAR(191) NOT NULL DEFAULT '',
  conseiller   VARCHAR(120) NOT NULL DEFAULT '',
  statut       ENUM('prospect','client') NOT NULL DEFAULT 'prospect',
  expiration   DATETIME     NULL,
  nom          VARCHAR(120) NOT NULL DEFAULT '',
  prenom       VARCHAR(120) NOT NULL DEFAULT '',
  telephone    VARCHAR(40)  NOT NULL DEFAULT '',
  email        VARCHAR(160) NOT NULL DEFAULT '',
  ville        VARCHAR(100) NOT NULL DEFAULT '',
  budget       VARCHAR(60)  NOT NULL DEFAULT '',
  identite           LONGTEXT NULL,
  coordonnees        LONGTEXT NULL,
  situation_pro      LONGTEXT NULL,
  projet_acquisition LONGTEXT NULL,
  origine_contact    LONGTEXT NULL,
  consentement       LONGTEXT NULL,
  pieces             LONGTEXT NULL,
  INDEX idx_statut (statut),
  INDEX idx_projet (projet),
  INDEX idx_expiration (expiration),
  INDEX idx_created (created_at),
  INDEX idx_nom (nom, prenom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

  $pdo->exec($sql);
  $done = true;
}
