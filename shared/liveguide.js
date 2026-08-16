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

  // ----- Identifiants, puis chargement paresseux du SDK Pusher -------------
  // Rien n'est chargé tant qu'on n'a pas de quoi entrer : le conseiller doit
  // obtenir sa session du serveur, le visiteur doit avoir saisi son code.
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
      var key = sc + '|' + y + '|' + p + '|' + h;
      panoTicks++;
      if (key === lastPano && panoTicks % 3 !== 0) return; // inchangé : resync ~600ms
      lastPano = key;
      channel.trigger('client-action', { kind: 'pano', scene: sc, yaw: y, pitch: p, hfov: h });
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

    // --- Qui est le conseiller ? ---
    // Le rôle vient de channel_data, signé par api/pusher-auth.php : le serveur
    // ne l'accorde qu'au porteur du jeton hôte, un navigateur ne peut donc pas
    // s'en réclamer. C'est ce qui rend le filtre ci-dessous digne de confiance.
    channel.bind('pusher:subscription_succeeded', function (members) {
      members.each(function (m) { if (m.info && m.info.role === 'host') hostUid = m.id; });
    });
    channel.bind('pusher:member_added', function (m) {
      if (m.info && m.info.role === 'host') hostUid = m.id;
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
    var viewerLink = absUrl('index.html') + '?lg=' + session;

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
    bar.appendChild(copy);
    bar.appendChild(end);
    document.body.appendChild(bar);
    document.body.classList.add('lg-has-bar');
    document.body.classList.add('lg-host'); // barre plus haute : voir liveguide.css

    return { bar: bar, status: status, count: count, code: codeBox, mic: mic, copy: copy, end: end };
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
    box.appendChild(err);
    box.appendChild(submit);
    box.appendChild(cancel);
    ov.appendChild(box);
    document.body.appendChild(ov);
    input.focus();
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
