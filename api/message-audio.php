<?php
/**
 * api/message-audio.php — sert un enregistrement du coffre privé.
 *
 * Les messages vocaux sont la voix d'une personne identifiable : ils vivent
 * hors htdocs et ne sortent qu'ici, après vérification de session.
 * Autorisés : le commercial du bureau concerné (gestionnaire et superviseur :
 * tous les bureaux) et l'administrateur.
 *
 *   ?msg=N  → le message laissé par le visiteur
 *   ?rep=N  → une réponse vocale enregistrée par un commercial
 */
require __DIR__ . '/messages-lib.php';

// Nom de session par défaut (celui de l'admin) : à retenir avant que la
// session agent, qui s'appelle NJAGENT, ne prenne la main.
$njSessionAdmin = session_name();

$msgId = (int)($_GET['msg'] ?? 0);
$repId = (int)($_GET['rep'] ?? 0);
if ($msgId <= 0 && $repId <= 0) { http_response_code(404); exit('Introuvable'); }

try {
  $pdo = nj_msg_db();
  if ($msgId > 0) {
    $st = $pdo->prepare('SELECT audio_fichier fichier, audio_mime mime, projet FROM messages WHERE id = ?');
    $st->execute([$msgId]);
  } else {
    $st = $pdo->prepare('SELECT a.audio_fichier fichier, a.audio_mime mime, m.projet
      FROM message_actions a JOIN messages m ON m.id = a.message_id WHERE a.id = ?');
    $st->execute([$repId]);
  }
  $row = $st->fetch();
} catch (Throwable $e) { http_response_code(500); exit('Erreur'); }

if (!$row || $row['fichier'] === '') { http_response_code(404); exit('Introuvable'); }

// Session commercial, sinon session admin. Les deux espaces utilisent des noms
// de session différents (NJAGENT / PHPSESSID) et PHP n'en ouvre qu'une à la
// fois : il faut refermer la première pour interroger la seconde.
$autorise = false;
$agent = nj_agent_current();
if ($agent && nj_msg_agent_peut($agent, ['projet' => $row['projet']])) $autorise = true;

if (!$autorise) {
  if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
  session_name($njSessionAdmin);
  session_start();
  $autorise = ($_SESSION['narjiss_admin'] ?? false) === true;
}
if (!$autorise) { http_response_code(403); exit('Accès refusé'); }

$path = nj_msg_audio_path($row['fichier']);
if (!is_file($path)) { http_response_code(404); exit('Fichier introuvable'); }

header('Content-Type: ' . ($row['mime'] !== '' ? $row['mime'] : 'application/octet-stream'));
header('Content-Length: ' . filesize($path));
header('Content-Disposition: inline; filename="message-' . ($msgId ?: $repId) . '.' . pathinfo($path, PATHINFO_EXTENSION) . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=600');
readfile($path);
