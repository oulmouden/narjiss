<?php
/**
 * api/project-pois.php — POI NOMMÉS d'un projet, groupés par catégorie.
 *
 * Consommé par l'outil lister_pois de l'hôtesse IA (agent.py) pour énumérer
 * les points d'intérêt réels d'un projet (« liste-moi les écoles », etc.).
 * project-info.php donne le nom/ville ; projects-list.php le catalogue résumé ;
 * celui-ci fournit le détail nommé, à la demande.
 *
 * Param « project » : id de projet (ex. jawhara) OU nom (ex. « Tazroute »,
 * recherche insensible à la casse dans les 4 langues). Défaut : rien → 404.
 */
require __DIR__ . '/data.php';
header('Content-Type: application/json; charset=utf-8');

$projects = nj_projects();
$q = trim((string)($_GET['project'] ?? ''));

// 1) tentative directe par id (slug normalisé).
$id  = preg_replace('/[^a-z0-9_]/', '', strtolower($q));
if ($id === '' || !isset($projects[$id])) {
  // 2) sinon, recherche par nom (sous-chaîne, toutes langues).
  $id = '';
  $needle = mb_strtolower($q);
  if ($needle !== '') {
    foreach ($projects as $pid => $p) {
      foreach (($p['name'] ?? []) as $n) {
        if ($n !== '' && mb_strpos(mb_strtolower((string)$n), $needle) !== false) { $id = $pid; break 2; }
      }
    }
  }
}

if ($id === '' || !isset($projects[$id])) {
  http_response_code(404);
  echo json_encode(['error' => 'Projet inconnu.'], JSON_UNESCAPED_UNICODE);
  exit;
}

$named = nj_project_pois_named($id);
echo json_encode([
  'id'     => $id,
  'name'   => nj_project_name($id, 'fr'),
  'total'  => $named['total']  ?? 0,
  'groups' => $named['groups'] ?? [],
], JSON_UNESCAPED_UNICODE);
