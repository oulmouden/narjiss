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

/**
 * AUCUNE taille n'est refusée : c'est le commercial qui juge de ce qui est
 * montrable. Les deux seuils ci-dessous ne servent qu'à graduer un
 * avertissement — jamais à bloquer un dépôt.
 *
 * Seuls restent rédhibitoires les fichiers qui ne sont pas des images, ou dans
 * un format que le navigateur ne saurait pas afficher.
 */

/** En deçà : l'image paraîtra floue en plein écran ou au zoom. */
const NJ_VISITE_LARGEUR_CONFORT = 2400;

/** En deçà : le rendu sera franchement dégradé, voire ce n'est pas un panorama. */
const NJ_VISITE_LARGEUR_FAIBLE = 1000;

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
  // La translittération rend « é » sous la forme "'e" selon les plateformes.
  // Sans ce nettoyage, l'apostrophe devient un séparateur et « témoin » sort
  // en « t-emoin ». On efface ces marques avant de découper.
  $s = str_replace(["'", '"', '`', '^', '~', '¨'], '', $s);
  $s = strtolower($s);
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

  // Ce qui suit informe sans refuser : la photo est exploitable, seulement
  // imparfaite. Mieux vaut le dire au dépôt qu'être surpris devant un client.
  $remarques = [];

  // Un équirectangulaire fait deux fois plus large que haut.
  if (abs($largeur / max(1, $hauteur) - 2) > NJ_VISITE_TOLERANCE_RATIO) {
    $remarques[] = 'Rapport inhabituel (' . $largeur . '×' . $hauteur .
                   ') : un panorama 360° fait normalement deux fois plus large que haut. ' .
                   'L\'image risque d\'être déformée.';
  }

  if ($largeur < NJ_VISITE_LARGEUR_FAIBLE) {
    $remarques[] = 'Définition très faible (' . $largeur . ' px de large) : le rendu ' .
                   'sera nettement dégradé. Vérifiez qu\'il s\'agit bien d\'une photo ' .
                   '360° et non d\'une vignette. La pièce est tout de même ajoutée.';
  } elseif ($largeur < NJ_VISITE_LARGEUR_CONFORT) {
    $remarques[] = 'Définition modeste (' . $largeur . ' px de large) : la pièce ' .
                   'paraîtra floue en plein écran ou au zoom. Comptez ' .
                   NJ_VISITE_LARGEUR_CONFORT . ' px ou plus pour un rendu net.';
  }

  $avertissement = implode(' ', $remarques);

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

/** Change le titre d'une visite. Le slug, lui, ne bouge jamais. */
function nj_visite_renommer(string $slug, string $titre): bool {
  $titre = trim($titre);
  if ($titre === '') return false;
  // Le slug reste figé à dessein : il nomme le dossier des photos et se
  // retrouve dans les liens déjà partagés. Le renommer casserait les deux.
  $st = nj_vdb()->prepare('UPDATE visites_360 SET titre = ?, updated_at = ? WHERE slug = ?');
  return $st->execute([substr($titre, 0, 160),
                       (new DateTimeImmutable('now'))->format('Y-m-d H:i:s'), $slug]);
}

/**
 * Retire une visite de la ligne sans rien détruire.
 *
 * On efface le seul fichier que le public lise ; photos et brouillon restent,
 * la visite redevient un brouillon qu'on pourra republier.
 */
function nj_visite_depublier(string $slug): bool {
  if (!nj_visite_slug_valide($slug)) return false;
  $fichier = nj_visite_dossier($slug) . '/tour-pannellum.json';
  if (is_file($fichier)) @unlink($fichier);
  return nj_vdb()->prepare('UPDATE visites_360 SET publiee_at = NULL, updated_at = ? WHERE slug = ?')
    ->execute([(new DateTimeImmutable('now'))->format('Y-m-d H:i:s'), $slug]);
}

/**
 * Supprime une visite : sa ligne en base ET son dossier de photos.
 *
 * Irréversible, d'où le garde-fou : on refuse d'effacer quoi que ce soit qui ne
 * se trouve pas SOUS la racine des visites, après résolution des liens
 * symboliques. Un slug malformé, un chemin qui s'échappe, et l'on ne touche à
 * rien — la ligne en base est tout de même retirée pour ne pas laisser
 * d'entrée fantôme.
 */
function nj_visite_supprimer(string $slug): bool {
  if (!nj_visite_slug_valide($slug)) return false;

  $racine = realpath(nj_visite_racine() . '/' . NJ_VISITES_DIR);
  $dossier = realpath(nj_visite_dossier($slug));

  if ($racine && $dossier && strncmp($dossier, $racine . DIRECTORY_SEPARATOR, strlen($racine) + 1) === 0) {
    nj_visite_effacer_recursif($dossier);
  }

  return nj_vdb()->prepare('DELETE FROM visites_360 WHERE slug = ?')->execute([$slug]);
}

/**
 * Efface un dossier et son contenu.
 *
 * N'est appelé qu'après la vérification de nj_visite_supprimer(). On ne suit
 * jamais un lien symbolique : on le retire tel quel, sans descendre dedans.
 */
function nj_visite_effacer_recursif(string $dossier): void {
  foreach (scandir($dossier) ?: [] as $entree) {
    if ($entree === '.' || $entree === '..') continue;
    $chemin = $dossier . '/' . $entree;
    if (is_link($chemin) || is_file($chemin)) @unlink($chemin);
    elseif (is_dir($chemin)) nj_visite_effacer_recursif($chemin);
  }
  @rmdir($dossier);
}

/** Poids maximal d'une icône de passage. Au-delà, ce n'est plus une icône. */
const NJ_VISITE_ICONE_MAX = 262144; // 256 Ko

/**
 * Range une icône de passage (la flèche ou le pictogramme d'une pastille).
 *
 * Rien à voir avec un panorama : ni rapport 2:1, ni taille minimale. En
 * revanche on refuse le SVG. Il s'agit d'un document, pas d'une image : il peut
 * embarquer du script, et rien ne garantit qu'il ne sera jamais servi ailleurs
 * que dans une balise <img> — PNG et WebP ne posent pas cette question.
 *
 * @return array{fichier:string,largeur:int,hauteur:int}
 * @throws RuntimeException message destiné à l'utilisateur.
 */
function nj_visite_icone(string $slug, array $envoi): array {
  if (($envoi['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    throw new RuntimeException('Envoi interrompu.');
  }
  $tmp = $envoi['tmp_name'] ?? '';
  if (!is_uploaded_file($tmp)) throw new RuntimeException('Fichier invalide.');
  if (filesize($tmp) > NJ_VISITE_ICONE_MAX) {
    throw new RuntimeException('Icône trop lourde (256 Ko au plus).');
  }

  $info = @getimagesize($tmp);
  if (!$info) throw new RuntimeException('Ce fichier n\'est pas une image.');
  if (!in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
    throw new RuntimeException('Icône en PNG ou WebP (le SVG n\'est pas accepté).');
  }

  $dossier = nj_visite_dossier($slug) . '/icones';
  if (!is_dir($dossier) && !mkdir($dossier, 0775, true)) {
    throw new RuntimeException('Dossier d\'icônes non créable.');
  }

  $nom = nj_visite_slug(pathinfo((string) ($envoi['name'] ?? 'icone'), PATHINFO_FILENAME))
       . '-' . substr(bin2hex(random_bytes(3)), 0, 4)
       . ($info[2] === IMAGETYPE_PNG ? '.png' : '.webp');

  if (!move_uploaded_file($tmp, $dossier . '/' . $nom)) {
    throw new RuntimeException('Enregistrement impossible.');
  }

  // Une pastille fait 44 px : inutile d'en télécharger 3000. Un aplat compresse
  // si bien qu'il passe sous la limite de poids tout en restant démesuré, d'où
  // ce garde-fou sur les DIMENSIONS. On réduit plutôt que de refuser.
  $dim = nj_visite_reduire_icone($dossier . '/' . $nom, $info[2]);

  return ['fichier' => 'icones/' . $nom, 'largeur' => $dim[0], 'hauteur' => $dim[1]];
}

/** Côté maximal d'une icône conservée. */
const NJ_VISITE_ICONE_COTE = 256;

/**
 * Ramène une icône à une taille raisonnable, en préservant la transparence.
 *
 * @return array{0:int,1:int} dimensions finales.
 */
function nj_visite_reduire_icone(string $chemin, int $type): array {
  $src = @imagecreatefromstring((string) file_get_contents($chemin));
  if (!$src) return [0, 0];

  $l = imagesx($src); $h = imagesy($src);
  if (max($l, $h) <= NJ_VISITE_ICONE_COTE) { imagedestroy($src); return [$l, $h]; }

  $ratio = NJ_VISITE_ICONE_COTE / max($l, $h);
  $nl = max(1, (int) round($l * $ratio));
  $nh = max(1, (int) round($h * $ratio));

  $dst = imagecreatetruecolor($nl, $nh);
  // Sans ces deux appels, le fond transparent d'une flèche PNG virerait au noir.
  imagealphablending($dst, false);
  imagesavealpha($dst, true);
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $nl, $nh, $l, $h);

  if ($type === IMAGETYPE_WEBP) imagewebp($dst, $chemin, 90);
  else imagepng($dst, $chemin, 6);

  imagedestroy($src);
  imagedestroy($dst);
  return [$nl, $nh];
}

/** Icônes déjà déposées pour une visite, réutilisables d'un passage à l'autre. */
function nj_visite_icones(string $slug): array {
  $dossier = nj_visite_dossier($slug) . '/icones';
  if (!is_dir($dossier)) return [];
  $liste = [];
  foreach (scandir($dossier) ?: [] as $f) {
    if (preg_match('/\.(png|webp)$/i', $f)) $liste[] = 'icones/' . $f;
  }
  return $liste;
}

/** Supprime une photo et sa vignette (appelé au retrait d'une pièce). */
function nj_visite_photo_supprimer(string $slug, string $relatif): void {
  // On n'accepte qu'un chemin que l'on a nous-mêmes produit.
  if (!preg_match('#^photos/[a-z0-9][a-z0-9.-]{0,80}$#', $relatif)) return;
  $chemin = nj_visite_dossier($slug) . '/' . $relatif;
  if (is_file($chemin)) @unlink($chemin);
}
