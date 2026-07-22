<?php
/**
 * api/accueil-token.php — jeton LiveKit pour parler à l'hôtesse d'accueil IA
 * du bureau de vente d'un projet.
 *
 * Crée une room « bureau-<projet>-<lang>-<rand> » que l'agent Python rejoint
 * automatiquement (voir api/agent.py). Room voix uniquement (pas de vidéo).
 *
 * Le préfixe « bureau- » distingue narjiss des rooms « accueil- » de
 * Domiciliation : les deux agents partagent le serveur LiveKit sans se
 * marcher dessus, chacun filtrant sur son propre préfixe.
 */
require __DIR__ . '/livekit.php';
header('Content-Type: application/json; charset=utf-8');

$project = preg_replace('/[^a-z0-9_]/', '', strtolower($_GET['project'] ?? ''));
$lang    = preg_replace('/[^a-z]/', '', strtolower($_GET['lang'] ?? 'fr'));
if (!in_array($lang, ['fr', 'en', 'es', 'ar', 'darija'], true)) $lang = 'fr';

// Le projet doit exister dans data/projects.json.
$projects = nj_projects();
if ($project === '' || !isset($projects[$project])) {
  http_response_code(404);
  echo json_encode(['error' => 'Projet inconnu.']);
  exit;
}

$room     = 'bureau-' . $project . '-' . $lang . '-' . bin2hex(random_bytes(3));
$identity = 'visiteur-' . bin2hex(random_bytes(3));

echo json_encode([
  'token' => lk_token($room, $identity, 'Visiteur'),
  'url'   => LK_URL,
  'room'  => $room,
]);
