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
require_once __DIR__ . '/db.php';

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
  // fiches.json n'est plus le stockage principal (voir MySQL, api/db.php) ;
  // NJ_FICHES_FILE n'est conservé que pour la migration one-shot, s'il existe.
}

/* ─────────────────────────────────────────────────────────────────────────
 * Stockage des enregistrements : MySQL (voir api/db.php).
 *
 * Une fiche est manipulée partout sous la forme d'un tableau imbriqué
 * (identite, coordonnees, …). Les deux mappers ci-dessous convertissent cette
 * forme vers/depuis une ligne SQL : les champs qu'on filtre et trie sont
 * extraits en colonnes plates, les groupes restent stockés en JSON.
 * Les copies de pièces d'identité ne sont JAMAIS en base : elles restent des
 * fichiers dans le coffre privé (NJ_PIECES_DIR).
 * ───────────────────────────────────────────────────────────────────────── */

/** ISO 8601 (« c ») → DATETIME MySQL, ou null si vide/illisible. */
function nj_iso_to_sql(string $iso): ?string {
  if ($iso === '') return null;
  try { return (new DateTimeImmutable($iso))->format('Y-m-d H:i:s'); }
  catch (Throwable $e) { return null; }
}

/** DATETIME MySQL → ISO 8601 (« c »), ou chaîne vide. */
function nj_sql_to_iso(?string $sql): string {
  if ($sql === null || $sql === '') return '';
  try { return (new DateTimeImmutable($sql))->format('c'); }
  catch (Throwable $e) { return ''; }
}

/** Encode un groupe en colonne JSON (null reste null). */
function nj_json_col($value): ?string {
  if ($value === null) return null;
  return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/** Décode une colonne JSON en tableau (repli sur []). */
function nj_json_val($raw): array {
  $d = json_decode((string)$raw, true);
  return is_array($d) ? $d : [];
}

/** Fiche imbriquée → ligne SQL (colonnes plates + groupes JSON). */
function nj_fiche_to_row(array $f): array {
  $id = $f['identite'] ?? [];
  $co = $f['coordonnees'] ?? [];
  $pa = $f['projet_acquisition'] ?? [];
  return [
    'reference'  => (string)($f['reference'] ?? ''),
    'created_at' => nj_iso_to_sql((string)($f['date'] ?? '')) ?? date('Y-m-d H:i:s'),
    'projet'     => (string)($f['projet'] ?? ''),
    'projet_nom' => (string)($f['projet_nom'] ?? ''),
    'conseiller' => (string)($f['conseiller'] ?? ''),
    'statut'     => (($f['statut'] ?? 'prospect') === 'client') ? 'client' : 'prospect',
    'expiration' => nj_iso_to_sql((string)($f['expiration'] ?? '')),
    'nom'        => (string)($id['nom'] ?? ''),
    'prenom'     => (string)($id['prenom'] ?? ''),
    'telephone'  => (string)($co['telephone'] ?? ''),
    'email'      => (string)($co['email'] ?? ''),
    'ville'      => (string)($co['ville'] ?? ''),
    'budget'     => (string)($pa['budget'] ?? ''),
    'identite'           => nj_json_col($f['identite'] ?? null),
    'coordonnees'        => nj_json_col($f['coordonnees'] ?? null),
    'situation_pro'      => nj_json_col($f['situation_pro'] ?? null),
    'projet_acquisition' => nj_json_col($f['projet_acquisition'] ?? null),
    'origine_contact'    => nj_json_col($f['origine_contact'] ?? null),
    'consentement'       => nj_json_col($f['consentement'] ?? null),
    'pieces'             => nj_json_col($f['pieces'] ?? null),
  ];
}

/** Ligne SQL → fiche imbriquée (forme attendue par l'admin et la purge). */
function nj_row_to_fiche(array $r): array {
  return [
    'reference'  => (string)($r['reference'] ?? ''),
    'date'       => nj_sql_to_iso($r['created_at'] ?? null),
    'projet'     => (string)($r['projet'] ?? ''),
    'projet_nom' => (string)($r['projet_nom'] ?? ''),
    'conseiller' => (string)($r['conseiller'] ?? ''),
    'statut'     => (string)($r['statut'] ?? 'prospect'),
    'expiration' => nj_sql_to_iso($r['expiration'] ?? null),
    'identite'           => nj_json_val($r['identite'] ?? null),
    'coordonnees'        => nj_json_val($r['coordonnees'] ?? null),
    'situation_pro'      => nj_json_val($r['situation_pro'] ?? null),
    'projet_acquisition' => nj_json_val($r['projet_acquisition'] ?? null),
    'origine_contact'    => nj_json_val($r['origine_contact'] ?? null),
    'consentement'       => nj_json_val($r['consentement'] ?? null),
    'pieces'             => nj_json_val($r['pieces'] ?? null),
  ];
}

/** Insère une nouvelle fiche. Remplace l'ancien append JSON. */
function nj_fiche_insert(array $fiche): bool {
  $row  = nj_fiche_to_row($fiche);
  $cols = array_keys($row);
  $ph   = array_map(fn($c) => ':' . $c, $cols);
  $sql  = 'INSERT INTO fiches (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $ph) . ')';
  return nj_db()->prepare($sql)->execute($row);
}

/** Une fiche par référence, sous forme imbriquée, ou null. */
function nj_fiche_get(string $ref): ?array {
  $st = nj_db()->prepare('SELECT * FROM fiches WHERE reference = ?');
  $st->execute([$ref]);
  $row = $st->fetch();
  return $row ? nj_row_to_fiche($row) : null;
}

/**
 * Liste filtrée / paginée. Filtres reconnus :
 *   q (recherche nom/prénom/téléphone/e-mail/référence), statut, projet,
 *   expire (bool → uniquement les fiches à purger), page, per_page.
 * Retourne ['rows' => fiches[], 'total' => int, 'page' => int, 'per_page' => int].
 */
function nj_fiches_query(array $f = []): array {
  $where = [];
  $args  = [];

  $q = trim((string)($f['q'] ?? ''));
  if ($q !== '') {
    $where[] = '(nom LIKE ? OR prenom LIKE ? OR telephone LIKE ? OR email LIKE ? OR reference LIKE ?)';
    $like = '%' . $q . '%';
    array_push($args, $like, $like, $like, $like, $like);
  }

  $statut = (string)($f['statut'] ?? '');
  if ($statut === 'prospect' || $statut === 'client') {
    $where[] = 'statut = ?';
    $args[]  = $statut;
  }

  $projet = (string)($f['projet'] ?? '');
  if ($projet !== '') {
    $where[] = 'projet = ?';
    $args[]  = $projet;
  }

  if (!empty($f['expire'])) {
    $where[] = 'expiration IS NOT NULL AND expiration < NOW()';
  }

  $clause = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

  $stc = nj_db()->prepare('SELECT COUNT(*) FROM fiches' . $clause);
  $stc->execute($args);
  $total = (int)$stc->fetchColumn();

  $perPage = min(200, max(1, (int)($f['per_page'] ?? 25)));
  $page    = max(1, (int)($f['page'] ?? 1));
  $offset  = ($page - 1) * $perPage;

  // perPage/offset sont des entiers validés : sûrs en interpolation directe
  // (LIMIT/OFFSET liés par placeholder posent problème hors mode émulé).
  $sql = 'SELECT * FROM fiches' . $clause
       . ' ORDER BY created_at DESC LIMIT ' . $perPage . ' OFFSET ' . $offset;
  $st = nj_db()->prepare($sql);
  $st->execute($args);
  $rows = array_map('nj_row_to_fiche', $st->fetchAll());

  return ['rows' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
}

/**
 * Change le statut et recalcule la date d'expiration en conséquence
 * (la conservation dépend du statut : prospect 3 ans / client 10 ans).
 */
function nj_fiche_set_statut(string $ref, string $statut): bool {
  $statut = ($statut === 'client') ? 'client' : 'prospect';

  $st = nj_db()->prepare('SELECT created_at FROM fiches WHERE reference = ?');
  $st->execute([$ref]);
  $created = $st->fetchColumn();
  if ($created === false) return false;

  $exp = nj_iso_to_sql(nj_expiry_date(nj_sql_to_iso((string)$created), $statut));
  $up  = nj_db()->prepare('UPDATE fiches SET statut = ?, expiration = ? WHERE reference = ?');
  return $up->execute([$statut, $exp, $ref]);
}

/** Supprime la ligne. La suppression des pièces sur disque incombe à l'appelant. */
function nj_fiche_delete(string $ref): bool {
  return nj_db()->prepare('DELETE FROM fiches WHERE reference = ?')->execute([$ref]);
}

/** Fiches dont la conservation est écoulée (pour la purge planifiée). */
function nj_fiches_expired(): array {
  $st = nj_db()->query(
    'SELECT * FROM fiches WHERE expiration IS NOT NULL AND expiration < NOW() ORDER BY expiration ASC'
  );
  return array_map('nj_row_to_fiche', $st->fetchAll());
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
