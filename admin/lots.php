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
        set_flash('Lot mis à jour : ' . nj_lot_statut_libelle($statut) . '.');
    } else {
        set_flash('Changement de statut refusé (lot ou statut inconnu).');
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

admin_header('Lots');
?>
<div class="actions">
    <div>
        <h1>Grille de commercialisation</h1>
        <p><?= $total ?> lots enregistrés pour ce projet.</p>
    </div>
    <a class="button" href="lots-import.php?projet=<?= urlencode($projet) ?>">Importer un CSV</a>
</div>

<?php if ($flash): ?>
    <div class="notice"><?= htmlspecialchars($flash) ?></div>
<?php endif; ?>

<form method="get" class="panel">
    <div class="grid">
        <label>Projet
            <select name="projet" onchange="this.form.submit()">
                <?php foreach ($projets as $id => $p): ?>
                    <option value="<?= htmlspecialchars($id) ?>" <?= $id === $projet ? 'selected' : '' ?>>
                        <?= htmlspecialchars($p['name']['fr'] ?? $id) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>Immeuble
            <select name="immeuble">
                <option value="">Tous</option>
                <?php foreach ($immeubles as $im): ?>
                    <option value="<?= htmlspecialchars($im) ?>" <?= $im === $filtres['immeuble'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($im) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>Typologie
            <select name="typologie">
                <option value="">Toutes</option>
                <?php foreach (nj_lot_enums()['typologie'] as $t): ?>
                    <option value="<?= $t ?>" <?= $t === $filtres['typologie'] ? 'selected' : '' ?>>
                        <?= strtoupper($t) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label>Statut
            <select name="statut_f">
                <option value="">Tous</option>
                <?php foreach (nj_lot_enums()['statut'] as $s): ?>
                    <option value="<?= $s ?>" <?= $s === $filtres['statut'] ? 'selected' : '' ?>>
                        <?= nj_lot_statut_libelle($s) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
    </div>
    <div class="actions-inline">
        <button class="button" type="submit">Filtrer</button>
        <a class="button secondary" href="lots.php?projet=<?= urlencode($projet) ?>">Réinitialiser</a>
    </div>
</form>

<div class="panel">
    <?php foreach (nj_lot_enums()['statut'] as $s):
        $n  = $synthese[$s]['n'] ?? 0;
        $ca = $synthese[$s]['ca'] ?? 0.0; ?>
        <span class="badge lot-<?= $s ?>">
            <?= nj_lot_statut_libelle($s) ?> : <strong><?= $n ?></strong>
            <?php if ($n > 0): ?><small>(<?= number_format($ca, 0, ',', ' ') ?> DH)</small><?php endif; ?>
        </span>
    <?php endforeach; ?>
</div>

<?php if (!$lots): ?>
    <div class="notice">Aucun lot ne correspond. Importez la grille du projet pour commencer.</div>
<?php else: ?>
<table>
    <thead>
        <tr>
            <th>Lot</th><th>Typologie</th><th>Surface</th><th>Orientation</th>
            <th>Prix</th><th>DH/m²</th><th>Statut</th><th>Changer</th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($lots as $lot): ?>
        <tr>
            <td>
                <strong><?= htmlspecialchars($lot['numero_lot']) ?></strong><br>
                <small>Imm. <?= htmlspecialchars($lot['immeuble']) ?> — niveau <?= htmlspecialchars($lot['niveau']) ?></small>
            </td>
            <td><?= strtoupper(htmlspecialchars($lot['typologie'])) ?></td>
            <td>
                <?= number_format((float) $lot['surface_habitable'], 1, ',', ' ') ?> m²
                <?php if ((float) $lot['surface_balcon'] > 0): ?>
                    <br><small>+ <?= number_format((float) $lot['surface_balcon'], 1, ',', ' ') ?> m² balcon</small>
                <?php endif; ?>
            </td>
            <td><?= htmlspecialchars($lot['orientation']) ?></td>
            <td><?= number_format((float) $lot['prix_dh'], 0, ',', ' ') ?> DH</td>
            <td><?= number_format((float) $lot['prix_m2'], 0, ',', ' ') ?></td>
            <td><span class="badge lot-<?= htmlspecialchars($lot['statut']) ?>">
                <?= nj_lot_statut_libelle($lot['statut']) ?></span>
                <?php if ($lot['date_fin_option']): ?>
                    <br><small>jusqu'au <?= htmlspecialchars($lot['date_fin_option']) ?></small>
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
                                <?= nj_lot_statut_libelle($s) ?>
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
