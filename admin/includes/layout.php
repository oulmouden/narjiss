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
        <title><?= htmlspecialchars($title) ?> - Narjiss Admin</title>
        <link rel="stylesheet" href="assets/admin.css">
    </head>
    <body>
    <header class="topbar">
        <a class="brand" href="index.php">Narjiss Admin</a>
        <nav>
            <a href="projects.php">Projets</a>
            <a href="audit.php">Audit</a>
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
