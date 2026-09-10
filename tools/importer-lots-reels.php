<?php
/**
 * tools/importer-lots-reels.php — importe en base les grilles de lots posées dans data/lots/.
 *
 * Même chemin que l'écran admin/lots-import.php (lecture, contrôle, nj_lots_importer),
 * mais pour les 26 projets d'un coup : à la mise en production des projets réels,
 * vingt-six passages par le formulaire auraient été autant d'occasions d'en oublier un.
 *
 * Usage (SSH, depuis la racine du site) :
 *     php tools/importer-lots-reels.php            # toutes les grilles narjiss-lots-<slug>.csv
 *     php tools/importer-lots-reels.php tamount    # une seule
 *     php tools/importer-lots-reels.php --a-blanc  # lit et contrôle, n'écrit rien
 *
 * Sont ignorés : les fichiers -demo, -modele et la démo Jawhara (narjiss-lots-jawhara.csv),
 * dont les lots d'exemple restent tels quels. Réimporter = mettre à jour (clé projet + lot).
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/../api/lots-lib.php';

$args    = array_slice($argv, 1);
$aBlanc  = in_array('--a-blanc', $args, true);
$seul    = array_values(array_filter($args, static fn($a) => $a[0] !== '-'))[0] ?? '';
$dir     = dirname(__DIR__) . '/data/lots';

if (!nj_lots_schema_present()) {
    fwrite(STDERR, "Table lots absente : jouer d'abord sql/001_parcours_client.sql (php sql/migrer.php …).\n");
    exit(1);
}
$enums = nj_lot_enums()['typologie'];
if (!in_array('terrain', $enums, true)) {
    fwrite(STDERR, "api/lots-lib.php ne connaît pas la typologie « terrain » : déployer la version à jour.\n");
    exit(1);
}
$type = nj_db()->query("SHOW COLUMNS FROM lots LIKE 'typologie'")->fetch()['Type'] ?? '';
if (strpos($type, "'terrain'") === false) {
    fwrite(STDERR, "La colonne lots.typologie n'accepte pas « terrain » : php sql/migrer.php sql/005_lots_terrain.sql\n");
    exit(1);
}

$fichiers = glob($dir . '/narjiss-lots-*.csv') ?: [];
sort($fichiers);
$nbProjets = 0; $nbLignes = 0; $rejets = 0;
foreach ($fichiers as $f) {
    $slug = preg_replace('/^narjiss-lots-(.+)\.csv$/', '$1', basename($f));
    if (preg_match('/demo|modele|^jawhara(-|$)/', $slug)) continue;
    if ($seul !== '' && $slug !== $seul) continue;
    $lu = nj_lots_lire_csv($f);
    if ($lu['erreurs']) {
        printf("ERREUR %-22s %s\n", $slug, implode(' | ', array_slice($lu['erreurs'], 0, 3)));
        $rejets++;
        continue;
    }
    $n = count($lu['lignes']);
    if ($aBlanc) {
        printf("%-22s %4d lignes lisibles%s\n", $slug, $n, $lu['alertes'] ? ' | ' . implode(' ; ', $lu['alertes']) : '');
    } else {
        $r = nj_lots_importer($lu['lignes'], $slug, basename($f), 'import-reel');
        printf("%-22s %4d lignes → créées %d, mises à jour %d, rejetées %d%s\n", $slug, $n,
            $r['creees'] ?? 0, $r['majs'] ?? 0, $r['rejetees'] ?? 0,
            $lu['alertes'] ? ' | ' . implode(' ; ', $lu['alertes']) : '');
    }
    $nbProjets++; $nbLignes += $n;
}
printf("\n%d projet(s), %d ligne(s)%s.\n", $nbProjets, $nbLignes, $aBlanc ? ' — à blanc, rien écrit' : ' importées');
if (!$aBlanc) {
    $st = nj_db()->query('SELECT projet, COUNT(*) n, SUM(statut = "disponible") d FROM lots GROUP BY projet ORDER BY projet');
    foreach ($st->fetchAll() as $r) printf("  %-22s %4d lots, %4d disponibles\n", $r['projet'], $r['n'], $r['d']);
}
exit($rejets ? 1 : 0);
