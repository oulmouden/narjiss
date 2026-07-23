<?php
/**
 * api/config.php — lecture de la configuration locale (api/.env).
 *
 * Les endpoints PHP partagent le même fichier .env que l'agent Python, ce qui
 * évite de dupliquer les réglages SMTP ou l'URL du site. Le fichier n'est
 * jamais versionné (voir .gitignore).
 */

/** Lit et met en cache les paires clé=valeur de api/.env. */
function nj_env(): array {
  static $cache = null;
  if ($cache !== null) return $cache;

  $cache = [];
  $path = __DIR__ . '/.env';
  if (!is_file($path)) return $cache;

  foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') continue;
    $pos = strpos($line, '=');
    if ($pos === false) continue;
    $key = trim(substr($line, 0, $pos));
    $val = trim(substr($line, $pos + 1));
    // Retire d'éventuels guillemets entourant la valeur.
    if (strlen($val) >= 2 && ($val[0] === '"' || $val[0] === "'") && substr($val, -1) === $val[0]) {
      $val = substr($val, 1, -1);
    }
    $cache[$key] = $val;
  }
  return $cache;
}

/** Valeur de configuration, avec repli. */
function nj_config(string $key, string $default = ''): string {
  $env = nj_env();
  $v = $env[$key] ?? getenv($key);
  return ($v === false || $v === null || $v === '') ? $default : (string)$v;
}

/** URL de base du site (sert à composer les liens dans les e-mails). */
function nj_base_url(): string {
  return rtrim(nj_config('APP_URL', 'http://localhost/narjiss'), '/');
}
