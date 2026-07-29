<?php
/**
 * api/agents-lib.php — cœur métier « agents commerciaux » du bureau de vente.
 *
 * Porte l'équivalent narjiss du système twins3d (users + presence +
 * access_requests), mais sur la stack existante du site : PHP + MySQL (PDO,
 * voir api/db.php) au lieu de FastAPI + SQLite.
 *
 * Trois tables, créées à la volée (idempotent), à côté de la table `fiches` :
 *   - agents            : commerciaux et gestionnaires (inscription + login)
 *   - agent_presence    : battement de présence + statut manuel réglable
 *   - access_requests   : demandes d'accès visiteur → code à 4 chiffres
 *
 * Un compte s'inscrit « en attente » (pending) : il doit être validé par un
 * gestionnaire ou l'admin avant de pouvoir se connecter. Voir admin/agents.php
 * et l'action « validate » de agent-auth.php.
 *
 * Les fonctions ne dépendent d'aucune session : les endpoints décident
 * eux-mêmes ce qui exige une session agent (tableau de bord) et ce qui reste
 * ouvert (appels serveur-à-serveur de l'hôtesse IA, saisie de code visiteur).
 */

require_once __DIR__ . '/db.php';

/** Fenêtre (secondes) au-delà de laquelle un agent est considéré hors ligne. */
const NJ_PRESENCE_TTL = 20;

/** Statuts manuels qu'un commercial peut afficher. */
const NJ_PRESENCE_STATES = ['bureau', 'en_ligne', 'occupe', 'absent'];

/**
 * Connexion PDO + garantie que le schéma « agents » existe.
 * S'appuie sur nj_db() (crée la base + la table fiches au besoin).
 */
function nj_adb(): PDO {
  static $ready = false;
  $pdo = nj_db();
  if ($ready) return $pdo;

  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS agents (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('commercial','gestionnaire') NOT NULL DEFAULT 'commercial',
  projet        VARCHAR(64)  NOT NULL DEFAULT '',
  statut        ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  telephone     VARCHAR(40)  NOT NULL DEFAULT '',
  whatsapp      VARCHAR(40)  NOT NULL DEFAULT '',
  created_at    DATETIME     NOT NULL,
  UNIQUE KEY uniq_email (email),
  INDEX idx_projet (projet),
  INDEX idx_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS agent_presence (
  agent_id  INT UNSIGNED NOT NULL PRIMARY KEY,
  last_seen DATETIME NOT NULL,
  presence  ENUM('bureau','en_ligne','occupe','absent') NOT NULL DEFAULT 'en_ligne',
  CONSTRAINT fk_presence_agent FOREIGN KEY (agent_id)
    REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS access_requests (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  visitor    VARCHAR(120) NOT NULL,
  agent_id   INT UNSIGNED NOT NULL,
  projet     VARCHAR(64)  NOT NULL DEFAULT '',
  statut     ENUM('pending','approved','denied') NOT NULL DEFAULT 'pending',
  code       VARCHAR(8)   NOT NULL DEFAULT '',
  room       VARCHAR(80)  NOT NULL DEFAULT '',
  created_at DATETIME     NOT NULL,
  INDEX idx_agent (agent_id),
  INDEX idx_code (code),
  INDEX idx_statut (statut),
  CONSTRAINT fk_request_agent FOREIGN KEY (agent_id)
    REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  // Évolution du schéma : rôle « superviseur » (accès à tous les bureaux).
  // MODIFY est idempotent — sûr même si la colonne a déjà la bonne définition.
  try {
    $pdo->exec("ALTER TABLE agents MODIFY COLUMN role "
             . "ENUM('commercial','gestionnaire','superviseur') NOT NULL DEFAULT 'commercial'");
  } catch (Throwable $e) { /* déjà à jour */ }

  $ready = true;
  return $pdo;
}

/* ── Comptes agents ──────────────────────────────────────────────────────── */

/** Expose un agent sans le hash de mot de passe (pour JSON / session). */
function nj_agent_public(array $a): array {
  return [
    'id'        => (int)$a['id'],
    'name'      => $a['name'],
    'email'     => $a['email'],
    'role'      => $a['role'],
    'projet'    => $a['projet'],
    'statut'    => $a['statut'],
    'telephone' => $a['telephone'] ?? '',
    'whatsapp'  => $a['whatsapp'] ?? '',
  ];
}

function nj_agent_by_email(string $email): ?array {
  $st = nj_adb()->prepare('SELECT * FROM agents WHERE email = ? LIMIT 1');
  $st->execute([strtolower(trim($email))]);
  $r = $st->fetch();
  return $r ?: null;
}

function nj_agent_by_id(int $id): ?array {
  $st = nj_adb()->prepare('SELECT * FROM agents WHERE id = ? LIMIT 1');
  $st->execute([$id]);
  $r = $st->fetch();
  return $r ?: null;
}

/**
 * Crée un compte « en attente » (pending).
 * @return int id du nouvel agent
 * @throws RuntimeException si l'e-mail existe déjà
 */
function nj_agent_create(string $name, string $email, string $password,
                         string $role, string $projet,
                         string $telephone = '', string $whatsapp = ''): int {
  $email = strtolower(trim($email));
  $role  = in_array($role, ['commercial', 'gestionnaire', 'superviseur'], true) ? $role : 'commercial';
  if (nj_agent_by_email($email)) {
    throw new RuntimeException('Un compte existe déjà avec cet e-mail.');
  }
  $st = nj_adb()->prepare(
    'INSERT INTO agents (name, email, password_hash, role, projet, telephone, whatsapp, statut, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, "pending", ?)'
  );
  $st->execute([
    mb_substr(trim($name), 0, 120) ?: 'Agent',
    $email,
    password_hash($password, PASSWORD_DEFAULT),
    $role,
    preg_replace('/[^a-z0-9_]/', '', strtolower($projet)),
    mb_substr(trim($telephone), 0, 40),
    mb_substr(trim($whatsapp), 0, 40),
    date('Y-m-d H:i:s'),
  ]);
  return (int)nj_adb()->lastInsertId();
}

/** Vérifie identifiants + statut actif. @return array|null l'agent si OK. */
function nj_agent_login(string $email, string $password): ?array {
  $a = nj_agent_by_email($email);
  if (!$a || !password_verify($password, $a['password_hash'])) return null;
  if ($a['statut'] !== 'active') return null;
  return $a;
}

/** Passe un compte à un statut donné (validation / suspension). */
function nj_agent_set_status(int $id, string $statut): bool {
  if (!in_array($statut, ['pending', 'active', 'suspended'], true)) return false;
  $st = nj_adb()->prepare('UPDATE agents SET statut = ? WHERE id = ?');
  $st->execute([$statut, $id]);
  return $st->rowCount() > 0;
}

/**
 * Change le rôle d'un compte. Un superviseur n'est rattaché à aucun bureau
 * (projet = '') : il couvre tous les projets ; on remet donc projet à vide.
 */
function nj_agent_set_role(int $id, string $role): bool {
  if (!in_array($role, ['commercial', 'gestionnaire', 'superviseur'], true)) return false;
  if ($role === 'superviseur') {
    $st = nj_adb()->prepare('UPDATE agents SET role = ?, projet = "" WHERE id = ?');
    $st->execute([$role, $id]);
  } else {
    $st = nj_adb()->prepare('UPDATE agents SET role = ? WHERE id = ?');
    $st->execute([$role, $id]);
  }
  return $st->rowCount() > 0;
}

/** Liste des agents (optionnellement filtrés par projet et/ou statut). */
function nj_agents_list(string $projet = '', string $statut = ''): array {
  $sql = 'SELECT * FROM agents';
  $where = [];
  $args = [];
  if ($projet !== '') { $where[] = 'projet = ?'; $args[] = preg_replace('/[^a-z0-9_]/', '', strtolower($projet)); }
  if ($statut !== '') { $where[] = 'statut = ?'; $args[] = $statut; }
  if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
  $sql .= ' ORDER BY name';
  $st = nj_adb()->prepare($sql);
  $st->execute($args);
  return array_map('nj_agent_public', $st->fetchAll());
}

/* ── Présence ────────────────────────────────────────────────────────────── */

/** Battement de présence ; met à jour le statut manuel si fourni. */
function nj_agent_touch(int $agentId, ?string $presence = null): void {
  if ($presence !== null && !in_array($presence, NJ_PRESENCE_STATES, true)) $presence = null;
  if ($presence === null) {
    $st = nj_adb()->prepare(
      'INSERT INTO agent_presence (agent_id, last_seen, presence)
       VALUES (?, ?, "en_ligne")
       ON DUPLICATE KEY UPDATE last_seen = VALUES(last_seen)'
    );
    $st->execute([$agentId, date('Y-m-d H:i:s')]);
  } else {
    $st = nj_adb()->prepare(
      'INSERT INTO agent_presence (agent_id, last_seen, presence)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seen = VALUES(last_seen), presence = VALUES(presence)'
    );
    $st->execute([$agentId, date('Y-m-d H:i:s'), $presence]);
  }
}

/** Un agent est-il en ligne (battement récent) ? */
function nj_agent_is_online(int $agentId): bool {
  $st = nj_adb()->prepare('SELECT last_seen FROM agent_presence WHERE agent_id = ?');
  $st->execute([$agentId]);
  $r = $st->fetch();
  if (!$r) return false;
  return (time() - strtotime($r['last_seen'])) <= NJ_PRESENCE_TTL;
}

/**
 * Roster de présence d'un projet : agents actifs + état en ligne/statut.
 * Utilisé par la page visiteur et par l'hôtesse IA.
 */
function nj_presence_roster(string $projet): array {
  $projet = preg_replace('/[^a-z0-9_]/', '', strtolower($projet));
  // Les commerciaux du bureau + tous les superviseurs (couvrent tous les bureaux).
  $st = nj_adb()->prepare(
    'SELECT a.id, a.name, a.role, a.projet, a.telephone, a.whatsapp,
            p.last_seen, p.presence
       FROM agents a
       LEFT JOIN agent_presence p ON p.agent_id = a.id
      WHERE a.statut = "active"
        AND ( (a.role = "commercial" AND a.projet = ?) OR a.role = "superviseur" )
      ORDER BY a.role = "superviseur" DESC, a.name'
  );
  $st->execute([$projet]);
  $out = [];
  foreach ($st->fetchAll() as $r) {
    $online = $r['last_seen'] && (time() - strtotime($r['last_seen'])) <= NJ_PRESENCE_TTL;
    $out[] = [
      'id'        => (int)$r['id'],
      'name'      => $r['name'],
      'role'      => $r['role'],
      'online'    => $online,
      // Hors ligne : le statut manuel n'a plus de sens, on force « absent ».
      'presence'  => $online ? ($r['presence'] ?: 'en_ligne') : 'absent',
      'telephone' => $r['telephone'],
      'whatsapp'  => $r['whatsapp'],
    ];
  }
  return $out;
}

/**
 * Résout le commercial cible d'une demande, dans un projet donné.
 * - si un nom est fourni : premier commercial actif dont le nom correspond ;
 * - sinon : premier commercial actif EN LIGNE du projet (repli : n'importe lequel).
 * @return array|null l'agent (ligne brute) ou null
 */
function nj_resolve_commercial(string $projet, string $name = ''): ?array {
  $projet = preg_replace('/[^a-z0-9_]/', '', strtolower($projet));
  // Commerciaux du bureau + superviseurs (joignables partout). Superviseurs en
  // dernier : un commercial dédié au bureau est prioritaire à nom égal.
  $st = nj_adb()->prepare(
    'SELECT * FROM agents
      WHERE statut = "active"
        AND ( (role = "commercial" AND projet = ?) OR role = "superviseur" )
      ORDER BY role = "superviseur", name'
  );
  $st->execute([$projet]);
  $agents = $st->fetchAll();
  if (!$agents) return null;

  $needle = mb_strtolower(trim($name));
  if ($needle !== '') {
    foreach ($agents as $a) {
      $hay = mb_strtolower($a['name']);
      // Correspondance sur le prénom ou toute sous-chaîne du nom.
      if (mb_strpos($hay, $needle) !== false || mb_strpos($needle, mb_strtolower(explode(' ', $a['name'])[0])) !== false) {
        return $a;
      }
    }
    return null; // nom fourni mais introuvable
  }

  foreach ($agents as $a) {
    if (nj_agent_is_online((int)$a['id'])) return $a;
  }
  return $agents[0];
}

/* ── Demandes d'accès + code ─────────────────────────────────────────────── */

function nj_access_create(string $visitor, int $agentId, string $projet): int {
  $st = nj_adb()->prepare(
    'INSERT INTO access_requests (visitor, agent_id, projet, statut, created_at)
     VALUES (?, ?, ?, "pending", ?)'
  );
  $st->execute([
    mb_substr(trim($visitor), 0, 120) ?: 'Visiteur',
    $agentId,
    preg_replace('/[^a-z0-9_]/', '', strtolower($projet)),
    date('Y-m-d H:i:s'),
  ]);
  return (int)nj_adb()->lastInsertId();
}

/** Demandes en attente pour un commercial (pour son tableau de bord). */
function nj_access_pending_for(int $agentId): array {
  $st = nj_adb()->prepare(
    'SELECT id, visitor, projet, created_at
       FROM access_requests
      WHERE agent_id = ? AND statut = "pending"
      ORDER BY id'
  );
  $st->execute([$agentId]);
  return $st->fetchAll();
}

/**
 * Approuve une demande : génère un code à 4 chiffres + une room LiveKit
 * directe (visiteur ↔ commercial). @return array|null {code, room} ou null.
 */
function nj_access_approve(int $reqId, int $agentId): ?array {
  $code = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
  $room = 'direct-req-' . $reqId;
  $st = nj_adb()->prepare(
    'UPDATE access_requests SET statut = "approved", code = ?, room = ?
      WHERE id = ? AND agent_id = ? AND statut = "pending"'
  );
  $st->execute([$code, $room, $reqId, $agentId]);
  return $st->rowCount() ? ['code' => $code, 'room' => $room] : null;
}

function nj_access_deny(int $reqId, int $agentId): bool {
  $st = nj_adb()->prepare(
    'UPDATE access_requests SET statut = "denied"
      WHERE id = ? AND agent_id = ? AND statut = "pending"'
  );
  $st->execute([$reqId, $agentId]);
  return $st->rowCount() > 0;
}

/** Vérifie un code visiteur. @return array|null la demande approuvée + agent. */
function nj_access_verify(string $code): ?array {
  $code = preg_replace('/\D/', '', $code);
  if (strlen($code) !== 4) return null;
  $st = nj_adb()->prepare(
    'SELECT r.*, a.name AS agent_name, a.telephone AS agent_tel, a.whatsapp AS agent_whatsapp
       FROM access_requests r
       JOIN agents a ON a.id = r.agent_id
      WHERE r.code = ? AND r.statut = "approved"
      ORDER BY r.id DESC LIMIT 1'
  );
  $st->execute([$code]);
  $r = $st->fetch();
  return $r ?: null;
}

/** Dernière demande d'un visiteur dans un projet (pour que l'IA relise le code). */
function nj_access_latest_for_visitor(string $projet, string $visitor): ?array {
  $projet  = preg_replace('/[^a-z0-9_]/', '', strtolower($projet));
  $needle  = mb_strtolower(trim($visitor));
  $st = nj_adb()->prepare(
    'SELECT r.*, a.name AS agent_name
       FROM access_requests r
       JOIN agents a ON a.id = r.agent_id
      WHERE r.projet = ? AND LOWER(r.visitor) LIKE ?
      ORDER BY r.id DESC LIMIT 1'
  );
  $st->execute([$projet, '%' . $needle . '%']);
  $r = $st->fetch();
  if ($r) return $r;
  // Repli : la dernière demande du projet, quel que soit le nom.
  $st = nj_adb()->prepare(
    'SELECT r.*, a.name AS agent_name
       FROM access_requests r JOIN agents a ON a.id = r.agent_id
      WHERE r.projet = ? ORDER BY r.id DESC LIMIT 1'
  );
  $st->execute([$projet]);
  $r = $st->fetch();
  return $r ?: null;
}

/* ── Session « espace agent » ────────────────────────────────────────────── */

function nj_agent_session_start(): void {
  if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('NJAGENT');
    session_start();
  }
}

/** Agent connecté (rafraîchi depuis la base), ou null. */
function nj_agent_current(): ?array {
  nj_agent_session_start();
  $id = $_SESSION['nj_agent_id'] ?? null;
  if (!$id) return null;
  $a = nj_agent_by_id((int)$id);
  if (!$a || $a['statut'] !== 'active') { unset($_SESSION['nj_agent_id']); return null; }
  return $a;
}

/** Impose une session agent, sinon 401 JSON. @return array l'agent. */
function nj_agent_require_json(): array {
  $a = nj_agent_current();
  if (!$a) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Non connecté.']);
    exit;
  }
  return $a;
}
