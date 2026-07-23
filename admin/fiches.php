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

$fiches = nj_fiches_read();

/* ── Actions ──────────────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ref    = (string)($_POST['ref'] ?? '');
    $action = (string)($_POST['action'] ?? '');

    if (preg_match('/^NJ-\d{8}-[0-9A-F]{4}$/', $ref)) {
        foreach ($fiches as $i => $f) {
            if (($f['reference'] ?? '') !== $ref) continue;

            if ($action === 'statut') {
                $new = ($f['statut'] ?? 'prospect') === 'client' ? 'prospect' : 'client';
                $fiches[$i]['statut']     = $new;
                // La durée de conservation dépend du statut : on la recalcule.
                $fiches[$i]['expiration'] = nj_expiry_date($f['date'], $new);
                nj_fiches_write($fiches);
                nj_log_access('statut', $ref, $new);
                set_flash("Fiche $ref : statut « $new ».");
            } elseif ($action === 'supprimer') {
                $dir = NJ_PIECES_DIR . DIRECTORY_SEPARATOR . $ref;
                if (is_dir($dir)) {
                    foreach ((glob($dir . DIRECTORY_SEPARATOR . '*') ?: []) as $file) @unlink($file);
                    @rmdir($dir);
                }
                unset($fiches[$i]);
                nj_fiches_write($fiches);
                nj_log_access('suppression', $ref, 'manuelle');
                set_flash("Fiche $ref supprimée, pièces comprises.");
            }
            break;
        }
    }
    header('Location: fiches.php');
    exit;
}

$detail = null;
$wanted = (string)($_GET['ref'] ?? '');
if ($wanted !== '') {
    foreach ($fiches as $f) {
        if (($f['reference'] ?? '') === $wanted) { $detail = $f; break; }
    }
}

// Plus récentes d'abord.
usort($fiches, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

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
  <p class="no-print">
    <a href="fiche-qr.php">🔳 Affichettes QR à imprimer</a>
  </p>
  <p><?= count($fiches) ?> fiche(s). Stockage privé : <code><?= h(NJ_FICHES_DIR) ?></code></p>

  <?php if (!$fiches): ?>
    <p>Aucune fiche pour le moment.</p>
  <?php else: ?>
    <table class="fiche-table">
      <tr>
        <th>Référence</th><th>Date</th><th>Client</th><th>Projet</th>
        <th>Téléphone</th><th>Statut</th><th>Conservation</th>
      </tr>
      <?php foreach ($fiches as $f): $l = days_left($f['expiration'] ?? null); ?>
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
  <?php endif; ?>

<?php endif; ?>

<?php admin_footer(); ?>
