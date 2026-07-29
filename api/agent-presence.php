<?php
/**
 * api/agent-presence.php — présence des commerciaux.
 *
 *   POST (session agent)  : battement de présence + statut manuel réglable.
 *                           corps : presence=bureau|en_ligne|occupe|absent (optionnel)
 *                           Renvoie aussi le nombre de demandes d'accès en attente.
 *   GET ?projet=<id>      : roster public d'un bureau (ouvert) — pour la page
 *                           visiteur et l'hôtesse IA : qui est en ligne / son statut.
 *   GET ?agent_id=<n>     : { online: bool } — vérif ciblée (hôtesse IA).
 */

require __DIR__ . '/agents-lib.php';
header('Content-Type: application/json; charset=utf-8');

function nj_p_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $me = nj_agent_require_json();
  $presence = $_POST['presence'] ?? null;
  if ($presence !== null && !in_array($presence, NJ_PRESENCE_STATES, true)) $presence = null;
  nj_agent_touch((int)$me['id'], $presence);
  nj_p_json([
    'ok'       => true,
    'presence' => $presence,
    'pending'  => count(nj_access_pending_for((int)$me['id'])),
  ]);
}

// GET
$agentId = isset($_GET['agent_id']) ? (int)$_GET['agent_id'] : 0;
if ($agentId > 0) {
  nj_p_json(['ok' => true, 'agent_id' => $agentId, 'online' => nj_agent_is_online($agentId)]);
}

$projet = preg_replace('/[^a-z0-9_]/', '', strtolower($_GET['projet'] ?? ''));
if ($projet === '') nj_p_json(['ok' => false, 'error' => 'Projet requis.'], 400);

nj_p_json(['ok' => true, 'projet' => $projet, 'agents' => nj_presence_roster($projet)]);
