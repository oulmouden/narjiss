<?php

declare(strict_types=1);

/**
 * sql/etat.php — état du schéma et des données, sur la base que le site utilise.
 *
 * Sert à répondre en une commande à « pourquoi les disponibilités marchent en
 * local et pas en prod ? » : table absente, migration non jouée, ou grille
 * simplement pas encore importée — trois causes qui donnent le même écran.
 *
 * Usage (en SSH, depuis la racine du site) :
 *     php sql/etat.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/db.php';

try {
    $pdo = nj_db();
} catch (Throwable $e) {
    /* Un « Access denied » ne dit pas QUELS identifiants ont été essayés ni
       d'où ils viennent. Sur un serveur CloudPanel, la ligne de commande et
       PHP-FPM peuvent d'ailleurs lire des sources différentes : le pool FPM
       peut porter des variables d'environnement que le shell n'a pas. On
       expose donc la provenance, jamais le mot de passe. */
    $env = nj_env();
    $fichier = dirname(__DIR__) . '/api/.env';
    fwrite(STDERR, "connexion impossible : " . $e->getMessage() . "\n\n");
    fwrite(STDERR, "identifiants utilisés\n");
    foreach (['DB_HOST' => '127.0.0.1', 'DB_PORT' => '3306',
              'DB_NAME' => 'narjiss', 'DB_USER' => 'root'] as $cle => $defaut) {
        $depuis = isset($env[$cle]) ? 'api/.env'
                : (getenv($cle) !== false && getenv($cle) !== '' ? 'variable d\'environnement'
                : 'valeur par défaut du code');
        fwrite(STDERR, sprintf("  %-8s %-24s (%s)\n", $cle, nj_config($cle, $defaut), $depuis));
    }
    $mdp = nj_config('DB_PASS', '');
    fwrite(STDERR, sprintf("  %-8s %-24s (%s)\n", 'DB_PASS',
        $mdp === '' ? '(vide)' : '(défini, ' . strlen($mdp) . ' caractères)',
        isset($env['DB_PASS']) ? 'api/.env'
            : (getenv('DB_PASS') !== false && getenv('DB_PASS') !== '' ? 'variable d\'environnement'
            : 'valeur par défaut du code')));
    fwrite(STDERR, "\n  api/.env : " . (is_file($fichier)
        ? 'présent (' . count($env) . " clés)"
        : "ABSENT — c'est très probablement la cause") . "\n");
    fwrite(STDERR, "\nDans CloudPanel > Databases, relève l'utilisateur et le mot de passe\n"
                 . "de la base, puis renseigne-les dans api/.env sur le serveur.\n");
    exit(1);
}

$base = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
echo "base : $base\n\n";

/** Un objet existe-t-il, et de quel type ? */
function nj_objet(PDO $pdo, string $nom): string
{
    $st = $pdo->prepare(
        'SELECT TABLE_TYPE FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $st->execute([$nom]);
    $t = $st->fetchColumn();
    if ($t === false) return 'ABSENT';
    return $t === 'VIEW' ? 'vue' : 'table';
}

$attendus = [
    'lots'               => '001_parcours_client.sql',
    'lot_status_history' => '001_parcours_client.sql',
    'lot_imports'        => '001_parcours_client.sql',
    'parcours_sessions'  => '001_parcours_client.sql',
    'parcours_selection' => '001_parcours_client.sql',
    'visites'            => '001_parcours_client.sql',
    'v_lots_publics'     => '001_parcours_client.sql',
    'fiches'             => 'fiches.sql',
    // `agents` n'a pas de migration : api/agents-lib.php la crée à la volée.
    // Elle doit pourtant précéder 001, dont les clés étrangères la référencent.
    'agents'             => 'php -r \'require "api/agents-lib.php"; nj_adb();\'',
];

echo "OBJETS\n";
$manquants = [];
foreach ($attendus as $nom => $origine) {
    $etat = nj_objet($pdo, $nom);
    printf("  %-20s %-8s %s\n", $nom, $etat, $etat === 'ABSENT' ? "→ $origine" : '');
    if ($etat === 'ABSENT') $manquants[$origine] = true;
}

// Colonnes médias : ce sont elles qui font tomber lots-public.php si 003
// n'a pas été jouée après 001.
if (nj_objet($pdo, 'lots') !== 'ABSENT') {
    echo "\nCOLONNES MÉDIAS DE `lots` (migration 003)\n";
    $st = $pdo->query("SHOW COLUMNS FROM `lots`");
    $cols = array_column($st->fetchAll(), 'Field');
    foreach (['plan_fichier', 'plan_architecte', 'plan_visuel', 'visite_360'] as $c) {
        $ok = in_array($c, $cols, true);
        printf("  %-18s %s\n", $c, $ok ? 'présente' : 'ABSENTE → 003_lots_medias.sql');
        if (!$ok) $manquants['003_lots_medias.sql'] = true;
    }
}

// La vue est ce que lit le front : si elle est en retard sur la table, le
// site ne verra pas les nouvelles colonnes même après un ALTER réussi.
if (nj_objet($pdo, 'v_lots_publics') !== 'ABSENT') {
    $st = $pdo->query("SHOW COLUMNS FROM `v_lots_publics`");
    $vcols = array_column($st->fetchAll(), 'Field');
    $retard = array_diff(['plan_architecte', 'plan_visuel', 'visite_360'], $vcols);
    if ($retard) {
        echo "  vue v_lots_publics en retard : " . implode(', ', $retard)
            . " → rejouer 003_lots_medias.sql\n";
        $manquants['003_lots_medias.sql'] = true;
    }
}

// Données : une base à jour mais vide donne « 0 logement », pas une erreur.
if (nj_objet($pdo, 'lots') !== 'ABSENT') {
    echo "\nGRILLES IMPORTÉES\n";
    $lignes = $pdo->query(
        "SELECT projet, COUNT(*) n, SUM(statut = 'disponible') dispo
         FROM lots GROUP BY projet ORDER BY projet"
    )->fetchAll();
    if (!$lignes) {
        echo "  (aucune) → importer une grille via admin/lots-import.php\n";
    }
    foreach ($lignes as $l) {
        printf("  %-16s %3d lots, %3d disponibles\n", $l['projet'], $l['n'], $l['dispo']);
    }
}

echo "\n";
if ($manquants) {
    echo "À FAIRE, dans cet ordre\n";
    /* `agents` d'abord : les clés étrangères de 001 la référencent, sinon la
       migration s'arrête sur « Failed to open the referenced table 'agents' ».
       On place donc les actions hors .sql en tête. */
    $ordre = array_keys($manquants);
    usort($ordre, static fn($a, $b) =>
        (strpos($a, '.sql') !== false) <=> (strpos($b, '.sql') !== false));
    foreach ($ordre as $f) {
        echo (strpos($f, '.sql') !== false)
            ? "  php sql/migrer.php sql/$f\n"
            : "  $f\n";
    }
} else {
    echo "Schéma complet.\n";
}
