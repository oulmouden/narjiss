<?php
/**
 * api/fiche-config.php — stockage des fiches de renseignement client.
 *
 * ⚠️ RÈGLE CARDINALE : rien de tout cela ne doit vivre sous htdocs.
 * Une copie de CNIE placée dans la racine web serait téléchargeable par
 * quiconque devine son URL, sans authentification. Tout est donc écrit dans
 * un dossier frère de htdocs, servi uniquement par admin/fiche-piece.php
 * après vérification de session.
 *
 *   C:\xampp\htdocs\narjiss\   ← site public
 *   C:\xampp\narjiss-prive\    ← fiches + pièces d'identité (hors web)
 */
require_once __DIR__ . '/data.php';

/** Racine privée : C:\xampp\narjiss-prive (frère de htdocs). */
define('NJ_PRIVATE_DIR', dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'narjiss-prive');
define('NJ_FICHES_DIR',  NJ_PRIVATE_DIR . DIRECTORY_SEPARATOR . 'fiches');
define('NJ_PIECES_DIR',  NJ_FICHES_DIR  . DIRECTORY_SEPARATOR . 'pieces');
define('NJ_FICHES_FILE', NJ_FICHES_DIR  . DIRECTORY_SEPARATOR . 'fiches.json');
define('NJ_ACCESS_LOG',  NJ_FICHES_DIR  . DIRECTORY_SEPARATOR . 'acces.log');

/**
 * Durées de conservation, en jours.
 *
 * Deux régimes distincts, parce que les deux lois ne demandent pas la même chose :
 *  - prospect sans suite : durée de prospection commerciale usuelle (loi 09-08,
 *    principe de limitation de la conservation) ;
 *  - client ayant acquis : conservation des pièces d'identification imposée par
 *    la loi 43-05 (lutte contre le blanchiment).
 *
 * ⚠️ À faire confirmer par votre conseil juridique avant mise en production.
 */
define('NJ_RETENTION_PROSPECT_DAYS', 1095);   // 3 ans
define('NJ_RETENTION_CLIENT_DAYS',   3650);   // 10 ans

/** Pièces acceptées, et leur libellé. Sert aussi de liste blanche anti-traversée. */
function nj_piece_types(): array {
  return [
    'cnie-recto'  => 'CNIE — recto',
    'cnie-verso'  => 'CNIE — verso',
    'passeport'   => 'Passeport',
    'justificatif'=> 'Justificatif',
    'signature'   => 'Signature',
  ];
}

define('NJ_MAX_PIECE_BYTES', 8 * 1024 * 1024);   // 8 Mo par image

/** Crée l'arborescence privée si besoin, avec garde-fous. */
function nj_ensure_storage(): void {
  foreach ([NJ_PRIVATE_DIR, NJ_FICHES_DIR, NJ_PIECES_DIR] as $dir) {
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
  }
  // Ceinture et bretelles : si ce dossier se retrouvait un jour exposé par
  // une mauvaise configuration d'Apache, ce .htaccess bloque tout accès.
  $ht = NJ_PRIVATE_DIR . DIRECTORY_SEPARATOR . '.htaccess';
  if (!is_file($ht)) {
    @file_put_contents($ht, "Require all denied\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
  }
  if (!is_file(NJ_FICHES_FILE)) @file_put_contents(NJ_FICHES_FILE, "[]\n");
}

/** Lit l'index des fiches. */
function nj_fiches_read(): array {
  nj_ensure_storage();
  $raw = @file_get_contents(NJ_FICHES_FILE);
  $list = json_decode((string)$raw, true);
  return is_array($list) ? $list : [];
}

/**
 * Ajoute une fiche à l'index, sous verrou exclusif.
 * Le verrou évite qu'une tablette écrase la fiche d'une autre : deux
 * conseillers peuvent valider à la même seconde.
 */
function nj_fiches_append(array $entry): bool {
  nj_ensure_storage();
  $fp = fopen(NJ_FICHES_FILE, 'c+');
  if (!$fp) return false;
  if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }

  $list = json_decode((string)stream_get_contents($fp), true);
  if (!is_array($list)) $list = [];
  $list[] = $entry;

  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  return true;
}

/** Réécrit l'index en entier (utilisé par la purge et le changement de statut). */
function nj_fiches_write(array $list): bool {
  nj_ensure_storage();
  $json = json_encode(array_values($list), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  return (bool)@file_put_contents(NJ_FICHES_FILE, $json . "\n", LOCK_EX);
}

/**
 * Journalise une consultation de pièce d'identité.
 * Savoir qui a ouvert quelle CNIE et quand fait partie des mesures
 * attendues pour ce type de traitement.
 */
function nj_log_access(string $action, string $ref, string $detail = ''): void {
  nj_ensure_storage();
  $line = sprintf(
    "%s\t%s\t%s\t%s\t%s\n",
    date('c'),
    $_SERVER['REMOTE_ADDR'] ?? 'cli',
    $action,
    $ref,
    $detail
  );
  @file_put_contents(NJ_ACCESS_LOG, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Limite de débit : la fiche est atteignable depuis une page publique, donc
 * exposée aux envois automatisés. Sans ce garde-fou, n'importe qui pourrait
 * remplir le stockage privé d'images arbitraires.
 *
 * Retourne false si le quota horaire est dépassé pour cette adresse.
 */
function nj_rate_ok(int $max_per_hour = 6): bool {
  nj_ensure_storage();
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
  if ($ip === 'cli') return true;

  // L'IP n'est pas stockée en clair : un hachage suffit à compter.
  $key  = substr(hash('sha256', $ip . '|' . date('YmdH')), 0, 16);
  $file = NJ_FICHES_DIR . DIRECTORY_SEPARATOR . 'debit.json';

  $fp = fopen($file, 'c+');
  if (!$fp) return true;                 // en cas de souci, on ne bloque pas
  if (!flock($fp, LOCK_EX)) { fclose($fp); return true; }

  $data = json_decode((string)stream_get_contents($fp), true);
  if (!is_array($data)) $data = [];

  // Purge des créneaux passés : ce fichier ne doit pas grossir indéfiniment.
  $currentHour = date('YmdH');
  $data = array_filter($data, fn($v) => ($v['h'] ?? '') === $currentHour);

  $count = ($data[$key]['n'] ?? 0) + 1;
  $data[$key] = ['h' => $currentHour, 'n' => $count];

  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, json_encode($data));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);

  return $count <= $max_per_hour;
}

/** Référence de fiche : NJ-AAAAMMJJ-XXXX (lisible, non devinable). */
function nj_new_reference(): string {
  return 'NJ-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
}

/** Date d'expiration d'une fiche selon son statut. */
function nj_expiry_date(string $dateIso, string $statut): string {
  $days = $statut === 'client' ? NJ_RETENTION_CLIENT_DAYS : NJ_RETENTION_PROSPECT_DAYS;
  $d = new DateTimeImmutable($dateIso);
  return $d->add(new DateInterval('P' . $days . 'D'))->format('c');
}
