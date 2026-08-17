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
 * pipeline s'en aperçoive.
 */

'use strict';

const dns = require('dns').promises;
const https = require('https');

const DOMAINE = 'www.narjiss.company';
const APEX = 'narjiss.company';
const IP_ATTENDUE = '147.79.101.154';

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
  const ns = await dns.resolveNs(APEX);
  const adresses = await dns.resolve4(ns[0]);
  const r = new dns.Resolver();
  r.setServers(adresses);
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
function noter(ok, quoi, detail) {
  constats.push({ ok, quoi, detail });
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
      noter(false, `${nom} → A`, 'aucun enregistrement : ' + e.code);
    }

    // Une AAAA est une anomalie ici : le VPS n'a pas d'IPv6, donc elle mènerait
    // forcément ailleurs — et seuls les visiteurs en IPv6 s'en apercevraient.
    try {
      const aaaa = await resoudreAutorite(nom, 'AAAA');
      noter(false, `${nom} → AAAA`, 'présente, à supprimer : ' + aaaa.join(', '));
    } catch (e) {
      noter(true, `${nom} → AAAA`, 'absente, comme attendu');
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
    const versionne = /menu\.js\?v=\d+/.test(p.corps);
    noter(p.code === 200 && versionne, 'page d\'accueil',
          'HTTP ' + p.code + (versionne ? ', menu.js versionné' : ', menu.js SANS ?v= — page ancienne'));
  } catch (e) {
    noter(false, 'page d\'accueil', e.message);
  }
}

verifier().then(() => {
  const ratés = constats.filter((c) => !c.ok);
  constats.forEach((c) => {
    console.log(`  ${c.ok ? 'ok  ' : 'ÉCHEC'} ${c.quoi.padEnd(30)} ${c.detail}`);
  });
  console.log('');
  if (ratés.length) {
    console.log(`${ratés.length} anomalie(s). Le domaine ne sert peut-être plus le VPS.`);
    console.log('À regarder : les enregistrements DNS du domaine, et si le CDN Hostinger');
    console.log('a été réactivé — c\'est lui qui avait réécrit la zone le 17/08/2026.');
    process.exit(1);
  }
  console.log('Tout est conforme : le domaine sert bien notre serveur.');
}).catch((e) => {
  console.error('Vérification impossible :', e.message);
  process.exit(1);
});
