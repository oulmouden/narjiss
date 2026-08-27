<?php

declare(strict_types=1);

/**
 * admin/coordonnees.php — coordonnées publiques du site.
 *
 * Téléphones, e-mail, adresse et réseaux sociaux vivaient dans
 * data/contacts.json, éditable uniquement à la main puis redéployé. Or ces
 * données bougent souvent — un commercial change de numéro, l'agence déménage
 * — et elles doivent correspondre AU MOT PRÈS à la fiche Google Business :
 * c'est sur cette concordance que Google décide de faire confiance à une
 * entreprise locale. Passer par un éditeur de texte pour ça n'était tenable ni
 * pour la fréquence, ni pour la précision.
 *
 * CE QUE L'ÉCRAN NE TOUCHE PAS
 * whatsappMessages — les modèles de message pré-remplis, un par langue — est
 * relu puis réécrit tel quel. Il ne figure pas dans le formulaire, mais il ne
 * doit surtout pas disparaître à l'enregistrement : c'est exactement ce que
 * produirait une écriture qui repartirait d'un tableau neuf.
 */

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';

admin_require_login();

const NJ_LANGUES_SITE = ['fr', 'en', 'ar', 'es'];

/** Réseaux dont le site sait afficher le logo (SOCIAL_LOGOS dans menu.js). */
const NJ_RESEAUX = ['instagram', 'facebook'];

$erreur = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // On repart de l'existant : tout ce que le formulaire ne couvre pas
        // survit ainsi sans qu'on ait à y penser.
        $contacts = read_contacts();

        /* ── Téléphones ────────────────────────────────────────────────────
           Les trois tableaux arrivent en parallèle. Une ligne dont le numéro
           est vide est ignorée : c'est ce qui permet de supprimer un numéro en
           effaçant son champ, sans chercher un bouton. */
        $numeros  = (array) ($_POST['tel_numero'] ?? []);
        $libelles = (array) ($_POST['tel_libelle'] ?? []);
        $waCoches = (array) ($_POST['tel_whatsapp'] ?? []);

        $phones = [];
        foreach ($numeros as $i => $numero) {
            $numero = trim((string) $numero);
            if ($numero === '') {
                continue;
            }
            $phones[] = [
                'label'    => trim((string) ($libelles[$i] ?? '')),
                'number'   => $numero,
                'whatsapp' => isset($waCoches[$i]),
            ];
        }
        $contacts['phones'] = $phones;

        /* ── E-mail ───────────────────────────────────────────────────────── */
        $email = trim((string) ($_POST['email'] ?? ''));
        if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException(t_brut('co_err_email'));
        }
        $contacts['email'] = $email;

        /* ── Adresse, une par langue ───────────────────────────────────────
           Le français fait référence : les autres langues y retombent quand
           elles sont vides. Renseigner l'arabe sans le français ferait donc
           disparaître l'adresse des quatre versions du site. */
        $adresses = (array) ($_POST['adresse'] ?? []);
        $adresse  = [];
        foreach (NJ_LANGUES_SITE as $lg) {
            $adresse[$lg] = trim((string) ($adresses[$lg] ?? ''));
        }
        if ($adresse['fr'] === '' && array_filter($adresse) !== []) {
            throw new RuntimeException(t_brut('co_err_adresse_fr'));
        }
        $contacts['address'] = $adresse;

        /* ── Réseaux sociaux ──────────────────────────────────────────────── */
        $rsUrl     = (array) ($_POST['rs_url'] ?? []);
        $rsPlate   = (array) ($_POST['rs_plateforme'] ?? []);
        $rsLibelle = (array) ($_POST['rs_libelle'] ?? []);
        $rsActif   = (array) ($_POST['rs_actif'] ?? []);

        $socials = [];
        foreach ($rsUrl as $i => $url) {
            $url = trim((string) $url);
            if ($url === '') {
                continue;
            }
            $plateforme = strtolower(trim((string) ($rsPlate[$i] ?? '')));
            $socials[] = [
                'platform' => $plateforme,
                'label'    => trim((string) ($rsLibelle[$i] ?? '')) ?: ucfirst($plateforme),
                'url'      => $url,
                'enabled'  => isset($rsActif[$i]),
            ];
        }
        $contacts['socials'] = $socials;

        write_contacts($contacts);
        set_flash(t_brut('co_enregistre', ['n' => count($phones)]));
        header('Location: coordonnees.php');
        exit;
    } catch (Throwable $exception) {
        $erreur = $exception->getMessage();
    }
}

$contacts = read_contacts();
$phones   = $contacts['phones'] ?? [];
$socials  = $contacts['socials'] ?? [];
$adresse  = $contacts['address'] ?? [];
$flash    = flash_message();

// Lignes vides en réserve : ajouter un numéro ne doit pas obliger à recharger.
$lignesTel = array_merge($phones, [[], []]);
$lignesRs  = array_merge($socials, [[]]);

function co_h($valeur): string
{
    return htmlspecialchars((string) $valeur, ENT_QUOTES, 'UTF-8');
}

admin_header(t_brut('co_titre'));
?>
<section class="panel">
    <h1><?= t('co_titre') ?></h1>
    <p style="color:#7a879a;font-size:.88rem;margin:.2rem 0 1rem"><?= t('co_intro') ?></p>

    <?php if ($flash): ?><p class="flash"><?= co_h($flash) ?></p><?php endif; ?>
    <?php if ($erreur !== null): ?><p class="flash error"><?= co_h($erreur) ?></p><?php endif; ?>

    <style>
        table.coord { width: 100%; border-collapse: collapse; margin: .6rem 0 1.4rem; }
        table.coord th, table.coord td { text-align: left; padding: .5rem .4rem; border-bottom: 1px solid #e6ebf1; }
        table.coord th { font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: #8592a3; }
        table.coord td input[type=text], table.coord td input[type=url] { width: 100%; }
        table.coord td.coche { text-align: center; width: 90px; }
        .co-aide { color: #7a879a; font-size: .85rem; margin: .2rem 0 .6rem; }
    </style>

    <form method="post">

        <h2><?= t('co_tel_titre') ?></h2>
        <p class="co-aide"><?= t('co_tel_aide') ?></p>
        <table class="coord">
            <thead>
                <tr>
                    <th><?= t('co_tel_numero') ?></th>
                    <th><?= t('co_tel_libelle') ?></th>
                    <th class="coche">WhatsApp</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($lignesTel as $i => $tel): ?>
                <tr>
                    <td><input type="text" name="tel_numero[<?= $i ?>]" dir="ltr"
                               value="<?= co_h($tel['number'] ?? '') ?>"
                               placeholder="+212 6 00 00 00 00"></td>
                    <td><input type="text" name="tel_libelle[<?= $i ?>]"
                               value="<?= co_h($tel['label'] ?? '') ?>"
                               placeholder="<?= co_h(t_brut('co_tel_exemple')) ?>"></td>
                    <td class="coche">
                        <input type="checkbox" name="tel_whatsapp[<?= $i ?>]"
                            <?= ! empty($tel['whatsapp']) ? 'checked' : '' ?>>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>

        <h2><?= t('co_email_titre') ?></h2>
        <label style="display:block;max-width:32rem">
            <input type="email" name="email" dir="ltr"
                   value="<?= co_h($contacts['email'] ?? '') ?>"
                   placeholder="contact@narjiss.company">
        </label>

        <h2 style="margin-top:1.6rem"><?= t('co_adresse_titre') ?></h2>
        <p class="co-aide"><?= t('co_adresse_aide') ?></p>
        <div class="grid">
            <?php foreach (NJ_LANGUES_SITE as $lg): ?>
                <label><?= strtoupper($lg) ?><?= $lg === 'fr' ? ' — ' . t_brut('co_reference') : '' ?>
                    <input type="text" name="adresse[<?= $lg ?>]"
                           <?= $lg === 'ar' ? 'dir="rtl"' : 'dir="ltr"' ?>
                           value="<?= co_h($adresse[$lg] ?? '') ?>">
                </label>
            <?php endforeach; ?>
        </div>

        <h2 style="margin-top:1.6rem"><?= t('co_rs_titre') ?></h2>
        <table class="coord">
            <thead>
                <tr>
                    <th><?= t('co_rs_plateforme') ?></th>
                    <th><?= t('co_rs_libelle') ?></th>
                    <th><?= t('co_rs_url') ?></th>
                    <th class="coche"><?= t('co_rs_actif') ?></th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($lignesRs as $i => $rs): ?>
                <tr>
                    <td><input type="text" name="rs_plateforme[<?= $i ?>]" list="nj-reseaux" dir="ltr"
                               value="<?= co_h($rs['platform'] ?? '') ?>"></td>
                    <td><input type="text" name="rs_libelle[<?= $i ?>]"
                               value="<?= co_h($rs['label'] ?? '') ?>"></td>
                    <td><input type="url" name="rs_url[<?= $i ?>]" dir="ltr"
                               value="<?= co_h($rs['url'] ?? '') ?>"></td>
                    <td class="coche">
                        <input type="checkbox" name="rs_actif[<?= $i ?>]"
                            <?= (! isset($rs['enabled']) || $rs['enabled']) ? 'checked' : '' ?>>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <datalist id="nj-reseaux">
            <?php foreach (NJ_RESEAUX as $r): ?>
                <option value="<?= $r ?>"></option>
            <?php endforeach; ?>
        </datalist>
        <p class="co-aide"><?= t('co_rs_aide') ?></p>

        <div class="actions" style="margin-top:1.2rem">
            <button class="button" type="submit"><?= t('co_enregistrer') ?></button>
        </div>
    </form>
</section>
<?php admin_footer(); ?>
