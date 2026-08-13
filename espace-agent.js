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
      sel.innerHTML = '<option value="">— Choisir —</option>';
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
    show($('logoutBtn'), authed);
    stopLoops();

    if (!authed) { setTab('login'); return; }

    $('whoName').textContent = agent.name;
    var roleLabel = agent.role === 'superviseur' ? 'Superviseur'
                  : (agent.role === 'gestionnaire' ? 'Gestionnaire' : 'Commercial');
    $('whoMeta').textContent = roleLabel + (agent.projet ? ' · ' + agent.projet
                  : (agent.role === 'superviseur' ? ' · tous les bureaux' : ''));

    // Commercial + superviseur : présence + demandes de visiteurs.
    // Gestionnaire + superviseur : gestion d'équipe. Le superviseur cumule les deux.
    var canReceive = agent.role === 'commercial' || agent.role === 'superviseur';
    var canManage  = agent.role === 'gestionnaire' || agent.role === 'superviseur';
    show($('reqCard'), canReceive);
    show($('teamCard'), canManage);

    if (canReceive) { setPresence('en_ligne', true); startLoops(); }
    if (canManage) { loadTeam(); teamTimer = setInterval(loadTeam, 8000); }

    // Messagerie : chacun sur son périmètre (son bureau, ou tous les bureaux
    // pour un gestionnaire ou un superviseur).
    renderMsgTabs();
    loadMessages();
    msgTimer = setInterval(function () { if (!msgOpenId) loadMessages(); }, 15000);
  }

  function stopLoops() {
    [hbTimer, pollTimer, teamTimer, msgTimer].forEach(function (t) { if (t) clearInterval(t); });
    hbTimer = pollTimer = teamTimer = msgTimer = null;
    stopRepRec();
    hangup();
  }

  function startLoops() {
    heartbeat();
    hbTimer = setInterval(heartbeat, 6000);
    pollRequests();
    pollTimer = setInterval(pollRequests, 4000);
  }

  /* =========================================================================
     MESSAGERIE DU BUREAU
     Les visiteurs laissent un message quand personne n'est joignable. On
     l'écoute, on le lit, puis on rappelle : chaque suite donnée est journalisée
     pour que l'équipe voie ce qui a déjà été tenté.
     ========================================================================= */
  var MSG_TABS = [
    ['actifs', 'À traiter'], ['nouveau', 'Nouveaux'], ['ecoute', 'Écoutés'],
    ['traite', 'Traités'], ['archive', 'Archivés'], ['', 'Tous']
  ];
  var MSG_STATUTS = { nouveau: 'Nouveau', ecoute: 'Écouté', traite: 'Traité', archive: 'Archivé' };

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
    return isNaN(d) ? '' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function renderMsgTabs() {
    var host = $('msgTabs');
    if (!host) return;
    host.innerHTML = '';
    MSG_TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t[1];
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
        badge.textContent = r.nouveaux ? r.nouveaux + ' nouveau' + (r.nouveaux > 1 ? 'x' : '') : '';
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
          '<div class="mn">' + esc(m.nom || 'Visiteur anonyme') +
            ' <span class="mtag ' + esc(m.statut) + '">' + esc(MSG_STATUTS[m.statut] || m.statut) + '</span>' +
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
    h += '<h3>' + esc(m.nom || 'Visiteur anonyme') +
         ' <span class="mtag ' + esc(m.statut) + '">' + esc(MSG_STATUTS[m.statut] || m.statut) + '</span></h3>';
    h += '<div style="font-size:.9rem;line-height:1.7">';
    if (m.tel_affiche) h += '<b>' + esc(m.tel_affiche) + '</b>' +
      (m.tel_brut ? ' <span style="color:#8a95a6">(dicté : ' + esc(m.tel_brut) + ')</span>' : '') + '<br>';
    if (m.email) h += '<b>' + esc(m.email) + '</b><br>';
    h += esc(quand(m.date)) + ' · ' + esc(m.projet_nom) + ' · ' + esc(m.langue.toUpperCase()) +
         (m.canal === 'hotesse' ? ' · pris par l\'hôtesse IA' : '') + '</div>';

    if (m.audio) h += '<audio controls preload="metadata" src="' + esc(m.audio) + '"></audio>';
    if (m.message) h += '<div class="corps"><span class="etiq">Message écrit</span>' + esc(m.message) + '</div>';
    if (m.transcription) h += '<div class="corps auto"><span class="etiq">Transcription automatique — à vérifier à l\'écoute</span>' +
      esc(m.transcription) + '</div>';

    // Prise en charge : le premier qui la déclare évite le double rappel.
    h += '<div class="acts">';
    if (!m.pris_nom) h += '<button class="btn sm ok" data-act="prise">🙋 Je m\'en occupe</button>';
    else h += '<span class="mtag">🙋 ' + esc(m.pris_nom) + ' s\'en occupe</span>';
    h += '</div>';

    h += '<div class="acts">';
    if (m.lien_tel) {
      h += '<a class="btn sm tel" href="' + esc(m.lien_tel) + '" data-j="rappel">📞 Rappeler</a>' +
           '<a class="btn sm wa" href="' + esc(m.lien_wa) + '" target="_blank" rel="noopener" data-j="whatsapp" id="mWa">💬 WhatsApp</a>' +
           '<a class="btn sm ghost" href="' + esc(m.lien_sms) + '" data-j="sms" id="mSms">✉️ SMS</a>';
    }
    if (m.lien_mail) h += '<a class="btn sm ghost" href="' + esc(m.lien_mail) + '" data-j="email">📧 E-mail</a>';
    if (!m.lien_tel && !m.lien_mail) h += '<span style="color:#8a95a6;font-size:.9rem">Aucune coordonnée laissée.</span>';
    h += '</div>';

    if (m.lien_tel) {
      h += '<div class="bloc"><h3>Message écrit (WhatsApp / SMS)</h3>' +
           '<textarea id="mPrefill">' + esc(m.prefill) + '</textarea>' +
           '<div style="font-size:.8rem;color:#8a95a6;margin-top:.3rem">Modifiez le texte : les boutons WhatsApp et SMS l\'emportent avec eux.</div></div>';
    }

    h += '<div class="bloc"><h3>Réponse vocale</h3>' +
         '<div style="font-size:.85rem;color:#54627a;margin-bottom:.5rem">Enregistrez votre réponse : vous obtiendrez un lien d\'écoute à coller dans WhatsApp.</div>' +
         '<div class="acts"><button class="btn sm ghost" data-act="rec">⏺ Enregistrer</button>' +
         '<span id="mChrono" style="font-variant-numeric:tabular-nums;font-weight:700">0:00</span>' +
         '<button class="btn sm" data-act="send-vocal" disabled>Envoyer la réponse</button></div>' +
         '<audio id="mRepPlay" controls style="display:none"></audio>' +
         '<div id="mRepOut" style="font-size:.85rem"></div></div>';

    h += '<div class="bloc"><h3>Note interne</h3>' +
         '<textarea id="mNote" placeholder="Ce qu\'il faut retenir…">' + esc(m.notes || '') + '</textarea>' +
         '<div class="acts"><button class="btn sm ghost" data-act="note">Enregistrer la note</button></div></div>';

    h += '<div class="bloc"><h3>Classer</h3><div class="acts">';
    ['traite', 'archive', 'nouveau'].forEach(function (s) {
      if (m.statut === s) return;
      h += '<button class="btn sm ghost" data-statut="' + s + '">' +
           (s === 'traite' ? 'Marquer traité' : s === 'archive' ? 'Archiver' : 'Remettre en nouveau') + '</button>';
    });
    if (peutSupprimer) h += '<button class="btn sm danger" data-act="suppr">Supprimer</button>';
    h += '<button class="btn sm ghost" data-act="close">↩︎ Retour à la liste</button></div></div>';

    if (journal.length) {
      h += '<div class="bloc"><h3>Suites données</h3>';
      journal.forEach(function (j) {
        var lbl = { rappel: '📞 Rappel', whatsapp: '💬 WhatsApp', sms: '✉️ SMS', email: '📧 E-mail',
                    vocal: '🎙️ Réponse vocale', note: '📝 Note', statut: '🗂️ Statut', prise: '🙋 Prise en charge' }[j.type] || j.type;
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
        if (r && !r.ok && r.error) alert(r.error);
        openMessage(m.id);
      });
    };
    if (act('note')) act('note').onclick = function () {
      post('messages-agent.php', { action: 'note', id: m.id, note: $('mNote').value }).then(function () { openMessage(m.id); });
    };
    if (act('suppr')) act('suppr').onclick = function () {
      if (!confirm('Supprimer définitivement ce message et son enregistrement ?')) return;
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
      if (!(navigator.mediaDevices && window.MediaRecorder)) { out.textContent = 'Ce navigateur ne sait pas enregistrer.'; return; }
      try { repFlux = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { out.textContent = 'Micro refusé — autorisez-le dans le navigateur.'; return; }
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
        btnRec.textContent = '↺ Recommencer';
        btnSend.disabled = false;
      };
      repSec = 0; tick(); repRec.start();
      btnRec.textContent = '⏹ Arrêter';
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
          if (!r || !r.ok) { out.textContent = (r && r.error) || 'Échec de l\'envoi.'; btnSend.disabled = false; return; }
          stopRepRec();
          openMessage(messageId);
        })
        .catch(function () { out.textContent = 'Échec de l\'envoi.'; btnSend.disabled = false; });
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
    if (!me || (me.role !== 'commercial' && me.role !== 'superviseur')) return;
    post('agent-presence.php', { presence: curPresence }).then(function (r) {
      var dot = $('onlineDot'), txt = $('onlineText');
      if (r && r.ok) {
        dot.classList.add('on');
        txt.textContent = 'En ligne';
      } else {
        dot.classList.remove('on');
        txt.textContent = 'Hors ligne';
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
      '<div>🔔 <span class="vis"></span> souhaite être reçu(e).</div>' +
      '<div class="acts">' +
        '<button class="btn ok sm" data-act="ok">Autoriser</button>' +
        '<button class="btn danger sm" data-act="no">Refuser</button>' +
      '</div>';
    card.querySelector('.vis').textContent = req.visitor;
    card.querySelector('[data-act="ok"]').onclick = function () { approve(req, card); };
    card.querySelector('[data-act="no"]').onclick = function () { deny(req, card); };
    return card;
  }

  function approve(req, card) {
    post('agent-access.php', { action: 'approve', request_id: req.id }).then(function (r) {
      if (!r || !r.ok) { card.remove(); return; }
      seenApproved[req.id] = r.code;
      card.style.borderLeftColor = 'var(--ok)';
      card.innerHTML =
        '<div>✅ Accès autorisé pour <b></b>.</div>' +
        '<div class="code"></div>' +
        '<div class="hint">Communiquez ce code au visiteur (l\'hôtesse le lui donne aussi). ' +
        'Dès qu\'il le saisit, vous pouvez vous parler en direct.</div>' +
        '<div class="acts"><button class="btn sm" data-act="join">🎙️ Rejoindre le visiteur</button></div>';
      card.querySelector('b').textContent = req.visitor;
      card.querySelector('.code').textContent = r.code;
      card.querySelector('[data-act="join"]').onclick = function () { joinCall(req.id); };
    });
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
        $('callText').textContent = 'En relation vocale avec le visiteur…';
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
        var roleTxt = a.role === 'gestionnaire' ? 'Gestionnaire' : 'Commercial';
        tr.innerHTML =
          '<td></td>' +
          '<td>' + roleTxt + '</td>' +
          '<td><span class="pill ' + a.statut + '">' + statutLabel(a.statut) + '</span></td>' +
          '<td class="pcell">—</td>' +
          '<td class="actcell"></td>';
        tr.children[0].textContent = a.name;
        var act = tr.querySelector('.actcell');
        if (a.statut === 'pending') {
          act.appendChild(mkBtn('Valider', 'ok', function () { setStatus(a.id, 'active'); }));
        } else if (a.statut === 'active') {
          act.appendChild(mkBtn('Suspendre', 'danger', function () { setStatus(a.id, 'suspended'); }));
        } else {
          act.appendChild(mkBtn('Réactiver', 'ok', function () { setStatus(a.id, 'active'); }));
        }
        body.appendChild(tr);
      });
      refreshTeamPresence();
    });
  }

  function refreshTeamPresence() {
    if (!me || !me.projet) return;
    get('agent-presence.php?projet=' + encodeURIComponent(me.projet)).then(function (r) {
      if (!r || !r.ok) return;
      var byId = {};
      (r.agents || []).forEach(function (a) { byId[a.id] = a; });
      var rows = $('teamBody').querySelectorAll('tr');
      // Réassocie via le nom affiché (roster ne renvoie que les commerciaux actifs).
      rows.forEach(function (tr) {
        var name = tr.children[0].textContent;
        var match = (r.agents || []).filter(function (a) { return a.name === name; })[0];
        var cell = tr.querySelector('.pcell');
        if (match) cell.textContent = match.online ? '🟢 ' + presenceLabel(match.presence) : '⚪ Hors ligne';
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
  function statutLabel(s) { return s === 'active' ? 'Actif' : s === 'pending' ? 'En attente' : 'Suspendu'; }
  function presenceLabel(p) {
    return { bureau: 'Au bureau', en_ligne: 'En ligne', occupe: 'Occupé', absent: 'Absent' }[p] || 'En ligne';
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
      var msg = $('loginMsg'); msg.className = 'msg'; msg.textContent = 'Connexion…';
      post('agent-auth.php', { action: 'login', email: $('liEmail').value.trim(), password: $('liPass').value })
        .then(function (r) {
          if (r && r.ok) { msg.textContent = ''; renderAuth(r.agent); }
          else { msg.className = 'msg err'; msg.textContent = (r && r.error) || 'Échec de la connexion.'; }
        });
    };

    $('formReg').onsubmit = function (e) {
      e.preventDefault();
      var msg = $('regMsg'); msg.className = 'msg'; msg.textContent = 'Création…';
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
          msg.textContent = r.message || 'Compte créé, en attente de validation.';
          $('formReg').reset();
        } else {
          msg.className = 'msg err';
          msg.textContent = (r && r.error) || 'Échec de l\'inscription.';
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
