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

/* ── Emprises des immeubles sur le plan de masse ────────────────────────────
   Ces zones-là ne passent PAS par la jointure ci-dessus : elles ne désignent
   aucun lot, donc `numero_lot` est vide et le JOIN les écarterait toutes.

   Le compte de lots vient de v_lots_publics et non de `lots` : un logement
   bloqué (témoin, litige) ne doit pas plus être compté ici qu'ailleurs, sinon
   l'étiquette « 12 disponibles sur 70 » trahirait son existence par un total
   qui ne tombe pas juste. */
$immeubles = [];
try {
    $st = nj_db()->prepare(
        'SELECT immeuble, plan, points, largeur, hauteur
           FROM plan_zones
          WHERE projet = ? AND immeuble <> \'\'
          ORDER BY immeuble'
    );
    $st->execute([$projet]);
    $empr = $st->fetchAll();

    $st = nj_db()->prepare(
        'SELECT immeuble,
                COUNT(*)                                        AS total,
                SUM(statut = \'disponible\')                     AS dispo
           FROM v_lots_publics
          WHERE projet = ?
          GROUP BY immeuble'
    );
    $st->execute([$projet]);
    $compte = [];
    foreach ($st->fetchAll() as $c) {
        $compte[(string) $c['immeuble']] = [
            'total' => (int) $c['total'],
            'dispo' => (int) $c['dispo'],
        ];
    }

    foreach ($empr as $r) {
        $points = json_decode((string) $r['points'], true);
        if (!is_array($points) || count($points) < 3) continue;
        $nom = (string) $r['immeuble'];
        $immeubles[$nom] = [
            'plan'    => (string) $r['plan'],
            'points'  => $points,
            'largeur' => (int) $r['largeur'],
            'hauteur' => (int) $r['hauteur'],
            'total'   => $compte[$nom]['total'] ?? 0,
            'dispo'   => $compte[$nom]['dispo'] ?? 0,
        ];
    }
} catch (Throwable $e) {
    // Colonne absente (base non migrée) : pas de plan de masse, pas d'erreur.
    error_log('plan-zones-public (immeubles): ' . $e->getMessage());
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
    'ok'        => true,
    'plans'     => $plans ?: new stdClass(),
    'zones'     => $zones ?: new stdClass(),
    'immeubles' => $immeubles ?: new stdClass(),
], JSON_UNESCAPED_UNICODE);
