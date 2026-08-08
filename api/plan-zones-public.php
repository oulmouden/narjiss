<?php
/**
 * api/plan-zones-public.php — contours des lots sur les plans d'étage.
 *
 * Sert la vue « maquette » du parcours client : quand un plan a été tracé
 * dans le back-office, elle affiche le vrai plan d'architecte plutôt que le
 * plateau schématique reconstitué à partir des surfaces.
 *
 * Le filtre passe par v_lots_publics, comme api/lots-public.php : un lot
 * bloqué (logement témoin, litige) est masqué au client, son contour ne doit
 * donc pas sortir non plus — sans quoi on trahirait sa position et son
 * existence sur le plan.
 *
 * GET api/plan-zones-public.php?projet=andalusia
 */

declare(strict_types=1);

require_once __DIR__ . '/plan-zones-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$projet = trim((string) ($_GET['projet'] ?? ''));
if ($projet === '' || !preg_match('/^[a-z0-9_-]{1,64}$/i', $projet)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Projet invalide.']);
    exit;
}

// Table absente (schéma non migré) : ce n'est pas une erreur pour le client,
// simplement « aucun plan tracé ». La vue retombe sur le plateau schématique.
if (!nj_zones_schema_present()) {
    echo json_encode(['ok' => true, 'plans' => new stdClass(), 'zones' => new stdClass()]);
    exit;
}

try {
    $st = nj_db()->prepare(
        'SELECT z.plan, z.numero_lot, z.points, z.largeur, z.hauteur
           FROM plan_zones z
           JOIN v_lots_publics l
             ON l.projet = z.projet AND l.numero_lot = z.numero_lot
          WHERE z.projet = ?
          ORDER BY z.id'
    );
    $st->execute([$projet]);
    $lignes = $st->fetchAll();
} catch (Throwable $e) {
    error_log('plan-zones-public: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Contours indisponibles.']);
    exit;
}

$plans = [];
$zones = [];
foreach ($lignes as $r) {
    $points = json_decode((string) $r['points'], true);
    if (!is_array($points) || count($points) < 3) continue;

    $chemin = (string) $r['plan'];
    if (!isset($plans[$chemin])) {
        $plans[$chemin] = [
            'largeur' => (int) $r['largeur'],
            'hauteur' => (int) $r['hauteur'],
        ];
    }
    $zones[(string) $r['numero_lot']] = ['plan' => $chemin, 'points' => $points];
}

echo json_encode([
    'ok'    => true,
    'plans' => $plans ?: new stdClass(),
    'zones' => $zones ?: new stdClass(),
], JSON_UNESCAPED_UNICODE);
