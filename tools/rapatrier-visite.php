<?php

declare(strict_types=1);

/**
 * tools/rapatrier-visite.php — redescend une visite 360 du VPS vers le poste local.
 *
 * POURQUOI CET OUTIL EXISTE
 * Les visites montées dans le back-office (`visites/<slug>/`) ne circulent dans
 * AUCUN sens automatiquement :
 *   - `visites/` est dans .gitignore — photos et fichier publié, hors dépôt ;
 *   - `visites/` n'est dans AUCUN bucket de deploy.sh (code|images|videos|tours).
 * Une visite publiée en ligne n'existe donc que sur le VPS. Sans cet outil, la
 * seule façon de la retrouver en local est de la remonter photo par photo dans
 * l'éditeur — en repointant à la main chaque passage.
 *
 * POURQUOI UN SIMPLE COPIER-COLLER SUFFIT
 * nj_visite_publier() écrit le brouillon VERBATIM dans tour-pannellum.json
 * (api/visites-lib.php, ~ligne 208) : un json_encode, rien de plus. Le fichier
 * publié EST le brouillon. Le réimporter, c'est le recopier dans la colonne
 * `brouillon` — titres, paires vide/meublé, ordre des pièces et orientation de
 * chaque passage compris.
 *
 * Ce que l'outil NE fait pas : renvoyer quoi que ce soit vers le VPS. Il lit en
 * HTTPS et écrit en local, jamais l'inverse.
 *
 * Usage :
 *   php tools/rapatrier-visite.php <slug> [options]
 *
 *   --projet <id>     projet auquel rattacher la visite (ex. jawhara)
 *   --agent <n>       agent propriétaire (défaut : premier gestionnaire actif)
 *   --titre "..."     titre affiché (défaut : déduit du slug)
 *   --url <base>      racine du site distant (défaut : https://www.narjiss.company)
 *   --local           n'appelle pas le réseau : importe les fichiers déjà présents
 *   --force           remplace le brouillon d'une visite déjà en base
 *   --dry-run         montre ce qui serait fait, n'écrit rien
 *
 * Exemple :
 *   php tools/rapatrier-visite.php jawhara-pannellum --projet jawhara
 */

$racine = dirname(__DIR__);
require_once $racine . '/api/visites-lib.php';

// ---------------------------------------------------------------- arguments
$args = $_SERVER['argv'];
array_shift($args);

$slug = null; $projet = null; $titre = null; $agent = null;
$base = 'https://www.narjiss.company';
$local = false; $force = false; $dry = false;

while ($args) {
  $a = array_shift($args);
  switch ($a) {
    case '--projet':  $projet = (string) array_shift($args); break;
    case '--agent':   $agent  = (int) array_shift($args);    break;
    case '--titre':   $titre  = (string) array_shift($args); break;
    case '--url':     $base   = rtrim((string) array_shift($args), '/'); break;
    case '--local':   $local  = true; break;
    case '--force':   $force  = true; break;
    case '--dry-run': $dry    = true; break;
    case '-h': case '--help':
      fwrite(STDOUT, preg_replace('/^.*?Usage :\n/s', "Usage :\n", file_get_contents(__FILE__)));
      exit(0);
    default:
      if ($slug === null && $a[0] !== '-') { $slug = $a; break; }
      erreur("option inconnue : $a");
  }
}

if ($slug === null) erreur("usage : php tools/rapatrier-visite.php <slug> [--projet x] [--local] [--force]");
if (!nj_visite_slug_valide($slug)) erreur("slug invalide : « $slug »");

function erreur(string $m): never { fwrite(STDERR, "$m\n"); exit(1); }
function info(string $m): void { fwrite(STDOUT, "$m\n"); }

/**
 * Télécharge une URL vers un fichier.
 *
 * Écrit d'abord dans un fichier temporaire : une coupure réseau ne doit pas
 * laisser un panorama à moitié écrit, que la visionneuse afficherait tronqué
 * sans rien signaler.
 *
 * @return array{ok:bool,code:int,modifie:?int}
 */
function telecharger(string $url, string $dest): array {
  if (!function_exists('curl_init')) erreur("l'extension curl de PHP est absente : impossible de télécharger.");
  $tmp = $dest . '.part';
  $fh = fopen($tmp, 'wb');
  if (!$fh) erreur("écriture impossible : $tmp");

  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_FILE           => $fh,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_FAILONERROR    => true,
    CURLOPT_FILETIME       => true,
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_CONNECTTIMEOUT => 20,
  ]);
  $ok   = curl_exec($ch) !== false;
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $mt   = (int) curl_getinfo($ch, CURLINFO_FILETIME);
  curl_close($ch);
  fclose($fh);

  if (!$ok) { @unlink($tmp); return ['ok' => false, 'code' => $code, 'modifie' => null]; }
  rename($tmp, $dest);
  return ['ok' => true, 'code' => $code, 'modifie' => $mt > 0 ? $mt : null];
}

// ------------------------------------------------------------- rapatriement
$dossier = $racine . '/visites/' . $slug;
$fichier = $dossier . '/tour-pannellum.json';
$distant = "$base/visites/$slug/tour-pannellum.json";
$publieeAt = null;

if ($local) {
  if (!is_file($fichier)) erreur("--local demandé mais $fichier est absent.");
  info("mode local : aucun appel réseau.");
} else {
  info("source : $distant");
  if ($dry) {
    info("--dry-run : téléchargement non effectué.");
  } else {
    if (!is_dir($dossier . '/photos') && !mkdir($dossier . '/photos', 0775, true)) {
      erreur("dossier non créable : $dossier/photos");
    }
    $r = telecharger($distant, $fichier);
    if (!$r['ok']) erreur("téléchargement du descripteur impossible (HTTP {$r['code']}) — la visite est-elle publiée en ligne ?");
    // La date de publication réelle, prise sur le serveur : le mtime local est
    // celui du téléchargement et ne veut rien dire.
    $publieeAt = $r['modifie'];
  }
}

if ($dry && !is_file($fichier)) { info("--dry-run : rien de plus à montrer sans le descripteur."); exit(0); }

$draft = json_decode((string) file_get_contents($fichier), true);
if (!is_array($draft) || empty($draft['scenes'])) erreur("le descripteur ne contient aucune scène exploitable.");

// Images référencées par le descripteur : panoramas et vignettes.
$images = [];
foreach ($draft['scenes'] as $s) {
  foreach (['panorama', 'thumbnail'] as $k) if (!empty($s[$k])) $images[$s[$k]] = true;
}
$images = array_keys($images);

if (!$local && !$dry) {
  info(count($images) . ' image(s) à récupérer…');
  $ko = [];
  foreach ($images as $rel) {
    $cible = $dossier . '/' . $rel;
    if (!is_dir(dirname($cible))) mkdir(dirname($cible), 0775, true);
    $r = telecharger("$base/visites/$slug/$rel", $cible);
    if (!$r['ok']) $ko[] = "$rel (HTTP {$r['code']})";
  }
  if ($ko) {
    fwrite(STDERR, "images non récupérées :\n");
    foreach ($ko as $m) fwrite(STDERR, "   $m\n");
    erreur("rapatriement incomplet : la base n'a pas été touchée.");
  }
}

// Garde-fou : une visite importée sans ses images s'ouvre sur un écran noir,
// sans le moindre message. On vérifie avant d'écrire en base.
$manquants = array_values(array_filter($images, fn($rel) => !is_file($dossier . '/' . $rel)));
if ($manquants) {
  fwrite(STDERR, count($manquants) . " image(s) manquante(s) sur le disque :\n");
  foreach (array_slice($manquants, 0, 10) as $m) fwrite(STDERR, "   $m\n");
  erreur("import annulé.");
}

// ---------------------------------------------------------------- mise en base
$pdo = nj_vdb();
$existe = nj_visite_get($slug);
if ($existe && !$force) {
  erreur("« $slug » est déjà en base (agent {$existe['agent_id']}).\nRelancer avec --force pour remplacer son brouillon.");
}

if ($agent === null) {
  $agent = (int) ($pdo->query(
    "SELECT id FROM agents WHERE role = 'gestionnaire' AND statut = 'active' ORDER BY id LIMIT 1"
  )->fetchColumn() ?: 0);
  if (!$agent) $agent = (int) $pdo->query('SELECT id FROM agents ORDER BY id LIMIT 1')->fetchColumn();
}
if (!$agent) erreur("aucun agent en base : impossible d'attribuer la visite.");

$titre  ??= ($existe['titre'] ?? ucwords(str_replace('-', ' ', $slug)));
$projet ??= ($existe['projet'] ?? '');

$passages = array_sum(array_map(fn($s) => count($s['hotSpots'] ?? []), $draft['scenes']));

if ($dry) {
  info(sprintf(
    "--dry-run : « %s » serait %s — %d scènes, %d passages, %d images, agent %d.",
    $slug, $existe ? 'remplacée' : 'importée', count($draft['scenes']), $passages, count($images), $agent
  ));
  exit(0);
}

$json = json_encode($draft, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$now  = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
$pub  = $publieeAt !== null
  ? date('Y-m-d H:i:s', $publieeAt)
  : ($existe['publiee_at'] ?? date('Y-m-d H:i:s', (int) filemtime($fichier)));

if ($existe) {
  $pdo->prepare('UPDATE visites_360 SET titre = ?, projet = ?, brouillon = ?, publiee_at = ?, updated_at = ? WHERE slug = ?')
      ->execute([$titre, $projet, $json, $pub, $now, $slug]);
  $verbe = 'remplacée';
} else {
  $pdo->prepare(
    'INSERT INTO visites_360 (slug, titre, projet, agent_id, brouillon, publiee_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )->execute([$slug, $titre, $projet, $agent, $json, $pub, $now, $now]);
  $verbe = 'importée';
}

info(sprintf(
  "visite « %s » %s : %d scènes, %d passages, %d images, agent %d (%s), publiée le %s",
  $slug, $verbe, count($draft['scenes']), $passages, count($images), $agent, $titre, $pub
));
info("→ http://localhost/narjiss/tour-360.html?tour=visites/$slug");
