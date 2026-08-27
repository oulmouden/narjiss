<?php
/**
 * admin/lots-import.php — import d'une grille de lots, CSV ou classeur Excel.
 *
 * Déroulé en deux temps, volontairement : on téléverse, on regarde ce qui va
 * changer, puis seulement on confirme. Un import de grille écrase des prix et
 * des disponibilités ; il ne doit jamais partir à l'aveugle.
 *
 * Un .xlsx est converti en CSV dès la réception (feuille « Lots »), puis suit
 * exactement le même chemin qu'un CSV : analyse, aperçu, confirmation. Si le
 * serveur n'a pas les extensions nécessaires, seul le CSV est accepté et le
 * formulaire le dit.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/lots-lib.php';
require_once __DIR__ . '/../api/xlsx-lib.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

// Même garde que sur admin/lots.php : importer dans une table absente ne
// donnerait qu'une erreur 500 au moment de la confirmation.
if (!nj_lots_schema_present()) {
    header('Location: lots.php');
    exit;
}

const NJ_IMPORT_TAILLE_MAX = 4 * 1024 * 1024;   // 4 Mo : très large pour du CSV

/** Extensions acceptées, selon ce que le serveur sait lire. */
$xlsxOk     = nj_xlsx_supporte();
$extensions = $xlsxOk ? ['csv', 'txt', 'xlsx'] : ['csv', 'txt'];

$projets = nj_projects();
$projet  = (string) ($_GET['projet'] ?? ($_POST['projet'] ?? ''));
if ($projet === '' || !isset($projets[$projet])) {
    $projet = array_key_first($projets) ?? '';
}

$erreurs = [];
$alertes = [];
$apercu  = null;
$stats   = null;

/* Jeton anti-CSRF : l'import est destructif, on ne veut pas qu'une page
   tierce puisse le déclencher pendant qu'un admin est connecté. */
if (empty($_SESSION['nj_csrf'])) {
    $_SESSION['nj_csrf'] = bin2hex(random_bytes(16));
}
$csrf = (string) $_SESSION['nj_csrf'];

/** Chemin du fichier temporaire conservé entre l'aperçu et la confirmation. */
function nj_import_tmp(): string
{
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'narjiss-import-' . session_id() . '.csv';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
        $erreurs[] = t_brut('li_err_session');
    } elseif (($_POST['action'] ?? '') === 'analyser') {
        $f = $_FILES['fichier'] ?? null;
        if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $erreurs[] = t_brut('li_err_fichier');
        } elseif ((int) $f['size'] > NJ_IMPORT_TAILLE_MAX) {
            $erreurs[] = t_brut('li_err_taille');
        } elseif (!in_array(strtolower((string) pathinfo((string) $f['name'], PATHINFO_EXTENSION)), $extensions, true)) {
            $erreurs[] = $xlsxOk
                ? t_brut('li_err_format_xlsx')
                : t_brut('li_err_format_csv');
        } else {
            $tmp = nj_import_tmp();
            $estXlsx = strtolower((string) pathinfo((string) $f['name'], PATHINFO_EXTENSION)) === 'xlsx';
            // Le classeur est converti ici et une seule fois : tout l'aval
            // (aperçu, confirmation) ne connaît que le CSV temporaire.
            $depose = $estXlsx
                ? move_uploaded_file((string) $f['tmp_name'], $tmp . '.xlsx')
                : move_uploaded_file((string) $f['tmp_name'], $tmp);

            if (!$depose) {
                $erreurs[] = t_brut('li_err_conserver');
            } elseif ($estXlsx && ($msg = nj_xlsx_vers_csv($tmp . '.xlsx', $tmp, 'Lots')) !== null) {
                @unlink($tmp . '.xlsx');
                $erreurs[] = $msg;
            } else {
                if ($estXlsx) @unlink($tmp . '.xlsx');
                $_SESSION['nj_import_nom'] = (string) $f['name'];
                $lu = nj_lots_lire_csv($tmp);
                $erreurs = array_merge($erreurs, $lu['erreurs']);
                $alertes = $lu['alertes'];

                // Un CSV portant un autre projet que celui sélectionné est
                // presque toujours une erreur de manipulation.
                $autres = array_values(array_unique(array_column($lu['lignes'], 'projet')));
                if ($autres && $autres !== [$projet]) {
                    $erreurs[] = t_brut('li_err_autre_projet', [
                        'a' => implode(', ', $autres), 'b' => $projet,
                    ]);
                } elseif ($lu['lignes']) {
                    $apercu = nj_lots_apercu($lu['lignes'], $projet);
                    $_SESSION['nj_import_pret'] = true;
                }
            }
        }
    } elseif (($_POST['action'] ?? '') === 'confirmer' && !empty($_SESSION['nj_import_pret'])) {
        $tmp = nj_import_tmp();
        $nom = (string) ($_SESSION['nj_import_nom'] ?? 'import.csv');
        if (!is_file($tmp)) {
            $erreurs[] = t_brut('li_err_perdu');
        } else {
            $lu = nj_lots_lire_csv($tmp);
            if ($lu['lignes']) {
                try {
                    $stats = nj_lots_importer($lu['lignes'], $projet, $nom, NARJISS_ADMIN_USER);
                    set_flash(sprintf(
                        t_brut('li_termine'),
                        $stats['creees'], $stats['majs']
                    ));
                    unset($_SESSION['nj_import_pret'], $_SESSION['nj_import_nom']);
                    @unlink($tmp);
                    header('Location: lots.php?projet=' . urlencode($projet));
                    exit;
                } catch (Throwable $e) {
                    // La transaction a été annulée : la grille est restée intacte.
                    $erreurs[] = t_brut('li_err_annule', ['d' => $e->getMessage()]);
                }
            } else {
                $erreurs[] = t_brut('li_err_vide');
            }
        }
    }
}

admin_header(t_brut('li_titre_court'));
?>
<div class="actions">
    <div>
        <h1><?= t('li_titre') ?></h1>
        <p><?= t('th_projet') ?> : <strong><?= htmlspecialchars($projets[$projet]['name'][admin_lang()] ?? $projets[$projet]['name']['fr'] ?? $projet) ?></strong></p>
    </div>
    <a class="button secondary" href="lots.php?projet=<?= urlencode($projet) ?>"><?= t('li_retour') ?></a>
</div>

<?php foreach ($erreurs as $e): ?>
    <div class="error"><?= htmlspecialchars($e) ?></div>
<?php endforeach; ?>

<form method="post" enctype="multipart/form-data" class="panel">
    <input type="hidden" name="action" value="analyser">
    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
    <div class="grid">
        <label><?= t('th_projet') ?>
            <select name="projet">
                <?php foreach ($projets as $id => $p): ?>
                    <option value="<?= htmlspecialchars($id) ?>" <?= $id === $projet ? 'selected' : '' ?>>
                        <?= htmlspecialchars($p['name'][admin_lang()] ?? $p['name']['fr'] ?? $id) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label><?= t($xlsxOk ? 'li_classeur' : 'li_fichier_csv') ?>
            <input type="file" name="fichier" required
                   accept="<?= $xlsxOk ? '.xlsx,.csv,text/csv' : '.csv,text/csv' ?>">
            <small class="file-hint">
                <?= t_brut($xlsxOk ? 'li_aide_xlsx' : 'li_aide_csv') ?>
                <?= t('li_colonnes') ?> : <?= implode(', ', NJ_LOT_COLONNES_REQUISES) ?>.
            </small>
        </label>
    </div>
    <div class="actions-inline">
        <button class="button" type="submit"><?= t('li_analyser') ?></button>
    </div>
</form>

<?php if ($apercu !== null):
    $nbC = count($apercu['creations']);
    $nbM = count($apercu['modifications']);
    $nbI = count($apercu['inchanges']);
    $nbO = count($apercu['orphelins']); ?>

<div class="panel">
    <h2><?= t('li_ce_que') ?></h2>
    <p>
        <span class="badge lot-disponible"><?= t('li_creations', ['n' => $nbC]) ?></span>
        <span class="badge lot-optionne"><?= t('li_modifications', ['n' => $nbM]) ?></span>
        <span class="badge lot-vendu"><?= t('li_inchanges', ['n' => $nbI]) ?></span>
        <?php if ($nbO): ?><span class="badge lot-bloque"><?= t('li_absents', ['n' => $nbO]) ?></span><?php endif; ?>
    </p>

    <?php foreach ($alertes as $a): ?>
        <div class="notice"><?= htmlspecialchars($a) ?></div>
    <?php endforeach; ?>

    <?php if ($nbO): ?>
        <div class="notice">
            <?= t('li_orphelins', ['n' => $nbO]) ?>
            <?= htmlspecialchars(implode(', ', array_slice(array_column($apercu['orphelins'], 'numero_lot'), 0, 20))) ?><?= $nbO > 20 ? '…' : '' ?>.
            <?= t('li_orphelins_suite') ?>
        </div>
    <?php endif; ?>

    <?php if ($nbM): ?>
        <h3><?= t('li_h_modifications') ?></h3>
        <table>
            <thead><tr><th><?= t('th_lot') ?></th><th><?= t('li_th_champ') ?></th><th><?= t('li_th_avant') ?></th><th><?= t('li_th_apres') ?></th></tr></thead>
            <tbody>
            <?php foreach (array_slice($apercu['modifications'], 0, 60) as $m): ?>
                <?php foreach ($m['diff'] as $champ => [$avant, $apres]): ?>
                <tr>
                    <td><strong><?= htmlspecialchars($m['numero_lot']) ?></strong></td>
                    <td><?= htmlspecialchars($champ) ?></td>
                    <td><?= htmlspecialchars(is_float($avant) ? number_format($avant, 2, ',', ' ') : (string) $avant) ?></td>
                    <td><strong><?= htmlspecialchars(is_float($apres) ? number_format($apres, 2, ',', ' ') : (string) $apres) ?></strong></td>
                </tr>
                <?php endforeach; ?>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php if ($nbM > 60): ?>
            <p><small><?= t('li_60_premieres') ?></small></p>
        <?php endif; ?>
    <?php endif; ?>

    <?php if ($nbC): ?>
        <h3><?= t('li_h_creations') ?></h3>
        <p><?= htmlspecialchars(implode(', ', array_slice(array_column($apercu['creations'], 'numero_lot'), 0, 40))) ?><?= $nbC > 40 ? '…' : '' ?></p>
    <?php endif; ?>

    <form method="post">
        <input type="hidden" name="action" value="confirmer">
        <input type="hidden" name="projet" value="<?= htmlspecialchars($projet) ?>">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
        <div class="actions-inline">
            <button class="button" type="submit"><?= t('li_confirmer') ?></button>
            <a class="button secondary" href="lots-import.php?projet=<?= urlencode($projet) ?>"><?= t('bt_annuler') ?></a>
        </div>
    </form>
</div>
<?php endif; ?>
<?php admin_footer(); ?>
