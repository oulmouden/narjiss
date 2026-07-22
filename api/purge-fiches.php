<?php
/**
 * api/purge-fiches.php — supprime les fiches dont la durée de conservation
 * est écoulée, ainsi que les copies de pièces d'identité associées.
 *
 * Sans exécution régulière de ce script, la durée de conservation annoncée au
 * client dans le formulaire ne serait qu'une déclaration d'intention.
 *
 * Usage (CLI uniquement) :
 *     php api/purge-fiches.php            → simulation, n'efface rien
 *     php api/purge-fiches.php --appliquer → supprime réellement
 *
 * À planifier une fois par jour (Planificateur de tâches Windows).
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script ne s'exécute qu'en ligne de commande.\n");
}

require __DIR__ . '/fiche-config.php';

$apply = in_array('--appliquer', $argv, true);
$now   = time();

$fiches = nj_fiches_read();
$garde  = [];
$purges = 0;

foreach ($fiches as $f) {
    $ref = (string)($f['reference'] ?? '');
    $exp = (string)($f['expiration'] ?? '');

    // Une fiche sans date d'expiration lisible est conservée : mieux vaut
    // un signalement qu'une suppression accidentelle.
    $expired = false;
    if ($exp !== '') {
        try { $expired = (new DateTimeImmutable($exp))->getTimestamp() < $now; }
        catch (Throwable $e) { $expired = false; }
    }

    if (!$expired) { $garde[] = $f; continue; }

    $purges++;
    printf("%s  %s  (expirée le %s)%s\n",
        $apply ? 'SUPPRIMÉE' : 'à purger ',
        $ref,
        substr($exp, 0, 10),
        $apply ? '' : '  [simulation]'
    );

    if (!$apply) { $garde[] = $f; continue; }

    $dir = NJ_PIECES_DIR . DIRECTORY_SEPARATOR . $ref;
    if (is_dir($dir)) {
        foreach ((glob($dir . DIRECTORY_SEPARATOR . '*') ?: []) as $file) @unlink($file);
        @rmdir($dir);
    }
    nj_log_access('purge', $ref, 'expiration ' . $exp);
}

if ($apply && $purges > 0) {
    nj_fiches_write($garde);
}

printf("\n%d fiche(s) au total, %d %s.\n",
    count($fiches),
    $purges,
    $apply ? 'supprimée(s)' : 'à purger (relancer avec --appliquer)'
);
