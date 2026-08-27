<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$siteRoot = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
$projects = read_projects();
$projectSliders = read_project_sliders();
$requiredLanguages = ['fr', 'en', 'ar', 'es'];
$fileFields = [
    'audit_f_logo'     => ['images', 'logo'],
    'audit_f_hero'     => ['images', 'hero'],
    'audit_f_plan'     => ['images', 'floorplan'],
    'audit_f_brochure' => ['brochure_pdf'],
];

function audit_value(array $project, array $path): mixed
{
    $value = $project;

    foreach ($path as $segment) {
        if (! is_array($value) || ! array_key_exists($segment, $value)) {
            return null;
        }

        $value = $value[$segment];
    }

    return $value;
}

function audit_public_path_exists(string $siteRoot, string $path): bool
{
    $cleanPath = trim($path);

    if ($cleanPath === '' || str_contains($cleanPath, '://')) {
        return false;
    }

    $cleanPath = ltrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $cleanPath), DIRECTORY_SEPARATOR);

    return file_exists($siteRoot . DIRECTORY_SEPARATOR . $cleanPath);
}

function audit_status_class(int $issues): string
{
    return $issues === 0 ? 'ok' : 'warn';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'clean_missing_sliders') {
    $cleanedSliders = [];
    $removedCount = 0;

    foreach ($projectSliders as $projectId => $images) {
        foreach ((array) $images as $image) {
            $image = trim((string) $image);
            if ($image !== '' && audit_public_path_exists($siteRoot, $image)) {
                $cleanedSliders[$projectId][] = $image;
            } else {
                $removedCount++;
            }
        }
    }

    write_project_sliders($cleanedSliders);
    set_flash(t_brut('audit_nettoye', ['n' => $removedCount]));
    header('Location: audit.php');
    exit;
}

$rows = [];
$totalIssues = 0;
$missingFiles = 0;
$emptyFields = 0;
$flash = flash_message();

foreach ($projects as $project) {
    $issues = [];
    $projectId = (string) ($project['id'] ?? '');

    foreach (['id', 'folder', 'status', 'type', 'lat', 'lng'] as $field) {
        $value = $project[$field] ?? null;
        if ($value === null || $value === '') {
            $issues[] = t_brut('audit_champ_vide', ['c' => $field]);
            $emptyFields++;
        }
    }

    foreach (['name', 'location', 'description'] as $group) {
        foreach ($requiredLanguages as $lang) {
            $value = $project[$group][$lang] ?? '';
            if (trim((string) $value) === '') {
                $issues[] = t_brut('audit_texte_vide', ['c' => $group . '.' . $lang]);
                $emptyFields++;
            }
        }
    }

    $fileResults = [];

    foreach ($fileFields as $cleLabel => $path) {
        $value = audit_value($project, $path);
        $publicPath = trim((string) $value);
        $exists = $publicPath !== '' && audit_public_path_exists($siteRoot, $publicPath);

        if ($publicPath === '') {
            $issues[] = t_brut('audit_fichier_vide', ['c' => t_brut($cleLabel)]);
            $emptyFields++;
        } elseif (! $exists) {
            $issues[] = t_brut('audit_fichier_absent', ['c' => $publicPath]);
            $missingFiles++;
        }

        $fileResults[] = [
            'label' => t_brut($cleLabel),
            'path' => $publicPath,
            'exists' => $exists,
        ];
    }

    foreach (($projectSliders[$projectId] ?? []) as $index => $sliderPath) {
        $publicPath = trim((string) $sliderPath);
        $exists = $publicPath !== '' && audit_public_path_exists($siteRoot, $publicPath);

        if ($publicPath === '') {
            $issues[] = t_brut('audit_slider_vide', ['n' => $index + 1]);
            $emptyFields++;
        } elseif (! $exists) {
            $issues[] = t_brut('audit_slider_absent', ['c' => $publicPath]);
            $missingFiles++;
        }

        $fileResults[] = [
            'label' => t_brut('audit_slider', ['n' => $index + 1]),
            'path' => $publicPath,
            'exists' => $exists,
        ];
    }

    if (! empty($project['has_tour']) && trim((string) ($project['tour_url'] ?? '')) === '') {
        $issues[] = t_brut('audit_tour_sans_url');
        $emptyFields++;
    }

    $totalIssues += count($issues);
    $rows[] = [
        'id' => $projectId,
        'name' => (string) ($project['name']['fr'] ?? $projectId),
        'folder' => (string) ($project['folder'] ?? ''),
        'files' => $fileResults,
        'issues' => $issues,
    ];
}

admin_header(t_brut('nav_audit'));
?>
<div class="actions">
    <div>
        <h1><?= t('audit_titre') ?></h1>
        <p><?= t('audit_compte', ['n' => count($projects)]) ?> <code>data/projects.json</code>.</p>
    </div>
    <div class="actions-inline">
        <form method="post">
            <input type="hidden" name="action" value="clean_missing_sliders">
            <button type="submit" class="secondary"><?= t('audit_nettoyer') ?></button>
        </form>
        <a class="button secondary" href="projects.php"><?= t('audit_retour') ?></a>
    </div>
</div>

<?php if ($flash): ?>
    <div class="notice"><?= htmlspecialchars($flash) ?></div>
<?php endif; ?>

<section class="audit-summary">
    <div>
        <strong><?= $totalIssues ?></strong>
        <span><?= t('audit_alertes') ?></span>
    </div>
    <div>
        <strong><?= $missingFiles ?></strong>
        <span><?= t('audit_fichiers_manquants') ?></span>
    </div>
    <div>
        <strong><?= $emptyFields ?></strong>
        <span><?= t('audit_champs_vides') ?></span>
    </div>
</section>

<table>
    <thead>
        <tr>
            <th><?= t('th_projet') ?></th>
            <th><?= t('audit_th_dossier') ?></th>
            <th><?= t('audit_th_fichiers') ?></th>
            <th><?= t('audit_alertes') ?></th>
            <th></th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($rows as $row): ?>
        <tr>
            <td>
                <strong><?= htmlspecialchars($row['name']) ?></strong><br>
                <small><?= htmlspecialchars($row['id']) ?></small>
            </td>
            <td><code><?= htmlspecialchars($row['folder']) ?></code></td>
            <td>
                <ul class="audit-list">
                    <?php foreach ($row['files'] as $file): ?>
                        <li>
                            <span class="badge <?= $file['exists'] ? 'ok' : 'warn' ?>"><?= $file['exists'] ? t('audit_ok') : t('audit_a_verifier') ?></span>
                            <span><?= htmlspecialchars($file['label']) ?></span>
                            <small><?= htmlspecialchars($file['path'] ?: t_brut('audit_non_renseigne')) ?></small>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </td>
            <td>
                <?php if (count($row['issues']) === 0): ?>
                    <span class="badge ok"><?= t('audit_ok') ?></span>
                <?php else: ?>
                    <ul class="audit-list">
                        <?php foreach ($row['issues'] as $issue): ?>
                            <li><span class="badge warn">!</span> <?= htmlspecialchars($issue) ?></li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </td>
            <td><a class="button secondary" href="project-edit.php?id=<?= urlencode($row['id']) ?>"><?= t('bt_modifier') ?></a></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php admin_footer(); ?>
