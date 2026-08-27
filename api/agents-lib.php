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

  // Un agent peut couvrir plusieurs bureaux : la colonne porte alors une liste
  // séparée par des virgules. 64 caractères n'y suffisaient plus.
  try {
    $pdo->exec("ALTER TABLE agents MODIFY COLUMN projet VARCHAR(255) NOT NULL DEFAULT ''");
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
    // Un ou plusieurs bureaux ; vide = tous (voir nj_agent_projets).
    nj_agent_projets_texte(explode(',', $projet)),
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

/**
 * Supprime définitivement un compte.
 *
 * Sa présence et ses demandes d'accès partent avec lui (ON DELETE CASCADE).
 * L'historique des messages, lui, RESTE : le journal des suites données porte
 * le nom de l'agent en clair (agent_nom) et n'a pas de clé étrangère vers
 * agents — on ne perd donc pas la trace de qui a rappelé qui.
 *
 * Préférer la suspension quand le compte peut resservir : la suppression est
 * sans retour, et l'e-mail redevient disponible pour une nouvelle inscription.
 */
function nj_agent_delete(int $id): bool {
  $st = nj_adb()->prepare('DELETE FROM agents WHERE id = ?');
  $st->execute([$id]);
  return $st->rowCount() > 0;
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

/**
 * Bureaux couverts par un agent.
 *
 * La colonne `projet` porte trois cas, sans changer de schéma :
 *   ''                    → TOUS les bureaux (cas historique du superviseur) ;
 *   'jawhara'             → un seul bureau ;
 *   'jawhara,tazroute'    → une sélection.
 *
 * Retourne la liste ; un tableau vide signifie « tous ».
 */
function nj_agent_projets(?string $valeur): array {
  $valeur = trim((string) $valeur);
  if ($valeur === '') return [];
  $ids = array_filter(array_map(
    static fn($p) => preg_replace('/[^a-z0-9_]/', '', strtolower(trim($p))),
    explode(',', $valeur)
  ));
  return array_values(array_unique($ids));
}

/** Cet agent couvre-t-il ce bureau ? (liste vide = tous les bureaux) */
function nj_agent_couvre(?string $valeur, string $projet): bool {
  $ids = nj_agent_projets($valeur);
  return !$ids || in_array(strtolower($projet), $ids, true);
}

/** Normalise une saisie (liste, ou vide pour « tous ») avant écriture. */
function nj_agent_projets_texte(array $ids): string {
  require_once __DIR__ . '/data.php';
  $valides = array_keys(nj_projects());
  $ids = array_values(array_intersect(nj_agent_projets(implode(',', $ids)), $valides));
  return implode(',', $ids);
}

/**
 * Clause SQL « cet agent couvre le bureau demandé », pour les requêtes qui
 * filtrent par projet. Un agent « tous bureaux » (projet vide) passe toujours.
 */
const NJ_AGENT_COUVRE_SQL = '(projet = "" OR FIND_IN_SET(?, projet))';

/** Liste des agents (optionnellement filtrés par projet et/ou statut). */
function nj_agents_list(string $projet = '', string $statut = ''): array {
  $sql = 'SELECT * FROM agents';
  $where = [];
  $args = [];
  if ($projet !== '') { $where[] = NJ_AGENT_COUVRE_SQL; $args[] = preg_replace('/[^a-z0-9_]/', '', strtolower($projet)); }
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

/* ===========================================================================
   PRÉSENCE SIMULÉE — pour les démonstrations
   ---------------------------------------------------------------------------
   Montrer le site à un promoteur suppose des conseillers en ligne. Or on ne
   peut pas demander à cinq commerciaux de rester connectés pendant la
   présentation : le gestionnaire coche donc, depuis « Mon équipe », qui doit
   apparaître joignable.

   DANS UN FICHIER ET NON EN BASE : aucune migration à jouer sur le VPS avant
   une démo, et la simulation s'efface d'un coup en supprimant le fichier. Elle
   ne peut pas non plus abîmer les vraies données de présence, qu'elle ne
   touche jamais.

   AVEC UNE ÉCHÉANCE ET NON UN SIMPLE OUI/NON : une case laissée cochée ferait
   mentir le site à de vrais visiteurs, indéfiniment. On promettrait un
   conseiller joignable là où personne ne décroche — pire que de n'avoir rien
   promis. L'échéance fait que l'oubli se répare tout seul.
   =========================================================================== */
const NJ_DEMO_PRESENCE_FICHIER = __DIR__ . '/../data/presence-demo.json';
const NJ_DEMO_PRESENCE_MAX_MIN = 480;          // 8 h : au-delà, ce n'est plus une démo

/**
 * État brut de la simulation : les identifiants cochés et l'échéance.
 * Rend des listes vides quand rien n'est en cours ou que l'échéance est passée.
 */
function nj_demo_presence_etat(): array {
  $vide = ['agents' => [], 'expire' => null, 'restant_min' => 0];
  if (!is_file(NJ_DEMO_PRESENCE_FICHIER)) return $vide;

  $brut = @file_get_contents(NJ_DEMO_PRESENCE_FICHIER);
  $data = $brut === false ? null : json_decode($brut, true);
  if (!is_array($data) || empty($data['expire'])) return $vide;

  $fin = strtotime((string)$data['expire']);
  if ($fin === false || $fin <= time()) return $vide;   // échéance passée : plus rien

  $ids = [];
  foreach ((array)($data['agents'] ?? []) as $id) {
    $id = (int)$id;
    if ($id > 0) $ids[] = $id;
  }
  return [
    'agents'      => array_values(array_unique($ids)),
    'expire'      => date('c', $fin),
    'restant_min' => (int)ceil(($fin - time()) / 60),
  ];
}

/** Les seuls identifiants à faire passer pour connectés, à cet instant. */
function nj_demo_presence_ids(): array {
  return nj_demo_presence_etat()['agents'];
}

/**
 * Enregistre la simulation. Une liste vide (ou zéro minute) l'arrête net, en
 * supprimant le fichier : il ne reste aucune trace à oublier.
 */
function nj_demo_presence_ecrire(array $ids, int $minutes): array {
  $propres = [];
  foreach ($ids as $id) {
    $id = (int)$id;
    if ($id > 0) $propres[] = $id;
  }
  $propres = array_values(array_unique($propres));
  $minutes = max(0, min($minutes, NJ_DEMO_PRESENCE_MAX_MIN));

  if (!$propres || $minutes === 0) {
    @unlink(NJ_DEMO_PRESENCE_FICHIER);
    return ['agents' => [], 'expire' => null, 'restant_min' => 0];
  }

  $dir = dirname(NJ_DEMO_PRESENCE_FICHIER);
  if (!is_dir($dir)) @mkdir($dir, 0775, true);
  @file_put_contents(NJ_DEMO_PRESENCE_FICHIER, json_encode([
    '_commentaire' => 'Presence SIMULEE pour une demonstration. Supprimer ce fichier arrete tout.',
    'agents'       => $propres,
    'expire'       => date('c', time() + $minutes * 60),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);

  return nj_demo_presence_etat();
}

/** Un agent est-il en ligne (battement récent, ou présence simulée) ? */
function nj_agent_is_online(int $agentId): bool {
  if (in_array($agentId, nj_demo_presence_ids(), true)) return true;
  $st = nj_adb()->prepare('SELECT last_seen FROM agent_presence WHERE agent_id = ?');
  $st->execute([$agentId]);
  $r = $st->fetch();
  if (!$r) return false;
  return (time() - strtotime($r['last_seen'])) <= NJ_PRESENCE_TTL;
}

/**
 * Quelqu'un décroche-t-il, tous bureaux confondus ?
 *
 * Agrégat DÉLIBÉRÉMENT anonyme. Ce compte est lu par le lanceur « On en
 * parle ? » posé sur toutes les pages publiques, donc sans session : rendre le
 * roster nominatif y dirait à n'importe qui combien de personnes travaillent
 * ici et à quelle heure elles décrochent — exactement ce que refuse la note du
 * roster ?projet= dans api/agent-presence.php. On ne rend qu'un nombre.
 *
 * Le « absent » posé à la main compte comme hors ligne : un commercial dont le
 * navigateur bat encore mais qui s'est déclaré absent ne doit pas faire
 * promettre au visiteur une réponse immédiate.
 */
function nj_presence_globale(): array {
  // Comparaison en PHP et non en SQL, comme nj_presence_roster() : PHP et
  // MySQL ne partagent pas forcément le même fuseau, et un décalage d'une
  // heure ferait ici passer toute l'équipe pour joignable — ou l'inverse.
  /* LEFT JOIN et non JOIN : un commercial coché pour une démonstration peut
     n'avoir jamais ouvert son espace, donc n'avoir aucune ligne de présence.
     Avec une jointure stricte il serait resté invisible ici alors qu'il
     apparaît en ligne partout ailleurs — le lanceur aurait annoncé « personne
     au bureau » pendant que le bureau affichait trois conseillers. */
  $st = nj_adb()->query(
    'SELECT a.id, p.last_seen, p.presence
       FROM agents a
       LEFT JOIN agent_presence p ON p.agent_id = a.id
      WHERE a.statut = "active"
        AND a.role IN ("commercial", "superviseur")'
  );
  $demo = nj_demo_presence_ids();
  $n = 0;
  foreach ($st->fetchAll() as $r) {
    if (in_array((int)$r['id'], $demo, true)) { $n++; continue; }
    if (!$r['last_seen']) continue;
    if ((time() - strtotime($r['last_seen'])) > NJ_PRESENCE_TTL) continue;
    if (($r['presence'] ?? '') === 'absent') continue;
    $n++;
  }
  return ['online' => $n > 0, 'count' => $n];
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
        AND ( (a.role = "commercial" AND (a.projet = "" OR FIND_IN_SET(?, a.projet))) OR a.role = "superviseur" )
      ORDER BY a.role = "superviseur" DESC, a.name'
  );
  $st->execute([$projet]);
  $demo = nj_demo_presence_ids();
  $out = [];
  foreach ($st->fetchAll() as $r) {
    $simule = in_array((int)$r['id'], $demo, true);
    $online = $simule || ($r['last_seen'] && (time() - strtotime($r['last_seen'])) <= NJ_PRESENCE_TTL);
    $out[] = [
      'id'        => (int)$r['id'],
      'name'      => $r['name'],
      'role'      => $r['role'],
      'online'    => $online,
      // Hors ligne : le statut manuel n'a plus de sens, on force « absent ».
      // Simulé : on ignore le statut manuel, qui daterait de la dernière vraie
      // connexion — un « occupé » oublié ferait fuir le visiteur en pleine démo.
      'presence'  => $online ? ($simule ? 'en_ligne' : ($r['presence'] ?: 'en_ligne')) : 'absent',
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
        AND ( (role = "commercial" AND (projet = "" OR FIND_IN_SET(?, projet))) OR role = "superviseur" )
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
  $visitorPropre = mb_substr(trim($visitor), 0, 120) ?: 'Visiteur';
  $projetPropre  = preg_replace('/[^a-z0-9_]/', '', strtolower($projet));

  /* Une demande identique et récente est REPRISE au lieu d'en créer une autre.
     Depuis que les puces de présence sont cliquables, un visiteur impatient
     peut cliquer cinq fois de suite sur le même conseiller : sans ce garde-fou
     il ferait sonner cinq notifications pour une seule envie de parler, et le
     commercial devrait en refuser quatre. Une minute suffit à couvrir
     l'impatience sans empêcher de redemander après un refus. */
  $st = nj_adb()->prepare(
    'SELECT id FROM access_requests
      WHERE visitor = ? AND agent_id = ? AND projet = ? AND statut = "pending"
        AND created_at >= ?
      ORDER BY id DESC LIMIT 1'
  );
  $st->execute([$visitorPropre, $agentId, $projetPropre, date('Y-m-d H:i:s', time() - 60)]);
  $existante = $st->fetch();
  if ($existante) return (int)$existante['id'];

  $st = nj_adb()->prepare(
    'INSERT INTO access_requests (visitor, agent_id, projet, statut, created_at)
     VALUES (?, ?, ?, "pending", ?)'
  );
  // Les MÊMES valeurs que la recherche ci-dessus : si les deux normalisaient
  // chacune de leur côté, la moindre divergence rendrait la reprise inopérante
  // sans que rien ne le signale.
  $st->execute([$visitorPropre, $agentId, $projetPropre, date('Y-m-d H:i:s')]);
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

/* ── Autorisation « agent OU admin » ─────────────────────────────────────── */

/**
 * L'espace commercial et le back-office admin ont chacun LEUR session, sous des
 * noms différents — `NJAGENT` d'un côté, celui de php.ini de l'autre — et PHP
 * n'en ouvre qu'UNE par requête : lire la seconde impose de refermer la
 * première.
 *
 * D'où le paramètre, qui surprend au premier regard. Le nom de session par
 * défaut doit être relevé AVANT que `nj_agent_current()` n'ouvre `NJAGENT` :
 * après, `session_name()` ne renvoie plus que « NJAGENT » et l'on rouvrirait la
 * mauvaise session — silencieusement, en concluant que l'admin n'est pas
 * connecté. Les appelants le capturent donc en tête de fichier, avant tout
 * appel touchant à la session agent.
 *
 * Attention : au retour, la session agent est REFERMÉE et celle de l'admin est
 * ouverte. À n'appeler qu'après en avoir fini avec l'agent.
 *
 * Ce chemin était écrit à la main dans api/message-audio.php ; il est ici pour
 * ne pas exister en trois exemplaires qui finiraient par diverger.
 */
function nj_admin_connecte(string $nomSessionDefaut): bool {
  // Pas de cookie admin : inutile d'ouvrir quoi que ce soit, et surtout ne pas
  // fermer la session agent pour rien.
  $sid = (string) ($_COOKIE[$nomSessionDefaut] ?? '');
  if ($sid === '') return false;

  if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
  session_name($nomSessionDefaut);

  // LA LIGNE QUI FAIT TOUT LE TRAVAIL. `session_write_close()` referme la
  // session agent mais PHP en GARDE l'identifiant : le `session_start()` qui
  // suit rouvrirait celle-là, pas celle de l'admin. On lirait alors un tableau
  // vide et l'on conclurait que l'admin n'est pas connecté — sans erreur,
  // sans trace, avec un simple « accès refusé » incompréhensible côté écran.
  session_id($sid);

  session_start();
  return ($_SESSION['narjiss_admin'] ?? false) === true;
}

/**
 * Qui pilote cette requête : un agent actif, l'admin, ou personne.
 *
 * @param string $nomSessionDefaut relevé en tête de requête (voir nj_admin_connecte).
 * @return array{type:string,nom:string,agent:?array}|null null si personne.
 */
function nj_agent_ou_admin(string $nomSessionDefaut): ?array {
  $a = nj_agent_current();
  if ($a) return ['type' => 'agent', 'nom' => (string) ($a['name'] ?? ''), 'agent' => $a];
  if (nj_admin_connecte($nomSessionDefaut)) return ['type' => 'admin', 'nom' => 'admin', 'agent' => null];
  return null;
}

/**
 * Présence de TOUTE l'équipe — vue interne de l'espace agent.
 *
 * Volontairement distincte de nj_presence_roster(), et il faut qu'elle le
 * reste : cette dernière alimente la page PUBLIQUE du bureau de vente
 * (bureaudevente.js), où un visiteur voit qui peut lui répondre. Y ajouter les
 * gestionnaires ferait apparaître au public des gens dont ce n'est pas le
 * rôle, et les superviseurs de tous les bureaux avec eux. Deux besoins
 * différents, deux requêtes différentes.
 *
 * Ici, au contraire : tous les comptes actifs, quel que soit le rôle ou le
 * bureau, avec leur identifiant — pour que l'appariement côté client se fasse
 * sur l'id et non sur le nom affiché, que deux homonymes suffiraient à
 * confondre.
 */
function nj_presence_equipe(): array {
  $st = nj_adb()->query(
    'SELECT a.id, a.name, a.role, a.projet, p.last_seen, p.presence
       FROM agents a
       LEFT JOIN agent_presence p ON p.agent_id = a.id
      WHERE a.statut = "active"
      ORDER BY a.name'
  );
  $demo = nj_demo_presence_ids();
  $out = [];
  foreach ($st->fetchAll() as $r) {
    $simule = in_array((int) $r['id'], $demo, true);
    $online = $simule || ($r['last_seen'] && (time() - strtotime($r['last_seen'])) <= NJ_PRESENCE_TTL);
    $out[] = [
      'id'        => (int) $r['id'],
      'name'      => $r['name'],
      'role'      => $r['role'],
      'projet'    => $r['projet'],
      'online'    => $online,
      // Dit à « Mon équipe » de distinguer le vrai du simulé : sans ce drapeau,
      // le gestionnaire ne saurait plus si son équipe est là ou s'il regarde sa
      // propre mise en scène.
      'simule'    => $simule,
      'presence'  => $online ? ($simule ? 'en_ligne' : ($r['presence'] ?: 'en_ligne')) : 'absent',
      'last_seen' => $r['last_seen'],
    ];
  }
  return $out;
}
