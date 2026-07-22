<?php
/**
 * api/livekit.php — helper partagé LiveKit (config + forge de jetons).
 *
 * ⚠️ Clés de DEV local, identiques à celles de livekit.yaml. En production :
 *    vraies clés hors-git (api/config.local.php) + wss:// derrière HTTPS.
 *
 * Le serveur LiveKit est mutualisé avec le projet Domiciliation (même port
 * 7880, même devkey) : une seule instance suffit pour les deux sites.
 */

// Surcharge locale facultative (hors-git) : définir LK_URL / LK_KEY / LK_SECRET.
if (is_file(__DIR__ . '/config.local.php')) {
  require __DIR__ . '/config.local.php';
}

if (!defined('LK_URL'))    define('LK_URL',    'ws://localhost:7880');
if (!defined('LK_KEY'))    define('LK_KEY',    'devkey');
if (!defined('LK_SECRET')) define('LK_SECRET', 'twinburo-dev-secret-change-me-0123456789');

function lk_b64url(string $bin): string {
  return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

/** Forge un jeton d'accès LiveKit (JWT HS256) pour rejoindre une room. */
function lk_token(string $room, string $identity, string $name, int $ttl = 3600): string {
  $now = time();
  $claims = [
    'iss'   => LK_KEY,
    'sub'   => $identity,
    'nbf'   => $now - 5,
    'exp'   => $now + $ttl,
    'name'  => $name,
    'video' => [
      'room'           => $room,
      'roomJoin'       => true,
      'canPublish'     => true,
      'canSubscribe'   => true,
      'canPublishData' => true,
    ],
  ];
  $header  = lk_b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
  $payload = lk_b64url(json_encode($claims, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
  $sig     = lk_b64url(hash_hmac('sha256', "$header.$payload", LK_SECRET, true));
  return "$header.$payload.$sig";
}

// nj_projects() vit désormais dans api/data.php, partagé avec la fiche client.
require_once __DIR__ . '/data.php';
