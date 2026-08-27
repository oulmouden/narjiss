(function () {
  'use strict';

  var API = 'api/';
  var me = null;              // agent connecté
  var hbTimer = null;         // battement de présence
  var pollTimer = null;       // poll des demandes d'accès
  var teamTimer = null;       // rafraîchissement équipe (gestionnaire)
  var curPresence = 'en_ligne';
  var seenApproved = {};      // request_id -> code déjà affiché
  var callRoom = null;        // room LiveKit d'appel direct en cours
  var msgTimer = null;        // rafraîchissement de la messagerie
  var msgFilter = 'actifs';   // onglet courant de la messagerie
  var msgOpenId = null;       // message ouvert (on suspend le rafraîchissement)

  function $(id) { return document.getElementById(id); }
  function show(el, on) { if (el) el.classList.toggle('hide', !on); }

  /* ── Langue ─────────────────────────────────────────────────────────────
     Les libellés vivent dans espace-agent-i18n.js ; shared/backoffice-i18n.js
     fournit la langue courante, les boutons et le parcours du balisage. Le
     repli sur le français couvre le cas où l'un des deux fichiers manque :
     la page reste utilisable, simplement pas traduite. */
  function T(cle, vars) {
    if (window.NJ_LANG && window.EA_TEXTES) return window.NJ_LANG.t(window.EA_TEXTES, cle, vars);
    var fr = (window.EA_TEXTES && window.EA_TEXTES.fr) || {};
    return fr[cle] !== undefined ? fr[cle] : cle;
  }

  /* Message d'erreur du serveur.
     api/agent-auth.php renvoie un CODE en plus de sa phrase française : sans
     lui, un agent arabophone lisait « Compte suspendu… » en français au moment
     le plus ingrat, celui où il n'entre pas. Les points d'entrée qui n'en
     envoient pas (encore) laissent passer leur phrase telle quelle — mieux
     qu'un message générique qui perdrait la raison du refus. */
  function messageErreur(r, cleDefaut) {
    if (r && r.code) {
      var cle = 'err' + String(r.code).charAt(0).toUpperCase() + String(r.code).slice(1);
      var fr = (window.EA_TEXTES && window.EA_TEXTES.fr) || {};
      if (fr[cle] !== undefined) return T(cle);
    }
    return (r && r.error) || T(cleDefaut);
  }

  function post(url, body) {
    var data = new URLSearchParams(body || {});
    return fetch(API + url, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString()
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }
  function get(url) {
    return fetch(API + url, { credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }

  /* ── Liste des bureaux pour l'inscription ──────────────────────────────── */
  function loadProjects() {
    fetch('data/projects.json').then(function (r) { return r.json(); }).then(function (list) {
      var sel = $('rgProjet');
      if (!sel || !Array.isArray(list)) return;
      sel.innerHTML = '<option value="">' + esc(T('choisir')) + '</option>';
      list.forEach(function (p) {
        if (!p.id) return;
        var name = (p.name && (p.name.fr || p.name.en)) || p.id;
        var o = document.createElement('option');
        o.value = p.id; o.textContent = name;
        sel.appendChild(o);
      });
    }).catch(function () {});
  }

  /* ── Bascule connexion / inscription ───────────────────────────────────── */
  function setTab(which) {
    $('tabLogin').classList.toggle('active', which === 'login');
    $('tabReg').classList.toggle('active', which === 'reg');
    show($('formLogin'), which === 'login');
    show($('formReg'), which === 'reg');
  }

  /* ── Rendu de l'état connecté / déconnecté ─────────────────────────────── */
  function renderAuth(agent) {
    me = agent;
    var authed = !!agent;
    show($('authSection'), !authed);
    show($('appSection'), authed);
    show($('whoBox'), authed);
    // Retour au site public. Caché tant qu'on n'est pas connecté : hors session,
    // il ne mènerait qu'au site ordinaire, sans rien de plus que le menu.
    show($('gotoSiteBtn'), authed);
    show($('logoutBtn'), authed);
    stopLoops();

    if (!authed) { setTab('login'); return; }

    majQui();

    // Commercial + superviseur : présence + demandes de visiteurs.
    // Gestionnaire + superviseur : gestion d'équipe. Le superviseur cumule les deux.
    var canReceive = agent.role === 'commercial' || agent.role === 'superviseur';
    var canManage  = agent.role === 'gestionnaire' || agent.role === 'superviseur';
    show($('reqCard'), canReceive);
    show($('teamCard'), canManage);

    // Le battement de présence part pour TOUS les rôles : c'est lui qui rend
    // « connecté » visible, à soi comme aux autres. Les demandes d'accès des
    // visiteurs, elles, ne concernent que ceux qui peuvent les recevoir.
    setPresence('en_ligne', true);
    startLoops(canReceive);
    if (canManage) { loadTeam(); teamTimer = setInterval(loadTeam, 8000); }

    // Messagerie : chacun sur son périmètre (son bureau, ou tous les bureaux
    // pour un gestionnaire ou un superviseur).
    renderMsgTabs();
    loadMessages();
    msgTimer = setInterval(function () { if (!msgOpenId) loadMessages(); }, 15000);
  }

  /* En-tête : nom, rôle, bureau. Extrait de renderAuth pour être rejoué seul
     au changement de langue — renderAuth, lui, relance les boucles et
     remettrait la présence à « en ligne », effaçant un « occupé » choisi. */
  function majQui() {
    if (!me) return;
    $('whoName').textContent = me.name;
    $('whoMeta').textContent = roleLabel(me.role) +
      (me.projet ? ' · ' + me.projet
                 : (me.role === 'superviseur' ? ' · ' + T('tousBureaux') : ''));
  }

  /* Le site public tient sa langue dans le hash : sans lui, un commercial qui
     travaille en arabe retombait sur un site en français en cliquant « Aller au
     site ». On la lui emporte. */
  function majLienSite() {
    var a = $('gotoSiteBtn');
    if (a && window.NJ_LANG) a.href = 'index.html#' + window.NJ_LANG.courante();
  }

  function roleLabel(role) {
    return role === 'superviseur' ? T('roleSuperviseurL')
         : role === 'gestionnaire' ? T('roleGestionnaireL')
         : T('roleCommercialL');
  }

  /* Rejoue tous les libellés dans la nouvelle langue, sans rien réinitialiser :
     ni la présence choisie, ni le message ouvert, ni un code déjà donné. */
  function retraduire() {
    if (window.NJ_LANG && window.EA_TEXTES) window.NJ_LANG.traduire(window.EA_TEXTES);
    majLienSite();
    if (!me) return;                    // écran de connexion : tout est statique
    majQui();
    renderMsgTabs();
    if (msgOpenId) openMessage(msgOpenId); else loadMessages();

    // Demandes de visiteurs : celles qui portent un code sont redessinées sur
    // place (le code est déjà entre les mains du visiteur, on ne le rejoue
    // pas) ; les autres repartiront au prochain sondage, dans 4 s.
    var host = $('reqList');
    if (host) Array.prototype.slice.call(host.children).forEach(function (el) {
      var appr = seenApproved[el.getAttribute('data-id')];
      if (appr) remplirCarteApprouvee(el, el.getAttribute('data-id'), appr.visitor, appr.code);
      else el.remove();
    });

    if (callRoom) $('callText').textContent = T('enRelationVocale');
    heartbeat();                        // « En ligne / Hors ligne »
    if (me.role === 'gestionnaire' || me.role === 'superviseur') loadTeam();
  }

  function stopLoops() {
    [hbTimer, pollTimer, teamTimer, msgTimer].forEach(function (t) { if (t) clearInterval(t); });
    hbTimer = pollTimer = teamTimer = msgTimer = null;
    stopRepRec();
    hangup();
  }

  function startLoops(withRequests) {
    heartbeat();
    hbTimer = setInterval(heartbeat, 6000);
    // Le TTL de présence est de 20 s côté serveur : battre toutes les 6 s laisse
    // le droit de rater deux appels avant de passer pour hors ligne.
    if (!withRequests) return;
    pollRequests();
    pollTimer = setInterval(pollRequests, 4000);
  }

  /* =========================================================================
     MESSAGERIE DU BUREAU
     Les visiteurs laissent un message quand personne n'est joignable. On
     l'écoute, on le lit, puis on rappelle : chaque suite donnée est journalisée
     pour que l'équipe voie ce qui a déjà été tenté.
     ========================================================================= */
  // Filtres et statuts portent des CLÉS et non des libellés : le texte est
  // relu à chaque rendu, donc juste après une bascule de langue.
  var MSG_TABS = [
    ['actifs', 'ongletActifs'], ['nouveau', 'ongletNouveaux'], ['ecoute', 'ongletEcoutes'],
    ['traite', 'ongletTraites'], ['archive', 'ongletArchives'], ['', 'ongletTous']
  ];
  var MSG_STATUTS = { nouveau: 'statNouveau', ecoute: 'statEcoute', traite: 'statTraite', archive: 'statArchive' };
  function statutMsg(s) { return MSG_STATUTS[s] ? T(MSG_STATUTS[s]) : s; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function mmss(sec) {
    sec = Math.max(0, parseInt(sec, 10) || 0);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function quand(iso) {
    var d = new Date(String(iso).replace(' ', 'T'));
    // La date suit la langue de l'agent : un arabophone lit ses dates en
    // arabe, comme le reste de son écran.
    var loc = window.NJ_LANG ? window.NJ_LANG.locale() : 'fr-FR';
    return isNaN(d) ? '' : d.toLocaleString(loc, { dateStyle: 'short', timeStyle: 'short' });
  }

  function renderMsgTabs() {
    var host = $('msgTabs');
    if (!host) return;
    host.innerHTML = '';
    MSG_TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = T(t[1]);
      b.className = t[0] === msgFilter ? 'active' : '';
      b.onclick = function () { msgFilter = t[0]; msgOpenId = null; renderMsgTabs(); loadMessages(); };
      host.appendChild(b);
    });
  }

  function loadMessages() {
    get('messages-agent.php?action=list&statut=' + encodeURIComponent(msgFilter)).then(function (r) {
      if (!r || !r.ok) return;
      var badge = $('msgBadge');
      if (badge) {
        badge.textContent = r.nouveaux ? T('badgeNouveaux', { n: r.nouveaux }) : '';
        show(badge, !!r.nouveaux);
      }
      renderMessages(r.messages || []);
    });
  }

  function renderMessages(list) {
    var host = $('msgList');
    if (!host) return;
    host.innerHTML = '';
    show($('msgEmpty'), !list.length);
    list.forEach(function (m) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'mrow ' + m.statut;
      var apercu = m.message || m.transcription || '';
      row.innerHTML =
        '<div class="mi">' +
          '<div class="mn">' + esc(m.nom || T('visiteurAnonyme')) +
            ' <span class="mtag ' + esc(m.statut) + '">' + esc(statutMsg(m.statut)) + '</span>' +
            (m.pris_nom ? ' <span class="mtag">🙋 ' + esc(m.pris_nom) + '</span>' : '') + '</div>' +
          '<div class="mc">' + esc(m.tel_affiche || m.email || '') +
            (m.duree_s ? ' · 🎧 ' + mmss(m.duree_s) : '') +
            (m.projet_nom ? ' · ' + esc(m.projet_nom) : '') + '</div>' +
          (apercu ? '<div class="mx">' + esc(apercu) + '</div>' : '') +
        '</div>' +
        '<span class="md">' + esc(quand(m.date)) + '</span>';
      row.onclick = function () { openMessage(m.id); };
      host.appendChild(row);
    });
  }

  function openMessage(id) {
    get('messages-agent.php?action=detail&id=' + id).then(function (r) {
      if (!r || !r.ok) return;
      msgOpenId = id;
      renderMsgDetail(r.message, r.journal || []);
    });
  }

  function closeMessage() {
    msgOpenId = null;
    stopRepRec();
    show($('msgDetail'), false);
    show($('msgList'), true);
    loadMessages();
  }

  /* Journalise une suite donnée, puis laisse le lien s'ouvrir normalement. */
  function journalMsg(id, type, detail) {
    post('messages-agent.php', { action: 'journal', id: id, type: type, detail: detail || '' })
      .then(function () { /* silencieux : l'appel part de toute façon */ });
  }

  function renderMsgDetail(m, journal) {
    var host = $('msgDetail');
    if (!host) return;
    show($('msgList'), false);
    show(host, true);

    var peutSupprimer = me && (me.role === 'gestionnaire' || me.role === 'superviseur');
    var h = '<div class="mdet">';
    h += '<h3>' + esc(m.nom || T('visiteurAnonyme')) +
         ' <span class="mtag ' + esc(m.statut) + '">' + esc(statutMsg(m.statut)) + '</span></h3>';
    h += '<div style="font-size:.9rem;line-height:1.7">';
    if (m.tel_affiche) h += '<b>' + esc(m.tel_affiche) + '</b>' +
      (m.tel_brut ? ' <span style="color:#8a95a6">(' + esc(T('dicte', { x: m.tel_brut })) + ')</span>' : '') + '<br>';
    if (m.email) h += '<b>' + esc(m.email) + '</b><br>';
    h += esc(quand(m.date)) + ' · ' + esc(m.projet_nom) + ' · ' + esc(m.langue.toUpperCase()) +
         (m.canal === 'hotesse' ? ' · ' + esc(T('prisParHotesse')) : '') + '</div>';

    if (m.audio) h += '<audio controls preload="metadata" src="' + esc(m.audio) + '"></audio>';
    if (m.message) h += '<div class="corps"><span class="etiq">' + esc(T('messageEcrit')) + '</span>' + esc(m.message) + '</div>';
    if (m.transcription) h += '<div class="corps auto"><span class="etiq">' + esc(T('transcriptionAuto')) + '</span>' +
      esc(m.transcription) + '</div>';

    // Prise en charge : le premier qui la déclare évite le double rappel.
    h += '<div class="acts">';
    if (!m.pris_nom) h += '<button class="btn sm ok" data-act="prise">' + esc(T('jeMenOccupe')) + '</button>';
    else h += '<span class="mtag">🙋 ' + esc(T('senOccupe', { nom: m.pris_nom })) + '</span>';
    h += '</div>';

    h += '<div class="acts">';
    if (m.lien_tel) {
      h += '<a class="btn sm tel" href="' + esc(m.lien_tel) + '" data-j="rappel">' + esc(T('btnRappeler')) + '</a>' +
           '<a class="btn sm wa" href="' + esc(m.lien_wa) + '" target="_blank" rel="noopener" data-j="whatsapp" id="mWa">' + esc(T('btnWhatsapp')) + '</a>' +
           '<a class="btn sm ghost" href="' + esc(m.lien_sms) + '" data-j="sms" id="mSms">' + esc(T('btnSms')) + '</a>';
    }
    if (m.lien_mail) h += '<a class="btn sm ghost" href="' + esc(m.lien_mail) + '" data-j="email">' + esc(T('btnEmail')) + '</a>';
    if (!m.lien_tel && !m.lien_mail) h += '<span style="color:#8a95a6;font-size:.9rem">' + esc(T('aucuneCoordonnee')) + '</span>';
    h += '</div>';

    if (m.lien_tel) {
      h += '<div class="bloc"><h3>' + esc(T('messageEcritWaSms')) + '</h3>' +
           '<textarea id="mPrefill">' + esc(m.prefill) + '</textarea>' +
           '<div style="font-size:.8rem;color:#8a95a6;margin-top:.3rem">' + esc(T('modifiezTexte')) + '</div></div>';
    }

    h += '<div class="bloc"><h3>' + esc(T('reponseVocale')) + '</h3>' +
         '<div style="font-size:.85rem;color:#54627a;margin-bottom:.5rem">' + esc(T('reponseVocaleAide')) + '</div>' +
         '<div class="acts"><button class="btn sm ghost" data-act="rec">' + esc(T('enregistrer')) + '</button>' +
         '<span id="mChrono" style="font-variant-numeric:tabular-nums;font-weight:700">0:00</span>' +
         '<button class="btn sm" data-act="send-vocal" disabled>' + esc(T('envoyerReponse')) + '</button></div>' +
         '<audio id="mRepPlay" controls style="display:none"></audio>' +
         '<div id="mRepOut" style="font-size:.85rem"></div></div>';

    h += '<div class="bloc"><h3>' + esc(T('noteInterne')) + '</h3>' +
         '<textarea id="mNote" placeholder="' + esc(T('notePlaceholder')) + '">' + esc(m.notes || '') + '</textarea>' +
         '<div class="acts"><button class="btn sm ghost" data-act="note">' + esc(T('enregistrerNote')) + '</button></div></div>';

    h += '<div class="bloc"><h3>' + esc(T('classer')) + '</h3><div class="acts">';
    ['traite', 'archive', 'nouveau'].forEach(function (s) {
      if (m.statut === s) return;
      h += '<button class="btn sm ghost" data-statut="' + s + '">' +
           esc(T(s === 'traite' ? 'marquerTraite' : s === 'archive' ? 'archiver' : 'remettreNouveau')) + '</button>';
    });
    if (peutSupprimer) h += '<button class="btn sm danger" data-act="suppr">' + esc(T('supprimer')) + '</button>';
    h += '<button class="btn sm ghost" data-act="close">' + esc(T('retourListe')) + '</button></div></div>';

    if (journal.length) {
      h += '<div class="bloc"><h3>' + esc(T('suitesDonnees')) + '</h3>';
      journal.forEach(function (j) {
        var cleJ = { rappel: 'jRappel', whatsapp: 'jWhatsapp', sms: 'jSms', email: 'jEmail',
                     vocal: 'jVocal', note: 'jNote', statut: 'jStatut', prise: 'jPrise' }[j.type];
        var lbl = cleJ ? T(cleJ) : j.type;
        h += '<div class="jr"><b>' + esc(lbl) + '</b> <span class="q">' + esc(quand(j.date)) +
             (j.agent ? ' · ' + esc(j.agent) : '') + '</span>' +
             (j.detail ? '<div style="color:#54627a">' + esc(j.detail) + '</div>' : '');
        if (j.audio) h += '<audio controls preload="none" src="' + esc(j.audio) + '" style="width:100%;margin-top:.3rem"></audio>';
        if (j.lien) h += '<div class="lien-copie"><input type="text" readonly value="' + esc(j.lien) + '" onclick="this.select()"></div>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    host.innerHTML = h;

    // ── Câblage ──
    var prefill = $('mPrefill');
    if (prefill) prefill.oninput = function () {
      var t = encodeURIComponent(prefill.value);
      var wa = $('mWa'), sms = $('mSms');
      if (wa) wa.href = 'https://wa.me/' + m.telephone.replace(/\D/g, '') + '?text=' + t;
      if (sms) sms.href = 'sms:' + m.telephone + '?body=' + t;
    };

    host.querySelectorAll('[data-j]').forEach(function (a) {
      a.addEventListener('click', function () {
        var type = a.getAttribute('data-j');
        journalMsg(m.id, type, type === 'rappel' || !prefill ? '' : prefill.value.slice(0, 255));
      });
    });

    host.querySelectorAll('[data-statut]').forEach(function (b) {
      b.onclick = function () {
        post('messages-agent.php', { action: 'statut', id: m.id, valeur: b.getAttribute('data-statut') })
          .then(function () { openMessage(m.id); });
      };
    });

    var act = function (name) { return host.querySelector('[data-act="' + name + '"]'); };
    if (act('prise')) act('prise').onclick = function () {
      post('messages-agent.php', { action: 'prise', id: m.id }).then(function (r) {
        if (r && !r.ok && (r.error || r.code)) alert(messageErreur(r, 'errServeur'));
        openMessage(m.id);
      });
    };
    if (act('note')) act('note').onclick = function () {
      post('messages-agent.php', { action: 'note', id: m.id, note: $('mNote').value }).then(function () { openMessage(m.id); });
    };
    if (act('suppr')) act('suppr').onclick = function () {
      if (!confirm(T('confirmSuppression'))) return;
      post('messages-agent.php', { action: 'supprimer', id: m.id }).then(function () { closeMessage(); });
    };
    if (act('close')) act('close').onclick = closeMessage;

    wireRepRec(m.id, act('rec'), act('send-vocal'));
  }

  /* ── Réponse vocale enregistrée depuis le poste du commercial ──────────── */
  var repRec = null, repChunks = [], repBlob = null, repFlux = null, repTic = null, repSec = 0;

  function stopRepRec() {
    if (repRec && repRec.state === 'recording') { try { repRec.stop(); } catch (e) {} }
    if (repFlux) { repFlux.getTracks().forEach(function (t) { t.stop(); }); repFlux = null; }
    if (repTic) { clearInterval(repTic); repTic = null; }
    repRec = null; repBlob = null; repChunks = []; repSec = 0;
  }

  function wireRepRec(messageId, btnRec, btnSend) {
    if (!btnRec || !btnSend) return;
    stopRepRec();
    var chrono = $('mChrono'), player = $('mRepPlay'), out = $('mRepOut');
    function tick() { chrono.textContent = mmss(repSec); }

    btnRec.onclick = async function () {
      if (repRec && repRec.state === 'recording') { repRec.stop(); return; }
      if (!(navigator.mediaDevices && window.MediaRecorder)) { out.textContent = T('pasEnregistrement'); return; }
      try { repFlux = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { out.textContent = T('microRefuse'); return; }
      var mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find(function (x) { return MediaRecorder.isTypeSupported(x); }) || '';
      repRec = mime ? new MediaRecorder(repFlux, { mimeType: mime }) : new MediaRecorder(repFlux);
      repChunks = [];
      repRec.ondataavailable = function (e) { if (e.data && e.data.size) repChunks.push(e.data); };
      repRec.onstop = function () {
        if (repFlux) { repFlux.getTracks().forEach(function (t) { t.stop(); }); repFlux = null; }
        if (repTic) { clearInterval(repTic); repTic = null; }
        repBlob = new Blob(repChunks, { type: repRec.mimeType || 'audio/webm' });
        player.src = URL.createObjectURL(repBlob);
        player.style.display = 'block';
        btnRec.textContent = T('recommencer');
        btnSend.disabled = false;
      };
      repSec = 0; tick(); repRec.start();
      btnRec.textContent = T('arreter');
      out.textContent = '';
      repTic = setInterval(function () { repSec++; tick(); if (repSec >= 180) repRec.stop(); }, 1000);
    };

    btnSend.onclick = function () {
      if (!repBlob) return;
      btnSend.disabled = true;
      var fd = new FormData();
      fd.append('action', 'vocal');
      fd.append('id', messageId);
      fd.append('duree', String(repSec));
      fd.append('audio', repBlob, 'reponse.' + (repBlob.type.indexOf('mp4') >= 0 ? 'm4a' : 'webm'));
      fetch(API + 'messages-agent.php', { method: 'POST', credentials: 'same-origin', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (!r || !r.ok) { out.textContent = messageErreur(r, 'echecEnvoi'); btnSend.disabled = false; return; }
          stopRepRec();
          openMessage(messageId);
        })
        .catch(function () { out.textContent = T('echecEnvoi'); btnSend.disabled = false; });
    };
  }

  /* ── Présence ──────────────────────────────────────────────────────────── */
  function setPresence(state, silent) {
    curPresence = state;
    var btns = document.querySelectorAll('.pstate');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-state') === state);
    }
    if (!silent) heartbeat();
  }

  function heartbeat() {
    // Tous les rôles battent, gestionnaires compris. Sans ça un gestionnaire
    // n'apparaissait jamais connecté — ni pour les autres, ni dans sa propre
    // carte « Ma présence », dont le point restait gris et le texte figé
    // sur « … ». Le battement est ce qui rend la présence visible.
    if (!me) return;
    post('agent-presence.php', { presence: curPresence }).then(function (r) {
      var dot = $('onlineDot'), txt = $('onlineText');
      if (r && r.ok) {
        dot.classList.add('on');
        txt.textContent = T('enLigne');
      } else {
        dot.classList.remove('on');
        txt.textContent = T('horsLigne');
      }
    });
  }

  /* ── Demandes d'accès ──────────────────────────────────────────────────── */
  function pollRequests() {
    get('agent-access.php?action=pending').then(function (r) {
      if (!r || !r.ok) return;
      renderRequests(r.requests || []);
    });
  }

  function renderRequests(list) {
    var host = $('reqList');
    show($('reqEmpty'), list.length === 0);
    // On ne re-render que les demandes encore en attente ; les cartes
    // « approuvées » (avec code) restent affichées via seenApproved.
    var keepIds = {};
    list.forEach(function (req) { keepIds[req.id] = true; });

    // Retire les cartes dont la demande n'est plus en attente ET non approuvée localement.
    Array.prototype.slice.call(host.children).forEach(function (el) {
      var id = el.getAttribute('data-id');
      if (!keepIds[id] && !seenApproved[id]) el.remove();
    });

    list.forEach(function (req) {
      if (host.querySelector('[data-id="' + req.id + '"]')) return;
      host.appendChild(buildReqCard(req));
    });
  }

  function buildReqCard(req) {
    var card = document.createElement('div');
    card.className = 'req';
    card.setAttribute('data-id', req.id);
    card.innerHTML =
      '<div>🔔 <span class="vis"></span> ' + esc(T('souhaiteRecu')) + '</div>' +
      '<div class="acts">' +
        '<button class="btn ok sm" data-act="ok">' + esc(T('autoriser')) + '</button>' +
        '<button class="btn danger sm" data-act="no">' + esc(T('refuser')) + '</button>' +
      '</div>';
    card.querySelector('.vis').textContent = req.visitor;
    card.querySelector('[data-act="ok"]').onclick = function () { approve(req, card); };
    card.querySelector('[data-act="no"]').onclick = function () { deny(req, card); };
    return card;
  }

  function approve(req, card) {
    post('agent-access.php', { action: 'approve', request_id: req.id }).then(function (r) {
      if (!r || !r.ok) { card.remove(); return; }
      // Le nom est gardé à côté du code : c'est ce qui permet de redessiner
      // la carte dans une autre langue sans rien redemander au serveur.
      seenApproved[req.id] = { code: r.code, visitor: req.visitor };
      remplirCarteApprouvee(card, req.id, req.visitor, r.code);
    });
  }

  function remplirCarteApprouvee(card, reqId, visitor, code) {
    card.style.borderLeftColor = 'var(--ok)';
    card.innerHTML =
      '<div>✅ ' + T('accesAutorise', { nom: '<b>' + esc(visitor) + '</b>' }) + '</div>' +
      '<div class="code"></div>' +
      '<div class="hint">' + esc(T('communiquezCode')) + '</div>' +
      '<div class="acts"><button class="btn sm" data-act="join">' + esc(T('rejoindreVisiteur')) + '</button></div>';
    card.querySelector('.code').textContent = code;
    card.querySelector('[data-act="join"]').onclick = function () { joinCall(reqId); };
  }

  function deny(req, card) {
    post('agent-access.php', { action: 'deny', request_id: req.id }).then(function () { card.remove(); });
  }

  /* ── Appel direct LiveKit (côté commercial) ────────────────────────────── */
  function joinCall(reqId) {
    var LK = window.LivekitClient;
    if (!LK) return;
    post('agent-access.php', { action: 'join', request_id: reqId }).then(function (r) {
      if (!r || !r.ok || !r.token) return;
      hangup();
      callRoom = new LK.Room();
      callRoom.on(LK.RoomEvent.TrackSubscribed, function (track) {
        if (track.kind !== 'audio') return;
        var el = track.attach(); el.autoplay = true; el.style.display = 'none';
        document.body.appendChild(el);
      }).on(LK.RoomEvent.TrackUnsubscribed, function (track) {
        track.detach().forEach(function (el) { el.remove(); });
      }).on(LK.RoomEvent.Disconnected, function () { callRoom = null; show($('callBox'), false); });

      callRoom.connect(r.url, r.token).then(function () {
        return callRoom.localParticipant.setMicrophoneEnabled(true);
      }).then(function () {
        $('callText').textContent = T('enRelationVocale');
        show($('callBox'), true);
      }).catch(function () { hangup(); });
    });
  }

  function hangup() {
    if (callRoom) { try { callRoom.disconnect(); } catch (e) {} callRoom = null; }
    show($('callBox'), false);
  }

  /* ── Équipe (gestionnaire) ─────────────────────────────────────────────── */
  function loadTeam() {
    get('agent-auth.php?action=team').then(function (r) {
      if (!r || !r.ok) return;
      var body = $('teamBody');
      body.innerHTML = '';
      (r.agents || []).forEach(function (a) {
        if (a.id === me.id) return; // ne pas s'auto-gérer
        var tr = document.createElement('tr');
        tr.setAttribute('data-agent-id', a.id); // clé d'appariement de la présence
        // Trois rôles, pas deux : un superviseur s'affichait « Commercial ».
        tr.innerHTML =
          '<td></td>' +
          '<td>' + esc(roleLabel(a.role)) + '</td>' +
          '<td><span class="pill ' + a.statut + '">' + statutLabel(a.statut) + '</span></td>' +
          '<td class="pcell">—</td>' +
          '<td class="actcell"></td>';
        tr.children[0].textContent = a.name;
        var act = tr.querySelector('.actcell');
        if (a.statut === 'pending') {
          act.appendChild(mkBtn(T('valider'), 'ok', function () { setStatus(a.id, 'active'); }));
        } else if (a.statut === 'active') {
          act.appendChild(mkBtn(T('suspendre'), 'danger', function () { setStatus(a.id, 'suspended'); }));
        } else {
          act.appendChild(mkBtn(T('reactiver'), 'ok', function () { setStatus(a.id, 'active'); }));
        }
        body.appendChild(tr);
      });
      refreshTeamPresence();
    });
  }

  /**
   * Remplit la colonne « Présence » de la table d'équipe.
   *
   * Passe par ?equipe=1 et non par le roster ?projet= : ce dernier est le roster
   * PUBLIC d'un bureau, qui ne contient que les commerciaux et les superviseurs.
   * Il laissait donc trois angles morts, qui se cumulaient jusqu'à vider la
   * colonne entièrement pour un gestionnaire sans bureau :
   *   - il exigeait un projet, et sortait sans rien faire quand me.projet était
   *     vide — le cas de l'admin ;
   *   - il ne renvoyait aucun gestionnaire, donc aucun n'apparaissait connecté ;
   *   - l'appariement se faisait sur le NOM affiché, que deux homonymes
   *     suffisaient à confondre.
   * L'identifiant règle le troisième point, ?equipe=1 les deux premiers.
   */
  function refreshTeamPresence() {
    if (!me) return;
    get('agent-presence.php?equipe=1').then(function (r) {
      if (!r || !r.ok) return;
      var byId = {};
      (r.agents || []).forEach(function (a) { byId[a.id] = a; });
      var rows = $('teamBody').querySelectorAll('tr');
      rows.forEach(function (tr) {
        var match = byId[tr.getAttribute('data-agent-id')];
        var cell = tr.querySelector('.pcell');
        if (!cell) return;
        cell.textContent = match && match.online
          ? '🟢 ' + presenceLabel(match.presence)
          : '⚪ ' + T('horsLigne');
      });
    });
  }

  function setStatus(agentId, statut) {
    post('agent-auth.php', { action: 'validate', agent_id: agentId, statut: statut }).then(loadTeam);
  }

  function mkBtn(label, cls, onclick) {
    var b = document.createElement('button');
    b.className = 'btn sm ' + cls; b.textContent = label; b.onclick = onclick;
    return b;
  }
  function statutLabel(s) {
    return T(s === 'active' ? 'statActif' : s === 'pending' ? 'statEnAttente' : 'statSuspendu');
  }
  function presenceLabel(p) {
    var cle = { bureau: 'presAuBureauL', en_ligne: 'presEnLigneL', occupe: 'presOccupeL', absent: 'presAbsentL' }[p];
    return T(cle || 'presEnLigneL');
  }

  /* ── Thème clair / nocturne (page autonome, sans menu.js) ──────────────── */
  function themeStored() {
    try { var t = localStorage.getItem('nj-theme'); return (t === 'dark' || t === 'light') ? t : null; }
    catch (e) { return null; }
  }
  function themeEffective() {
    return themeStored() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function themeUpdateBtn() {
    var b = $('themeBtn'); if (!b) return;
    b.textContent = themeEffective() === 'dark' ? '☀️' : '🌙';
  }
  function themeToggle() {
    var next = themeEffective() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('nj-theme', next); } catch (e) {}
    document.documentElement.setAttribute('data-theme', next);
    themeUpdateBtn();
  }

  /* ── Câblage ───────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    // Sélecteur de langue : les quatre boutons du site, puis une première
    // passe de traduction du balisage avant tout affichage.
    if (window.NJ_LANG && window.EA_TEXTES) {
      window.NJ_LANG.boutons($('langBar'));
      window.NJ_LANG.traduire(window.EA_TEXTES);
      window.NJ_LANG.sur(retraduire);
      majLienSite();
    }

    var themeBtn = $('themeBtn');
    if (themeBtn) { themeUpdateBtn(); themeBtn.addEventListener('click', themeToggle); }
    loadProjects();
    $('tabLogin').onclick = function () { setTab('login'); };
    $('tabReg').onclick = function () { setTab('reg'); };

    document.querySelectorAll('.pstate').forEach(function (b) {
      b.onclick = function () { setPresence(b.getAttribute('data-state')); };
    });

    $('formLogin').onsubmit = function (e) {
      e.preventDefault();
      var msg = $('loginMsg'); msg.className = 'msg'; msg.textContent = T('connexionEnCours');
      post('agent-auth.php', { action: 'login', email: $('liEmail').value.trim(), password: $('liPass').value })
        .then(function (r) {
          if (r && r.ok) { msg.textContent = ''; renderAuth(r.agent); }
          else { msg.className = 'msg err'; msg.textContent = messageErreur(r, 'echecConnexion'); }
        });
    };

    $('formReg').onsubmit = function (e) {
      e.preventDefault();
      var msg = $('regMsg'); msg.className = 'msg'; msg.textContent = T('creationEnCours');
      post('agent-auth.php', {
        action: 'register',
        name: $('rgName').value.trim(),
        email: $('rgEmail').value.trim(),
        password: $('rgPass').value,
        role: $('rgRole').value,
        projet: $('rgProjet').value,
        telephone: $('rgTel').value.trim(),
        whatsapp: $('rgWa').value.trim()
      }).then(function (r) {
        if (r && r.ok) {
          msg.className = 'msg good';
          msg.textContent = T('compteCree');
          $('formReg').reset();
        } else {
          msg.className = 'msg err';
          msg.textContent = messageErreur(r, 'echecInscription');
        }
      });
    };

    $('logoutBtn').onclick = function () {
      post('agent-auth.php', { action: 'logout' }).then(function () { renderAuth(null); });
    };

    // Bascule automatique du statut « absent » à la fermeture n'est pas garantie
    // (le heartbeat cesse → hors ligne au bout de 20 s côté serveur).
    window.addEventListener('beforeunload', function () { if (me) navigator.sendBeacon && hangup(); });

    // État initial
    get('agent-auth.php?action=me').then(function (r) {
      renderAuth(r && r.ok ? r.agent : null);
    });
  });
})();
