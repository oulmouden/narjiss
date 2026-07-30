<?php
/**
 * api/data.php — accès partagé aux données publiques du site.
 * Utilisé par les endpoints de l'hôtesse IA et par la fiche de renseignement.
 */

/** Charge data/projects.json ; retourne un tableau indexé par id de projet. */
function nj_projects(): array {
  static $cache = null;
  if ($cache !== null) return $cache;

  $path = __DIR__ . '/../data/projects.json';
  if (!is_file($path)) return $cache = [];

  $raw = json_decode((string)file_get_contents($path), true);
  if (!is_array($raw)) return $cache = [];

  $out = [];
  foreach ($raw as $p) {
    if (!empty($p['id'])) $out[$p['id']] = $p;
  }
  return $cache = $out;
}

/** Nom lisible d'un projet, langue au choix, avec repli sur le français. */
function nj_project_name(string $id, string $lang = 'fr'): string {
  $projects = nj_projects();
  if (!isset($projects[$id])) return $id;
  $name = $projects[$id]['name'] ?? [];
  return $name[$lang] ?? $name['fr'] ?? $id;
}

/**
 * POI (points d'intérêt) autour d'un projet, pour l'hôtesse IA.
 *
 * Lit les CSV du dossier du projet (mêmes fichiers que la carte interactive) :
 *   <folder>/<folder>_fr.csv        → commodités du quartier (comptées par catégorie)
 *   <folder>/<folder>_major_fr.csv  → repères marquants (aéroport, plage, hôpital…)
 * La catégorie « home » (le projet lui-même) est ignorée.
 *
 * Retourne null si le projet ou ses CSV n'existent pas. Sinon :
 *   ['total' => int, 'counts' => [slug => n, …] (décroissant),
 *    'landmarks' => [['name' => …, 'note' => …], …]]
 */
function nj_project_pois(string $id): ?array {
  $projects = nj_projects();
  if (!isset($projects[$id])) return null;
  $folder = $projects[$id]['folder'] ?? $id;
  $dir    = __DIR__ . '/../' . $folder;

  $read = static function (string $path): array {
    $rows = [];
    if (!is_file($path)) return $rows;
    if (($fh = fopen($path, 'r')) === false) return $rows;
    $header = true;
    while (($c = fgetcsv($fh, 0, ';')) !== false) {
      if ($header) { $header = false; continue; }   // saute l'en-tête
      if ($c === [null] || $c === false) continue;    // ligne vide
      $cat = strtolower(trim((string)($c[0] ?? '')));
      if ($cat === '' || $cat === 'home') continue;
      $rows[] = [
        'cat'  => $cat,
        'name' => trim((string)($c[2] ?? '')),
        'note' => trim((string)($c[9] ?? '')),
      ];
    }
    fclose($fh);
    return $rows;
  };

  $full  = $read("$dir/{$folder}_fr.csv");
  $major = $read("$dir/{$folder}_major_fr.csv");
  if (!$full && !$major) return null;

  $counts = [];
  foreach ($full as $r) {
    $counts[$r['cat']] = ($counts[$r['cat']] ?? 0) + 1;
  }
  arsort($counts);

  $landmarks = [];
  foreach ($major as $r) {
    if ($r['name'] === '') continue;
    $landmarks[] = ['name' => $r['name'], 'note' => $r['note']];
  }

  return [
    'total'     => count($full),
    'counts'    => $counts,
    'landmarks' => $landmarks,
  ];
}
