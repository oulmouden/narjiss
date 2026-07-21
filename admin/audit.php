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
    'Logo' => ['images', 'logo'],
    'Image principale' => ['images', 'hero'],
    'Plan' => ['images', 'floorplan'],
    'Brochure PDF' => ['brochure_pdf'],
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
    set_flash($removedCount . ' chemin(s) de slider manquant(s) supprime(s).');
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
            $issues[] = 'Champ vide : ' . $field;
            $emptyFields++;
        }
    }

    foreach (['name', 'location', 'description'] as $group) {
        foreach ($requiredLanguages as $lang) {
            $value = $project[$group][$lang] ?? '';
            if (trim((string) $value) === '') {
                $issues[] = 'Texte vide : ' . $group . '.' . $lang;
                $emptyFields++;
            }
        }
    }

    $fileResults = [];

    foreach ($fileFields as $label => $path) {
        $value = audit_value($project, $path);
        $publicPath = trim((string) $value);
        $exists = $publicPath !== '' && audit_public_path_exists($siteRoot, $publicPath);

        if ($publicPath === '') {
            $issues[] = 'Fichier non renseigne : ' . $label;
            $emptyFields++;
        } elseif (! $exists) {
            $issues[] = 'Fichier introuvable : ' . $publicPath;
            $missingFiles++;
        }

        $fileResults[] = [
            'label' => $label,
            'path' => $publicPath,
            'exists' => $exists,
        ];
    }

    foreach (($projectSliders[$projectId] ?? []) as $index => $sliderPath) {
        $publicPath = trim((string) $sliderPath);
        $exists = $publicPath !== '' && audit_public_path_exists($siteRoot, $publicPath);

        if ($publicPath === '') {
            $issues[] = 'Slider vide : image ' . ($index + 1);
            $emptyFields++;
        } elseif (! $exists) {
            $issues[] = 'Image slider introuvable : ' . $publicPath;
            $missingFiles++;
        }

        $fileResults[] = [
            'label' => 'Slider ' . ($index + 1),
            'path' => $publicPath,
            'exists' => $exists,
        ];
    }

    if (! empty($project['has_tour']) && trim((string) ($project['tour_url'] ?? '')) === '') {
        $issues[] = 'Tour indique actif, mais tour_url vide';
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

admin_header('Audit');
?>
<div class="actions">
    <div>
        <h1>Audit fichiers</h1>
        <p><?= count($projects) ?> projets verifies depuis <code>data/projects.json</code>.</p>
    </div>
    <div class="actions-inline">
        <form method="post">
            <input type="hidden" name="action" value="clean_missing_sliders">
            <button type="submit" class="secondary">Nettoyer les sliders manquants</button>
        </form>
        <a class="button secondary" href="projects.php">Retour aux projets</a>
    </div>
</div>

<?php if ($flash): ?>
    <div class="notice"><?= htmlspecialchars($flash) ?></div>
<?php endif; ?>

<section class="audit-summary">
    <div>
        <strong><?= $totalIssues ?></strong>
        <span>alertes</span>
    </div>
    <div>
        <strong><?= $missingFiles ?></strong>
        <span>fichiers manquants</span>
    </div>
    <div>
        <strong><?= $emptyFields ?></strong>
        <span>champs vides</span>
    </div>
</section>

<table>
    <thead>
        <tr>
            <th>Projet</th>
            <th>Dossier</th>
            <th>Fichiers</th>
            <th>Alertes</th>
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
                            <span class="badge <?= $file['exists'] ? 'ok' : 'warn' ?>"><?= $file['exists'] ? 'OK' : 'A verifier' ?></span>
                            <span><?= htmlspecialchars($file['label']) ?></span>
                            <small><?= htmlspecialchars($file['path'] ?: 'non renseigne') ?></small>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </td>
            <td>
                <?php if (count($row['issues']) === 0): ?>
                    <span class="badge ok">OK</span>
                <?php else: ?>
                    <ul class="audit-list">
                        <?php foreach ($row['issues'] as $issue): ?>
                            <li><span class="badge warn">!</span> <?= htmlspecialchars($issue) ?></li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </td>
            <td><a class="button secondary" href="project-edit.php?id=<?= urlencode($row['id']) ?>">Modifier</a></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php admin_footer(); ?>
