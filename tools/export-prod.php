<?php
/**
 * tools/export-prod.php — génère un dump SQL prêt à importer sur la PROD.
 *
 * Contenu (idempotent, limité aux projets ciblés — rien d'autre n'est touché) :
 *   1. schéma : colonnes médias de `lots` (ADD COLUMN IF NOT EXISTS),
 *      table `plan_zones` (CREATE IF NOT EXISTS), vue `v_lots_publics`.
 *   2. données : `lots` et `plan_zones` pour jawhara + andalusia
 *      (DELETE ciblé puis INSERT, id inclus → prod identique au local).
 *
 * Usage :  php tools/export-prod.php  [projet ...]
 *          (défaut : jawhara andalusia)  →  écrit sql/prod-sync.sql
 */
require_once __DIR__ . '/../api/db.php';

$db = nj_db();
$projets = array_slice($argv, 1);
if (!$projets) $projets = ['jawhara', 'andalusia'];
$inList = implode(', ', array_map([$db, 'quote'], $projets));

$out = fopen(__DIR__ . '/../sql/prod-sync.sql', 'w');
$w = function ($s) use ($out) { fwrite($out, $s); };

$w("-- =====================================================================\n");
$w("--  Synchro PROD Narjiss — schéma + données (" . implode(', ', $projets) . ")\n");
$w("--  Généré le " . date('c') . " — importable tel quel via phpMyAdmin.\n");
$w("--  Idempotent : rejouable sans risque ; ne touche QUE ces projets.\n");
$w("-- =====================================================================\n");
$w("SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSTART TRANSACTION;\n\n");

/* ── 1. Schéma ───────────────────────────────────────────────────────── */
$w("-- Colonnes médias de `lots` (MariaDB : IF NOT EXISTS => rejouable)\n");
$w("ALTER TABLE `lots` ADD COLUMN IF NOT EXISTS `plan_architecte` varchar(255) DEFAULT NULL;\n");
$w("ALTER TABLE `lots` ADD COLUMN IF NOT EXISTS `plan_visuel` varchar(255) DEFAULT NULL;\n");
$w("ALTER TABLE `lots` ADD COLUMN IF NOT EXISTS `visite_360` varchar(255) DEFAULT NULL;\n\n");

// Table plan_zones (schéma réel, rendu idempotent)
$createPz = $db->query('SHOW CREATE TABLE `plan_zones`')->fetch(PDO::FETCH_ASSOC)['Create Table'];
$createPz = preg_replace('/^CREATE TABLE/', 'CREATE TABLE IF NOT EXISTS', $createPz);
$w("-- Table des zones cliquables\n$createPz;\n\n");

// Vue v_lots_publics (réexportée telle quelle, remplaçable)
try {
    $createView = $db->query('SHOW CREATE VIEW `v_lots_publics`')->fetch(PDO::FETCH_ASSOC)['Create View'];
    // Neutralise le DEFINER (souvent différent sur la prod) et force le remplacement.
    $createView = preg_replace('/DEFINER=`[^`]*`@`[^`]*` /', '', $createView);
    $createView = preg_replace('/^CREATE (ALGORITHM[^ ]* )?/', 'CREATE OR REPLACE ', $createView);
    $w("-- Vue publique des lots (masque les lots bloqués)\n$createView;\n\n");
} catch (Throwable $e) {
    $w("-- (vue v_lots_publics absente en local : ignorée)\n\n");
}

/* ── 2. Données (ciblées) ────────────────────────────────────────────── */
$dump = function ($table) use ($db, $w, $inList) {
    $rows = $db->query("SELECT * FROM `$table` WHERE projet IN ($inList) ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    $w("-- $table : " . count($rows) . " lignes pour ces projets\n");
    $w("DELETE FROM `$table` WHERE projet IN ($inList);\n");
    if ($rows) {
        $cols = array_keys($rows[0]);
        $colList = '`' . implode('`, `', $cols) . '`';
        foreach (array_chunk($rows, 100) as $chunk) {
            $lignes = [];
            foreach ($chunk as $r) {
                $vals = array_map(function ($c) use ($r, $db) {
                    return $r[$c] === null ? 'NULL' : $db->quote($r[$c]);
                }, $cols);
                $lignes[] = '(' . implode(', ', $vals) . ')';
            }
            $w("INSERT INTO `$table` ($colList) VALUES\n" . implode(",\n", $lignes) . ";\n");
        }
    }
    $w("\n");
};

$dump('lots');
$dump('plan_zones');

$w("COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;\n");
fclose($out);

echo "Écrit : sql/prod-sync.sql\n";
echo "Taille : " . round(filesize(__DIR__ . '/../sql/prod-sync.sql') / 1024) . " Ko\n";
