<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';

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

    $error = 'Identifiants incorrects.';
}
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Connexion - Narjiss Admin</title>
    <link rel="stylesheet" href="assets/admin.css">
</head>
<body>
<main class="login">
    <h1>Narjiss Admin</h1>
    <p>Connecte-toi pour modifier les projets du site statique.</p>
    <?php if ($error): ?>
        <p class="error"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>
    <form method="post">
        <label>
            Utilisateur
            <input name="user" autocomplete="username" required>
        </label>
        <br>
        <label>
            Mot de passe
            <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <br>
        <button type="submit">Entrer</button>
    </form>
</main>
</body>
</html>

