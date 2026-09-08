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

    /* Envoyer l'invitation par e-mail.
     *
     * Le conseiller n'a pas toujours WhatsApp sur son poste, ni le numéro du
     * client sous la main : sans cela il lui reste à dicter un lien au
     * téléphone. On envoie donc le lien ET le code depuis le serveur.
     *
     * Trois garde-fous, parce qu'un endpoint qui envoie des e-mails est une
     * cible : il faut pouvoir animer (agent actif ou admin), détenir le jeton
     * hôte de CETTE session, et le lien doit pointer sur ce site — sinon on
     * offrirait à un tiers un relais signé Narjiss vers la page de son choix.
     */
    case 'invite': {
      $qui = nj_agent_ou_admin($njSessionDefaut);
      if ($qui === null) {
        nj_lg_json(['ok' => false, 'error' => 'Connexion requise.', 'need' => 'login'], 401);
      }

      $session = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($_POST['session'] ?? ''));
      $row     = nj_lg_get($session);
      if (!nj_lg_is_open($row)) {
        nj_lg_json(['ok' => false, 'error' => 'Visite terminée.'], 410);
      }
      if (!nj_lg_check_host($row, (string) ($_POST['host_token'] ?? ''))) {
        nj_lg_json(['ok' => false, 'error' => 'Vous n\'animez pas cette visite.'], 403);
      }

      $email = trim((string) ($_POST['email'] ?? ''));
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        nj_lg_json(['ok' => false, 'error' => 'Adresse e-mail invalide.', 'champ' => 'email'], 422);
      }

      // Le lien vient du navigateur : il porte la page où se trouve le
      // conseiller, que le serveur ne connaît pas. On vérifie donc son hôte
      // plutôt que de le reconstruire.
      $lien  = trim((string) ($_POST['lien'] ?? ''));
      $parts = parse_url($lien);
      $hote  = strtolower((string) ($parts['host'] ?? ''));
      $ici   = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
      if (!in_array(strtolower((string) ($parts['scheme'] ?? '')), ['http', 'https'], true)
          || $hote === '' || preg_replace('/:\d+$/', '', $hote) !== $ici) {
        nj_lg_json(['ok' => false, 'error' => 'Lien invalide.'], 422);
      }

      $code   = preg_replace('/\D/', '', (string) ($_POST['code'] ?? ''));
      $langue = in_array(($_POST['langue'] ?? ''), ['fr', 'en', 'ar', 'es'], true)
        ? $_POST['langue'] : 'fr';
      $auteur = trim((string) ($qui['name'] ?? $qui['nom'] ?? ''));

      require_once __DIR__ . '/mail.php';

      $L = [
        'fr' => [
          'sujet'  => 'Votre visite guidée Narjiss',
          'titre'  => 'Votre visite guidée en direct',
          'intro'  => $auteur !== ''
            ? htmlspecialchars($auteur) . ' vous invite à une visite guidée en direct des projets Narjiss.'
            : 'Vous êtes invité à une visite guidée en direct des projets Narjiss.',
          'consigne' => "Ouvrez le lien ci-dessous, puis saisissez ce code lorsqu'il vous est demandé :",
          'cta'    => 'Rejoindre la visite',
          'aide'   => 'Le lien et le code ne sont valables que pendant la visite.',
        ],
        'en' => [
          'sujet'  => 'Your Narjiss guided tour',
          'titre'  => 'Your live guided tour',
          'intro'  => $auteur !== ''
            ? htmlspecialchars($auteur) . ' invites you to a live guided tour of the Narjiss projects.'
            : 'You are invited to a live guided tour of the Narjiss projects.',
          'consigne' => 'Open the link below, then enter this code when prompted:',
          'cta'    => 'Join the tour',
          'aide'   => 'The link and code are only valid for the duration of the tour.',
        ],
        'ar' => [
          'sujet'  => 'جولتكم الموجهة مع نرجس',
          'titre'  => 'جولتكم الموجهة المباشرة',
          'intro'  => $auteur !== ''
            ? htmlspecialchars($auteur) . ' يدعوكم إلى جولة موجهة مباشرة في مشاريع نرجس.'
            : 'ندعوكم إلى جولة موجهة مباشرة في مشاريع نرجس.',
          'consigne' => 'افتحوا الرابط أدناه، ثم أدخلوا هذا الرمز عند الطلب:',
          'cta'    => 'الانضمام إلى الجولة',
          'aide'   => 'الرابط والرمز صالحان طوال مدة الجولة فقط.',
        ],
        'es' => [
          'sujet'  => 'Su visita guiada Narjiss',
          'titre'  => 'Su visita guiada en directo',
          'intro'  => $auteur !== ''
            ? htmlspecialchars($auteur) . ' le invita a una visita guiada en directo de los proyectos Narjiss.'
            : 'Le invitamos a una visita guiada en directo de los proyectos Narjiss.',
          'consigne' => 'Abra el enlace de abajo y escriba este código cuando se le pida:',
          'cta'    => 'Unirse a la visita',
          'aide'   => 'El enlace y el código solo son válidos durante la visita.',
        ],
      ][$langue];

      $corps = '<p>' . $L['intro'] . '</p>'
        . '<p>' . $L['consigne'] . '</p>'
        . '<p style="font-size:30px;font-weight:800;letter-spacing:.22em;color:#0c2340;'
        . 'background:#eef2f7;border-radius:10px;padding:14px 18px;text-align:center;'
        . 'margin:18px 0">' . htmlspecialchars($code) . '</p>'
        . '<p style="font-size:12.5px;color:#8a96ad">' . $L['aide'] . '</p>';

      [$envoye, $info] = nj_mail(
        $email,
        $L['sujet'],
        nj_mail_template($L['titre'], $corps, $L['cta'], $lien, 'client')
      );

      if (!$envoye) {
        error_log('liveguide invite: ' . (string) $info);
        nj_lg_json(['ok' => false, 'error' => 'Envoi impossible pour le moment.'], 502);
      }
      nj_lg_json(['ok' => true, 'destinataire' => $email]);
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
