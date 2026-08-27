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
 *   GET ?dispo            : { online: bool, count: n } — agrégat ANONYME, tous
 *                           bureaux confondus, pour le lanceur « On en parle ? »
 *                           des pages publiques. Aucun nom, aucun horaire.
 *   POST demo=1           : présence SIMULÉE pour une démonstration (réservé
 *                           aux gestionnaires et superviseurs).
 *                           corps : agents=3,7  minutes=120
 *                           Liste vide ou minutes=0 : arrête la simulation.
 *   GET ?equipe=1         : la vue interne renvoie aussi l'état de cette
 *                           simulation, sous la clé « demo ».
 */

require __DIR__ . '/agents-lib.php';
header('Content-Type: application/json; charset=utf-8');

/* Relevé avant tout appel touchant à la session agent. Voir nj_admin_connecte(). */
$njSessionDefaut = session_name();

function nj_p_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $me = nj_agent_require_json();

  /* Réglage de la présence SIMULÉE, depuis « Mon équipe ». Intercepté avant le
     battement : ce POST-ci ne dit pas « je suis là », il dit « fais croire que
     ceux-là sont là ». Réservé aux gestionnaires et superviseurs — un
     commercial pourrait sinon se déclarer joignable à la place des autres. */
  if (isset($_POST['demo'])) {
    if (!in_array($me['role'], ['gestionnaire', 'superviseur'], true)) {
      nj_p_json(['ok' => false, 'error' => 'Réservé aux gestionnaires et superviseurs.', 'code' => 'reserveGestionnaires'], 403);
    }
    $ids = array_filter(explode(',', (string)($_POST['agents'] ?? '')), 'strlen');
    $etat = nj_demo_presence_ecrire($ids, (int)($_POST['minutes'] ?? 0));
    nj_p_json(['ok' => true] + $etat);
  }

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

/* Vue interne « qui est connecté » : toute l'équipe, gestionnaires compris.
   Distincte du roster ?projet= juste en dessous, qui est ouvert et destiné aux
   VISITEURS. La présence nominative de l'équipe entière n'a rien à faire sur un
   endpoint sans session : elle dirait à n'importe qui combien de personnes
   travaillent là et à quelle heure elles décrochent. */
if (isset($_GET['equipe'])) {
  // Agent OU admin : l'admin du back-office consulte la même vue, et
  // nj_agent_require_json() l'aurait refusé — il n'a pas de session agent.
  if (nj_agent_ou_admin($njSessionDefaut) === null) {
    nj_p_json(['ok' => false, 'error' => 'Non connecté.', 'code' => 'nonConnecte'], 401);
  }
  /* L'état de la simulation voyage avec l'équipe : « Mon équipe » sonde déjà
     ce point toutes les huit secondes, un second aller-retour n'apprendrait
     rien de plus. */
  nj_p_json(['ok' => true, 'agents' => nj_presence_equipe(), 'demo' => nj_demo_presence_etat()]);
}

/* Agrégat anonyme « quelqu'un décroche-t-il ? », tous bureaux confondus — lu
   par le lanceur « On en parle ? » de shared/menu.js, posé sur toutes les
   pages publiques. Ouvert comme le roster ?projet= juste en dessous, mais sans
   un seul nom, pour la raison exposée sur ?equipe= ci-dessus. */
if (isset($_GET['dispo'])) {
  nj_p_json(['ok' => true] + nj_presence_globale());
}

$projet = preg_replace('/[^a-z0-9_]/', '', strtolower($_GET['projet'] ?? ''));
if ($projet === '') nj_p_json(['ok' => false, 'error' => 'Projet requis.', 'code' => 'projetRequis'], 400);

nj_p_json(['ok' => true, 'projet' => $projet, 'agents' => nj_presence_roster($projet)]);
