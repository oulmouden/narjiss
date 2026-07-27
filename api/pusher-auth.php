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
 */

header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/liveguide-config.php';
if (! is_file($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'liveguide-config.php manquant (copier liveguide-config.example.php).']);
    exit;
}
require_once $configFile;

$socketId = isset($_POST['socket_id']) ? (string) $_POST['socket_id'] : '';
$channel  = isset($_POST['channel_name']) ? (string) $_POST['channel_name'] : '';
$role     = (isset($_POST['role']) && $_POST['role'] === 'host') ? 'host' : 'viewer';
$userId   = isset($_POST['user_id']) ? (string) $_POST['user_id'] : '';

// Validation minimale : format des identifiants + on n'autorise que nos canaux.
if ($socketId === '' || ! preg_match('/^\d+\.\d+$/', $socketId)) {
    http_response_code(400);
    echo json_encode(['error' => 'socket_id invalide']);
    exit;
}
if (! preg_match('/^presence-lg-[A-Za-z0-9_-]{1,64}$/', $channel)) {
    http_response_code(403);
    echo json_encode(['error' => 'canal non autorisé']);
    exit;
}
if ($userId === '' || ! preg_match('/^[A-Za-z0-9_-]{1,64}$/', $userId)) {
    $userId = substr(hash('sha256', $socketId . mt_rand()), 0, 16);
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
