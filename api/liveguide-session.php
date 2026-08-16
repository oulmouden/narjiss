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
 *
 * « start » est volontairement ouvert, comme l'était le ?lghost=1 d'origine :
 * ouvrir une session à soi ne donne accès à rien : elle est vide tant que le
 * conseiller n'a pas transmis lui-même le lien et le code.
 */

require __DIR__ . '/liveguide-lib.php';

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

    case 'start': {
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
