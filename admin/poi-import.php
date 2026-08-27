<?php
/**
 * admin/poi-import.php — import des POI et des repères d'un projet.
 *
 * Même déroulé en deux temps que l'import des lots : on téléverse, on regarde
 * ce que le site retiendra, puis seulement on confirme. La raison est ici plus
 * forte encore : localisation.js ignore SANS RIEN DIRE toute ligne dont les
 * coordonnées sont illisibles. Un fichier de 80 POI peut donc en afficher 61
 * sans qu'aucun message n'apparaisse nulle part. L'aperçu existe pour rendre
 * cet écart visible avant l'enregistrement, pas après.
 *
 * L'import REMPLACE le fichier de la langue choisie ; l'ancien part dans
 * data/backups/.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/storage.php';
require_once __DIR__ . '/../api/poi-lib.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

const NJ_POI_TAILLE_MAX = 2 * 1024 * 1024;   // 2 Mo : très large pour du CSV

$projets = nj_projects();
$projet  = (string) ($_GET['projet'] ?? ($_POST['projet'] ?? ''));
if ($projet === '' || !isset($projets[$projet])) {
    $projet = array_key_first($projets) ?? '';
}
$jeu  = (string) ($_GET['jeu'] ?? ($_POST['jeu'] ?? 'quartier'));
if (!isset(NJ_POI_JEUX[$jeu])) $jeu = 'quartier';
$lang = (string) ($_GET['lang'] ?? ($_POST['lang'] ?? 'fr'));
if (!in_array($lang, NJ_POI_LANGUES, true)) $lang = 'fr';

$erreurs = [];
$alertes = [];
$apercu  = null;
$lignes  = [];

/* Jeton anti-CSRF : l'import écrase un fichier du site, une page tierce ne
   doit pas pouvoir le déclencher pendant qu'un admin est connecté. */
if (empty($_SESSION['nj_csrf'])) {
    $_SESSION['nj_csrf'] = bin2hex(random_bytes(16));
}
$csrf = (string) $_SESSION['nj_csrf'];

/** Fichier temporaire conservé entre l'aperçu et la confirmation. */
function nj_poi_tmp(): string
{
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'narjiss-poi-' . session_id() . '.csv';
}

$cible    = nj_poi_chemin($projet, $projets[$projet] ?? [], $jeu, $lang);
$cibleRel = nj_poi_chemin_relatif($projet, $projets[$projet] ?? [], $jeu, $lang);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
        $erreurs[] = t_brut('li_err_session');
    } elseif (($_POST['action'] ?? '') === 'analyser') {
        $f = $_FILES['fichier'] ?? null;
        if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $erreurs[] = t_brut('li_err_fichier');
        } elseif ((int) $f['size'] > NJ_POI_TAILLE_MAX) {
            $erreurs[] = t_brut('poi_err_taille');
        } elseif (!in_array(strtolower((string) pathinfo((string) $f['name'], PATHINFO_EXTENSION)), ['csv', 'txt'], true)) {
            $erreurs[] = t_brut('poi_err_format');
        } elseif (!move_uploaded_file((string) $f['tmp_name'], nj_poi_tmp())) {
            $erreurs[] = t_brut('li_err_conserver');
        } else {
            $_SESSION['nj_poi_nom'] = (string) $f['name'];
            $lu      = nj_poi_lire_csv(nj_poi_tmp());
            $erreurs = array_merge($erreurs, $lu['erreurs']);
            $alertes = $lu['alertes'];
            $lignes  = $lu['lignes'];
            if ($lignes && !$erreurs) {
                $apercu = nj_poi_apercu($lignes, $cible);
                $_SESSION['nj_poi_pret'] = $jeu . '|' . $lang . '|' . $projet;
            }
        }
    } elseif (($_POST['action'] ?? '') === 'confirmer') {
        // Le jeton porte le triplet analysé : changer de langue ou de projet
        // entre l'aperçu et la confirmation écrirait le bon fichier au mauvais
        // endroit, sans que rien ne le signale.
        $attendu = $jeu . '|' . $lang . '|' . $projet;
        if (($_SESSION['nj_poi_pret'] ?? '') !== $attendu) {
            $erreurs[] = t_brut('poi_err_selection');
        } elseif (!is_file(nj_poi_tmp())) {
            $erreurs[] = t_brut('li_err_perdu');
        } else {
            $lu = nj_poi_lire_csv(nj_poi_tmp());
            if (!$lu['lignes']) {
                $erreurs[] = t_brut('poi_err_vide');
            } else {
                try {
                    nj_poi_ecrire($lu['lignes'], $cible, NARJISS_BACKUP_DIR);
                    $msg = t_brut('poi_enregistres', ['n' => count($lu['lignes']), 'f' => $cibleRel]);

                    /* Le compteur de la vignette d'accueil vient de projects.json
                       et non du CSV : sans cette mise à jour, la carte annoncerait
                       encore l'ancien nombre. On ne le touche que pour le jeu de
                       référence — le quartier en français — et on retire la ligne
                       « home », qui est le projet lui-même et non un POI. */
                    if ($jeu === 'quartier' && $lang === 'fr') {
                        $compte = count(array_filter($lu['lignes'], static fn($l) => $l['cat'] !== 'home'));
                        $tous = read_projects();
                        foreach ($tous as &$p) {
                            if (($p['id'] ?? '') === $projet && (int) ($p['poi_count'] ?? 0) !== $compte) {
                                $p['poi_count'] = $compte;
                                write_projects($tous);
                                $msg .= ' ' . t_brut('poi_compteur', ['n' => $compte]);
                                break;
                            }
                        }
                        unset($p);
                    }

                    set_flash($msg);
                    unset($_SESSION['nj_poi_pret'], $_SESSION['nj_poi_nom']);
                    @unlink(nj_poi_tmp());
                    header('Location: poi-import.php?projet=' . urlencode($projet) . '&jeu=' . urlencode($jeu) . '&lang=' . urlencode($lang));
                    exit;
                } catch (Throwable $e) {
                    $erreurs[] = t_brut('poi_err_ecriture', ['d' => $e->getMessage()]);
                }
            }
        }
    }
}

/** État des huit fichiers d'un projet : deux jeux × quatre langues. */
function nj_poi_etat(string $id, array $projet): array
{
    $etat = [];
    foreach (NJ_POI_JEUX as $j => $libelle) {
        foreach (NJ_POI_LANGUES as $l) {
            $chemin = nj_poi_chemin($id, $projet, $j, $l);
            $etat[$j][$l] = is_file($chemin)
                ? ['present' => true, 'total' => count(nj_poi_lire_csv($chemin)['lignes'])]
                : ['present' => false, 'total' => 0];
        }
    }
    return $etat;
}

$etat = nj_poi_etat($projet, $projets[$projet] ?? []);

admin_header(t_brut('poi_titre_court'));
?>
<div class="actions">
    <div>
        <h1><?= t('poi_titre') ?></h1>
        <p><?= t('th_projet') ?> : <strong><?= htmlspecialchars($projets[$projet]['name'][admin_lang()] ?? $projets[$projet]['name']['fr'] ?? $projet) ?></strong></p>
    </div>
    <a class="button secondary" target="_blank"
       href="../localisation.html?projet=<?= urlencode($projet) ?>"><?= t('poi_voir_carte') ?></a>
</div>

<?php if ($m = flash_message()): ?>
    <div class="notice"><?= htmlspecialchars($m) ?></div>
<?php endif; ?>

<?php foreach ($erreurs as $e): ?>
    <div class="error"><?= htmlspecialchars($e) ?></div>
<?php endforeach; ?>

<div class="panel">
    <h2><?= t('poi_fichiers') ?></h2>
    <table>
        <thead>
            <tr><th><?= t('poi_jeu') ?></th><?php foreach (NJ_POI_LANGUES as $l): ?><th><?= strtoupper($l) ?></th><?php endforeach; ?></tr>
        </thead>
        <tbody>
        <?php foreach (array_keys(NJ_POI_JEUX) as $j): ?>
            <tr>
                <td><strong><?= t('poi_jeu_' . $j) ?></strong></td>
                <?php foreach (NJ_POI_LANGUES as $l): ?>
                    <td>
                        <?php if ($etat[$j][$l]['present']): ?>
                            <?= t('poi_points', ['n' => (int) $etat[$j][$l]['total']]) ?>
                        <?php else: ?>
                            <span class="badge lot-bloque"><?= t('poi_absent') ?></span>
                        <?php endif; ?>
                    </td>
                <?php endforeach; ?>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <p><small><?= t('poi_fichiers_aide') ?></small></p>
</div>

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
        <label><?= t('poi_jeu_points') ?>
            <select name="jeu">
                <?php foreach (array_keys(NJ_POI_JEUX) as $j): ?>
                    <option value="<?= htmlspecialchars($j) ?>" <?= $j === $jeu ? 'selected' : '' ?>>
                        <?= t('poi_jeu_' . $j) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label><?= t('poi_langue') ?>
            <select name="lang">
                <?php foreach (NJ_POI_LANGUES as $l): ?>
                    <option value="<?= $l ?>" <?= $l === $lang ? 'selected' : '' ?>><?= strtoupper($l) ?></option>
                <?php endforeach; ?>
            </select>
        </label>
        <label class="full"><?= t('li_fichier_csv') ?>
            <input type="file" name="fichier" required accept=".csv,text/csv">
            <small class="file-hint">
                <?= t_brut('poi_csv_aide') ?>
                <code><?= htmlspecialchars(implode(';', NJ_POI_ENTETE)) ?></code>.
                <?= t_brut('poi_csv_aide2') ?>
            </small>
        </label>
    </div>
    <p><small>
        <?= t('poi_destination') ?> : <code><?= htmlspecialchars($cibleRel) ?></code> —
        <?= t_brut('poi_destination_aide') ?>
    </small></p>
    <div class="actions-inline">
        <button class="button" type="submit"><?= t('li_analyser') ?></button>
    </div>
</form>

<?php if ($apercu !== null): ?>
<div class="panel">
    <h2><?= t('poi_ce_que') ?></h2>
    <p>
        <span class="badge lot-disponible"><?= t('poi_retenus', ['n' => $apercu['apres']['total']]) ?></span>
        <?php if ($apercu['avant'] !== null):
            $delta = $apercu['apres']['total'] - $apercu['avant']['total']; ?>
            <span class="badge lot-vendu"><?= t('poi_remplace', ['n' => $apercu['avant']['total']]) ?></span>
            <?php if ($delta !== 0): ?>
                <span class="badge <?= $delta > 0 ? 'lot-optionne' : 'lot-bloque' ?>">
                    <?= $delta > 0 ? '+' : '' ?><?= $delta ?>
                </span>
            <?php endif; ?>
        <?php else: ?>
            <span class="badge lot-optionne"><?= t('poi_nouveau_fichier') ?></span>
        <?php endif; ?>
    </p>

    <?php foreach ($alertes as $a): ?>
        <div class="notice"><?= htmlspecialchars($a) ?></div>
    <?php endforeach; ?>

    <h3><?= t('poi_repartition') ?></h3>
    <table>
        <thead><tr><th><?= t('poi_categorie') ?></th><?php if ($apercu['avant'] !== null): ?><th><?= t('li_th_avant') ?></th><?php endif; ?><th><?= t('li_th_apres') ?></th></tr></thead>
        <tbody>
        <?php
        $toutes = array_keys($apercu['apres']['categories'] + ($apercu['avant']['categories'] ?? []));
        foreach ($toutes as $cat): ?>
            <tr>
                <td><?= htmlspecialchars($cat) ?><?= in_array($cat, NJ_POI_CATEGORIES, true) ? '' : ' <span class="badge lot-bloque">' . t('poi_inconnue') . '</span>' ?></td>
                <?php if ($apercu['avant'] !== null): ?>
                    <td><?= (int) ($apercu['avant']['categories'][$cat] ?? 0) ?></td>
                <?php endif; ?>
                <td><strong><?= (int) ($apercu['apres']['categories'][$cat] ?? 0) ?></strong></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>

    <h3><?= t('poi_vingt') ?></h3>
    <table>
        <thead><tr><th><?= t('poi_categorie') ?></th><th><?= t('ag_nom') ?></th><th><?= t('fi_adresse') ?></th><th><?= t('pe_latitude') ?></th><th><?= t('pe_longitude') ?></th></tr></thead>
        <tbody>
        <?php foreach (array_slice($lignes, 0, 20) as $l): ?>
            <tr>
                <td><?= htmlspecialchars($l['emoji'] . ' ' . $l['cat']) ?></td>
                <td><strong><?= htmlspecialchars($l['nom']) ?></strong></td>
                <td><?= htmlspecialchars($l['adresse']) ?></td>
                <td><?= htmlspecialchars((string) $l['lat']) ?></td>
                <td><?= htmlspecialchars((string) $l['lng']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>

    <form method="post">
        <input type="hidden" name="action" value="confirmer">
        <input type="hidden" name="projet" value="<?= htmlspecialchars($projet) ?>">
        <input type="hidden" name="jeu" value="<?= htmlspecialchars($jeu) ?>">
        <input type="hidden" name="lang" value="<?= htmlspecialchars($lang) ?>">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf) ?>">
        <div class="actions-inline">
            <button class="button" type="submit"><?= t('poi_confirmer', ['f' => $cibleRel]) ?></button>
            <a class="button secondary" href="poi-import.php?projet=<?= urlencode($projet) ?>&jeu=<?= urlencode($jeu) ?>&lang=<?= urlencode($lang) ?>"><?= t('bt_annuler') ?></a>
        </div>
    </form>
</div>
<?php endif; ?>
<?php admin_footer(); ?>
