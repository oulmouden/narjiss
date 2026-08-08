<?php

declare(strict_types=1);

/**
 * admin/reinitialiser-mdp.php — redéfinit l'identifiant admin, en ligne de commande.
 *
 * Le mot de passe admin est stocké haché (bcrypt) dans admin/includes/config.php :
 * il ne peut pas être « retrouvé », seulement remplacé. Ce script le fait sans
 * jamais exposer le mot de passe :
 *   - la saisie se fait au clavier, sans écho, donc rien dans l'historique du
 *     shell ni dans la liste des processus (contrairement à un
 *     « php -r 'echo password_hash("secret", …);' » qu'on retrouverait dans
 *     ~/.bash_history et dans un ps aux) ;
 *   - la sauvegarde de l'ancien fichier va hors du dossier web, pour ne pas
 *     recréer un config.php.bak téléchargeable.
 *
 * Usage (en SSH, depuis la racine du site) :
 *     php admin/reinitialiser-mdp.php              # change le mot de passe
 *     php admin/reinitialiser-mdp.php --user chef  # change aussi l'identifiant
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$config = __DIR__ . '/includes/config.php';
if (!is_file($config) || !is_writable($config)) {
    fwrite(STDERR, "config.php introuvable ou non modifiable : $config\n");
    exit(1);
}

$source = (string) file_get_contents($config);

// Identifiant actuel, pour l'afficher et le conserver si on n'en change pas.
preg_match("/NARJISS_ADMIN_USER\s*=\s*'([^']*)'/", $source, $m);
$userActuel = $m[1] ?? 'admin';

$nouvelUser = null;
foreach ($argv as $i => $a) {
    if ($a === '--user' && isset($argv[$i + 1])) $nouvelUser = trim($argv[$i + 1]);
}

echo "Identifiant actuel : $userActuel\n";
if ($nouvelUser !== null && $nouvelUser !== '') {
    echo "Nouvel identifiant : $nouvelUser\n";
}

/** Lit une saisie sans l'afficher à l'écran. */
function nj_saisie_masquee(string $invite): string
{
    echo $invite;
    // stty n'existe que sur les systèmes POSIX — donc sur le VPS, pas sous
    // Windows où la saisie restera simplement visible.
    $muet = DIRECTORY_SEPARATOR === '/';
    if ($muet) @shell_exec('stty -echo 2>/dev/null');
    $v = rtrim((string) fgets(STDIN), "\r\n");
    if ($muet) { @shell_exec('stty echo 2>/dev/null'); echo "\n"; }
    return $v;
}

$mdp = nj_saisie_masquee('Nouveau mot de passe : ');
if (strlen($mdp) < 10) {
    fwrite(STDERR, "Trop court : 10 caractères minimum pour un accès d'administration.\n");
    exit(1);
}
if ($mdp !== nj_saisie_masquee('Confirmer            : ')) {
    fwrite(STDERR, "Les deux saisies diffèrent, rien n'a été modifié.\n");
    exit(1);
}

$hash = password_hash($mdp, PASSWORD_DEFAULT);
if (!is_string($hash) || $hash === '') {
    fwrite(STDERR, "Le hachage a échoué.\n");
    exit(1);
}

/* preg_replace interpréterait les « $2y$ » du hash comme des références de
   capture : on passe donc par un callback, qui ne fait aucune substitution. */
$sortie = preg_replace_callback(
    "/(NARJISS_ADMIN_PASSWORD_HASH\s*=\s*)'[^']*'/",
    static fn(array $c): string => $c[1] . var_export($hash, true),
    $source,
    1,
    $nRemplace
);
if (!$nRemplace) {
    fwrite(STDERR, "Ligne NARJISS_ADMIN_PASSWORD_HASH introuvable dans config.php.\n");
    exit(1);
}

if ($nouvelUser !== null && $nouvelUser !== '') {
    $sortie = preg_replace_callback(
        "/(NARJISS_ADMIN_USER\s*=\s*)'[^']*'/",
        static fn(array $c): string => $c[1] . var_export($nouvelUser, true),
        (string) $sortie,
        1
    );
}

// Sauvegarde hors du dossier web : un .bak dans admin/ serait téléchargeable.
$sauvegarde = sys_get_temp_dir() . '/narjiss-config-' . date('Ymd-His') . '.php.sauvegarde';
file_put_contents($sauvegarde, $source);

if (file_put_contents($config, $sortie) === false) {
    fwrite(STDERR, "Écriture impossible. Ancien fichier conservé : $sauvegarde\n");
    exit(1);
}

// Contrôle : on relit le fichier écrit et on vérifie que le mot de passe passe.
$verif = [];
preg_match("/NARJISS_ADMIN_PASSWORD_HASH\s*=\s*'([^']*)'/", (string) file_get_contents($config), $verif);
if (!isset($verif[1]) || !password_verify($mdp, $verif[1])) {
    copy($sauvegarde, $config);
    fwrite(STDERR, "Vérification échouée, l'ancien fichier a été restauré.\n");
    exit(1);
}

echo "\nMot de passe mis à jour et vérifié.\n";
echo "  identifiant : " . ($nouvelUser ?: $userActuel) . "\n";
echo "  sauvegarde  : $sauvegarde  (hors du dossier web, à supprimer une fois rassuré)\n";
