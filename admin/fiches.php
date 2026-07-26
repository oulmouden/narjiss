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
            set_flash("Fiche $ref : statut « $new ».");
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
            set_flash("Fiche $ref supprimée, pièces comprises.");
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
    fputcsv($out, ['Référence', 'Date', 'Statut', 'Projet', 'Nom', 'Prénom',
                   'Téléphone', 'E-mail', 'Ville', 'Budget', 'Conseiller', 'Expiration'], ';');
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

admin_header($detail ? 'Fiche ' . $detail['reference'] : 'Fiches clients');

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

  <p class="no-print"><a href="fiches.php">← Toutes les fiches</a></p>
  <h1>Fiche <?= h($detail['reference']) ?></h1>
  <p>
    <span class="tag <?= h($detail['statut'] ?? 'prospect') ?>"><?= h($detail['statut'] ?? 'prospect') ?></span>
    &nbsp;<?= h(fr_date($detail['date'] ?? null)) ?>
    &nbsp;·&nbsp; <?= h($detail['projet_nom'] ?? $detail['projet'] ?? '') ?>
    <?php if ($detail['conseiller'] ?? '') : ?>&nbsp;·&nbsp; conseiller : <?= h($detail['conseiller']) ?><?php endif; ?>
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
      <h3>Identité</h3>
      <dl>
        <dt>Nom</dt><dd><?= h(($id['prenom'] ?? '') . ' ' . ($id['nom'] ?? '')) ?></dd>
        <dt>Naissance</dt><dd><?= h($id['date_naissance'] ?? '—') ?></dd>
        <dt>Nationalité</dt><dd><?= h($id['nationalite'] ?? '—') ?></dd>
        <dt>Situation</dt><dd><?= h($id['situation'] ?? '—') ?></dd>
        <dt>CNIE</dt><dd><?= h($id['cnie'] ?? '—') ?></dd>
        <dt>Validité CNIE</dt><dd><?= h($id['cnie_validite'] ?? '—') ?></dd>
        <dt>Passeport</dt><dd><?= h($id['passeport'] ?: '—') ?></dd>
      </dl>
    </div>

    <div class="card">
      <h3>Coordonnées</h3>
      <dl>
        <dt>Téléphone</dt><dd><?= h($co['telephone'] ?? '—') ?></dd>
        <dt>E-mail</dt><dd><?= h($co['email'] ?: '—') ?></dd>
        <dt>Adresse</dt><dd><?= h($co['adresse'] ?: '—') ?></dd>
        <dt>Ville</dt><dd><?= h($co['ville'] ?: '—') ?></dd>
        <dt>Pays</dt><dd><?= h($co['pays'] ?: '—') ?></dd>
        <dt>MRE</dt><dd><?= !empty($co['mre']) ? 'Oui' : 'Non' ?></dd>
      </dl>
    </div>

    <div class="card">
      <h3>Situation professionnelle</h3>
      <dl>
        <dt>Profession</dt><dd><?= h($pr['profession'] ?: '—') ?></dd>
        <dt>Employeur</dt><dd><?= h($pr['employeur'] ?: '—') ?></dd>
        <dt>Revenu</dt><dd><?= h($pr['revenu'] ?: '—') ?></dd>
        <dt>Origine des fonds</dt><dd><?= h(implode(', ', $pr['origine_fonds'] ?? []) ?: '—') ?></dd>
      </dl>
    </div>

    <div class="card">
      <h3>Projet d'acquisition</h3>
      <dl>
        <dt>Type de bien</dt><dd><?= h(implode(', ', $pa['type'] ?? []) ?: '—') ?></dd>
        <dt>Usage</dt><dd><?= h($pa['usage'] ?: '—') ?></dd>
        <dt>Financement</dt><dd><?= h($pa['financement'] ?: '—') ?></dd>
        <dt>Échéance</dt><dd><?= h($pa['echeance'] ?: '—') ?></dd>
        <dt>Budget</dt><dd><?= h($pa['budget'] ?: '—') ?></dd>
        <dt>Superficie</dt><dd><?= h($pa['superficie'] ?: '—') ?></dd>
      </dl>
      <?php if ($pa['observations'] ?? '') : ?>
        <p style="margin:.6rem 0 0;font-size:.9rem"><?= nl2br(h($pa['observations'])) ?></p>
      <?php endif; ?>
    </div>

    <div class="card">
      <h3>Origine du contact</h3>
      <p style="margin:0;font-weight:600"><?= h(implode(', ', $detail['origine_contact'] ?? []) ?: '—') ?></p>
    </div>

    <div class="card">
      <h3>Consentement et conservation</h3>
      <dl>
        <dt>Traitement</dt><dd><?= !empty($cs['traitement']) ? 'Accordé' : 'Non' ?></dd>
        <dt>Prospection</dt><dd><?= !empty($cs['marketing']) ? 'Accordée' : 'Refusée' ?></dd>
        <dt>Horodatage</dt><dd><?= h(fr_date($cs['horodatage'] ?? null)) ?></dd>
        <dt>Expiration</dt>
        <dd>
          <?= h(fr_date($detail['expiration'] ?? null)) ?>
          <?php if ($left !== null): ?>
            <span class="tag <?= $left < 0 ? 'expire' : 'prospect' ?>">
              <?= $left < 0 ? 'à purger' : $left . ' j' ?>
            </span>
          <?php endif; ?>
        </dd>
      </dl>
    </div>
  </div>

  <h3 style="margin-top:1.4rem">Pièces</h3>
  <?php $pieces = $detail['pieces'] ?? []; ?>
  <?php if (!$pieces): ?>
    <p>Aucune pièce jointe.</p>
  <?php else: ?>
    <div class="pieces">
      <?php foreach (nj_piece_types() as $key => $libelle): ?>
        <?php if (empty($pieces[$key])) continue; ?>
        <figure>
          <img src="fiche-piece.php?ref=<?= urlencode($detail['reference']) ?>&piece=<?= urlencode($key) ?>" alt="">
          <figcaption><?= h($libelle) ?></figcaption>
        </figure>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <div class="no-print" style="margin-top:1.5rem;display:flex;gap:.6rem;flex-wrap:wrap">
    <button onclick="window.print()">Imprimer / PDF</button>
    <form method="post" style="display:inline">
      <input type="hidden" name="ref" value="<?= h($detail['reference']) ?>">
      <input type="hidden" name="action" value="statut">
      <button type="submit">Basculer en <?= ($detail['statut'] ?? 'prospect') === 'client' ? 'prospect' : 'client' ?></button>
    </form>
    <form method="post" style="display:inline"
          onsubmit="return confirm('Supprimer définitivement cette fiche et ses pièces d\'identité ?')">
      <input type="hidden" name="ref" value="<?= h($detail['reference']) ?>">
      <input type="hidden" name="action" value="supprimer">
      <button type="submit" class="danger">Supprimer</button>
    </form>
  </div>

<?php else: ?>

  <h1>Fiches clients</h1>

  <form method="get" class="fiche-filters no-print">
    <input type="search" name="q" value="<?= h($filtres['q']) ?>" placeholder="Nom, téléphone, e-mail, référence…">
    <select name="statut">
      <option value="">Tous statuts</option>
      <option value="prospect" <?= $filtres['statut'] === 'prospect' ? 'selected' : '' ?>>Prospects</option>
      <option value="client" <?= $filtres['statut'] === 'client' ? 'selected' : '' ?>>Clients</option>
    </select>
    <select name="projet">
      <option value="">Tous projets</option>
      <?php foreach ($projets as $pid => $p): ?>
        <option value="<?= h((string)$pid) ?>" <?= $filtres['projet'] === (string)$pid ? 'selected' : '' ?>><?= h(nj_project_name((string)$pid)) ?></option>
      <?php endforeach; ?>
    </select>
    <label><input type="checkbox" name="expire" value="1" <?= $filtres['expire'] ? 'checked' : '' ?>> À purger</label>
    <button type="submit">Filtrer</button>
    <a href="fiches.php">Réinitialiser</a>
  </form>

  <p class="no-print" style="margin:.2rem 0 .6rem">
    <a href="fiche-qr.php">🔳 Affichettes QR</a>
    &nbsp;·&nbsp; <a href="<?= h(fiches_url($filtres, ['export' => 'csv'])) ?>">⬇️ Export CSV</a>
  </p>

  <p><?= (int)$res['total'] ?> fiche(s). Enregistrements en base MySQL ; pièces d'identité dans le coffre privé <code><?= h(NJ_PIECES_DIR) ?></code>.</p>

  <?php if (!$res['rows']): ?>
    <p>Aucune fiche ne correspond.</p>
  <?php else: ?>
    <table class="fiche-table">
      <tr>
        <th>Référence</th><th>Date</th><th>Client</th><th>Projet</th>
        <th>Téléphone</th><th>Statut</th><th>Conservation</th>
      </tr>
      <?php foreach ($res['rows'] as $f): $l = days_left($f['expiration'] ?? null); ?>
        <tr>
          <td><a href="fiches.php?ref=<?= urlencode($f['reference']) ?>"><?= h($f['reference']) ?></a></td>
          <td><?= h(fr_date($f['date'] ?? null)) ?></td>
          <td><?= h(trim(($f['identite']['prenom'] ?? '') . ' ' . ($f['identite']['nom'] ?? ''))) ?></td>
          <td><?= h($f['projet_nom'] ?? $f['projet'] ?? '') ?></td>
          <td><?= h($f['coordonnees']['telephone'] ?? '') ?></td>
          <td><span class="tag <?= h($f['statut'] ?? 'prospect') ?>"><?= h($f['statut'] ?? 'prospect') ?></span></td>
          <td>
            <?php if ($l === null): ?>—
            <?php elseif ($l < 0): ?><span class="tag expire">à purger</span>
            <?php else: ?><?= $l ?> j<?php endif; ?>
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
