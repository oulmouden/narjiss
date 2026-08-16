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
        set_flash('Projet enregistre : ' . count($project['gallery'] ?? []) . ' photo(s) dans l\'album, '
            . count($project['panoramas'] ?? []) . ' vue(s) 360, '
            . count($project['videos'] ?? []) . ' video(s), '
            . count($projectSliders[$project['id']] ?? []) . ' image(s) de slider.');
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
        <label>
            Prix publics
            <select name="price_mode">
                <option value="public" <?= (($project['price_mode'] ?? 'public') !== 'on-request') ? 'selected' : '' ?>>Afficher les montants</option>
                <option value="on-request" <?= (($project['price_mode'] ?? '') === 'on-request') ? 'selected' : '' ?>>Masquer — « Nous consulter »</option>
            </select>
            <small style="color:#64748b">Masqué : aucun montant ne sort de l'API (lots, prix au m², filtre budget).</small>
        </label>
        <label class="full">
            URL detail
            <input name="detail_url" value="<?= htmlspecialchars($project['detail_url'] ?? '') ?>">
        </label>
        <label class="full">
            Visionneuse 360
            <span><input name="tour_maison" type="checkbox" value="1"
                         <?= ! empty($project['tour_maison']) ? 'checked' : '' ?>> Utiliser la visionneuse maison (Pannellum)</span>
            <small style="color:#64748b">
                Cochée, l'URL ci-dessous est composée automatiquement à partir du
                dossier de visite et le champ devient un simple chemin de dossier
                (ex. <code>jawhara/Tour</code>). Décochée, l'URL est libre — pour
                pointer le lecteur 3DVista (<code>jawhara/Tour/index.htm</code>)
                ou un service externe.
            </small>
        </label>
        <label class="full">
            URL visite 360 <em style="font-weight:400">— ou dossier du tour si la visionneuse maison est cochée</em>
            <?php // En régime « maison », on réaffiche le dossier saisi, pas l'URL composée. ?>
            <input name="tour_url" value="<?= htmlspecialchars(
                ! empty($project['tour_maison'])
                    ? ($project['tour_dossier'] ?? '')
                    : ($project['tour_url'] ?? '')
            ) ?>">
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
            Images du slider accueil (<?= count($sliderImages) ?>)
            <textarea name="slider_images" rows="7" placeholder="Un chemin par ligne"><?= htmlspecialchars(implode(PHP_EOL, $sliderImages)) ?></textarea>
            <span class="file-hint">Ces images alimentent les cartes de la page d'accueil. Laisse vide pour utiliser l'image principale du projet.</span>
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
                            Supprimer
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            Importer des images de slider
            <input name="upload_slider_images[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
        </label>
    </div>

    <hr>

    <h2>Photos et videos</h2>
    <p class="file-hint">
        Ces medias alimentent la page « Photos et videos » (medias.html), ouverte
        par le bouton « Album » de la fiche d'un logement. L'onglet Photos montre
        l'album puis les vues 360 ; l'onglet Videos montre la liste des videos.
        Ce qui est ici est exactement ce que verra le visiteur : les images du
        slider et l'image hero ne prennent le relais que si l'album ET les vues
        360 sont vides.
    </p>

    <div class="grid">
        <label class="full">
            Album photos du projet (<?= count($galleryImages) ?>)
            <textarea name="gallery_images" rows="7" placeholder="Un chemin par ligne, ex. images/projects/<?= htmlspecialchars($project['id'] ?: 'projet') ?>/album/facade.jpg"><?= htmlspecialchars(implode(PHP_EOL, $galleryImages)) ?></textarea>
            <span class="file-hint">
                Un chemin par ligne, dans l'ordre d'affichage du diaporama. Vide :
                la page retombe sur les images du slider, puis sur l'image hero.
                Une photo a 360 degres s'ouvre automatiquement dans la visionneuse 3D :
                elle est reconnue si elle vient des panoramas du projet, si son nom
                contient 360 / pano / theta, ou si elle est deux fois plus large
                que haute (projection equirectangulaire).
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
                            Supprimer
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
            <p class="full file-hint">
                Coche « Supprimer » puis Enregistrer : la photo quitte l'album. Le
                fichier reste sur le serveur, au cas ou il servirait ailleurs
                (image hero, slider) ou qu'il faille revenir en arriere.
            </p>
        <?php endif; ?>
        <label class="full">
            Importer des photos dans l'album
            <input name="upload_gallery_images[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
            <span class="file-hint">Enregistrees dans images/projects/&lt;id&gt;/album/. Maximum 12 Mo par photo.</span>
        </label>

        <label class="full">
            Vues a 360 degres (<?= count($panoramaLines) ?>)
            <textarea name="panoramas" rows="6" placeholder="images/projects/<?= htmlspecialchars($project['id'] ?: 'projet') ?>/360/salon.jpg | Salon"><?= htmlspecialchars(implode(PHP_EOL, $panoramaLines)) ?></textarea>
            <span class="file-hint">
                Une ligne par vue : <code>chemin | piece</code>. Elles s'affichent dans
                l'album, apres les photos, et s'ouvrent toujours dans la visionneuse 3D.
                Un nom de piece laisse tel quel garde ses traductions ; le reecrire le
                remet en une seule langue.
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
                            Supprimer
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            Importer des vues 360
            <input name="upload_panoramas[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
            <span class="file-hint">Enregistrees dans images/projects/&lt;id&gt;/360/. Il faut de vraies photos spheriques (projection equirectangulaire, deux fois plus larges que hautes).</span>
        </label>

        <label class="full">
            Videos du projet (<?= count($videos) ?>)
            <textarea name="videos" rows="7" placeholder="data/videos/projet/visite.mp4 | data/videos/projet/visite.jpg | Presentation du projet"><?= htmlspecialchars(implode(PHP_EOL, $videoLines)) ?></textarea>
            <span class="file-hint">
                Une ligne par video : <code>chemin video | chemin poster | titre</code>.
                Le poster et le titre sont facultatifs. Un titre laisse tel quel garde
                ses traductions ; le reecrire le remet en une seule langue.
                Vide : la page montre la video institutionnelle.
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
                            Supprimer
                        </label>
                    </figure>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <label class="full">
            Importer des videos
            <input name="upload_videos[]" type="file" accept=".mp4,.webm,.mov,video/*" multiple>
            <span class="file-hint">Enregistrees dans data/videos/&lt;id&gt;/. Maximum 200 Mo par fichier, dans la limite de upload_max_filesize du serveur.</span>
        </label>
        <label class="full">
            Importer des posters de videos
            <input name="upload_video_posters[]" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple>
            <span class="file-hint">Un poster prend le nom de sa video (visite.mp4 → visite.jpg) pour lui etre associe automatiquement.</span>
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
