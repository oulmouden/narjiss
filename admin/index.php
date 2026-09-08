<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();

/* Dossier de présentation à la direction.
 *
 * Son adresse EST sa serrure : le dossier porte un segment secret pour nom, et
 * rien d'autre ne le protège. Le lien ne doit donc apparaître que derrière
 * l'authentification — sur une page publique, ce nom serait lisible dans le
 * HTML par n'importe quel visiteur.
 *
 * On CHERCHE le dossier au lieu de nommer le segment ici. Deux raisons : le
 * jour où il est renouvelé, le bouton suit sans qu'on y pense ; et le fichier
 * presentation/.jeton, qui portait ce nom, n'existe pas sur le serveur — s'y
 * fier n'aurait affiché le bouton qu'en local. Le plus récent l'emporte, pour
 * qu'une ancienne version laissée en place ne reprenne pas la main.
 */
$presentationLien = '';
$candidats = glob(__DIR__ . '/../presentation/*/index.html') ?: [];
$recent = 0;
foreach ($candidats as $chemin) {
    $segment = basename(dirname($chemin));
    // Le nom vient du disque : on refuse tout ce qui n'est pas un segment
    // d'URL simple, plutôt que de le coller tel quel dans un href.
    if (preg_match('/^[A-Za-z0-9_-]+$/', $segment) !== 1) {
        continue;
    }
    $date = (int) @filemtime($chemin);
    if ($date >= $recent) {
        $recent = $date;
        $presentationLien = '../presentation/' . $segment . '/index.html';
    }
}

admin_header(t_brut('accueil_titre'));
?>
<section class="panel">
    <h1><?= t('accueil_titre') ?></h1>
    <p><?= t('accueil_compte', ['n' => count($projects)]) ?> <code>data/projects.json</code>.</p>
    <div class="actions">
        <a class="button" href="projects.php"><?= t('accueil_projets') ?></a>
        <a class="button secondary" href="audit.php"><?= t('accueil_audit') ?></a>
        <a class="button secondary" href="../carte.html" target="_blank"><?= t('accueil_carte') ?></a>
<?php if ($presentationLien !== ''): ?>
        <a class="button secondary" href="<?= htmlspecialchars($presentationLien, ENT_QUOTES, 'UTF-8') ?>"
           target="_blank" rel="noopener"><?= t('accueil_presentation') ?></a>
<?php endif; ?>
    </div>
</section>
<?php admin_footer(); ?>
