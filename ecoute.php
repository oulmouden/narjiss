<?php
/**
 * ecoute.php — page publique d'écoute d'une réponse vocale d'un commercial.
 *
 * WhatsApp et le SMS ne transportent pas de pièce jointe depuis un lien : le
 * commercial enregistre sa réponse dans son espace, et colle ce lien à jeton
 * dans la conversation. Seul le porteur du jeton (128 bits) peut écouter ;
 * l'enregistrement lui-même reste dans le coffre privé, hors htdocs.
 *
 *   ecoute.php?j=<jeton>         → la page lecteur
 *   ecoute.php?j=<jeton>&audio=1 → le flux audio
 */
require __DIR__ . '/api/messages-lib.php';
require_once __DIR__ . '/api/data.php';

function nj_e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$jeton = preg_replace('/[^a-f0-9]/', '', strtolower($_GET['j'] ?? ''));
$rep = null;
if (strlen($jeton) === 32) {
  try {
    $st = nj_msg_db()->prepare("SELECT a.*, m.projet, m.visiteur_nom
      FROM message_actions a JOIN messages m ON m.id = a.message_id
      WHERE a.jeton = ? AND a.type = 'vocal' LIMIT 1");
    $st->execute([$jeton]);
    $rep = $st->fetch() ?: null;
  } catch (Throwable $e) { $rep = null; }
}

// ── Flux audio ──────────────────────────────────────────────────────────────
if (!empty($_GET['audio'])) {
  if (!$rep || $rep['audio_fichier'] === '') { http_response_code(404); exit('Introuvable'); }
  $path = nj_msg_audio_path($rep['audio_fichier']);
  if (!is_file($path)) { http_response_code(404); exit('Introuvable'); }
  header('Content-Type: ' . ($rep['audio_mime'] !== '' ? $rep['audio_mime'] : 'application/octet-stream'));
  header('Content-Length: ' . filesize($path));
  header('X-Content-Type-Options: nosniff');
  readfile($path);
  exit;
}

if (!$rep) http_response_code(404);
$bureau = $rep ? nj_project_name($rep['projet']) : '';
$duree  = $rep ? (int)$rep['duree_s'] : 0;
?><!DOCTYPE html>
<html lang="fr" dir="ltr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title><?= $rep ? 'Message vocal' : 'Lien introuvable' ?> — Narjiss</title>
<link rel="icon" type="image/jpeg" href="images/logo-narjiss.jpg">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{ box-sizing:border-box; }
  body{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
    background:#f4f6f9; color:#1f2430; font-family:'Outfit',system-ui,sans-serif; }
  .box{ background:#fff; border-radius:16px; padding:28px 26px; max-width:440px; width:100%; text-align:center;
    box-shadow:0 18px 46px rgba(12,35,64,.14); }
  .logo{ font-weight:700; color:#0c2340; letter-spacing:.04em; margin-bottom:18px; }
  h1{ font-size:1.15rem; margin:0 0 8px; }
  p{ font-size:.95rem; line-height:1.6; color:#54627a; margin:0 0 18px; }
  audio{ width:100%; margin:6px 0 14px; }
  .meta{ font-size:.82rem; color:#8a95a6; }
  a{ color:#006aff; }
</style></head><body>
<div class="box">
  <div class="logo">NARJISS IMMOBILIÈRE</div>
  <?php if ($rep): ?>
    <h1>Message vocal<?= $bureau !== '' ? ' — bureau de ' . nj_e($bureau) : '' ?></h1>
    <p>Vous aviez laissé un message&nbsp;: voici la réponse de votre conseiller<?= $rep['agent_nom'] !== '' ? ' ' . nj_e($rep['agent_nom']) : '' ?>.</p>
    <audio controls preload="metadata" src="ecoute.php?j=<?= nj_e($jeton) ?>&amp;audio=1"></audio>
    <?php if (!empty($rep['detail'])): ?><p style="color:#1f2430">« <?= nj_e($rep['detail']) ?> »</p><?php endif; ?>
    <div class="meta">Déposé le <?= nj_e(date('d/m/Y à H:i', strtotime($rep['created_at']))) ?>
      · durée <?= (int)floor($duree / 60) ?>:<?= str_pad((string)($duree % 60), 2, '0', STR_PAD_LEFT) ?></div>
  <?php else: ?>
    <h1>Lien introuvable</h1>
    <p>Ce message n'existe plus, ou le lien est incomplet.</p>
    <p><a href="index.html">Aller sur narjiss.ma</a></p>
  <?php endif; ?>
</div>
</body></html>
