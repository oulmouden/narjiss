<?php

declare(strict_types=1);

/**
 * api/visites-lib.php — visites 360 montées dans le back-office commercial.
 *
 * Jusqu'ici une visite naissait forcément de 3DVista, un logiciel de bureau :
 * un commercial ne pouvait pas en produire seul. Ici, il téléverse ses photos
 * équirectangulaires — celles que sort un Ricoh Theta — nomme ses pièces et
 * pose les passages. Aucun tuilage, aucun ré-encodage du panorama : Pannellum
 * lit ces images telles quelles (voir GUIDE/tour-pannellum.md).
 *
 * BROUILLON EN BASE, PUBLICATION SUR DISQUE
 * Le travail en cours vit dans la colonne `brouillon`. Le fichier
 * `tour-pannellum.json` — le seul que la visionneuse lise — n'est écrit qu'à la
 * publication. Une visite à moitié montée n'est donc jamais visible du public,
 * et « publier » veut dire quelque chose.
 *
 * PROPRIÉTÉ
 * Chaque visite appartient au commercial qui l'a créée. Gestionnaires et
 * superviseurs voient tout, un commercial ne voit que les siennes — le socle
 * dont on aura besoin le jour où des clients extérieurs monteront leurs propres
 * visites.
 */

require_once __DIR__ . '/db.php';

/** Racine des visites montées maison, relative à la racine du site. */
const NJ_VISITES_DIR = 'visites';

/** Côté minimal d'un panorama exploitable (largeur). */
const NJ_VISITE_MIN_LARGEUR = 1600;

/** Tolérance sur le rapport 2:1 d'une image équirectangulaire. */
const NJ_VISITE_TOLERANCE_RATIO = 0.04;

/** Largeur des vignettes engendrées à l'envoi. */
const NJ_VISITE_VIGNETTE = 208;

/** Chemin absolu de la racine du site (ce fichier est dans api/). */
function nj_visite_racine(): string {
  return dirname(__DIR__);
}

/** Connexion PDO + garantie que la table des visites 360 existe. */
function nj_vdb(): PDO {
  static $ready = false;
  $pdo = nj_db();
  if ($ready) return $pdo;

  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS visites_360 (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(64)  NOT NULL,
  titre       VARCHAR(160) NOT NULL,
  projet      VARCHAR(64)  NOT NULL DEFAULT '',
  agent_id    INT UNSIGNED NOT NULL,
  brouillon   LONGTEXT     NULL,
  publiee_at  DATETIME     NULL,
  created_at  DATETIME     NOT NULL,
  updated_at  DATETIME     NOT NULL,
  UNIQUE KEY uniq_slug (slug),
  INDEX idx_agent (agent_id),
  INDEX idx_projet (projet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  $ready = true;
  return $pdo;
}

/**
 * Fabrique un identifiant d'URL à partir d'un titre.
 *
 * Il sert de nom de DOSSIER : d'où le filtrage strict, aucun point ni barre
 * oblique ne doit pouvoir s'y glisser.
 */
function nj_visite_slug(string $titre): string {
  $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $titre) ?: $titre;
  $s = strtolower((string) $s);
  $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
  $s = trim($s, '-');
  return $s !== '' ? substr($s, 0, 48) : 'visite';
}

/** Slug reçu d'un client : on n'accepte que ce qu'on a pu produire. */
function nj_visite_slug_valide(string $slug): bool {
  return (bool) preg_match('/^[a-z0-9][a-z0-9-]{0,63}$/', $slug);
}

/** Dossier absolu d'une visite. */
function nj_visite_dossier(string $slug): string {
  return nj_visite_racine() . '/' . NJ_VISITES_DIR . '/' . $slug;
}

/**
 * Crée une visite et son dossier.
 *
 * @return array{slug:string,titre:string}
 * @throws RuntimeException si le dossier n'est pas créable.
 */
function nj_visite_creer(string $titre, string $projet, int $agentId): array {
  $pdo = nj_vdb();
  $titre = trim($titre) !== '' ? trim($titre) : 'Visite sans titre';

  // Le slug doit rester unique : on suffixe tant que la place est prise.
  $base = nj_visite_slug($titre);
  $slug = $base;
  $n = 2;
  $st = $pdo->prepare('SELECT 1 FROM visites_360 WHERE slug = ?');
  while (true) {
    $st->execute([$slug]);
    if (!$st->fetchColumn() && !is_dir(nj_visite_dossier($slug))) break;
    $slug = substr($base, 0, 44) . '-' . $n++;
  }

  $dossier = nj_visite_dossier($slug);
  if (!is_dir($dossier . '/photos') && !mkdir($dossier . '/photos', 0775, true)) {
    throw new RuntimeException('Dossier de visite non créable.');
  }

  $maintenant = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
  $brouillon = json_encode([
    'source'     => $slug,
    'firstScene' => null,
    'scenes'     => new stdClass(),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

  $pdo->prepare(
    'INSERT INTO visites_360 (slug, titre, projet, agent_id, brouillon, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
  )->execute([$slug, $titre, $projet, $agentId, $brouillon, $maintenant, $maintenant]);

  return ['slug' => $slug, 'titre' => $titre];
}

/** Lit une visite, ou null. */
function nj_visite_get(string $slug): ?array {
  if (!nj_visite_slug_valide($slug)) return null;
  $st = nj_vdb()->prepare('SELECT * FROM visites_360 WHERE slug = ?');
  $st->execute([$slug]);
  $row = $st->fetch();
  return $row ?: null;
}

/**
 * Un agent a-t-il le droit de toucher à cette visite ?
 *
 * Le commercial ne voit que les siennes ; gestionnaire et superviseur voient
 * tout, comme ailleurs dans l'espace agent.
 */
function nj_visite_autorise(?array $visite, array $agent): bool {
  if (!$visite) return false;
  if (in_array($agent['role'] ?? '', ['gestionnaire', 'superviseur'], true)) return true;
  return (int) $visite['agent_id'] === (int) $agent['id'];
}

/** Visites accessibles à un agent, les plus récentes d'abord. */
function nj_visite_liste(array $agent): array {
  $tout = in_array($agent['role'] ?? '', ['gestionnaire', 'superviseur'], true);
  $sql = 'SELECT slug, titre, projet, agent_id, publiee_at, updated_at FROM visites_360';
  $args = [];
  if (!$tout) { $sql .= ' WHERE agent_id = ?'; $args[] = (int) $agent['id']; }
  $sql .= ' ORDER BY updated_at DESC LIMIT 200';
  $st = nj_vdb()->prepare($sql);
  $st->execute($args);
  return $st->fetchAll();
}

/** Enregistre le brouillon. */
function nj_visite_sauver(string $slug, array $brouillon): bool {
  $st = nj_vdb()->prepare('UPDATE visites_360 SET brouillon = ?, updated_at = ? WHERE slug = ?');
  return $st->execute([
    json_encode($brouillon, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    (new DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
    $slug,
  ]);
}

/**
 * Écrit `tour-pannellum.json` : la visite devient visible du public.
 *
 * C'est le seul moment où le disque reçoit quelque chose que la visionneuse
 * lira. Tant qu'on n'a pas publié, le travail reste en base.
 */
function nj_visite_publier(string $slug, array $brouillon): bool {
  $scenes = $brouillon['scenes'] ?? [];
  if (!$scenes) return false; // rien à montrer

  $fichier = nj_visite_dossier($slug) . '/tour-pannellum.json';
  $ok = file_put_contents(
    $fichier,
    json_encode($brouillon, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
  );
  if ($ok === false) return false;

  nj_vdb()->prepare('UPDATE visites_360 SET publiee_at = ?, updated_at = ? WHERE slug = ?')
    ->execute([
      (new DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
      (new DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
      $slug,
    ]);
  return true;
}

/**
 * Range une photo envoyée et en tire une vignette.
 *
 * Le contrôle porte sur les PIXELS, pas sur le nom ni sur le type déclaré :
 * getimagesize échoue sur tout ce qui n'est pas une image, quel que soit le
 * `Content-Type` annoncé par le navigateur.
 *
 * @return array{fichier:string,vignette:string,largeur:int,hauteur:int,avertissement:string}
 * @throws RuntimeException message destiné à l'utilisateur.
 */
function nj_visite_photo(string $slug, array $envoi): array {
  if (($envoi['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    throw new RuntimeException('Envoi interrompu ou fichier trop lourd.');
  }
  $tmp = $envoi['tmp_name'] ?? '';
  if (!is_uploaded_file($tmp)) throw new RuntimeException('Fichier invalide.');

  $info = @getimagesize($tmp);
  if (!$info) throw new RuntimeException('Ce fichier n\'est pas une image.');

  [$largeur, $hauteur] = $info;
  $type = $info[2];
  if (!in_array($type, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
    throw new RuntimeException('Format non accepté : JPEG, PNG ou WebP.');
  }
  if ($largeur < NJ_VISITE_MIN_LARGEUR) {
    throw new RuntimeException('Panorama trop petit (' . $largeur . ' px de large, ' .
                               NJ_VISITE_MIN_LARGEUR . ' minimum).');
  }

  // Un équirectangulaire fait deux fois plus large que haut. On avertit sans
  // refuser : une photo légèrement rognée reste affichable.
  $avertissement = '';
  if (abs($largeur / max(1, $hauteur) - 2) > NJ_VISITE_TOLERANCE_RATIO) {
    $avertissement = 'Rapport inhabituel (' . $largeur . '×' . $hauteur .
                     ') : un panorama 360° fait normalement deux fois plus large que haut. ' .
                     'L\'image risque d\'être déformée.';
  }

  $dossier = nj_visite_dossier($slug) . '/photos';
  if (!is_dir($dossier) && !mkdir($dossier, 0775, true)) {
    throw new RuntimeException('Dossier photos non créable.');
  }

  $base = nj_visite_slug(pathinfo((string) ($envoi['name'] ?? 'photo'), PATHINFO_FILENAME));
  $nom = $base . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
  $ext = $type === IMAGETYPE_PNG ? 'png' : ($type === IMAGETYPE_WEBP ? 'webp' : 'jpg');
  $fichier = $nom . '.' . $ext;

  if (!move_uploaded_file($tmp, $dossier . '/' . $fichier)) {
    throw new RuntimeException('Enregistrement impossible.');
  }

  return [
    'fichier'       => 'photos/' . $fichier,
    'vignette'      => nj_visite_vignette($dossier, $fichier, $nom),
    'largeur'       => $largeur,
    'hauteur'       => $hauteur,
    'avertissement' => $avertissement,
  ];
}

/**
 * Réduit une vignette à côté de la photo.
 *
 * Sans elle, le bandeau de la visionneuse retombe sur le panorama pleine
 * taille : quelques centaines de kilo-octets par pièce, pour une image de
 * 104 px de large. Rendue vide si GD manque — la visionneuse sait retomber
 * sur le panorama.
 */
function nj_visite_vignette(string $dossier, string $fichier, string $nom): string {
  if (!function_exists('imagecreatetruecolor')) return '';
  $chemin = $dossier . '/' . $fichier;

  try {
    $src = @imagecreatefromstring((string) file_get_contents($chemin));
    if (!$src) return '';

    $l = imagesx($src); $h = imagesy($src);
    $largeur = NJ_VISITE_VIGNETTE;
    $hauteur = (int) max(1, round($h * $largeur / max(1, $l)));

    $dst = imagecreatetruecolor($largeur, $hauteur);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $largeur, $hauteur, $l, $h);

    $vignette = $nom . '-vignette.jpg';
    imagejpeg($dst, $dossier . '/' . $vignette, 78);
    imagedestroy($src);
    imagedestroy($dst);
    return 'photos/' . $vignette;
  } catch (Throwable $e) {
    return ''; // la vignette est un confort, jamais un blocage
  }
}

/** Supprime une photo et sa vignette (appelé au retrait d'une pièce). */
function nj_visite_photo_supprimer(string $slug, string $relatif): void {
  // On n'accepte qu'un chemin que l'on a nous-mêmes produit.
  if (!preg_match('#^photos/[a-z0-9][a-z0-9.-]{0,80}$#', $relatif)) return;
  $chemin = nj_visite_dossier($slug) . '/' . $relatif;
  if (is_file($chemin)) @unlink($chemin);
}
