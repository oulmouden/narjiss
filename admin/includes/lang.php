<?php

declare(strict_types=1);

/**
 * Langues du back-office.
 *
 * POURQUOI
 * --------
 * Le site public parle quatre langues depuis toujours, et l'espace commercial
 * les a reçues (shared/backoffice-i18n.js). L'admin, lui, était en français pur
 * — un gestionnaire arabophone y validait des comptes et publiait des lots dans
 * une langue qu'il ne lit pas.
 *
 * COMMENT
 * -------
 * Un tableau de libellés par langue dans admin/lang/. Le français fait
 * référence : les autres langues sont fusionnées PAR-DESSUS lui, donc une clé
 * oubliée retombe sur la phrase française plutôt que d'afficher un identifiant
 * technique. C'est aussi ce qui permet d'ajouter des libellés sans devoir
 * traduire les quatre fichiers dans le même geste.
 *
 * Le choix est mémorisé en session ET dans un cookie d'un an : la session
 * s'achève à la déconnexion, or c'est précisément l'écran de connexion — la
 * première chose que voit l'utilisateur — qui doit déjà être dans sa langue.
 */

const ADMIN_LANGUES = ['fr', 'en', 'ar', 'es'];
const ADMIN_LANG_COOKIE = 'nj_admin_lang';

/** Langue courante, retenue pour la durée de la requête. */
function admin_lang(): string
{
    static $lang = null;
    if ($lang !== null) {
        return $lang;
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    // ?lang=xx : un clic sur le sélecteur. On l'enregistre, puis toutes les
    // pages suivantes le retrouvent sans avoir à traîner le paramètre.
    $demande = (string) ($_GET['lang'] ?? '');
    if (in_array($demande, ADMIN_LANGUES, true)) {
        $_SESSION['admin_lang'] = $demande;
        setcookie(ADMIN_LANG_COOKIE, $demande, [
            'expires'  => time() + 31536000,
            'path'     => '/',
            'samesite' => 'Lax',
        ]);
        return $lang = $demande;
    }

    $retenu = (string) ($_SESSION['admin_lang'] ?? $_COOKIE[ADMIN_LANG_COOKIE] ?? 'fr');

    return $lang = in_array($retenu, ADMIN_LANGUES, true) ? $retenu : 'fr';
}

/** Sens d'écriture, pour l'attribut dir de <html>. */
function admin_dir(): string
{
    return admin_lang() === 'ar' ? 'rtl' : 'ltr';
}

/** Locale complète, pour les dates. */
function admin_locale(): string
{
    return ['fr' => 'fr_FR', 'en' => 'en_GB', 'ar' => 'ar_MA', 'es' => 'es_ES'][admin_lang()] ?? 'fr_FR';
}

/** Table des libellés : le français, recouvert par la langue demandée. */
function admin_textes(): array
{
    static $textes = null;
    if ($textes !== null) {
        return $textes;
    }

    $base = require __DIR__ . '/../lang/fr.php';
    $lang = admin_lang();
    if ($lang === 'fr') {
        return $textes = $base;
    }

    $fichier = __DIR__ . '/../lang/' . $lang . '.php';
    $autre = is_file($fichier) ? require $fichier : [];

    return $textes = array_merge($base, $autre);
}

/**
 * Libellé traduit, prêt à être écrit dans du HTML.
 *
 * L'échappement est fait ICI plutôt qu'à chaque appel : ces textes sont écrits
 * par nous, mais ils contiennent des apostrophes et des chevrons français, et
 * un `<?= t('x') ?>` non échappé finirait par laisser passer un « & » brut.
 * Pour les contextes qui n'en veulent pas (JavaScript, attributs déjà
 * échappés), voir t_brut().
 *
 * `$vars` remplace les jetons {nom} : un pluriel ou un nombre ne se colle pas
 * de la même façon d'une langue à l'autre.
 */
function t(string $cle, array $vars = []): string
{
    return htmlspecialchars(t_brut($cle, $vars), ENT_QUOTES, 'UTF-8');
}

/** Libellé traduit, texte brut (JavaScript, en-têtes, json_encode). */
function t_brut(string $cle, array $vars = []): string
{
    $textes = admin_textes();
    $valeur = $textes[$cle] ?? $cle;

    foreach ($vars as $nom => $val) {
        $valeur = str_replace('{' . $nom . '}', (string) $val, $valeur);
    }

    return $valeur;
}

/** Adresse de la page courante avec la langue demandée, le reste préservé. */
function admin_lien_langue(string $lang): string
{
    $params = $_GET;
    $params['lang'] = $lang;

    return htmlspecialchars(basename((string) $_SERVER['PHP_SELF']) . '?' . http_build_query($params), ENT_QUOTES, 'UTF-8');
}

/** Le sélecteur de langue, mêmes libellés que le menu du site public. */
function admin_selecteur_langue(): string
{
    $libelles = ['fr' => 'FR', 'en' => 'EN', 'ar' => 'عربي', 'es' => 'ES'];
    $courante = admin_lang();
    $html = '<div class="lang-switch">';
    foreach (ADMIN_LANGUES as $l) {
        $actif = $l === $courante;
        $html .= '<a class="lang-btn' . ($actif ? ' active' : '') . '"'
               . ' href="' . admin_lien_langue($l) . '"'
               . ' hreflang="' . $l . '" lang="' . $l . '"'
               . ' aria-current="' . ($actif ? 'true' : 'false') . '">'
               . $libelles[$l] . '</a>';
    }

    return $html . '</div>';
}
