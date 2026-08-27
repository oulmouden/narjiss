<?php

declare(strict_types=1);

require_once __DIR__ . '/lang.php';

function admin_header(string $title): void
{
    ?>
    <!doctype html>
    <html lang="<?= admin_lang() ?>" dir="<?= admin_dir() ?>">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title><?= htmlspecialchars($title) ?> - <?= t('marque') ?></title>
        <?php /* Couleurs des statuts de lot : le même fichier que le site public,
                 pour que la grille du back-office et le plan vu par le client ne
                 puissent pas se contredire. Chargé avant admin.css, qui s'en sert. */ ?>
        <link rel="stylesheet" href="../shared/statuts-lots.css?v=1">
        <link rel="stylesheet" href="assets/admin.css?v=6">
    </head>
    <body>
    <header class="topbar">
        <a class="brand" href="index.php"><?= t('marque') ?></a>
        <nav>
            <a href="projects.php"><?= t('nav_projets') ?></a>
            <a href="lots.php"><?= t('nav_lots') ?></a>
            <a href="plan-zones.php"><?= t('nav_zones') ?></a>
            <a href="poi-import.php"><?= t('nav_poi') ?></a>
            <a href="fiches.php"><?= t('nav_fiches') ?></a>
            <a href="agents.php"><?= t('nav_agents') ?></a>
            <a href="messages.php"><?= t('nav_messages') ?></a>
            <a href="coordonnees.php"><?= t('nav_coord') ?></a>
            <a href="audit.php"><?= t('nav_audit') ?></a>
            <?php /* Pointeur, pas une seconde implémentation : l'éditeur de
                     visites 360° vit dans l'espace commercial, où le modèle de
                     droits sait déjà à quel agent appartient chaque visite. Le
                     dupliquer ici obligerait api/visites.php — qui téléverse et
                     supprime des fichiers — à accepter deux authentifications,
                     donc à entretenir deux fois les mêmes garde-fous.
                     Une session agent distincte reste nécessaire ; le rôle
                     « gestionnaire » y donne accès aux visites de tous. */ ?>
            <a href="../espace-agent.html" target="_blank"
               title="<?= t('nav_commercial_aide') ?>"><?= t('nav_commercial') ?></a>
            <a href="../index.html" target="_blank"><?= t('nav_site') ?></a>
            <a href="logout.php"><?= t('nav_sortir') ?></a>
            <?php /* Le sélecteur ferme la barre : c'est un réglage, pas une
                     destination — il ne doit pas se lire comme un onglet de
                     plus au milieu des pages. */ ?>
            <?= admin_selecteur_langue() ?>
        </nav>
    </header>
    <main class="shell">
    <?php
}

function admin_footer(): void
{
    ?>
    </main>
    </body>
    </html>
    <?php
}

function flash_message(): ?string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    $message = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return $message;
}

function set_flash(string $message): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    $_SESSION['flash'] = $message;
}
