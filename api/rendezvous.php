<?php
/**
 * api/rendezvous.php — réception des demandes de rendez-vous transmises par
 * l'hôtesse IA (outil demander_rendezvous de api/agent.py).
 *
 * Les demandes sont ajoutées à data/rendezvous.json (fichier plat, pas de base
 * de données côté narjiss). Le back-office pourra les lire ensuite.
 */
require __DIR__ . '/livekit.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Méthode non autorisée.']);
  exit;
}

$projet = preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['projet'] ?? ''));
$projects = nj_projects();
if ($projet === '' || !isset($projects[$projet])) {
  http_response_code(404);
  echo json_encode(['ok' => false, 'error' => 'Projet inconnu.']);
  exit;
}

/** Coupe et nettoie une valeur postée. */
function nj_clean(string $key, int $max): string {
  $v = trim((string)($_POST[$key] ?? ''));
  $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v);
  return mb_substr($v, 0, $max);
}

$entry = [
  'id'        => bin2hex(random_bytes(6)),
  'date'      => date('c'),
  'projet'    => $projet,
  'nom'       => nj_clean('nom', 120) ?: 'Visiteur',
  'telephone' => nj_clean('telephone', 40),
  'email'     => nj_clean('email', 160),
  'sujet'     => nj_clean('sujet', 500),
  'source'    => 'hotesse-ia',
  'traite'    => false,
];

$path = __DIR__ . '/../data/rendezvous.json';
$fp = fopen($path, 'c+');
if (!$fp) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Stockage indisponible.']);
  exit;
}

// Verrou exclusif : l'agent peut écrire pendant qu'un admin lit le fichier.
if (!flock($fp, LOCK_EX)) {
  fclose($fp);
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Fichier verrouillé.']);
  exit;
}

$raw  = stream_get_contents($fp);
$list = json_decode((string)$raw, true);
if (!is_array($list)) $list = [];
$list[] = $entry;

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL);
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'id' => $entry['id']], JSON_UNESCAPED_UNICODE);
