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

// La base ne renvoie que les fiches dont l'expiration est passée (SQL NOW()).
$expirees = nj_fiches_expired();
$purges   = 0;

foreach ($expirees as $f) {
    $ref = (string)($f['reference'] ?? '');
    $exp = (string)($f['expiration'] ?? '');

    $purges++;
    printf("%s  %s  (expirée le %s)%s\n",
        $apply ? 'SUPPRIMÉE' : 'à purger ',
        $ref,
        substr($exp, 0, 10),
        $apply ? '' : '  [simulation]'
    );

    if (!$apply) continue;

    // Les octets des pièces sont sur disque : on efface le dossier privé…
    $dir = NJ_PIECES_DIR . DIRECTORY_SEPARATOR . $ref;
    if (is_dir($dir)) {
        foreach ((glob($dir . DIRECTORY_SEPARATOR . '*') ?: []) as $file) @unlink($file);
        @rmdir($dir);
    }
    // …puis la ligne en base.
    nj_fiche_delete($ref);
    nj_log_access('purge', $ref, 'expiration ' . $exp);
}

$total = (int)nj_db()->query('SELECT COUNT(*) FROM fiches')->fetchColumn();

printf("\n%d fiche(s) au total, %d %s.\n",
    $total,
    $purges,
    $apply ? 'supprimée(s)' : 'à purger (relancer avec --appliquer)'
);
