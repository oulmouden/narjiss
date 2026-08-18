/**
 * tools/inventaire-pilules.js — quelles « pilules » sont des boutons, et
 * lesquelles ne sont que des libellés ?
 *
 *   node tools/inventaire-pilules.js
 *
 * POURQUOI
 * Un `border-radius: 999px` annonce au visiteur qu'il peut cliquer. Appliqué à
 * un simple libellé, il promet une action qui n'existe pas — constaté sur la
 * visite 360°, où le nom de la pièce avait exactement le style du bouton du
 * plan et ne s'en distinguait que par le curseur, lequel n'existe pas sur écran
 * tactile.
 *
 * Le motif est répandu (près de 250 occurrences) et rien ne distingue
 * mécaniquement un bouton d'une étiquette. Ce script ne corrige rien : il
 * CLASSE, pour qu'on décide sur pièces.
 *
 * COMMENT
 * Trois indices, par ordre de force :
 *   1. la balise réellement portée dans le HTML (<button>, <a>, <input>…) ;
 *   2. `cursor: pointer` ou une règle `:hover` / `:active` sur le sélecteur ;
 *   3. `pointer-events: none`, qui prouve au contraire l'inertie.
 *
 * Le verdict « à examiner » n'est pas un aveu d'échec : c'est exactement la
 * liste courte qu'un humain doit regarder, et elle est bien plus maniable que
 * les 250 occurrences de départ.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = process.cwd();
const IGNORE = /(\.claude|node_modules|assets[\\/]vendor|jawhara|visites|Tour)/;

/** Fichiers HTML et CSS du projet, hors dossiers tiers et exports. */
function fichiers(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (IGNORE.test(p)) continue;
    if (e.isDirectory()) fichiers(p, acc);
    else if (/\.(html|css)$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

const tous = fichiers(RACINE);
const html = tous.filter(f => f.endsWith('.html')).map(f => fs.readFileSync(f, 'utf8')).join('\n');

/** Blocs CSS d'un fichier : [{ selecteur, corps }]. */
function blocs(texte, estHtml) {
  let css = texte;
  if (estHtml) {
    css = '';
    const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = re.exec(texte))) css += m[1] + '\n';
  }
  css = css.replace(/\/\*[\s\S]*?\*\//g, ''); // commentaires
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) out.push({ selecteur: m[1].trim(), corps: m[2] });
  return out;
}

/** Classes et ids cités par un sélecteur. */
function noms(sel) {
  return (sel.match(/[.#][A-Za-z0-9_-]+/g) || []).map(s => s.slice(1));
}

const resultats = [];

for (const f of tous) {
  const texte = fs.readFileSync(f, 'utf8');
  const tousBlocs = blocs(texte, f.endsWith('.html'));

  // Sélecteurs portant une règle d'interaction ailleurs dans la même feuille.
  const interactifs = new Set();
  for (const b of tousBlocs) {
    if (!/:hover|:active|:focus/.test(b.selecteur)) continue;
    for (const n of noms(b.selecteur)) interactifs.add(n);
  }

  for (const b of tousBlocs) {
    if (!/border-radius:\s*9{3,}px/.test(b.corps)) continue;
    if (/:hover|:active|:focus|::/.test(b.selecteur)) continue; // variante, pas la règle de base

    const sel = b.selecteur;
    const inerte = /pointer-events:\s*none/.test(b.corps);
    const curseur = /cursor:\s*pointer/.test(b.corps);
    const baliseDirecte = /(^|[\s,>])(button|a|input|select|textarea|label|summary)([.#:\[\s,]|$)/i.test(sel);
    const hover = noms(sel).some(n => interactifs.has(n));

    // La balise réellement utilisée dans le HTML, pour les sélecteurs de classe.
    let porteBouton = false;
    for (const n of noms(sel)) {
      const re = new RegExp('<(button|a|input|select)\\b[^>]*(class|id)="[^"]*\\b' + n + '\\b', 'i');
      if (re.test(html)) { porteBouton = true; break; }
    }

    let verdict;
    if (inerte && !curseur) verdict = 'LIBELLÉ';
    else if (baliseDirecte || curseur || hover || porteBouton) verdict = 'bouton';
    else verdict = 'à examiner';

    resultats.push({ fichier: path.relative(RACINE, f), sel, verdict });
  }
}

const par = v => resultats.filter(r => r.verdict === v);
console.log('Pilules (border-radius: 999px) analysées : ' + resultats.length + '\n');

for (const v of ['LIBELLÉ', 'à examiner', 'bouton']) {
  const lot = par(v);
  console.log('=== ' + v + ' : ' + lot.length + ' ===');
  if (v === 'bouton') { console.log('  (rien à faire)\n'); continue; }
  let dernier = '';
  for (const r of lot) {
    if (r.fichier !== dernier) { console.log('  ' + r.fichier); dernier = r.fichier; }
    console.log('      ' + r.sel.replace(/\s+/g, ' ').slice(0, 90));
  }
  console.log('');
}
