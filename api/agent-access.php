<?php
/**
 * api/agent-access.php — demandes d'accès visiteur → commercial, et code.
 *
 * Reproduit le flux twins3d (create → approve → code → verify) sur la stack
 * narjiss, et branche la mise en relation directe sur LiveKit (le visiteur et
 * le commercial rejoignent une même room « direct-req-<id> »).
 *
 * Actions (paramètre ?action=) :
 *   create           [ouvert, appelé par l'hôtesse IA] : demande à voir un
 *                    commercial. Vérifie qu'il existe et qu'il est EN LIGNE.
 *   code-for-visitor [ouvert, IA] : renvoie le code si la demande est approuvée.
 *   pending          [session agent] : demandes en attente + battement présence.
 *   approve          [session agent] : autorise → génère code + room directe.
 *   deny             [session agent] : refuse.
 *   join             [session agent] : jeton LiveKit pour rejoindre le visiteur.
 *   verify           [ouvert, visiteur] : valide un code → jeton LiveKit direct.
 */

require __DIR__ . '/agents-lib.php';
require __DIR__ . '/livekit.php'; // lk_token(), nj_projects()
require __DIR__ . '/push-lib.php'; // nj_push_envoyer()
header('Content-Type: application/json; charset=utf-8');

function nj_a_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$post   = $_SERVER['REQUEST_METHOD'] === 'POST';

try {
  switch ($action) {

    /* ── Appelé par l'hôtesse IA (serveur-à-serveur, sans session) ────────── */
    case 'create': {
      if (!$post) nj_a_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $projet   = preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['projet'] ?? ''));
      $visitor  = trim($_POST['visitor'] ?? '');
      $conseiller = trim($_POST['conseiller'] ?? '');
      $projets  = nj_projects();
      if ($projet === '' || !isset($projets[$projet])) {
        nj_a_json(['ok' => false, 'error' => 'Projet inconnu.'], 404);
      }
      $agent = nj_resolve_commercial($projet, $conseiller);
      if (!$agent) {
        nj_a_json(['ok' => true, 'found' => false]); // aucun commercial (ou nom inconnu)
      }
      $online = nj_agent_is_online((int)$agent['id']);
      if (!$online) {
        nj_a_json(['ok' => true, 'found' => true, 'online' => false, 'agent_name' => $agent['name']]);
      }
      $reqId = nj_access_create($visitor ?: 'Visiteur', (int)$agent['id'], $projet);

      /* Réveiller le téléphone du commercial (Web Push). Best-effort et jamais
         bloquant : on est sur le chemin du VISITEUR, qui attend sa réponse.
         Sans clés VAPID ou sans appareil inscrit, l'appel ne fait rien et le
         commercial est prévenu par le son de sa page, comme avant. */
      try { nj_push_envoyer((int)$agent['id']); } catch (Throwable $e) { /* tant pis */ }

      nj_a_json([
        'ok' => true, 'found' => true, 'online' => true,
        'agent_name' => $agent['name'], 'request_id' => $reqId,
      ]);
    }

    case 'code-for-visitor': {
      $projet  = preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['projet'] ?? $_GET['projet'] ?? ''));
      $visitor = trim($_POST['visitor'] ?? $_GET['visitor'] ?? '');
      $req = nj_access_latest_for_visitor($projet, $visitor);
      if (!$req) nj_a_json(['ok' => true, 'found' => false]);
      nj_a_json([
        'ok' => true, 'found' => true,
        'statut'     => $req['statut'],
        'code'       => $req['statut'] === 'approved' ? $req['code'] : '',
        'agent_name' => $req['agent_name'],
      ]);
    }

    /* ── Tableau de bord du commercial (session requise) ──────────────────── */
    case 'pending': {
      $me = nj_agent_require_json();
      nj_agent_touch((int)$me['id']); // le poll de notifs entretient la présence
      nj_a_json(['ok' => true, 'requests' => nj_access_pending_for((int)$me['id'])]);
    }

    case 'approve': {
      if (!$post) nj_a_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $me = nj_agent_require_json();
      $reqId = (int)($_POST['request_id'] ?? 0);
      $res = nj_access_approve($reqId, (int)$me['id']);
      if (!$res) nj_a_json(['ok' => false, 'error' => 'Demande introuvable ou déjà traitée.'], 404);
      nj_a_json(['ok' => true, 'code' => $res['code'], 'room' => $res['room']]);
    }

    case 'deny': {
      if (!$post) nj_a_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $me = nj_agent_require_json();
      $reqId = (int)($_POST['request_id'] ?? 0);
      nj_a_json(['ok' => nj_access_deny($reqId, (int)$me['id'])]);
    }

    // Le commercial rejoint la room directe du visiteur qu'il vient d'autoriser.
    case 'join': {
      $me = nj_agent_require_json();
      $reqId = (int)($_POST['request_id'] ?? $_GET['request_id'] ?? 0);
      $st = nj_adb()->prepare(
        'SELECT * FROM access_requests WHERE id = ? AND agent_id = ? AND statut = "approved"'
      );
      $st->execute([$reqId, (int)$me['id']]);
      $req = $st->fetch();
      if (!$req || $req['room'] === '') nj_a_json(['ok' => false, 'error' => 'Demande non autorisée.'], 404);
      nj_a_json([
        'ok'    => true,
        'token' => lk_token($req['room'], 'conseiller-' . (int)$me['id'], $me['name']),
        'url'   => LK_URL,
        'room'  => $req['room'],
      ]);
    }

    /* ── Saisie du code par le visiteur (ouvert) ──────────────────────────── */
    case 'verify': {
      if (!$post) nj_a_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $code = preg_replace('/\D/', '', $_POST['code'] ?? '');
      $req  = nj_access_verify($code);
      if (!$req) nj_a_json(['ok' => true, 'valid' => false]);
      nj_a_json([
        'ok'         => true,
        'valid'      => true,
        'agent_name' => $req['agent_name'],
        'telephone'  => $req['agent_tel'] ?? '',
        'whatsapp'   => $req['agent_whatsapp'] ?? '',
        'room'       => $req['room'],
        'token'      => $req['room'] !== '' ? lk_token($req['room'], 'visiteur-' . bin2hex(random_bytes(3)), $req['visitor']) : '',
        'url'        => LK_URL,
      ]);
    }

    default:
      nj_a_json(['ok' => false, 'error' => 'Action inconnue.'], 400);
  }
} catch (Throwable $e) {
  nj_a_json(['ok' => false, 'error' => 'Erreur serveur.'], 500);
}
