<?php
/**
 * admin/fiche-qr.php — redirection vers la page publique des affichettes QR.
 *
 * La page a déménagé à la racine (../qr.php) : elle ne montre que des données
 * déjà publiques et sert au commercial du bureau de vente, qui n'a pas de
 * session d'administration. Cette redirection garde les anciens liens et
 * signets valides, y compris l'entrée du menu d'administration.
 */

declare(strict_types=1);

header('Location: ../qr.php', true, 302);
exit;
