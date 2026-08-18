<?php

declare(strict_types=1);

function admin_header(string $title): void
{
    ?>
    <!doctype html>
    <html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title><?= htmlspecialchars($title) ?> - Narjiss Admin</title>
        <?php /* Couleurs des statuts de lot : le même fichier que le site public,
                 pour que la grille du back-office et le plan vu par le client ne
                 puissent pas se contredire. Chargé avant admin.css, qui s'en sert. */ ?>
        <link rel="stylesheet" href="../shared/statuts-lots.css?v=1">
        <link rel="stylesheet" href="assets/admin.css?v=5">
    </head>
    <body>
    <header class="topbar">
        <a class="brand" href="index.php">Narjiss Admin</a>
        <nav>
            <a href="projects.php">Projets</a>
            <a href="lots.php">Lots</a>
            <a href="plan-zones.php">Zones des plans</a>
            <a href="poi-import.php">POI</a>
            <a href="fiches.php">Fiches clients</a>
            <a href="agents.php">Agents</a>
            <a href="messages.php">Messages</a>
            <a href="audit.php">Audit</a>
            <?php /* Pointeur, pas une seconde implémentation : l'éditeur de
                     visites 360° vit dans l'espace commercial, où le modèle de
                     droits sait déjà à quel agent appartient chaque visite. Le
                     dupliquer ici obligerait api/visites.php — qui téléverse et
                     supprime des fichiers — à accepter deux authentifications,
                     donc à entretenir deux fois les mêmes garde-fous.
                     Une session agent distincte reste nécessaire ; le rôle
                     « gestionnaire » y donne accès aux visites de tous. */ ?>
            <a href="../espace-agent.html" target="_blank"
               title="Éditeur de visites 360°, fiches et messages. Connexion agent distincte ; le rôle « gestionnaire » voit les visites de tous.">Espace commercial</a>
            <a href="../index.html" target="_blank">Site</a>
            <a href="logout.php">Sortir</a>
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
