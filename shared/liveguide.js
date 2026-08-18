/* ============================================================
   VISITE GUIDÉE EN DIRECT (Live Guide)
   ------------------------------------------------------------
   Un conseiller (hôte) guide des visiteurs sur TOUT le site :
   quand l'hôte change de page ou scrolle, la page des visiteurs
   suit en direct. Sens unique (les visiteurs suivent).

   Voix intégrée (optionnelle) : l'hôte peut diffuser son micro
   aux visiteurs en WebRTC (one-way). La signalisation passe par
   le même canal Pusher. Repli possible : appel WhatsApp parallèle.

   Transport : Pusher Channels (canal de présence).
   - Hôte    : ouvrir n'importe quelle page avec ?lghost=1
   - Visiteur: ouvrir le lien partagé  …?lg=SESSION

   Aucun impact pour les visiteurs normaux : le SDK Pusher n'est
   chargé que lorsqu'une session est active.
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.LIVEGUIDE_CONFIG || {};

  // basePath vers la racine du site (ex: '' à la racine, '../' en sous-dossier),
  // transmis par menu.js via l'attribut data-base du <script id="lg-script">.
  var basePath = '';
  var self = document.getElementById('lg-script') || document.currentScript;
  if (self && self.getAttribute('data-base') != null) {
    basePath = self.getAttribute('data-base');
  }

  var PUSHER_SDK = 'https://js.pusher.com/8.2.0/pusher.min.js';
  var SS = window.sessionStorage;

  // ----- Détection du rôle et de la session --------------------------------
  var params = new URLSearchParams(window.location.search);
  var role = SS.getItem('lg_role') || '';
  var session = SS.getItem('lg_session') || '';
  var userId = SS.getItem('lg_uid') || '';
  var hostToken = SS.getItem('lg_host_token') || ''; // conseiller : droit d'émettre
  var code = SS.getItem('lg_code') || '';            // visiteur : droit d'entrer

  if (params.get('lghost') != null) {
    // La session n'est plus tirée au sort ici : c'est le serveur qui la crée
    // (voir ensureCredentials) et qui délivre le code et le jeton hôte. Une
    // session déjà en cours survit à un rechargement de page.
    role = 'host';
    persistIdentity();
    stripParam('lghost'); // évite de re-déclencher / de partager ce paramètre
  } else if (params.get('lg')) {
    var asked = sanitize(params.get('lg'));
    // Lien d'une AUTRE visite que celle en cours dans cet onglet : le code
    // mémorisé ne vaut plus rien, il faut redemander celui de la nouvelle.
    if (asked !== session) { code = ''; SS.removeItem('lg_code'); }
    // Cet onglet a pu servir à animer une visite : on ne garde pas un jeton
    // hôte alors qu'on entre comme simple spectateur.
    hostToken = ''; SS.removeItem('lg_host_token');
    role = 'viewer';
    session = asked;
    persistIdentity();
    stripParam('lg'); // l'URL reste propre ; sessionStorage garde le rôle
  }

  // ----- Relais entre cadres (iframes de même origine) --------------------
  /* demo.html n'affiche pas son contenu directement : il le charge dans une
     iframe. Un écouteur posé sur le document parent ne voit PAS les clics à
     l'intérieur du cadre, et un chemin CSS calculé dedans n'a aucun sens
     dehors — le partage s'arrêterait à la bordure du cadre.

     Chaque document embarqué parle donc à son parent par postMessage, et
     SEUL le document du dessus tient la connexion Pusher. Une iframe qui
     ouvrirait la sienne coûterait une connexion de plus par participant, et
     la démo en imbrique jusqu'à deux (visite 360° DANS les disponibilités,
     elles-mêmes dans la démo) : on paierait le triple.

     Le relais est en chaîne, chaque étage n'ayant à connaître que le
     suivant. La provenance voyage dans le message lui-même (`lgCadre`), et
     non à côté : Pusher ne transporte que la charge utile, un champ posé
     en dehors serait perdu au passage du réseau. */
  var dansCadre = (function () {
    try {
      if (window.parent === window) return false;
      // Lecture volontairement anodine : elle lève si le parent est d'une
      // autre origine, auquel cas aucun relais n'est possible.
      void window.parent.location.href;
      return true;
    } catch (e) { return false; }
  })();

  /** Nom stable d'une iframe, pour router un message vers le bon cadre. */
  function nomCadre(el) {
    if (el.id) return el.id;
    var tous = document.getElementsByTagName('iframe');
    for (var i = 0; i < tous.length; i++) if (tous[i] === el) return '#' + i;
    return '';
  }

  /** Retrouve l'iframe d'où provient un postMessage. */
  function cadreDe(source) {
    var tous = document.getElementsByTagName('iframe');
    for (var i = 0; i < tous.length; i++) {
      try { if (tous[i].contentWindow === source) return tous[i]; } catch (e) {}
    }
    return null;
  }

  /* Trace des quatre maillons du relais : cadre → parent → Pusher → cadre.
     Bornée aux premiers passages de chaque maillon — le panorama et les
     cartes émettent en continu, une trace non bornée noierait la console en
     quelques secondes et deviendrait inutilisable. */
  var traces = {};
  function tracer(etape, detail) {
    /* Le budget est par ÉTAPE **et par type de message**, pas par étape
       seule. Première version : les messages 'map' d'une carte, émis en
       continu, épuisaient en deux secondes le budget du maillon 2 — et les
       clics arrivés ensuite ne pouvaient plus rien afficher. La trace
       devenait aveugle au moment précis où l'on en avait besoin. */
    var cle = etape + ' | ' + String(detail).replace(/[^a-z-]+/gi, ' ').trim();
    traces[cle] = (traces[cle] || 0) + 1;
    if (traces[cle] > 3) return;
    console.info('[LiveGuide] ' + etape + ' · ' + detail +
      (traces[cle] === 3 ? ' (suivantes masquées pour ce type)' : ''));
  }

  /**
   * Fait descendre une action vers le cadre désigné par `chemin`.
   *
   * `meta` n'est VOLONTAIREMENT pas transmis. Il porte l'identifiant de
   * l'émetteur, que fromHost() compare à hostUid — or hostUid n'est
   * renseigné que par les événements de présence Pusher, qui ne se
   * produisent jamais dans un cadre : il y vaut null, et le cadre rejetait
   * donc en silence TOUT ce qu'on lui envoyait. C'était la cause du
   * « rien ne se synchronise dès la carte des POI ».
   *
   * Sans meta, fromHost() répond vrai — ce qui est correct ici et non un
   * contournement : la vérification a déjà eu lieu en haut, seul endroit
   * qui connaisse la liste des membres, et le cadre est de même origine.
   * Un message ne descend que si le document du dessus l'a validé.
   */
  function versCadre(chemin, ev, msg) {
    var reste = String(chemin).split('>');
    var tete = reste.shift();
    var tous = document.getElementsByTagName('iframe');
    for (var i = 0; i < tous.length; i++) {
      if (nomCadre(tous[i]) !== tete) continue;
      var suite = {};
      for (var k in msg) if (Object.prototype.hasOwnProperty.call(msg, k)) suite[k] = msg[k];
      suite.lgCadre = reste.join('>');
      try {
        tous[i].contentWindow.postMessage({ __lg: 1, dir: 'bas', ev: ev, msg: suite }, window.location.origin);
      } catch (e) {}
      return true;
    }
    return false; // cadre disparu (étape changée) : le message est perdu, sans conséquence
  }

  // Ni hôte ni visiteur → visiteur normal : on ne charge rien.
  if (role !== 'host' && role !== 'viewer') return;

  if (!CFG.enabled) {
    if (role === 'host') {
      console.warn('[LiveGuide] Fonctionnalité désactivée : renseigner Pusher puis mettre enabled:true dans shared/liveguide-config.js');
    }
    return;
  }

  console.info('[LiveGuide] ' + (dansCadre ? 'cadre' : 'page principale') +
    ' · rôle ' + role + ' · ' + window.location.pathname);

  if (!userId) { userId = genId(); SS.setItem('lg_uid', userId); }

  // Configuration ICE pour la voix WebRTC.
  var ICE = buildIce();

  // ----- Identifiants, puis chargement paresseux du SDK Pusher -------------
  // Rien n'est chargé tant qu'on n'a pas de quoi entrer : le conseiller doit
  // obtenir sa session du serveur, le visiteur doit avoir saisi son code.
  // Dans un cadre, tout passe par le parent : ni code à saisir (le visiteur
  // l'a déjà donné en haut), ni SDK à charger, ni connexion à ouvrir.
  if (dansCadre) {
    startCadre();
  } else {
  ensureCredentials(function (ok) {
    if (!ok) return;
    loadScript(PUSHER_SDK, function (loaded) {
      if (!loaded || typeof window.Pusher === 'undefined') {
        console.error('[LiveGuide] Impossible de charger le SDK Pusher.');
        return;
      }
      start();
    });
  });
  }

  /**
   * Démarrage dans un cadre : un faux canal qui parle au parent plutôt qu'à
   * Pusher. initHost / initViewer fonctionnent tels quels — `trigger` et
   * `bind` sont toute leur surface de communication.
   */
  function startCadre() {
    var abonnes = {};
    window.addEventListener('message', function (ev) {
      if (ev.origin !== window.location.origin) return;
      var d = ev.data;
      if (!d || d.__lg !== 1 || d.dir !== 'bas') return;
      // Destiné à un cadre plus bas : on le fait suivre sans le lire.
      if (d.msg && d.msg.lgCadre) { versCadre(d.msg.lgCadre, d.ev, d.msg); return; }
      var liste = abonnes[d.ev] || [];
      tracer('4. cadre applique', d.ev + ' ' + ((d.msg && d.msg.kind) || '') + ' · ' + liste.length + ' abonné(s)');
      for (var i = 0; i < liste.length; i++) liste[i](d.msg, d.meta || {});
    });

    var canal = {
      trigger: function (ev, msg) {
        try {
          tracer('1. cadre émet', ev + ' ' + ((msg && msg.kind) || ''));
          window.parent.postMessage({ __lg: 1, dir: 'haut', ev: ev, msg: msg }, window.location.origin);
        } catch (e) {}
      },
      bind: function (ev, cb) { (abonnes[ev] = abonnes[ev] || []).push(cb); }
    };

    hookPannellum();
    installerRelais(null); // un cadre peut lui-même en contenir un autre
    if (role === 'host') initHost(canal); else initViewer(canal);
  }

  /**
   * Écoute les cadres enfants et fait remonter ce qu'ils émettent.
   *
   * `canal` vaut null quand nous sommes nous-mêmes dans un cadre : on ne
   * publie alors pas sur Pusher, on repasse le message à notre propre parent
   * en préfixant le chemin. C'est ce chaînage qui permet une imbrication
   * quelconque sans que personne ait à connaître la profondeur totale.
   */
  function installerRelais(canal) {
    window.addEventListener('message', function (ev) {
      if (ev.origin !== window.location.origin) return;
      var d = ev.data;
      if (!d || d.__lg !== 1 || d.dir !== 'haut') return;
      var cadre = cadreDe(ev.source);
      if (!cadre) return; // message d'une fenêtre qui n'est pas un de nos cadres
      var msg = {};
      for (var k in d.msg) if (Object.prototype.hasOwnProperty.call(d.msg, k)) msg[k] = d.msg[k];
      msg.lgCadre = nomCadre(cadre) + (d.msg && d.msg.lgCadre ? '>' + d.msg.lgCadre : '');
      tracer('2. parent relaie', msg.lgCadre + ' ' + ((msg && msg.kind) || '') + (canal ? ' → Pusher' : ' → parent'));
      if (canal) canal.trigger(d.ev, msg);
      else {
        try { window.parent.postMessage({ __lg: 1, dir: 'haut', ev: d.ev, msg: msg }, window.location.origin); } catch (e) {}
      }
    });
  }

  /**
   * Réunit ce qu'il faut pour rejoindre le canal, puis appelle done(ok).
   *
   * Conseiller : ouvre une session côté serveur (identifiant + code + jeton).
   * Visiteur   : demande le code, sauf s'il l'a déjà saisi dans cet onglet —
   *              sinon il le retaperait à chaque page suivie.
   */
  function ensureCredentials(done) {
    if (role === 'host') {
      if (session && hostToken) { done(true); return; } // reprise après un F5
      postForm('api/liveguide-session.php?action=start', {}, function (res) {
        if (!res || !res.ok || !res.session) {
          console.error('[LiveGuide] Impossible d\'ouvrir la session.');
          done(false);
          return;
        }
        session = res.session;
        hostToken = res.host_token;
        code = res.code;
        SS.setItem('lg_session', session);
        SS.setItem('lg_host_token', hostToken);
        SS.setItem('lg_code', code);
        done(true);
      });
      return;
    }
    if (code) { done(true); return; }
    askCode(done);
  }

  // ----- Démarrage ---------------------------------------------------------
  function start() {
    var pusher = new window.Pusher(CFG.pusherKey, {
      cluster: CFG.pusherCluster,
      authEndpoint: absPath('api/pusher-auth.php'),
      // Le serveur refuse de signer sans le bon secret : le code pour un
      // visiteur, le jeton pour le conseiller. Renvoyés à chaque
      // reconnexion, donc une session fermée entre-temps ne se rouvre pas.
      auth: { params: { role: role, user_id: userId, code: code, host_token: hostToken } }
    });

    var channelName = 'presence-lg-' + session;
    var channel = pusher.subscribe(channelName);

    hookPannellum(); // capture le visualiseur 360° pour synchroniser la vue
    installerRelais(channel); // fait remonter ce qui se passe dans les iframes


    if (role === 'host') initHost(channel);
    else initViewer(channel);
  }

  // Intercepte la création des visualiseurs Pannellum pour les récupérer
  // (window.LG_PANO). Côté visiteur, on désactive l'interaction (il ne fait
  // que suivre) et l'auto-rotation pour ne pas entrer en conflit avec la sync.
  function hookPannellum() {
    var P = window.pannellum;
    if (!P || typeof P.viewer !== 'function' || P.__lgWrapped) return;
    var orig = P.viewer;
    P.viewer = function (container, config) {
      config = config || {};
      if (role === 'viewer') {
        config.autoRotate = false;
        config.draggable = false;
        config.mouseZoom = false;
        config.showZoomCtrl = false;
        config.keyboardZoom = false;
      }
      var v = orig.call(this, container, config);
      window.LG_PANO = v;
      return v;
    };
    P.__lgWrapped = true;
  }

  /* ======================================================================
     HÔTE
     ====================================================================== */
  function initHost(channel) {
    var ui = buildHostBar();
    initChat(channel, ui.chat, 'Conseiller');
    var viewers = {};   // viewerId -> true
    var pcs = {};       // viewerId -> RTCPeerConnection (voix)
    var localStream = null;
    var micOn = false;
    var parleurs = {};  // viewerId -> true : visiteurs ayant pris la parole
    var ecoutes = {};   // viewerId -> <audio> par lequel on les entend

    // --- Présence + synchronisation de la navigation ---
    channel.bind('pusher:subscription_succeeded', function (members) {
      viewers = {};
      members.each(function (m) { if (m.id !== userId) viewers[m.id] = true; });
      updateCount(ui, keyCount(viewers), keyCount(parleurs));
      publishState(channel);
      forEachKey(viewers, startPeer); // startPeer ne fait rien si nul n'émet
    });
    channel.bind('pusher:member_added', function (m) {
      if (m.id !== userId) viewers[m.id] = true;
      updateCount(ui, keyCount(viewers), keyCount(parleurs));
      publishState(channel);        // resynchronise le nouvel arrivant
      startPeer(m.id);              // et lui envoie la voix si elle est active
    });
    channel.bind('pusher:member_removed', function (m) {
      delete viewers[m.id];
      delete parleurs[m.id];
      closePeer(m.id);
      updateCount(ui, keyCount(viewers), keyCount(parleurs));
    });
    channel.bind('pusher:subscription_error', function () {
      ui.status.textContent = 'Erreur de connexion';
    });

    // Diffusion du scroll (throttlé) + battement régulier pour les retardataires.
    var onScroll = throttle(function () { publishState(channel); }, 150);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', function () { publishState(channel); });
    var beat = setInterval(function () { publishState(channel); }, 4000);

    // Diffusion des clics (vignettes, onglets, boutons…) que la sync URL/scroll
    // ne couvre pas. On ignore notre propre UI et les vrais liens (déjà gérés
    // par la synchronisation d'URL). Capture pour voir le clic même si un
    // handler appelle stopPropagation.
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!(t instanceof Element)) return;
      if (t.closest('.lg-hostbar') || t.closest('.lg-viewerbar')) return;
      // On ignore les liens qui NAVIGUENT réellement (la synchro d'URL s'en
      // charge déjà). Mais pas les faux liens : Leaflet construit TOUS ses
      // contrôles en <a href="#"> — zoom + / −, plein écran, mode compact,
      // sélecteur de fonds, fermeture de popup. L'ancien filtre `a[href]` les
      // avalait tous, d'où une carte totalement muette côté visiteur.
      var link = t.closest('a[href]');
      if (link && !isFakeLink(link)) return;
      var sel = cssPath(t);
      if (sel) channel.trigger('client-action', { kind: 'click', selector: sel });
    }, true);

    // Diffusion des changements de valeur (<select>, cases à cocher, radios).
    // Un <select> natif ne déclenche pas de 'click' exploitable sur ses options
    // (menu géré par l'OS) — seul un 'change' final est observable.
    document.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!(t instanceof Element)) return;
      if (t.closest('.lg-hostbar') || t.closest('.lg-viewerbar')) return;
      var isSelect = t.tagName === 'SELECT';
      var isCheckable = t.tagName === 'INPUT' && (t.type === 'checkbox' || t.type === 'radio');
      if (!isSelect && !isCheckable) return;
      var sel2 = cssPath(t);
      if (!sel2) return;
      var value = t.type === 'checkbox' ? t.checked : t.value;
      channel.trigger('client-action', { kind: 'value', selector: sel2, value: value });
    }, true);

    // Diffusion de la vue panoramique Pannellum (angle + zoom) tant qu'un
    // panorama 360° est affiché. Envoi immédiat au changement + réémission
    // périodique (~1 s) : les client events Pusher étant best-effort, cette
    // réémission auto-répare un événement perdu (sinon désync permanente).
    /* --- Pointeur du conseiller ------------------------------------------
       « Regardez cette baie vitrée » : un point que le conseiller promène dans
       le panorama et que tous les visiteurs voient.

       Il voyage avec le message « pano » plutôt que sur un flux à lui : Pusher
       plafonne les événements client à 10 par seconde et par connexion, et le
       panorama et les cartes en consomment déjà. Greffé ici, le pointeur ne
       coûte pas un événement de plus. */
    var pointeurActif = false;
    var pointPos = null;   // {yaw, pitch} sous le curseur, en degrés

    ui.point.addEventListener('click', function () {
      pointeurActif = !pointeurActif;
      if (!pointeurActif) pointPos = null;
      ui.point.textContent = pointeurActif ? '👉 Pointeur actif' : '👉 Pointeur';
      ui.point.classList.toggle('lg-btn-on', pointeurActif);
    });

    // Simple relevé local : rien ne part sur le réseau ici, c'est le battement
    // du panorama qui emporte la position.
    document.addEventListener('mousemove', function (ev) {
      if (!pointeurActif) return;
      var v = window.LG_PANO;
      if (!v || typeof v.mouseEventToCoords !== 'function') return;
      var t = ev.target;
      if (!t || !t.closest || !t.closest('.pnlm-container')) return;
      var c;
      try { c = v.mouseEventToCoords(ev); } catch (e) { return; }
      if (!c || c.length < 2) return;
      pointPos = { pitch: Math.round(c[0] * 10) / 10, yaw: Math.round(c[1] * 10) / 10 };
    }, true);

    var lastPano = '';
    var panoTicks = 0;
    var panoBeat = setInterval(function () {
      var v = window.LG_PANO;
      if (!v || typeof v.getYaw !== 'function') return;
      if (!document.querySelector('.pnlm-container')) return; // 360° pas à l'écran
      var y = Math.round(v.getYaw() * 10) / 10;
      var p = Math.round(v.getPitch() * 10) / 10;
      var h = Math.round(v.getHfov() * 10) / 10;
      // Pièce courante, sur une visite à plusieurs panoramas (tour-360.html).
      // Sur une vue 360° isolée (fiche projet, galerie), getScene() n'existe
      // pas : le champ reste absent et le visiteur ne change simplement pas de
      // scène.
      var sc = typeof v.getScene === 'function' ? v.getScene() : null;
      var pt = (pointeurActif && pointPos) ? pointPos : null;
      // Le pointeur entre dans la clé : sans cela, le conseiller pourrait le
      // déplacer sans bouger la vue, et rien ne partirait avant 600 ms.
      var key = sc + '|' + y + '|' + p + '|' + h + '|' + (pt ? pt.yaw + ',' + pt.pitch : '');
      panoTicks++;
      if (key === lastPano && panoTicks % 3 !== 0) return; // inchangé : resync ~600ms
      lastPano = key;
      var msg = { kind: 'pano', scene: sc, yaw: y, pitch: p, hfov: h };
      if (pt) { msg.px = pt.yaw; msg.py = pt.pitch; }
      channel.trigger('client-action', msg);
    }, 200);

    // Diffusion de la vue des cartes Leaflet (centre + zoom). Un déplacement de
    // carte se fait au glisser/molette : il ne produit ni clic, ni 'change', ni
    // changement d'URL — rien de ce que le reste de la synchro sait capter. Sans
    // cette émission, la carte du visiteur reste figée là où il l'a trouvée
    // pendant que l'hôte commente une autre ville.
    //
    // Même schéma que le panorama : envoi au changement + réémission
    // périodique (~600 ms), les client events Pusher étant best-effort — un
    // événement perdu figerait la carte jusqu'au mouvement suivant.
    var lastMapKeys = [];
    var mapTicks = 0;
    var mapBeat = setInterval(function () {
      var maps = window.LG_MAPS || [];
      mapTicks++;
      for (var i = 0; i < maps.length; i++) {
        var m = maps[i];
        if (!m || typeof m.getCenter !== 'function' || !m._loaded) continue;
        var c, z;
        try { c = m.getCenter(); z = m.getZoom(); } catch (e) { continue; }
        var key = c.lat.toFixed(5) + '|' + c.lng.toFixed(5) + '|' + z;
        if (key === lastMapKeys[i] && mapTicks % 3 !== 0) continue; // inchangé : resync ~600 ms
        lastMapKeys[i] = key;
        channel.trigger('client-action', {
          kind: 'map', i: i,
          lat: Math.round(c.lat * 1e6) / 1e6,
          lng: Math.round(c.lng * 1e6) / 1e6,
          zoom: z
        });
      }
    }, 200);

    // --- Voix : réception des réponses / ICE des visiteurs ---
    channel.bind('client-webrtc', function (msg) {
      if (!msg || msg.to !== userId) return;

      // Prise de parole d'un visiteur. Traité AVANT de chercher la connexion :
      // il n'y en a justement pas encore quand le conseiller a son micro coupé.
      // On relance la négociation pour que l'offre porte une ligne audio dans
      // laquelle le visiteur pourra poser sa voix.
      if (msg.type === 'ask-mic' || msg.type === 'drop-mic') {
        if (msg.type === 'ask-mic') parleurs[msg.from] = true;
        else delete parleurs[msg.from];
        updateCount(ui, keyCount(viewers), keyCount(parleurs));
        refreshPeer(msg.from);
        return;
      }

      var pc = pcs[msg.from];
      if (!pc) return;
      if (msg.type === 'answer' && msg.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(noop);
      } else if (msg.type === 'ice' && msg.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(noop);
      }
    });

    // Bouton micro : démarre/arrête la diffusion de la voix.
    ui.mic.addEventListener('click', function () {
      if (micOn) { stopVoice(); return; }
      if (!navigator.mediaDevices || !window.RTCPeerConnection) {
        ui.mic.textContent = 'Voix non supportée';
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        localStream = stream;
        micOn = true;
        ui.mic.textContent = '🎙️ Micro actif';
        ui.mic.classList.add('lg-btn-on');
        // refreshPeer et non startPeer : une connexion peut déjà exister avec
        // un visiteur qui avait pris la parole, et elle ne porte pas encore
        // notre voix.
        forEachKey(viewers, refreshPeer);
      }).catch(function () {
        ui.mic.textContent = '🎙️ Micro refusé';
      });
    });

    function startPeer(viewerId) {
      if (pcs[viewerId]) return;
      var jEmets = micOn && !!localStream;
      var ilEmet = !!parleurs[viewerId];
      if (!jEmets && !ilEmet) return; // personne n'a rien à dire : pas de connexion

      var pc = new RTCPeerConnection(ICE);
      pcs[viewerId] = pc;

      if (jEmets) {
        // addTrack ouvre une ligne audio bidirectionnelle : le visiteur pourra
        // y répondre avec sa propre voix s'il prend la parole.
        localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });
      } else {
        // Conseiller muet mais visiteur qui parle : il faut tout de même une
        // ligne audio dans l'offre, sinon le visiteur n'a nulle part où poser
        // sa voix et l'on ne l'entendrait pas.
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      pc.ontrack = function (ev) { ecouterVisiteur(viewerId, ev.streams[0]); };
      pc.onicecandidate = function (ev) {
        if (ev.candidate) sig(channel, { type: 'ice', to: viewerId, from: userId, candidate: ev.candidate });
      };
      mesurerChemin(pc, 'host');
      pc.createOffer()
        .then(function (offer) { return pc.setLocalDescription(offer); })
        .then(function () { sig(channel, { type: 'offer', to: viewerId, from: userId, sdp: pc.localDescription }); })
        .catch(noop);
    }

    // Le conseiller entend un visiteur : un élément audio par interlocuteur.
    function ecouterVisiteur(id, stream) {
      var a = ecoutes[id];
      if (!a) {
        a = document.createElement('audio');
        a.autoplay = true;
        a.setAttribute('playsinline', '');
        document.body.appendChild(a);
        ecoutes[id] = a;
      }
      a.srcObject = stream;
      // L'autoplay est acquis : le conseiller a forcément cliqué avant.
      var p = a.play();
      if (p && p.catch) p.catch(noop);
    }

    /**
     * Rejoue la négociation avec un visiteur.
     *
     * Ajouter ou retirer une piste en cours de route exigerait une
     * renégociation où chacun peut se retrouver à émettre une offre en même
     * temps (« glare »). Pour un appel audio à deux, refaire la connexion est
     * plus simple et parfaitement fiable : l'interruption dure une seconde, et
     * l'offre part toujours du conseiller.
     */
    function refreshPeer(id) {
      closePeer(id);
      startPeer(id);
    }

    function closePeer(id) {
      if (pcs[id]) { try { pcs[id].close(); } catch (e) {} delete pcs[id]; }
      if (ecoutes[id]) { removeEl(ecoutes[id]); delete ecoutes[id]; }
    }

    function stopVoice() {
      micOn = false;
      if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
      ui.mic.textContent = '🎙️ Activer le micro';
      ui.mic.classList.remove('lg-btn-on');
      // On ne coupe pas tout : les visiteurs à qui l'on a donné la parole
      // doivent rester audibles même quand le conseiller se tait.
      forEachKey(viewers, refreshPeer);
    }

    // Fin de session : nettoyage complet.
    ui.end.addEventListener('click', function () {
      clearInterval(beat);
      clearInterval(panoBeat);
      clearInterval(mapBeat);
      window.removeEventListener('scroll', onScroll);
      stopVoice();
      // Ferme la session côté serveur : le lien ET le code deviennent inertes.
      // Sans cet appel, un visiteur pourrait revenir dans le tour après coup.
      postForm('api/liveguide-session.php?action=end',
               { session: session, host_token: hostToken }, noop);
      endSession();
      removeEl(ui.bar);
      document.body.classList.remove('lg-has-bar');
      document.body.classList.remove('lg-host');
    });
  }

  function publishState(channel) {
    // Dans un cadre, l'URL et le défilement sont ceux du parent : c'est lui
    // qui les publie. Les republier ici enverrait le visiteur naviguer sa
    // fenêtre entière vers l'adresse d'une iframe.
    if (dansCadre) return;
    channel.trigger('client-state', {
      url: cleanUrl(window.location.href),
      scroll: scrollFraction()
    });
  }

  /* ======================================================================
     VISITEUR
     ====================================================================== */
  function initViewer(channel) {
    var banner = buildViewerBanner();
    initChat(channel, banner.chat, SS.getItem('lg_nom') || 'Visiteur');
    var here = cleanUrl(window.location.href);
    var pc = null;       // connexion voix avec l'hôte
    var audioEl = null;
    var monMicro = null; // flux local quand le visiteur a pris la parole
    var lastScroll = null;   // dernière position reçue (voir le filtre plus bas)
    var hostUid = null;      // identifiant Pusher du conseiller (voir fromHost)
    var sceneEnCours = null; // pièce en cours de chargement (verrou, voir 'pano')

    /**
     * Filet de sécurité du verrou de scène.
     *
     * Si un chargement échoue (tuile manquante, coupure réseau), `sceneEnCours`
     * resterait armé et le visiteur ne suivrait plus RIEN, même les rotations.
     * Au bout de 8 s on relâche : la réémission suivante de l'hôte relancera le
     * chargement proprement.
     */
    function armerSecuriteScene(scene) {
      setTimeout(function () {
        if (sceneEnCours === scene) sceneEnCours = null;
      }, 8000);
    }

    var pointeur = null; // objet hotspot du pointeur, injecté dans Pannellum

    /**
     * Affiche, déplace ou retire le point que le conseiller promène.
     *
     * Les coordonnées arrivent dans le message « pano » (px/py). Absentes, le
     * conseiller a coupé son pointeur : on l'efface.
     */
    function majPointeur(v, msg) {
      if (typeof v.getConfig !== 'function' || typeof v.addHotSpot !== 'function') return;

      if (typeof msg.px !== 'number' || typeof msg.py !== 'number') {
        if (pointeur) {
          try { v.removeHotSpot('lg-pointeur'); } catch (e) {}
          pointeur = null;
        }
        return;
      }

      if (!pointeur) {
        pointeur = {
          id: 'lg-pointeur', yaw: msg.px, pitch: msg.py,
          cssClass: 'lg-pointeur',
          createTooltipFunc: function () {} // pastille nue, habillée en CSS
        };
        try { v.addHotSpot(pointeur); } catch (e) { pointeur = null; }
        return;
      }

      // addHotSpot pousse l'objet dans la configuration VIVANTE de Pannellum
      // (getConfig rend l'objet interne) : le muter suffit, il repositionne à
      // l'image suivante. Le recréer à chaque message ferait clignoter le point.
      pointeur.yaw = msg.px;
      pointeur.pitch = msg.py;
    }

    // --- Qui est le conseiller ? ---
    // Le rôle vient de channel_data, signé par api/pusher-auth.php : le serveur
    // ne l'accorde qu'au porteur du jeton hôte, un navigateur ne peut donc pas
    // s'en réclamer. C'est ce qui rend le filtre ci-dessous digne de confiance.
    channel.bind('pusher:subscription_succeeded', function (members) {
      members.each(function (m) { if (m.info && m.info.role === 'host') hostUid = m.id; });
    });
    channel.bind('pusher:member_added', function (m) {
      if (!m.info || m.info.role !== 'host') return;
      hostUid = m.id;
      // Conseiller revenu après une coupure : il a perdu la liste de ceux à qui
      // il avait donné la parole. On se re-signale, sinon le visiteur croirait
      // parler dans le vide.
      if (monMicro) sig(channel, { type: 'ask-mic', to: hostUid, from: userId });
    });
    channel.bind('pusher:member_removed', function (m) {
      if (m.id === hostUid) hostUid = null;
    });

    /**
     * N'accepte un message que s'il vient bien du conseiller.
     *
     * Sur un canal de présence, Pusher autorise TOUT membre à émettre. Sans ce
     * filtre, un visiteur pouvait diffuser un 'client-state' et envoyer tous
     * les autres sur l'URL de son choix — le poste du visiteur suit sans
     * poser de question.
     *
     * Pusher joint l'expéditeur en second argument des client events. Si cette
     * métadonnée venait à manquer (SDK plus ancien), on laisse passer plutôt
     * que de rendre la visite muette : on retombe alors sur l'ancien
     * comportement, le code d'accès restant la première barrière.
     */
    function fromHost(meta) {
      if (!meta || !meta.user_id) return true;
      // hostUid vaut null quand aucun conseiller n'est présent : il n'y a alors
      // aucun message légitime à recevoir, on rejette (comparaison à null).
      return meta.user_id === hostUid;
    }

    // --- Suivi de la navigation de l'hôte ---
    channel.bind('client-state', function (data, meta) {
      if (!data || !data.url || !fromHost(meta)) return;
      // Changement de page : on suit l'hôte.
      if (normalize(data.url) !== normalize(here)) {
        window.location.href = data.url; // sessionStorage garde le rôle visiteur
        return;
      }
      // Même page : on applique le scroll de l'hôte — mais SEULEMENT s'il a
      // réellement bougé. L'hôte réémet son état toutes les 4 s (battement pour
      // les retardataires) ; on repositionnait donc le visiteur de force toutes
      // les 4 secondes, y compris quand l'hôte n'avait pas bougé d'un pixel. Le
      // visiteur qui jetait un œil ailleurs était ramené en boucle et ne pouvait
      // rien regarder. Le battement continue à rattraper un vrai déplacement
      // manqué, et un visiteur qui arrive en cours de route est bien positionné
      // (lastScroll vaut null à la première réception).
      if (typeof data.scroll !== 'number') return;
      if (lastScroll !== null && Math.abs(data.scroll - lastScroll) < 0.002) return;
      lastScroll = data.scroll;
      applyScroll(data.scroll);
    });

    channel.bind('pusher:subscription_error', function () {
      banner.status.textContent = 'Reconnexion…';
    });

    // --- Rejoue les actions de l'hôte : clics, <select>/cases à cocher, vue 360° ---
    channel.bind('client-action', function (msg, meta) {
      if (!msg || !fromHost(meta)) return;
      /* Action venue d'un cadre : elle doit être rejouée DANS CE CADRE, un
         chemin CSS n'ayant de sens que dans le document où il a été calculé.

         Le routage vit ici et non dans start() — première version, qui ne
         pouvait pas marcher : fromHost() et hostUid sont internes à
         initViewer, donc l'appel levait une ReferenceError à chaque message,
         avalée par le gestionnaire de Pusher. Côté hôte tout partait bien
         (traces 1 et 2), et côté visiteur rien ne se passait ni ne se
         plaignait. C'est ce qui rendait la panne si opaque. */
      if (msg.lgCadre) {
        tracer('3. visiteur route', msg.lgCadre + ' ' + (msg.kind || ''));
        versCadre(msg.lgCadre, 'client-action', msg);
        return;
      }
      if (msg.kind === 'click' && msg.selector) {
        var elt;
        try { elt = document.querySelector(msg.selector); } catch (e) { return; }
        if (elt) elt.click();
        return;
      }
      if (msg.kind === 'value' && msg.selector) {
        var elt2;
        try { elt2 = document.querySelector(msg.selector); } catch (e) { return; }
        if (!elt2) return;
        if (elt2.tagName === 'INPUT' && elt2.type === 'checkbox') elt2.checked = !!msg.value;
        else if (elt2.tagName === 'INPUT' && elt2.type === 'radio') elt2.checked = true;
        else elt2.value = msg.value;
        elt2.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (msg.kind === 'map') {
        var idx = msg.i || 0;
        var maps = window.LG_MAPS || [];
        var mp = maps[idx];
        if (!mp || typeof mp.setView !== 'function') return;
        // Carte déjà en place ? On ne la touche pas. Un setView rejoue un
        // _resetView complet (tuiles et marqueurs repositionnés) ; appliqué à
        // chaque réémission de sécurité (~600 ms) sur une carte qui n'a pas
        // bougé, c'est le clignotement permanent côté visiteur.
        //
        // La tolérance sur le zoom n'est pas cosmétique : après un flyTo,
        // l'hôte s'arrête sur un zoom FRACTIONNAIRE (vu en test :
        // 10.985407116604048) que le visiteur ne peut pas reproduire — Leaflet
        // l'arrondit à 11 via zoomSnap. Une égalité stricte laisserait donc un
        // écart qui ne se résorbe jamais, donc un setView toutes les 600 ms
        // pour l'éternité. C'était exactement ça, le clignotement sans fin.
        //
        // On compare bien à l'ÉTAT de la carte et non au dernier message reçu :
        // c'est ce qui garde l'auto-réparation. Si le code de la page repositionne
        // la carte du visiteur (fitBounds au rendu, invalidateSize…), la
        // réémission suivante le rattrape.
        var cur, curZoom;
        try { cur = mp.getCenter(); curZoom = mp.getZoom(); } catch (e) { return; }
        if (Math.abs(curZoom - msg.zoom) < 0.51 &&
            Math.abs(cur.lat - msg.lat) < 1e-4 &&
            Math.abs(cur.lng - msg.lng) < 1e-4) return;
        try {
          lockMap(mp); // le visiteur suit, il ne pilote pas
          if (typeof mp.stop === 'function') mp.stop(); // coupe un flyTo en cours
          mp.setView([msg.lat, msg.lng], msg.zoom, { animate: false });
        } catch (e) {}
        return;
      }
      if (msg.kind === 'pano') {
        var v = window.LG_PANO;
        if (!v || typeof v.setYaw !== 'function') return;

        // Le conseiller a changé de pièce : on le suit à l'intérieur du tour.
        // C'est ce qui manquait pour égaler le Live Tour de 3DVista.
        if (msg.scene && typeof v.getScene === 'function' && typeof v.loadScene === 'function') {
          if (msg.scene !== v.getScene()) {
            // loadScene est asynchrone, et l'hôte réémet toutes les 200 ms :
            // sans ce verrou on relancerait le chargement une dizaine de fois
            // pendant qu'il est déjà en cours, et la pièce ne s'afficherait
            // jamais. L'angle part avec le chargement, pas après.
            if (sceneEnCours !== msg.scene) {
              sceneEnCours = msg.scene;
              armerSecuriteScene(msg.scene);
              // Changer de pièce reconstruit les hotspots depuis la config de
              // la scène : notre pointeur disparaît avec eux, il faudra le
              // réinjecter.
              pointeur = null;
              try {
                v.loadScene(msg.scene, msg.pitch, msg.yaw, msg.hfov);
              } catch (e) {
                sceneEnCours = null;
              }
            }
            return;
          }
          sceneEnCours = null; // arrivé : on reprend le suivi des angles
        }

        try {
          if (v.stopAutoRotate) v.stopAutoRotate();
          v.setYaw(msg.yaw, false);
          v.setPitch(msg.pitch, false);
          v.setHfov(msg.hfov, false);
        } catch (e) {}

        majPointeur(v, msg);
      }
    });

    // --- Voix : réception de l'offre de l'hôte ---
    // Filtré comme le reste : sans cela, un visiteur pouvait ouvrir une
    // connexion WebRTC avec les autres et leur diffuser son propre micro.
    channel.bind('client-webrtc', function (msg, meta) {
      if (!msg || msg.to !== userId || !fromHost(meta)) return;
      if (msg.type === 'offer' && msg.sdp) {
        closePc();
        pc = new RTCPeerConnection(ICE);
        pc.onicecandidate = function (ev) {
          if (ev.candidate) sig(channel, { type: 'ice', to: msg.from, from: userId, candidate: ev.candidate });
        };
        pc.ontrack = function (ev) { attachAudio(ev.streams[0]); };
        mesurerChemin(pc, 'viewer');
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          .then(function () {
            // Notre voix, si le visiteur a pris la parole. Ajoutée APRÈS la
            // description distante : la piste se greffe alors sur la ligne
            // audio déjà ouverte par l'hôte, au lieu d'en réclamer une
            // nouvelle que l'offre ne prévoyait pas.
            if (monMicro) {
              monMicro.getTracks().forEach(function (t) { pc.addTrack(t, monMicro); });
            }
            return pc.createAnswer();
          })
          .then(function (ans) { return pc.setLocalDescription(ans); })
          .then(function () { sig(channel, { type: 'answer', to: msg.from, from: userId, sdp: pc.localDescription }); })
          .catch(noop);
      } else if (msg.type === 'ice' && pc && msg.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(noop);
      }
    });

    function attachAudio(stream) {
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.setAttribute('playsinline', '');
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = stream;
      var p = audioEl.play();
      if (p && p.catch) {
        // L'autoplay audio est souvent bloqué : on propose un bouton "Activer le son".
        p.catch(function () { banner.sound.style.display = ''; });
      }
    }

    banner.sound.addEventListener('click', function () {
      if (!audioEl) return;
      audioEl.play().then(function () { banner.sound.style.display = 'none'; }).catch(noop);
    });

    /* --- Prise de parole du visiteur ------------------------------------
       La visite était à sens unique : le client devait ouvrir WhatsApp en
       parallèle pour poser une question. Il peut désormais répondre dans la
       visite elle-même.

       C'est le CONSEILLER qui réémet l'offre (voir 'ask-mic' côté hôte) : si
       le visiteur ajoutait sa piste de son côté, les deux pourraient émettre
       une offre en même temps, et la négociation se bloquerait. */
    banner.talk.addEventListener('click', function () {
      if (monMicro) { couperMonMicro(); return; }

      if (!hostUid) {
        // Sans conseiller sur le canal, la demande n'aurait aucun destinataire
        // et échouerait en silence.
        banner.talk.textContent = '🎙️ Conseiller absent';
        setTimeout(function () { banner.talk.textContent = '🎙️ Prendre la parole'; }, 2500);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // getUserMedia n'existe qu'en HTTPS (ou sur localhost) : en HTTP, le
        // navigateur ne propose même pas l'autorisation.
        banner.talk.textContent = '🎙️ Micro indisponible';
        banner.talk.disabled = true;
        return;
      }

      banner.talk.textContent = '🎙️ Autorisation…';
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        monMicro = stream;
        banner.talk.textContent = '🎙️ Vous parlez';
        banner.talk.classList.add('lg-btn-on');
        sig(channel, { type: 'ask-mic', to: hostUid, from: userId });
      }).catch(function () {
        banner.talk.textContent = '🎙️ Micro refusé';
      });
    });

    function couperMonMicro() {
      if (monMicro) {
        monMicro.getTracks().forEach(function (t) { t.stop(); });
        monMicro = null;
      }
      banner.talk.textContent = '🎙️ Prendre la parole';
      banner.talk.classList.remove('lg-btn-on');
      sig(channel, { type: 'drop-mic', to: hostUid, from: userId });
    }

    function closePc() { if (pc) { try { pc.close(); } catch (e) {} pc = null; } }

    banner.leave.addEventListener('click', function () {
      if (monMicro) couperMonMicro();
      closePc();
      endSession();
      window.location.href = cleanUrl(window.location.href); // reste sur la page, sans suivre
    });
  }

  // Côté visiteur, la carte suit l'hôte : on coupe ses propres interactions
  // (sinon il se bat contre la resynchronisation qui arrive ~600 ms plus tard).
  // Pendant du config.draggable=false appliqué au panorama Pannellum.
  function lockMap(m) {
    if (m.__lgLocked) return;
    m.__lgLocked = true;
    var handlers = ['dragging', 'touchZoom', 'doubleClickZoom', 'scrollWheelZoom', 'boxZoom', 'keyboard', 'tap'];
    for (var i = 0; i < handlers.length; i++) {
      var h = m[handlers[i]];
      if (h && typeof h.disable === 'function') { try { h.disable(); } catch (e) {} }
    }
  }

  function applyScroll(frac) {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    // Positionnement instantané (forme positionnelle) : plus fiable que le
    // scroll fluide (gelé quand l'onglet n'est pas au premier plan) et plus
    // juste pour un suivi — le visiteur se cale exactement où est l'hôte.
    window.scrollTo(0, Math.round(frac * max));
  }

  /* ======================================================================
     INTERFACE — barre hôte / bannière visiteur
     ====================================================================== */
  function buildHostBar() {
    var bar = el('div', 'lg-hostbar');
    /* Le lien mène à LA PAGE OÙ SE TROUVE LE CONSEILLER, pas à l'accueil.

       Il pointait sur index.html quelle que soit la page partagée : le
       visiteur atterrissait sur la page d'accueil et devait attendre que la
       synchronisation d'URL le déplace. Constaté sur un iPad ouvrant une
       démo — le visiteur voyait l'accueil, et rien ne disait que c'était
       normal. Un lien qui montre déjà la bonne page supprime cette attente,
       et le doute qui va avec.

       cleanUrl retire un lg/lghost déjà présent : sans quoi le conseiller
       qui a rejoint par un lien partagerait un lien portant deux sessions. */
    var lienBase = new URL(cleanUrl(window.location.href));
    lienBase.searchParams.set('lg', session);
    var viewerLink = lienBase.href;

    var status = el('span', 'lg-status');
    status.textContent = 'Visite guidée active';

    var count = el('span', 'lg-count');
    count.innerHTML = '<span class="lg-dot"></span><b>0</b> spectateur(s)';

    // Le code se DIT (téléphone, WhatsApp), il ne s'envoie pas avec le lien :
    // un lien qui contiendrait déjà le code ne protégerait plus rien. D'où un
    // affichage bien lisible ici, et un bouton « copier » qui ne prend que le lien.
    var codeBox = el('span', 'lg-code');
    codeBox.innerHTML = 'Code : <b>' + code.replace(/[^0-9]/g, '') + '</b>';
    codeBox.title = 'À communiquer de vive voix au visiteur';

    var mic = el('button', 'lg-btn lg-btn-ghost');
    mic.type = 'button';
    mic.textContent = '🎙️ Activer le micro';

    // Montrer du doigt dans le panorama, comme le fait le Live Tour de 3DVista.
    var point = el('button', 'lg-btn lg-btn-ghost');
    point.type = 'button';
    point.textContent = '👉 Pointeur';
    point.title = 'Suit la souris dans une vue 360°';

    var chat = el('button', 'lg-btn lg-btn-ghost');
    chat.type = 'button';
    chat.textContent = '💬 Chat';
    chat.setAttribute('aria-expanded', 'false');

    var copy = el('button', 'lg-btn lg-btn-primary');
    copy.type = 'button';
    copy.textContent = 'Copier le lien visiteur';
    copy.addEventListener('click', function () {
      copyText(viewerLink, function (ok) {
        copy.textContent = ok ? 'Lien copié ✓' : 'Copier échoué';
        setTimeout(function () { copy.textContent = 'Copier le lien visiteur'; }, 2000);
      });
    });

    var end = el('button', 'lg-btn lg-btn-ghost lg-btn-end');
    end.type = 'button';
    end.textContent = 'Terminer';

    bar.appendChild(status);
    bar.appendChild(count);
    bar.appendChild(codeBox);
    bar.appendChild(mic);
    bar.appendChild(point);
    bar.appendChild(chat);
    bar.appendChild(copy);
    bar.appendChild(end);
    // Dans un cadre, la barre est construite mais NON attachée : elle
    // ferait doublon avec celle du document du dessus. Le reste du code
    // continue de la manipuler sans le savoir, sur un élément détaché.
    if (!dansCadre) document.body.appendChild(bar);
    document.body.classList.add('lg-has-bar');
    document.body.classList.add('lg-host'); // barre plus haute : voir liveguide.css

    return { bar: bar, status: status, count: count, code: codeBox,
             mic: mic, point: point, chat: chat, copy: copy, end: end };
  }

  function updateCount(ui, n, micros) {
    var t = '<span class="lg-dot"></span><b>' + n + '</b> spectateur(s)';
    // Le conseiller doit voir d'un coup d'œil qui peut lui répondre.
    if (micros) t += ' · 🎤 <b>' + micros + '</b>';
    ui.count.innerHTML = t;
  }

  function buildViewerBanner() {
    var bar = el('div', 'lg-viewerbar');

    var status = el('span', 'lg-status');
    status.innerHTML = '<span class="lg-dot"></span> Visite guidée en cours — votre écran suit le conseiller';

    var sound = el('button', 'lg-btn lg-btn-primary');
    sound.type = 'button';
    sound.textContent = '🔊 Activer le son';
    sound.style.display = 'none'; // affiché seulement si l'autoplay est bloqué

    // Le visiteur peut répondre au conseiller sans passer par un appel séparé.
    var talk = el('button', 'lg-btn lg-btn-ghost');
    talk.type = 'button';
    talk.textContent = '🎙️ Prendre la parole';

    var chat = el('button', 'lg-btn lg-btn-ghost');
    chat.type = 'button';
    chat.textContent = '💬 Chat';
    chat.setAttribute('aria-expanded', 'false');

    var leave = el('button', 'lg-btn lg-btn-ghost');
    leave.type = 'button';
    leave.textContent = 'Quitter';

    bar.appendChild(status);
    bar.appendChild(sound);
    bar.appendChild(talk);
    bar.appendChild(chat);
    bar.appendChild(leave);
    // Dans un cadre, la barre est construite mais NON attachée : elle
    // ferait doublon avec celle du document du dessus. Le reste du code
    // continue de la manipuler sans le savoir, sur un élément détaché.
    if (!dansCadre) document.body.appendChild(bar);
    document.body.classList.add('lg-has-bar');

    return { bar: bar, status: status, sound: sound, talk: talk, chat: chat, leave: leave };
  }

  /**
   * Écran de saisie du code, côté visiteur. Appelle done(true) une fois le
   * code validé, done(false) si le visiteur préfère naviguer librement.
   *
   * Cet écran est un confort, pas une serrure : la serrure est dans
   * api/pusher-auth.php, qui ne signe l'abonnement qu'avec le bon code. Le
   * contourner (console, requête directe) ne donne accès à rien.
   */
  function askCode(done) {
    var ov = el('div', 'lg-gate');
    var box = el('form', 'lg-gate-box');

    var title = el('h2', 'lg-gate-title');
    title.textContent = 'Visite guidée';

    var help = el('p', 'lg-gate-help');
    help.textContent = 'Saisissez le code à 6 chiffres que vous a communiqué votre conseiller.';

    var input = el('input', 'lg-gate-input');
    input.type = 'text';
    input.inputMode = 'numeric';           // clavier chiffres sur mobile
    input.autocomplete = 'one-time-code';
    input.maxLength = 6;
    input.placeholder = '••••••';
    input.setAttribute('aria-label', 'Code d\'accès à la visite guidée');

    // Facultatif, mais il change tout pour le conseiller : pouvoir répondre
    // « Bonjour Karim » plutôt qu'à un « Visiteur » anonyme dans le chat.
    var nom = el('input', 'lg-gate-nom');
    nom.type = 'text';
    nom.maxLength = 30;
    nom.autocomplete = 'given-name';
    nom.placeholder = 'Votre prénom (facultatif)';
    nom.setAttribute('aria-label', 'Votre prénom, facultatif');
    nom.value = SS.getItem('lg_nom') || '';

    var err = el('p', 'lg-gate-error');
    err.setAttribute('role', 'alert');     // lu par les lecteurs d'écran

    var submit = el('button', 'lg-btn lg-btn-primary lg-gate-submit');
    submit.type = 'submit';
    submit.textContent = 'Rejoindre';

    var cancel = el('button', 'lg-btn lg-btn-ghost');
    cancel.type = 'button';
    cancel.textContent = 'Visiter librement';
    cancel.addEventListener('click', function () {
      endSession();                        // oublie le rôle : navigation normale
      removeEl(ov);
      done(false);
    });

    function fail(message) {
      err.textContent = message;
      input.select();
    }

    // Session close ou saturée : réessayer n'a plus de sens, il faut un
    // nouveau lien. On ne laisse que la sortie.
    function lock() {
      input.disabled = true;
      submit.disabled = true;
      cancel.textContent = 'Continuer sur le site';
    }

    box.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var value = (input.value || '').replace(/\D/g, '');
      if (value.length !== 6) { fail('Le code comporte 6 chiffres.'); return; }

      submit.disabled = true;
      submit.textContent = 'Vérification…';
      postForm('api/liveguide-session.php?action=verify',
               { session: session, code: value }, function (res) {
        submit.disabled = false;
        submit.textContent = 'Rejoindre';

        if (!res || !res.ok) { fail('Connexion impossible. Réessayez.'); return; }
        if (res.valid) {
          code = value;
          SS.setItem('lg_code', code);
          var prenom = (nom.value || '').trim().slice(0, 30);
          if (prenom) SS.setItem('lg_nom', prenom); else SS.removeItem('lg_nom');
          removeEl(ov);
          done(true);
          return;
        }
        if (res.reason === 'closed') {
          fail('Cette visite est terminée.');
          lock();
          return;
        }
        if (res.reason === 'locked') {
          fail('Trop d\'essais. Demandez un nouveau lien à votre conseiller.');
          lock();
          return;
        }
        fail('Code incorrect.');
      });
    });

    box.appendChild(title);
    box.appendChild(help);
    box.appendChild(input);
    box.appendChild(nom);
    box.appendChild(err);
    box.appendChild(submit);
    box.appendChild(cancel);
    ov.appendChild(box);
    document.body.appendChild(ov);
    input.focus();
  }

  /* ======================================================================
     CHAT ÉCRIT (conseiller ↔ visiteurs)
     ====================================================================== */

  /**
   * Panneau de discussion, partagé par le conseiller et les visiteurs.
   *
   * Contrairement au reste de la synchronisation, le chat n'est PAS filtré sur
   * le seul hôte : chacun doit pouvoir écrire. Le rôle affiché ne vient donc
   * pas du message — qu'un visiteur pourrait falsifier — mais de la liste de
   * présence Pusher, dont `info.role` est signé par api/pusher-auth.php.
   *
   * @param {object} channel  canal Pusher déjà abonné
   * @param {Element} bouton  bouton de la barre qui ouvre le panneau
   * @param {string} monNom   nom affiché à côté de nos messages
   */
  function initChat(channel, bouton, monNom) {
    var panneau = el('div', 'lg-chat');
    panneau.hidden = true;

    var liste = el('div', 'lg-chat-liste');
    var form = el('form', 'lg-chat-form');

    var saisie = el('input', 'lg-chat-input');
    saisie.type = 'text';
    saisie.maxLength = 500;
    saisie.placeholder = 'Votre message…';
    saisie.setAttribute('aria-label', 'Message');

    var envoi = el('button', 'lg-btn lg-btn-primary');
    envoi.type = 'submit';
    envoi.textContent = 'Envoyer';

    form.appendChild(saisie);
    form.appendChild(envoi);
    panneau.appendChild(liste);
    panneau.appendChild(form);
    // Dans un cadre, la barre est construite mais NON attachée : elle
    // ferait doublon avec celle du document du dessus. Le reste du code
    // continue de la manipuler sans le savoir, sur un élément détaché.
    if (!dansCadre) document.body.appendChild(panneau);

    var nonLus = 0;

    bouton.addEventListener('click', function () {
      panneau.hidden = !panneau.hidden;
      bouton.setAttribute('aria-expanded', panneau.hidden ? 'false' : 'true');
      if (!panneau.hidden) { nonLus = 0; majBouton(); saisie.focus(); }
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var texte = (saisie.value || '').trim();
      if (!texte) return;
      saisie.value = '';
      channel.trigger('client-chat', { nom: monNom, texte: texte });
      // Pusher ne renvoie pas à l'expéditeur ses propres client events :
      // on affiche donc le message localement.
      ajouter(monNom, texte, true, role === 'host');
    });

    channel.bind('client-chat', function (msg, meta) {
      if (!msg || typeof msg.texte !== 'string') return;

      // Rôle pris sur la liste de présence, jamais sur le message.
      var estHote = false;
      try {
        var m = meta && meta.user_id && channel.members.get(meta.user_id);
        estHote = !!(m && m.info && m.info.role === 'host');
      } catch (e) {}

      ajouter(nomAffiche(msg.nom, estHote), msg.texte.slice(0, 500), false, estHote);

      if (panneau.hidden) { nonLus++; majBouton(); }
    });

    /**
     * Nom à afficher, en refusant qu'un visiteur se fasse passer pour l'hôte.
     *
     * Le fond vert des messages du conseiller n'est déjà pas usurpable — il
     * découle du rôle signé. Mais le NOM, lui, est du texte libre : sans ce
     * garde-fou, un visiteur pourrait signer « Conseiller » et le fil de
     * discussion deviendrait trompeur à la relecture.
     */
    function nomAffiche(revendique, estHote) {
      if (estHote) return 'Conseiller'; // le vrai hôte est nommé par son rôle
      var n = String(revendique || '').slice(0, 40).trim();
      if (!n) return 'Visiteur';
      if (/^conseiller$/i.test(n)) return n + ' (visiteur)';
      return n;
    }

    function ajouter(nom, texte, deMoi, estHote) {
      var ligne = el('div', 'lg-chat-msg' + (deMoi ? ' lg-chat-moi' : '') + (estHote ? ' lg-chat-hote' : ''));
      var qui = el('b', 'lg-chat-nom');
      qui.textContent = nom;
      var quoi = el('span', 'lg-chat-texte');
      // textContent et non innerHTML : un message est du texte, jamais du
      // balisage. C'est la seule barrière nécessaire ici.
      quoi.textContent = texte;
      ligne.appendChild(qui);
      ligne.appendChild(quoi);
      liste.appendChild(ligne);
      liste.scrollTop = liste.scrollHeight;
    }

    function majBouton() {
      bouton.textContent = nonLus ? '💬 Chat (' + nonLus + ')' : '💬 Chat';
      bouton.classList.toggle('lg-btn-on', nonLus > 0);
    }

    return { panneau: panneau, retirer: function () { removeEl(panneau); } };
  }

  /* ======================================================================
     UTILITAIRES
     ====================================================================== */
  function sig(channel, payload) {
    channel.trigger('client-webrtc', payload);
  }

  function buildIce() {
    var servers = [];
    if (CFG.stun) servers.push({ urls: CFG.stun });
    if (CFG.turn && CFG.turn.urls) servers.push(CFG.turn);
    if (!servers.length) servers.push({ urls: 'stun:stun.l.google.com:19302' });
    return { iceServers: servers };
  }

  function endSession() {
    SS.removeItem('lg_role');
    SS.removeItem('lg_session');
    SS.removeItem('lg_uid');
    SS.removeItem('lg_host_token');
    SS.removeItem('lg_code');
  }

  function persistIdentity() {
    SS.setItem('lg_role', role);
    SS.setItem('lg_session', session);
  }

  function scrollFraction() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  }

  // Retire les paramètres de contrôle d'une URL (lg, lghost).
  function cleanUrl(href) {
    var u = new URL(href, window.location.href);
    u.searchParams.delete('lg');
    u.searchParams.delete('lghost');
    return u.href;
  }

  // Compare deux URL en ignorant le hash de langue et les paramètres de contrôle.
  function normalize(href) {
    var u = new URL(href, window.location.href);
    u.searchParams.delete('lg');
    u.searchParams.delete('lghost');
    u.hash = '';
    return u.href;
  }

  function stripParam(name) {
    if (!window.history || !window.history.replaceState) return;
    var u = new URL(window.location.href);
    u.searchParams.delete(name);
    window.history.replaceState({}, '', u.href);
  }

  function absPath(rel) {
    return new URL((basePath || './') + rel, window.location.href).href;
  }

  // Racine du site + fichier (ex: https://site/…/index.html)
  function absUrl(file) {
    return new URL((basePath || './') + file, window.location.href).href;
  }

  function genId() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  }

  function sanitize(v) {
    return String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  }

  // Sélecteur CSS unique pour un élément (les DOM hôte/visiteur sont identiques).
  /**
   * Chemin CSS d'un élément, destiné à être rejoué chez le visiteur.
   *
   * Le chemin est ANCRÉ : il part d'un id, ou de <body>. Sans ancrage, un
   * sélecteur comme « div:nth-of-type(3) > button » désigne le premier
   * élément du document qui correspond — donc potentiellement un AUTRE que
   * celui visé. Faire cliquer le visiteur au mauvais endroit est pire que de
   * ne rien faire.
   *
   * La version précédente abandonnait au-delà de 8 niveaux et renvoyait le
   * fragment obtenu, flottant. Sur une grille de lots profondément imbriquée
   * — la page des disponibilités — la limite était atteinte presque partout.
   * On remonte désormais jusqu'au bout, et on renonce franchement si
   * l'élément est hors de portée : mieux vaut rien qu'un mauvais élément.
   */
  /**
   * Sélecteur bâti sur les attributs data-* de l'élément, s'il en désigne un
   * seul dans le document.
   *
   * Un chemin positionnel (:nth-of-type) suppose que l'arbre du visiteur est
   * rigoureusement identique à celui de l'hôte. C'est vrai sur une page
   * statique, faux sur une grille rendue dynamiquement : sur la page des
   * disponibilités, l'hôte a sélectionné R+3 de l'immeuble B et le visiteur a
   * basculé sur R+2 de l'immeuble A — le message passait, il désignait
   * simplement autre chose. Les repères posés par la page (data-lot,
   * data-etage + data-imm) survivent, eux, à toute différence de rendu.
   *
   * On essaie chaque attribut seul — data-lot suffit à identifier un logement
   * — puis leur combinaison, car un étage n'est unique que par data-etage ET
   * data-imm. L'unicité est vérifiée, jamais supposée.
   */
  function selecteurStable(el) {
    var attrs = el.attributes || [];
    var utiles = [];
    for (var i = 0; i < attrs.length; i++) {
      var nom = attrs[i].name;
      var val = attrs[i].value;
      if (nom.indexOf('data-') !== 0) continue;
      // Les drapeaux d'état (data-choix-actif="1") décrivent la situation du
      // moment, pas l'identité : ils diffèrent justement entre les deux écrans.
      if (val === '' || val === 'true' || val === 'false' || val === '0' || val === '1') continue;
      // Échappement des guillemets et antislashs : une valeur qui en contient
      // casserait le sélecteur.
      utiles.push('[' + nom + '=' + JSON.stringify(String(val)) + ']');
    }
    if (!utiles.length) return null;

    var tag = el.nodeName.toLowerCase();
    var essais = [];
    for (var j = 0; j < utiles.length; j++) essais.push(tag + utiles[j]);
    if (utiles.length > 1) essais.push(tag + utiles.join(''));

    for (var k = 0; k < essais.length; k++) {
      try {
        var trouves = document.querySelectorAll(essais[k]);
        if (trouves.length === 1 && trouves[0] === el) return essais[k];
      } catch (e) {}
    }
    return null;
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return null;
    if (el.id) return '#' + cssEscape(el.id);
    var stable = selecteurStable(el);
    if (stable) return stable;
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      if (parts.length >= 25) return null; // profondeur déraisonnable : on renonce
      var sel = el.nodeName.toLowerCase();
      if (el.id) { parts.unshift('#' + cssEscape(el.id)); return parts.join(' > '); }
      // Un ancêtre repérable ancre le chemin bien mieux que <body> : tout ce
      // qui est au-dessus de lui cesse de compter.
      var ancre = selecteurStable(el);
      if (ancre) { parts.unshift(ancre); return parts.join(' > '); }
      var parent = el.parentNode;
      if (parent && parent.children) {
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.nodeName === el.nodeName; });
        if (same.length > 1) sel += ':nth-of-type(' + (Array.prototype.indexOf.call(same, el) + 1) + ')';
      }
      parts.unshift(sel);
      el = parent;
    }
    // Remonté hors du document (élément détaché) : inexploitable chez le visiteur.
    if (el !== document.body) return null;
    parts.unshift('body');
    return parts.join(' > ');
  }

  // Un <a> qui ne quitte pas la page : ancre pure ("#", "#close") ou
  // pseudo-lien javascript:. C'est la forme que prennent les boutons Leaflet.
  function isFakeLink(a) {
    var href = a.getAttribute('href') || '';
    return href.charAt(0) === '#' || /^javascript:/i.test(href);
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function keyCount(o) { return Object.keys(o).length; }

  function forEachKey(o, fn) { Object.keys(o).forEach(fn); }

  function removeEl(node) { if (node && node.parentNode) node.parentNode.removeChild(node); }

  function noop() {}

  /**
   * Relève par quel chemin la voix est réellement passée, et le consigne.
   *
   * Un candidat `relay` d'un côté ou de l'autre veut dire que la connexion
   * n'aurait PAS abouti sans serveur TURN. C'est la seule façon honnête de
   * répondre à « faut-il en payer un ? » : par des chiffres tirés des vraies
   * visites, plutôt que par la fourchette de 20-30 % qu'on lit partout.
   *
   * On interroge périodiquement : la paire gagnante n'est désignée qu'une fois
   * la connexion établie, quelques secondes après l'offre.
   */
  function mesurerChemin(pc, quiSuisJe) {
    if (!pc || typeof pc.getStats !== 'function') return;

    var essais = 0;
    var horloge = setInterval(function () {
      essais++;
      // ~20 s de patience : au-delà, la connexion a échoué et il n'y a rien à
      // mesurer. On s'arrête aussi dès qu'elle est fermée.
      if (essais > 20 || pc.connectionState === 'closed' || pc.iceConnectionState === 'closed') {
        clearInterval(horloge);
        return;
      }
      pc.getStats(null).then(function (rapport) {
        var paire = null, candidats = {};
        rapport.forEach(function (s) {
          if (s.type === 'local-candidate' || s.type === 'remote-candidate') candidats[s.id] = s;
          // `selected` sur Firefox, `nominated` + `succeeded` sur Chromium.
          if (s.type === 'candidate-pair' && (s.selected || (s.nominated && s.state === 'succeeded'))) {
            paire = s;
          }
        });
        if (!paire) return;
        clearInterval(horloge);

        var l = candidats[paire.localCandidateId];
        var r = candidats[paire.remoteCandidateId];
        var local = (l && l.candidateType) || '';
        var distant = (r && r.candidateType) || '';
        if (!local || !distant) return;

        var relais = local === 'relay' || distant === 'relay';
        console.info('[LiveGuide] voix : ' + local + ' ↔ ' + distant +
                     (relais ? ' — a nécessité un relais TURN' : ' — connexion directe'));

        postForm('api/liveguide-session.php?action=ice',
                 { session: session, role: quiSuisJe, local: local, remote: distant }, noop);
      }).catch(noop);
    }, 1000);
  }

  // POST en formulaire vers l'API du site (PHP lit $_POST). cb reçoit la
  // réponse JSON, ou null si la requête a échoué.
  function postForm(rel, data, cb) {
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (k) { body.append(k, data[k]); });
    fetch(absPath(rel), { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      // Deux arguments plutôt qu'un .catch() : une erreur levée DANS cb ne doit
      // pas déclencher un second appel avec null.
      .then(function (j) { cb(j); }, function () { cb(null); });
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { cb(true); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }

  function copyText(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      cb(true);
    } catch (e) { cb(false); }
  }

  function throttle(fn, wait) {
    var last = 0, timer = null;
    return function () {
      var now = Date.now();
      var remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn();
      } else if (!timer) {
        timer = setTimeout(function () { last = Date.now(); timer = null; fn(); }, remaining);
      }
    };
  }

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
})();
