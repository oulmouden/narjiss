<?php
/**
 * api/agent-push.php — abonnement d'un appareil aux notifications Web Push.
 *
 *   GET  ?cle           [ouvert] : { actif: bool, cle: "<clé publique VAPID>" }
 *                                  Le navigateur en a besoin AVANT de pouvoir
 *                                  s'abonner. Rien de secret ici : cette clé est
 *                                  publique par construction, et sans la privée
 *                                  elle ne permet d'envoyer aucune notification.
 *   POST action=abonner   [session agent] : endpoint, p256dh, auth
 *   POST action=desabonner[session agent] : endpoint
 *
 * Voir api/push-lib.php pour le pourquoi du push sans contenu.
 */

require __DIR__ . '/push-lib.php';
header('Content-Type: application/json; charset=utf-8');

function nj_push_out(array $data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  $cles = nj_push_cles();
  nj_push_out(['ok' => true, 'actif' => $cles !== null, 'cle' => $cles['public'] ?? '']);
}

$me = nj_agent_require_json();
$action   = $_POST['action'] ?? '';
$endpoint = trim($_POST['endpoint'] ?? '');

/* Un endpoint est toujours une URL https fournie par le navigateur. On refuse
   tout le reste : sans ce contrôle, la table deviendrait un moyen de faire
   émettre des requêtes sortantes vers une adresse choisie par l'appelant. */
if ($endpoint === '' || !preg_match('~^https://~', $endpoint) || strlen($endpoint) > 2000) {
  nj_push_out(['ok' => false, 'error' => 'Abonnement invalide.', 'code' => 'abonnementInvalide'], 400);
}

if ($action === 'desabonner') {
  nj_push_oublier($endpoint);
  nj_push_out(['ok' => true]);
}

if ($action !== 'abonner') {
  nj_push_out(['ok' => false, 'error' => 'Action inconnue.', 'code' => 'actionInconnue'], 400);
}

if (!nj_push_actif()) {
  // Le serveur n'a pas de clés : inutile de stocker un abonnement qu'on ne
  // saurait pas réveiller. L'espace agent retombera sur le son seul.
  nj_push_out(['ok' => false, 'error' => 'Push non configuré.', 'code' => 'pushNonConfigure'], 503);
}

nj_push_enregistrer(
  (int)$me['id'],
  $endpoint,
  mb_substr(trim($_POST['p256dh'] ?? ''), 0, 255),
  mb_substr(trim($_POST['auth'] ?? ''), 0, 64)
);
nj_push_out(['ok' => true]);
