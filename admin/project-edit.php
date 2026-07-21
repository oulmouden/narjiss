<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();
$projectSliders = read_project_sliders();
$id = trim((string) ($_GET['id'] ?? $_POST['original_id'] ?? ''));
$project = $id !== '' ? find_project($projects, $id) : null;
$sliderImages = $id !== '' ? ($projectSliders[$id] ?? []) : [];
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $project = posted_project($project);
        $projects = save_project($projects, $project);
        $projectSliders[$project['id']] = posted_slider_images($project['id'], $projectSliders[$project['id']] ?? []);
        write_projects($projects);
        write_project_sliders($projectSliders);
        set_flash('Projet enregistre.');
        header('Location: projects.php');
        exit;
    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }
}

$project = $project ?: [
    'id' => '',
    'folder' => '',
    'status' => 'live',
    'type' => 'appartements',
    'lat' => 0,
    'lng' => 0,
    'poi_count' => 0,
    'has_tour' => false,
    'detail_url' => '',
    'tour_url' => '',
    'brochure_pdf' => '',
    'name' => ['fr' => '', 'en' => '', 'ar' => '', 'es' => ''],
    'location' => ['fr' => '', 'en' => '', 'ar' => '', 'es' => ''],
    'description' => ['fr' => '', 'en' => '', 'ar' => '', 'es' => ''],
    'images' => ['logo' => '', 'hero' => '', 'floorplan' => ''],
];

admin_header($id ? 'Modifier projet' : 'Nouveau projet');
?>
<h1><?= $id ? 'Modifier le projet' : 'Nouveau projet' ?></h1>

<?php if ($error): ?>
    <div class="notice error"><?= htmlspecialchars($error) ?></div>
<?php endif; ?>

<form method="post" class="panel" enctype="multipart/form-data">
    <input type="hidden" name="original_id" value="<?= htmlspecialchars($id) ?>">

    <div class="grid">
        <label>
            ID
            <input name="id" value="<?= htmlspecialchars($project['id']) ?>" required pattern="[a-z0-9_-]+">
        </label>
        <label>
            Dossier
            <input name="folder" value="<?= htmlspecialchars($project['folder'] ?? '') ?>">
        </label>
        <label>
            Statut
            <select name="status">
                <?php foreach (['live', 'draft', 'sold', 'coming_soon'] as $status): ?>
                    <option value="<?= $status ?>" <?= ($project['status'] ?? '') === $status ? 'selected' : '' ?>><?= $status ?></option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>
            Type
            <select name="type">
                <?php foreach (['appartements', 'terrains', 'maisons', 'bureaux', 'commerces'] as $type): ?>
                    <option value="<?= $type ?>" <?= ($project['type'] ?? '') === $type ? 'selected' : '' ?>><?= $type ?></option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>
            Latitude
            <input name="lat" type="number" step="any" value="<?= htmlspecialchars((string) ($project['lat'] ?? 0)) ?>">
        </label>
        <label>
            Longitude
            <input name="lng" type="number" step="any" value="<?= htmlspecialchars((string) ($project['lng'] ?? 0)) ?>">
        </label>
        <label>
            Nombre POI
            <input name="poi_count" type="number" min="0" value="<?= htmlspecialchars((string) ($project['poi_count'] ?? 0)) ?>">
        </label>
        <label>
            Visite 360
            <span><input name="has_tour" type="checkbox" value="1" <?= ! empty($project['has_tour']) ? 'checked' : '' ?>> Disponible</span>
        </label>
        <label class="full">
            URL detail
            <input name="detail_url" value="<?= htmlspecialchars($project['detail_url'] ?? '') ?>">
        </label>
        <label class="full">
            URL visite 360
            <input name="tour_url" value="<?= htmlspecialchars($project['tour_url'] ?? '') ?>">
        </label>
        <label class="full">
            PDF brochure / plan
            <input name="brochure_pdf" value="<?= htmlspecialchars($project['brochure_pdf'] ?? '') ?>">
        </label>
        <label class="full">
            Image logo
            <input name="image_logo" value="<?= htmlspecialchars($project['images']['logo'] ?? '') ?>">
            <?php if (! empty($project['images']['logo'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['images']['logo']) ?>" target="_blank">Voir le fichier actuel</a></span>
                <img class="image-preview" src="../<?= htmlspecialchars($project['images']['logo']) ?>" alt="">
            <?php endif; ?>
        </label>
        <label class="full">
            Importer un nouveau logo
            <input name="upload_logo" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/*">
        </label>
        <label class="full">
            Image hero
            <input name="image_hero" value="<?= htmlspecialchars($project['images']['hero'] ?? '') ?>">
            <?php if (! empty($project['images']['hero'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['images']['hero']) ?>" target="_blank">Voir le fichier actuel</a></span>
                <img class="image-preview image-preview-wide" src="../<?= htmlspecialchars($project['images']['hero']) ?>" alt="">
            <?php endif; ?>
        </label>
        <label class="full">
            Importer une nouvelle image hero
            <input name="upload_hero" type="file" accept=".jpg,.jpeg,.png,.webp,image/*">
        </label>
        <label class="full">
            Image plan
            <input name="image_floorplan" value="<?= htmlspecialchars($project['images']['floorplan'] ?? '') ?>">
            <?php if (! empty($project['images']['floorplan'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['images']['floorplan']) ?>" target="_blank">Voir le fichier actuel</a></span>
                <img class="image-preview image-preview-wide" src="../<?= htmlspecialchars($project['images']['floorplan']) ?>" alt="">
            <?php endif; ?>
        </label>
        <label class="full">
            Importer un nouveau plan
            <input name="upload_floorplan" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/*">
        </label>
        <label class="full">
            Importer un nouveau PDF
            <input name="upload_brochure" type="file" accept=".pdf,application/pdf">
            <?php if (! empty($project['brochure_pdf'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['brochure_pdf']) ?>" target="_blank">Voir le PDF actuel</a></span>
            <?php endif; ?>
        </label>
        <label class="full">
            Images du slider accueil
            <textarea name="slider_images" rows="7" placeholder="Un chemin par ligne"><?= htmlspecialchars(implode(PHP_EOL, $sliderImages)) ?></textarea>
            <span class="file-hint">Ces images alimentent les cartes de la page d'accueil. Laisse vide pour utiliser l'image principale du projet.</span>
        </label>
        <?php if ($sliderImages): ?>
            <div class="full slider-preview-grid">
                <?php foreach ($sliderImages as $sliderImage): ?>
                    <a href="../<?= htmlspecialchars($sliderImage) ?>" target="_blank">
                        <img class="image-preview" src="../<?= htmlspecialchars($sliderImage) ?>" alt="">
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            Importer des images de slider
            <input name="upload_slider_images[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
        </label>
    </div>

    <hr>

    <div class="lang-tabs">
        <?php foreach (['fr' => 'Francais', 'en' => 'English', 'ar' => 'العربية', 'es' => 'Espanol'] as $lang => $label): ?>
            <section class="lang-box" dir="<?= $lang === 'ar' ? 'rtl' : 'ltr' ?>">
                <h3><?= htmlspecialchars($label) ?></h3>
                <div class="grid">
                    <label>
                        Nom
                        <input name="name_<?= $lang ?>" value="<?= htmlspecialchars(text_value($project, 'name', $lang)) ?>">
                    </label>
                    <label>
                        Localisation
                        <input name="location_<?= $lang ?>" value="<?= htmlspecialchars(text_value($project, 'location', $lang)) ?>">
                    </label>
                    <label class="full">
                        Description
                        <textarea name="description_<?= $lang ?>"><?= htmlspecialchars(text_value($project, 'description', $lang)) ?></textarea>
                    </label>
                </div>
            </section>
        <?php endforeach; ?>
    </div>

    <div class="actions">
        <a class="button secondary" href="projects.php">Annuler</a>
        <button type="submit">Enregistrer</button>
    </div>
</form>
<?php admin_footer(); ?>
