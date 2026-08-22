<?php

declare(strict_types=1);

/**
 * api/liveguide-session.php — cycle de vie d'une visite guidée en direct.
 *
 * Actions (paramètre ?action=) :
 *   start  [conseiller] : ouvre une session → identifiant, code à 6 chiffres
 *                         et jeton hôte. Le jeton n'est renvoyé QU'ICI.
 *   verify [visiteur]   : valide le code saisi. Sert au confort d'usage — dire
 *                         « code incorrect » plutôt que laisser l'abonnement
 *                         Pusher échouer sans explication. Le vrai contrôle
 *                         reste dans api/pusher-auth.php, qui refuse de signer
 *                         sans le bon code : contourner cet endpoint n'ouvre
 *                         donc aucune porte.
 *   end    [conseiller] : ferme la session. Les visiteurs ne peuvent plus se
 *                         reconnecter, même avec le lien ET le code.
 *   whoami [conseiller] : « ai-je le droit d'animer ? ». Sert au bouton
 *                         « Faire visiter », qui ne doit apparaître que pour
 *                         qui peut s'en servir. N'ouvre aucune session.
 *
 * POURQUOI « start » N'EST PLUS OUVERT
 * Il l'a longtemps été, avec ce raisonnement : ouvrir une session à soi ne
 * donne accès à rien, elle reste vide tant que le conseiller n'a pas transmis
 * lui-même le lien et le code. C'est exact pour la confidentialité — et
 * insuffisant pour deux raisons qui ne relèvent pas du secret :
 *
 *   - le quota Pusher. Rien ne limitait le nombre de sessions créées ; un
 *     script en ouvre des milliers et épuise le forfait pour tout le monde.
 *   - l'usurpation. N'importe qui pouvait se présenter en « conseiller
 *     Narjiss » auprès de visiteurs qu'il recrutait lui-même, promener leur
 *     navigateur sur le vrai site et leur parler par-dessus. Aucune donnée
 *     dérobée, mais la voix de la marque prêtée à un inconnu.
 *
 * Animer exige donc maintenant une session : agent actif OU admin connecté.
 * Rejoindre une visite, en revanche, n'a pas changé — le visiteur n'a toujours
 * besoin que du lien et du code.
 */

require __DIR__ . '/liveguide-lib.php';
require_once __DIR__ . '/agents-lib.php';

/* Nom de session par défaut (celui de l'admin), relevé AVANT que la session
   agent — qui s'appelle NJAGENT — ne prenne la main. Voir nj_admin_connecte(). */
$njSessionDefaut = session_name();

header('Content-Type: application/json; charset=utf-8');

function nj_lg_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  nj_lg_json(['ok' => false, 'error' => 'POST requis.'], 405);
}

try {
  switch ($action) {

    /* Le bouton « Faire visiter » ne doit pas s'afficher pour un visiteur
       ordinaire. Cette action ne dit QUE oui ou non : ni identité, ni rôle,
       rien qu'un client anonyme puisse exploiter. */
    case 'whoami': {
      $qui = nj_agent_ou_admin($njSessionDefaut);
      nj_lg_json(['ok' => true, 'peut_animer' => $qui !== null]);
    }

    case 'start': {
      $qui = nj_agent_ou_admin($njSessionDefaut);
      if ($qui === null) {
        nj_lg_json([
          'ok'    => false,
          'error' => 'Connexion requise pour animer une visite.',
          'need'  => 'login',
        ], 401);
      }
      nj_lg_json(['ok' => true] + nj_lg_create());
    }

    case 'verify': {
      $session = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($_POST['session'] ?? ''));
      $code    = preg_replace('/\D/', '', (string) ($_POST['code'] ?? ''));
      $row     = nj_lg_get($session);

      if (!nj_lg_is_open($row)) {
        nj_lg_json(['ok' => true, 'valid' => false, 'reason' => 'closed']);
      }
      if (nj_lg_code_locked($row)) {
        nj_lg_json(['ok' => true, 'valid' => false, 'reason' => 'locked']);
      }
      if (!nj_lg_check_code($row, $code)) {
        nj_lg_json(['ok' => true, 'valid' => false, 'reason' => 'code']);
      }
      nj_lg_json(['ok' => true, 'valid' => true]);
    }

    /* Chemin réellement emprunté par une connexion vocale. Déclaré par le
       navigateur, donc indicatif : ce n'est qu'une statistique, elle n'ouvre
       aucun droit. On vérifie tout de même que la session existe et que les
       types annoncés sont ceux du vocabulaire ICE. */
    case 'ice': {
      $session = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($_POST['session'] ?? ''));
      $role    = ($_POST['role'] ?? '') === 'host' ? 'host' : 'viewer';
      $local   = preg_replace('/[^a-z]/', '', (string) ($_POST['local'] ?? ''));
      $remote  = preg_replace('/[^a-z]/', '', (string) ($_POST['remote'] ?? ''));
      nj_lg_json(['ok' => nj_lg_ice($session, $role, $local, $remote)]);
    }

    case 'end': {
      $session = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($_POST['session'] ?? ''));
      $token   = preg_replace('/[^a-f0-9]/', '', (string) ($_POST['host_token'] ?? ''));
      nj_lg_json(['ok' => nj_lg_end($session, $token)]);
    }

    default:
      nj_lg_json(['ok' => false, 'error' => 'Action inconnue.'], 400);
  }
} catch (Throwable $e) {
  nj_lg_json(['ok' => false, 'error' => 'Erreur serveur.'], 500);
}
