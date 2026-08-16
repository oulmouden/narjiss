<?php

declare(strict_types=1);

/**
 * api/visites.php — éditeur de visites 360 pour les commerciaux.
 *
 * Toutes les actions exigent une session agent : c'est l'espace commercial,
 * pas l'administration. Un commercial ne voit et ne modifie que ses propres
 * visites ; gestionnaires et superviseurs voient tout.
 *
 * Actions (?action=) :
 *   list     — mes visites
 *   create   — nouvelle visite {titre, projet}
 *   get      — brouillon complet d'une visite {slug}
 *   upload   — ajoute une pièce à partir d'une photo 360 {slug} + fichier
 *   save     — enregistre le brouillon {slug, brouillon}
 *   publish  — écrit tour-pannellum.json {slug}
 *
 * La publication est séparée de l'enregistrement à dessein : tant qu'on n'a pas
 * publié, une visite en cours de montage n'est visible de personne.
 */

require __DIR__ . '/agents-lib.php';
require __DIR__ . '/visites-lib.php';

header('Content-Type: application/json; charset=utf-8');

function nj_v_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** Visite demandée + contrôle de propriété, ou arrêt immédiat. */
function nj_v_visite_autorisee(array $moi): array {
  $slug = (string) ($_POST['slug'] ?? $_GET['slug'] ?? '');
  $visite = nj_visite_get($slug);
  if (!$visite) nj_v_json(['ok' => false, 'error' => 'Visite introuvable.'], 404);
  if (!nj_visite_autorise($visite, $moi)) {
    nj_v_json(['ok' => false, 'error' => 'Cette visite ne vous appartient pas.'], 403);
  }
  return $visite;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$post   = $_SERVER['REQUEST_METHOD'] === 'POST';

try {
  $moi = nj_agent_require_json(); // 401 si non connecté

  switch ($action) {

    case 'list': {
      nj_v_json(['ok' => true, 'visites' => nj_visite_liste($moi)]);
    }

    case 'create': {
      if (!$post) nj_v_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $titre  = trim((string) ($_POST['titre'] ?? ''));
      $projet = preg_replace('/[^a-z0-9_]/', '', strtolower((string) ($_POST['projet'] ?? '')));
      $v = nj_visite_creer($titre, (string) $projet, (int) $moi['id']);
      nj_v_json(['ok' => true] + $v);
    }

    case 'get': {
      $visite = nj_v_visite_autorisee($moi);
      $brouillon = json_decode((string) $visite['brouillon'], true);
      if (!is_array($brouillon)) $brouillon = [];

      /* `scenes` DOIT repartir en objet JSON, jamais en tableau.
       *
       * PHP décode `{}` en tableau vide, qui se ré-encode en `[]`. Le
       * navigateur y poserait alors ses pièces comme propriétés nommées d'un
       * Array : Object.keys les voit — l'écran semble juste — mais
       * JSON.stringify d'un tableau IGNORE les propriétés non indexées, et
       * les pièces s'évaporaient à l'enregistrement. */
      if (empty($brouillon['scenes'])) $brouillon['scenes'] = new stdClass();

      nj_v_json([
        'ok'         => true,
        'slug'       => $visite['slug'],
        'titre'      => $visite['titre'],
        'projet'     => $visite['projet'],
        'publiee_at' => $visite['publiee_at'],
        'brouillon'  => $brouillon,
        'url'        => 'tour-360.html?tour=' . NJ_VISITES_DIR . '/' . $visite['slug'],
      ]);
    }

    /* Une photo = une pièce. On range le fichier, on fabrique la vignette, et
       on rend de quoi ajouter la scène au brouillon — que le client renverra
       via `save`. L'API ne devine pas le montage, elle le sert. */
    case 'upload': {
      if (!$post) nj_v_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $visite = nj_v_visite_autorisee($moi);
      if (empty($_FILES['photo'])) nj_v_json(['ok' => false, 'error' => 'Aucune photo.'], 400);
      try {
        $photo = nj_visite_photo($visite['slug'], $_FILES['photo']);
      } catch (RuntimeException $e) {
        nj_v_json(['ok' => false, 'error' => $e->getMessage()], 400);
      }
      nj_v_json(['ok' => true] + $photo);
    }

    case 'save': {
      if (!$post) nj_v_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $visite = nj_v_visite_autorisee($moi);
      $brouillon = json_decode((string) ($_POST['brouillon'] ?? ''), true);
      if (!is_array($brouillon) || !isset($brouillon['scenes'])) {
        nj_v_json(['ok' => false, 'error' => 'Brouillon illisible.'], 400);
      }
      nj_v_json(['ok' => nj_visite_sauver($visite['slug'], $brouillon)]);
    }

    case 'publish': {
      if (!$post) nj_v_json(['ok' => false, 'error' => 'POST requis.'], 405);
      $visite = nj_v_visite_autorisee($moi);
      // On publie ce qui a été enregistré, jamais un état envoyé au vol : le
      // fichier public reflète donc toujours le dernier brouillon sauvegardé.
      $brouillon = json_decode((string) $visite['brouillon'], true);
      if (!is_array($brouillon) || empty($brouillon['scenes'])) {
        nj_v_json(['ok' => false, 'error' => 'Ajoutez au moins une pièce avant de publier.'], 400);
      }
      if (!nj_visite_publier($visite['slug'], $brouillon)) {
        nj_v_json(['ok' => false, 'error' => 'Publication impossible.'], 500);
      }
      nj_v_json([
        'ok'  => true,
        'url' => 'tour-360.html?tour=' . NJ_VISITES_DIR . '/' . $visite['slug'],
      ]);
    }

    default:
      nj_v_json(['ok' => false, 'error' => 'Action inconnue.'], 400);
  }
} catch (Throwable $e) {
  nj_v_json(['ok' => false, 'error' => 'Erreur serveur.'], 500);
}
