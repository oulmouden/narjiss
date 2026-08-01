/* ============================================================
   VISITE GUIDÉE EN DIRECT — Configuration publique (côté client)
   ------------------------------------------------------------
   Ces valeurs sont PUBLIQUES et peuvent rester dans le dépôt :
   la clé "key" et le "cluster" Pusher ne sont pas secrets (le
   navigateur les expose de toute façon). Le SECRET Pusher, lui,
   reste uniquement côté serveur dans api/liveguide-config.php
   (jamais committé), PROPRE À CHAQUE ENVIRONNEMENT.

   SÉLECTION PAR ENVIRONNEMENT : chaque environnement (production,
   staging, développement) a sa PROPRE app Pusher. On choisit la
   clé publique selon le domaine ci-dessous ; le secret associé vit
   dans le api/liveguide-config.php du serveur correspondant.

   Où trouver ces valeurs :
   Dashboard Pusher → l'app Channels de l'environnement → "App Keys".
   ============================================================ */

(function () {
  // --- Clés PUBLIQUES par environnement (app_id + secret = côté serveur) ---
  var ENVS = {
    production:    { key: 'eec6f37dc1a2f36cb863', cluster: 'eu' }, // app 2180430
    staging:       { key: '6e3e4745fe8ec26c36bf', cluster: 'eu' }, // app 2180429
    developpement: { key: '4a38b9ede8310cb9e162', cluster: 'eu' }  // app 2180428 (narjiss-developpement)
  };

  // Domaine du staging (à adapter le jour où le staging aura son URL).
  var STAGING_HOST = 'staging.narjiss.company';

  var host = (location.hostname || '').toLowerCase();
  var env;
  if (host === 'www.narjiss.company' || host === 'narjiss.company') {
    env = ENVS.production;
  } else if (host === STAGING_HOST || host.indexOf('staging') !== -1) {
    env = ENVS.staging;
  } else {
    env = ENVS.developpement; // localhost, 127.0.0.1, IP LAN, file://…
  }

  window.LIVEGUIDE_CONFIG = {
    // Mettre à false pour désactiver la visite guidée sur cet environnement.
    enabled: true,

    // Clé + cluster Pusher choisis selon le domaine (voir ci-dessus).
    pusherKey: env.key,
    pusherCluster: env.cluster,

    // --- Voix intégrée (WebRTC one-way, hôte → visiteurs) ---
    // STUN public (gratuit) : suffit dans la majorité des cas.
    stun: 'stun:stun.l.google.com:19302',

    // TURN (optionnel) : relais utile derrière un réseau restrictif
    // (~20-30% des cas en 4G d'entreprise). Payant en général.
    // Exemple : { urls: 'turn:mon-turn:3478', username: 'user', credential: 'pass' }
    turn: null
  };
})();
