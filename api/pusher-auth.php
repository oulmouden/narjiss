<?php

declare(strict_types=1);

/*
 * VISITE GUIDÉE EN DIRECT — Endpoint d'authentification Pusher.
 * -----------------------------------------------------------
 * Signe l'abonnement aux canaux de présence "presence-lg-*".
 * Le SECRET Pusher reste ici, côté serveur, et n'est jamais
 * exposé au navigateur.
 *
 * Appelé automatiquement par le SDK Pusher (POST) au moment
 * où l'hôte ou un visiteur rejoint une session.
 *
 * C'EST LE VRAI POINT DE CONTRÔLE de la visite guidée. Sans signature d'ici,
 * personne ne rejoint le canal : tout ce qui est refusé ci-dessous est refusé
 * pour de bon, quel que soit ce que raconte le navigateur.
 *
 * Deux vérifications, chacune avec sa raison d'être :
 *   - le CODE à 6 chiffres pour un visiteur — détenir le lien ne suffit plus ;
 *   - le JETON HÔTE pour le rôle "host". Sur un canal de présence, Pusher
 *     laisse TOUT membre émettre des « client events » : sans ce contrôle, un
 *     visiteur pouvait diffuser à la place du conseiller et, via l'événement
 *     de navigation, envoyer tous les autres visiteurs sur l'URL de son choix.
 *
 * Le rôle est inscrit dans channel_data, donc SIGNÉ : le navigateur ne peut pas
 * s'en attribuer un. C'est ce qui permet aux visiteurs de n'écouter que l'hôte.
 */

header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/liveguide-config.php';
if (! is_file($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'liveguide-config.php manquant (copier liveguide-config.example.php).']);
    exit;
}
require_once $configFile;
require_once __DIR__ . '/liveguide-lib.php';

$socketId = isset($_POST['socket_id']) ? (string) $_POST['socket_id'] : '';
$channel  = isset($_POST['channel_name']) ? (string) $_POST['channel_name'] : '';
$wantHost = isset($_POST['role']) && $_POST['role'] === 'host';
$userId   = isset($_POST['user_id']) ? (string) $_POST['user_id'] : '';
$code     = preg_replace('/\D/', '', (string) ($_POST['code'] ?? ''));
$hostTok  = preg_replace('/[^a-f0-9]/', '', (string) ($_POST['host_token'] ?? ''));

// Validation minimale : format des identifiants + on n'autorise que nos canaux.
if ($socketId === '' || ! preg_match('/^\d+\.\d+$/', $socketId)) {
    http_response_code(400);
    echo json_encode(['error' => 'socket_id invalide']);
    exit;
}
if (! preg_match('/^presence-lg-([A-Za-z0-9_-]{1,64})$/', $channel, $m)) {
    http_response_code(403);
    echo json_encode(['error' => 'canal non autorisé']);
    exit;
}
if ($userId === '' || ! preg_match('/^[A-Za-z0-9_-]{1,64}$/', $userId)) {
    $userId = substr(hash('sha256', $socketId . mt_rand()), 0, 16);
}

// --- La session existe-t-elle, et est-elle encore ouverte ? ------------------
// En cas d'indisponibilité de la base, on refuse : mieux vaut une visite qui ne
// démarre pas qu'une visite ouverte à tous les vents.
try {
    $sessionRow = nj_lg_get($m[1]);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode(['error' => 'service indisponible']);
    exit;
}

if (! nj_lg_is_open($sessionRow)) {
    http_response_code(403);
    echo json_encode(['error' => 'session close']);
    exit;
}

// --- Qui es-tu : le conseiller, ou un visiteur muni du code ? ----------------
if ($wantHost) {
    if (! nj_lg_check_host($sessionRow, $hostTok)) {
        http_response_code(403);
        echo json_encode(['error' => 'jeton hôte invalide']);
        exit;
    }
    $role = 'host';
} else {
    if (! nj_lg_check_code($sessionRow, $code)) {
        http_response_code(403);
        echo json_encode(['error' => 'code invalide']);
        exit;
    }
    $role = 'viewer';
}

$channelData = json_encode([
    'user_id'   => $userId,
    'user_info' => ['role' => $role],
], JSON_UNESCAPED_UNICODE);

$stringToSign = $socketId . ':' . $channel . ':' . $channelData;
$signature    = hash_hmac('sha256', $stringToSign, LIVEGUIDE_PUSHER_SECRET);

echo json_encode([
    'auth'         => LIVEGUIDE_PUSHER_KEY . ':' . $signature,
    'channel_data' => $channelData,
]);
