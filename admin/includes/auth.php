<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function admin_is_logged_in(): bool
{
    return isset($_SESSION['narjiss_admin']) && $_SESSION['narjiss_admin'] === true;
}

function admin_require_login(): void
{
    if (admin_is_logged_in()) {
        return;
    }

    header('Location: login.php');
    exit;
}

function admin_login(string $user, string $password): bool
{
    if ($user !== NARJISS_ADMIN_USER || ! password_verify($password, NARJISS_ADMIN_PASSWORD_HASH)) {
        return false;
    }

    session_regenerate_id(true);
    $_SESSION['narjiss_admin'] = true;

    return true;
}

function admin_logout(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }

    session_destroy();
}

