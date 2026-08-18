<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function read_projects(): array
{
    if (! file_exists(NARJISS_PROJECTS_FILE)) {
        return [];
    }

    $json = file_get_contents(NARJISS_PROJECTS_FILE);
    $projects = json_decode((string) $json, true);

    return is_array($projects) ? $projects : [];
}

function read_project_sliders(): array
{
    if (! file_exists(NARJISS_PROJECT_SLIDERS_FILE)) {
        return [];
    }

    $json = file_get_contents(NARJISS_PROJECT_SLIDERS_FILE);
    $sliders = json_decode((string) $json, true);

    return is_array($sliders) ? $sliders : [];
}

function write_projects(array $projects): void
{
    if (! is_dir(NARJISS_BACKUP_DIR)) {
        mkdir(NARJISS_BACKUP_DIR, 0775, true);
    }

    if (file_exists(NARJISS_PROJECTS_FILE)) {
        copy(NARJISS_PROJECTS_FILE, NARJISS_BACKUP_DIR . '/projects-' . date('Ymd-His') . '.json');
    }

    $json = json_encode(array_values($projects), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        throw new RuntimeException('Impossible de convertir les projets en JSON.');
    }

    file_put_contents(NARJISS_PROJECTS_FILE, $json . PHP_EOL, LOCK_EX);
}

function write_project_sliders(array $sliders): void
{
    if (! is_dir(NARJISS_BACKUP_DIR)) {
        mkdir(NARJISS_BACKUP_DIR, 0775, true);
    }

    if (file_exists(NARJISS_PROJECT_SLIDERS_FILE)) {
        copy(NARJISS_PROJECT_SLIDERS_FILE, NARJISS_BACKUP_DIR . '/project-sliders-' . date('Ymd-His') . '.json');
    }

    foreach ($sliders as $projectId => $images) {
        $images = array_values(array_filter(array_map('trim', (array) $images)));
        if ($images === []) {
            unset($sliders[$projectId]);
        } else {
            $sliders[$projectId] = $images;
        }
    }

    ksort($sliders);

    $json = json_encode($sliders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        throw new RuntimeException('Impossible de convertir les sliders en JSON.');
    }

    file_put_contents(NARJISS_PROJECT_SLIDERS_FILE, $json . PHP_EOL, LOCK_EX);
}

function find_project(array $projects, string $id): ?array
{
    foreach ($projects as $project) {
        if (($project['id'] ?? '') === $id) {
            return $project;
        }
    }

    return null;
}

function save_project(array $projects, array $project): array
{
    $found = false;

    foreach ($projects as $index => $item) {
        if (($item['id'] ?? '') === ($project['id'] ?? '')) {
            $projects[$index] = $project;
            $found = true;
            break;
        }
    }

    if (! $found) {
        $projects[] = $project;
    }

    return $projects;
}

function text_value(array $source, string $key, string $lang): string
{
    return (string) ($source[$key][$lang] ?? '');
}

function posted_project(?array $existing = null): array
{
    $existing = $existing ?: [];
    $id = trim((string) ($_POST['id'] ?? $existing['id'] ?? ''));

    if ($id === '' || ! preg_match('/^[a-z0-9_-]+$/', $id)) {
        throw new InvalidArgumentException('ID invalide. Utilise seulement lettres minuscules, chiffres, tirets et underscores.');
    }

    $project = $existing;
    $project['id'] = $id;
    $project['folder'] = trim((string) ($_POST['folder'] ?? $existing['folder'] ?? $id));
    $project['status'] = trim((string) ($_POST['status'] ?? $existing['status'] ?? 'live'));
    $project['type'] = trim((string) ($_POST['type'] ?? $existing['type'] ?? 'appartements'));
    $project['lat'] = (float) ($_POST['lat'] ?? $existing['lat'] ?? 0);
    $project['lng'] = (float) ($_POST['lng'] ?? $existing['lng'] ?? 0);
    $project['poi_count'] = (int) ($_POST['poi_count'] ?? $existing['poi_count'] ?? 0);
    $project['has_tour'] = isset($_POST['has_tour']);
    // Diffusion des prix : 'public' (défaut) ou 'on-request' → « Nous consulter ».
    $modePrix = (string) ($_POST['price_mode'] ?? $existing['price_mode'] ?? 'public');
    $project['price_mode'] = $modePrix === 'on-request' ? 'on-request' : 'public';
    $project['detail_url'] = trim((string) ($_POST['detail_url'] ?? $existing['detail_url'] ?? ''));
    /* Visite 360 : deux régimes pour un même champ.
     *
     * Visionneuse maison cochée, la saisie est un simple DOSSIER de visite
     * (« jawhara/Tour ») et l'URL est composée ici. Le front continue de ne
     * lire que `tour_url` : rien à changer dans project.js ni ailleurs.
     *
     * Décochée, la saisie reste une URL libre — lecteur 3DVista ou service
     * externe. `tour_dossier` conserve la saisie brute pour que le formulaire
     * la retrouve telle quelle au rechargement. */
    $project['tour_maison'] = isset($_POST['tour_maison']);
    $saisieTour = trim((string) ($_POST['tour_url'] ?? $existing['tour_url'] ?? ''));

    if ($project['tour_maison']) {
        // Un dossier, rien d'autre : ni protocole, ni requête, ni remontée
        // d'arborescence, qui casseraient l'URL composée.
        $dossier = trim(preg_replace('#[^A-Za-z0-9_/-]#', '', $saisieTour), '/');
        $project['tour_dossier'] = $dossier;
        $project['tour_url'] = $dossier !== '' ? 'tour-360.html?tour=' . $dossier : '';
    } else {
        $project['tour_dossier'] = '';
        $project['tour_url'] = $saisieTour;
    }
    /* Visite d'un APPARTEMENT : champ distinct de la visite du projet.
     *
     * Il pilote l'onglet 🏠 de la fiche projet et, surtout, le bouton ◎ d'un
     * lot dans la démo, qui le préfère à `tour_url` — devant un lot, la
     * visite de l'appartement est plus pertinente que celle du projet.
     * Il n'était éditable nulle part : le seul moyen de le changer était de
     * modifier data/projects.json à la main.
     *
     * Champ libre, délibérément NON gouverné par la case « visionneuse
     * maison ». Sinon le formulaire afficherait un dossier vide au premier
     * chargement — le dossier n'ayant jamais été saisi — et l'enregistrement
     * effacerait sans prévenir le lien 3DVista qui fonctionne. */
    $project['apartment_tour_url'] = trim((string) ($_POST['apartment_tour_url'] ?? $existing['apartment_tour_url'] ?? ''));
    $project['brochure_pdf'] = trim((string) ($_POST['brochure_pdf'] ?? $existing['brochure_pdf'] ?? ''));

    foreach (['fr', 'en', 'ar', 'es'] as $lang) {
        $project['name'][$lang] = trim((string) ($_POST["name_{$lang}"] ?? text_value($existing, 'name', $lang)));
        $project['location'][$lang] = trim((string) ($_POST["location_{$lang}"] ?? text_value($existing, 'location', $lang)));
        $project['description'][$lang] = trim((string) ($_POST["description_{$lang}"] ?? text_value($existing, 'description', $lang)));
    }

    $project['images']['logo'] = trim((string) ($_POST['image_logo'] ?? $existing['images']['logo'] ?? ''));
    $project['images']['hero'] = trim((string) ($_POST['image_hero'] ?? $existing['images']['hero'] ?? ''));
    $project['images']['floorplan'] = trim((string) ($_POST['image_floorplan'] ?? $existing['images']['floorplan'] ?? ''));

    $uploadDir = __DIR__ . '/../../images/projects/' . $id;
    $uploadBase = 'images/projects/' . $id;

    $logo = handle_project_upload('upload_logo', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp', 'svg']);
    if ($logo) {
        $project['images']['logo'] = $logo;
    }

    $hero = handle_project_upload('upload_hero', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp']);
    if ($hero) {
        $project['images']['hero'] = $hero;
    }

    $floorplan = handle_project_upload('upload_floorplan', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp', 'svg']);
    if ($floorplan) {
        $project['images']['floorplan'] = $floorplan;
    }

    $brochure = handle_project_upload('upload_brochure', $uploadDir, $uploadBase, ['pdf']);
    if ($brochure) {
        $project['brochure_pdf'] = $brochure;
    }

    $project['gallery'] = posted_project_gallery($id, $project['gallery'] ?? []);
    $project['panoramas'] = posted_project_panoramas($id, $project['panoramas'] ?? []);
    $project['videos'] = posted_project_videos($id, $project['videos'] ?? []);

    return $project;
}

/**
 * Vues a 360 degres du projet (cle "panoramas" de data/projects.json).
 *
 * Une ligne par vue : chemin | piece. Le nom de la piece est souvent deja
 * traduit en quatre langues dans le JSON : on ne le remplace que s'il a
 * reellement change, sinon les traductions seraient perdues a chaque
 * enregistrement — meme regle que pour les titres de videos.
 */
function posted_project_panoramas(string $projectId, array $existing): array
{
    if (! isset($_POST['panoramas']) && empty($_FILES['upload_panoramas']['name']) && empty($_POST['supprimer_panoramas'])) {
        return array_values($existing);
    }

    $uploadDir = __DIR__ . '/../../images/projects/' . $projectId . '/360';
    $uploadBase = 'images/projects/' . $projectId . '/360';
    $uploaded = handle_multiple_project_uploads('upload_panoramas', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp']);

    $previous = [];
    foreach ($existing as $item) {
        $src = is_array($item) ? (string) ($item['src'] ?? '') : (string) $item;
        if ($src !== '') {
            $previous[$src] = is_array($item) ? $item : ['src' => $src];
        }
    }

    $removed = array_filter(array_map('strval', (array) ($_POST['supprimer_panoramas'] ?? [])));
    $lines = preg_split('/\R/', (string) ($_POST['panoramas'] ?? '')) ?: [];
    $panoramas = [];
    $seen = [];

    foreach (array_merge($lines, $uploaded) as $line) {
        $parts = array_map('trim', explode('|', trim($line)));
        $src = $parts[0] ?? '';

        if ($src === '' || isset($seen[$src]) || in_array($src, $removed, true)) {
            continue;
        }

        $seen[$src] = true;
        $pano = ['src' => $src];
        $room = $parts[1] ?? '';
        $oldRoom = $previous[$src]['room'] ?? '';
        $oldFr = is_array($oldRoom) ? (string) ($oldRoom['fr'] ?? '') : (string) $oldRoom;

        if ($room === '') {
            if ($oldRoom !== '') {
                $pano['room'] = $oldRoom;
            }
        } elseif ($room === $oldFr && is_array($oldRoom)) {
            $pano['room'] = $oldRoom;   // inchange : on garde {fr,en,ar,es}
        } else {
            $pano['room'] = $room;
        }

        $panoramas[] = $pano;
    }

    return $panoramas;
}

/** Rend une vue 360 sous la forme editable "chemin | piece". */
function panorama_to_line($panorama): string
{
    if (! is_array($panorama)) {
        return (string) $panorama;
    }

    $room = $panorama['room'] ?? '';
    if (is_array($room)) {
        $room = (string) ($room['fr'] ?? reset($room) ?: '');
    }

    $line = (string) ($panorama['src'] ?? '');

    return $room !== '' ? $line . ' | ' . $room : $line;
}

/**
 * Album photos du projet (cle "gallery" de data/projects.json).
 *
 * Les chemins saisis a la main font foi, les fichiers importes s'y ajoutent.
 * Le navigateur ne sait pas lister un dossier : sans cette declaration, la
 * page medias.html ne pourrait pas deviner ce qui a ete photographie.
 */
function posted_project_gallery(string $projectId, array $existing): array
{
    if (! isset($_POST['gallery_images']) && empty($_FILES['upload_gallery_images']['name'])) {
        return array_values($existing);
    }

    $lines = preg_split('/\R/', (string) ($_POST['gallery_images'] ?? '')) ?: [];
    $images = without_removed(array_values(array_filter(array_map('trim', $lines))), 'supprimer_gallery');

    $uploadDir = __DIR__ . '/../../images/projects/' . $projectId . '/album';
    $uploadBase = 'images/projects/' . $projectId . '/album';
    $uploaded = handle_multiple_project_uploads('upload_gallery_images', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp']);

    return array_values(array_unique(array_merge($images, $uploaded)));
}

/**
 * Videos du projet (cle "videos" de data/projects.json).
 *
 * Une ligne par video : chemin.mp4 | poster.jpg | Titre. Le titre peut deja
 * exister en quatre langues dans le JSON : on ne le remplace que si le
 * back-office l'a reellement modifie, sinon les traductions seraient perdues
 * a chaque enregistrement.
 */
function posted_project_videos(string $projectId, array $existing): array
{
    if (! isset($_POST['videos']) && empty($_FILES['upload_videos']['name']) && empty($_POST['supprimer_videos'])) {
        return array_values($existing);
    }

    $uploadDir = __DIR__ . '/../../data/videos/' . $projectId;
    $uploadBase = 'data/videos/' . $projectId;

    // 200 Mo : un rush de tournage depasse largement la limite des images.
    // php.ini (upload_max_filesize / post_max_size) reste le plafond reel.
    $uploadedVideos = handle_multiple_project_uploads('upload_videos', $uploadDir, $uploadBase, ['mp4', 'webm', 'mov'], 200 * 1024 * 1024);
    $uploadedPosters = handle_multiple_project_uploads('upload_video_posters', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp']);

    $previous = [];
    foreach ($existing as $item) {
        $src = is_array($item) ? (string) ($item['src'] ?? '') : (string) $item;
        if ($src !== '') {
            $previous[$src] = is_array($item) ? $item : ['src' => $src];
        }
    }

    $videos = [];
    $lines = preg_split('/\R/', (string) ($_POST['videos'] ?? '')) ?: [];

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }

        $parts = array_map('trim', explode('|', $line));
        $src = $parts[0] ?? '';
        if ($src === '') {
            continue;
        }

        $video = ['src' => $src];
        $poster = $parts[1] ?? '';
        $title = $parts[2] ?? '';
        $old = $previous[$src] ?? [];

        if ($poster !== '') {
            $video['poster'] = $poster;
        }

        $oldTitle = $old['title'] ?? '';
        $oldFr = is_array($oldTitle) ? (string) ($oldTitle['fr'] ?? '') : (string) $oldTitle;

        if ($title === '') {
            if ($oldTitle !== '') {
                $video['title'] = $oldTitle;
            }
        } elseif ($title === $oldFr && is_array($oldTitle)) {
            // Titre inchange : on garde l'objet {fr,en,ar,es} tel quel.
            $video['title'] = $oldTitle;
        } else {
            $video['title'] = $title;
        }

        $videos[] = $video;
    }

    // Un fichier importe devient une video a part entiere, avec le poster de
    // meme nom s'il a ete depose dans la foulee.
    foreach ($uploadedVideos as $path) {
        $video = ['src' => $path];
        $base = pathinfo($path, PATHINFO_FILENAME);

        foreach ($uploadedPosters as $poster) {
            if (pathinfo($poster, PATHINFO_FILENAME) === $base) {
                $video['poster'] = $poster;
                break;
            }
        }

        $videos[] = $video;
    }

    // Deux lignes pointant le meme fichier feraient deux lecteurs identiques.
    $removed = array_filter(array_map('strval', (array) ($_POST['supprimer_videos'] ?? [])));
    $seen = [];
    $unique = [];
    foreach ($videos as $video) {
        if (isset($seen[$video['src']]) || in_array($video['src'], $removed, true)) {
            continue;
        }
        $seen[$video['src']] = true;
        $unique[] = $video;
    }

    return $unique;
}

/** Rend une video sous la forme editable "chemin | poster | titre". */
function video_to_line($video): string
{
    if (! is_array($video)) {
        return (string) $video;
    }

    $title = $video['title'] ?? '';
    if (is_array($title)) {
        $title = (string) ($title['fr'] ?? reset($title) ?: '');
    }

    $line = (string) ($video['src'] ?? '');
    $poster = (string) ($video['poster'] ?? '');

    if ($poster !== '' || $title !== '') {
        $line .= ' | ' . $poster;
    }

    if ($title !== '') {
        $line .= ' | ' . $title;
    }

    return $line;
}

function posted_slider_images(string $projectId, array $existingImages): array
{
    $postedImages = preg_split('/\R/', (string) ($_POST['slider_images'] ?? '')) ?: [];
    $images = array_values(array_filter(array_map('trim', $postedImages)));
    $images = without_removed($images, 'supprimer_slider');
    $uploadDir = __DIR__ . '/../../images/slider/' . $projectId;
    $uploadBase = 'images/slider/' . $projectId;
    $uploaded = handle_multiple_project_uploads('upload_slider_images', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp']);

    return array_values(array_unique(array_merge($images, $uploaded)));
}

/**
 * Retire les chemins dont la case « Supprimer » a ete cochee.
 *
 * Le textarea reste la source de verite : les cases ne font que retrancher, ce
 * qui evite d'avoir a tenir deux listes coherentes entre elles. Seul le lien
 * vers le media disparait ; le fichier reste sur le serveur, ou il peut servir
 * ailleurs (image hero, slider) et d'ou on peut le remettre.
 */
function without_removed(array $paths, string $field): array
{
    $removed = array_filter(array_map('strval', (array) ($_POST[$field] ?? [])));

    if ($removed === []) {
        return array_values($paths);
    }

    return array_values(array_filter($paths, static function ($path) use ($removed) {
        return ! in_array((string) $path, $removed, true);
    }));
}

function handle_project_upload(string $field, string $targetDir, string $publicBase, array $allowedExtensions, int $maxBytes = 12 * 1024 * 1024): ?string
{
    if (empty($_FILES[$field]) || ! is_array($_FILES[$field])) {
        return null;
    }

    $file = $_FILES[$field];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload impossible pour ' . $field . '.');
    }

    $originalName = (string) ($file['name'] ?? '');
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    if (! in_array($extension, $allowedExtensions, true)) {
        throw new RuntimeException('Format non autorise pour ' . $originalName . '.');
    }

    if (($file['size'] ?? 0) > $maxBytes) {
        throw new RuntimeException('Fichier trop lourd : ' . $originalName . '. Maximum ' . (int) round($maxBytes / (1024 * 1024)) . ' Mo.');
    }

    if (! is_dir($targetDir)) {
        mkdir($targetDir, 0775, true);
    }

    $baseName = pathinfo($originalName, PATHINFO_FILENAME);
    $safeName = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $baseName);
    $safeName = trim((string) $safeName, '-');
    if ($safeName === '') {
        $safeName = $field;
    }

    $filename = strtolower($safeName) . '.' . $extension;
    $target = $targetDir . '/' . $filename;
    $counter = 2;

    while (file_exists($target)) {
        $filename = strtolower($safeName) . '-' . $counter . '.' . $extension;
        $target = $targetDir . '/' . $filename;
        $counter++;
    }

    if (! move_uploaded_file((string) $file['tmp_name'], $target)) {
        throw new RuntimeException('Impossible de sauvegarder ' . $originalName . '.');
    }

    return $publicBase . '/' . $filename;
}

function handle_multiple_project_uploads(string $field, string $targetDir, string $publicBase, array $allowedExtensions, int $maxBytes = 12 * 1024 * 1024): array
{
    if (empty($_FILES[$field]) || ! is_array($_FILES[$field]) || empty($_FILES[$field]['name'])) {
        return [];
    }

    $uploaded = [];
    $names = (array) $_FILES[$field]['name'];

    foreach ($names as $index => $name) {
        if ($name === '') {
            continue;
        }

        $_FILES[$field . '_' . $index] = [
            'name' => $name,
            'type' => $_FILES[$field]['type'][$index] ?? '',
            'tmp_name' => $_FILES[$field]['tmp_name'][$index] ?? '',
            'error' => $_FILES[$field]['error'][$index] ?? UPLOAD_ERR_NO_FILE,
            'size' => $_FILES[$field]['size'][$index] ?? 0,
        ];

        $path = handle_project_upload($field . '_' . $index, $targetDir, $publicBase, $allowedExtensions, $maxBytes);

        if ($path) {
            $uploaded[] = $path;
        }

        unset($_FILES[$field . '_' . $index]);
    }

    return $uploaded;
}
