<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();
$flash = flash_message();

admin_header('Projets');
?>
<div class="actions">
    <div>
        <h1>Projets</h1>
        <p><?= count($projects) ?> projets centralises.</p>
    </div>
    <a class="button" href="project-edit.php">Nouveau projet</a>
</div>

<?php if ($flash): ?>
    <div class="notice"><?= htmlspecialchars($flash) ?></div>
<?php endif; ?>

<table>
    <thead>
        <tr>
            <th>Projet</th>
            <th>Type</th>
            <th>Position</th>
            <th>POI</th>
            <th>Statut</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($projects as $project): ?>
        <tr>
            <td>
                <strong><?= htmlspecialchars($project['name']['fr'] ?? $project['id']) ?></strong><br>
                <small><?= htmlspecialchars($project['location']['fr'] ?? '') ?></small>
            </td>
            <td><?= htmlspecialchars($project['type'] ?? '') ?></td>
            <td><?= htmlspecialchars((string) ($project['lat'] ?? '')) ?>, <?= htmlspecialchars((string) ($project['lng'] ?? '')) ?></td>
            <td><?= (int) ($project['poi_count'] ?? 0) ?></td>
            <td><?= htmlspecialchars($project['status'] ?? '') ?></td>
            <td><a class="button secondary" href="project-edit.php?id=<?= urlencode($project['id']) ?>">Modifier</a></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php admin_footer(); ?>

