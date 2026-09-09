/**
 * tools/verifier-prod.js — le domaine sert-il toujours NOTRE serveur ?
 *
 *   node tools/verifier-prod.js
 *
 * Écrit pour un incident réel : le 17/08/2026, l'activation du CDN Hostinger a
 * effacé les enregistrements A du domaine et détourné narjiss.company vers un
 * ancien hébergement mutualisé. Le site a servi une copie de trois mois d'âge à
 * tous les visiteurs, et personne ne l'a vu pendant des heures.
 *
 * CE QU'IL VÉRIFIE, ET POURQUOI PAS AUTRE CHOSE
 * Il contrôle l'IDENTITÉ du serveur, pas la version du site. Vérifier un numéro
 * de version obligerait à mettre ce fichier à jour à chaque déploiement, et un
 * contrôle qui crie au loup finit ignoré. Les indices retenus existent chez nous
 * et manquaient sur la copie détournée :
 *
 *   - le domaine résout vers l'IP attendue ;
 *   - aucune adresse IPv6 ne traîne (le VPS n'en a pas : une AAAA mènerait
 *     ailleurs, et seuls les visiteurs en IPv6 le verraient) ;
 *   - le certificat HTTPS est valide ;
 *   - tour-360.html répond — absente de l'ancienne copie ;
 *   - api/liveguide-session.php refuse un GET par un 405, ce qui prouve que
 *     notre PHP tourne, et pas seulement qu'un fichier existe.
 *
 * Sort en code 1 si quelque chose cloche, pour qu'une tâche planifiée ou un
 * pipeline s'en aperçoive. Un contrôle qu'on n'a PAS PU faire (DNS injoignable)
 * sort aussi en code 1, mais se distingue à l'affichage par un « ? » : le site
 * n'est pas en cause, c'est la machine qui vérifie.
 */

'use strict';

const dns = require('dns').promises;
const https = require('https');

const DOMAINE = 'www.narjiss.company';
const APEX = 'narjiss.company';
const IP_ATTENDUE = '147.79.101.154';

// Utilisés UNIQUEMENT pour retrouver les serveurs d'autorité quand le résolveur
// système est inutilisable. Voir trouverAutorite().
const RESOLVEURS_SECOURS = ['8.8.8.8', '1.1.1.1'];

/**
 * Codes d'erreur DNS qui signifient « le serveur a répondu : ce nom n'a pas cet
 * enregistrement ». Tous les autres (ECONNREFUSED, ETIMEOUT, ESERVFAIL…)
 * signifient « on n'a pas obtenu de réponse » — ce n'est PAS la même chose, et
 * les confondre a produit les deux bugs corrigés le 28/08/2026 : une fausse
 * alerte sur les A, et surtout un faux « tout va bien » sur les AAAA, où une
 * panne de résolveur se lisait « absente, comme attendu ».
 */
const ABSENCES = new Set(['ENODATA', 'ENOTFOUND', 'NOTFOUND']);
function estAbsence(e) {
  return !e.indisponible && ABSENCES.has(e.code);
}

/**
 * Adresses des serveurs faisant autorité sur le domaine, cherchées une seule
 * fois pour toute l'exécution.
 *
 * On essaie d'abord le résolveur système, puis des résolveurs publics. Ce
 * secours est nécessaire parce que le résolveur système n'est pas toujours
 * exploitable par Node : sur le poste de l'auteur il annonce 127.0.0.1, où rien
 * n'écoute, et chaque requête part en ECONNREFUSED alors que Windows, lui,
 * résout très bien.
 *
 * Cela n'introduit pas de lecture de cache là où ça compte : les résolveurs
 * publics ne servent qu'à apprendre QUI fait autorité ; les A et AAAA jugées
 * ensuite viennent toujours des serveurs d'autorité eux-mêmes.
 */
let promesseAutorite = null;
function serveursAutorite() {
  if (!promesseAutorite) promesseAutorite = trouverAutorite();
  return promesseAutorite;
}

async function trouverAutorite() {
  const echecs = [];
  for (const serveurs of [null, ...RESOLVEURS_SECOURS.map((s) => [s])]) {
    const via = serveurs ? serveurs[0] : 'résolveur système';
    const r = new dns.Resolver();
    if (serveurs) r.setServers(serveurs);
    try {
      const ns = await r.resolveNs(APEX);
      const adresses = [];
      for (const nom of ns) {
        try {
          adresses.push(...await r.resolve4(nom));
        } catch (e) {
          // Un NS injoignable n'est pas bloquant tant qu'il en reste un autre.
        }
      }
      if (adresses.length) return adresses;
      echecs.push(`${via} : NS listés mais aucun résolu`);
    } catch (e) {
      echecs.push(`${via} : ${e.code || e.message}`);
    }
  }
  const err = new Error('serveurs d\'autorité introuvables — ' + echecs.join(' ; '));
  err.indisponible = true;
  throw err;
}

/**
 * Résout un nom en interrogeant les serveurs FAISANT AUTORITÉ du domaine.
 *
 * Passer par un résolveur ordinaire ferait lire un cache : le 18/08/2026, une
 * AAAA supprimée à la source était encore servie par la box du réseau local ET
 * par 8.8.8.8, et `ipconfig /flushdns` n'y change rien (il ne vide que le cache
 * de Windows). Le contrôle annonçait donc une panne déjà réparée — et il
 * pourrait tout aussi bien taire une panne réelle masquée par un cache.
 *
 * La question posée ici est « la zone est-elle bien configurée ? », et seuls les
 * serveurs d'autorité y répondent sans délai. Les caches suivent ensuite tout
 * seuls (TTL de 600 s sur ce domaine).
 */
async function resoudreAutorite(nom, type) {
  const r = new dns.Resolver();
  r.setServers(await serveursAutorite());
  return type === 'A' ? r.resolve4(nom) : r.resolve6(nom);
}

/** Requête HTTPS simple ; rejette si le certificat est invalide. */
function demander(url, methode = 'GET') {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: methode, timeout: 20000 }, (res) => {
      let corps = '';
      res.on('data', (c) => { if (corps.length < 200000) corps += c; });
      res.on('end', () => resolve({ code: res.statusCode, corps }));
    });
    req.on('timeout', () => { req.destroy(new Error('délai dépassé')); });
    req.on('error', reject);
    req.end();
  });
}

const constats = [];
// `indispo` distingue « le contrôle a échoué » de « le contrôle n'a pas pu être
// fait ». Les deux sortent en code 1 — un contrôle qu'on ne peut pas faire n'est
// pas un contrôle réussi — mais ils n'appellent pas la même réaction.
function noter(ok, quoi, detail, indispo = false) {
  constats.push({ ok, quoi, detail, indispo });
}

async function verifier() {
  // --- 1. Le domaine mène-t-il chez nous ? ---
  for (const nom of [DOMAINE, APEX]) {
    try {
      // Exiger l'IP attendue ET RIEN D'AUTRE. Une seconde A ne casse rien de
      // visible : le résolveur alterne, donc une partie seulement des visiteurs
      // atterrit sur l'autre serveur. C'est précisément ce qui restait le
      // 18/08/2026, l'apex pointant encore vers l'ancien mutualisé.
      const a = await resoudreAutorite(nom, 'A');
      const intrus = a.filter((ip) => ip !== IP_ATTENDUE);
      noter(a.includes(IP_ATTENDUE) && !intrus.length, `${nom} → A`,
            a.join(', ') + (intrus.length ? ` — ${intrus.join(', ')} en trop` : ''));
    } catch (e) {
      if (estAbsence(e)) noter(false, `${nom} → A`, 'aucun enregistrement');
      else noter(false, `${nom} → A`, 'contrôle impossible : ' + (e.code || e.message), true);
    }

    // Une AAAA est une anomalie ici : le VPS n'a pas d'IPv6, donc elle mènerait
    // forcément ailleurs — et seuls les visiteurs en IPv6 s'en apercevraient.
    try {
      const aaaa = await resoudreAutorite(nom, 'AAAA');
      noter(false, `${nom} → AAAA`, 'présente, à supprimer : ' + aaaa.join(', '));
    } catch (e) {
      // Ne conclure « absente » que si un serveur l'a effectivement dit. Sans
      // cette distinction, toute panne de résolveur se lisait « tout va bien ».
      if (estAbsence(e)) noter(true, `${nom} → AAAA`, 'absente, comme attendu');
      else noter(false, `${nom} → AAAA`, 'contrôle impossible : ' + (e.code || e.message), true);
    }
  }

  // --- 2. Est-ce bien notre site qui répond ? ---
  try {
    const p = await demander(`https://${DOMAINE}/tour-360.html?tour=jawhara/Tour`);
    noter(p.code === 200, 'tour-360.html', 'HTTP ' + p.code);
  } catch (e) {
    noter(false, 'tour-360.html', e.message);
  }

  try {
    // 405 = « POST requis » : c'est NOTRE code qui répond, pas un fichier
    // quelconque ni la page d'erreur d'un hébergeur.
    const p = await demander(`https://${DOMAINE}/api/liveguide-session.php`);
    noter(p.code === 405, 'api/liveguide-session.php', 'HTTP ' + p.code + ' (405 attendu)');
  } catch (e) {
    noter(false, 'api/liveguide-session.php', e.message);
  }

  try {
    const p = await demander(`https://${DOMAINE}/index.html`);
    // L'estampille est un condensé hexadécimal (menu.js?v=dda04ff4) ; elle a
    // été numérique par le passé, d'où les deux formes acceptées ici.
    const versionne = /menu\.js\?v=[0-9a-f]+/.test(p.corps);
    noter(p.code === 200 && versionne, 'page d\'accueil',
          'HTTP ' + p.code + (versionne ? ', menu.js versionné' : ', menu.js SANS ?v= — page ancienne'));
  } catch (e) {
    noter(false, 'page d\'accueil', e.message);
  }
}

verifier().then(() => {
  const ratés = constats.filter((c) => !c.ok);
  const anomalies = ratés.filter((c) => !c.indispo);
  const indispos = ratés.filter((c) => c.indispo);

  constats.forEach((c) => {
    const etiquette = (c.ok ? 'ok' : c.indispo ? '?' : 'ÉCHEC').padEnd(5);
    console.log(`  ${etiquette} ${c.quoi.padEnd(30)} ${c.detail}`);
  });
  console.log('');

  if (anomalies.length) {
    console.log(`${anomalies.length} anomalie(s). Le domaine ne sert peut-être plus le VPS.`);
    console.log('À regarder : les enregistrements DNS du domaine, et si le CDN Hostinger');
    console.log('a été réactivé — c\'est lui qui avait réécrit la zone le 17/08/2026.');
  }
  if (indispos.length) {
    if (anomalies.length) console.log('');
    console.log(`${indispos.length} contrôle(s) n'ont pas pu être faits : aucun serveur DNS n'a`);
    console.log('répondu. Cela ne dit RIEN sur l\'état du site — c\'est le poste qui vérifie');
    console.log('qui est en cause, pas le domaine. Vérifier la connexion réseau et les');
    console.log('serveurs DNS de la machine, puis relancer.');
  }
  if (ratés.length) process.exit(1);

  console.log('Tout est conforme : le domaine sert bien notre serveur.');
}).catch((e) => {
  console.error('Vérification impossible :', e.message);
  process.exit(1);
});
