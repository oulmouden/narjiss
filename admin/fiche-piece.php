<?php
/**
 * admin/fiche-piece.php — sert une pièce d'identité depuis le stockage privé.
 *
 * C'est LE point sensible de la chaîne : ce script est la seule porte d'accès
 * aux copies de CNIE. Trois verrous :
 *   1. session admin obligatoire ;
 *   2. référence et type de pièce validés par liste blanche (anti-traversée) ;
 *   3. chaque consultation est journalisée.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/lang.php';
require_once __DIR__ . '/../api/fiche-config.php';

if (!admin_is_logged_in()) {
    http_response_code(403);
    exit(t_brut('fp_refuse'));
}

// Format imposé : NJ-AAAAMMJJ-XXXX. Aucun « .. » ne peut passer.
$ref   = (string)($_GET['ref'] ?? '');
$piece = (string)($_GET['piece'] ?? '');

if (!preg_match('/^NJ-\d{8}-[0-9A-F]{4}$/', $ref) || !isset(nj_piece_types()[$piece])) {
    http_response_code(400);
    exit(t_brut('fp_requete'));
}

$dir = NJ_PIECES_DIR . DIRECTORY_SEPARATOR . $ref;
$found = null;
foreach (['jpg', 'png', 'webp'] as $ext) {
    $candidate = $dir . DIRECTORY_SEPARATOR . $piece . '.' . $ext;
    if (is_file($candidate)) { $found = $candidate; break; }
}

if ($found === null) {
    http_response_code(404);
    exit(t_brut('fp_introuvable'));
}

// Vérification finale : le chemin résolu doit rester sous le dossier privé.
$real = realpath($found);
$base = realpath(NJ_PIECES_DIR);
if ($real === false || $base === false || strpos($real, $base) !== 0) {
    http_response_code(400);
    exit(t_brut('fp_chemin'));
}

nj_log_access('consultation', $ref, $piece);

$mime = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
$ext  = strtolower(pathinfo($real, PATHINFO_EXTENSION));

header('Content-Type: ' . ($mime[$ext] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($real));
header('Content-Disposition: inline; filename="' . $ref . '-' . $piece . '.' . $ext . '"');
// Une pièce d'identité n'a rien à faire dans un cache partagé.
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

readfile($real);
