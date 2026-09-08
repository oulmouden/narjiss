<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

$projects = read_projects();

/* Dossier de présentation à la direction.
 *
 * Son adresse EST sa serrure : le segment secret vit dans presentation/.jeton
 * et rien d'autre ne protège le dossier. Le lien ne doit donc apparaître que
 * derrière l'authentification — jamais sur une page publique, où le jeton
 * serait lisible dans le HTML par n'importe quel visiteur.
 *
 * On lit le jeton plutôt que de le recopier ici : le jour où il est renouvelé
 * (dossier renommé + .jeton mis à jour), le bouton suit sans qu'on y pense.
 */
$presentationLien = '';
$jeton = @file_get_contents(__DIR__ . '/../presentation/.jeton');
if (is_string($jeton)) {
    $jeton = trim($jeton);
    // Le jeton vient d'un fichier : on refuse tout ce qui n'est pas un segment
    // d'URL simple, sinon un « ../ » y ferait sortir du dossier.
    if ($jeton !== '' && preg_match('/^[A-Za-z0-9_-]+$/', $jeton) === 1
        && is_file(__DIR__ . '/../presentation/' . $jeton . '/index.html')) {
        $presentationLien = '../presentation/' . $jeton . '/index.html';
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
