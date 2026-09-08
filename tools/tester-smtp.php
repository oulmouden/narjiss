<?php

declare(strict_types=1);

/**
 * tools/tester-smtp.php — vérifie la configuration d'envoi, en ligne de commande.
 *
 * Sans lui, la seule façon de savoir si le SMTP marche était de demander une
 * réinitialisation de mot de passe et d'attendre un message qui n'arrivait
 * peut-être pas — sans jamais savoir POURQUOI : hôte injoignable, mot de passe
 * refusé, expéditeur non autorisé. Le client SMTP rend la raison ; ce script se
 * contente de la montrer.
 *
 * Le mot de passe n'est jamais affiché, ni en clair ni en partie : on dit
 * seulement s'il est renseigné. Un script de diagnostic qui recopie un secret à
 * l'écran finit dans un journal, une capture, un partage d'écran.
 *
 * Usage (en SSH, depuis la racine du site) :
 *     php tools/tester-smtp.php                    # état de la configuration
 *     php tools/tester-smtp.php mon@adresse.com    # ... et envoi d'un test
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/mail.php';

/** Une valeur de configuration, montrée sans jamais révéler de secret. */
function nj_montrer(string $cle, bool $secret = false): string
{
    $v = trim(nj_config($cle, ''));
    if ($v === '') return 'VIDE';
    return $secret ? 'renseigné (' . strlen($v) . ' caractères)' : $v;
}

echo "Configuration d'envoi\n";
echo "─────────────────────\n";
foreach (['SMTP_HOST' => false, 'SMTP_PORT' => false, 'SMTP_SECURE' => false,
          'SMTP_USER' => false, 'SMTP_PASS' => true,
          'MAIL_FROM' => false, 'MAIL_FROM_NAME' => false] as $cle => $secret) {
    printf("  %-16s %s\n", $cle, nj_montrer($cle, $secret));
}

$host = trim(nj_config('SMTP_HOST', ''));
$user = trim(nj_config('SMTP_USER', ''));
$from = trim(nj_config('MAIL_FROM', ''));

echo "\n";
if ($host === '') {
    echo "SMTP_HOST est vide : les messages vont dans data/mail-outbox/,\n";
    echo "ils ne partent pas. Renseignez api/.env.\n";
    exit(1);
}

/* Le piège le plus courant, et le plus muet : le serveur n'accepte d'expédier
   que depuis la boîte avec laquelle on s'est authentifié. Un MAIL_FROM
   différent est refusé par le serveur, souvent par un « relay denied » qui ne
   nomme pas la cause. */
if ($user !== '' && $from !== '' && strcasecmp($user, $from) !== 0) {
    echo "⚠ MAIL_FROM ($from) diffère de SMTP_USER ($user).\n";
    echo "  La plupart des hébergeurs n'expédient que depuis la boîte\n";
    echo "  authentifiée : mettez la même adresse dans les deux.\n\n";
}

$dest = $argv[1] ?? '';
if ($dest === '') {
    echo "Pour envoyer un message de test :\n";
    echo "    php tools/tester-smtp.php votre@adresse.com\n";
    exit(0);
}
if (!filter_var($dest, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Adresse de destination invalide : $dest\n");
    exit(1);
}

echo "Envoi d'un test à $dest …\n";
$corps = nj_mail_template(
    'Test de configuration',
    "<p style=\"margin:0\">Si vous lisez ce message, l'envoi depuis "
    . htmlspecialchars($host) . " fonctionne.</p>",
    null, null, 'interne'
);
[$ok, $info] = nj_mail($dest, 'Narjiss — test SMTP', $corps);

echo $ok ? "✓ Accepté par le serveur : $info\n"
         : "✗ Échec : $info\n";

if (!$ok) {
    echo "\nLectures utiles :\n";
    echo "  « connexion … impossible »   → hôte ou port faux, ou sortie bloquée\n";
    echo "  « SMTP: 535 … »              → identifiant ou mot de passe refusé\n";
    echo "  « SMTP: 550/553 … »          → expéditeur non autorisé (voir MAIL_FROM)\n";
}
exit($ok ? 0 : 1);
