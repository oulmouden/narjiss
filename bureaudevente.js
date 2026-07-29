(function() {

  /* =========================================================================
     VISITES 360 DES BUREAUX DE VENTE

     Une entree par projet. Renseigner le chemin du fichier d'entree de la
     visite (Pano2VR, krpano, Matterport...) des qu'elle est produite, par ex :

         jawhara: "jawhara/BureauDeVente/index.htm",

     Laisser la chaine vide tant que la visite n'existe pas : la page affiche
     alors un encart "visite en preparation" au lieu d'un iframe casse.
     ========================================================================= */
  var SALES_OFFICE_TOURS = {
    jawhara: "jawhara/tour-bureau/index.htm",
    tazroute: "",
    dar_ben_cheikh: "",
    tazroute_yassamine: "",
    farah: "",
    amical: "",
    azrou: "",
    bayt_mawada: "",
    founty: "",
    nahda2: "",
    andalusia: "",
    kb: ""
  };

  var UI = {
    fr: {
      heroTitle: "Nos bureaux de vente",
      heroSubtitle: "Poussez la porte de nos bureaux de vente et découvrez-les en visite virtuelle, avant même de vous déplacer.",
      listTitle: "Nos bureaux",
      contact: "Prendre rendez-vous",
      fiche: "Fiche de renseignement",
      soonTitle: "Visite virtuelle en préparation",
      soonText: "La visite 360° de ce bureau de vente est en cours de réalisation. En attendant, notre équipe vous accueille sur place et répond à vos questions.",
      ready: "Visite disponible",
      pending: "Bientôt disponible",
      frameTitle: "Visite virtuelle du bureau de vente"
    },
    en: {
      heroTitle: "Our sales offices",
      heroSubtitle: "Step inside our sales offices with a virtual tour, before you even travel.",
      listTitle: "Our offices",
      contact: "Book an appointment",
      fiche: "Information form",
      soonTitle: "Virtual tour in preparation",
      soonText: "The 360° tour of this sales office is being produced. In the meantime, our team welcomes you on site and answers your questions.",
      ready: "Tour available",
      pending: "Coming soon",
      frameTitle: "Virtual tour of the sales office"
    },
    ar: {
      heroTitle: "مكاتب البيع لدينا",
      heroSubtitle: "ادخل إلى مكاتب البيع لدينا عبر جولة افتراضية، قبل أن تتنقل.",
      listTitle: "مكاتبنا",
      contact: "حجز موعد",
      fiche: "بطاقة معلومات",
      soonTitle: "الجولة الافتراضية قيد الإعداد",
      soonText: "جولة 360° لهذا المكتب قيد الإنجاز. في انتظار ذلك، يستقبلكم فريقنا في عين المكان ويجيب عن أسئلتكم.",
      ready: "الجولة متاحة",
      pending: "قريباً",
      frameTitle: "جولة افتراضية في مكتب البيع"
    },
    es: {
      heroTitle: "Nuestras oficinas de venta",
      heroSubtitle: "Entre en nuestras oficinas de venta con una visita virtual, antes incluso de desplazarse.",
      listTitle: "Nuestras oficinas",
      contact: "Pedir cita",
      fiche: "Ficha de información",
      soonTitle: "Visita virtual en preparación",
      soonText: "La visita 360° de esta oficina está en producción. Mientras tanto, nuestro equipo le recibe en el lugar y responde a sus preguntas.",
      ready: "Visita disponible",
      pending: "Próximamente",
      frameTitle: "Visita virtual de la oficina de venta"
    }
  };

  var activeId = null;

  function tr(value, lang) {
    return value && (value[lang] || value.fr || value.en) || "";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function(ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function projectList() {
    return Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  }

  function findProject(id) {
    var items = projectList();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id || items[i].folder === id) return items[i];
    }
    return null;
  }

  function tourFor(project) {
    if (!project) return "";
    if (project.media && project.media.tourBureau) return project.media.tourBureau;
    return SALES_OFFICE_TOURS[project.id] || "";
  }

  function thumbFor(project) {
    if (!project) return "";
    var img = project.images || {};
    return img.logo || img.triptych || "";
  }

  function coverFor(project) {
    if (!project) return "";
    var img = project.images || {};
    return img.triptych || img.logo || "";
  }

  function renderStage(project, lang) {
    var t = UI[lang];
    var stage = document.getElementById("officeStage");
    if (!stage) return;
    var tour = tourFor(project);

    if (tour) {
      stage.innerHTML = '<iframe src="' + escapeHtml(tour) + '" title="' + escapeHtml(t.frameTitle) + '" ' +
        'allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen loading="lazy"></iframe>';
      return;
    }

    var cover = coverFor(project);
    stage.innerHTML = '<div class="office-placeholder"' +
      (cover ? ' style="background-image:url(' + escapeHtml(cover) + ')"' : '') + '>' +
        '<div class="ph-icon">🏢</div>' +
        '<h2>' + escapeHtml(t.soonTitle) + '</h2>' +
        '<p>' + escapeHtml(t.soonText) + '</p>' +
      '</div>';
  }

  function renderList(lang) {
    var t = UI[lang];
    var host = document.getElementById("officeItems");
    if (!host) return;
    var items = projectList();
    var html = "";

    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var ready = !!tourFor(p);
      var thumb = thumbFor(p);
      html += '<button class="office-item' + (p.id === activeId ? ' active' : '') + '" type="button" ' +
          'data-office-id="' + escapeHtml(p.id) + '"' + (p.id === activeId ? ' aria-current="true"' : '') + '>' +
          (thumb ? '<img src="' + escapeHtml(thumb) + '" alt="">' : '<img alt="">') +
          '<span class="oi-text">' +
            '<span class="oi-name">' + escapeHtml(tr(p.name, lang)) + '</span>' +
            '<span class="oi-state' + (ready ? ' ready' : '') + '">' + escapeHtml(ready ? t.ready : t.pending) + '</span>' +
          '</span>' +
        '</button>';
    }
    host.innerHTML = html;

    var buttons = host.querySelectorAll(".office-item");
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].onclick = function() {
        selectOffice(this.getAttribute("data-office-id"), lang, true);
      };
    }
  }

  function selectOffice(id, lang, pushUrl) {
    var project = findProject(id) || projectList()[0];
    if (!project) return;
    activeId = project.id;

    renderStage(project, lang);
    renderList(lang);

    var nameEl = document.getElementById("officeName");
    var locEl = document.getElementById("officeLocation");
    if (nameEl) nameEl.textContent = tr(project.name, lang);
    if (locEl) locEl.textContent = "📍 " + tr(project.location, lang);

    // Le formulaire s'ouvre pre-rempli sur le projet consulte.
    var ficheEl = document.getElementById("officeFiche");
    if (ficheEl) ficheEl.href = "fiche.html?projet=" + encodeURIComponent(project.id);

    if (pushUrl && window.history && window.history.replaceState) {
      window.history.replaceState(null, "",
        "bureaudevente.html?id=" + encodeURIComponent(project.id) + "#" + lang);
    }

    startPresence(project.id);
  }

  function requestedId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
  }

  /* =========================================================================
     PRÉSENCE DES CONSEILLERS
     Sonde api/agent-presence.php pour le bureau affiché et rend des puces
     « nom + état » (en ligne / au bureau / occupé / hors ligne).
     ========================================================================= */
  var presenceTimer = null;
  var presenceProject = null;

  function renderAgents(list, lang) {
    var host = document.getElementById("officeAgents");
    if (!host) return;
    var L = PRESENCE_UI[lang] || PRESENCE_UI.fr;
    if (!list || !list.length) { host.hidden = true; host.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var ag = list[i];
      var cls = ag.online ? (ag.presence === "occupe" ? "busy" : "on") : "";
      var stateLbl = ag.online ? (L[ag.presence] || L.en_ligne) : L.offline;
      html += '<span class="agent-chip ' + cls + '">' +
          '<span class="pdot"></span>' +
          '<span>' + escapeHtml(ag.name) + '</span>' +
          '<span class="pstate-lbl">' + escapeHtml(stateLbl) + '</span>' +
        '</span>';
    }
    host.innerHTML = html;
    host.hidden = false;
  }

  function fetchPresence() {
    if (!presenceProject) return;
    fetch("api/agent-presence.php?projet=" + encodeURIComponent(presenceProject))
      .then(function(r) { return r.json(); })
      .then(function(r) { renderAgents(r && r.ok ? (r.agents || []) : [], currentLang); })
      .catch(function() {});
  }

  function startPresence(projectId) {
    if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
    presenceProject = projectId;
    fetchPresence();
    presenceTimer = setInterval(fetchPresence, 8000);
  }

  /* =========================================================================
     HÔTESSE D'ACCUEIL IA (agent vocal LiveKit + OpenAI)

     Déclenchée par un hotspot 3DVista placé DANS le panorama de l'accueil.
     Le hotspot, qui tourne dans l'iframe de la visite, appelle :

         window.parent.postMessage(
           { source: 'narjiss-tour', action: 'openAgent' },
           window.location.origin
         );

     Action "Begin" du panorama d'accueil pour un déclenchement automatique :
     même message avec action: 'enterReception'.
     ========================================================================= */

  var AGENT_UI = {
    fr: {
      name: "Hôtesse d'accueil", role: "Narjiss Immobilière",
      welcome: "Bienvenue au bureau de vente ! Je peux vous présenter le projet de vive voix, ou vous laisser poursuivre la visite.",
      talk: "🎙️ Parler à l'hôtesse", tour: "Poursuivre la visite",
      book: "Prendre rendez-vous", project: "Voir la fiche du projet",
      hangup: "Raccrocher", connecting: "Un instant, je vous mets en relation…",
      connected: "Je vous écoute ! Parlez normalement, je vous réponds de vive voix.",
      live: "Micro actif", bye: "À bientôt ! N'hésitez pas à me rappeler.",
      offline: "L'hôtesse vocale n'est pas disponible pour le moment. Vous pouvez tout de même prendre rendez-vous.",
      micDenied: "Je n'ai pas accès à votre micro. Autorisez-le dans votre navigateur, puis réessayez."
    },
    en: {
      name: "Receptionist", role: "Narjiss Real Estate",
      welcome: "Welcome to the sales office! I can walk you through the project, or let you carry on with the tour.",
      talk: "🎙️ Talk to the receptionist", tour: "Continue the tour",
      book: "Book an appointment", project: "See the project page",
      hangup: "Hang up", connecting: "One moment, connecting you…",
      connected: "I'm listening! Just speak normally and I'll answer out loud.",
      live: "Mic on", bye: "See you soon! Call me back any time.",
      offline: "The voice receptionist is unavailable right now. You can still book an appointment.",
      micDenied: "I can't access your microphone. Allow it in your browser, then try again."
    },
    ar: {
      name: "موظفة الاستقبال", role: "نرجس العقارية",
      welcome: "مرحباً بكم في مكتب البيع! يمكنني أن أقدم لكم المشروع صوتياً، أو أترككم تواصلون الجولة.",
      talk: "🎙️ تحدث مع الموظفة", tour: "متابعة الجولة",
      book: "حجز موعد", project: "عرض صفحة المشروع",
      hangup: "إنهاء المكالمة", connecting: "لحظة من فضلك، جاري الاتصال…",
      connected: "أنا أسمعكم! تحدثوا بشكل عادي وسأجيبكم صوتياً.",
      live: "الميكروفون مفعّل", bye: "إلى اللقاء! لا تترددوا في مناداتي.",
      offline: "موظفة الاستقبال الصوتية غير متاحة حالياً. يمكنكم مع ذلك حجز موعد.",
      micDenied: "لا أستطيع الوصول إلى الميكروفون. اسمحوا به في المتصفح ثم أعيدوا المحاولة."
    },
    es: {
      name: "Recepcionista", role: "Narjiss Inmobiliaria",
      welcome: "¡Bienvenido a la oficina de venta! Puedo presentarle el proyecto de viva voz, o dejarle continuar la visita.",
      talk: "🎙️ Hablar con la recepcionista", tour: "Continuar la visita",
      book: "Pedir cita", project: "Ver la ficha del proyecto",
      hangup: "Colgar", connecting: "Un momento, le pongo en contacto…",
      connected: "¡Le escucho! Hable con normalidad y le respondo de viva voz.",
      live: "Micro activo", bye: "¡Hasta pronto! No dude en volver a llamarme.",
      offline: "La recepcionista vocal no está disponible ahora. Aun así puede pedir cita.",
      micDenied: "No tengo acceso a su micrófono. Autorícelo en el navegador y reinténtelo."
    }
  };

  var SPEECH_LOCALE = { fr: "fr-FR", en: "en-US", ar: "ar-MA", es: "es-ES" };

  var FS_UI = {
    fr: { open: "Plein écran", close: "Quitter le plein écran" },
    en: { open: "Fullscreen", close: "Exit fullscreen" },
    ar: { open: "ملء الشاشة", close: "الخروج من ملء الشاشة" },
    es: { open: "Pantalla completa", close: "Salir de pantalla completa" }
  };

  /* Libellés de présence des conseillers (puces sous le nom du bureau). */
  var PRESENCE_UI = {
    fr: { bureau: "Au bureau", en_ligne: "En ligne", occupe: "Occupé", absent: "Absent", offline: "Hors ligne" },
    en: { bureau: "At the office", en_ligne: "Online", occupe: "Busy", absent: "Away", offline: "Offline" },
    ar: { bureau: "في المكتب", en_ligne: "متصل", occupe: "مشغول", absent: "غائب", offline: "غير متصل" },
    es: { bureau: "En la oficina", en_ligne: "En línea", occupe: "Ocupado", absent: "Ausente", offline: "Desconectado" }
  };

  /* Flux « J'ai un code d'accès » (mise en relation directe avec le commercial). */
  var CODE_UI = {
    fr: {
      haveCode: "🔑 J'ai un code d'accès", prompt: "Saisissez le code à 4 chiffres communiqué par le commercial :",
      check: "Valider", back: "Retour", invalid: "Code invalide ou expiré. Vérifiez auprès du commercial.",
      connecting: "Un instant, je vous mets en relation…", connected: "Vous êtes en relation avec {name}. Parlez, on vous entend.",
      micDenied: "Je n'ai pas accès à votre micro. Autorisez-le puis réessayez.", offline: "Mise en relation indisponible pour le moment."
    },
    en: {
      haveCode: "🔑 I have an access code", prompt: "Enter the 4-digit code the advisor gave you:",
      check: "Confirm", back: "Back", invalid: "Invalid or expired code. Please check with the advisor.",
      connecting: "One moment, connecting you…", connected: "You're connected with {name}. Go ahead, they can hear you.",
      micDenied: "I can't access your microphone. Allow it, then try again.", offline: "Connection unavailable right now."
    },
    ar: {
      haveCode: "🔑 لدي رمز دخول", prompt: "أدخل الرمز المكون من 4 أرقام الذي أعطاك إياه المستشار:",
      check: "تأكيد", back: "رجوع", invalid: "رمز غير صالح أو منتهٍ. تحقق مع المستشار.",
      connecting: "لحظة من فضلك، جاري الربط…", connected: "أنت الآن على اتصال مع {name}. تفضل بالحديث، يسمعونك.",
      micDenied: "لا أستطيع الوصول إلى الميكروفون. اسمح به ثم أعد المحاولة.", offline: "الربط غير متاح حالياً."
    },
    es: {
      haveCode: "🔑 Tengo un código de acceso", prompt: "Introduzca el código de 4 dígitos que le dio el comercial:",
      check: "Confirmar", back: "Volver", invalid: "Código no válido o caducado. Verifíquelo con el comercial.",
      connecting: "Un momento, le pongo en contacto…", connected: "Está en contacto con {name}. Hable, le escuchan.",
      micDenied: "No tengo acceso a su micrófono. Autorícelo y reinténtelo.", offline: "Puesta en contacto no disponible ahora."
    }
  };

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function refreshFsButton() {
    var f = FS_UI[currentLang] || FS_UI.fr;
    var on = isFullscreen();
    var label = document.getElementById("stageFsLabel");
    var icon = document.getElementById("stageFsIcon");
    var btn = document.getElementById("stageFsBtn");
    if (label) label.textContent = on ? f.close : f.open;
    if (icon) icon.textContent = on ? "✕" : "⛶";
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function toggleFullscreen() {
    // On bascule le conteneur, pas l'iframe : le panneau de l'hôtesse
    // reste ainsi visible et utilisable en plein écran.
    var wrap = document.querySelector(".stage-wrap");
    if (!wrap) return;
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen || function() {}).call(document);
    } else {
      (wrap.requestFullscreen || wrap.webkitRequestFullscreen || function() {}).call(wrap);
    }
  }

  function setupFullscreen() {
    var btn = document.getElementById("stageFsBtn");
    if (!btn) return;
    // Certains navigateurs mobiles (iOS) ne savent pas passer un <div> en
    // plein écran : inutile d'afficher un bouton qui ne ferait rien.
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return;
    btn.classList.add("show");
    btn.onclick = toggleFullscreen;
    document.addEventListener("fullscreenchange", refreshFsButton);
    document.addEventListener("webkitfullscreenchange", refreshFsButton);
    refreshFsButton();
  }

  var agentRoom = null;
  var currentLang = "fr";

  function agentEl(id) { return document.getElementById(id); }

  function agentSay(message, speak) {
    var bubble = agentEl("agentBubble");
    if (bubble) bubble.textContent = message;
    if (!speak || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(message);
      utter.lang = SPEECH_LOCALE[currentLang] || "fr-FR";
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  function agentMenu(entries) {
    var host = agentEl("agentMenu");
    if (!host) return;
    host.innerHTML = "";
    entries.forEach(function(entry) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = entry[0];
      if (entry[2]) btn.className = entry[2];
      btn.onclick = entry[1];
      host.appendChild(btn);
    });
  }

  function agentLive(on, label) {
    var el = agentEl("agentLive");
    if (!el) return;
    el.classList.toggle("show", !!on);
    var text = agentEl("agentLiveText");
    if (text) text.textContent = label || "";
  }

  function closeAgent() {
    var panel = agentEl("agentPanel");
    if (panel) panel.classList.remove("show");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    hangUp();
  }

  function hangUp() {
    if (agentRoom) {
      try { agentRoom.disconnect(); } catch (e) {}
      agentRoom = null;
    }
    agentLive(false, "");
  }

  function mainMenu() {
    var a = AGENT_UI[currentLang] || AGENT_UI.fr;
    var c = CODE_UI[currentLang] || CODE_UI.fr;
    agentMenu([
      [a.talk, connectVoice, "primary"],
      [c.haveCode, showCodeEntry],
      [a.tour, closeAgent],
      [a.book, function() { window.location.href = "contact.html#" + currentLang; }],
      [a.project, function() {
        window.location.href = "project.html?id=" + encodeURIComponent(activeId || "") + "#" + currentLang;
      }]
    ]);
  }

  /* Saisie du code d'accès communiqué par le commercial. */
  function showCodeEntry() {
    var c = CODE_UI[currentLang] || CODE_UI.fr;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    agentSay(c.prompt, false);
    var host = agentEl("agentMenu");
    if (!host) return;
    host.innerHTML = "";

    var input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 4;
    input.placeholder = "1234";
    input.style.cssText = "width:100%;box-sizing:border-box;min-height:44px;padding:.55rem .7rem;" +
      "border:1.5px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(255,255,255,.1);" +
      "color:#fff;font:inherit;font-size:1.2rem;letter-spacing:.3em;text-align:center;margin-bottom:.5rem;";

    function submit() {
      var code = (input.value || "").replace(/\D/g, "");
      if (code.length !== 4) { input.focus(); return; }
      verifyAccessCode(code);
    }
    input.addEventListener("keydown", function(e) { if (e.key === "Enter") submit(); });

    var btnCheck = document.createElement("button");
    btnCheck.type = "button"; btnCheck.className = "primary"; btnCheck.textContent = c.check;
    btnCheck.onclick = submit;
    var btnBack = document.createElement("button");
    btnBack.type = "button"; btnBack.textContent = c.back;
    btnBack.onclick = mainMenu;

    host.appendChild(input);
    host.appendChild(btnCheck);
    host.appendChild(btnBack);
    input.focus();
  }

  async function verifyAccessCode(code) {
    var c = CODE_UI[currentLang] || CODE_UI.fr;
    agentSay(c.connecting, false);
    agentMenu([]);
    var data = null;
    try {
      var body = new URLSearchParams({ action: "verify", code: code });
      var res = await fetch("api/agent-access.php", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      data = await res.json();
    } catch (e) {}

    if (!data || !data.valid) { agentSay(c.invalid, false); mainMenu(); return; }
    if (!data.token) {
      // Code valide mais pas de canal voix : on affiche au moins le contact direct.
      agentSay(c.connected.replace("{name}", data.agent_name || ""), false);
      showAdvisorContact(data);
      return;
    }
    connectDirect(data.url, data.token, data.agent_name || "", data);
  }

  function showAdvisorContact(data) {
    var entries = [];
    if (data.whatsapp) entries.push(["WhatsApp", function() {
      window.open("https://wa.me/" + encodeURIComponent(data.whatsapp.replace(/[^0-9]/g, "")), "_blank");
    }]);
    if (data.telephone) entries.push(["📞 " + data.telephone, function() {
      window.location.href = "tel:" + data.telephone;
    }]);
    var c = CODE_UI[currentLang] || CODE_UI.fr;
    entries.push([c.back, mainMenu]);
    agentMenu(entries);
  }

  /* Connexion vocale directe visiteur ↔ commercial (room LiveKit dédiée). */
  async function connectDirect(url, token, name, data) {
    var c = CODE_UI[currentLang] || CODE_UI.fr;
    var a = AGENT_UI[currentLang] || AGENT_UI.fr;
    var LK = window.LivekitClient;
    if (!LK) { agentSay(c.offline, false); showAdvisorContact(data || {}); return; }

    hangUp();
    agentRoom = new LK.Room();
    agentRoom
      .on(LK.RoomEvent.TrackSubscribed, function(track) {
        if (track.kind !== "audio") return;
        var el = track.attach(); el.autoplay = true; el.style.display = "none";
        document.body.appendChild(el);
      })
      .on(LK.RoomEvent.TrackUnsubscribed, function(track) {
        track.detach().forEach(function(el) { el.remove(); });
      })
      .on(LK.RoomEvent.Disconnected, function() {
        agentRoom = null; agentLive(false, ""); mainMenu();
      });

    try {
      await agentRoom.connect(url, token);
      await agentRoom.localParticipant.setMicrophoneEnabled(true);
    } catch (e) {
      var denied = e && /permission|denied|NotAllowed/i.test(e.name + " " + e.message);
      agentSay(denied ? c.micDenied : c.offline, false);
      hangUp(); showAdvisorContact(data || {});
      return;
    }
    agentSay(c.connected.replace("{name}", name), false);
    agentLive(true, a.live);
    agentMenu([[a.hangup, hangUp, "danger"]]);
  }

  function openAgent(speak) {
    var panel = agentEl("agentPanel");
    if (!panel) return;
    var a = AGENT_UI[currentLang] || AGENT_UI.fr;
    agentEl("agentName").textContent = a.name;
    agentEl("agentRole").textContent = a.role;
    panel.classList.add("show");
    agentSay(a.welcome, speak);
    mainMenu();
  }

  /* Connexion à l'agent vocal : jeton PHP → room LiveKit → micro. */
  async function connectVoice() {
    var a = AGENT_UI[currentLang] || AGENT_UI.fr;
    var LK = window.LivekitClient;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (!LK) { agentSay(a.offline, false); return; }

    agentSay(a.connecting, false);
    agentMenu([]);

    var data = null;
    try {
      var res = await fetch("api/accueil-token.php?project=" + encodeURIComponent(activeId) +
                            "&lang=" + encodeURIComponent(currentLang));
      data = await res.json();
    } catch (e) {}

    if (!data || !data.token) { agentSay(a.offline, false); mainMenu(); return; }

    agentRoom = new LK.Room();
    agentRoom
      .on(LK.RoomEvent.TrackSubscribed, function(track) {
        if (track.kind !== "audio") return;
        var el = track.attach();
        el.autoplay = true;
        el.style.display = "none";
        document.body.appendChild(el);
      })
      .on(LK.RoomEvent.TrackUnsubscribed, function(track) {
        track.detach().forEach(function(el) { el.remove(); });
      })
      .on(LK.RoomEvent.Disconnected, function() {
        agentRoom = null;
        agentLive(false, "");
        agentSay(a.bye, false);
        mainMenu();
      });

    try {
      await agentRoom.connect(data.url, data.token);
      await agentRoom.localParticipant.setMicrophoneEnabled(true);
    } catch (e) {
      var denied = e && /permission|denied|NotAllowed/i.test(e.name + " " + e.message);
      agentSay(denied ? a.micDenied : a.offline, false);
      hangUp();
      mainMenu();
      return;
    }

    agentSay(a.connected, false);
    agentLive(true, a.live);
    agentMenu([[a.hangup, hangUp, "danger"]]);
  }

  /* Pont avec les hotspots 3DVista, qui vivent dans l'iframe de la visite. */
  window.addEventListener("message", function(event) {
    if (event.origin !== window.location.origin) return;
    var data = event.data || {};
    if (data.source !== "narjiss-tour") return;
    if (data.action === "openAgent") openAgent(false);
    else if (data.action === "enterReception") openAgent(true);
  });

  window.onLanguageChange = function(lang) {
    currentLang = lang;
    var t = UI[lang] || UI.fr;
    document.getElementById("heroTitle").textContent = t.heroTitle;
    document.getElementById("heroSubtitle").textContent = t.heroSubtitle;
    document.getElementById("officeListTitle").textContent = t.listTitle;

    var contact = document.getElementById("officeContact");
    contact.textContent = t.contact;
    contact.href = "contact.html#" + lang;

    var fiche = document.getElementById("officeFiche");
    if (fiche) fiche.textContent = t.fiche;

    selectOffice(activeId || requestedId(), lang, false);
    refreshFsButton();
  };

  document.addEventListener("DOMContentLoaded", function() {
    var close = document.getElementById("agentClose");
    if (close) close.onclick = closeAgent;
    setupFullscreen();
    initPage("projects", "");
  });

  // Ne pas laisser une room ouverte derrière soi.
  window.addEventListener("beforeunload", hangUp);
})();
