<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();

admin_header('Tableau de bord');
?>
<section class="panel">
    <h1>Tableau de bord</h1>
    <p><?= count($projects) ?> projets dans <code>data/projects.json</code>.</p>
    <div class="actions">
        <a class="button" href="projects.php">Gerer les projets</a>
        <a class="button secondary" href="audit.php">Auditer les fichiers</a>
        <a class="button secondary" href="../carte.html" target="_blank">Voir la carte</a>
    </div>
</section>
<?php admin_footer(); ?>
