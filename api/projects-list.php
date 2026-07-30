<?php
/**
 * api/projects-list.php — catalogue résumé de TOUS les projets Narjiss.
 *
 * Consommé par agent.py au démarrage de chaque session : l'hôtesse d'accueil
 * connaît ainsi l'ensemble de l'offre (et peut citer / comparer les projets),
 * pas seulement le bureau de vente dans lequel elle se trouve.
 *
 * N'expose PAS les prix : price_mode vaut « on-request » et les tarifs ne sont
 * pas fiabilisés dans les données. Sur les prix, l'hôtesse renvoie vers un
 * conseiller (voir agent.py). Le reste (typologies, surfaces, disponibilité,
 * livraison, équipements) provient de data/projects.json et peut être cité.
 *
 * Pendant : api/project-info.php renvoie UN projet ; celui-ci les renvoie TOUS.
 */
require __DIR__ . '/data.php';
header('Content-Type: application/json; charset=utf-8');

$out = [];
foreach (nj_projects() as $id => $p) {
  $location = $p['location']['fr'] ?? '';
  $parts    = array_map('trim', explode(',', $location));
  $city     = $parts ? end($parts) : '';

  // Typologies : on conserve labels, pièces, surfaces et disponibilité ;
  // on ne recopie AUCUN champ de prix éventuel.
  $typologies = [];
  foreach (($p['typologies'] ?? []) as $t) {
    $typologies[] = [
      'label'            => $t['label']       ?? '',
      'rooms'            => $t['rooms']        ?? null,
      'surface_min'      => $t['surface_min']  ?? null,
      'surface_max'      => $t['surface_max']  ?? null,
      'units_available'  => $t['units_available'] ?? null,
    ];
  }

  $out[] = [
    'id'               => $id,
    'name'             => $p['name']            ?? ['fr' => $id],
    'location'         => $location,
    'city'             => $city ?: 'Agadir',
    'type'             => $p['type']            ?? '',
    'status'           => $p['status']          ?? '',
    'commercialization'=> $p['commercialization'] ?? '',
    'standing'         => $p['standing']        ?? '',
    'delivery'         => $p['delivery']        ?? null,
    'has_tour'         => !empty($p['has_tour']),
    'typologies'       => $typologies,
    'features'         => $p['features']        ?? [],
  ];
}

echo json_encode($out, JSON_UNESCAPED_UNICODE);
