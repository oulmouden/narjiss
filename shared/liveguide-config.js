/* ============================================================
   VISITE GUIDÉE EN DIRECT — Configuration publique (côté client)
   ------------------------------------------------------------
   Ces valeurs sont PUBLIQUES et peuvent rester dans le dépôt :
   la clé "key" et le "cluster" Pusher ne sont pas secrets.
   Le SECRET Pusher, lui, reste uniquement dans
   api/liveguide-config.php (jamais committé).

   Où trouver ces valeurs :
   Dashboard Pusher → ton app Channels → onglet "App Keys".
   ============================================================ */

window.LIVEGUIDE_CONFIG = {
  // Mettre à true une fois Pusher configuré pour activer la fonctionnalité.
  enabled: true,

  // Pusher → App Keys → "key"
  pusherKey: '4a38b9ede8310cb9e162',

  // Pusher → App Keys → "cluster" (ex: 'eu', 'mt1', 'ap2'…)
  pusherCluster: 'eu',

  // --- Voix intégrée (WebRTC one-way, hôte → visiteurs) ---
  // STUN public (gratuit) : suffit quand hôte et visiteurs peuvent se joindre
  // directement. Laisser tel quel dans la majorité des cas.
  stun: 'stun:stun.l.google.com:19302',

  // TURN (optionnel) : relais utile quand un visiteur est derrière un réseau
  // restrictif (~20-30% des cas en cross-réseau/4G d'entreprise). Payant en
  // général (ex: Twilio, Metered, coturn auto-hébergé). Laisser null si non utilisé.
  // Exemple : { urls: 'turn:mon-turn:3478', username: 'user', credential: 'pass' }
  turn: null
};
