<?php
/**
 * tools/reset-admin-password.php — redéfinit le mot de passe du back-office.
 *
 * Le mot de passe n'est stocké que sous forme de hachage bcrypt dans
 * admin/includes/config.php : il est irrécupérable, mais remplaçable.
 *
 * Le mot de passe est saisi au clavier, jamais passé en argument : il ne
 * laisse donc aucune trace dans l'historique du shell.
 *
 * Usage (depuis la racine du dépôt) :
 *   C:\xampp\php\php.exe tools\reset-admin-password.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Cet outil ne s'exécute qu'en ligne de commande.\n");
}

$config = __DIR__ . '/../admin/includes/config.php';
if (!is_file($config)) {
    exit("Introuvable : $config\n");
}

$source = (string) file_get_contents($config);
if (!preg_match("/const\s+NARJISS_ADMIN_PASSWORD_HASH\s*=\s*'[^']*'\s*;/", $source)) {
    exit("La constante NARJISS_ADMIN_PASSWORD_HASH est absente de config.php.\n");
}
if (preg_match("/const\s+NARJISS_ADMIN_USER\s*=\s*'([^']*)'/", $source, $m)) {
    echo "Utilisateur du back-office : {$m[1]}\n";
}

/** Lit une saisie au clavier, sans écho quand le terminal le permet. */
function nj_prompt(string $label): string
{
    echo $label;
    // Sous Windows, `stty` n'existe pas : on saisit en clair, ce qui reste
    // acceptable pour un poste de développement local.
    $muet = stripos(PHP_OS_FAMILY, 'Windows') === false && shell_exec('command -v stty');
    if ($muet) {
        shell_exec('stty -echo');
    }
    $valeur = trim((string) fgets(STDIN));
    if ($muet) {
        shell_exec('stty echo');
        echo "\n";
    }
    return $valeur;
}

$mdp = nj_prompt('Nouveau mot de passe        : ');
if (mb_strlen($mdp) < 8) {
    exit("Refusé : 8 caractères minimum.\n");
}
if ($mdp !== nj_prompt('Confirmer le mot de passe   : ')) {
    exit("Refusé : les deux saisies diffèrent.\n");
}

// Sauvegarde horodatée avant réécriture, comme le fait déjà l'admin pour
// les fichiers de données.
$sauvegarde = $config . '.bak-' . date('Ymd-His');
if (!copy($config, $sauvegarde)) {
    exit("Impossible d'écrire la sauvegarde $sauvegarde\n");
}

$hash = password_hash($mdp, PASSWORD_BCRYPT);

// Remplacement par callback, et non par chaîne : un hachage bcrypt commence
// par « $2y$… » et preg_replace lirait ces $n comme des références de groupe,
// ce qui écrirait un hachage tronqué.
$nouveau = preg_replace_callback(
    "/const\s+NARJISS_ADMIN_PASSWORD_HASH\s*=\s*'[^']*'\s*;/",
    static fn(): string => "const NARJISS_ADMIN_PASSWORD_HASH = '" . $hash . "';",
    $source,
    1
);

if (!is_string($nouveau) || $nouveau === $source
    || file_put_contents($config, $nouveau) === false) {
    exit("Échec de l'écriture. Le fichier d'origine est intact.\n");
}

// Vérifie que le hachage écrit valide bien le mot de passe saisi.
$relu = (string) file_get_contents($config);
preg_match("/const\s+NARJISS_ADMIN_PASSWORD_HASH\s*=\s*'([^']*)'/", $relu, $v);
if (!isset($v[1]) || !password_verify($mdp, $v[1])) {
    copy($sauvegarde, $config);
    exit("Vérification échouée : l'ancien fichier a été restauré.\n");
}

echo "\nMot de passe redéfini. Sauvegarde : " . basename($sauvegarde) . "\n";
echo "Connexion : http://localhost/narjiss/admin/\n";
echo "\nRappel : config.php est versionné. Ne commitez ce changement que si\n";
echo "vous acceptez que le hachage se retrouve dans l'historique git.\n";
