<?php
/**
 * qr.php — affichettes QR à poser au bureau de vente, sans connexion.
 *
 * Chaque QR pointe vers fiche.html?projet=<id> : le client scanne avec son
 * téléphone et remplit la fiche lui-même. La page ne montre que des données
 * déjà publiques (nom et ville des projets, URL de la fiche publique), d'où
 * l'accès libre : le commercial l'ouvre et l'imprime sans passer par l'espace
 * d'administration. Elle reste hors des moteurs (noindex).
 *
 * Le QR est généré dans le navigateur : aucune URL n'est envoyée à un tiers.
 */

declare(strict_types=1);

require_once __DIR__ . '/api/config.php';
require_once __DIR__ . '/api/data.php';

$projects = nj_projects();
$base = nj_base_url();

function h(?string $v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Narjiss — Affichettes QR</title>
<link rel="icon" type="image/jpeg" href="images/logo-narjiss.jpg">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { --navy:#0c2340; --ocean:#006aff; --line:#e2e8f0; --muted:#64748b; --bg:#eef2f7; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:#1f2430; font-family:'Outfit',system-ui,sans-serif; }
  .wrap { max-width:1100px; margin:0 auto; padding:1.6rem 1.2rem 3rem; }
  h1 { color:var(--navy); font-size:1.5rem; margin:0 0 .4rem; }
  .intro { max-width:640px; color:#475569; margin:0 0 1.2rem; }
  .barre { display:flex; gap:.6rem; flex-wrap:wrap; margin-bottom:1.4rem; }
  .btn {
    display:inline-flex; align-items:center; min-height:44px; padding:.5rem 1.1rem;
    border:0; border-radius:9px; background:var(--ocean); color:#fff;
    font:inherit; font-weight:700; cursor:pointer; text-decoration:none;
  }
  .btn.ghost { background:#fff; color:var(--navy); border:1px solid var(--line); }
  .qr-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px,1fr)); gap:1rem; }
  .qr-card { border:1px solid var(--line); border-radius:12px; padding:1rem; background:#fff; text-align:center; break-inside:avoid; }
  .qr-card h3 { margin:0 0 .2rem; font-size:1.05rem; color:var(--navy); }
  .qr-card .loc { font-size:.82rem; color:var(--muted); margin-bottom:.7rem; }
  .qr-card .qr { display:flex; justify-content:center; }
  .qr-card .qr img { width:190px; height:190px; }
  .qr-card .cta { margin-top:.4rem; font-weight:700; color:var(--ocean); font-size:.9rem; }
  .qr-card .url { font-size:.72rem; color:#94a3b8; word-break:break-all; margin-top:.6rem; }
  @media print {
    body { background:#fff; }
    .intro, .barre { display:none !important; }
    .qr-grid { grid-template-columns:repeat(3, 1fr); }
    .qr-card { border-color:#cbd5e1; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>Affichettes QR — fiche de renseignement</h1>
  <p class="intro">
    Imprimez ces affichettes et posez-les au bureau de vente. En scannant le code,
    le client ouvre la fiche sur le bon projet et la remplit lui-même depuis son
    téléphone. Aucune application à installer.
  </p>

  <div class="barre">
    <button class="btn" onclick="window.print()">Imprimer</button>
    <a class="btn ghost" href="index.html">← Retour au site</a>
  </div>

  <div class="qr-grid">
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
</div>

<script src="assets/vendor/qrcode/qrcode.js"></script>
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
</body>
</html>
