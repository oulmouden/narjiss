<?php
/**
 * admin/lots.php — grille de commercialisation d'un projet.
 * Liste filtrable des lots et changement de statut en un clic, sans réimport.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/lots-lib.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

/* Libellé traduit d'un statut de lot. nj_lot_statut_libelle() (api/lots-lib.php)
   sert aussi le site public et l'API : on ne la traduit pas, on double sa table
   côté admin. */
function admin_lot_statut(string $statut): string
{
    return t_brut('lot_statut_' . $statut);
}

/* Plutôt qu'une erreur 500 que rien n'explique, on nomme la cause exacte :
   base injoignable et schéma non migré demandent des gestes différents. */
$etatSchema = nj_lots_etat_schema();
if ($etatSchema !== 'ok') {
    admin_header(t_brut('nav_lots'));
    ?>
    <section class="panel">
        <h1><?= t('lots_titre') ?></h1>
        <?php if ($etatSchema === 'sans-base'): ?>
            <div class="error"><?= t('lots_err_base') ?></div>
            <?php /* t_brut et non t() : la phrase porte du balisage (<code>,
                     <em>) qu'on veut voir rendu, pas affiché. Le texte est le
                     nôtre, il ne vient d'aucune saisie. */ ?>
            <p><?= t_brut('lots_err_base_aide') ?></p>
            <pre style="background:#f4f6f9;padding:1rem;border-radius:6px;overflow:auto">php sql/etat.php</pre>
        <?php else: ?>
            <div class="error"><?= t_brut('lots_err_table') ?></div>
            <p><?= t('lots_err_table_aide') ?></p>
            <pre style="background:#f4f6f9;padding:1rem;border-radius:6px;overflow:auto">php sql/migrer.php sql/001_parcours_client.sql
php sql/migrer.php sql/003_lots_medias.sql</pre>
            <p><?= t('lots_err_migrations') ?></p>
        <?php endif; ?>
    </section>
    <?php
    admin_footer();
    exit;
}

$projets = nj_projects();
$projet  = (string) ($_GET['projet'] ?? ($_POST['projet'] ?? ''));
if ($projet === '' || !isset($projets[$projet])) {
    $projet = array_key_first($projets) ?? '';
}

/* ── Changement de statut (POST) ──────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'statut') {
    $lotId  = (int) ($_POST['lot_id'] ?? 0);
    $statut = (string) ($_POST['statut'] ?? '');
    if ($lotId > 0 && nj_lot_set_statut($lotId, $statut, NARJISS_ADMIN_USER)) {
        set_flash(t_brut('lot_flash_maj', ['s' => admin_lot_statut($statut)]));
    } else {
        set_flash(t_brut('lot_flash_refus'));
    }
    header('Location: lots.php?' . http_build_query(['projet' => $projet] + array_filter([
        'immeuble' => $_POST['immeuble'] ?? '', 'statut_f' => $_POST['statut_f'] ?? '',
        'typologie' => $_POST['typologie'] ?? '',
    ])));
    exit;
}

$filtres = [
    'immeuble'  => trim((string) ($_GET['immeuble'] ?? '')),
    'typologie' => trim((string) ($_GET['typologie'] ?? '')),
    'statut'    => trim((string) ($_GET['statut_f'] ?? '')),
];
$lots     = $projet !== '' ? nj_lots_liste($projet, $filtres) : [];
$synthese = $projet !== '' ? nj_lots_synthese($projet) : [];
$flash    = flash_message();

$immeubles = array_values(array_unique(array_column(nj_lots_liste($projet), 'immeuble')));
sort($immeubles);
$total = array_sum(array_column($synthese, 'n'));

admin_header(t_brut('nav_lots'));
?>
<div class="actions">
    <div>
        <h1><?= t('lots_titre') ?></h1>
        <p><?= t('lots_compte', ['n' => $total]) ?></p>
    </div>
    <a class="button" href="lots-import.php?projet=<?= urlencode($projet) ?>"><?= t('lots_importer') ?></a>
</div>

<?php if ($flash): ?>
    <div class="notice"><?= htmlspecialchars($flash) ?></div>
<?php endif; ?>

<form method="get" class="panel">
    <div class="grid">
        <label><?= t('th_projet') ?>
            <select name="projet" onchange="this.form.submit()">
                <?php foreach ($projets as $id => $p): ?>
                    <option value="<?= htmlspecialchars($id) ?>" <?= $id === $projet ? 'selected' : '' ?>>
                        <?= htmlspecialchars($p['name'][admin_lang()] ?? $p['name']['fr'] ?? $id) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label><?= t('f_immeuble') ?>
            <select name="immeuble">
                <option value=""><?= t('f_tous') ?></option>
                <?php foreach ($immeubles as $im): ?>
                    <option value="<?= htmlspecialchars($im) ?>" <?= $im === $filtres['immeuble'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($im) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label><?= t('th_typologie') ?>
            <select name="typologie">
                <option value=""><?= t('f_toutes') ?></option>
                <?php foreach (nj_lot_enums()['typologie'] as $t): ?>
                    <option value="<?= $t ?>" <?= $t === $filtres['typologie'] ? 'selected' : '' ?>>
                        <?= strtoupper($t) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label><?= t('th_statut') ?>
            <select name="statut_f">
                <option value=""><?= t('f_tous') ?></option>
                <?php foreach (nj_lot_enums()['statut'] as $s): ?>
                    <option value="<?= $s ?>" <?= $s === $filtres['statut'] ? 'selected' : '' ?>>
                        <?= t('lot_statut_' . $s) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
    </div>
    <div class="actions-inline">
        <button class="button" type="submit"><?= t('bt_filtrer') ?></button>
        <a class="button secondary" href="lots.php?projet=<?= urlencode($projet) ?>"><?= t('bt_reinit') ?></a>
    </div>
</form>

<div class="panel">
    <?php foreach (nj_lot_enums()['statut'] as $s):
        $n  = $synthese[$s]['n'] ?? 0;
        $ca = $synthese[$s]['ca'] ?? 0.0; ?>
        <span class="badge lot-<?= $s ?>">
            <?= t('lot_statut_' . $s) ?> : <strong><?= $n ?></strong>
            <?php if ($n > 0): ?><small>(<?= number_format($ca, 0, ',', ' ') ?> DH)</small><?php endif; ?>
        </span>
    <?php endforeach; ?>
</div>

<?php if (!$lots): ?>
    <div class="notice"><?= t('lots_aucun') ?></div>
<?php else: ?>
<table>
    <thead>
        <tr>
            <th><?= t('th_lot') ?></th><th><?= t('th_typologie') ?></th><th><?= t('th_surface') ?></th><th><?= t('th_orientation') ?></th>
            <th><?= t('th_prix') ?></th><th><?= t('th_prix_m2') ?></th><th><?= t('th_statut') ?></th><th><?= t('th_changer') ?></th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($lots as $lot): ?>
        <tr>
            <td>
                <strong><?= htmlspecialchars($lot['numero_lot']) ?></strong><br>
                <small><?= t('lot_immeuble_niveau', ['i' => $lot['immeuble'], 'n' => $lot['niveau']]) ?></small>
            </td>
            <td><?= strtoupper(htmlspecialchars($lot['typologie'])) ?></td>
            <td>
                <?= number_format((float) $lot['surface_habitable'], 1, ',', ' ') ?> m²
                <?php if ((float) $lot['surface_balcon'] > 0): ?>
                    <br><small><?= t('lot_balcon', ['s' => number_format((float) $lot['surface_balcon'], 1, ',', ' ')]) ?></small>
                <?php endif; ?>
            </td>
            <td><?= htmlspecialchars($lot['orientation']) ?></td>
            <td><?= number_format((float) $lot['prix_dh'], 0, ',', ' ') ?> DH</td>
            <td><?= number_format((float) $lot['prix_m2'], 0, ',', ' ') ?></td>
            <td><span class="badge lot-<?= htmlspecialchars($lot['statut']) ?>">
                <?= t('lot_statut_' . $lot['statut']) ?></span>
                <?php if ($lot['date_fin_option']): ?>
                    <br><small><?= t('lot_jusquau', ['d' => $lot['date_fin_option']]) ?></small>
                <?php endif; ?>
            </td>
            <td>
                <form method="post" class="actions-inline">
                    <input type="hidden" name="action" value="statut">
                    <input type="hidden" name="projet" value="<?= htmlspecialchars($projet) ?>">
                    <input type="hidden" name="lot_id" value="<?= (int) $lot['id'] ?>">
                    <input type="hidden" name="immeuble" value="<?= htmlspecialchars($filtres['immeuble']) ?>">
                    <input type="hidden" name="typologie" value="<?= htmlspecialchars($filtres['typologie']) ?>">
                    <input type="hidden" name="statut_f" value="<?= htmlspecialchars($filtres['statut']) ?>">
                    <select name="statut" onchange="this.form.submit()">
                        <?php foreach (nj_lot_enums()['statut'] as $s): ?>
                            <option value="<?= $s ?>" <?= $s === $lot['statut'] ? 'selected' : '' ?>>
                                <?= t('lot_statut_' . $s) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php endif; ?>
<?php admin_footer(); ?>
