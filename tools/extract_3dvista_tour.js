/**
 * tools/extract_3dvista_tour.js — convertit un tour 3DVista en configuration
 * Pannellum, SANS toucher aux images.
 *
 *   node tools/extract_3dvista_tour.js jawhara/Tour
 *   → écrit jawhara/Tour/tour-pannellum.json
 *
 * POURQUOI ÉVALUER PLUTÔT QUE PARSER
 * 3DVista range tout le tour dans un `var script = {…}` de 150 Ko à l'intérieur
 * d'une IIFE, mêlé à des références JS (`TDV.Tour.Script.foo`, `trans(…)`) : ce
 * n'est pas du JSON, et une extraction à l'expression régulière casserait à la
 * première ré-export. On exécute donc le fichier dans un bac à sable avec un
 * faux TDV, et on récupère l'objet que le tour nous tend lui-même. Le fichier
 * ne touche ni `window` ni `document` — vérifié — donc rien d'autre à simuler.
 *
 * LES TUILES SONT RÉUTILISÉES TELLES QUELLES
 * 3DVista exporte déjà des faces de cube en WebP, découpées en tuiles de 512 :
 *   media/panorama_XXX_0/{face}/{niveau}/{ligne}_{colonne}.webp
 * C'est très exactement ce que Pannellum sait lire en mode `multiRes`. Aucun
 * ré-export, aucune copie, aucun disque en plus.
 *
 * LA SUBTILITÉ DES NIVEAUX — le piège de ce portage
 * Les deux numérotent en sens INVERSE : chez 3DVista le dossier 0 est le plus
 * détaillé, chez Pannellum c'est `maxLevel`. Et le gabarit d'URL de Pannellum
 * (`%l`) est une simple substitution de chaîne : impossible d'y inverser un
 * compteur.
 *
 * On ne peut pas non plus se contenter du niveau le plus fin en déclarant
 * `maxLevel: 1` : Pannellum construit TOUJOURS ses nœuds racines au niveau 1
 * avec une seule tuile par face (`new ka(face, side, 1, 0, 0, path)` dans
 * pannellum.js), puis subdivise. Déclarer une face de 2048 au niveau 1 lui fait
 * étirer la tuile 0_0 — 512 px du coin supérieur gauche — sur la face entière.
 * Résultat : une image méconnaissable, aux arêtes du cube bien visibles.
 *
 * D'où la solution retenue : reconstruire l'arborescence dans la numérotation
 * de Pannellum, sous <tour>/pannellum/. Les tuiles sont les MÊMES fichiers —
 * on ne ré-encode rien, on pose des LIENS PHYSIQUES (fs.link) qui ne coûtent
 * pas un octet de plus. Copie de secours si le système ne les gère pas.
 *
 * Correspondance : dossier 3DVista = (nombre de niveaux) − (niveau Pannellum).
 * Pour une face de 2048 en trois niveaux :
 *   Pannellum 1 (512, 1 tuile)  ← 3DVista 2
 *   Pannellum 2 (1024, 2×2)     ← 3DVista 1
 *   Pannellum 3 (2048, 4×4)     ← 3DVista 0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TILE_RESOLUTION = 512; // taille de tuile imposée par l'export 3DVista
const PYRAMIDE = 'pannellum'; // sous-dossier de l'arborescence renumérotée

/**
 * Rebâtit les niveaux d'un panorama dans la numérotation de Pannellum.
 *
 * Rien n'est ré-encodé : ce sont les tuiles de 3DVista, posées sous un autre
 * nom de dossier. On tente d'abord un LIEN PHYSIQUE — deux noms pour les mêmes
 * octets, donc aucun disque supplémentaire, et `tar` les préserve au
 * déploiement. Copie de secours si le système de fichiers refuse.
 *
 * @returns {number|null} nombre de tuiles rattachées, ou null si l'une manque.
 */
function construirePyramide(tourDir, dossierSource, nom, niveaux) {
  const n = niveaux.length;
  let total = 0;

  for (let L = 1; L <= n; L++) {
    const source = n - L;                        // numérotation 3DVista
    const cote = niveaux[source].height;
    const tuiles = cote / TILE_RESOLUTION;       // tuiles par côté de face

    for (const face of 'fbudlr') {
      const cible = path.join(tourDir, PYRAMIDE, nom, face, String(L));
      fs.mkdirSync(cible, { recursive: true });

      for (let y = 0; y < tuiles; y++) {
        for (let x = 0; x < tuiles; x++) {
          const de = path.join(tourDir, dossierSource, face, String(source), `${y}_${x}.webp`);
          if (!fs.existsSync(de)) return null;
          const vers = path.join(cible, `${y}_${x}.webp`);
          // Régénération : on repart d'un lien neuf, sinon un ré-export
          // laisserait en place les tuiles de l'ancien tour.
          try { fs.unlinkSync(vers); } catch (e) { /* absent */ }
          try {
            fs.linkSync(de, vers);
          } catch (e) {
            fs.copyFileSync(de, vers);
          }
          total++;
        }
      }
    }
  }
  return total;
}

/** Exécute le script du tour et rend l'objet de description. */
function loadTourScript(file) {
  const src = fs.readFileSync(file, 'utf8');
  let captured = null;
  // Toute propriété de TDV.Tour.Script rend une fonction vide : le tour y
  // accroche des gestionnaires qu'on n'appellera jamais.
  const anyFn = new Proxy({}, { get: () => function () {} });
  const sandbox = {
    TDV: {
      Tour: { Script: anyFn },
      PlayerAPI: { defineScript: (s) => { captured = s; } },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { timeout: 30000 });
  if (!captured) throw new Error(`${file} n'a pas appelé defineScript()`);
  return captured;
}

/** Aplatit le graphe : 3DVista relie ses objets par des chaînes "this.<id>". */
function indexGraph(root) {
  const all = [];
  const byId = {};
  const seen = new Set();
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (typeof node.class === 'string') all.push(node);
    if (typeof node.id === 'string') byId[node.id] = node;
    Object.values(node).forEach(walk);
  })(root);
  return { all, byId };
}

/** "this.panorama_ABC" → "panorama_ABC" */
function deref(ref) {
  return typeof ref === 'string' ? ref.replace(/^this\./, '') : null;
}

function extract(tourDir) {
  const scriptFile = path.join(tourDir, 'script_general.js');
  if (!fs.existsSync(scriptFile)) {
    throw new Error(`script_general.js introuvable dans ${tourDir}`);
  }
  const { all, byId } = indexGraph(loadTourScript(scriptFile));

  const panoramas = all.filter((o) => o.class === 'Panorama' && o.id);
  if (!panoramas.length) throw new Error('aucun panorama trouvé');

  // Les caméras portent la vue d'arrivée. Elles suivent la convention
  // "<idPanorama>_camera", mais on ne s'y fie pas : on relie via la playlist,
  // qui associe explicitement un média et une caméra.
  const cameraOf = {};
  all.filter((o) => o.class === 'PanoramaPlayListItem').forEach((item) => {
    const media = deref(item.media);
    const cam = byId[deref(item.camera)];
    if (media && cam) cameraOf[media] = cam;
  });

  const scenes = {};
  const warnings = [];
  let lienspyramide = 0;

  panoramas.forEach((p) => {
    const levels = (p.frames && p.frames[0] && p.frames[0].cube && p.frames[0].cube.levels) || [];
    const tiled = levels.filter((l) => l.class === 'TiledImageResourceLevel' && l.url);
    if (!tiled.length) {
      warnings.push(`${p.id} : aucun niveau tuilé, panorama ignoré`);
      return;
    }

    // Un « niveau » décrit le cube déplié en bande de 6 faces : la largeur vaut
    // six fois la hauteur, et la hauteur EST le côté d'une face.
    const faceSize = tiled[0].height;
    if (tiled[0].width !== faceSize * 6) {
      warnings.push(`${p.id} : bande inattendue ${tiled[0].width}x${tiled[0].height}, ignoré`);
      return;
    }

    // Les niveaux doivent former une pyramide par doublement descendant, et le
    // plus grossier tenir en UNE tuile — c'est l'hypothèse de Pannellum.
    const attendu = tiled.map((_, i) => faceSize / Math.pow(2, i));
    const reel = tiled.map((l) => l.height);
    if (attendu.join() !== reel.join() || reel[reel.length - 1] !== TILE_RESOLUTION) {
      warnings.push(`${p.id} : niveaux ${reel.join('/')} inexploitables, ignoré`);
      return;
    }

    const dossierSource = tiled[0].url.split('/{face}/')[0]; // media/panorama_X_0
    const nom = path.basename(dossierSource);
    const construits = construirePyramide(tourDir, dossierSource, nom, tiled);
    if (construits === null) {
      warnings.push(`${p.id} : tuiles manquantes, ignoré`);
      return;
    }
    lienspyramide += construits;

    const cam = cameraOf[p.id];
    const start = (cam && cam.initialPosition) || {};

    scenes[p.id] = {
      title: (p.data && p.data.label) || p.label || '',
      yaw: typeof start.yaw === 'number' ? start.yaw : 0,
      pitch: typeof start.pitch === 'number' ? start.pitch : 0,
      thumbnail: (p.frames[0] && p.frames[0].thumbnailUrl) || p.thumbnailUrl || '',
      faceSize: faceSize,          // = cubeResolution de Pannellum
      maxLevel: tiled.length,
      path: `${PYRAMIDE}/${nom}/%s/%l/%y_%x`,
      hotSpots: [],
    };
  });

  // --- Passages d'une pièce à l'autre ---------------------------------------
  // AdjacentPanorama donne la destination ; l'overlay associé donne l'endroit
  // exact où 3DVista dessine la flèche (avec le pitch, que l'adjacence n'a pas).
  panoramas.forEach((p) => {
    const scene = scenes[p.id];
    if (!scene) return;
    // Un même passage peut être déclaré deux fois (3DVista garde d'anciennes
    // adjacences après un ré-agencement) : deux flèches superposées au pixel
    // près, dont l'une capte les clics de l'autre. On garde la première.
    const placed = new Set();
    (p.adjacentPanoramas || []).forEach((adj) => {
      const targetId = deref(adj.panorama);
      if (!targetId || !scenes[targetId]) {
        warnings.push(`${p.id} : voisin ${targetId} absent des scènes`);
        return;
      }
      const overlay = byId[adj.data && adj.data.overlayID];
      const marker = overlay && overlay.items && overlay.items[0];
      const yaw = marker && typeof marker.yaw === 'number' ? marker.yaw : adj.yaw;
      const pitch = marker && typeof marker.pitch === 'number' ? marker.pitch : 0;

      const spot = `${targetId}@${yaw.toFixed(1)}/${pitch.toFixed(1)}`;
      if (placed.has(spot)) return;
      placed.add(spot);

      scene.hotSpots.push({
        type: 'scene',
        sceneId: targetId,
        yaw: yaw,
        pitch: pitch,
        // On préfère le NOM DE LA PIÈCE d'arrivée aux libellés internes de
        // 3DVista (« to-salon », « Entrance ») : c'est ce que lit le visiteur
        // au survol de la flèche.
        text: scenes[targetId].title
          || (marker && marker.data && marker.data.label)
          || (overlay && overlay.data && overlay.data.label)
          || 'Suivant',
        // Vue d'arrivée : on regarde dans la continuité du déplacement plutôt
        // que de repartir sur l'orientation par défaut de la pièce suivante.
        // `backwardYaw` est la direction qui, depuis la pièce d'arrivée, ramène
        // vers celle qu'on quitte : un demi-tour et on regarde devant soi.
        targetYaw: typeof adj.backwardYaw === 'number'
          ? ((adj.backwardYaw + 180) % 360 + 360) % 360 - 180
          : undefined,
      });
    });
  });

  // Première scène : le premier élément de la playlist principale.
  const firstItem = all.find((o) => o.class === 'PanoramaPlayListItem');
  const firstScene = (firstItem && deref(firstItem.media)) || Object.keys(scenes)[0];

  const paires = apparierVariantes(scenes, warnings);
  const plan = extraireMap(tourDir, all, byId, scenes, warnings);
  if (plan && plan.points.length < Object.keys(scenes).length) {
    warnings.push(`plan de sol : ${plan.points.length} pastilles pour ` +
                  `${Object.keys(scenes).length} scènes`);
  }

  return {
    source: path.basename(tourDir),
    tileResolution: TILE_RESOLUTION,
    firstScene: scenes[firstScene] ? firstScene : Object.keys(scenes)[0],
    scenes: scenes,
    map: plan,
    paires: paires,
    warnings: warnings,
    tuiles: lienspyramide,
  };
}

/** Mots qui, dans un titre, désignent une mise en scène plutôt qu'une pièce. */
const MOTS_AMENAGEMENT = [
  'virtuel', 'virtuelle', 'virtuels', 'virtuelles',
  'staged', 'staging', 'meuble', 'meublee', 'meublé', 'meublée', 'amenage', 'aménagé',
];

/** Mots qui désignent au contraire la prise de vue nue. */
const MOTS_NU = ['reel', 'reelle', 'réel', 'réelle', 'vide', 'brut', 'nu'];

/** Titre réduit à la pièce elle-même : « Salon virtuel » et « Salon » se rejoignent. */
function pieceNue(titre) {
  const mots = String(titre).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(Boolean);
  return mots
    .filter((m) => !MOTS_AMENAGEMENT.includes(m) && !MOTS_NU.includes(m))
    .join(' ');
}

/**
 * Apparie les deux prises de vue d'une même pièce : nue et aménagée.
 *
 * Les tours immobiliers photographient souvent chaque pièce deux fois — vide,
 * puis meublée en home staging — et 3DVista n'en fait que deux scènes sans
 * lien. Le visiteur se retrouve avec « Salon » et « Salon virtuel » côte à côte
 * dans le bandeau, sans comprendre que c'est la même pièce.
 *
 * On les relie ici sur leur titre, une fois retirés les mots d'aménagement. La
 * visionneuse n'affiche alors que la pièce mère, avec une bascule qui conserve
 * l'angle de vue — l'avant/après qui fait vendre.
 *
 * Appariement seulement si le groupe compte EXACTEMENT deux scènes : à trois,
 * on ne saurait pas laquelle va avec laquelle, et mieux vaut ne rien faire que
 * de masquer une pièce à tort.
 */
function apparierVariantes(scenes, warnings) {
  const groupes = {};
  Object.entries(scenes).forEach(([id, s]) => {
    if (!s.title) return;
    const cle = pieceNue(s.title);
    if (!cle) return;
    (groupes[cle] = groupes[cle] || []).push(id);
  });

  let paires = 0;
  Object.entries(groupes).forEach(([cle, ids]) => {
    if (ids.length !== 2) {
      if (ids.length > 2) warnings.push(`« ${cle} » : ${ids.length} prises de vue, appariement ignoré`);
      return;
    }

    const estAmenagee = (id) => String(scenes[id].title).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/).some((m) => MOTS_AMENAGEMENT.includes(m));

    const [a, b] = ids;
    // La pièce mère est celle qui n'est PAS la mise en scène. Si aucune ne
    // porte de marque, on garde l'ordre d'origine.
    const mere = estAmenagee(a) && !estAmenagee(b) ? b : a;
    const fille = mere === a ? b : a;
    if (!estAmenagee(fille) && estAmenagee(mere)) return; // incohérent, on s'abstient

    scenes[mere].variante = fille;
    scenes[mere].varianteLabel = 'Voir meublé';
    scenes[mere].etat = 'vide';
    scenes[fille].variante = mere;
    scenes[fille].varianteLabel = 'Voir vide';
    scenes[fille].etat = 'meuble';
    scenes[fille].secondaire = true;
    // L'ameublement est presque toujours une image de synthèse : la visionneuse
    // l'affiche tant que cette vue est à l'écran, pour qu'un acheteur ne la
    // prenne pas pour l'état réel du bien.
    scenes[fille].mention = 'Aménagement virtuel — à titre d\'illustration';
    paires++;
  });

  return paires;
}

/**
 * Extrait le plan de sol : image, dimensions, et position de chaque pièce.
 *
 * 3DVista range ces informations à trois endroits distincts :
 *   - un objet `Map` donne les dimensions logiques du plan ;
 *   - chaque `AreaHotspotMapOverlay` porte un `image.x` / `image.y`, exprimés
 *     dans ces dimensions ;
 *   - la pièce visée n'est pas référencée proprement, elle est enfouie dans la
 *     chaîne d'action `click` de la zone cliquable, sous la forme
 *     `this.setPanoramaCameraWithSpot(…, this.PanoramaPlayListItem_XXX, …)`.
 *     D'où la lecture à l'expression régulière — c'est le seul lien disponible.
 *
 * L'URL de l'image est absente du script (les niveaux ont une `url` vide) : on
 * la retrouve sur le disque, où 3DVista la nomme `<idMap>_<langue>_0.webp`.
 *
 * @returns {object|null} null si le tour n'a pas de plan.
 */
function extraireMap(tourDir, all, byId, scenes, warnings) {
  const map = all.find((o) => o.class === 'Map');
  if (!map || !map.id) return null; // export sans plan : normal, on se tait

  // Le niveau 0 est le plus fin, et sa taille correspond au plan lui-même.
  let image = null;
  for (const langue of ['fr', 'en', 'ar', 'es', null]) {
    const nom = langue ? `${map.id}_${langue}_0.webp` : `${map.id}_0.webp`;
    if (fs.existsSync(path.join(tourDir, 'media', nom))) { image = 'media/' + nom; break; }
  }
  if (!image) {
    warnings.push(`plan de sol : objet Map ${map.id} présent, mais aucune ` +
                  `image media/${map.id}_*_0.webp — plan ignoré`);
    return null;
  }

  const points = [];
  (map.overlays || []).forEach((ref) => {
    const ov = byId[deref(ref)];
    if (!ov || !ov.image) return;

    const zone = byId[deref((ov.areas || [])[0])];
    const clic = zone && typeof zone.click === 'string' ? zone.click : '';
    /* 3DVista écrit ce clic de DEUX façons, selon l'export :

         this.PanoramaPlayListItem_ADD7…            → référence directe
         this.setPlayListSelectedIndex(this.mainPlayList, 3)  → un index

       Seule la première était reconnue. L'export jawhara/Tour-FloorPlan
       n'emploie que la seconde : aucune pastille n'en sortait, le plan
       était donc rejeté — dans la visite dont le nom annonce un plan. */
    let sceneId = null;

    const direct = clic.match(/this\.(PanoramaPlayListItem_[A-Za-z0-9_]+)/);
    if (direct) {
      const item = byId[direct[1]];
      sceneId = item ? deref(item.media) : null;
    } else {
      const parIndex = clic.match(/setPlayListSelectedIndex\(\s*this\.([A-Za-z0-9_]+)\s*,\s*(\d+)\s*\)/);
      if (parIndex) {
        const liste = all.find((o) => o.id === parIndex[1]);
        const item = liste && (liste.items || [])[Number(parIndex[2])];
        sceneId = item ? deref(item.media) : null;
      }
    }
    if (!sceneId || !scenes[sceneId]) return;

    // x/y désignent le CENTRE de la pastille : 3DVista y adjoint un offset
    // valant la moitié de sa taille, qui n'est là que pour la dessiner.
    points.push({
      x: ov.image.x,
      y: ov.image.y,
      sceneId: sceneId,
      title: scenes[sceneId].title || '',
    });
  });

  if (!points.length) {
    // Le cas qui a coûté le plan de Tour-FloorPlan sans que rien ne le dise.
    warnings.push(`plan de sol : image trouvée mais aucune pastille exploitable ` +
                  `(${(map.overlays || []).length} zone(s) examinée(s)) — plan ignoré`);
    return null;
  }
  return { image: image, width: map.width, height: map.height, points: points };
}

/**
 * Rejoue la formule de Pannellum sur l'arborescence produite.
 *
 * Pannellum calcule la résolution d'un niveau par
 *   d = cubeResolution × 2^(niveau − maxLevel)
 * puis découpe en ceil(d / tileResolution) tuiles par côté (voir pannellum.js).
 * On vérifie que chaque tuile qu'il demandera existe, et surtout que le niveau
 * 1 n'en compte qu'UNE — l'hypothèse que violait la première version, d'où les
 * panoramas déformés.
 *
 * @returns {string[]} anomalies constatées.
 */
function verifier(tourDir, resultat) {
  const soucis = [];
  Object.entries(resultat.scenes).forEach(([id, s]) => {
    for (let L = 1; L <= s.maxLevel; L++) {
      const d = s.faceSize * Math.pow(2, L - s.maxLevel);
      const n = Math.ceil(d / resultat.tileResolution);
      if (L === 1 && n !== 1) {
        soucis.push(`${s.title || id} : niveau 1 en ${n}×${n} tuiles (Pannellum en exige 1)`);
      }
      for (const face of 'fbudlr') {
        for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
            const f = path.join(
              tourDir,
              s.path.replace('%s', face).replace('%l', String(L))
                .replace('%y', String(y)).replace('%x', String(x)) + '.webp'
            );
            if (!fs.existsSync(f)) soucis.push(`${s.title || id} : manque ${path.relative(tourDir, f)}`);
          }
        }
      }
    }
  });
  return soucis;
}

/* --- Ligne de commande ----------------------------------------------------- */
if (require.main === module) {
  const tourDir = process.argv[2];
  if (!tourDir) {
    console.error('usage : node tools/extract_3dvista_tour.js <dossier du tour>');
    process.exit(1);
  }
  const result = extract(tourDir);
  const out = path.join(tourDir, 'tour-pannellum.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');

  const n = Object.keys(result.scenes).length;
  const liens = Object.values(result.scenes).reduce((s, x) => s + x.hotSpots.length, 0);
  console.log(`${out}`);
  console.log(`  ${n} scènes, ${liens} passages, première scène : ${result.firstScene}`);
  console.log(`  ${result.tuiles} tuiles rattachées sous ${tourDir}/${PYRAMIDE}/`);
  console.log(result.map
    ? `  plan de sol : ${result.map.points.length} pastilles sur ${result.map.image}`
    : '  plan de sol : aucun dans cet export');
  console.log(result.paires
    ? `  bascule vide/meublé : ${result.paires} pièce(s) appariée(s)`
    : '  bascule vide/meublé : aucune paire détectée');
  result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));

  const soucis = verifier(tourDir, result);
  if (soucis.length) {
    console.log(`  ✗ ${soucis.length} anomalie(s) :`);
    soucis.slice(0, 10).forEach((s) => console.log(`      ${s}`));
    process.exit(1);
  }
  console.log('  ✓ pyramide conforme à ce que Pannellum demandera');
}

module.exports = { extract };
