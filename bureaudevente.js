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
  /* Au moins un commercial joignable ? Décide si l'hôtesse propose d'emblée la
     messagerie (personne au bureau) ou la conversation vocale. */
  var someoneOnline = false;

  function renderAgents(list, lang) {
    var host = document.getElementById("officeAgents");
    if (!host) return;
    var L = PRESENCE_UI[lang] || PRESENCE_UI.fr;
    var D = DIRECT_UI[lang] || DIRECT_UI.fr;
    if (!list || !list.length) { host.hidden = true; host.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var ag = list[i];
      var cls = ag.online ? (ag.presence === "occupe" ? "busy" : "on") : "";
      var stateLbl = ag.online ? (L[ag.presence] || L.en_ligne) : L.offline;
      /* « Occupé » reste cliquable : le commercial a posé ce statut lui-même et
         garde la main pour accepter ou refuser. « Absent » et « hors ligne »
         ne le sont pas — la demande n'atteindrait personne, et le visiteur
         attendrait une réponse qui ne viendrait jamais. */
      var joignable = ag.online && ag.presence !== "absent";
      var dedans =
          '<span class="pdot"></span>' +
          '<span>' + escapeHtml(ag.name) + '</span>' +
          '<span class="pstate-lbl">' + escapeHtml(stateLbl) + '</span>';
      html += joignable
        ? '<button type="button" class="agent-chip joignable ' + cls + '"' +
            ' data-agent="' + escapeHtml(ag.name) + '"' +
            ' title="' + escapeHtml(D.chipHint.replace("{name}", ag.name)) + '">' +
            dedans + '<span class="chip-call" aria-hidden="true">💬</span></button>'
        : '<span class="agent-chip ' + cls + '">' + dedans + '</span>';
    }
    host.innerHTML = html;
    host.hidden = false;
    // innerHTML vient d'effacer les anciens boutons : on rebranche à chaque
    // rendu, c'est-à-dire toutes les huit secondes.
    var puces = host.querySelectorAll(".agent-chip.joignable");
    for (var k = 0; k < puces.length; k++) {
      puces[k].addEventListener("click", function() {
        demanderConseiller(this.getAttribute("data-agent"));
      });
    }
  }

  function fetchPresence() {
    if (!presenceProject) return;
    fetch("api/agent-presence.php?projet=" + encodeURIComponent(presenceProject))
      .then(function(r) { return r.json(); })
      .then(function(r) {
        var list = r && r.ok ? (r.agents || []) : [];
        someoneOnline = list.some(function(a) { return a.online && a.presence !== "absent"; });
        renderAgents(list, currentLang);
      })
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
      micDenied: "Je n'ai pas accès à votre micro. Autorisez-le dans votre navigateur, puis réessayez.",
      chooseLang: "Dans quelle langue souhaitez-vous discuter ?", back: "↩︎ Retour"
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
      micDenied: "I can't access your microphone. Allow it in your browser, then try again.",
      chooseLang: "Which language would you like to speak?", back: "↩︎ Back"
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
      micDenied: "لا أستطيع الوصول إلى الميكروفون. اسمحوا به في المتصفح ثم أعيدوا المحاولة.",
      chooseLang: "بأي لغة تودون التحدث؟", back: "↩︎ رجوع"
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
      micDenied: "No tengo acceso a su micrófono. Autorícelo en el navegador y reinténtelo.",
      chooseLang: "¿En qué idioma desea hablar?", back: "↩︎ Volver"
    }
  };

  /* Messagerie du bureau : le visiteur laisse un message quand personne n'est
     joignable. Coordonnées saisies au clavier — dictées, elles se transcrivent
     mal ; l'audio, lui, est transcrit côté serveur pour relecture. */
  var MSG_UI = {
    fr: {
      leave: "📮 Laisser un message",
      absent: "Personne n'est au bureau à cet instant. Laissez-moi votre message : un commercial vous rappellera.",
      intro: "Enregistrez votre voix, écrivez, ou les deux. Vos coordonnées sont saisies au clavier.",
      name: "Votre nom", tel: "Votre téléphone", mail: "Votre e-mail",
      text: "Votre message", textPh: "Ce que vous souhaitez nous dire…",
      rec: "⏺ Enregistrer", stop: "⏹ Arrêter", again: "↺ Recommencer", send: "📤 Envoyer",
      sending: "Envoi en cours…",
      micKo: "Je n'ai pas accès au micro. Autorisez-le dans votre navigateur, ou écrivez votre message.",
      noContact: "Laissez un téléphone ou un e-mail pour qu'on puisse vous rappeler.",
      empty: "Écrivez ou enregistrez votre message.",
      thanks: "Merci ! Votre message est transmis au bureau de vente. On vous rappelle au plus vite.",
      back: "↩︎ Retour"
    },
    en: {
      leave: "📮 Leave a message",
      absent: "Nobody is at the office right now. Leave me your message and a sales advisor will call you back.",
      intro: "Record your voice, write, or both. Your contact details are typed in.",
      name: "Your name", tel: "Your phone", mail: "Your e-mail",
      text: "Your message", textPh: "What you would like to tell us…",
      rec: "⏺ Record", stop: "⏹ Stop", again: "↺ Start over", send: "📤 Send",
      sending: "Sending…",
      micKo: "I can't access the microphone. Allow it in your browser, or write your message.",
      noContact: "Leave a phone number or an e-mail so we can call you back.",
      empty: "Write or record your message.",
      thanks: "Thank you! Your message has been sent to the sales office. We'll call you back shortly.",
      back: "↩︎ Back"
    },
    ar: {
      leave: "📮 اترك رسالة",
      absent: "لا أحد في المكتب حالياً. اترك لي رسالتك وسيعاود أحد المستشارين الاتصال بك.",
      intro: "سجّل صوتك، أو اكتب، أو الاثنين معاً. اكتب بياناتك بلوحة المفاتيح.",
      name: "اسمك", tel: "هاتفك", mail: "بريدك الإلكتروني",
      text: "رسالتك", textPh: "ما تودّ إخبارنا به…",
      rec: "⏺ تسجيل", stop: "⏹ إيقاف", again: "↺ إعادة", send: "📤 إرسال",
      sending: "جاري الإرسال…",
      micKo: "لا أستطيع الوصول إلى الميكروفون. اسمح به في المتصفح، أو اكتب رسالتك.",
      noContact: "اترك رقم هاتف أو بريداً إلكترونياً حتى نتمكن من معاودة الاتصال بك.",
      empty: "اكتب أو سجّل رسالتك.",
      thanks: "شكراً! تم إرسال رسالتك إلى مكتب البيع. سنعاود الاتصال بك قريباً.",
      back: "↩︎ رجوع"
    },
    es: {
      leave: "📮 Dejar un mensaje",
      absent: "No hay nadie en la oficina ahora mismo. Déjeme su mensaje y un comercial le llamará.",
      intro: "Grabe su voz, escriba, o ambas cosas. Sus datos se escriben con el teclado.",
      name: "Su nombre", tel: "Su teléfono", mail: "Su e-mail",
      text: "Su mensaje", textPh: "Lo que desea decirnos…",
      rec: "⏺ Grabar", stop: "⏹ Detener", again: "↺ Empezar de nuevo", send: "📤 Enviar",
      sending: "Enviando…",
      micKo: "No tengo acceso al micrófono. Autorícelo en el navegador, o escriba su mensaje.",
      noContact: "Deje un teléfono o un e-mail para que podamos llamarle.",
      empty: "Escriba o grabe su mensaje.",
      thanks: "¡Gracias! Su mensaje se ha enviado a la oficina de venta. Le llamaremos lo antes posible.",
      back: "↩︎ Volver"
    }
  };

  var SPEECH_LOCALE = { fr: "fr-FR", en: "en-US", ar: "ar-MA", es: "es-ES" };

  /* Langues proposées pour la conversation vocale (indépendantes de la langue
     du site). La Darija marocaine est mise en avant. Les codes correspondent à
     ceux acceptés par api/accueil-token.php et api/agent.py. */
  var CONV_LANGS = [
    { code: "darija", label: "الدارجة المغربية" },
    { code: "ar",     label: "العربية الفصحى" },
    { code: "fr",     label: "Français" },
    { code: "en",     label: "English" },
    { code: "es",     label: "Español" }
  ];

  var FS_UI = {
    fr: { open: "Plein écran", close: "Quitter le plein écran" },
    en: { open: "Fullscreen", close: "Exit fullscreen" },
    ar: { open: "ملء الشاشة", close: "الخروج من ملء الشاشة" },
    es: { open: "Pantalla completa", close: "Salir de pantalla completa" }
  };

  /* Libellés de présence des conseillers (puces sous le nom du bureau). */
  /* =========================================================================
     PARLER DIRECTEMENT À UN CONSEILLER PRÉSENT
     Le visiteur clique la puce de quelqu'un d'affiché en ligne. On réutilise
     tel quel le flux d'accès existant (create → le commercial approuve →
     code → verify → room LiveKit), jusqu'ici réservé à l'hôtesse IA. Le code
     à quatre chiffres continue d'exister côté serveur mais n'est plus montré :
     il servait à ce que l'hôtesse le dicte, personne n'a à le retaper quand
     c'est le visiteur lui-même qui a cliqué.
     ========================================================================= */
  var DIRECT_UI = {
    fr: {
      chipHint: "Cliquez pour parler à {name}",
      intro: "Vous voulez parler à {name}. Votre prénom, pour que je vous annonce ?",
      yourName: "Votre prénom",
      ask: "Demander à parler",
      needName: "Dites-moi juste votre prénom.",
      asking: "Je préviens {name}…",
      waiting: "{name} est prévenu. Un instant, je vous mets en relation dès qu'il accepte.",
      cancel: "Annuler",
      notFound: "Je ne retrouve pas ce conseiller.",
      gone: "{name} vient de quitter le bureau.",
      denied: "{name} ne peut pas vous répondre tout de suite.",
      timeout: "{name} n'a pas répondu. Il est sans doute avec quelqu'un."
    },
    en: {
      chipHint: "Click to talk to {name}",
      intro: "You'd like to talk to {name}. Your first name, so I can announce you?",
      yourName: "Your first name",
      ask: "Ask to talk",
      needName: "Just your first name.",
      asking: "Letting {name} know…",
      waiting: "{name} has been notified. One moment, I'll connect you as soon as they accept.",
      cancel: "Cancel",
      notFound: "I can't find that advisor.",
      gone: "{name} has just left the office.",
      denied: "{name} can't take your call right now.",
      timeout: "{name} didn't answer — probably with someone else."
    },
    ar: {
      chipHint: "انقر للتحدث إلى {name}",
      intro: "تريد التحدث إلى {name}. ما اسمك، حتى أعلن عنك؟",
      yourName: "اسمك",
      ask: "طلب التحدث",
      needName: "أخبرني باسمك فقط.",
      asking: "أُعلم {name}…",
      waiting: "تم إعلام {name}. لحظة، سأصلك به بمجرد أن يقبل.",
      cancel: "إلغاء",
      notFound: "لا أجد هذا المستشار.",
      gone: "{name} غادر المكتب للتو.",
      denied: "{name} لا يستطيع الرد عليك الآن.",
      timeout: "{name} لم يرد. ربما يكون مع شخص آخر."
    },
    es: {
      chipHint: "Haga clic para hablar con {name}",
      intro: "Quiere hablar con {name}. ¿Su nombre, para anunciarle?",
      yourName: "Su nombre",
      ask: "Pedir hablar",
      needName: "Dígame solo su nombre.",
      asking: "Aviso a {name}…",
      waiting: "{name} ha sido avisado. Un momento, le conecto en cuanto acepte.",
      cancel: "Cancelar",
      notFound: "No encuentro a ese asesor.",
      gone: "{name} acaba de salir de la oficina.",
      denied: "{name} no puede atenderle ahora mismo.",
      timeout: "{name} no ha respondido. Seguramente está con alguien."
    }
  };
  function directT() { return DIRECT_UI[currentLang] || DIRECT_UI.fr; }

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
      micDenied: "Je n'ai pas accès à votre micro. Autorisez-le puis réessayez.", offline: "Mise en relation indisponible pour le moment.",
      connectedNoVoice: "{name} vous attend. La voix n'est pas disponible ici — joignez-le directement :"
    },
    en: {
      haveCode: "🔑 I have an access code", prompt: "Enter the 4-digit code the advisor gave you:",
      check: "Confirm", back: "Back", invalid: "Invalid or expired code. Please check with the advisor.",
      connecting: "One moment, connecting you…", connected: "You're connected with {name}. Go ahead, they can hear you.",
      micDenied: "I can't access your microphone. Allow it, then try again.", offline: "Connection unavailable right now.",
      connectedNoVoice: "{name} is expecting you. Voice isn't available here — reach them directly:"
    },
    ar: {
      haveCode: "🔑 لدي رمز دخول", prompt: "أدخل الرمز المكون من 4 أرقام الذي أعطاك إياه المستشار:",
      check: "تأكيد", back: "رجوع", invalid: "رمز غير صالح أو منتهٍ. تحقق مع المستشار.",
      connecting: "لحظة من فضلك، جاري الربط…", connected: "أنت الآن على اتصال مع {name}. تفضل بالحديث، يسمعونك.",
      micDenied: "لا أستطيع الوصول إلى الميكروفون. اسمح به ثم أعد المحاولة.", offline: "الربط غير متاح حالياً.",
      connectedNoVoice: "{name} في انتظارك. الصوت غير متاح هنا — تواصل معه مباشرة:"
    },
    es: {
      haveCode: "🔑 Tengo un código de acceso", prompt: "Introduzca el código de 4 dígitos que le dio el comercial:",
      check: "Confirmar", back: "Volver", invalid: "Código no válido o caducado. Verifíquelo con el comercial.",
      connecting: "Un momento, le pongo en contacto…", connected: "Está en contacto con {name}. Hable, le escuchan.",
      micDenied: "No tengo acceso a su micrófono. Autorícelo y reinténtelo.", offline: "Puesta en contacto no disponible ahora.",
      connectedNoVoice: "{name} le espera. La voz no está disponible aquí — contáctele directamente:"
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
    var sab = document.getElementById("stageAgentBtn");
    if (sab) sab.classList.remove("hidden");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Fermer le panneau abandonne l'attente d'un conseiller : sans ça le
    // sondage continuerait en fond, et la mise en relation s'ouvrirait toute
    // seule sur un visiteur qui est passé à autre chose.
    directArreterAttente();
    // Fermer le panneau pendant un enregistrement doit rendre le micro.
    if (msgRec && msgRec.state === "recording") { try { msgRec.stop(); } catch (e) {} }
    msgReleaseMic();
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
    var m = MSG_UI[currentLang] || MSG_UI.fr;
    // Personne au bureau : la messagerie passe devant et l'hôtesse le dit.
    if (!someoneOnline) agentSay(m.absent, false);
    agentMenu([
      [a.talk, showConvLangs, someoneOnline ? "primary" : ""],
      [m.leave, showMessageForm, someoneOnline ? "" : "primary"],
      [c.haveCode, showCodeEntry],
      [a.tour, closeAgent],
      [a.book, function() { window.location.href = "contact.html#" + currentLang; }],
      [a.project, function() {
        window.location.href = "project.html?id=" + encodeURIComponent(activeId || "") + "#" + currentLang;
      }]
    ]);
  }

  /* =========================================================================
     LAISSER UN MESSAGE (vocal et/ou écrit)
     Dépose sur api/message-depot.php ; les commerciaux du bureau le traitent
     depuis leur espace. Le micro n'est demandé qu'au clic sur « Enregistrer ».
     ========================================================================= */
  var msgRec = null, msgChunks = [], msgBlob = null, msgFlux = null, msgTic = null, msgSec = 0;
  var MSG_MAX_S = 120;

  function msgFieldStyle() {
    return "width:100%;box-sizing:border-box;min-height:40px;padding:.5rem .65rem;margin-bottom:.45rem;" +
      "border:1.5px solid rgba(255,255,255,.28);border-radius:8px;background:rgba(255,255,255,.1);" +
      "color:#fff;font:inherit;font-size:.9rem;";
  }
  function msgInput(type, placeholder, maxLen) {
    var el = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") el.type = type;
    else { el.rows = 3; el.style.resize = "vertical"; }
    el.placeholder = placeholder;
    if (maxLen) el.maxLength = maxLen;
    el.style.cssText = msgFieldStyle();
    return el;
  }
  /* Rendre le micro au navigateur dès qu'on n'enregistre plus. */
  function msgReleaseMic() {
    if (msgFlux) { msgFlux.getTracks().forEach(function(t) { t.stop(); }); msgFlux = null; }
    if (msgTic) { clearInterval(msgTic); msgTic = null; }
  }

  function showMessageForm() {
    var m = MSG_UI[currentLang] || MSG_UI.fr;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    agentSay(m.intro, false);

    var host = agentEl("agentMenu");
    if (!host) return;
    host.innerHTML = "";
    msgBlob = null; msgChunks = []; msgSec = 0; msgReleaseMic();

    var fName = msgInput("text", m.name, 120);
    var fTel  = msgInput("tel", m.tel, 40);
    var fMail = msgInput("email", m.mail, 160);
    var fText = msgInput("textarea", m.textPh, 4000);
    [fName, fTel, fMail, fText].forEach(function(el) { host.appendChild(el); });

    // Ligne d'enregistrement : bouton + chronomètre + réécoute.
    var ligne = document.createElement("div");
    ligne.style.cssText = "display:flex;align-items:center;gap:.5rem;margin:.2rem 0 .5rem;";
    var btnRec = document.createElement("button");
    btnRec.type = "button"; btnRec.textContent = m.rec;
    btnRec.style.cssText = "flex:1;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);" +
      "color:#fff;font:inherit;font-weight:600;font-size:.88rem;padding:.5rem .7rem;border-radius:8px;cursor:pointer;";
    var chrono = document.createElement("span");
    chrono.textContent = "0:00";
    chrono.style.cssText = "font-variant-numeric:tabular-nums;font-weight:700;font-size:.9rem;opacity:.85;min-width:3ch;";
    ligne.appendChild(btnRec); ligne.appendChild(chrono);
    host.appendChild(ligne);

    var player = document.createElement("audio");
    player.controls = true;
    player.style.cssText = "width:100%;display:none;margin-bottom:.5rem;";
    host.appendChild(player);

    var err = document.createElement("p");
    err.style.cssText = "margin:.1rem 0 .5rem;font-size:.82rem;color:#ffb4b4;display:none;";
    host.appendChild(err);
    function fail(text) { err.textContent = text; err.style.display = "block"; }

    function tick() {
      chrono.textContent = Math.floor(msgSec / 60) + ":" + String(msgSec % 60).padStart(2, "0");
    }

    btnRec.onclick = async function() {
      if (msgRec && msgRec.state === "recording") { msgRec.stop(); return; }
      if (msgBlob) {                       // « Recommencer » : on repart à zéro
        msgBlob = null; msgSec = 0; tick();
        player.style.display = "none"; player.removeAttribute("src");
        btnRec.textContent = m.rec;
        return;
      }
      if (!(navigator.mediaDevices && window.MediaRecorder)) { fail(m.micKo); return; }
      try { msgFlux = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { fail(m.micKo); return; }

      var mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
        .find(function(x) { return MediaRecorder.isTypeSupported(x); }) || "";
      try { msgRec = mime ? new MediaRecorder(msgFlux, { mimeType: mime }) : new MediaRecorder(msgFlux); }
      catch (e) { msgReleaseMic(); fail(m.micKo); return; }

      msgChunks = [];
      msgRec.ondataavailable = function(e) { if (e.data && e.data.size) msgChunks.push(e.data); };
      msgRec.onstop = function() {
        msgReleaseMic();
        msgBlob = new Blob(msgChunks, { type: msgRec.mimeType || "audio/webm" });
        player.src = URL.createObjectURL(msgBlob);
        player.style.display = "block";
        btnRec.textContent = m.again;
      };
      err.style.display = "none";
      msgSec = 0; tick(); msgRec.start();
      btnRec.textContent = m.stop;
      msgTic = setInterval(function() {
        msgSec++; tick();
        if (msgSec >= MSG_MAX_S && msgRec.state === "recording") msgRec.stop();
      }, 1000);
    };

    var btnSend = document.createElement("button");
    btnSend.type = "button"; btnSend.className = "primary"; btnSend.textContent = m.send;
    btnSend.onclick = function() {
      var tel = fTel.value.trim(), mail = fMail.value.trim(), texte = fText.value.trim();
      if (!tel && !mail) { fail(m.noContact); fTel.focus(); return; }
      if (!texte && !msgBlob) { fail(m.empty); fText.focus(); return; }
      err.style.display = "none";
      btnSend.disabled = true;
      agentSay(m.sending, false);

      var fd = new FormData();
      fd.append("projet", activeId || "");
      fd.append("nom", fName.value.trim());
      fd.append("telephone", tel);
      fd.append("email", mail);
      fd.append("message", texte);
      fd.append("langue", currentLang);
      if (msgBlob) {
        fd.append("duree", String(msgSec));
        fd.append("audio", msgBlob, "message." + (msgBlob.type.indexOf("mp4") >= 0 ? "m4a" : "webm"));
      }
      fetch("api/message-depot.php", { method: "POST", body: fd })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          btnSend.disabled = false;
          if (!d || !d.ok) { fail((d && d.error) || m.empty); agentSay(m.intro, false); return; }
          msgReleaseMic();
          agentSay(m.thanks, true);
          agentMenu([[m.back, mainMenu]]);
        })
        .catch(function() { btnSend.disabled = false; fail(m.empty); });
    };

    var btnBack = document.createElement("button");
    btnBack.type = "button"; btnBack.textContent = m.back;
    btnBack.onclick = function() { msgReleaseMic(); mainMenu(); };

    host.appendChild(btnSend);
    host.appendChild(btnBack);
    fName.focus();
  }

  /* Choix de la langue de conversation avant de lancer la voix. */
  function showConvLangs() {
    var a = AGENT_UI[currentLang] || AGENT_UI.fr;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    agentSay(a.chooseLang, false);
    var entries = CONV_LANGS.map(function(l) {
      return [l.label, function() { connectVoice(l.code); }, "primary"];
    });
    entries.push([a.back, mainMenu]);
    agentMenu(entries);
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
      /* Code valide mais pas de canal voix (LiveKit absent ou non configuré) :
         on bascule sur le contact direct. Surtout, on ne dit PAS « parlez, on
         vous entend » — personne n'écoute, et le visiteur parlerait dans le
         vide avant de comprendre. */
      agentSay(c.connectedNoVoice.replace("{name}", data.agent_name || ""), false);
      showAdvisorContact(data);
      return;
    }
    connectDirect(data.url, data.token, data.agent_name || "", data);
  }

  /* ── Demander à parler à un conseiller précis ──────────────────────────── */
  var directTimer = null;

  function directArreterAttente() {
    if (directTimer) { clearInterval(directTimer); directTimer = null; }
  }

  /* Repli commun à tous les échecs : laisser un message plutôt que renvoyer le
     visiteur au menu les mains vides. Il a manifesté une envie de parler, on
     ne la laisse pas retomber. */
  function directRepli() {
    var m = MSG_UI[currentLang] || MSG_UI.fr;
    agentMenu([[m.leave, showMessageForm, "primary"], [m.back, mainMenu]]);
  }

  function demanderConseiller(nom) {
    var d = directT();
    directArreterAttente();
    openAgent(false);
    agentSay(d.intro.replace("{name}", nom), false);

    var host = agentEl("agentMenu");
    if (!host) return;
    host.innerHTML = "";

    var champ = msgInput("text", d.yourName, 80);
    host.appendChild(champ);

    var err = document.createElement("div");
    err.style.cssText = "color:#ffd2d2;font-size:.82rem;margin:-.2rem 0 .4rem;display:none;";
    host.appendChild(err);

    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "primary"; btn.textContent = d.ask;
    btn.onclick = function() {
      var visiteur = champ.value.trim();
      if (!visiteur) { err.textContent = d.needName; err.style.display = "block"; champ.focus(); return; }
      directLancer(nom, visiteur);
    };
    champ.addEventListener("keydown", function(e) { if (e.key === "Enter") btn.click(); });

    var retour = document.createElement("button");
    retour.type = "button"; retour.textContent = (CODE_UI[currentLang] || CODE_UI.fr).back;
    retour.onclick = mainMenu;

    host.appendChild(btn);
    host.appendChild(retour);
    champ.focus();
  }

  async function directLancer(nom, visiteur) {
    var d = directT();
    agentSay(d.asking.replace("{name}", nom), false);
    agentMenu([]);

    var data = null;
    try {
      var body = new URLSearchParams({
        action: "create", projet: activeId || "", visitor: visiteur, conseiller: nom
      });
      var res = await fetch("api/agent-access.php", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      data = await res.json();
    } catch (e) {}

    if (!data || !data.ok || !data.found) { agentSay(d.notFound, false); directRepli(); return; }
    /* Le serveur revérifie la présence : entre l'affichage de la puce et le
       clic, il s'écoule jusqu'à huit secondes — le temps de partir. */
    if (!data.online) {
      agentSay(d.gone.replace("{name}", data.agent_name || nom), false);
      directRepli();
      return;
    }

    var vrai = data.agent_name || nom;
    agentSay(d.waiting.replace("{name}", vrai), false);
    agentMenu([[d.cancel, function() { directArreterAttente(); mainMenu(); }]]);
    directAttendre(visiteur, vrai);
  }

  /**
   * Attend que le commercial accepte, en sondant la demande.
   *
   * Le code à quatre chiffres existe toujours côté serveur, mais le visiteur ne
   * le voit jamais : il servait à ce que l'hôtesse le DICTE. Ici c'est le
   * visiteur qui a cliqué, lui faire retaper un code qu'on vient de lui
   * afficher n'aurait aucun sens — on le consomme pour lui.
   */
  function directAttendre(visiteur, nom) {
    var d = directT();
    var fin = Date.now() + 90000;      // au-delà, le commercial est occupé ailleurs
    directArreterAttente();
    directTimer = setInterval(function() {
      if (Date.now() > fin) {
        directArreterAttente();
        agentSay(d.timeout.replace("{name}", nom), false);
        directRepli();
        return;
      }
      var url = "api/agent-access.php?action=code-for-visitor" +
                "&projet=" + encodeURIComponent(activeId || "") +
                "&visitor=" + encodeURIComponent(visiteur);
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(r) {
          if (!r || !r.found) return;          // pas encore enregistrée
          if (r.statut === "denied") {
            directArreterAttente();
            agentSay(d.denied.replace("{name}", nom), false);
            directRepli();
            return;
          }
          if (r.statut === "approved" && r.code) {
            directArreterAttente();
            verifyAccessCode(r.code);
          }
        })
        .catch(function() { /* coupure réseau : on retente au tour suivant */ });
    }, 3000);
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
    var sab = document.getElementById("stageAgentBtn");
    if (sab) sab.classList.add("hidden");
    agentSay(a.welcome, speak);
    mainMenu();
  }

  /* Connexion à l'agent vocal : jeton PHP → room LiveKit → micro. */
  async function connectVoice(convLang) {
    var a = AGENT_UI[currentLang] || AGENT_UI.fr;
    var LK = window.LivekitClient;
    // Langue de la CONVERSATION (choisie par le visiteur) ; le texte à l'écran
    // reste dans la langue du site (currentLang).
    var talkLang = convLang || currentLang;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (!LK) { agentSay(a.offline, false); return; }

    agentSay(a.connecting, false);
    agentMenu([]);

    var data = null;
    try {
      var res = await fetch("api/accueil-token.php?project=" + encodeURIComponent(activeId) +
                            "&lang=" + encodeURIComponent(talkLang));
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

    var agentLabel = document.getElementById("stageAgentLabel");
    if (agentLabel) agentLabel.textContent = (AGENT_UI[lang] || AGENT_UI.fr).talk;

    selectOffice(activeId || requestedId(), lang, false);
    refreshFsButton();
  };

  document.addEventListener("DOMContentLoaded", function() {
    var close = document.getElementById("agentClose");
    if (close) close.onclick = closeAgent;
    var stageAgentBtn = document.getElementById("stageAgentBtn");
    if (stageAgentBtn) stageAgentBtn.onclick = function() { openAgent(false); };
    setupFullscreen();
    initPage("projects", "");

    /* ?hotesse=1 — le visiteur arrive du lanceur « On en parle ? » d'une autre
       page, où il a choisi de parler à l'hôtesse. Lui redemander de cliquer sur
       la pastille lui ferait refaire le geste qu'il vient de faire.
       Après initPage() : le panneau lit currentLang, réglé par celui-ci. */
    try {
      if (new URLSearchParams(window.location.search).get("hotesse")) openAgent(false);
    } catch (e) { /* URLSearchParams absent : le visiteur clique, comme avant. */ }
  });

  // Ne pas laisser une room ouverte derrière soi.
  window.addEventListener("beforeunload", hangUp);
})();
