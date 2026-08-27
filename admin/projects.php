<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();
$flash = flash_message();

admin_header(t_brut('projets_titre'));
?>
<div class="actions">
    <div>
        <h1><?= t('projets_titre') ?></h1>
        <p><?= t('projets_compte', ['n' => count($projects)]) ?></p>
    </div>
    <a class="button" href="project-edit.php"><?= t('projets_nouveau') ?></a>
</div>

<?php if ($flash): ?>
    <div class="notice"><?= htmlspecialchars($flash) ?></div>
<?php endif; ?>

<table>
    <thead>
        <tr>
            <th><?= t('th_projet') ?></th>
            <th><?= t('th_type') ?></th>
            <th><?= t('th_position') ?></th>
            <th><?= t('nav_poi') ?></th>
            <th><?= t('th_statut') ?></th>
            <th></th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($projects as $project): ?>
        <tr>
            <td>
                <strong><?= htmlspecialchars($project['name'][admin_lang()] ?? $project['name']['fr'] ?? $project['id']) ?></strong><br>
                <small><?= htmlspecialchars($project['location'][admin_lang()] ?? $project['location']['fr'] ?? '') ?></small>
            </td>
            <td><?= htmlspecialchars($project['type'] ?? '') ?></td>
            <td><?= htmlspecialchars((string) ($project['lat'] ?? '')) ?>, <?= htmlspecialchars((string) ($project['lng'] ?? '')) ?></td>
            <td><?= (int) ($project['poi_count'] ?? 0) ?></td>
            <td><?= htmlspecialchars($project['status'] ?? '') ?></td>
            <td><a class="button secondary" href="project-edit.php?id=<?= urlencode($project['id']) ?>"><?= t('bt_modifier') ?></a></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php admin_footer(); ?>

