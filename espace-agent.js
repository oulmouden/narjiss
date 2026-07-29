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
    var roleLabel = agent.role === 'gestionnaire' ? 'Gestionnaire' : 'Commercial';
    $('whoMeta').textContent = roleLabel + (agent.projet ? ' · ' + agent.projet : '');

    // Commercial : présence + demandes. Gestionnaire : équipe (+ présence si rattaché).
    var isCommercial = agent.role === 'commercial';
    show($('reqCard'), isCommercial);
    show($('teamCard'), agent.role === 'gestionnaire');

    if (isCommercial) {
      setPresence('en_ligne', true);
      startLoops();
    } else {
      loadTeam();
      teamTimer = setInterval(loadTeam, 8000);
    }
  }

  function stopLoops() {
    [hbTimer, pollTimer, teamTimer].forEach(function (t) { if (t) clearInterval(t); });
    hbTimer = pollTimer = teamTimer = null;
    hangup();
  }

  function startLoops() {
    heartbeat();
    hbTimer = setInterval(heartbeat, 6000);
    pollRequests();
    pollTimer = setInterval(pollRequests, 4000);
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
    if (!me || me.role !== 'commercial') return;
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

  /* ── Câblage ───────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
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
