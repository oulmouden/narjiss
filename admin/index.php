<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();

admin_header(t_brut('accueil_titre'));
?>
<section class="panel">
    <h1><?= t('accueil_titre') ?></h1>
    <p><?= t('accueil_compte', ['n' => count($projects)]) ?> <code>data/projects.json</code>.</p>
    <div class="actions">
        <a class="button" href="projects.php"><?= t('accueil_projets') ?></a>
        <a class="button secondary" href="audit.php"><?= t('accueil_audit') ?></a>
        <a class="button secondary" href="../carte.html" target="_blank"><?= t('accueil_carte') ?></a>
    </div>
</section>
<?php admin_footer(); ?>
