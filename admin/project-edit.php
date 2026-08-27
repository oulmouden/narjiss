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
        set_flash(t_brut('pe_enregistre', [
            'g' => count($project['gallery'] ?? []),
            'p' => count($project['panoramas'] ?? []),
            'v' => count($project['videos'] ?? []),
            's' => count($projectSliders[$project['id']] ?? []),
        ]));
        /* On revient sur la fiche, pas sur la liste : un ajout ou une
           suppression de media ne se verifie que sur les vignettes, et la liste
           n'en montre aucune. Rediriger (plutot que reafficher) garde le
           rechargement propre : F5 ne repostera pas le formulaire. */
        header('Location: project-edit.php?id=' . urlencode((string) $project['id']));
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
    'tour_maison' => false,
    'tour_dossier' => '',
    'brochure_pdf' => '',
    'name' => ['fr' => '', 'en' => '', 'ar' => '', 'es' => ''],
    'location' => ['fr' => '', 'en' => '', 'ar' => '', 'es' => ''],
    'description' => ['fr' => '', 'en' => '', 'ar' => '', 'es' => ''],
    'images' => ['logo' => '', 'hero' => '', 'floorplan' => ''],
];

/* Album photos et videos, tels que medias.html les lit. Calcules apres le
   POST : si l'enregistrement echoue, le formulaire doit reafficher ce que le
   redacteur venait de saisir, pas le contenu du fichier. */
$galleryImages = array_values(array_filter((array) ($project['gallery'] ?? [])));
$panoramas = array_values(array_filter((array) ($project['panoramas'] ?? [])));
$panoramaLines = array_map('panorama_to_line', $panoramas);
$videos = array_values(array_filter((array) ($project['videos'] ?? [])));
$videoLines = array_map('video_to_line', $videos);

admin_header(t_brut($id ? 'pe_titre_modifier' : 'projets_nouveau'));
?>
<h1><?= t($id ? 'pe_h1_modifier' : 'projets_nouveau') ?></h1>

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
            <?= t('audit_th_dossier') ?>
            <input name="folder" value="<?= htmlspecialchars($project['folder'] ?? '') ?>">
        </label>
        <label>
            <?= t('th_statut') ?>
            <select name="status">
                <?php foreach (['live', 'draft', 'sold', 'coming_soon'] as $status): ?>
                    <option value="<?= $status ?>" <?= ($project['status'] ?? '') === $status ? 'selected' : '' ?>><?= $status ?></option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>
            <?= t('th_type') ?>
            <select name="type">
                <?php foreach (['appartements', 'terrains', 'maisons', 'bureaux', 'commerces'] as $type): ?>
                    <option value="<?= $type ?>" <?= ($project['type'] ?? '') === $type ? 'selected' : '' ?>><?= $type ?></option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>
            <?= t('pe_latitude') ?>
            <input name="lat" type="number" step="any" value="<?= htmlspecialchars((string) ($project['lat'] ?? 0)) ?>">
        </label>
        <label>
            <?= t('pe_longitude') ?>
            <input name="lng" type="number" step="any" value="<?= htmlspecialchars((string) ($project['lng'] ?? 0)) ?>">
        </label>
        <label>
            <?= t('pe_nb_poi') ?>
            <input name="poi_count" type="number" min="0" value="<?= htmlspecialchars((string) ($project['poi_count'] ?? 0)) ?>">
        </label>
        <label>
            <?= t('pe_visite360') ?>
            <span><input name="has_tour" type="checkbox" value="1" <?= ! empty($project['has_tour']) ? 'checked' : '' ?>> <?= t('pe_disponible') ?></span>
        </label>
        <label>
            <?= t('pe_prix_publics') ?>
            <select name="price_mode">
                <option value="public" <?= (($project['price_mode'] ?? 'public') !== 'on-request') ? 'selected' : '' ?>><?= t('pe_prix_afficher') ?></option>
                <option value="on-request" <?= (($project['price_mode'] ?? '') === 'on-request') ? 'selected' : '' ?>><?= t('pe_prix_masquer') ?></option>
            </select>
            <small style="color:#64748b"><?= t('pe_prix_aide') ?></small>
        </label>
        <label class="full">
            <?= t('pe_url_detail') ?>
            <input name="detail_url" value="<?= htmlspecialchars($project['detail_url'] ?? '') ?>">
        </label>
        <label class="full">
            <?= t('pe_visionneuse') ?>
            <span><input name="tour_maison" type="checkbox" value="1"
                         <?= ! empty($project['tour_maison']) ? 'checked' : '' ?>> <?= t('pe_visionneuse_maison') ?></span>
            <small style="color:#64748b">
                <?= t_brut('pe_visionneuse_aide') ?>
            </small>
        </label>
        <label class="full">
            <?= t('pe_url_visite') ?> <em style="font-weight:400"><?= t('pe_url_visite_em') ?></em>
            <?php // En régime « maison », on réaffiche le dossier saisi, pas l'URL composée. ?>
            <input name="tour_url" value="<?= htmlspecialchars(
                ! empty($project['tour_maison'])
                    ? ($project['tour_dossier'] ?? '')
                    : ($project['tour_url'] ?? '')
            ) ?>">
        </label>
        <label class="full">
            <?= t('pe_url_appartement') ?>
            <input name="apartment_tour_url" value="<?= htmlspecialchars($project['apartment_tour_url'] ?? '') ?>">
            <small style="color:#64748b">
                <?= t_brut('pe_url_appartement_aide') ?>
            </small>
        </label>
        <label class="full">
            <?= t('pe_pdf_brochure') ?>
            <input name="brochure_pdf" value="<?= htmlspecialchars($project['brochure_pdf'] ?? '') ?>">
        </label>
        <label class="full">
            <?= t('pe_image_logo') ?>
            <input name="image_logo" value="<?= htmlspecialchars($project['images']['logo'] ?? '') ?>">
            <?php if (! empty($project['images']['logo'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['images']['logo']) ?>" target="_blank"><?= t('pe_voir_fichier') ?></a></span>
                <img class="image-preview" src="../<?= htmlspecialchars($project['images']['logo']) ?>" alt="">
            <?php endif; ?>
        </label>
        <label class="full">
            <?= t('pe_importer_logo') ?>
            <input name="upload_logo" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/*">
        </label>
        <label class="full">
            <?= t('pe_image_hero') ?>
            <input name="image_hero" value="<?= htmlspecialchars($project['images']['hero'] ?? '') ?>">
            <?php if (! empty($project['images']['hero'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['images']['hero']) ?>" target="_blank"><?= t('pe_voir_fichier') ?></a></span>
                <img class="image-preview image-preview-wide" src="../<?= htmlspecialchars($project['images']['hero']) ?>" alt="">
            <?php endif; ?>
        </label>
        <label class="full">
            <?= t('pe_importer_hero') ?>
            <input name="upload_hero" type="file" accept=".jpg,.jpeg,.png,.webp,image/*">
        </label>
        <label class="full">
            <?= t('pe_image_plan') ?>
            <input name="image_floorplan" value="<?= htmlspecialchars($project['images']['floorplan'] ?? '') ?>">
            <?php if (! empty($project['images']['floorplan'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['images']['floorplan']) ?>" target="_blank"><?= t('pe_voir_fichier') ?></a></span>
                <img class="image-preview image-preview-wide" src="../<?= htmlspecialchars($project['images']['floorplan']) ?>" alt="">
            <?php endif; ?>
        </label>
        <label class="full">
            <?= t('pe_importer_plan') ?>
            <input name="upload_floorplan" type="file" accept=".jpg,.jpeg,.png,.webp,.svg,image/*">
        </label>
        <label class="full">
            <?= t('pe_importer_pdf') ?>
            <input name="upload_brochure" type="file" accept=".pdf,application/pdf">
            <?php if (! empty($project['brochure_pdf'])): ?>
                <span class="file-hint"><a href="../<?= htmlspecialchars($project['brochure_pdf']) ?>" target="_blank"><?= t('pe_voir_pdf') ?></a></span>
            <?php endif; ?>
        </label>
        <label class="full">
            <?= t('pe_slider', ['n' => count($sliderImages)]) ?>
            <textarea name="slider_images" rows="7" placeholder="<?= t('pe_un_chemin') ?>"><?= htmlspecialchars(implode(PHP_EOL, $sliderImages)) ?></textarea>
            <span class="file-hint"><?= t('pe_slider_aide') ?></span>
        </label>
        <?php if ($sliderImages): ?>
            <div class="full media-grid">
                <?php foreach ($sliderImages as $sliderImage): ?>
                    <figure class="media-card">
                        <a href="../<?= htmlspecialchars($sliderImage) ?>" target="_blank">
                            <img class="image-preview" src="../<?= htmlspecialchars($sliderImage) ?>" alt="">
                        </a>
                        <figcaption title="<?= htmlspecialchars($sliderImage) ?>"><?= htmlspecialchars(basename($sliderImage)) ?></figcaption>
                        <label class="media-remove">
                            <input type="checkbox" name="supprimer_slider[]" value="<?= htmlspecialchars($sliderImage) ?>">
                            <?= t('bt_supprimer') ?>
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            <?= t('pe_importer_slider') ?>
            <input name="upload_slider_images[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
        </label>
    </div>

    <hr>

    <h2><?= t('pe_photos_videos') ?></h2>
    <p class="file-hint">
        <?= t('pe_photos_videos_aide') ?>
    </p>

    <div class="grid">
        <label class="full">
            <?= t('pe_album', ['n' => count($galleryImages)]) ?>
            <textarea name="gallery_images" rows="7" placeholder="Un chemin par ligne, ex. images/projects/<?= htmlspecialchars($project['id'] ?: 'projet') ?>/album/facade.jpg"><?= htmlspecialchars(implode(PHP_EOL, $galleryImages)) ?></textarea>
            <span class="file-hint">
                <?= t('pe_album_aide') ?>
            </span>
        </label>
        <?php if ($galleryImages): ?>
            <div class="full media-grid">
                <?php foreach ($galleryImages as $galleryImage): ?>
                    <figure class="media-card">
                        <a href="../<?= htmlspecialchars($galleryImage) ?>" target="_blank">
                            <img class="image-preview" src="../<?= htmlspecialchars($galleryImage) ?>" alt="">
                        </a>
                        <figcaption title="<?= htmlspecialchars($galleryImage) ?>"><?= htmlspecialchars(basename($galleryImage)) ?></figcaption>
                        <label class="media-remove">
                            <input type="checkbox" name="supprimer_gallery[]" value="<?= htmlspecialchars($galleryImage) ?>">
                            <?= t('bt_supprimer') ?>
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
            <p class="full file-hint">
                <?= t('pe_album_suppr_aide') ?>
            </p>
        <?php endif; ?>
        <label class="full">
            <?= t('pe_importer_album') ?>
            <input name="upload_gallery_images[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
            <span class="file-hint"><?= t_brut('pe_importer_album_aide') ?></span>
        </label>

        <label class="full">
            <?= t('pe_vues360', ['n' => count($panoramaLines)]) ?>
            <textarea name="panoramas" rows="6" placeholder="images/projects/<?= htmlspecialchars($project['id'] ?: 'projet') ?>/360/salon.jpg | Salon"><?= htmlspecialchars(implode(PHP_EOL, $panoramaLines)) ?></textarea>
            <span class="file-hint">
                <?= t_brut('pe_vues360_aide') ?>
            </span>
        </label>
        <?php if ($panoramas): ?>
            <div class="full media-grid">
                <?php foreach ($panoramas as $panorama): ?>
                    <?php $panoSrc = is_array($panorama) ? ($panorama['src'] ?? '') : $panorama; ?>
                    <figure class="media-card">
                        <a href="../<?= htmlspecialchars($panoSrc) ?>" target="_blank">
                            <img class="image-preview" src="../<?= htmlspecialchars($panoSrc) ?>" alt="">
                        </a>
                        <figcaption title="<?= htmlspecialchars($panoSrc) ?>">360° · <?= htmlspecialchars(basename($panoSrc)) ?></figcaption>
                        <label class="media-remove">
                            <input type="checkbox" name="supprimer_panoramas[]" value="<?= htmlspecialchars($panoSrc) ?>">
                            <?= t('bt_supprimer') ?>
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            <?= t('pe_importer_vues360') ?>
            <input name="upload_panoramas[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
            <span class="file-hint"><?= t_brut('pe_importer_vues360_aide') ?></span>
        </label>

        <label class="full">
            <?= t('pe_videos', ['n' => count($videos)]) ?>
            <textarea name="videos" rows="7" placeholder="data/videos/projet/visite.mp4 | data/videos/projet/visite.jpg | Presentation du projet"><?= htmlspecialchars(implode(PHP_EOL, $videoLines)) ?></textarea>
            <span class="file-hint">
                <?= t_brut('pe_videos_aide') ?>
            </span>
        </label>
        <?php if ($videos): ?>
            <div class="full media-grid">
                <?php foreach ($videos as $video): ?>
                    <?php $videoSrc = is_array($video) ? ($video['src'] ?? '') : $video; ?>
                    <?php $videoPoster = is_array($video) ? ($video['poster'] ?? '') : ''; ?>
                    <figure class="media-card">
                        <a href="../<?= htmlspecialchars($videoSrc) ?>" target="_blank">
                            <?php if ($videoPoster): ?>
                                <img class="image-preview" src="../<?= htmlspecialchars($videoPoster) ?>" alt="">
                            <?php else: ?>
                                <span class="media-sans-poster">▶</span>
                            <?php endif; ?>
                        </a>
                        <figcaption title="<?= htmlspecialchars($videoSrc) ?>"><?= htmlspecialchars(basename($videoSrc)) ?></figcaption>
                        <label class="media-remove">
                            <input type="checkbox" name="supprimer_videos[]" value="<?= htmlspecialchars($videoSrc) ?>">
                            <?= t('bt_supprimer') ?>
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            <?= t('pe_importer_videos') ?>
            <input name="upload_videos[]" type="file" accept=".mp4,.webm,.mov,video/*" multiple>
            <span class="file-hint"><?= t_brut('pe_importer_videos_aide') ?></span>
        </label>
        <label class="full">
            <?= t('pe_importer_posters') ?>
            <input name="upload_video_posters[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
            <span class="file-hint"><?= t('pe_importer_posters_aide') ?></span>
        </label>
    </div>

    <hr>

    <?php /* Chaque bloc est étiqueté DANS sa langue (Français, English, العربية,
             Español) : ce sont les langues du contenu publié, pas celle de
             l'interface. Les traduire n'aurait pas de sens. */ ?>
    <div class="lang-tabs">
        <?php foreach (['fr' => 'Français', 'en' => 'English', 'ar' => 'العربية', 'es' => 'Español'] as $lang => $label): ?>
            <section class="lang-box" dir="<?= $lang === 'ar' ? 'rtl' : 'ltr' ?>">
                <h3><?= htmlspecialchars($label) ?></h3>
                <div class="grid">
                    <label>
                        <?= t('ag_nom') ?>
                        <input name="name_<?= $lang ?>" value="<?= htmlspecialchars(text_value($project, 'name', $lang)) ?>">
                    </label>
                    <label>
                        <?= t('pe_localisation') ?>
                        <input name="location_<?= $lang ?>" value="<?= htmlspecialchars(text_value($project, 'location', $lang)) ?>">
                    </label>
                    <label class="full">
                        <?= t('pe_description') ?>
                        <textarea name="description_<?= $lang ?>"><?= htmlspecialchars(text_value($project, 'description', $lang)) ?></textarea>
                    </label>
                </div>
            </section>
        <?php endforeach; ?>
    </div>

    <div class="actions">
        <a class="button secondary" href="projects.php"><?= t('bt_annuler') ?></a>
        <button type="submit"><?= t('bt_enregistrer') ?></button>
    </div>
</form>
<?php admin_footer(); ?>
