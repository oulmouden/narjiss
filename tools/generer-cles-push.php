<?php

declare(strict_types=1);

/**
 * tools/generer-cles-push.php — fabrique la paire de clés VAPID du Web Push.
 *
 * À LANCER UNE SEULE FOIS, puis à oublier. Le résultat se colle dans api/.env,
 * qui n'est jamais déployé : la clé privée ne passe que par votre session SSH,
 * ni par git, ni par deploy.sh.
 *
 * Usage, depuis la racine du site — sur VOTRE POSTE : tools/ n'est pas déployé
 * sur le VPS et n'a pas besoin de l'être, seul le résultat compte.
 *     php tools/generer-cles-push.php
 *
 * ATTENTION : régénérer les clés INVALIDE tous les abonnements existants. Les
 * téléphones déjà inscrits cesseraient d'être réveillés, sans le moindre
 * message d'erreur — leurs propriétaires croiraient simplement que plus personne
 * ne les demande. Ne relancez ce script que pour une première installation, ou
 * si la clé privée a fuité (et prévenez alors les commerciaux de réactiver
 * leurs alertes).
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;                       // jamais exposé au web, même si le fichier est déployé
}

/* Windows/XAMPP ne renseigne pas toujours le chemin d'openssl.cnf, sans lequel
   openssl_pkey_new() échoue avec une erreur de « fichier introuvable » peu
   parlante. On tente les emplacements connus avant d'abandonner ; sur un
   serveur Linux la valeur par défaut convient et cette liste reste inutilisée. */
function nj_push_options_openssl(): array {
    $base = ['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1'];
    $candidats = [
        null,                                    // configuration par défaut du système
        'C:/xampp/apache/conf/openssl.cnf',
        'C:/xampp/php/extras/ssl/openssl.cnf',
    ];
    foreach ($candidats as $cnf) {
        $opts = $cnf === null ? $base : $base + ['config' => $cnf];
        if ($cnf !== null && !is_file($cnf)) continue;
        $k = @openssl_pkey_new($opts);
        if ($k) { openssl_free_key_compat($k); return $opts; }
    }
    fwrite(STDERR, "Impossible de générer une clé EC P-256 : openssl est mal configuré.\n");
    while ($e = openssl_error_string()) fwrite(STDERR, "  $e\n");
    exit(1);
}

/** openssl_free_key est supprimée en PHP 8 ; l'appel devient inutile. */
function openssl_free_key_compat($k): void {
    if (PHP_VERSION_ID < 80000 && function_exists('openssl_free_key')) openssl_free_key($k);
}

function b64url(string $bin): string {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

$opts = nj_push_options_openssl();
$key  = openssl_pkey_new($opts);
if (!$key) { fwrite(STDERR, "Échec de la génération.\n"); exit(1); }

$details = openssl_pkey_get_details($key);
if (empty($details['ec']['x']) || empty($details['ec']['y'])) {
    fwrite(STDERR, "La clé produite n'expose pas ses coordonnées EC.\n");
    exit(1);
}

/* Clé publique au format « point non compressé » : 0x04 suivi de X puis Y, soit
   65 octets. C'est exactement ce que le navigateur attend comme
   applicationServerKey, et ce que le service de notification vérifie. */
$pubBrut = "\x04" . str_pad($details['ec']['x'], 32, "\x00", STR_PAD_LEFT)
                  . str_pad($details['ec']['y'], 32, "\x00", STR_PAD_LEFT);

$pem = '';
openssl_pkey_export($key, $pem, null, $opts);

echo "\n";
echo "Clés VAPID générées. Collez ces trois lignes dans api/.env :\n";
echo "────────────────────────────────────────────────────────────────────\n";
echo 'VAPID_PUBLIC_KEY=' . b64url($pubBrut) . "\n";
echo 'VAPID_PRIVATE_KEY=' . base64_encode($pem) . "\n";
echo 'VAPID_SUBJECT=mailto:contact@narjiss.company' . "\n";
echo "────────────────────────────────────────────────────────────────────\n";
echo "\n";
echo "Puis, dans l'espace agent, chaque commercial clique « Activer les alertes »\n";
echo "pour inscrire son appareil. Rien d'autre à faire.\n";
echo "\n";
echo "À coller dans le api/.env DU SERVEUR. deploy.sh exclut ce fichier : la clé\n";
echo "privée ne passe que par votre session SSH, jamais par git.\n\n";
