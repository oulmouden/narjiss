<?php
/**
 * api/push-lib.php — notifications Web Push vers le téléphone des commerciaux.
 *
 * POURQUOI CE FICHIER EXISTE
 * L'alerte sonore de l'espace agent ne réveille personne : elle suppose la page
 * ouverte. Un commercial qui a rangé son téléphone dans sa poche ne sait pas
 * qu'un visiteur le demande. Le Web Push, lui, passe par le service de
 * notification du système — l'application peut être fermée.
 *
 * PUSH SANS CONTENU, DÉLIBÉRÉMENT
 * Le protocole permet d'expédier un message chiffré (aes128gcm) que le service
 * worker afficherait tel quel. On ne le fait PAS, pour deux raisons :
 *  1. Le chiffrement de la charge utile demande ECDH + HKDF + AES-GCM à la main,
 *     soit quelques centaines de lignes de cryptographie sans bibliothèque —
 *     le dépôt n'a aucune dépendance PHP externe et ce n'est pas ici qu'il faut
 *     commencer.
 *  2. Le nom du visiteur transiterait par les serveurs de Google ou d'Apple.
 *     Un simple signal « va voir » les laisse hors du sujet : c'est le service
 *     worker qui interroge ensuite narjiss.company, avec la session du
 *     commercial, et apprend QUI demande.
 * Il ne reste donc que l'authentification VAPID, que PHP sait faire seul.
 *
 * CLÉS
 * Générées une fois par `php tools/generer-cles-push.php`, puis déposées dans
 * api/.env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT). Ce fichier est
 * exclu du déploiement : la clé privée ne quitte pas le serveur. Sans clés, tout
 * ici devient inerte — l'espace agent retombe simplement sur le son et la
 * notification d'onglet.
 */

require_once __DIR__ . '/agents-lib.php';

/** Durée de vie du jeton VAPID. Le maximum toléré est 24 h ; 12 h suffisent. */
const NJ_PUSH_JWT_TTL = 43200;

/** Combien de temps le service de notification garde le signal si le téléphone
 *  est éteint. Au-delà, la demande a expiré de toute façon (90 s côté visiteur),
 *  mais le commercial peut vouloir rappeler. */
const NJ_PUSH_TTL = 600;

/* ── Encodage ─────────────────────────────────────────────────────────────── */

function nj_b64url(string $bin): string {
  return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function nj_b64url_decode(string $txt): string {
  return base64_decode(strtr($txt, '-_', '+/') . str_repeat('=', (4 - strlen($txt) % 4) % 4)) ?: '';
}

/* ── Clés ─────────────────────────────────────────────────────────────────── */

/**
 * Les clés VAPID, ou null si le serveur n'en a pas.
 * L'absence n'est pas une erreur : elle veut dire « push non configuré ».
 */
function nj_push_cles(): ?array {
  $pub  = trim(nj_config('VAPID_PUBLIC_KEY', ''));
  $priv = trim(nj_config('VAPID_PRIVATE_KEY', ''));
  if ($pub === '' || $priv === '') return null;

  /* api/.env se lit ligne par ligne : une clé PEM, qui en compte quatre, y
     serait tronquée à sa première. On la range donc encodée en base64 sur une
     seule ligne. Le cas du PEM collé tel quel est tout de même accepté — c'est
     le geste naturel de qui édite le fichier à la main. */
  if (strpos($priv, '-----BEGIN') === false) {
    $decode = base64_decode($priv, true);
    if ($decode !== false && strpos($decode, '-----BEGIN') !== false) $priv = $decode;
  }

  return [
    'public'  => $pub,
    'private' => $priv,
    // Le protocole exige un contact joignable : c'est ce que le service de
    // notification utilise si nos envois posent problème.
    'subject' => trim(nj_config('VAPID_SUBJECT', 'mailto:contact@narjiss.company')),
  ];
}

function nj_push_actif(): bool {
  return nj_push_cles() !== null;
}

/* ── Abonnements ──────────────────────────────────────────────────────────── */

/**
 * Enregistre (ou rafraîchit) l'abonnement d'un navigateur.
 *
 * L'endpoint est la clé : un même commercial a droit à plusieurs appareils —
 * son téléphone ET son poste — et doit être alerté sur les deux. En revanche le
 * même navigateur qui se réabonne ne doit pas créer une seconde ligne, sinon il
 * recevrait la notification en double.
 */
function nj_push_enregistrer(int $agentId, string $endpoint, string $p256dh, string $auth): void {
  /* L'unicité porte sur une EMPREINTE de l'endpoint, pas sur l'endpoint lui
     même : ces URL dépassent couramment 300 caractères, et un index unique sur
     une colonne assez longue pour les contenir toutes frôle la limite de taille
     de clé d'InnoDB. Un SHA-256 tient dans 64 caractères, toujours. */
  $st = nj_adb()->prepare(
    'INSERT INTO agent_push (agent_id, endpoint_hash, endpoint, p256dh, auth_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE agent_id = VALUES(agent_id), p256dh = VALUES(p256dh),
                             auth_key = VALUES(auth_key), created_at = VALUES(created_at)'
  );
  $st->execute([$agentId, hash('sha256', $endpoint), $endpoint, $p256dh, $auth, date('Y-m-d H:i:s')]);
}

function nj_push_oublier(string $endpoint): void {
  $st = nj_adb()->prepare('DELETE FROM agent_push WHERE endpoint_hash = ?');
  $st->execute([hash('sha256', $endpoint)]);
}

function nj_push_abonnements(int $agentId): array {
  $st = nj_adb()->prepare('SELECT endpoint FROM agent_push WHERE agent_id = ?');
  $st->execute([$agentId]);
  return array_column($st->fetchAll(), 'endpoint');
}

/* ── Signature VAPID (ES256) ──────────────────────────────────────────────── */

/**
 * Convertit une signature ECDSA au format DER en 64 octets bruts (r‖s).
 *
 * openssl_sign() rend du DER, où r et s sont des entiers de longueur variable,
 * précédés d'un octet nul quand leur bit de poids fort est à 1. JWS attend au
 * contraire deux nombres de 32 octets exactement. Sans cette conversion, une
 * signature sur deux environ serait refusée — celles où r ou s tombe sur 31 ou
 * 33 octets — ce qui donnerait une panne intermittente très pénible à
 * diagnostiquer.
 */
function nj_push_der_vers_brut(string $der): ?string {
  $pos = 0;
  if (($der[$pos++] ?? '') !== "\x30") return null;         // SEQUENCE
  $len = ord($der[$pos++] ?? "\x00");
  if ($len > 0x80) $pos += $len - 0x80;                     // longueur sur plusieurs octets

  $lire = static function (string $der, int &$pos): ?string {
    if (($der[$pos++] ?? '') !== "\x02") return null;        // INTEGER
    $n = ord($der[$pos++] ?? "\x00");
    $v = substr($der, $pos, $n);
    $pos += $n;
    $v = ltrim($v, "\x00");                                  // retire le zéro de signe
    return str_pad($v, 32, "\x00", STR_PAD_LEFT);            // puis cale sur 32 octets
  };

  $r = $lire($der, $pos);
  $s = $lire($der, $pos);
  return ($r === null || $s === null) ? null : $r . $s;
}

/**
 * Jeton VAPID pour un service de notification donné.
 * L'audience est l'ORIGINE de l'endpoint, pas l'endpoint entier : un jeton émis
 * pour l'URL complète est rejeté.
 */
function nj_push_jwt(string $endpoint, array $cles): ?string {
  $parts = parse_url($endpoint);
  if (empty($parts['scheme']) || empty($parts['host'])) return null;
  $audience = $parts['scheme'] . '://' . $parts['host'];

  $entete = nj_b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $corps  = nj_b64url(json_encode([
    'aud' => $audience,
    'exp' => time() + NJ_PUSH_JWT_TTL,
    'sub' => $cles['subject'],
  ]));
  $aSigner = $entete . '.' . $corps;

  $pkey = openssl_pkey_get_private($cles['private']);
  if (!$pkey) return null;
  $der = '';
  if (!openssl_sign($aSigner, $der, $pkey, OPENSSL_ALGO_SHA256)) return null;
  $brut = nj_push_der_vers_brut($der);
  if ($brut === null) return null;

  return $aSigner . '.' . nj_b64url($brut);
}

/* ── Envoi ────────────────────────────────────────────────────────────────── */

/**
 * Réveille les appareils d'un commercial. Sans effet si le push n'est pas
 * configuré ou si personne n'est abonné.
 *
 * Appelé depuis le chemin du VISITEUR (création d'une demande d'accès) : il ne
 * doit donc jamais le faire attendre. D'où les délais courts, et le silence en
 * cas d'échec — un push perdu est moins grave qu'une page qui rame.
 *
 * @return int nombre d'appareils réveillés
 */
function nj_push_envoyer(int $agentId): int {
  $cles = nj_push_cles();
  if (!$cles) return 0;
  $endpoints = nj_push_abonnements($agentId);
  if (!$endpoints) return 0;

  $envoyes = 0;
  foreach ($endpoints as $endpoint) {
    $jwt = nj_push_jwt($endpoint, $cles);
    if ($jwt === null) continue;

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => '',
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => 2,
      CURLOPT_TIMEOUT        => 4,
      CURLOPT_HTTPHEADER     => [
        'Authorization: vapid t=' . $jwt . ', k=' . $cles['public'],
        'TTL: ' . NJ_PUSH_TTL,
        'Content-Length: 0',
      ],
    ]);
    curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    /* 404 / 410 : l'abonnement est mort (application désinstallée, données du
       navigateur effacées). On le retire, sinon on réessaierait à chaque
       demande, indéfiniment, pour un appareil qui ne répondra plus jamais. */
    if ($code === 404 || $code === 410) { nj_push_oublier($endpoint); continue; }
    if ($code >= 200 && $code < 300) $envoyes++;
  }
  return $envoyes;
}
