<?php
/**
 * api/agent-auth.php — inscription / connexion des agents commerciaux et
 * gestionnaires de bureau de vente.
 *
 * Actions (paramètre ?action=, corps POST) :
 *   register  : crée un compte « en attente » de validation
 *   login     : ouvre une session agent (compte actif uniquement)
 *   logout    : ferme la session
 *   me        : renvoie l'agent connecté (ou null)
 *   pending   : [gestionnaire] liste les comptes en attente de son projet
 *   team      : [gestionnaire] liste les agents de son projet
 *   validate  : [gestionnaire] active / suspend un agent de son projet
 *
 * L'inscription est ouverte mais sans effet tant qu'un gestionnaire ou l'admin
 * (admin/agents.php) n'a pas validé le compte.
 */

require __DIR__ . '/agents-lib.php';
require_once __DIR__ . '/data.php';

/* Nom de session par défaut (celui de l'admin), relevé AVANT que la session
   agent — qui s'appelle NJAGENT — ne prenne la main. Voir nj_admin_connecte(). */
$njSessionDefaut = session_name();

nj_agent_session_start();
header('Content-Type: application/json; charset=utf-8');

/* Chaque erreur porte un CODE en plus de sa phrase.
   L'espace commercial parle quatre langues (espace-agent-i18n.js) : sans code,
   un agent arabophone lisait « Compte suspendu… » en français au moment le plus
   ingrat, celui où il n'entre pas. Le texte français reste dans la réponse :
   il sert de repli à tout client qui ne connaîtrait pas le code. */

/** Réponse JSON + fin. */
function nj_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$post   = $_SERVER['REQUEST_METHOD'] === 'POST';

try {
  switch ($action) {

    /* « Qui suis-je ? » — l'entrée profil du menu principal s'appuie dessus, sur
       toutes les pages du site. D'où la branche admin : sans elle, l'admin du
       back-office recevait `agent: null` et le site le traitait en anonyme,
       alors qu'il est bel et bien connecté. Deux espaces, deux sessions, mais
       une seule question posée par le menu. */
    case 'me':
      $a = nj_agent_current();
      if ($a) nj_json(['ok' => true, 'agent' => nj_agent_public($a), 'admin' => false]);
      if (nj_admin_connecte($njSessionDefaut)) {
        nj_json(['ok' => true, 'admin' => true, 'agent' => null, 'name' => 'admin']);
      }
      nj_json(['ok' => true, 'agent' => null, 'admin' => false]);

    case 'register':
      if (!$post) nj_json(['ok' => false, 'error' => 'POST requis.', 'code' => 'post'], 405);
      $name   = trim($_POST['name'] ?? '');
      $email  = trim($_POST['email'] ?? '');
      $pass   = (string)($_POST['password'] ?? '');
      // Auto-inscription limitée à commercial / gestionnaire : le rôle superviseur
      // (accès tous bureaux) est attribué par l'admin ou un superviseur existant.
      $role   = in_array(($_POST['role'] ?? ''), ['commercial', 'gestionnaire'], true) ? $_POST['role'] : 'commercial';
      $projet = $_POST['projet'] ?? '';
      $tel    = trim($_POST['telephone'] ?? '');
      $wa     = trim($_POST['whatsapp'] ?? '');

      if ($name === '' || strpos($email, '@') === false || strlen($pass) < 6) {
        nj_json(['ok' => false, 'error' => 'Nom, e-mail valide et mot de passe (6 caractères min.) requis.', 'code' => 'champsInscription'], 400);
      }
      $projets = nj_projects();
      $projetKey = preg_replace('/[^a-z0-9_]/', '', strtolower($projet));
      // Un commercial doit être rattaché à un bureau ; un gestionnaire peut l'être.
      if ($role === 'commercial' && ($projetKey === '' || !isset($projets[$projetKey]))) {
        nj_json(['ok' => false, 'error' => 'Bureau de vente (projet) inconnu.', 'code' => 'projetInconnu'], 400);
      }
      if ($projetKey !== '' && !isset($projets[$projetKey])) $projetKey = '';

      $id = nj_agent_create($name, $email, $pass, $role, $projetKey, $tel, $wa);
      nj_json([
        'ok'      => true,
        'id'      => $id,
        'statut'  => 'pending',
        'message' => 'Compte créé. Il sera actif dès qu\'un gestionnaire ou l\'administrateur l\'aura validé.',
      ]);

    case 'login':
      if (!$post) nj_json(['ok' => false, 'error' => 'POST requis.', 'code' => 'post'], 405);
      $email = trim($_POST['email'] ?? '');
      $pass  = (string)($_POST['password'] ?? '');
      $a = nj_agent_login($email, $pass);
      if (!$a) {
        // Message distinct si le compte existe mais n'est pas encore validé.
        $exists = nj_agent_by_email($email);
        if ($exists && $exists['statut'] === 'pending' && password_verify($pass, $exists['password_hash'])) {
          nj_json(['ok' => false, 'error' => 'Compte en attente de validation par un gestionnaire.', 'code' => 'attenteValidation'], 403);
        }
        if ($exists && $exists['statut'] === 'suspended' && password_verify($pass, $exists['password_hash'])) {
          nj_json(['ok' => false, 'error' => 'Compte suspendu. Contactez votre gestionnaire.', 'code' => 'suspendu'], 403);
        }
        nj_json(['ok' => false, 'error' => 'E-mail ou mot de passe incorrect.', 'code' => 'identifiants'], 401);
      }
      session_regenerate_id(true);
      $_SESSION['nj_agent_id'] = (int)$a['id'];
      nj_agent_touch((int)$a['id']); // marque en ligne dès la connexion
      nj_json(['ok' => true, 'agent' => nj_agent_public($a)]);

    case 'logout':
      $_SESSION = [];
      if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], (bool)$p['secure'], (bool)$p['httponly']);
      }
      session_destroy();
      nj_json(['ok' => true]);

    case 'pending':
    case 'team':
      $me = nj_agent_require_json();
      if (!in_array($me['role'], ['gestionnaire', 'superviseur'], true)) {
        nj_json(['ok' => false, 'error' => 'Réservé aux gestionnaires et superviseurs.', 'code' => 'reserveGestionnaires'], 403);
      }
      // Superviseur : tous les bureaux. Gestionnaire : son bureau (ou tout si non rattaché).
      $scopeProjet = $me['role'] === 'superviseur' ? '' : ($me['projet'] ?? '');
      $statut = $action === 'pending' ? 'pending' : '';
      nj_json(['ok' => true, 'agents' => nj_agents_list($scopeProjet, $statut)]);

    case 'validate':
      if (!$post) nj_json(['ok' => false, 'error' => 'POST requis.', 'code' => 'post'], 405);
      $me = nj_agent_require_json();
      if (!in_array($me['role'], ['gestionnaire', 'superviseur'], true)) {
        nj_json(['ok' => false, 'error' => 'Réservé aux gestionnaires et superviseurs.', 'code' => 'reserveGestionnaires'], 403);
      }
      $targetId = (int)($_POST['agent_id'] ?? 0);
      $statut   = $_POST['statut'] ?? 'active';
      $target = nj_agent_by_id($targetId);
      if (!$target) nj_json(['ok' => false, 'error' => 'Agent introuvable.', 'code' => 'agentIntrouvable'], 404);
      $isSuper = $me['role'] === 'superviseur';
      // Un gestionnaire de projet ne valide que les agents de son propre bureau ;
      // un superviseur valide dans tous les bureaux.
      if (!$isSuper && ($me['projet'] ?? '') !== '' && $target['projet'] !== $me['projet']) {
        nj_json(['ok' => false, 'error' => 'Cet agent dépend d\'un autre bureau.', 'code' => 'autreBureau'], 403);
      }
      // Un gestionnaire ne valide pas un gestionnaire ; personne (hors admin) ne
      // valide un superviseur — l'élévation en superviseur reste réservée à l'admin.
      if ($target['role'] === 'superviseur' && $targetId !== (int)$me['id']) {
        nj_json(['ok' => false, 'error' => 'La gestion d\'un superviseur relève de l\'administrateur.', 'code' => 'gestionSuperviseur'], 403);
      }
      if (!$isSuper && $target['role'] === 'gestionnaire' && $targetId !== (int)$me['id']) {
        nj_json(['ok' => false, 'error' => 'La validation d\'un gestionnaire relève d\'un superviseur ou de l\'administrateur.', 'code' => 'validationGestionnaire'], 403);
      }
      nj_agent_set_status($targetId, $statut);
      nj_json(['ok' => true, 'agent_id' => $targetId, 'statut' => $statut]);

    default:
      nj_json(['ok' => false, 'error' => 'Action inconnue.', 'code' => 'action'], 400);
  }
} catch (RuntimeException $e) {
  nj_json(['ok' => false, 'error' => $e->getMessage()], 409);
} catch (Throwable $e) {
  nj_json(['ok' => false, 'error' => 'Erreur serveur.', 'code' => 'serveur'], 500);
}
