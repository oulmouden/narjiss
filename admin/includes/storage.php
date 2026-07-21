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
    $project['detail_url'] = trim((string) ($_POST['detail_url'] ?? $existing['detail_url'] ?? ''));
    $project['tour_url'] = trim((string) ($_POST['tour_url'] ?? $existing['tour_url'] ?? ''));
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

    return $project;
}

function posted_slider_images(string $projectId, array $existingImages): array
{
    $postedImages = preg_split('/\R/', (string) ($_POST['slider_images'] ?? '')) ?: [];
    $images = array_values(array_filter(array_map('trim', $postedImages)));
    $uploadDir = __DIR__ . '/../../images/slider/' . $projectId;
    $uploadBase = 'images/slider/' . $projectId;
    $uploaded = handle_multiple_project_uploads('upload_slider_images', $uploadDir, $uploadBase, ['jpg', 'jpeg', 'png', 'webp']);

    return array_values(array_unique(array_merge($images, $uploaded)));
}

function handle_project_upload(string $field, string $targetDir, string $publicBase, array $allowedExtensions): ?string
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

    if (($file['size'] ?? 0) > 12 * 1024 * 1024) {
        throw new RuntimeException('Fichier trop lourd : ' . $originalName . '. Maximum 12 Mo.');
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

function handle_multiple_project_uploads(string $field, string $targetDir, string $publicBase, array $allowedExtensions): array
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

        $path = handle_project_upload($field . '_' . $index, $targetDir, $publicBase, $allowedExtensions);

        if ($path) {
            $uploaded[] = $path;
        }

        unset($_FILES[$field . '_' . $index]);
    }

    return $uploaded;
}
