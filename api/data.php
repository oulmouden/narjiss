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

/** Libellé lisible (pluriel FR) d'une catégorie de POI ; repli sur le slug. */
function nj_poi_label(string $slug): string {
  static $LABELS = [
    'ecole' => 'écoles', 'ecole_int' => 'écoles internationales',
    'pharmacie' => 'pharmacies', 'banque' => 'banques',
    'transport' => 'arrêts de transport', 'gare' => 'gares',
    'cafe' => 'cafés', 'restos' => 'restaurants',
    'magasin' => 'commerces', 'mall' => 'centres commerciaux',
    'sante' => 'centres de santé', 'hopital' => 'hôpitaux',
    'mosquee' => 'mosquées', 'loisir' => 'espaces de loisir',
    'admin' => 'services administratifs', 'police' => 'postes de police',
    'stade' => 'stades', 'plage' => 'plages', 'aeroport' => 'aéroport',
    'medina' => 'souks / médina', 'hammam' => 'hammams',
    'autoroute' => 'accès autoroute',
  ];
  return $LABELS[$slug] ?? $slug;
}

/**
 * Lit un CSV de POI (délimiteur « ; », en-tête ignoré, catégorie « home »
 * exclue). Retourne [['cat','name','address','note'], …].
 */
function nj_read_poi_csv(string $path): array {
  $rows = [];
  if (!is_file($path) || ($fh = fopen($path, 'r')) === false) return $rows;
  $header = true;
  while (($c = fgetcsv($fh, 0, ';')) !== false) {
    if ($header) { $header = false; continue; }
    if ($c === [null] || $c === false) continue;
    $cat = strtolower(trim((string)($c[0] ?? '')));
    if ($cat === '' || $cat === 'home') continue;
    $rows[] = [
      'cat'     => $cat,
      'name'    => trim((string)($c[2] ?? '')),
      'address' => trim((string)($c[3] ?? '')),
      'note'    => trim((string)($c[9] ?? '')),
    ];
  }
  fclose($fh);
  return $rows;
}

/** Dossier des CSV d'un projet, ou null s'il est inconnu. */
function nj_project_dir(string $id): ?string {
  $projects = nj_projects();
  if (!isset($projects[$id])) return null;
  $folder = $projects[$id]['folder'] ?? $id;
  return __DIR__ . '/../' . $folder . '/' . $folder;
}

/**
 * POI autour d'un projet, RÉSUMÉ pour le catalogue de l'hôtesse.
 *   <folder>_fr.csv        → commodités du quartier (comptées par catégorie)
 *   <folder>_major_fr.csv  → repères marquants (aéroport, plage, hôpital…)
 * Retourne null si projet/CSV absents. Sinon :
 *   ['total' => int, 'counts' => [slug => n] (décroissant),
 *    'landmarks' => [['name','note'], …]]
 */
function nj_project_pois(string $id): ?array {
  $base = nj_project_dir($id);
  if ($base === null) return null;

  $full  = nj_read_poi_csv("{$base}_fr.csv");
  $major = nj_read_poi_csv("{$base}_major_fr.csv");
  if (!$full && !$major) return null;

  $counts = [];
  foreach ($full as $r) $counts[$r['cat']] = ($counts[$r['cat']] ?? 0) + 1;
  arsort($counts);

  $landmarks = [];
  foreach ($major as $r) {
    if ($r['name'] !== '') $landmarks[] = ['name' => $r['name'], 'note' => $r['note']];
  }

  return ['total' => count($full), 'counts' => $counts, 'landmarks' => $landmarks];
}

/**
 * POI NOMMÉS autour d'un projet, groupés par catégorie — pour l'outil
 * lister_pois de l'hôtesse (énumération réelle : « les écoles », etc.).
 *
 * Retourne null si projet/CSV absents. Sinon :
 *   ['total' => int,
 *    'groups' => [['slug','label','items' => [['name','address','note'], …]], …]]
 * (groupes triés par nombre décroissant).
 */
function nj_project_pois_named(string $id): ?array {
  $base = nj_project_dir($id);
  if ($base === null) return null;

  $full = nj_read_poi_csv("{$base}_fr.csv");
  if (!$full) return null;

  $by = [];
  foreach ($full as $r) {
    if ($r['name'] === '') continue;
    $by[$r['cat']][] = ['name' => $r['name'], 'address' => $r['address'], 'note' => $r['note']];
  }
  uasort($by, static fn($a, $b) => count($b) <=> count($a));

  $groups = [];
  foreach ($by as $slug => $items) {
    $groups[] = ['slug' => $slug, 'label' => nj_poi_label($slug), 'items' => $items];
  }

  return ['total' => count($full), 'groups' => $groups];
}
