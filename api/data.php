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
