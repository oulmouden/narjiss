<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/lang.php';

if (admin_is_logged_in()) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (admin_login(trim((string) ($_POST['user'] ?? '')), (string) ($_POST['password'] ?? ''))) {
        header('Location: index.php');
        exit;
    }

    $error = t_brut('login_erreur');
}
?>
<!doctype html>
<html lang="<?= admin_lang() ?>" dir="<?= admin_dir() ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title><?= t('login_titre') ?> - <?= t('marque') ?></title>
    <link rel="stylesheet" href="assets/admin.css?v=6">
</head>
<body>
<main class="login">
    <?php /* Le sélecteur AVANT le formulaire : c'est l'écran de connexion qui
             doit déjà être lisible, sinon on demande de se connecter dans une
             langue qu'on ne lit pas pour pouvoir choisir la sienne. */ ?>
    <?= admin_selecteur_langue() ?>
    <h1><?= t('marque') ?></h1>
    <p><?= t('login_intro') ?></p>
    <?php if ($error): ?>
        <p class="error"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>
    <form method="post">
        <label>
            <?= t('login_utilisateur') ?>
            <input name="user" autocomplete="username" required>
        </label>
        <br>
        <label>
            <?= t('login_mdp') ?>
            <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <br>
        <button type="submit"><?= t('login_entrer') ?></button>
    </form>
    <!-- Le pied de page du site propose « Espace professionnel » et « Espace
         commercial » côte à côte. Un commercial qui se trompe de porte arrive
         ici, et ses identifiants y sont refusés sans explication : cette page
         ne connaît qu'un seul compte, celui de l'administrateur. -->
    <p class="aide-agents">
        <?= t('login_agents_q') ?>
        <a href="../espace-agent.html"><?= t('login_agents_lien') ?></a>
    </p>
</main>
</body>
</html>

