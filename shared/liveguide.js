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

  if (params.get('lghost') != null) {
    role = 'host';
    if (!session) session = genId();
    persistIdentity();
    stripParam('lghost'); // évite de re-déclencher / de partager ce paramètre
  } else if (params.get('lg')) {
    role = 'viewer';
    session = sanitize(params.get('lg'));
    persistIdentity();
    stripParam('lg'); // l'URL reste propre ; sessionStorage garde le rôle
  }

  // Ni hôte ni visiteur → visiteur normal : on ne charge rien.
  if (role !== 'host' && role !== 'viewer') return;

  if (!CFG.enabled) {
    if (role === 'host') {
      console.warn('[LiveGuide] Fonctionnalité désactivée : renseigner Pusher puis mettre enabled:true dans shared/liveguide-config.js');
    }
    return;
  }

  if (!userId) { userId = genId(); SS.setItem('lg_uid', userId); }

  // Configuration ICE pour la voix WebRTC.
  var ICE = buildIce();

  // ----- Chargement paresseux du SDK Pusher --------------------------------
  loadScript(PUSHER_SDK, function (ok) {
    if (!ok || typeof window.Pusher === 'undefined') {
      console.error('[LiveGuide] Impossible de charger le SDK Pusher.');
      return;
    }
    start();
  });

  // ----- Démarrage ---------------------------------------------------------
  function start() {
    var pusher = new window.Pusher(CFG.pusherKey, {
      cluster: CFG.pusherCluster,
      authEndpoint: absPath('api/pusher-auth.php'),
      auth: { params: { role: role, user_id: userId } }
    });

    var channelName = 'presence-lg-' + session;
    var channel = pusher.subscribe(channelName);

    hookPannellum(); // capture le visualiseur 360° pour synchroniser la vue

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
    var viewers = {};   // viewerId -> true
    var pcs = {};       // viewerId -> RTCPeerConnection (voix)
    var localStream = null;
    var micOn = false;

    // --- Présence + synchronisation de la navigation ---
    channel.bind('pusher:subscription_succeeded', function (members) {
      viewers = {};
      members.each(function (m) { if (m.id !== userId) viewers[m.id] = true; });
      updateCount(ui, keyCount(viewers));
      publishState(channel);
      if (micOn) forEachKey(viewers, startPeer);
    });
    channel.bind('pusher:member_added', function (m) {
      if (m.id !== userId) viewers[m.id] = true;
      updateCount(ui, keyCount(viewers));
      publishState(channel);        // resynchronise le nouvel arrivant
      if (micOn) startPeer(m.id);   // et lui envoie la voix si active
    });
    channel.bind('pusher:member_removed', function (m) {
      delete viewers[m.id];
      closePeer(m.id);
      updateCount(ui, keyCount(viewers));
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
      if (t.closest('.lg-hostbar') || t.closest('.lg-viewerbar') || t.closest('a[href]')) return;
      var sel = cssPath(t);
      if (sel) channel.trigger('client-action', { kind: 'click', selector: sel });
    }, true);

    // Diffusion de la vue panoramique Pannellum (angle + zoom) tant qu'un
    // panorama 360° est affiché. Envoi immédiat au changement + réémission
    // périodique (~1 s) : les client events Pusher étant best-effort, cette
    // réémission auto-répare un événement perdu (sinon désync permanente).
    var lastPano = '';
    var panoTicks = 0;
    var panoBeat = setInterval(function () {
      var v = window.LG_PANO;
      if (!v || typeof v.getYaw !== 'function') return;
      if (!document.querySelector('.pnlm-container')) return; // 360° pas à l'écran
      var y = Math.round(v.getYaw() * 10) / 10;
      var p = Math.round(v.getPitch() * 10) / 10;
      var h = Math.round(v.getHfov() * 10) / 10;
      var key = y + '|' + p + '|' + h;
      panoTicks++;
      if (key === lastPano && panoTicks % 3 !== 0) return; // inchangé : resync ~600ms
      lastPano = key;
      channel.trigger('client-action', { kind: 'pano', yaw: y, pitch: p, hfov: h });
    }, 200);

    // --- Voix : réception des réponses / ICE des visiteurs ---
    channel.bind('client-webrtc', function (msg) {
      if (!msg || msg.to !== userId) return;
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
        forEachKey(viewers, startPeer);
      }).catch(function () {
        ui.mic.textContent = '🎙️ Micro refusé';
      });
    });

    function startPeer(viewerId) {
      if (!micOn || !localStream || pcs[viewerId]) return;
      var pc = new RTCPeerConnection(ICE);
      pcs[viewerId] = pc;
      localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });
      pc.onicecandidate = function (ev) {
        if (ev.candidate) sig(channel, { type: 'ice', to: viewerId, from: userId, candidate: ev.candidate });
      };
      pc.createOffer()
        .then(function (offer) { return pc.setLocalDescription(offer); })
        .then(function () { sig(channel, { type: 'offer', to: viewerId, from: userId, sdp: pc.localDescription }); })
        .catch(noop);
    }

    function closePeer(id) {
      if (pcs[id]) { try { pcs[id].close(); } catch (e) {} delete pcs[id]; }
    }

    function stopVoice() {
      micOn = false;
      if (localStream) { localStream.getTracks().forEach(function (t) { t.stop(); }); localStream = null; }
      forEachKey(pcs, closePeer);
      ui.mic.textContent = '🎙️ Activer le micro';
      ui.mic.classList.remove('lg-btn-on');
    }

    // Fin de session : nettoyage complet.
    ui.end.addEventListener('click', function () {
      clearInterval(beat);
      clearInterval(panoBeat);
      window.removeEventListener('scroll', onScroll);
      stopVoice();
      endSession();
      removeEl(ui.bar);
      document.body.classList.remove('lg-has-bar');
    });
  }

  function publishState(channel) {
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
    var here = cleanUrl(window.location.href);
    var pc = null;       // connexion voix avec l'hôte
    var audioEl = null;

    // --- Suivi de la navigation de l'hôte ---
    channel.bind('client-state', function (data) {
      if (!data || !data.url) return;
      // Changement de page : on suit l'hôte.
      if (normalize(data.url) !== normalize(here)) {
        window.location.href = data.url; // sessionStorage garde le rôle visiteur
        return;
      }
      // Même page : on applique le scroll de l'hôte.
      if (typeof data.scroll === 'number') applyScroll(data.scroll);
    });

    channel.bind('pusher:subscription_error', function () {
      banner.status.textContent = 'Reconnexion…';
    });

    // --- Rejoue les actions de l'hôte : clics + vue panoramique 360° ---
    channel.bind('client-action', function (msg) {
      if (!msg) return;
      if (msg.kind === 'click' && msg.selector) {
        var elt;
        try { elt = document.querySelector(msg.selector); } catch (e) { return; }
        if (elt) elt.click();
        return;
      }
      if (msg.kind === 'pano') {
        var v = window.LG_PANO;
        if (!v || typeof v.setYaw !== 'function') return;
        try {
          if (v.stopAutoRotate) v.stopAutoRotate();
          v.setYaw(msg.yaw, false);
          v.setPitch(msg.pitch, false);
          v.setHfov(msg.hfov, false);
        } catch (e) {}
      }
    });

    // --- Voix : réception de l'offre de l'hôte ---
    channel.bind('client-webrtc', function (msg) {
      if (!msg || msg.to !== userId) return;
      if (msg.type === 'offer' && msg.sdp) {
        closePc();
        pc = new RTCPeerConnection(ICE);
        pc.onicecandidate = function (ev) {
          if (ev.candidate) sig(channel, { type: 'ice', to: msg.from, from: userId, candidate: ev.candidate });
        };
        pc.ontrack = function (ev) { attachAudio(ev.streams[0]); };
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          .then(function () { return pc.createAnswer(); })
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

    function closePc() { if (pc) { try { pc.close(); } catch (e) {} pc = null; } }

    banner.leave.addEventListener('click', function () {
      closePc();
      endSession();
      window.location.href = cleanUrl(window.location.href); // reste sur la page, sans suivre
    });
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
    var viewerLink = absUrl('index.html') + '?lg=' + session;

    var status = el('span', 'lg-status');
    status.textContent = 'Visite guidée active';

    var count = el('span', 'lg-count');
    count.innerHTML = '<span class="lg-dot"></span><b>0</b> spectateur(s)';

    var mic = el('button', 'lg-btn lg-btn-ghost');
    mic.type = 'button';
    mic.textContent = '🎙️ Activer le micro';

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
    bar.appendChild(mic);
    bar.appendChild(copy);
    bar.appendChild(end);
    document.body.appendChild(bar);
    document.body.classList.add('lg-has-bar');

    return { bar: bar, status: status, count: count, mic: mic, copy: copy, end: end };
  }

  function updateCount(ui, n) {
    ui.count.innerHTML = '<span class="lg-dot"></span><b>' + n + '</b> spectateur(s)';
  }

  function buildViewerBanner() {
    var bar = el('div', 'lg-viewerbar');

    var status = el('span', 'lg-status');
    status.innerHTML = '<span class="lg-dot"></span> Visite guidée en cours — votre écran suit le conseiller';

    var sound = el('button', 'lg-btn lg-btn-primary');
    sound.type = 'button';
    sound.textContent = '🔊 Activer le son';
    sound.style.display = 'none'; // affiché seulement si l'autoplay est bloqué

    var leave = el('button', 'lg-btn lg-btn-ghost');
    leave.type = 'button';
    leave.textContent = 'Quitter';

    bar.appendChild(status);
    bar.appendChild(sound);
    bar.appendChild(leave);
    document.body.appendChild(bar);
    document.body.classList.add('lg-has-bar');

    return { bar: bar, status: status, sound: sound, leave: leave };
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
  function cssPath(el) {
    if (!(el instanceof Element)) return null;
    if (el.id) return '#' + cssEscape(el.id);
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 8) {
      var sel = el.nodeName.toLowerCase();
      if (el.id) { parts.unshift('#' + cssEscape(el.id)); break; }
      var parent = el.parentNode;
      if (parent && parent.children) {
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.nodeName === el.nodeName; });
        if (same.length > 1) sel += ':nth-of-type(' + (Array.prototype.indexOf.call(same, el) + 1) + ')';
      }
      parts.unshift(sel);
      el = parent;
    }
    return parts.join(' > ');
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function keyCount(o) { return Object.keys(o).length; }

  function forEachKey(o, fn) { Object.keys(o).forEach(fn); }

  function removeEl(node) { if (node && node.parentNode) node.parentNode.removeChild(node); }

  function noop() {}

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
