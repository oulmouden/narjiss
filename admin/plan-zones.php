<?php
/**
 * admin/plan-zones.php — tracé des zones cliquables d'un plan d'étage.
 *
 * Le geste est celui de l'éditeur de plans de twins3d
 * (calibrate-floorplan.html) : on choisit d'abord le lot dans la liste, puis
 * on trace son contour sur le plan. Un polygone appartient donc toujours à un
 * lot — il n'existe pas de zone orpheline à raccrocher après coup.
 *
 * La détection automatique de tools/plan-zones.py n'est plus branchée ici :
 * elle produisait des polygones sans propriétaire, qu'il fallait ensuite
 * affecter un par un. Le script reste dans le dépôt, il pourra resservir pour
 * pré-mâcher un lot de plans, mais ce n'est plus le chemin nominal.
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/../api/plan-zones-lib.php';
require_once __DIR__ . '/../api/lots-lib.php';
require_once __DIR__ . '/../api/data.php';

admin_require_login();

$projets = nj_projects();
$projet  = (string) ($_GET['projet'] ?? ($_POST['projet'] ?? ''));
if ($projet === '' || !isset($projets[$projet])) {
    $projet = array_key_first($projets) ?? '';
}

$plans = $projet !== '' ? nj_zones_plans($projet) : [];
$plan  = (string) ($_GET['plan'] ?? ($_POST['plan'] ?? ''));
if ($plan === '' || !isset($plans[$plan])) {
    $plan = array_key_first($plans) ?? '';
}

/* ── Enregistrement (POST depuis l'éditeur) ────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'enregistrer') {
    header('Content-Type: application/json; charset=utf-8');

    if (!nj_zones_schema_present()) {
        http_response_code(409);
        echo json_encode(['ok' => false, 'message' => t_brut('pz_table_absente')]);
        exit;
    }

    $zones = json_decode((string) ($_POST['zones'] ?? '[]'), true);
    if (!is_array($zones)) $zones = [];

    try {
        $n = nj_zones_enregistrer(
            $projet, $plan, $zones,
            (int) ($plans[$plan]['largeur'] ?? 0),
            (int) ($plans[$plan]['hauteur'] ?? 0)
        );
        echo json_encode(['ok' => true, 'zones' => $n]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if (!nj_zones_schema_present()) {
    admin_header(t_brut('nav_zones'));
    ?>
    <section class="panel">
        <h1><?= t('pz_titre') ?></h1>
        <div class="error"><?= t_brut('pz_err_table') ?></div>
        <p><?= t('pz_err_table_aide') ?></p>
        <pre style="background:#f4f6f9;padding:1rem;border-radius:6px;overflow:auto">php sql/migrer.php sql/004_plan_zones.sql</pre>
    </section>
    <?php
    admin_footer();
    exit;
}

/* Les lots proposés au tracé. Un projet en porte plusieurs centaines :
   dérouler la liste entière pour huit polygones serait pénible. Le nom du
   fichier de plan porte presque toujours celui de l'immeuble
   (malaga.jpeg → immeuble « Malaga ») ; quand la correspondance existe on s'y
   limite, sinon on retombe sur tout plutôt que sur une liste vide. */
$tousLots = $plan !== '' ? nj_lots_liste($projet) : [];

/* Le nom du fichier n'est pas toujours exactement celui de l'immeuble :
   « malaga.jpeg » l'est, « immeuble-A.jpg » ne l'est pas. On compare donc
   l'immeuble au nom entier ET à chacun de ses fragments — « immeuble-A »
   donne « immeuble a », « immeuble », « a », et c'est « a » qui répond. */
$nomPlan = nj_lot_norm(str_replace(['-', '_'], ' ', (string) ($plans[$plan]['nom'] ?? '')));
$cles = array_filter(array_merge([$nomPlan], explode(' ', $nomPlan)));
$restreints = array_values(array_filter(
    $tousLots,
    static fn($l) => in_array(nj_lot_norm((string) $l['immeuble']), $cles, true)
));
$immeubleDuPlan = $restreints ? (string) $restreints[0]['immeuble'] : '';

$lots = [];
foreach ($restreints ?: $tousLots as $l) {
    $lots[] = [
        'numero'    => (string) $l['numero_lot'],
        'niveau'    => (string) $l['niveau'],
        'typologie' => strtoupper((string) $l['typologie']),
        'surface'   => (float) $l['surface_habitable'],
        'statut'    => (string) $l['statut'],
        'libelle'   => nj_lot_statut_libelle((string) $l['statut']),
    ];
}

/* Zones déjà tracées, indexées par numéro de lot : l'éditeur raisonne par lot,
   pas par polygone. Une zone sans lot (héritée de l'ancien modèle) est ignorée
   — elle n'a personne à qui appartenir. */
$parLot = [];
foreach ($plan !== '' ? nj_zones_lire($projet, $plan) : [] as $z) {
    if ($z['numero_lot'] === '') continue;
    $parLot[$z['numero_lot']] = $z['points'];
}

/* ── Cible du tracé : des lots, ou des immeubles ─────────────────────────────
   Un plan d'étage porte des lots. Un plan de MASSE porte des immeubles : c'est
   ce qui permet de montrer où sont A, B et C les uns par rapport aux autres,
   avant d'entrer dans l'un d'eux. Le geste ne change pas — choisir la cible
   dans la liste, tracer son contour — seule la nature de la cible change.

   Le mode est deviné d'après le nom du fichier, et reste modifiable dans la
   barre : deviner évite de le régler à chaque ouverture, pouvoir le changer
   évite d'être prisonnier d'un nom de fichier mal choisi. */
$estPlanMasse = (bool) preg_match('/masse|ensemble|situation|site/i',
                                  (string) ($plans[$plan]['nom'] ?? ''));
$cible = (string) ($_GET['cible'] ?? '');
if ($cible !== 'lots' && $cible !== 'immeubles') {
    $cible = $estPlanMasse ? 'immeubles' : 'lots';
}

if ($cible === 'immeubles') {
    // Les immeubles ne sont pas déclarés quelque part : ils se déduisent des
    // lots, seule source qui les nomme. Le compte de lots sert de repère au
    // tracé — « A, 48 lots » dit tout de suite si l'on vise le bon bâtiment.
    $compte = [];
    foreach ($tousLots as $l) {
        $imm = trim((string) $l['immeuble']);
        if ($imm !== '') $compte[$imm] = ($compte[$imm] ?? 0) + 1;
    }
    ksort($compte, SORT_NATURAL | SORT_FLAG_CASE);

    $lots = [];
    foreach ($compte as $imm => $n) {
        $lots[] = [
            'numero'    => (string) $imm,
            'niveau'    => '',
            'typologie' => '',
            'surface'   => 0.0,
            'statut'    => 'disponible',   // neutre : la pastille reste lisible
            'libelle'   => $n . ' lot' . ($n > 1 ? 's' : ''),
        ];
    }

    $parLot = [];
    foreach ($plan !== '' ? nj_zones_lire($projet, $plan) : [] as $z) {
        if ($z['immeuble'] === '') continue;
        $parLot[$z['immeuble']] = $z['points'];
    }
}

$avancement = nj_zones_avancement($projet);
$infoPlan = $plans[$plan] ?? ['largeur' => 0, 'hauteur' => 0, 'nom' => ''];

admin_header(t_brut('nav_zones'));
?>
<div class="actions">
    <div>
        <h1><?= t('pz_titre') ?></h1>
        <p><?= t($cible === 'immeubles' ? 'pz_intro_immeubles' : 'pz_intro_lots') ?></p>
    </div>
    <a class="button" href="lots.php?projet=<?= urlencode($projet) ?>"><?= t('pz_grille') ?></a>
</div>

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
        <label><?= t('pz_plan') ?>
            <select name="plan" onchange="this.form.submit()">
                <?php foreach ($plans as $chemin => $p):
                    $av = $avancement[$chemin] ?? null;
                    $suffixe = $av ? '  ' . t_brut('pz_tracees', ['n' => $av['affectees']]) : '  ' . t_brut('pz_vierge');
                ?>
                    <option value="<?= htmlspecialchars($chemin) ?>" <?= $chemin === $plan ? 'selected' : '' ?>>
                        <?= htmlspecialchars($p['nom'] . $suffixe) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </label>
        <label><?= t('pz_tracer_des') ?>
            <select name="cible" onchange="this.form.submit()">
                <option value="lots" <?= $cible === 'lots' ? 'selected' : '' ?>><?= t('pz_cible_lots') ?></option>
                <option value="immeubles" <?= $cible === 'immeubles' ? 'selected' : '' ?>><?= t('pz_cible_immeubles') ?></option>
            </select>
        </label>
    </div>
</form>

<?php if ($plan === ''): ?>
    <section class="panel">
        <div class="error"><?= t('pz_aucun_plan') ?></div>
        <p><?= t_brut('pz_aucun_plan_aide', [
               'a' => '<code>' . htmlspecialchars($projet) . '/plans/</code>',
               'b' => '<code>' . htmlspecialchars($projet) . '/floorplan/</code>',
           ]) ?></p>
    </section>
<?php elseif (!$lots): ?>
    <section class="panel">
        <div class="error"><?= t('pz_aucun_lot') ?></div>
        <p><?= t('pz_aucun_lot_aide') ?>
           <a href="lots-import.php?projet=<?= urlencode($projet) ?>"><?= t('lots_importer') ?></a>.</p>
    </section>
<?php else: ?>

<div class="zone-editeur">
    <section class="panel zone-scene">
        <div class="zone-barre">
            <button class="button" type="button" id="btnEnregistrer"><?= t('bt_enregistrer') ?></button>
            <label class="zone-champ"><?= t('pz_niveau') ?>
                <select id="niveau"></select>
            </label>
            <label class="zone-champ zone-champ-lot"><?= t('pz_lot_a_tracer') ?>
                <select id="choixLot"></select>
            </label>
            <button class="button secondary" type="button" id="btnFermer" disabled><?= t('pz_fermer') ?></button>
            <button class="button secondary" type="button" id="btnAnnulerPoint" disabled><?= t('pz_annuler_point') ?></button>
            <button class="button secondary" type="button" id="btnEffacer" disabled><?= t('pz_effacer') ?></button>
            <span class="zone-sep"></span>
            <label class="zone-champ"><?= t('pz_reporter_depuis') ?>
                <select id="reportSource"></select>
            </label>
            <button class="button secondary" type="button" id="btnReporterCe"><?= t('pz_vers_ce_niveau') ?></button>
            <button class="button secondary" type="button" id="btnReporterTous"><?= t('pz_vers_identiques') ?></button>
            <span class="zone-sep"></span>
            <button class="button secondary" type="button" id="btnZoomMoins">−</button>
            <span id="zoomLabel">100 %</span>
            <button class="button secondary" type="button" id="btnZoomPlus">+</button>
            <button class="button secondary" type="button" id="btnVue"><?= t('pz_vue_entiere') ?></button>
            <button class="button secondary" type="button" id="btnPleinEcran"><?= t('pz_plein_ecran') ?></button>
        </div>

        <div class="zone-cadre" id="cadre">
            <svg id="calque" xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 <?= (int) $infoPlan['largeur'] ?> <?= (int) $infoPlan['hauteur'] ?>"></svg>
        </div>

        <p class="zone-etat" id="etat"><?= t('pz_choisir_cible') ?></p>
        <p class="file-hint">
            <?= t_brut('pz_aide_tracer') ?>
            <br><?= t_brut('pz_aide_deplacer') ?>
            <?= t('pz_lots_proposes') ?> :
            <?= $immeubleDuPlan !== ''
                ? t_brut('pz_immeuble_x', ['i' => '<strong>' . htmlspecialchars($immeubleDuPlan) . '</strong>'])
                : t_brut('pz_tout_le_projet') ?>
            — <span id="compteur"></span>
        </p>
    </section>

    <section class="panel zone-liste">
        <h2><?= t('nav_lots') ?></h2>
        <input type="search" id="filtre" placeholder="<?= t('pz_filtrer') ?>" autocomplete="off">
        <div id="liste"></div>
    </section>
</div>

<style>
/* L'éditeur est un outil de dessin : il déborde volontairement de la largeur
   de .shell (1180 px), sinon le plan est minuscule sur un grand écran. */
.zone-editeur {
  width: calc(100vw - 2rem);
  max-width: 1800px;
  margin-inline-start: calc((min(1180px, 100vw - 2rem) - min(100vw - 2rem, 1800px)) / 2);
  display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 1rem; align-items: start;
}
/* Seuil bas : sur un portable tactile à 175 % de mise à l'échelle, le viewport
   CSS tombe sous 1100 px et la liste basculait sous le plan, hors écran. Le
   sélecteur de lot de la barre d'outils reste de toute façon accessible. */
@media (max-width: 820px) {
  .zone-editeur { width:auto; margin-inline-start:0; grid-template-columns:1fr; }
}
.zone-scene   { overflow:hidden; }
/* Le plan est rendu à sa taille réelle dans un cadre défilant : les barres de
   défilement du navigateur font le déplacement, il n'y a plus de geste à
   deviner. Zoomer revient à agrandir le SVG, pas à bouger une fenêtre. */
.zone-cadre   { overflow:auto; max-height:74vh; background:#f4f6f9; border-radius:8px;
                border:1px solid var(--line, #dde2ea); overscroll-behavior:contain; }
.zone-barre   { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; margin-bottom:.7rem; }
.zone-barre #zoomLabel { font-variant-numeric:tabular-nums; min-width:4.5em; text-align:center; }
.zone-champ   { display:flex; align-items:center; gap:.35rem; font-size:.85rem; font-weight:700; }
.zone-champ select { margin:0; }
.zone-champ-lot select { max-width:15rem; }
.zone-sep     { flex:1; }
#calque       { display:block; background:#f4f6f9; cursor:crosshair; }
.zone-etat    { margin:.6rem 0 .2rem; font-weight:700; }
/* Plein écran : la scène occupe tout, le plan prend la hauteur disponible. */
.zone-scene:fullscreen { background:#fff; padding:1rem; display:flex; flex-direction:column; }
.zone-scene:fullscreen .zone-cadre { flex:1; min-height:0; max-height:none; }

.zone-liste   { position:sticky; top:1rem; }
.zone-liste h2 { margin-top:0; }
#filtre { width:100%; margin-bottom:.6rem; }
#liste  { max-height:66vh; overflow:auto; display:flex; flex-direction:column; gap:2px; }
.lot-ligne {
  display:flex; align-items:center; gap:.5rem; padding:.45rem .5rem; border-radius:6px;
  border:1px solid transparent; cursor:pointer; font-size:.86rem; background:transparent;
  text-align:start; width:100%; font-family:inherit;
}
.lot-ligne:hover  { background:#f1f4f8; }
.lot-ligne.actif  { border-color:#e06a00; background:#fff4e8; }
.lot-pastille { width:10px; height:10px; border-radius:50%; flex:0 0 auto; }
.lot-corps    { flex:1; min-width:0; }
.lot-num      { font-weight:700; }
.lot-meta     { color:#6b7382; font-size:.78rem; }
.lot-badge    { font-size:.7rem; font-weight:700; padding:1px 6px; border-radius:9px; flex:0 0 auto; }
.lot-badge.fait   { background:#dcf3e8; color:#00734f; }
.lot-badge.reste  { background:#eef0f4; color:#8b93a3; }

/* Épaisseurs et corps de texte volontairement absents : ils sont calculés en
   JS et posés en attribut, pour rester constants à l'écran quel que soit le
   zoom. Une règle CSS ici l'emporterait sur l'attribut et figerait tout. */
.zone-poly        { fill-opacity:.20; }
.zone-poly.actif  { fill-opacity:.34; }
.zone-sommet      { fill:#fff; stroke:#e06a00; cursor:grab; }
.zone-trait       { stroke:#e06a00; fill:none; }
.zone-guide       { stroke:#e06a00; stroke-dasharray:6 5; opacity:.55; fill:none; }
.zone-etiq        { font-family:sans-serif; font-weight:700; fill:#12203a;
                    paint-order:stroke; stroke:#fff; pointer-events:none; }
</style>

<script>
/* Les messages du tracé, dans la langue de l'admin. Ils sont injectés depuis
   PHP plutôt que dupliqués en JavaScript : une seule table de langue pour tout
   le back-office, et rien à retraduire deux fois. */
const TXT = <?= json_encode([
    'choisir_cible'   => t_brut('pz_choisir_cible'),
    'choisir_lot'     => t_brut('pz_js_choisir_lot'),
    'deja_contour'    => t_brut('pz_js_deja_contour'),
    'sommets'         => t_brut('pz_js_sommets'),
    'fermer_conseil'  => t_brut('pz_js_fermer_conseil'),
    'encore'          => t_brut('pz_js_encore'),
    'contour_ferme'   => t_brut('pz_js_contour_ferme'),
    'contour_trace'   => t_brut('pz_js_contour_trace'),
    'poser_premier'   => t_brut('pz_js_poser_premier'),
    'abandonne'       => t_brut('pz_js_abandonne'),
    'efface'          => t_brut('pz_js_efface'),
    'aucun_filtre'    => t_brut('pz_js_aucun_filtre'),
    'trace'           => t_brut('pz_js_trace'),
    'a_tracer'        => t_brut('pz_js_a_tracer'),
    'niv'             => t_brut('pz_js_niv'),
    'compteur_tous'   => t_brut('pz_js_compteur_tous'),
    'compteur_niveau' => t_brut('pz_js_compteur_niveau'),
    'choisir_option'  => t_brut('pz_js_choisir_option'),
    'niveau_n'        => t_brut('pz_js_niveau_n'),
    'tous'            => t_brut('pz_js_tous'),
    'rep_niveau'      => t_brut('pz_js_rep_niveau'),
    'rep_identiques'  => t_brut('pz_js_rep_identiques'),
    'rep_rien'        => t_brut('pz_js_rep_rien'),
    'rep_rien2'       => t_brut('pz_js_rep_rien2'),
    'rep_faits'       => t_brut('pz_js_rep_faits'),
    'rep_faits2'      => t_brut('pz_js_rep_faits2'),
    'rep_aucun_autre' => t_brut('pz_js_rep_aucun_autre'),
    'rep_confirm'     => t_brut('pz_js_rep_confirm'),
    'enregistrement'  => t_brut('pz_js_enregistrement'),
    'enregistres'     => t_brut('pz_js_enregistres'),
    'echec'           => t_brut('pz_js_echec'),
    'erreur_inconnue' => t_brut('pz_js_erreur_inconnue'),
    'brouillon'       => t_brut('pz_js_brouillon'),
    'brouillon_ok'    => t_brut('pz_js_brouillon_ok'),
], JSON_UNESCAPED_UNICODE) ?>;

/** Un libellé, jetons {x} remplacés. */
function T(cle, vars) {
  var s = TXT[cle] || cle;
  for (var k in (vars || {})) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var svg      = document.getElementById('calque');
  var etat     = document.getElementById('etat');
  var listeEl  = document.getElementById('liste');
  var filtreEl = document.getElementById('filtre');
  var compteur = document.getElementById('compteur');
  var choixLot = document.getElementById('choixLot');
  var niveauEl = document.getElementById('niveau');

  var LOTS  = <?= json_encode($lots, JSON_UNESCAPED_UNICODE) ?>;
  // 'lots' ou 'immeubles' : décide seulement du champ écrit à l'enregistrement.
  // Tout le reste de l'éditeur raisonne sur un identifiant de cible, sans avoir
  // à savoir ce qu'il désigne.
  var CIBLE = <?= json_encode($cible) ?>;
  var PLAN  = <?= json_encode('../' . $plan) ?>;
  var LARG  = <?= (int) $infoPlan['largeur'] ?>;
  var HAUT  = <?= (int) $infoPlan['hauteur'] ?>;

  // numero_lot -> [[x,y], …]. Un polygone a toujours un propriétaire.
  var contours = <?= json_encode((object) $parLot, JSON_UNESCAPED_UNICODE) ?>;

  /* ── Filet de sécurité navigateur : brouillon local ──────────────────────
     Chaque modification est recopiée dans localStorage. Un onglet fermé par
     accident, un plantage ou un rechargement ne perdent donc plus le tracé en
     cours : au retour, on propose de restaurer les contours non enregistrés. */
  var PZ_KEY = 'nj-pz-draft:' + <?= json_encode($projet) ?> + ':' + <?= json_encode($plan) ?>;
  function sauverBrouillonLocal() {
    try { localStorage.setItem(PZ_KEY, JSON.stringify({ t: Date.now(), contours: contours })); }
    catch (e) { /* quota / mode privé : on ignore silencieusement */ }
  }

  /* Couleurs des statuts : relues sur :root, donc celles de
     shared/statuts-lots.css — les contours tracés ici ont exactement la teinte
     que le client verra sur le plan. Cet éditeur avait sa propre palette, où
     « vendu » était rouge et « réservé » bleu : de quoi lire un statut pour un
     autre en passant d'un écran à l'autre. Repli sur les mêmes valeurs si la
     feuille manque. */
  function jeton(nom, repli) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
    return v || repli;
  }
  var COULEUR = {
    disponible: jeton('--lot-dispo', '#1f6f55'),
    optionne:   jeton('--lot-optionne', '#9e6300'),
    reserve:    jeton('--lot-reserve', '#1c5fa8'),
    vendu:      jeton('--lot-vendu', '#5a6272'),
    bloque:     '#8b93a3'
  };

  var parNumero = {};
  LOTS.forEach(function (l) { parNumero[l.numero] = l; });

  function couleurDe(numero) {
    var l = parNumero[numero];
    return COULEUR[l ? l.statut : 'bloque'] || '#8b93a3';
  }

  /* Un plan d'étage courant sert plusieurs niveaux : une fois les contours
     reportés, quatre polygones identiques se superposeraient et leurs quatre
     étiquettes se chevaucheraient. On n'affiche donc qu'un niveau à la fois. */
  var niveauActif = LOTS.length ? LOTS[0].niveau : '';

  function visible(numero) {
    if (niveauActif === '') return true;
    var l = parNumero[numero];
    return !l || l.niveau === niveauActif;
  }

  var cadre = document.getElementById('cadre');
  var facteur = 1;           // px écran par unité image
  var lotActif = null;
  var brouillon = [];        // sommets du tracé en cours
  var souris = { x: 0, y: 0 };
  var modifie = false;
  var dernierTap = 0;

  function marquerModifie() { modifie = true; sauverBrouillonLocal(); }

  /* ── Repère ──────────────────────────────────────────────────────────────
     Le SVG porte le viewBox du plan : les coordonnées manipulées sont donc
     toujours celles de l'image d'origine, quels que soient le zoom et la
     taille d'affichage. Rien à convertir au moment d'enregistrer. */
  function pointImage(evt) {
    var p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    var t = p.matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.round(t.x), y: Math.round(t.y) };
  }

  /**
   * Applique l'échelle.
   *
   * Le viewBox ne bouge jamais : c'est la taille de rendu du SVG qui change.
   * Le cadre parent devient donc trop petit et le navigateur sort ses propres
   * barres de défilement — plus besoin de maintenir Espace ni de deviner un
   * geste pour se déplacer dans un plan zoomé.
   */
  function appliquerEchelle() {
    svg.style.width = Math.round(LARG * facteur) + 'px';
    svg.style.height = Math.round(HAUT * facteur) + 'px';
    document.getElementById('zoomLabel').textContent = Math.round(facteur * 100) + ' %';
    // Un bouton qui ne fera rien doit le montrer.
    document.getElementById('btnZoomMoins').disabled = facteur <= echelleAjustee() + 1e-6;
    document.getElementById('btnZoomPlus').disabled = facteur >= 8 - 1e-6;
  }

  /**
   * Échelle en dessous de laquelle il n'y a plus rien à gagner : le plan tient
   * déjà tout entier dans le cadre. Continuer à réduire ne fait que le tasser
   * dans un coin en laissant du vide autour — c'est laid et ça n'aide à rien.
   *
   * La hauteur de référence est celle que le cadre peut prendre au maximum
   * (74 vh), et non sa hauteur courante : celle-ci dépend du contenu, donc de
   * l'échelle, et la calculer à partir d'elle tournerait en rond.
   */
  function echelleAjustee() {
    var l = cadre.clientWidth - 2;
    var h = window.innerHeight * 0.74 - 2;
    if (l <= 0) return 1;
    return Math.min(1.5, Math.min(l / LARG, h / HAUT));
  }

  /**
   * Zoome en gardant sous le curseur le point de l'image qui s'y trouvait.
   * `ancre` est un point écran ; sans lui on garde le centre du cadre.
   */
  function zoomer(pas, ancre) {
    var avant = facteur;
    facteur = Math.max(echelleAjustee(), Math.min(8, facteur * pas));
    if (facteur === avant) return;          // déjà à la butée

    var r = cadre.getBoundingClientRect();
    var ax = ancre ? ancre.x - r.left : r.width / 2;
    var ay = ancre ? ancre.y - r.top : r.height / 2;
    var ix = (cadre.scrollLeft + ax) / avant;      // point image sous l'ancre
    var iy = (cadre.scrollTop + ay) / avant;

    appliquerEchelle();
    cadre.scrollLeft = ix * facteur - ax;
    cadre.scrollTop = iy * facteur - ay;
    dessiner();
  }

  /** Le plan entier tient dans le cadre, hauteur comprise. */
  function vueEntiere() {
    facteur = echelleAjustee();
    appliquerEchelle();
    cadre.scrollLeft = cadre.scrollTop = 0;
    dessiner();
  }

  /* Réduire la fenêtre resserre le cadre : ce qui tenait tout juste peut ne
     plus tenir, et le plancher de zoom remonte. On s'y raccroche. */
  window.addEventListener('resize', function () {
    var mini = echelleAjustee();
    if (facteur < mini) { facteur = mini; appliquerEchelle(); dessiner(); }
  });

  /* ── Rendu ─────────────────────────────────────────────────────────────── */
  function elem(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function centre(points) {
    var x = 0, y = 0;
    points.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / points.length, y / points.length];
  }

  /** Rayon des poignées, en unités image. Divisé par l'échelle pour rester
      constant à l'écran : 9 px quel que soit le zoom, assez large pour être
      visé au doigt. Même raison pour les épaisseurs de trait et le corps des
      étiquettes, posés en style en ligne plus bas. */
  function rayon() { return 9 / facteur; }
  function trait(px) { return px / facteur; }

  /* Corps de l'étiquette de lot, en unités image.
     Elle suit le plan (donc rétrécit avec les appartements quand on dézoome et
     ne les chevauche plus), mais reste plafonnée à ~24 px à l'écran pour ne pas
     devenir envahissante quand on zoome fort. */
  function corpsEtiquette() { return Math.min(20, 24 / facteur); }

  function dessiner() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.appendChild(elem('image', {
      href: PLAN, x: 0, y: 0, width: LARG, height: HAUT, preserveAspectRatio: 'none'
    }));

    // Contours enregistrés, colorés par statut du lot : l'éditeur donne du
    // même coup un aperçu de ce que verra le client.
    Object.keys(contours).forEach(function (numero) {
      var pts = contours[numero];
      if (!pts || pts.length < 3 || !visible(numero)) return;
      var c = couleurDe(numero);
      var actif = numero === lotActif;

      var poly = elem('polygon', {
        points: pts.map(function (p) { return p.join(','); }).join(' '),
        fill: c, stroke: c,
        'stroke-width': trait(actif ? 5 : 3),
        'class': 'zone-poly' + (actif ? ' actif' : '')
      });
      poly.style.cursor = 'pointer';
      poly.addEventListener('pointerdown', function (e) {
        if (brouillon.length) return;
        e.stopPropagation();
        choisirLot(numero);
      });
      svg.appendChild(poly);

      var m = centre(pts);
      var corps = corpsEtiquette();
      var t = elem('text', {
        x: m[0], y: m[1], 'text-anchor': 'middle', 'class': 'zone-etiq',
        'font-size': corps, 'stroke-width': corps * 0.22
      });
      t.textContent = numero;
      svg.appendChild(t);
    });

    // Sommets déplaçables du lot courant, quand son contour est fermé.
    if (lotActif && contours[lotActif] && !brouillon.length && visible(lotActif)) {
      contours[lotActif].forEach(function (p, k) {
        var c = elem('circle', {
          cx: p[0], cy: p[1], r: rayon(), 'stroke-width': trait(2.5), 'class': 'zone-sommet'
        });
        c.addEventListener('pointerdown', function (e) {
          e.stopPropagation();
          if (e.altKey) {
            if (contours[lotActif].length > 3) {
              contours[lotActif].splice(k, 1);
              marquerModifie(); rendre();
            }
            return;
          }
          glisser(k, e.pointerId);
        });
        svg.appendChild(c);
      });
    }

    // Tracé en cours : segments posés, élastique vers le curseur, et rappel
    // du point de fermeture.
    if (brouillon.length) {
      var suite = brouillon.map(function (p) { return p.x + ',' + p.y; }).join(' ');
      svg.appendChild(elem('polyline', {
        points: suite, 'stroke-width': trait(3), 'class': 'zone-trait'
      }));
      svg.appendChild(elem('line', {
        x1: brouillon[brouillon.length - 1].x, y1: brouillon[brouillon.length - 1].y,
        x2: souris.x, y2: souris.y, 'stroke-width': trait(2), 'class': 'zone-guide'
      }));
      if (brouillon.length >= 2) {
        svg.appendChild(elem('line', {
          x1: souris.x, y1: souris.y,
          x2: brouillon[0].x, y2: brouillon[0].y, 'stroke-width': trait(2), 'class': 'zone-guide'
        }));
      }
      var r = rayon();
      brouillon.forEach(function (p, i) {
        svg.appendChild(elem('circle', {
          cx: p.x, cy: p.y, r: i === 0 ? r * 1.4 : r,
          'stroke-width': trait(2.5), 'class': 'zone-sommet'
        }));
      });
    }
  }

  function glisser(k, pointerId) {
    try { svg.setPointerCapture(pointerId); } catch (e) {}
    function bouge(e) {
      if (e.pointerId !== pointerId) return;
      var p = pointImage(e);
      contours[lotActif][k] = [p.x, p.y];
      dessiner();
    }
    function fin(e) {
      if (e.pointerId !== pointerId) return;
      svg.removeEventListener('pointermove', bouge);
      svg.removeEventListener('pointerup', fin);
      svg.removeEventListener('pointercancel', fin);
      marquerModifie(); rendre();
    }
    svg.addEventListener('pointermove', bouge);
    svg.addEventListener('pointerup', fin);
    svg.addEventListener('pointercancel', fin);
  }

  /* ── Liste des lots et sélecteur ───────────────────────────────────────── */
  function lotsDuNiveau() {
    return LOTS.filter(function (l) { return niveauActif === '' || l.niveau === niveauActif; });
  }

  function estTracé(numero) {
    return !!(contours[numero] && contours[numero].length >= 3);
  }

  function rendreListe() {
    var q = filtreEl.value.trim().toLowerCase();
    listeEl.innerHTML = '';

    lotsDuNiveau().forEach(function (l) {
      var texte = (l.numero + ' ' + l.niveau + ' ' + l.typologie + ' ' + l.libelle).toLowerCase();
      if (q && texte.indexOf(q) === -1) return;

      var fait = estTracé(l.numero);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lot-ligne' + (l.numero === lotActif ? ' actif' : '');
      b.innerHTML =
        '<span class="lot-pastille" style="background:' + (COULEUR[l.statut] || '#8b93a3') + '"></span>' +
        '<span class="lot-corps"><span class="lot-num"></span><br>' +
        '<span class="lot-meta"></span></span>' +
        '<span class="lot-badge ' + (fait ? 'fait' : 'reste') + '">' + (fait ? T('trace') : T('a_tracer')) + '</span>';
      b.querySelector('.lot-num').textContent = l.numero;
      b.querySelector('.lot-meta').textContent =
        T('niv', { n: l.niveau }) + ' · ' + l.typologie + ' · ' + l.surface + ' m² · ' + l.libelle;
      b.addEventListener('click', function () { choisirLot(l.numero); });
      listeEl.appendChild(b);
    });

    if (!listeEl.children.length) {
      listeEl.innerHTML = '<p class="file-hint">' + T('aucun_filtre') + '</p>';
    }

    function tracés(liste) { return liste.filter(function (l) { return estTracé(l.numero); }).length; }
    var duNiveau = lotsDuNiveau();
    compteur.textContent = niveauActif === ''
      ? T('compteur_tous', { a: tracés(LOTS), b: LOTS.length })
      : T('compteur_niveau', { a: tracés(duNiveau), b: duNiveau.length,
                               c: tracés(LOTS), d: LOTS.length });
  }

  /* Le même choix que la liste, mais dans la barre d'outils : sur un écran
     étroit la colonne de droite passe sous le plan, et le sélecteur reste
     alors le seul point d'entrée visible. */
  function rendreChoix() {
    choixLot.innerHTML = '<option value="">' + T('choisir_option') + '</option>' +
      lotsDuNiveau().map(function (l) {
        return '<option value="' + l.numero + '"' + (l.numero === lotActif ? ' selected' : '') + '>' +
          l.numero + ' · ' + l.typologie + ' · ' + l.surface + ' m²' +
          (estTracé(l.numero) ? ' ✓' : '') + '</option>';
      }).join('');
  }

  function choisirLot(numero) {
    lotActif = numero;
    brouillon = [];
    var l = parNumero[numero];
    etat.textContent = contours[numero]
      ? numero + T('contour_trace')
      : numero + (l ? ' (' + l.typologie + ', ' + l.surface + ' m²)' : '') + T('poser_premier');
    rendre();
  }

  function boutons() {
    document.getElementById('btnFermer').disabled = brouillon.length < 3;
    document.getElementById('btnAnnulerPoint').disabled = brouillon.length === 0;
    document.getElementById('btnEffacer').disabled = !(lotActif && contours[lotActif]);
  }

  function rendre() { dessiner(); rendreListe(); rendreChoix(); boutons(); }

  /* ── Tracé ─────────────────────────────────────────────────────────────── */
  function fermerContour() {
    if (brouillon.length < 3) return;
    contours[lotActif] = brouillon.map(function (p) { return [p.x, p.y]; });
    brouillon = [];
    marquerModifie();
    etat.textContent = lotActif + T('contour_ferme', { n: contours[lotActif].length });
    rendre();
  }

  /** Aimantation sur le premier sommet : fermer un polygone sans viser au
      pixel près, au doigt comme à la souris. */
  function aimanter(p) {
    if (brouillon.length < 3) return p;
    var d = Math.hypot(p.x - brouillon[0].x, p.y - brouillon[0].y);
    return d < rayon() * 2.5 ? { x: brouillon[0].x, y: brouillon[0].y } : p;
  }

  function poserSommet(p) {
    if (!lotActif) { etat.textContent = T('choisir_lot'); return; }
    if (contours[lotActif] && !brouillon.length) {
      etat.textContent = lotActif + T('deja_contour');
      return;
    }
    p = aimanter(p);
    if (brouillon.length >= 3 && p.x === brouillon[0].x && p.y === brouillon[0].y) {
      fermerContour();
      return;
    }
    brouillon.push(p);
    etat.textContent = lotActif + T('sommets', { n: brouillon.length }) +
      (brouillon.length >= 3 ? T('fermer_conseil')
                             : T('encore', { n: 3 - brouillon.length }));
    rendre();
  }

  /* ── Entrées ───────────────────────────────────────────────────────────────
     Le déplacement dans un plan zoomé appartient désormais au navigateur : le
     cadre a ses barres de défilement, la molette fait défiler, un doigt posé
     fait défiler. Il ne reste ici que le tracé, plus aucun geste à deviner.

     Seul le zoom est intercepté, sur Ctrl+molette — la convention des logiciels
     de plan, et celle que le navigateur réserve déjà au zoom. */
  var appui = null;

  svg.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    appui = { x: e.clientX, y: e.clientY, bouge: false };
  });

  svg.addEventListener('pointermove', function (e) {
    if (appui && Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 8) {
      appui.bouge = true;   // c'était un défilement, pas un clic
    }
    souris = aimanter(pointImage(e));
    if (brouillon.length) dessiner();
  });

  function relacher(e) {
    var a = appui;
    appui = null;
    if (!a || a.bouge || e.type === 'pointercancel') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Appui bref sans déplacement = clic ou tap. Deux coup sur coup ferment.
    var maintenant = Date.now();
    if (maintenant - dernierTap < 320 && brouillon.length >= 3) {
      fermerContour();
      dernierTap = 0;
      return;
    }
    dernierTap = maintenant;
    poserSommet(pointImage(e));
  }

  svg.addEventListener('pointerup', relacher);
  svg.addEventListener('pointercancel', relacher);

  cadre.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return;            // molette seule : défilement natif
    e.preventDefault();
    zoomer(e.deltaY < 0 ? 1.15 : 1 / 1.15, { x: e.clientX, y: e.clientY });
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'Enter') { fermerContour(); }
    else if (e.key === 'Escape') { brouillon = []; etat.textContent = T('abandonne'); rendre(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (brouillon.length) { brouillon.pop(); rendre(); e.preventDefault(); }
    }
  });

  /* ── Report d'un niveau SOURCE vers d'autres niveaux ────────────────────
     Un « plan d'étage courant » sert plusieurs niveaux identiques : MAL-1-01,
     MAL-2-01, MAL-3-01, MAL-4-01 partagent le même contour. Le report évite de
     tracer N fois les mêmes formes.

     L'ancienne version prenait comme modèle « le premier lot tracé » de chaque
     verticale. Or le RDC (commerces) partage la clé verticale des appartements
     du dessus (MAL-RDC-01 et MAL-1-01 → même verticale « MAL|01 ») : le RDC
     s'imposait alors comme modèle et ÉCRASAIT les appartements. On choisit
     désormais explicitement le niveau SOURCE ; il n'écrase jamais un autre
     niveau à son insu. */

  // Clé de la verticale d'un lot : son numéro privé de son segment de niveau.
  function cleVerticale(l) {
    var marqueur = '-' + l.niveau + '-';
    var i = l.numero.lastIndexOf(marqueur);
    if (i < 0) return null;                      // numérotation hors convention
    return l.numero.slice(0, i) + '|' + l.numero.slice(i + marqueur.length);
  }
  // niveau -> { cléVerticale -> numéro de lot }
  function lotsParNiveau() {
    var m = {};
    LOTS.forEach(function (l) {
      var k = cleVerticale(l); if (k === null) return;
      (m[l.niveau] = m[l.niveau] || {})[k] = l.numero;
    });
    return m;
  }
  // Ensemble des clés verticales présentes sur un niveau (pour « niveaux identiques »).
  function signatureNiveau(niv, m) {
    return Object.keys(m[niv] || {}).sort().join(',');
  }

  /* Copie les contours du niveau `source` vers chaque niveau de `cibles`.
     Ne touche qu'un lot cible qui EXISTE et dont le lot source est tracé. */
  function reporterDepuis(source, cibles) {
    var m = lotsParNiveau();
    var src = m[source] || {};
    var faits = 0;
    cibles.forEach(function (niv) {
      if (niv === source) return;
      var cib = m[niv] || {};
      Object.keys(cib).forEach(function (cle) {
        var lotSource = src[cle];
        if (!lotSource || !estTracé(lotSource)) return;   // rien à copier
        // copie profonde : deux niveaux ne partagent jamais le même tableau,
        // sinon déplacer un sommet les déformerait tous.
        contours[cib[cle]] = contours[lotSource].map(function (p) { return [p[0], p[1]]; });
        faits++;
      });
    });
    return faits;
  }

  // Remplit le sélecteur de niveau source (mêmes niveaux que le filtre).
  function remplirSourceReport() {
    var src = document.getElementById('reportSource');
    var niveaux = [];
    LOTS.forEach(function (l) { if (niveaux.indexOf(l.niveau) === -1) niveaux.push(l.niveau); });
    src.innerHTML = niveaux.map(function (n) {
      return '<option value="' + n + '">' + T('niveau_n', { n: n }) + '</option>';
    }).join('');
  }

  // « → ce niveau » : reporter la source sur le niveau actuellement affiché.
  document.getElementById('btnReporterCe').addEventListener('click', function () {
    var source = document.getElementById('reportSource').value;
    if (niveauActif === '') { etat.textContent = T('rep_niveau'); return; }
    if (source === niveauActif) { etat.textContent = T('rep_identiques'); return; }
    var faits = reporterDepuis(source, [niveauActif]);
    if (!faits) { etat.textContent = T('rep_rien', { s: source }); return; }
    marquerModifie();
    etat.textContent = T('rep_faits', { n: faits, s: source, c: niveauActif });
    rendre();
  });

  // « → niveaux identiques » : reporter la source sur tous les niveaux qui ont
  // exactement la même liste de lots (donc jamais le RDC si sa liste diffère).
  document.getElementById('btnReporterTous').addEventListener('click', function () {
    var source = document.getElementById('reportSource').value;
    var m = lotsParNiveau();
    var sig = signatureNiveau(source, m);
    var cibles = Object.keys(m).filter(function (niv) {
      return niv !== source && signatureNiveau(niv, m) === sig;
    });
    if (!cibles.length) {
      etat.textContent = T('rep_aucun_autre', { s: source });
      return;
    }
    if (!confirm(T('rep_confirm', { s: source, n: cibles.length, l: cibles.join(', ') }))) return;
    var faits = reporterDepuis(source, cibles);
    if (!faits) { etat.textContent = T('rep_rien2', { s: source }); return; }
    marquerModifie();
    etat.textContent = T('rep_faits2', { n: faits, s: source });
    rendre();
  });

  /* ── Barre d'outils ────────────────────────────────────────────────────── */
  document.getElementById('btnFermer').addEventListener('click', fermerContour);
  document.getElementById('btnAnnulerPoint').addEventListener('click', function () {
    if (brouillon.length) { brouillon.pop(); rendre(); }
  });
  document.getElementById('btnEffacer').addEventListener('click', function () {
    if (!lotActif || !contours[lotActif]) return;
    delete contours[lotActif];
    brouillon = [];
    marquerModifie();
    etat.textContent = lotActif + T('efface');
    rendre();
  });
  document.getElementById('btnZoomPlus').addEventListener('click', function () { zoomer(1.25); });
  document.getElementById('btnZoomMoins').addEventListener('click', function () { zoomer(0.8); });
  document.getElementById('btnVue').addEventListener('click', vueEntiere);
  document.getElementById('btnPleinEcran').addEventListener('click', function () {
    var scene = document.querySelector('.zone-scene');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (scene.requestFullscreen) scene.requestFullscreen();
  });
  filtreEl.addEventListener('input', rendreListe);
  choixLot.addEventListener('change', function () {
    if (this.value) choisirLot(this.value);
  });

  var niveaux = [];
  LOTS.forEach(function (l) { if (niveaux.indexOf(l.niveau) === -1) niveaux.push(l.niveau); });
  niveauEl.innerHTML = niveaux.map(function (n) {
    return '<option value="' + n + '"' + (n === niveauActif ? ' selected' : '') + '>' + n + '</option>';
  }).join('') + '<option value="">' + T('tous') + '</option>';
  remplirSourceReport();
  niveauEl.addEventListener('change', function () {
    niveauActif = this.value;
    brouillon = [];
    if (lotActif && !visible(lotActif)) {
      lotActif = null;
      etat.textContent = T('choisir_cible');
    }
    rendre();
  });

  document.getElementById('btnEnregistrer').addEventListener('click', function () {
    var charge = Object.keys(contours)
      .filter(estTracé)
      .map(function (n) {
        var z = { points: contours[n], origine: 'manuel' };
        // Un polygone désigne un lot OU un immeuble, jamais les deux : la
        // cible serait ambiguë au moment du clic côté visiteur.
        if (CIBLE === 'immeubles') z.immeuble = n; else z.numero_lot = n;
        return z;
      });

    var corps = new FormData();
    corps.append('action', 'enregistrer');
    corps.append('projet', <?= json_encode($projet) ?>);
    corps.append('plan', <?= json_encode($plan) ?>);
    corps.append('zones', JSON.stringify(charge));

    etat.textContent = T('enregistrement');
    fetch(window.location.href, { method: 'POST', body: corps })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { modifie = false; sauverBrouillonLocal(); etat.textContent = T('enregistres', { n: d.zones }); }
        else { etat.textContent = T('echec', { d: d.message || T('erreur_inconnue') }); }
      })
      .catch(function (err) { etat.textContent = T('echec', { d: err.message }); });
  });

  window.addEventListener('beforeunload', function (e) {
    if (modifie) { e.preventDefault(); e.returnValue = ''; }
  });

  /* Restauration d'un brouillon local plus riche que l'état chargé de la base. */
  (function restaurerBrouillon() {
    var brut; try { brut = localStorage.getItem(PZ_KEY); } catch (e) { return; }
    if (!brut) return;
    var d; try { d = JSON.parse(brut); } catch (e) { return; }
    if (!d || !d.contours) return;
    var tracesBrouillon = Object.keys(d.contours).filter(function (n) {
      return Array.isArray(d.contours[n]) && d.contours[n].length >= 3;
    });
    var nouveaux = tracesBrouillon.filter(function (n) { return !estTracé(n); });
    if (!nouveaux.length) return;   // le brouillon n'apporte rien de plus qu'en base
    var quand = new Date(d.t || Date.now()).toLocaleString(<?= json_encode(str_replace('_', '-', admin_locale())) ?>);
    if (confirm(T('brouillon', { n: tracesBrouillon.length, q: quand, m: nouveaux.length }))) {
      nouveaux.forEach(function (n) {
        contours[n] = d.contours[n].map(function (p) { return [p[0], p[1]]; });
      });
      modifie = true;
      etat.textContent = T('brouillon_ok', { n: nouveaux.length });
    }
  })();

  vueEntiere();
  rendre();
})();
</script>


<?php endif; ?>
<?php admin_footer(); ?>
