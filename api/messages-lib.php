<?php
/**
 * api/messages-lib.php — messagerie des bureaux de vente.
 *
 * Quand aucun commercial n'est joignable, le visiteur d'un bureau de vente
 * laisse un message — vocal, écrit, ou les deux — avec ses coordonnées. Les
 * commerciaux du bureau le traitent depuis leur espace, l'admin garde une vue
 * d'ensemble.
 *
 * ⚠️ RÈGLE CARDINALE (même que les fiches) : les enregistrements sont la voix
 * d'une personne identifiable. Ils ne vivent donc PAS sous htdocs, mais dans
 * le coffre privé C:\xampp\narjiss-prive\messages, servis uniquement par
 * api/message-audio.php après vérification de session.
 *
 * Les tables sont créées à la volée, comme le reste du projet : aucune étape
 * SQL manuelle en développement.
 */
require_once __DIR__ . '/agents-lib.php';
require_once __DIR__ . '/fiche-config.php';   // NJ_PRIVATE_DIR

/** Durée maximale d'un message ; au-delà ce n'est plus un message. */
const NJ_MSG_MAX_DUREE_S = 180;
/** Poids maximal d'un enregistrement. */
const NJ_MSG_MAX_MO = 8;
/** Dépôts autorisés par heure et par adresse IP. */
const NJ_MSG_MAX_PAR_IP_H = 6;
/**
 * Bureau fictif des messages qui ne visent aucun projet précis (formulaire de
 * contact du site). Ils ne sont donc rattachés à aucun commercial : ce sont les
 * gestionnaires, les superviseurs et l'admin qui les voient.
 */
const NJ_MSG_PROJET_GENERAL = 'general';

/** Connexion PDO avec les tables de messagerie prêtes (idempotent). */
function nj_msg_db(): PDO {
  static $ready = false;
  $pdo = nj_adb();               // agents + présence, dont dépend la messagerie
  if ($ready) return $pdo;

  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS messages (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  projet         VARCHAR(64)  NOT NULL,
  canal          ENUM('web','hotesse','sip') NOT NULL DEFAULT 'web',
  visiteur_nom   VARCHAR(120) NOT NULL DEFAULT '',
  telephone      VARCHAR(24)  NOT NULL DEFAULT '',
  telephone_brut VARCHAR(40)  NOT NULL DEFAULT '',
  email          VARCHAR(160) NOT NULL DEFAULT '',
  langue         VARCHAR(8)   NOT NULL DEFAULT 'fr',
  message_texte  MEDIUMTEXT   NULL,
  transcription  MEDIUMTEXT   NULL,
  audio_fichier  VARCHAR(255) NOT NULL DEFAULT '',
  audio_mime     VARCHAR(60)  NOT NULL DEFAULT '',
  duree_s        INT UNSIGNED NOT NULL DEFAULT 0,
  statut         ENUM('nouveau','ecoute','traite','archive') NOT NULL DEFAULT 'nouveau',
  pris_par       INT UNSIGNED NULL,
  pris_nom       VARCHAR(120) NOT NULL DEFAULT '',
  pris_le        DATETIME     NULL,
  notes          MEDIUMTEXT   NULL,
  ip_hash        CHAR(64)     NOT NULL DEFAULT '',
  created_at     DATETIME     NOT NULL,
  INDEX idx_projet (projet, statut),
  INDEX idx_created (created_at),
  INDEX idx_tel (telephone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  // Journal des suites données. La suppression d'un message emporte son
  // journal (ON DELETE CASCADE) ; les fichiers audio, eux, sont retirés du
  // coffre par nj_msg_supprimer().
  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS message_actions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message_id    INT UNSIGNED NOT NULL,
  agent_id      INT UNSIGNED NULL,
  agent_nom     VARCHAR(120) NOT NULL DEFAULT '',
  type          ENUM('rappel','whatsapp','sms','email','vocal','note','statut','prise') NOT NULL,
  detail        TEXT         NULL,
  audio_fichier VARCHAR(255) NOT NULL DEFAULT '',
  audio_mime    VARCHAR(60)  NOT NULL DEFAULT '',
  duree_s       INT UNSIGNED NOT NULL DEFAULT 0,
  jeton         CHAR(32)     NULL,
  created_at    DATETIME     NOT NULL,
  INDEX idx_message (message_id, created_at),
  UNIQUE KEY uniq_jeton (jeton),
  CONSTRAINT fk_action_message FOREIGN KEY (message_id)
    REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  $ready = true;
  return $pdo;
}

/** Libellés des statuts. */
function nj_msg_statuts(): array {
  return ['nouveau' => 'Nouveau', 'ecoute' => 'Écouté', 'traite' => 'Traité', 'archive' => 'Archivé'];
}

/** Nom lisible d'un bureau, avec le cas du renseignement général. */
function nj_msg_projet_nom(string $id): string {
  require_once __DIR__ . '/data.php';
  return $id === NJ_MSG_PROJET_GENERAL ? 'Renseignement général' : nj_project_name($id);
}

/* ── Téléphone ────────────────────────────────────────────────────────────
   Stocké en E.164 dès aujourd'hui : c'est le format des liens wa.me et celui
   qu'enverrait un jour un numéro entrant chez un opérateur.               */

/** « 06 12 34 56 78 » → « +212612345678 ». null si le résultat est implausible. */
function nj_msg_tel_e164(string $brut, string $indicatif = '212'): ?string {
  $brut = trim($brut);
  if ($brut === '') return null;
  $plus = str_starts_with($brut, '+');
  $n = preg_replace('/\D/', '', $brut);
  if ($n === '') return null;

  if (str_starts_with($n, '00'))    $n = substr($n, 2);
  elseif (str_starts_with($n, '0')) $n = $indicatif . substr($n, 1);
  elseif (!$plus && !str_starts_with($n, $indicatif)) $n = $indicatif . $n;

  if (strlen($n) < 8 || strlen($n) > 15) return null;
  return '+' . $n;
}

/** Affichage groupé : +212 612 34 56 78. */
function nj_msg_tel_affiche(string $e164): string {
  $n = preg_replace('/\D/', '', $e164);
  if ($n === '') return '';
  if (str_starts_with($n, '212') && strlen($n) === 12) {
    return '+212 ' . substr($n, 3, 3) . ' ' . substr($n, 6, 2) . ' ' . substr($n, 8, 2) . ' ' . substr($n, 10, 2);
  }
  return '+' . $n;
}

/** Lien WhatsApp (wa.me veut le numéro sans « + »), texte pré-rempli optionnel. */
function nj_msg_lien_whatsapp(string $e164, string $texte = ''): string {
  if ($e164 === '') return '';
  $u = 'https://wa.me/' . preg_replace('/\D/', '', $e164);
  return $texte === '' ? $u : $u . '?text=' . rawurlencode($texte);
}

/* ── Enregistrements audio (coffre privé) ─────────────────────────────── */

/** Dossier des enregistrements, créé au besoin. */
function nj_msg_dir(): string {
  $dir = NJ_PRIVATE_DIR . DIRECTORY_SEPARATOR . 'messages';
  if (!is_dir($dir)) @mkdir($dir, 0775, true);
  return $dir;
}

/**
 * Type réel d'un fichier d'après ses octets d'en-tête.
 * Plus fiable que mime_content_type() pour le WebM/Opus de MediaRecorder, que
 * libmagic annonce tantôt audio/webm, tantôt video/webm.
 * Retourne [mime, extension] ou null si ce n'est pas un audio accepté.
 */
function nj_msg_sniff(string $path): ?array {
  $fh = @fopen($path, 'rb');
  if (!$fh) return null;
  $head = fread($fh, 16);
  fclose($fh);
  if (strlen($head) < 12) return null;

  if (str_starts_with($head, "\x1A\x45\xDF\xA3")) return ['audio/webm', 'webm'];
  if (str_starts_with($head, 'OggS'))             return ['audio/ogg',  'ogg'];
  if (substr($head, 4, 4) === 'ftyp')             return ['audio/mp4',  'm4a'];
  if (str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WAVE') return ['audio/wav', 'wav'];
  if (str_starts_with($head, 'ID3') || (ord($head[0]) === 0xFF && (ord($head[1]) & 0xE0) === 0xE0)) return ['audio/mpeg', 'mp3'];
  return null;
}

/**
 * Range $_FILES[$champ] dans le coffre privé.
 * Retourne ['fichier','mime'] ou null si refusé (absent, trop lourd, pas un audio).
 */
function nj_msg_audio_save(string $champ): ?array {
  if (empty($_FILES[$champ]) || ($_FILES[$champ]['error'] ?? 1) !== UPLOAD_ERR_OK) return null;
  $f = $_FILES[$champ];
  if ($f['size'] <= 0 || $f['size'] > NJ_MSG_MAX_MO * 1024 * 1024) return null;
  if (!is_uploaded_file($f['tmp_name'])) return null;

  $type = nj_msg_sniff($f['tmp_name']);
  if (!$type) return null;
  [$mime, $ext] = $type;

  $nom = date('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
  if (!move_uploaded_file($f['tmp_name'], nj_msg_dir() . DIRECTORY_SEPARATOR . $nom)) return null;
  return ['fichier' => $nom, 'mime' => $mime];
}

/** Chemin absolu d'un enregistrement (basename() : pas de traversée). */
function nj_msg_audio_path(string $fichier): string {
  return nj_msg_dir() . DIRECTORY_SEPARATOR . basename($fichier);
}

/** Retire un enregistrement du coffre (ignore l'absence). */
function nj_msg_audio_delete(string $fichier): void {
  if ($fichier === '') return;
  $p = nj_msg_audio_path($fichier);
  if (is_file($p)) @unlink($p);
}

/**
 * Transcription de l'audio, pour que le commercial lise avant de rappeler.
 * Active dès qu'OPENAI_API_KEY est renseignée dans api/.env (c'est déjà le cas
 * pour l'hôtesse IA). En cas d'échec : null, le message vocal reste écoutable.
 */
function nj_msg_transcrire(string $path, string $langue = 'fr'): ?string {
  $key = trim(nj_config('OPENAI_API_KEY', ''));
  if ($key === '' || !function_exists('curl_init') || !is_file($path)) return null;

  $mime = nj_msg_sniff($path)[0] ?? 'audio/webm';
  $ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $key],
    CURLOPT_POSTFIELDS     => [
      'model'    => 'whisper-1',
      // La darija est transcrite en arabe : c'est le modèle le plus proche.
      'language' => in_array($langue, ['fr', 'en', 'es'], true) ? $langue : 'ar',
      'file'     => new CURLFile($path, $mime, basename($path)),
    ],
  ]);
  $res  = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  if ($code !== 200 || !$res) return null;

  $txt = trim((string)(json_decode($res, true)['text'] ?? ''));
  return $txt === '' ? null : mb_substr($txt, 0, 4000);
}

/* ── Lecture / écriture ───────────────────────────────────────────────── */

/** Un message par son id, ou null. */
function nj_msg_get(int $id): ?array {
  $st = nj_msg_db()->prepare('SELECT * FROM messages WHERE id = ?');
  $st->execute([$id]);
  return $st->fetch() ?: null;
}

/**
 * Messages d'un bureau (ou de tous si $projet vaut ''), du plus récent au plus
 * ancien. $statut accepte 'actifs' (nouveau + écouté) ou un statut précis.
 */
function nj_msg_list(string $projet = '', string $statut = 'actifs', int $limit = 200): array {
  $where = []; $args = [];
  // $projet accepte une liste (« jawhara,tazroute ») : un agent peut couvrir
  // plusieurs bureaux, et voit alors les messages de chacun.
  $cibles = array_filter(array_map('trim', explode(',', $projet)));
  if ($cibles) {
    $where[] = 'projet IN (' . implode(',', array_fill(0, count($cibles), '?')) . ')';
    $args = array_merge($args, $cibles);
  }
  if ($statut === 'actifs')                    $where[] = "statut IN ('nouveau','ecoute')";
  elseif (isset(nj_msg_statuts()[$statut]))  { $where[] = 'statut = ?'; $args[] = $statut; }
  $sql = 'SELECT * FROM messages' . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
       . ' ORDER BY created_at DESC, id DESC LIMIT ' . max(1, min(500, $limit));
  $st = nj_msg_db()->prepare($sql);
  $st->execute($args);
  return $st->fetchAll();
}

/** Nombre de messages jamais ouverts (pastille de l'espace commercial). */
function nj_msg_nb_nouveaux(string $projet = ''): int {
  $cibles = array_filter(array_map('trim', explode(',', $projet)));
  $sql = "SELECT COUNT(*) FROM messages WHERE statut = 'nouveau'";
  if ($cibles) $sql .= ' AND projet IN (' . implode(',', array_fill(0, count($cibles), '?')) . ')';
  $st = nj_msg_db()->prepare($sql);
  $st->execute($cibles);
  return (int)$st->fetchColumn();
}

/** Journal des suites données à un message. */
function nj_msg_actions(int $messageId): array {
  $st = nj_msg_db()->prepare('SELECT * FROM message_actions WHERE message_id = ? ORDER BY created_at DESC, id DESC');
  $st->execute([$messageId]);
  return $st->fetchAll();
}

/** Ajoute une entrée au journal. $audio : ['fichier','mime','duree','jeton']. */
function nj_msg_journal(int $messageId, string $type, ?array $agent = null, string $detail = '', array $audio = []): int {
  $pdo = nj_msg_db();
  $st = $pdo->prepare('INSERT INTO message_actions
      (message_id, agent_id, agent_nom, type, detail, audio_fichier, audio_mime, duree_s, jeton, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,NOW())');
  $st->execute([
    $messageId,
    $agent['id']   ?? null,
    $agent['name'] ?? '',
    $type,
    $detail !== '' ? $detail : null,
    $audio['fichier'] ?? '',
    $audio['mime']    ?? '',
    (int)($audio['duree'] ?? 0),
    $audio['jeton']   ?? null,
  ]);
  return (int)$pdo->lastInsertId();
}

/**
 * Supprime un message, son journal (cascade SQL) et tous ses enregistrements.
 */
function nj_msg_supprimer(int $id): bool {
  $pdo = nj_msg_db();
  $m = nj_msg_get($id);
  if (!$m) return false;

  $st = $pdo->prepare("SELECT audio_fichier FROM message_actions WHERE message_id = ? AND audio_fichier <> ''");
  $st->execute([$id]);
  foreach ($st->fetchAll() as $r) nj_msg_audio_delete($r['audio_fichier']);
  nj_msg_audio_delete($m['audio_fichier']);

  return $pdo->prepare('DELETE FROM messages WHERE id = ?')->execute([$id]);
}

/**
 * Un agent a-t-il le droit de voir ce message ?
 * Commercial : les messages de son bureau. Gestionnaire et superviseur : tous.
 */
function nj_msg_agent_peut(array $agent, array $message): bool {
  if (in_array($agent['role'] ?? '', ['gestionnaire', 'superviseur'], true)) return true;
  require_once __DIR__ . '/agents-lib.php';
  // Commercial : les bureaux qu'il couvre — un seul, plusieurs, ou tous
  // (champ vide, choisi explicitement dans le back-office).
  return nj_agent_couvre($agent['projet'] ?? '', $message['projet']);
}
