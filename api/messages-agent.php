<?php
/**
 * api/messages-agent.php — traitement des messages par les commerciaux.
 * Appelée depuis espace-agent.js (session agent obligatoire).
 *
 *   GET  action=list [&statut=actifs|nouveau|ecoute|traite|archive]
 *        → messages du bureau de l'agent (tous les bureaux pour un
 *          gestionnaire ou un superviseur), avec liens d'appel prêts à l'emploi
 *   GET  action=detail&id=N       → message + journal des suites données
 *   POST action=prise&id=N        → « je m'en occupe » (évite les doubles rappels)
 *   POST action=statut&id=N&valeur=…
 *   POST action=note&id=N&note=…
 *   POST action=journal&id=N&type=rappel|whatsapp|sms [&detail=…]
 *   POST action=vocal&id=N (multipart : audio, duree, legende?)
 *        → réponse vocale + lien d'écoute à jeton, à coller dans WhatsApp
 *   POST action=supprimer&id=N    → gestionnaire ou superviseur uniquement
 *
 * Cloisonnement : un commercial ne voit que les messages de son bureau.
 */
require __DIR__ . '/messages-lib.php';
require_once __DIR__ . '/data.php';
header('Content-Type: application/json; charset=utf-8');

function nj_ma_out(array $data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$me     = nj_agent_require_json();
$action = $_POST['action'] ?? ($_GET['action'] ?? '');
$global = in_array($me['role'], ['gestionnaire', 'superviseur'], true);

/** Message demandé, après contrôle d'accès. */
function nj_ma_message(array $me): array {
  $id = (int)($_POST['id'] ?? ($_GET['id'] ?? 0));
  $m  = $id ? nj_msg_get($id) : null;
  if (!$m || !nj_msg_agent_peut($me, $m)) nj_ma_out(['ok' => false, 'error' => 'Message introuvable.'], 404);
  return $m;
}

/** Vue JSON d'un message, avec ce qu'il faut pour rappeler d'un clic. */
function nj_ma_public(array $m): array {
  $tel = $m['telephone'];
  $bonjour = 'Bonjour' . ($m['visiteur_nom'] !== '' ? ' ' . $m['visiteur_nom'] : '')
           . ', Narjiss Immobilière — nous avons bien reçu votre message. Comment pouvons-nous vous aider ?';
  return [
    'id'            => (int)$m['id'],
    'projet'        => $m['projet'],
    'projet_nom'    => nj_msg_projet_nom($m['projet']),
    'canal'         => $m['canal'],
    'nom'           => $m['visiteur_nom'],
    'telephone'     => $tel,
    'tel_affiche'   => $tel !== '' ? nj_msg_tel_affiche($tel) : '',
    // Numéro dicté à l'hôtesse : à vérifier avant de composer.
    'tel_brut'      => $m['canal'] === 'hotesse' ? $m['telephone_brut'] : '',
    'email'         => $m['email'],
    'langue'        => $m['langue'],
    'message'       => $m['message_texte'],
    'transcription' => $m['transcription'],
    'audio'         => $m['audio_fichier'] !== '' ? 'api/message-audio.php?msg=' . (int)$m['id'] : '',
    'duree_s'       => (int)$m['duree_s'],
    'statut'        => $m['statut'],
    'pris_par'      => $m['pris_par'] ? (int)$m['pris_par'] : null,
    'pris_nom'      => $m['pris_nom'],
    'notes'         => $m['notes'],
    'date'          => $m['created_at'],
    'lien_tel'      => $tel !== '' ? 'tel:' . $tel : '',
    'lien_wa'       => $tel !== '' ? nj_msg_lien_whatsapp($tel, $bonjour) : '',
    'lien_sms'      => $tel !== '' ? 'sms:' . $tel . '?body=' . rawurlencode($bonjour) : '',
    'lien_mail'     => $m['email'] !== '' ? 'mailto:' . $m['email'] : '',
    'prefill'       => $bonjour,
  ];
}

try {
  // ── Liste ────────────────────────────────────────────────────────────────
  if ($action === 'list') {
    $statut = (string)($_GET['statut'] ?? 'actifs');
    $projet = $global ? (string)($_GET['projet'] ?? '') : (string)$me['projet'];
    // Un commercial sans bureau rattaché ne voit rien plutôt que tout.
    if (!$global && $projet === '') nj_ma_out(['ok' => true, 'messages' => [], 'nouveaux' => 0]);

    $out = array_map('nj_ma_public', nj_msg_list($projet, $statut));
    nj_ma_out(['ok' => true, 'messages' => $out, 'nouveaux' => nj_msg_nb_nouveaux($global ? '' : $projet)]);
  }

  // ── Détail : ouvrir un message vaut écoute ───────────────────────────────
  if ($action === 'detail') {
    $m = nj_ma_message($me);
    if ($m['statut'] === 'nouveau') {
      nj_msg_db()->prepare("UPDATE messages SET statut='ecoute' WHERE id=?")->execute([$m['id']]);
      $m['statut'] = 'ecoute';
    }
    $journal = array_map(function ($a) {
      return [
        'type'   => $a['type'],
        'detail' => $a['detail'],
        'agent'  => $a['agent_nom'],
        'date'   => $a['created_at'],
        'audio'  => $a['audio_fichier'] !== '' ? 'api/message-audio.php?rep=' . (int)$a['id'] : '',
        'lien'   => $a['jeton'] ? rtrim(nj_base_url(), '/') . '/ecoute.php?j=' . $a['jeton'] : '',
      ];
    }, nj_msg_actions((int)$m['id']));
    nj_ma_out(['ok' => true, 'message' => nj_ma_public($m), 'journal' => $journal]);
  }

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    nj_ma_out(['ok' => false, 'error' => 'Action inconnue.'], 400);
  }
  $m   = nj_ma_message($me);
  $pdo = nj_msg_db();

  // ── « Je m'en occupe » ───────────────────────────────────────────────────
  if ($action === 'prise') {
    if ($m['pris_par'] && (int)$m['pris_par'] !== (int)$me['id']) {
      nj_ma_out(['ok' => false, 'error' => $m['pris_nom'] . ' s\'occupe déjà de ce message.'], 409);
    }
    $pdo->prepare('UPDATE messages SET pris_par=?, pris_nom=?, pris_le=NOW() WHERE id=?')
        ->execute([$me['id'], $me['name'], $m['id']]);
    nj_msg_journal((int)$m['id'], 'prise', $me);
    nj_ma_out(['ok' => true, 'pris_nom' => $me['name']]);
  }

  if ($action === 'statut') {
    $v = (string)($_POST['valeur'] ?? '');
    if (!isset(nj_msg_statuts()[$v])) nj_ma_out(['ok' => false, 'error' => 'Statut inconnu.'], 400);
    $pdo->prepare('UPDATE messages SET statut=? WHERE id=?')->execute([$v, $m['id']]);
    nj_msg_journal((int)$m['id'], 'statut', $me, nj_msg_statuts()[$v]);
    nj_ma_out(['ok' => true, 'statut' => $v]);
  }

  if ($action === 'note') {
    $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 2000);
    $pdo->prepare('UPDATE messages SET notes=? WHERE id=?')->execute([$note !== '' ? $note : null, $m['id']]);
    if ($note !== '') nj_msg_journal((int)$m['id'], 'note', $me, mb_substr($note, 0, 255));
    nj_ma_out(['ok' => true]);
  }

  // ── Rappel / WhatsApp / SMS : le lien ouvre l'app, on garde la trace ─────
  if ($action === 'journal') {
    $type = (string)($_POST['type'] ?? '');
    if (!in_array($type, ['rappel', 'whatsapp', 'sms', 'email'], true)) {
      nj_ma_out(['ok' => false, 'error' => 'Type inconnu.'], 400);
    }
    nj_msg_journal((int)$m['id'], $type, $me, mb_substr(trim((string)($_POST['detail'] ?? '')), 0, 255));
    // Un rappel ou un message envoyé vaut prise en charge.
    $pdo->prepare("UPDATE messages SET statut='traite' WHERE id=? AND statut IN ('nouveau','ecoute')")
        ->execute([$m['id']]);
    nj_ma_out(['ok' => true]);
  }

  // ── Réponse vocale : lien à jeton, WhatsApp ne prend pas de pièce jointe ──
  if ($action === 'vocal') {
    $audio = nj_msg_audio_save('audio');
    if (!$audio) nj_ma_out(['ok' => false, 'error' => 'Enregistrement illisible ou trop lourd.'], 400);
    $jeton = bin2hex(random_bytes(16));
    nj_msg_journal((int)$m['id'], 'vocal', $me, mb_substr(trim((string)($_POST['legende'] ?? '')), 0, 255), [
      'fichier' => $audio['fichier'], 'mime' => $audio['mime'],
      'duree'   => max(0, min(NJ_MSG_MAX_DUREE_S, (int)($_POST['duree'] ?? 0))), 'jeton' => $jeton,
    ]);
    $lien = rtrim(nj_base_url(), '/') . '/ecoute.php?j=' . $jeton;
    nj_ma_out(['ok' => true, 'lien' => $lien,
               'lien_wa' => $m['telephone'] !== '' ? nj_msg_lien_whatsapp($m['telephone'], 'Votre message vocal : ' . $lien) : '']);
  }

  if ($action === 'supprimer') {
    if (!$global) nj_ma_out(['ok' => false, 'error' => 'Réservé au gestionnaire.'], 403);
    nj_msg_supprimer((int)$m['id']);
    nj_ma_out(['ok' => true]);
  }

  nj_ma_out(['ok' => false, 'error' => 'Action inconnue.'], 400);

} catch (Throwable $e) {
  nj_ma_out(['ok' => false, 'error' => 'Service indisponible.'], 500);
}
