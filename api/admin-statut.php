<?php
/**
 * api/admin-statut.php — la session courante est-elle celle de l'administrateur,
 * et si oui, où se trouve le dossier de présentation interne ?
 *
 * Existe pour les pages STATIQUES. guides.html est un .html pur : il ne peut pas
 * interroger la session lui-même. Il demande donc ici, et n'affiche son bloc
 * réservé que si la réponse est oui.
 *
 * POURQUOI L'URL EST RENVOYÉE ICI ET NON ÉCRITE DANS LA PAGE
 * Le dossier de présentation n'est protégé que par un jeton d'URL impossible à
 * deviner. L'inscrire dans le JavaScript de guides.html le rendrait lisible par
 * n'importe quel visiteur d'un simple « afficher le code source » — le contraire
 * du but recherché. Le jeton ne quitte donc le serveur qu'une fois l'admin
 * reconnu.
 *
 * CE N'EST PAS UN CONTRÔLE D'ACCÈS pour autant : cet endpoint masque un bloc et
 * garde un jeton, il ne garde pas la porte. Ce qui protège réellement le dossier
 * reste ce jeton et le « noindex » de ses pages.
 */

declare(strict_types=1);

// Réutilise le contrôle canonique du back-office plutôt que d'en refaire un
// deuxième à côté, qui finirait par diverger.
require_once __DIR__ . '/../admin/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');
// Jamais de cache : une réponse gardée montrerait le bloc à un visiteur, ou le
// cacherait à l'admin, selon qui a rempli le cache le premier.
header('Cache-Control: no-store, max-age=0');

/**
 * Le dossier de présentation, trouvé en parcourant presentation/.
 *
 * On ne lit PAS presentation/.jeton : ce fichier n'est pas déployé, donc le VPS
 * ne l'a pas. Le dossier lui-même, lui, y est bien — c'est la seule source
 * fiable des deux côtés.
 */
function nj_dossier_presentation(): ?string
{
    foreach (glob(dirname(__DIR__) . '/presentation/*', GLOB_ONLYDIR) ?: [] as $dir) {
        if (is_file($dir . '/index.html')) {
            return 'presentation/' . rawurlencode(basename($dir)) . '/';
        }
    }
    return null;
}

/**
 * Libellés du bloc réservé, dans les quatre langues du site.
 *
 * Ils sont ICI et non dans guides.html pour la même raison que l'URL : écrits
 * dans la page publique, ils annonceraient à quiconque affiche le code source
 * qu'un dossier interne existe et de quoi il parle. La page publique ne contient
 * donc qu'un conteneur vide.
 */
const NJ_HUB_INTERNE = [
    'fr' => [
        'section'     => "Réservé à l'administration",
        'badge'       => 'Interne',
        'titre'       => 'Dossier de présentation à la direction',
        'description' => "Ce que narjiss.company change pour la vente, et les bornes "
                       . "tactiles en agence. Document interne : ce bloc n'apparaît que "
                       . "parce que vous êtes connecté à l'administration.",
        'lire'        => 'Ouvrir le dossier',
    ],
    'en' => [
        'section'     => 'Administration only',
        'badge'       => 'Internal',
        'titre'       => 'Management presentation pack',
        'description' => 'What narjiss.company changes for sales, and touch screens in '
                       . 'the branches. Internal document: this block only shows because '
                       . 'you are signed in to the admin.',
        'lire'        => 'Open the pack',
    ],
    'ar' => [
        'section'     => 'خاصّ بالإدارة',
        'badge'       => 'داخلي',
        'titre'       => 'ملف التقديم إلى الإدارة',
        'description' => 'ما يغيّره narjiss.company في البيع، والشاشات اللمسية في '
                       . 'الوكالات. وثيقة داخلية: لا تظهر هذه البطاقة إلاّ لأنّك '
                       . 'متّصل بلوحة الإدارة.',
        'lire'        => 'فتح الملف',
    ],
    'es' => [
        'section'     => 'Reservado a la administración',
        'badge'       => 'Interno',
        'titre'       => 'Dossier de presentación a la dirección',
        'description' => 'Lo que narjiss.company cambia para la venta y las pantallas '
                       . 'táctiles en agencia. Documento interno: este bloque solo '
                       . 'aparece porque ha iniciado sesión en la administración.',
        'lire'        => 'Abrir el dossier',
    ],
];

$admin = admin_is_logged_in();

echo json_encode(
    $admin
        ? ['admin' => true,
           'presentation' => nj_dossier_presentation(),
           'libelles' => NJ_HUB_INTERNE]
        : ['admin' => false],
    JSON_UNESCAPED_UNICODE
);
