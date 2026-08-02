<?php
/**
 * api/lots-public.php — disponibilités d'un projet, pour le parcours client.
 *
 * Lit exclusivement la vue v_lots_publics : les lots bloqués (logements
 * témoins, litiges) et les notes internes n'en sortent jamais, même si une
 * requête les demandait explicitement.
 *
 * GET api/lots-public.php?projet=jawhara[&typologie=f3&orientation=cour
 *     &niveau_min=2&budget_max=900000&surface_min=80&immeuble=A]
 */

declare(strict_types=1);

require_once __DIR__ . '/lots-lib.php';
require_once __DIR__ . '/data.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/** Réponse d'erreur uniforme. */
function nj_lots_erreur(int $code, string $message): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$projet = strtolower(trim((string) ($_GET['projet'] ?? '')));
if ($projet === '' || !preg_match('/^[a-z0-9_]+$/', $projet)) {
    nj_lots_erreur(400, 'Projet manquant ou invalide.');
}
if (!isset(nj_projects()[$projet])) {
    nj_lots_erreur(404, 'Projet inconnu.');
}

$enums = nj_lot_enums();
$where  = ['projet = :projet'];
$params = ['projet' => $projet];

// Filtres à valeur contrainte : une valeur hors liste est ignorée plutôt que
// de faire échouer la requête, pour qu'un lien mal formé n'affiche pas d'erreur.
foreach (['typologie', 'orientation', 'exposition', 'parking'] as $col) {
    $v = nj_lot_norm((string) ($_GET[$col] ?? ''));
    $v = nj_lot_alias()[$v] ?? $v;
    if ($v !== '' && in_array($v, $enums[$col], true)) {
        $where[] = "$col = :$col";
        $params[$col] = $v;
    }
}

$immeuble = trim((string) ($_GET['immeuble'] ?? ''));
if ($immeuble !== '') {
    $where[] = 'immeuble = :immeuble';
    $params['immeuble'] = mb_substr($immeuble, 0, 32);
}

// Filtres numériques : chacun n'est appliqué que s'il est réellement fourni,
// pour distinguer « pas de budget saisi » de « budget de 0 DH ».
$numeriques = [
    'budget_max'  => ['prix_dh <= :budget_max', 'budget_max'],
    'budget_min'  => ['prix_dh >= :budget_min', 'budget_min'],
    'surface_min' => ['surface_habitable >= :surface_min', 'surface_min'],
    'niveau_min'  => ['niveau_ordre >= :niveau_min', 'niveau_min'],
    'chambres_min' => ['nb_chambres >= :chambres_min', 'chambres_min'],
];
foreach ($numeriques as $cle => [$clause, $bind]) {
    if (isset($_GET[$cle]) && trim((string) $_GET[$cle]) !== '') {
        $where[] = $clause;
        $params[$bind] = nj_lot_nombre((string) $_GET[$cle]);
    }
}

// Par défaut on montre tout l'immeuble, vendus compris : voir la progression
// des ventes rassure l'acheteur. « disponible=1 » restreint aux lots libres.
if (($_GET['disponible'] ?? '') === '1') {
    $where[] = "statut = 'disponible'";
}

try {
    $sql = 'SELECT id, immeuble, niveau, niveau_ordre, numero_lot, typologie,
                   surface_habitable, surface_balcon, surface_totale,
                   nb_chambres, nb_sdb, orientation, exposition, ascenseur,
                   parking, prix_dh, prix_m2, statut, plan_fichier, notes
            FROM v_lots_publics
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY immeuble, niveau_ordre, numero_lot';
    $st = nj_db()->prepare($sql);
    $st->execute($params);
    $lots = $st->fetchAll();

    // Facettes calculées sur le projet entier, pas sur le résultat filtré :
    // les compteurs des filtres doivent rester stables quand on en coche un.
    $facettes = nj_db()->prepare(
        'SELECT typologie, orientation, immeuble, statut, niveau, niveau_ordre,
                MIN(prix_dh) AS prix_min, MAX(prix_dh) AS prix_max,
                MIN(surface_habitable) AS surf_min, MAX(surface_habitable) AS surf_max,
                COUNT(*) AS n
         FROM v_lots_publics WHERE projet = ?
         GROUP BY typologie, orientation, immeuble, statut, niveau, niveau_ordre'
    );
    $facettes->execute([$projet]);
    $brut = $facettes->fetchAll();
} catch (Throwable $e) {
    error_log('lots-public: ' . $e->getMessage());
    nj_lots_erreur(500, 'Disponibilités momentanément indisponibles.');
}

/** Agrège les facettes sur une dimension donnée. */
$grouper = static function (array $lignes, string $cle): array {
    $out = [];
    foreach ($lignes as $l) {
        $k = (string) $l[$cle];
        $out[$k] = ($out[$k] ?? 0) + (int) $l['n'];
    }
    ksort($out);
    return $out;
};

$prix = array_column($brut, 'prix_min');
$prixMax = array_column($brut, 'prix_max');
$surf = array_column($brut, 'surf_min');
$surfMax = array_column($brut, 'surf_max');

// Ordonne les niveaux par leur rang réel : RDC avant 1, 2, 10…
$niveaux = [];
foreach ($brut as $l) {
    $niveaux[(string) $l['niveau']] = (int) $l['niveau_ordre'];
}
asort($niveaux);

echo json_encode([
    'ok'      => true,
    'projet'  => $projet,
    'total'   => count($lots),
    'lots'    => array_map(static function (array $l): array {
        return [
            'id'          => (int) $l['id'],
            'immeuble'    => $l['immeuble'],
            'niveau'      => $l['niveau'],
            'niveau_ordre' => (int) $l['niveau_ordre'],
            'numero'      => $l['numero_lot'],
            'typologie'   => $l['typologie'],
            'surface'     => (float) $l['surface_habitable'],
            'balcon'      => (float) $l['surface_balcon'],
            'surface_totale' => (float) $l['surface_totale'],
            'chambres'    => (int) $l['nb_chambres'],
            'sdb'         => (int) $l['nb_sdb'],
            'orientation' => $l['orientation'],
            'exposition'  => $l['exposition'],
            'ascenseur'   => (bool) $l['ascenseur'],
            'parking'     => $l['parking'],
            'prix'        => (float) $l['prix_dh'],
            'prix_m2'     => (float) $l['prix_m2'],
            'statut'      => $l['statut'],
            'plan'        => $l['plan_fichier'],
            'notes'       => $l['notes'],
        ];
    }, $lots),
    'facettes' => [
        'typologies'   => $grouper($brut, 'typologie'),
        'orientations' => $grouper($brut, 'orientation'),
        'immeubles'    => $grouper($brut, 'immeuble'),
        'statuts'      => $grouper($brut, 'statut'),
        'niveaux'      => $niveaux,
        'prix_min'     => $prix ? min($prix) : 0,
        'prix_max'     => $prixMax ? max($prixMax) : 0,
        'surface_min'  => $surf ? min($surf) : 0,
        'surface_max'  => $surfMax ? max($surfMax) : 0,
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
