/* ============================================================================
   sw.js — service worker de Narjiss Immobilière.
   ----------------------------------------------------------------------------
   Il n'a qu'un rôle : réveiller un commercial quand un visiteur le demande,
   même application fermée. Aucune mise en cache, aucune interception de
   requête — le site est servi normalement, ce fichier ne s'en mêle pas.

   Il vit à la RACINE et non dans un sous-dossier : un service worker ne peut
   couvrir que son propre répertoire et ce qu'il contient. Depuis /shared/ il ne
   verrait jamais /espace-agent.html.

   LE SIGNAL N'A PAS DE CONTENU
   Le serveur envoie un push vide (voir api/push-lib.php). C'est ici qu'on va
   chercher QUI demande, en interrogeant le site avec la session du commercial.
   Le nom du visiteur ne transite donc jamais par les serveurs de Google ou
   d'Apple.
   ========================================================================== */

/* Prendre la main tout de suite plutôt qu'au prochain démarrage : sans ça, un
   commercial qui vient d'activer ses alertes ne serait réveillé qu'après avoir
   fermé puis rouvert toutes ses pages du site. */
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

var TEXTES = {
  fr: { titre: 'Un visiteur vous demande', un: '{name} souhaite être reçu.',
        plusieurs: '{n} visiteurs vous demandent.', defaut: 'Ouvrez votre espace pour répondre.' },
  en: { titre: 'A visitor is asking for you', un: '{name} would like to be received.',
        plusieurs: '{n} visitors are asking for you.', defaut: 'Open your workspace to answer.' },
  ar: { titre: 'زائر يطلبك', un: '{name} يرغب في مقابلتك.',
        plusieurs: '{n} زوار يطلبونك.', defaut: 'افتح مساحتك للرد.' },
  es: { titre: 'Un visitante le busca', un: '{name} desea ser atendido.',
        plusieurs: '{n} visitantes le buscan.', defaut: 'Abra su espacio para responder.' }
};

/* La langue du commercial est celle de son espace. Le service worker n'a pas
   accès à localStorage : on la lit sur une page ouverte s'il y en a une, sinon
   on retombe sur le français. */
function langue() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        var m = /[?&#]lang=([a-z]{2})/.exec(clients[i].url) || /#(fr|en|ar|es)\b/.exec(clients[i].url);
        if (m && TEXTES[m[1]]) return m[1];
      }
      return 'fr';
    })
    .catch(function () { return 'fr'; });
}

self.addEventListener('push', function (event) {
  event.waitUntil(
    Promise.all([langue(), demandesEnAttente()]).then(function (r) {
      var t = TEXTES[r[0]] || TEXTES.fr;
      var liste = r[1];
      var corps;
      if (!liste) {
        /* Session expirée, réseau coupé, serveur muet : on notifie quand même.
           Une notification un peu vague vaut infiniment mieux qu'un silence —
           le push a été payé, le visiteur attend, et le commercial peut aller
           voir. Se taire ici perdrait l'appel. */
        corps = t.defaut;
      } else if (liste.length === 0) {
        corps = t.defaut;
      } else if (liste.length === 1) {
        corps = t.un.replace('{name}', liste[0].visitor || '');
      } else {
        corps = t.plusieurs.replace('{n}', String(liste.length));
      }

      return self.registration.showNotification(t.titre, {
        body: corps,
        icon: 'images/icones/apple-touch-icon.png',
        badge: 'images/icones/apple-touch-icon.png',
        // Une seule bulle à l'écran, remplacée à chaque nouveau signal : deux
        // demandes coup sur coup ne doivent pas empiler deux notifications
        // qu'il faudrait balayer une par une.
        tag: 'nj-demande',
        renotify: true,
        requireInteraction: true,     // reste affichée : c'est un appel, pas une info
        data: { url: 'espace-agent.html' }
      });
    })
  );
});

function demandesEnAttente() {
  // credentials same-origin par défaut dans un service worker : la session du
  // commercial part avec la requête, c'est ce qui nous donne le droit de lire.
  return fetch('api/agent-access.php?action=pending')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { return (d && d.ok) ? (d.requests || []) : null; })
    .catch(function () { return null; });
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var cible = (event.notification.data && event.notification.data.url) || 'espace-agent.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      // Une page de l'espace est déjà ouverte : on la ramène au premier plan
      // plutôt que d'en ouvrir une seconde, qui déconnecterait la première de
      // son appel en cours.
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('espace-agent') > -1 && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(cible) : null;
    })
  );
});

/* Le service de notification peut renouveler un abonnement de lui-même. Sans
   ce réabonnement, le commercial cesserait d'être réveillé sans que personne
   ne s'en aperçoive. */
self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
    self.registration.pushManager.getSubscription()
      .then(function (ancien) {
        return fetch('api/agent-push.php?cle').then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.actif || !d.cle) return null;
            return self.registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64UrlVersOctets(d.cle)
            });
          });
      })
      .then(function (nouveau) {
        if (!nouveau) return;
        var j = nouveau.toJSON();
        var corps = new URLSearchParams({
          action: 'abonner',
          endpoint: nouveau.endpoint,
          p256dh: (j.keys && j.keys.p256dh) || '',
          auth: (j.keys && j.keys.auth) || ''
        });
        return fetch('api/agent-push.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: corps.toString()
        });
      })
      .catch(function () {})
  );
});

function base64UrlVersOctets(b64) {
  var s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  var brut = self.atob(s);
  var out = new Uint8Array(brut.length);
  for (var i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i);
  return out;
}
