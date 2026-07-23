<?php
/**
 * admin/fiche-qr.php — affichettes QR à poser au bureau de vente.
 *
 * Chaque QR pointe vers fiche.html?projet=<id> : le client scanne avec son
 * téléphone et remplit la fiche lui-même. Génération du QR côté navigateur
 * (bibliothèque vendorisée, aucune donnée n'est envoyée à un service tiers).
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

$projects = nj_projects();
$base = nj_base_url();

function h(?string $v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

admin_header('Affichettes QR — fiche client');
?>

<style>
.qr-intro { max-width: 640px; color: #475569; }
.qr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1rem; margin-top: 1.2rem; }
.qr-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
  text-align: center;
  break-inside: avoid;
}
.qr-card h3 { margin: 0 0 .2rem; font-size: 1.05rem; color: #0c2340; }
.qr-card .loc { font-size: .82rem; color: #64748b; margin-bottom: .7rem; }
.qr-card .qr { display: flex; justify-content: center; }
.qr-card .qr img, .qr-card .qr canvas { width: 190px; height: 190px; }
.qr-card .url { font-size: .72rem; color: #94a3b8; word-break: break-all; margin-top: .6rem; }
.qr-card .cta { margin-top: .4rem; font-weight: 700; color: #006aff; font-size: .9rem; }
.print-btn { margin: 1rem 0; }
@media print {
  .topbar, .qr-intro, .print-btn, .no-print { display: none !important; }
  .qr-grid { grid-template-columns: repeat(3, 1fr); }
  .qr-card { border-color: #cbd5e1; }
}
</style>

<h1>Affichettes QR — fiche de renseignement</h1>
<p class="qr-intro">
  Imprimez ces affichettes et posez-les au bureau de vente. En scannant le code,
  le client ouvre la fiche pré-remplie sur le bon projet et la remplit lui-même
  depuis son téléphone. Aucune application à installer.
</p>

<button class="print-btn no-print" onclick="window.print()">Imprimer</button>

<div class="qr-grid" id="qrGrid">
  <?php foreach ($projects as $id => $p): ?>
    <?php
      $name = $p['name']['fr'] ?? $id;
      $loc  = $p['location']['fr'] ?? '';
      $url  = $base . '/fiche.html?projet=' . rawurlencode((string)$id);
    ?>
    <div class="qr-card">
      <h3><?= h($name) ?></h3>
      <div class="loc"><?= h($loc) ?></div>
      <div class="qr" data-url="<?= h($url) ?>"></div>
      <div class="cta">Scannez pour remplir votre fiche</div>
      <div class="url"><?= h($url) ?></div>
    </div>
  <?php endforeach; ?>
</div>

<script src="../assets/vendor/qrcode/qrcode.js"></script>
<script>
  // Génère chaque QR dans le navigateur : l'URL n'est jamais envoyée ailleurs.
  document.querySelectorAll('.qr[data-url]').forEach(function (box) {
    var qr = qrcode(0, 'M');                 // type auto, correction moyenne
    qr.addData(box.getAttribute('data-url'));
    qr.make();
    box.innerHTML = qr.createImgTag(5, 8);   // 5 px/module, marge 8
    var img = box.querySelector('img');
    if (img) { img.style.width = '190px'; img.style.height = '190px'; }
  });
</script>

<?php admin_footer(); ?>
