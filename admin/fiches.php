<?php
/**
 * admin/fiches.php — consultation des fiches de renseignement client.
 * Liste, détail, changement de statut (prospect → client) et suppression.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/fiche-config.php';

admin_require_login();

$projets = nj_projects();   // id => données de projet, pour le filtre

/* ── Actions (POST) ───────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ref    = (string)($_POST['ref'] ?? '');
    $action = (string)($_POST['action'] ?? '');

    if (preg_match('/^NJ-\d{8}-[0-9A-F]{4}$/', $ref) && ($cur = nj_fiche_get($ref)) !== null) {
        if ($action === 'statut') {
            $new = ($cur['statut'] ?? 'prospect') === 'client' ? 'prospect' : 'client';
            // set_statut recalcule aussi l'expiration (conservation liée au statut).
            nj_fiche_set_statut($ref, $new);
            nj_log_access('statut', $ref, $new);
            set_flash(t_brut('fi_flash_statut', ['ref' => $ref, 's' => t_brut('fi_statut_' . $new)]));
        } elseif ($action === 'supprimer') {
            // Les octets des pièces vivent sur disque : on efface le dossier privé…
            $dir = NJ_PIECES_DIR . DIRECTORY_SEPARATOR . $ref;
            if (is_dir($dir)) {
                foreach ((glob($dir . DIRECTORY_SEPARATOR . '*') ?: []) as $file) @unlink($file);
                @rmdir($dir);
            }
            // …puis la ligne en base.
            nj_fiche_delete($ref);
            nj_log_access('suppression', $ref, 'manuelle');
            set_flash(t_brut('fi_flash_suppr', ['ref' => $ref]));
        }
    }
    header('Location: fiches.php');
    exit;
}

/* ── Détail d'une fiche ───────────────────────────────────────────────── */
$detail = null;
$wanted = (string)($_GET['ref'] ?? '');
if ($wanted !== '') {
    $detail = nj_fiche_get($wanted);
}

/* ── Filtres partagés par la liste et l'export CSV ────────────────────── */
$filtres = [
    'q'        => trim((string)($_GET['q'] ?? '')),
    'statut'   => (string)($_GET['statut'] ?? ''),
    'projet'   => (string)($_GET['projet'] ?? ''),
    'expire'   => !empty($_GET['expire']),
    'page'     => max(1, (int)($_GET['page'] ?? 1)),
    'per_page' => 25,
];

/* ── Export CSV (avant toute sortie HTML) ─────────────────────────────── */
if (($_GET['export'] ?? '') === 'csv') {
    $all = $filtres;
    $all['per_page'] = 100000;
    $all['page']     = 1;
    $res = nj_fiches_query($all);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="fiches-narjiss.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");   // BOM UTF-8 : Excel ouvre les accents correctement
    fputcsv($out, array_map('t_brut', [
        'fi_th_reference', 'fi_th_date', 'th_statut', 'th_projet', 'fi_nom', 'fi_prenom',
        'fi_telephone', 'ag_email', 'fi_ville', 'fi_budget', 'fi_conseiller', 'fi_expiration',
    ]), ';');
    foreach ($res['rows'] as $f) {
        $id = $f['identite'] ?? []; $co = $f['coordonnees'] ?? []; $pa = $f['projet_acquisition'] ?? [];
        fputcsv($out, [
            $f['reference'] ?? '',
            substr((string)($f['date'] ?? ''), 0, 19),
            $f['statut'] ?? '',
            $f['projet_nom'] ?? ($f['projet'] ?? ''),
            $id['nom'] ?? '', $id['prenom'] ?? '',
            $co['telephone'] ?? '', $co['email'] ?? '', $co['ville'] ?? '',
            $pa['budget'] ?? '', $f['conseiller'] ?? '',
            substr((string)($f['expiration'] ?? ''), 0, 10),
        ], ';');
    }
    fclose($out);
    exit;
}

/* ── Liste paginée (uniquement hors vue détail) ───────────────────────── */
$res = $detail ? ['rows' => [], 'total' => 0, 'page' => 1, 'per_page' => 25]
               : nj_fiches_query($filtres);

function h(?string $v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

function fr_date(?string $iso): string {
    if (!$iso) return '—';
    // Format numérique : lisible dans les quatre langues, et le même que celui
    // que le conseiller a sous les yeux dans son espace.
    try { return (new DateTimeImmutable($iso))->format('d/m/Y H:i'); }
    catch (Throwable $e) { return '—'; }
}

/** Jours restants avant expiration ; négatif = à purger. */
function days_left(?string $iso): ?int {
    if (!$iso) return null;
    try {
        $diff = (new DateTimeImmutable($iso))->getTimestamp() - time();
        return (int)floor($diff / 86400);
    } catch (Throwable $e) { return null; }
}

/** URL de la liste conservant les filtres actifs, avec surcharge éventuelle. */
function fiches_url(array $filtres, array $override = []): string {
    $params = array_filter([
        'q'      => $filtres['q'],
        'statut' => $filtres['statut'],
        'projet' => $filtres['projet'],
        'expire' => $filtres['expire'] ? '1' : '',
    ], fn($v) => $v !== '' && $v !== null);
    $params = array_merge($params, $override);
    return 'fiches.php' . ($params ? ('?' . http_build_query($params)) : '');
}

admin_header($detail ? t_brut('fi_fiche') . ' ' . $detail['reference'] : t_brut('nav_fiches'));

if ($msg = flash_message()) {
    echo '<p class="flash">' . h($msg) . '</p>';
}
?>

<style>
.fiche-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.fiche-table th, .fiche-table td { padding: .55rem .6rem; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: .92rem; }
.fiche-table th { background: #f1f5f9; font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; }
.tag { display: inline-block; padding: .12rem .55rem; border-radius: 999px; font-size: .74rem; font-weight: 700; }
.tag.prospect { background: #e6eefc; color: #1e40af; }
.tag.client   { background: #e6f6ec; color: #14603a; }
.tag.expire   { background: #fdecec; color: #8d1f1f; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.detail-grid .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: .9rem 1rem; background: #fff; }
.detail-grid .card h3 { margin: 0 0 .6rem; font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
.detail-grid dl { margin: 0; display: grid; grid-template-columns: 40% 60%; gap: .25rem 0; font-size: .9rem; }
.detail-grid dt { color: #64748b; }
.detail-grid dd { margin: 0; font-weight: 600; }
.pieces { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: .6rem; }
.pieces figure { margin: 0; border: 1px solid #e2e8f0; border-radius: 9px; padding: .5rem; background: #fff; }
.pieces img { display: block; max-width: 250px; max-height: 180px; border-radius: 6px; }
.pieces figcaption { font-size: .78rem; color: #64748b; margin-top: .35rem; }
.danger { background: #b91c1c; }
.fiche-filters { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: 1rem 0 .3rem; }
.fiche-filters input[type=search], .fiche-filters select { padding: .4rem .5rem; border: 1px solid #cbd5e1; border-radius: 7px; font-size: .9rem; }
.fiche-filters input[type=search] { min-width: 15rem; }
.fiche-filters label { font-size: .88rem; color: #475569; display: inline-flex; gap: .3rem; align-items: center; }
.pager { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: 1rem; }
.pager a, .pager span { padding: .3rem .6rem; border: 1px solid #e2e8f0; border-radius: 7px; font-size: .85rem; text-decoration: none; }
.pager .current { background: #0c2340; color: #fff; border-color: #0c2340; }
@media (max-width: 800px) { .detail-grid { grid-template-columns: 1fr; } }
@media print { .topbar, .no-print { display: none !important; } }
</style>

<?php if ($detail): ?>

  <p class="no-print"><a href="fiches.php"><?= t('fi_toutes') ?></a></p>
  <h1><?= t('fi_fiche') ?> <?= h($detail['reference']) ?></h1>
  <p>
    <span class="tag <?= h($detail['statut'] ?? 'prospect') ?>"><?= t('fi_statut_' . ($detail['statut'] ?? 'prospect')) ?></span>
    &nbsp;<?= h(fr_date($detail['date'] ?? null)) ?>
    &nbsp;·&nbsp; <?= h($detail['projet_nom'] ?? $detail['projet'] ?? '') ?>
    <?php if ($detail['conseiller'] ?? '') : ?>&nbsp;·&nbsp; <?= t('fi_conseiller') ?> : <?= h($detail['conseiller']) ?><?php endif; ?>
  </p>

  <?php
  $id = $detail['identite'] ?? [];
  $co = $detail['coordonnees'] ?? [];
  $pr = $detail['situation_pro'] ?? [];
  $pa = $detail['projet_acquisition'] ?? [];
  $cs = $detail['consentement'] ?? [];
  $left = days_left($detail['expiration'] ?? null);
  ?>

  <div class="detail-grid">
    <div class="card">
      <h3><?= t('fi_identite') ?></h3>
      <dl>
        <dt><?= t('fi_nom') ?></dt><dd><?= h(($id['prenom'] ?? '') . ' ' . ($id['nom'] ?? '')) ?></dd>
        <dt><?= t('fi_naissance') ?></dt><dd><?= h($id['date_naissance'] ?? '—') ?></dd>
        <dt><?= t('fi_nationalite') ?></dt><dd><?= h($id['nationalite'] ?? '—') ?></dd>
        <dt><?= t('fi_situation') ?></dt><dd><?= h($id['situation'] ?? '—') ?></dd>
        <dt><?= t('fi_cnie') ?></dt><dd><?= h($id['cnie'] ?? '—') ?></dd>
        <dt><?= t('fi_cnie_validite') ?></dt><dd><?= h($id['cnie_validite'] ?? '—') ?></dd>
        <dt><?= t('fi_passeport') ?></dt><dd><?= h($id['passeport'] ?: '—') ?></dd>
      </dl>
    </div>

    <div class="card">
      <h3><?= t('fi_coordonnees') ?></h3>
      <dl>
        <dt><?= t('fi_telephone') ?></dt><dd><?= h($co['telephone'] ?? '—') ?></dd>
        <dt><?= t('ag_email') ?></dt><dd><?= h($co['email'] ?: '—') ?></dd>
        <dt><?= t('fi_adresse') ?></dt><dd><?= h($co['adresse'] ?: '—') ?></dd>
        <dt><?= t('fi_ville') ?></dt><dd><?= h($co['ville'] ?: '—') ?></dd>
        <dt><?= t('fi_pays') ?></dt><dd><?= h($co['pays'] ?: '—') ?></dd>
        <dt><?= t('fi_mre') ?></dt><dd><?= !empty($co['mre']) ? t('fi_oui') : t('fi_non') ?></dd>
      </dl>
    </div>

    <div class="card">
      <h3><?= t('fi_situation_pro') ?></h3>
      <dl>
        <dt><?= t('fi_profession') ?></dt><dd><?= h($pr['profession'] ?: '—') ?></dd>
        <dt><?= t('fi_employeur') ?></dt><dd><?= h($pr['employeur'] ?: '—') ?></dd>
        <dt><?= t('fi_revenu') ?></dt><dd><?= h($pr['revenu'] ?: '—') ?></dd>
        <dt><?= t('fi_origine_fonds') ?></dt><dd><?= h(implode(', ', $pr['origine_fonds'] ?? []) ?: '—') ?></dd>
      </dl>
    </div>

    <div class="card">
      <h3><?= t('fi_projet_acq') ?></h3>
      <dl>
        <dt><?= t('fi_type_bien') ?></dt><dd><?= h(implode(', ', $pa['type'] ?? []) ?: '—') ?></dd>
        <dt><?= t('fi_usage') ?></dt><dd><?= h($pa['usage'] ?: '—') ?></dd>
        <dt><?= t('fi_financement') ?></dt><dd><?= h($pa['financement'] ?: '—') ?></dd>
        <dt><?= t('fi_echeance') ?></dt><dd><?= h($pa['echeance'] ?: '—') ?></dd>
        <dt><?= t('fi_budget') ?></dt><dd><?= h($pa['budget'] ?: '—') ?></dd>
        <dt><?= t('fi_superficie') ?></dt><dd><?= h($pa['superficie'] ?: '—') ?></dd>
      </dl>
      <?php if ($pa['observations'] ?? '') : ?>
        <p style="margin:.6rem 0 0;font-size:.9rem"><?= nl2br(h($pa['observations'])) ?></p>
      <?php endif; ?>
    </div>

    <div class="card">
      <h3><?= t('fi_origine_contact') ?></h3>
      <p style="margin:0;font-weight:600"><?= h(implode(', ', $detail['origine_contact'] ?? []) ?: '—') ?></p>
    </div>

    <div class="card">
      <h3><?= t('fi_consentement') ?></h3>
      <dl>
        <dt><?= t('fi_traitement') ?></dt><dd><?= !empty($cs['traitement']) ? t('fi_accorde') : t('fi_non') ?></dd>
        <dt><?= t('fi_prospection') ?></dt><dd><?= !empty($cs['marketing']) ? t('fi_accordee') : t('fi_refusee') ?></dd>
        <dt><?= t('fi_horodatage') ?></dt><dd><?= h(fr_date($cs['horodatage'] ?? null)) ?></dd>
        <dt><?= t('fi_expiration') ?></dt>
        <dd>
          <?= h(fr_date($detail['expiration'] ?? null)) ?>
          <?php if ($left !== null): ?>
            <span class="tag <?= $left < 0 ? 'expire' : 'prospect' ?>">
              <?= $left < 0 ? t('fi_a_purger') : t('fi_jours', ['n' => $left]) ?>
            </span>
          <?php endif; ?>
        </dd>
      </dl>
    </div>
  </div>

  <h3 style="margin-top:1.4rem"><?= t('fi_pieces') ?></h3>
  <?php $pieces = $detail['pieces'] ?? []; ?>
  <?php if (!$pieces): ?>
    <p><?= t('fi_aucune_piece') ?></p>
  <?php else: ?>
    <div class="pieces">
      <?php /* nj_piece_types() (api/fiche-config.php) sert aussi le formulaire
               public : on garde ses clés et on traduit le libellé ici. */ ?>
      <?php foreach (array_keys(nj_piece_types()) as $key): ?>
        <?php if (empty($pieces[$key])) continue; ?>
        <figure>
          <img src="fiche-piece.php?ref=<?= urlencode($detail['reference']) ?>&piece=<?= urlencode($key) ?>" alt="">
          <figcaption><?= t('fi_piece_' . str_replace('-', '_', $key)) ?></figcaption>
        </figure>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <div class="no-print" style="margin-top:1.5rem;display:flex;gap:.6rem;flex-wrap:wrap">
    <button onclick="window.print()"><?= t('fi_imprimer') ?></button>
    <form method="post" style="display:inline">
      <input type="hidden" name="ref" value="<?= h($detail['reference']) ?>">
      <input type="hidden" name="action" value="statut">
      <button type="submit"><?= t('fi_basculer', ['s' => t_brut('fi_statut_' . (($detail['statut'] ?? 'prospect') === 'client' ? 'prospect' : 'client'))]) ?></button>
    </form>
    <form method="post" style="display:inline"
          onsubmit="return confirm('<?= t('fi_confirm_suppr') ?>')">
      <input type="hidden" name="ref" value="<?= h($detail['reference']) ?>">
      <input type="hidden" name="action" value="supprimer">
      <button type="submit" class="danger"><?= t('bt_supprimer') ?></button>
    </form>
  </div>

<?php else: ?>

  <h1><?= t('nav_fiches') ?></h1>

  <form method="get" class="fiche-filters no-print">
    <input type="search" name="q" value="<?= h($filtres['q']) ?>" placeholder="<?= t('fi_recherche') ?>">
    <select name="statut">
      <option value=""><?= t('fi_tous_statuts') ?></option>
      <option value="prospect" <?= $filtres['statut'] === 'prospect' ? 'selected' : '' ?>><?= t('fi_prospects') ?></option>
      <option value="client" <?= $filtres['statut'] === 'client' ? 'selected' : '' ?>><?= t('fi_clients') ?></option>
    </select>
    <select name="projet">
      <option value=""><?= t('fi_tous_projets') ?></option>
      <?php foreach ($projets as $pid => $p): ?>
        <option value="<?= h((string)$pid) ?>" <?= $filtres['projet'] === (string)$pid ? 'selected' : '' ?>><?= h(nj_project_name((string)$pid, admin_lang())) ?></option>
      <?php endforeach; ?>
    </select>
    <label><input type="checkbox" name="expire" value="1" <?= $filtres['expire'] ? 'checked' : '' ?>> <?= t('fi_a_purger') ?></label>
    <button type="submit"><?= t('bt_filtrer') ?></button>
    <a href="fiches.php"><?= t('bt_reinit') ?></a>
  </form>

  <p class="no-print" style="margin:.2rem 0 .6rem">
    <a href="../qr.php"><?= t('fi_affichettes') ?></a>
    &nbsp;·&nbsp; <a href="<?= h(fiches_url($filtres, ['export' => 'csv'])) ?>"><?= t('fi_export_csv') ?></a>
  </p>

  <p><?= t('fi_total', ['n' => (int)$res['total']]) ?> <code><?= h(NJ_PIECES_DIR) ?></code>.</p>

  <?php if (!$res['rows']): ?>
    <p><?= t('fi_aucune') ?></p>
  <?php else: ?>
    <table class="fiche-table">
      <tr>
        <th><?= t('fi_th_reference') ?></th><th><?= t('fi_th_date') ?></th><th><?= t('fi_th_client') ?></th><th><?= t('th_projet') ?></th>
        <th><?= t('fi_telephone') ?></th><th><?= t('th_statut') ?></th><th><?= t('fi_th_conservation') ?></th>
      </tr>
      <?php foreach ($res['rows'] as $f): $l = days_left($f['expiration'] ?? null); ?>
        <tr>
          <td><a href="fiches.php?ref=<?= urlencode($f['reference']) ?>"><?= h($f['reference']) ?></a></td>
          <td><?= h(fr_date($f['date'] ?? null)) ?></td>
          <td><?= h(trim(($f['identite']['prenom'] ?? '') . ' ' . ($f['identite']['nom'] ?? ''))) ?></td>
          <td><?= h($f['projet_nom'] ?? $f['projet'] ?? '') ?></td>
          <td><?= h($f['coordonnees']['telephone'] ?? '') ?></td>
          <td><span class="tag <?= h($f['statut'] ?? 'prospect') ?>"><?= t('fi_statut_' . ($f['statut'] ?? 'prospect')) ?></span></td>
          <td>
            <?php if ($l === null): ?>—
            <?php elseif ($l < 0): ?><span class="tag expire"><?= t('fi_a_purger') ?></span>
            <?php else: ?><?= t('fi_jours', ['n' => $l]) ?><?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>

    <?php $pages = (int)ceil($res['total'] / $res['per_page']); if ($pages > 1): ?>
      <nav class="pager no-print">
        <?php for ($p = 1; $p <= $pages; $p++): ?>
          <?php if ($p === $res['page']): ?>
            <span class="current"><?= $p ?></span>
          <?php else: ?>
            <a href="<?= h(fiches_url($filtres, ['page' => $p])) ?>"><?= $p ?></a>
          <?php endif; ?>
        <?php endfor; ?>
      </nav>
    <?php endif; ?>
  <?php endif; ?>

<?php endif; ?>

<?php admin_footer(); ?>
