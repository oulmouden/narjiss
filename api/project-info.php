<?php
/**
 * api/project-info.php — fiche minimale d'un projet, consommée par agent.py
 * pour personnaliser l'accueil (nom du projet, ville, types de biens).
 *
 * Équivalent narjiss de api/local-info.php côté Domiciliation, en lisant
 * data/projects.json au lieu d'une base de données.
 */
require __DIR__ . '/livekit.php';
header('Content-Type: application/json; charset=utf-8');

$id = preg_replace('/[^a-z0-9_]/', '', strtolower($_GET['id'] ?? ''));
$projects = nj_projects();

if ($id === '' || !isset($projects[$id])) {
  http_response_code(404);
  echo json_encode(['error' => 'Projet inconnu.']);
  exit;
}

$p = $projects[$id];

// « Dcheira El Jihadia, Agadir » → ville = dernier segment.
$location = $p['location']['fr'] ?? '';
$parts    = array_map('trim', explode(',', $location));
$city     = $parts ? end($parts) : '';

echo json_encode([
  'id'       => $id,
  'name'     => $p['name']['fr'] ?? $id,
  'city'     => $city ?: 'Agadir',
  'location' => $location,
  'type'     => $p['type'] ?? '',
  'status'   => $p['status'] ?? '',
], JSON_UNESCAPED_UNICODE);
