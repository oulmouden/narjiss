<?php
/**
 * admin/index.php — tableau de bord.
 *
 * Ce que le bureau de vente regardait chaque matin dans l'ancien outil :
 * le stock par statut, les projets qui vendent, les options qui expirent,
 * ce qui a bougé récemment. Tout vient de la base (lots, historique des
 * statuts, imports, visites) : rien n'est saisi ici, rien n'est à tenir à
 * jour à la main.
 *
 * Les projets marqués demo:true dans data/projects.json (Jawhara-demo) sont
 * exclus des chiffres : leurs lots sont des exemples, pas du stock.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/lots-lib.php';

admin_require_login();

$projects = read_projects();
$lang     = admin_lang();

/* Dossier de présentation à la direction.
 *
 * Son adresse EST sa serrure : le dossier porte un segment secret pour nom, et
 * rien d'autre ne le protège. Le lien ne doit donc apparaître que derrière
 * l'authentification — sur une page publique, ce nom serait lisible dans le
 * HTML par n'importe quel visiteur.
 *
 * On CHERCHE le dossier au lieu de nommer le segment ici. Deux raisons : le
 * jour où il est renouvelé, le bouton suit sans qu'on y pense ; et le fichier
 * presentation/.jeton, qui portait ce nom, n'existe pas sur le serveur — s'y
 * fier n'aurait affiché le bouton qu'en local. Le plus récent l'emporte, pour
 * qu'une ancienne version laissée en place ne reprenne pas la main.
 */
$presentationLien = '';
$candidats = glob(__DIR__ . '/../presentation/*/index.html') ?: [];
$recent = 0;
foreach ($candidats as $chemin) {
    $segment = basename(dirname($chemin));
    // Le nom vient du disque : on refuse tout ce qui n'est pas un segment
    // d'URL simple, plutôt que de le coller tel quel dans un href.
    if (preg_match('/^[A-Za-z0-9_-]+$/', $segment) !== 1) {
        continue;
    }
    $date = (int) @filemtime($chemin);
    if ($date >= $recent) {
        $recent = $date;
        $presentationLien = '../presentation/' . $segment . '/index.html';
    }
}

/* ── Données du tableau de bord ─────────────────────────────────────── */

$noms   = [];   // id → nom dans la langue de l'admin
$demos  = [];   // ids exclus des chiffres
foreach ($projects as $p) {
    $id = (string) ($p['id'] ?? '');
    if ($id === '') continue;
    $noms[$id] = text_value($p, 'name', $lang) ?: $id;
    if (!empty($p['demo'])) $demos[] = $id;
}

$statuts   = nj_lot_enums()['statut'];
$baseOk    = false;
$global    = [];   // statut → ['n' => …, 'ca' => …]
$parProjet = [];   // projet → [statut => n, 'ca_dispo' => …, 'import' => …]
$options   = [];
$activite  = [];
$visites   = [];
$dm        = static fn(string $s): string => date('d/m H:i', strtotime($s));
$nf        = static fn($v): string => number_format((float) $v, 0, ',', ' ');

try {
    if (!nj_lots_schema_present()) throw new RuntimeException('schema');
    $pdo = nj_db();
    $exclus = $demos ? ' AND projet NOT IN (' . implode(',', array_fill(0, count($demos), '?')) . ')' : '';

    $st = $pdo->prepare("SELECT statut, COUNT(*) n, SUM(prix_dh) ca FROM lots WHERE 1=1$exclus GROUP BY statut");
    $st->execute($demos);
    foreach ($st->fetchAll() as $r) $global[$r['statut']] = ['n' => (int) $r['n'], 'ca' => (float) $r['ca']];

    $st = $pdo->prepare(
        "SELECT projet, statut, COUNT(*) n, SUM(CASE WHEN statut = 'disponible' THEN prix_dh ELSE 0 END) ca_dispo
         FROM lots WHERE 1=1$exclus GROUP BY projet, statut"
    );
    $st->execute($demos);
    foreach ($st->fetchAll() as $r) {
        $parProjet[$r['projet']][$r['statut']] = (int) $r['n'];
        $parProjet[$r['projet']]['ca_dispo'] = ($parProjet[$r['projet']]['ca_dispo'] ?? 0) + (float) $r['ca_dispo'];
    }
    foreach ($pdo->query('SELECT projet, MAX(created_at) d FROM lot_imports GROUP BY projet')->fetchAll() as $r) {
        if (isset($parProjet[$r['projet']])) $parProjet[$r['projet']]['import'] = $r['d'];
    }
    // Du plus gros stock disponible au plus petit : c'est là que se joue la vente.
    uasort($parProjet, static fn($a, $b) => ($b['disponible'] ?? 0) <=> ($a['disponible'] ?? 0));

    $st = $pdo->prepare(
        "SELECT id, projet, numero_lot, date_fin_option, DATEDIFF(date_fin_option, CURDATE()) jours
         FROM lots WHERE statut = 'optionne'$exclus
           AND (date_fin_option IS NULL OR date_fin_option <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
         ORDER BY date_fin_option IS NULL, date_fin_option LIMIT 30"
    );
    $st->execute($demos);
    $options = $st->fetchAll();

    $st = $pdo->prepare(
        "SELECT h.created_at, h.ancien_statut, h.nouveau_statut, h.auteur, l.projet, l.numero_lot
         FROM lot_status_history h JOIN lots l ON l.id = h.lot_id
         WHERE h.auteur NOT LIKE 'import%'$exclus
         ORDER BY h.created_at DESC LIMIT 20"
    );
    $st->execute($demos);
    $activite = $st->fetchAll();

    try {
        $st = $pdo->prepare(
            "SELECT date_visite, projet, statut, fiche_reference, duree_min FROM visites
             WHERE statut IN ('demande', 'confirme') AND date_visite >= NOW()
               AND date_visite <= DATE_ADD(NOW(), INTERVAL 7 DAY)$exclus
             ORDER BY date_visite LIMIT 20"
        );
        $st->execute($demos);
        $visites = $st->fetchAll();
    } catch (Throwable $e) {
        $visites = [];   // table absente sur une base ancienne : le bloc se tait
    }
    $baseOk = true;
} catch (Throwable $e) {
    error_log('tableau de bord : ' . $e->getMessage());
}

$totalLots  = array_sum(array_column($global, 'n'));
$vendus     = $global['vendu']['n'] ?? 0;
$tauxGlobal = $totalLots ? (int) round($vendus / $totalLots * 100) : 0;

admin_header(t_brut('accueil_titre'));
?>
<section class="panel">
    <h1><?= t('accueil_titre') ?></h1>
    <p><?= t('accueil_compte', ['n' => count($projects)]) ?> <code>data/projects.json</code>.</p>
    <div class="actions">
        <a class="button" href="projects.php"><?= t('accueil_projets') ?></a>
        <a class="button secondary" href="lots.php"><?= t('nav_lots') ?></a>
        <a class="button secondary" href="audit.php"><?= t('accueil_audit') ?></a>
        <a class="button secondary" href="../carte.html" target="_blank"><?= t('accueil_carte') ?></a>
<?php if ($presentationLien !== ''): ?>
        <a class="button secondary" href="<?= htmlspecialchars($presentationLien, ENT_QUOTES, 'UTF-8') ?>"
           target="_blank" rel="noopener"><?= t('accueil_presentation') ?></a>
<?php endif; ?>
    </div>
</section>

<?php if (!$baseOk): ?>
<section class="panel"><p class="notice"><?= t('tb_sans_base') ?></p></section>
<?php else: ?>

<section class="panel">
    <h2><?= t('tb_stock') ?></h2>
    <p class="file-hint"><?= t('tb_stock_note', ['n' => $nf($totalLots), 'p' => $tauxGlobal]) ?></p>
    <?php foreach ($statuts as $s):
        $n  = $global[$s]['n'] ?? 0;
        $ca = $global[$s]['ca'] ?? 0.0; ?>
        <span class="badge lot-<?= $s ?>">
            <?= t('lot_statut_' . $s) ?> : <strong><?= $n ?></strong>
            <?php if ($n > 0): ?><small>(<?= $nf($ca) ?> DH)</small><?php endif; ?>
        </span>
    <?php endforeach; ?>
</section>

<section class="panel">
    <h2><?= t('tb_projets') ?></h2>
    <?php if (!$parProjet): ?>
        <p class="file-hint"><?= t('tb_projets_vide') ?></p>
    <?php else: ?>
    <table>
        <thead><tr>
            <th><?= t('th_projet') ?></th><th><?= t('th_total') ?></th>
            <?php foreach ($statuts as $s): ?><th><?= t('lot_statut_' . $s) ?></th><?php endforeach; ?>
            <th><?= t('th_taux') ?></th><th><?= t('th_valeur_dispo') ?></th><th><?= t('th_import') ?></th>
        </tr></thead>
        <tbody>
        <?php foreach ($parProjet as $projet => $c):
            $tot  = 0;
            foreach ($statuts as $s) $tot += $c[$s] ?? 0;
            $taux = $tot ? (int) round(($c['vendu'] ?? 0) / $tot * 100) : 0; ?>
            <tr>
                <td><a href="lots.php?projet=<?= urlencode((string) $projet) ?>"><?= htmlspecialchars($noms[$projet] ?? (string) $projet) ?></a></td>
                <td><strong><?= $tot ?></strong></td>
                <?php foreach ($statuts as $s): $n = $c[$s] ?? 0; ?>
                    <td><?= $n ? '<span class="badge lot-' . $s . '">' . $n . '</span>' : '<span class="file-hint">·</span>' ?></td>
                <?php endforeach; ?>
                <td><?= $taux ?> %</td>
                <td><?= $nf($c['ca_dispo'] ?? 0) ?></td>
                <td><?= isset($c['import']) ? $dm($c['import']) : '<span class="file-hint">' . t('tb_jamais') . '</span>' ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</section>

<div class="grid">
<section class="panel">
    <h2><?= t('tb_options') ?></h2>
    <?php if (!$options): ?>
        <p class="file-hint"><?= t('tb_options_vide') ?></p>
    <?php else: ?>
    <table>
        <thead><tr><th><?= t('th_projet') ?></th><th><?= t('th_lot') ?></th><th><?= t('th_echeance') ?></th><th><?= t('th_jours') ?></th></tr></thead>
        <tbody>
        <?php foreach ($options as $o):
            $jours = $o['jours'];
            $classe = ($jours === null) ? 'warn' : ((int) $jours < 0 ? 'error' : ((int) $jours <= 2 ? 'warn' : 'ok')); ?>
            <tr>
                <td><a href="lots.php?projet=<?= urlencode($o['projet']) ?>&amp;statut_f=optionne"><?= htmlspecialchars($noms[$o['projet']] ?? $o['projet']) ?></a></td>
                <td><?= htmlspecialchars($o['numero_lot']) ?></td>
                <td><?= $o['date_fin_option'] ? date('d/m/Y', strtotime($o['date_fin_option'])) : '—' ?></td>
                <td><span class="badge <?= $classe ?>"><?= $jours === null ? t('tb_sans_date') : ((int) $jours < 0 ? t('tb_expiree') : (int) $jours) ?></span></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</section>

<section class="panel">
    <h2><?= t('tb_visites') ?></h2>
    <?php if (!$visites): ?>
        <p class="file-hint"><?= t('tb_visites_vide') ?></p>
    <?php else: ?>
    <table>
        <thead><tr><th><?= t('th_date') ?></th><th><?= t('th_projet') ?></th><th><?= t('th_fiche') ?></th><th><?= t('th_statut') ?></th></tr></thead>
        <tbody>
        <?php foreach ($visites as $v): ?>
            <tr>
                <td><?= $dm($v['date_visite']) ?></td>
                <td><?= htmlspecialchars($noms[$v['projet']] ?? $v['projet']) ?></td>
                <td><?= htmlspecialchars((string) ($v['fiche_reference'] ?? '—')) ?></td>
                <td><span class="badge <?= $v['statut'] === 'confirme' ? 'ok' : 'warn' ?>"><?= t('tb_visite_' . $v['statut']) ?></span></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</section>
</div>

<section class="panel">
    <h2><?= t('tb_activite') ?></h2>
    <?php if (!$activite): ?>
        <p class="file-hint"><?= t('tb_activite_vide') ?></p>
    <?php else: ?>
    <table>
        <thead><tr><th><?= t('th_date') ?></th><th><?= t('th_projet') ?></th><th><?= t('th_lot') ?></th><th><?= t('th_changement') ?></th><th><?= t('th_auteur') ?></th></tr></thead>
        <tbody>
        <?php foreach ($activite as $h): ?>
            <tr>
                <td><?= $dm($h['created_at']) ?></td>
                <td><?= htmlspecialchars($noms[$h['projet']] ?? $h['projet']) ?></td>
                <td><?= htmlspecialchars($h['numero_lot']) ?></td>
                <td>
                    <?php if ($h['ancien_statut'] !== ''): ?><span class="badge lot-<?= htmlspecialchars($h['ancien_statut']) ?>"><?= t_brut('lot_statut_' . $h['ancien_statut']) ?></span> → <?php endif; ?>
                    <span class="badge lot-<?= htmlspecialchars($h['nouveau_statut']) ?>"><?= t_brut('lot_statut_' . $h['nouveau_statut']) ?></span>
                </td>
                <td><?= htmlspecialchars($h['auteur']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</section>

<?php endif; ?>
<?php admin_footer(); ?>
