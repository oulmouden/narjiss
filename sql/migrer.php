<?php

declare(strict_types=1);

/**
 * sql/migrer.php — applique un fichier .sql en réutilisant la connexion du site.
 *
 * Pourquoi ce script plutôt que « mysql < fichier.sql » : le client en ligne
 * de commande demande des identifiants qu'il faut retrouver et retaper, et il
 * n'utilise pas forcément le même socket que PHP-FPM — en local il refuse la
 * connexion là où PDO passe. Ici on emprunte api/db.php, donc exactement la
 * base que le site utilise, sans un seul mot de passe à saisir.
 *
 * Usage (en SSH, depuis la racine du site) :
 *     php sql/migrer.php sql/003_lots_medias.sql
 *
 * Les migrations du dépôt sont idempotentes : les rejouer ne casse rien.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;                      // jamais exposé au web, même si le fichier est déployé
}

require_once __DIR__ . '/../api/db.php';

$fichier = $argv[1] ?? '';
if ($fichier === '' || !is_file($fichier)) {
    fwrite(STDERR, "usage : php sql/migrer.php <fichier.sql>\n");
    exit(1);
}

$sql = (string) file_get_contents($fichier);
// Les commentaires « -- » peuvent contenir des points-virgules : on les retire
// avant de découper, sinon le découpage produirait des requêtes tronquées.
$sql = (string) preg_replace('/^\s*--.*$/m', '', $sql);

$requetes = array_filter(array_map('trim', explode(';', $sql)), static fn($q) => $q !== '');

try {
    $pdo = nj_db();
} catch (Throwable $e) {
    fwrite(STDERR, "connexion impossible : " . $e->getMessage() . "\n");
    exit(1);
}

$n = 0;
foreach ($requetes as $q) {
    try {
        $pdo->exec($q);
        $n++;
    } catch (Throwable $e) {
        fwrite(STDERR, sprintf(
            "échec sur la requête %d : %s\n--- requête ---\n%s\n",
            $n + 1, $e->getMessage(), substr($q, 0, 400)
        ));
        exit(1);
    }
}

printf("%s : %d requête(s) appliquée(s).%s", basename($fichier), $n, PHP_EOL);
