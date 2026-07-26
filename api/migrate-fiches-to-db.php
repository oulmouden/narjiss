<?php
/**
 * api/migrate-fiches-to-db.php — importe une fois les fiches de l'ancien
 * stockage JSON (fiches.json) vers MySQL.
 *
 * Idempotent : une référence déjà présente en base est ignorée, donc le script
 * peut être relancé sans créer de doublons. Les copies de pièces d'identité sur
 * disque ne sont PAS touchées (elles restent dans le coffre privé).
 *
 * Usage (CLI uniquement) :
 *     php api/migrate-fiches-to-db.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script ne s'exécute qu'en ligne de commande.\n");
}

require __DIR__ . '/fiche-config.php';

$file = NJ_FICHES_FILE;
if (!is_file($file)) {
    exit("Aucun fichier « $file » à migrer. Rien à faire.\n");
}

$list = json_decode((string)file_get_contents($file), true);
if (!is_array($list)) {
    fwrite(STDERR, "Contenu JSON illisible : $file\n");
    exit(1);
}

$importees = 0;
$ignorees  = 0;
$echecs    = 0;

foreach ($list as $fiche) {
    if (!is_array($fiche) || empty($fiche['reference'])) { $echecs++; continue; }
    $ref = (string)$fiche['reference'];

    if (nj_fiche_get($ref) !== null) { $ignorees++; continue; }

    try {
        if (nj_fiche_insert($fiche)) {
            $importees++;
        } else {
            $echecs++;
            fwrite(STDERR, "Échec insertion : $ref\n");
        }
    } catch (Throwable $e) {
        $echecs++;
        fwrite(STDERR, "Échec insertion $ref : " . $e->getMessage() . "\n");
    }
}

printf("%d importée(s), %d déjà en base, %d échec(s).\n", $importees, $ignorees, $echecs);

// On ne laisse pas traîner un JSON qui prêterait à confusion avec la base :
// il est renommé seulement si tout est passé sans erreur (garde-fou).
if ($echecs === 0) {
    $backup = $file . '.imported';
    if (@rename($file, $backup)) {
        echo "Ancien fichier archivé : $backup\n";
    }
} else {
    echo "Des échecs subsistent : « $file » est conservé tel quel.\n";
}
