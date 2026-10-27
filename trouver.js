/**
 * trouver.js — étape 1 du parcours client, en version guidée.
 *
 * Quatre questions puis une sélection de projets. Les trois premières
 * filtrent sur des données réelles (type, ville, typologies de
 * data/projects.json) ; la quatrième qualifie le contact sans filtrer.
 *
 * DEUX PRINCIPES
 *
 * 1. Jamais de cul-de-sac : chaque écran ne propose que des réponses qui
 *    mènent à au moins un projet. Les options sont donc calculées à partir
 *    du jeu déjà filtré, jamais écrites en dur.
 *
 * 2. Jamais un péage : « Passer » est offert à chaque écran, et l'accueil
 *    garde son entrée directe vers le catalogue. Le questionnaire est une
 *    voie proposée, pas un passage obligé.
 *
 * L'état vit dans l'URL (?quoi=&ville=&taille=) : le conseiller qui
 * accompagne à distance ouvre le même écran que le visiteur.
 */
(function () {
  'use strict';

  var NB_ECRANS = 4;

  var T = {
    fr: {
      titre: 'Trouvons votre logement',
      sousTitre: 'Quelques questions, et nous vous montrons ce qui vous correspond.',
      q1: 'Vous cherchez quoi ?', a1: 'Cela nous évite de vous montrer ce qui ne vous concerne pas.',
      q2: 'Dans quel secteur ?', a2: 'Choisissez une commune, ou laissez-nous tout vous montrer.',
      q3: 'Quelle taille ?', a3: 'Une idée approximative suffit.',
      q4: 'Votre budget ?', a4: 'Facultatif. Il ne filtre rien ici : il permet à votre conseiller de préparer des propositions justes.',
      habiter: 'Un appartement pour y habiter', habiterNote: 'Résidences et immeubles',
      investir: 'Un bien pour investir', investirNote: 'Rendement locatif ou revente',
      terrain: 'Un terrain à bâtir', terrainNote: 'Lotissements viabilisés',
      local: 'Un local ou des bureaux', localNote: 'Commerces et plateaux',
      peuImporte: 'Peu importe', montrezTout: 'Montrez-moi tout',
      neSaisPas: 'Je ne sais pas encore', enParler: 'Je préfère en parler',
      retour: '← Retour', passer: 'Passer cette question',
      resultatUn: '1 projet pour vous', resultatN: '{n} projets pour vous',
      resultatAucun: 'Aucun projet ne correspond exactement.',
      aucunAide: 'Élargissez un critère, ou parlons-en : un conseiller connaît les arrivées à venir.',
      refaire: 'Recommencer', voirTout: 'Voir tous les projets',
      voirProjet: 'Découvrir', choisir: '🏢 Choisir mon logement',
      livraison: 'Livraison', disponibles: '{n} disponibles', commodites: '{n} commodités à proximité',
      captureTitre: 'Gardez cette sélection sous la main',
      captureAide: 'Nous vous l’envoyons sur WhatsApp, et un conseiller peut la reprendre avec vous.',
      captureBtn: 'Recevoir ma sélection',
      waSujet: 'ma sélection : {projets}',
      chargement: 'Un instant…'
    },
    en: {
      titre: 'Let’s find your home',
      sousTitre: 'A few questions, and we’ll show you what fits.',
      q1: 'What are you looking for?', a1: 'So we don’t show you what doesn’t concern you.',
      q2: 'In which area?', a2: 'Pick a town, or let us show you everything.',
      q3: 'What size?', a3: 'A rough idea is enough.',
      q4: 'Your budget?', a4: 'Optional. It filters nothing here: it lets your adviser prepare sound proposals.',
      habiter: 'An apartment to live in', habiterNote: 'Residences and buildings',
      investir: 'A property to invest in', investirNote: 'Rental yield or resale',
      terrain: 'A plot to build on', terrainNote: 'Serviced land',
      local: 'A shop or offices', localNote: 'Retail and office floors',
      peuImporte: 'Any', montrezTout: 'Show me everything',
      neSaisPas: 'I don’t know yet', enParler: 'I’d rather discuss it',
      retour: '← Back', passer: 'Skip this question',
      resultatUn: '1 project for you', resultatN: '{n} projects for you',
      resultatAucun: 'No project matches exactly.',
      aucunAide: 'Widen one criterion, or let’s talk: an adviser knows what’s coming next.',
      refaire: 'Start over', voirTout: 'See all projects',
      voirProjet: 'Discover', choisir: '🏢 Choose my home',
      livraison: 'Delivery', disponibles: '{n} available', commodites: '{n} amenities nearby',
      captureTitre: 'Keep this selection handy',
      captureAide: 'We’ll send it on WhatsApp, and an adviser can pick it up with you.',
      captureBtn: 'Get my selection',
      waSujet: 'my selection: {projets}',
      chargement: 'One moment…'
    },
    ar: {
      titre: 'لنجد سكنك',
      sousTitre: 'بضعة أسئلة، ونعرض عليك ما يناسبك.',
      q1: 'عمّ تبحث؟', a1: 'حتى لا نعرض عليك ما لا يعنيك.',
      q2: 'في أي منطقة؟', a2: 'اختر جماعة، أو دعنا نعرض عليك كل شيء.',
      q3: 'أي مساحة؟', a3: 'فكرة تقريبية تكفي.',
      q4: 'ميزانيتك؟', a4: 'اختياري. لا يُستعمل للتصفية هنا: يساعد مستشارك على إعداد عروض مناسبة.',
      habiter: 'شقة للسكن', habiterNote: 'إقامات وعمارات',
      investir: 'عقار للاستثمار', investirNote: 'مردود كرائي أو إعادة بيع',
      terrain: 'أرض للبناء', terrainNote: 'تجزئات مجهزة',
      local: 'محل أو مكاتب', localNote: 'محلات تجارية ومكاتب',
      peuImporte: 'لا يهم', montrezTout: 'اعرض لي كل شيء',
      neSaisPas: 'لا أعرف بعد', enParler: 'أفضّل التحدث في الأمر',
      /* Pas de flèche en arabe : le sens de lecture s'inverse mais pas le
         glyphe, et « ← » y désignerait l'avant plutôt que l'arrière. */
      retour: 'رجوع', passer: 'تخطي هذا السؤال',
      resultatUn: 'مشروع واحد لك', resultatN: '{n} مشاريع لك',
      resultatAucun: 'لا يوجد مشروع مطابق تمامًا.',
      aucunAide: 'وسّع أحد المعايير، أو لنتحدث: المستشار يعرف المشاريع القادمة.',
      refaire: 'إعادة', voirTout: 'عرض كل المشاريع',
      voirProjet: 'اكتشاف', choisir: '🏢 اختر سكني',
      livraison: 'التسليم', disponibles: '{n} متاح', commodites: '{n} مرفقًا قريبًا',
      captureTitre: 'احتفظ بهذا الاختيار',
      captureAide: 'نرسله لك عبر واتساب، ويمكن لمستشار أن يتابعه معك.',
      captureBtn: 'استلام اختياري',
      waSujet: 'اختياري: {projets}',
      chargement: 'لحظة…'
    },
    es: {
      titre: 'Encontremos su vivienda',
      sousTitre: 'Unas preguntas y le mostramos lo que le corresponde.',
      q1: '¿Qué busca?', a1: 'Así no le mostramos lo que no le concierne.',
      q2: '¿En qué zona?', a2: 'Elija un municipio, o déjenos mostrarle todo.',
      q3: '¿Qué tamaño?', a3: 'Una idea aproximada basta.',
      q4: '¿Su presupuesto?', a4: 'Opcional. Aquí no filtra nada: permite a su asesor preparar propuestas ajustadas.',
      habiter: 'Un apartamento para vivir', habiterNote: 'Residencias y edificios',
      investir: 'Un bien para invertir', investirNote: 'Rentabilidad o reventa',
      terrain: 'Un terreno para construir', terrainNote: 'Parcelas urbanizadas',
      local: 'Un local u oficinas', localNote: 'Comercios y plantas',
      peuImporte: 'Indiferente', montrezTout: 'Muéstremelo todo',
      neSaisPas: 'Aún no lo sé', enParler: 'Prefiero hablarlo',
      retour: '← Volver', passer: 'Saltar esta pregunta',
      resultatUn: '1 proyecto para usted', resultatN: '{n} proyectos para usted',
      resultatAucun: 'Ningún proyecto coincide exactamente.',
      aucunAide: 'Amplíe un criterio, o hablemos: un asesor conoce las próximas incorporaciones.',
      refaire: 'Empezar de nuevo', voirTout: 'Ver todos los proyectos',
      voirProjet: 'Descubrir', choisir: '🏢 Elegir mi vivienda',
      livraison: 'Entrega', disponibles: '{n} disponibles', commodites: '{n} servicios cerca',
      captureTitre: 'Guarde esta selección',
      captureAide: 'Se la enviamos por WhatsApp, y un asesor puede retomarla con usted.',
      captureBtn: 'Recibir mi selección',
      waSujet: 'mi selección: {projets}',
      chargement: 'Un momento…'
    }
  };

  /* Le premier écran mêle le type de bien et l'intention. « Habiter » et
     « investir » visent le même catalogue d'appartements, mais l'intention
     est ce que le conseiller a le plus besoin de savoir : elle est retenue
     même si elle ne filtre pas. */
  var QUOI = [
    { cle: 'habiter',  emoji: '🏠', types: ['appartements'] },
    { cle: 'investir', emoji: '📈', types: null },              // tous les types
    { cle: 'terrain',  emoji: '🏗️', types: ['terrains'] },
    { cle: 'local',    emoji: '🏪', types: ['commerces', 'bureaux'] }
  ];

  // `sens` vaut 1 quand on avance, -1 quand on revient : un écran sans objet
  // s'enjambe dans la direction du déplacement, sinon le retour rebondirait
  // aussitôt vers l'avant et l'écran précédent serait inatteignable.
  var etat = { ecran: 1, sens: 1, quoi: '', ville: '', taille: '', budget: '', dispos: null };

  function lang() {
    return (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
  }
  function t(cle) { return T[lang()][cle] || T.fr[cle] || cle; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function projets() { return window.PROJECTS || []; }

  /** Commune d'un projet : « Dcheira El Jihadia (La Pergola) » → « Dcheira El Jihadia ». */
  function ville(p) {
    var l = (p.location && (p.location.fr || p.location.en)) || '';
    return l.split(',')[0].replace(/\s*\(.*\)\s*/, '').trim();
  }

  /** Nom traduit. */
  function nom(p) {
    var n = p.name || {};
    return n[lang()] || n.fr || p.id;
  }

  /**
   * Jeu de projets restant, en appliquant les réponses jusqu'à `jusqua`.
   * Sert deux fois : pour le résultat, et pour savoir quelles options d'un
   * écran mènent encore quelque part.
   */
  function filtrer(jusqua) {
    var liste = projets().filter(function (p) { return p.status !== 'hidden'; });
    if (jusqua >= 1 && etat.quoi) {
      var def = QUOI.filter(function (q) { return q.cle === etat.quoi; })[0];
      if (def && def.types) {
        liste = liste.filter(function (p) { return def.types.indexOf(p.type) >= 0; });
      }
    }
    if (jusqua >= 2 && etat.ville) {
      liste = liste.filter(function (p) { return ville(p) === etat.ville; });
    }
    if (jusqua >= 3 && etat.taille) {
      liste = liste.filter(function (p) {
        return (p.typologies || []).some(function (ty) { return etiquetteTaille(ty) === etat.taille; });
      });
    }
    return liste;
  }

  /** Étiquette de taille d'une typologie : « F3 », ou une tranche de surface. */
  function etiquetteTaille(ty) {
    if (ty.label) return ty.label;
    var s = ty.surface_min || ty.surface_max;
    if (!s) return '';
    if (s < 100) return '< 100 m²';
    if (s < 200) return '100 – 200 m²';
    return '> 200 m²';
  }

  /* ── Rendu ────────────────────────────────────────────────────────── */

  function jauge() {
    var h = '<div class="tr-jauge" aria-hidden="true">';
    for (var i = 1; i <= NB_ECRANS; i++) {
      h += '<i class="' + (i < etat.ecran ? 'est-faite' : (i === etat.ecran ? 'est-active' : '')) + '"></i>';
    }
    return h + '</div>';
  }

  function entete(q, a) {
    return jauge() + '<h2 class="tr-question">' + esc(q) + '</h2>' +
           '<p class="tr-aide">' + esc(a) + '</p>';
  }

  function barre(avecRetour, avecPasser) {
    var h = '<div class="tr-barre">';
    h += avecRetour ? '<button type="button" class="tr-retour" data-aller="' + (etat.ecran - 1) + '">' + esc(t('retour')) + '</button>' : '<span></span>';
    if (avecPasser) h += '<button type="button" class="tr-passer" data-passer="1">' + esc(t('passer')) + '</button>';
    return h + '</div>';
  }

  function carte(cle, emoji, titre, note, champ, valeur) {
    return '<button type="button" class="tr-carte' + (etat[champ] === valeur ? ' est-choisie' : '') + '" ' +
             'data-champ="' + champ + '" data-valeur="' + esc(valeur) + '">' +
             '<span class="tr-carte-emoji" aria-hidden="true">' + emoji + '</span>' +
             '<span class="tr-carte-txt"><span class="tr-carte-titre">' + esc(titre) + '</span>' +
             (note ? '<span class="tr-carte-note">' + esc(note) + '</span>' : '') + '</span></button>';
  }

  function pastille(champ, valeur, libelle, note) {
    return '<button type="button" class="tr-pastille" data-champ="' + champ + '" data-valeur="' + esc(valeur) + '">' +
           esc(libelle) + (note ? ' <small>' + esc(note) + '</small>' : '') + '</button>';
  }

  function ecran1() {
    var h = entete(t('q1'), t('a1')) + '<div class="tr-choix">';
    QUOI.forEach(function (q) {
      h += carte(q.cle, q.emoji, t(q.cle), t(q.cle + 'Note'), 'quoi', q.cle);
    });
    h += '</div>' + barre(false, true);
    return h;
  }

  function ecran2() {
    // Les communes sont tirées du jeu déjà filtré par la question 1 : on ne
    // propose jamais une ville qui ne donnerait aucun projet.
    var liste = filtrer(1), compte = {};
    liste.forEach(function (p) { var v = ville(p); if (v) compte[v] = (compte[v] || 0) + 1; });
    var villes = Object.keys(compte).sort(function (a, b) { return compte[b] - compte[a] || a.localeCompare(b, 'fr'); });

    var h = entete(t('q2'), t('a2')) + '<div class="tr-pastilles">';
    villes.forEach(function (v) { h += pastille('ville', v, v, '(' + compte[v] + ')'); });
    h += pastille('ville', '', t('montrezTout'), '');
    h += '</div>' + barre(true, true);
    return h;
  }

  function ecran3() {
    var liste = filtrer(2), compte = {};
    liste.forEach(function (p) {
      (p.typologies || []).forEach(function (ty) {
        var e = etiquetteTaille(ty);
        if (e) compte[e] = (compte[e] || 0) + 1;
      });
    });
    var tailles = Object.keys(compte).sort();
    // Aucune typologie déclarée (des lotissements, souvent) : la question n'a
    // pas d'objet, on l'enjambe plutôt que d'afficher un écran vide.
    if (!tailles.length) { etat.ecran += etat.sens; return rendu(); }

    var h = entete(t('q3'), t('a3')) + '<div class="tr-pastilles">';
    tailles.forEach(function (e) { h += pastille('taille', e, e, '(' + compte[e] + ')'); });
    h += pastille('taille', '', t('peuImporte'), '');
    h += '</div>' + barre(true, true);
    return h;
  }

  function ecran4() {
    /* Le budget ne filtre rien tant que les prix ne sont pas diffusés — et
       l'aide le dit franchement. Filtrer sur un prix caché reviendrait à le
       laisser deviner par dichotomie, ce que l'API interdit déjà. */
    var tranches = ['< 500 000', '500 000 – 800 000', '800 000 – 1 200 000', '> 1 200 000'];
    var h = entete(t('q4'), t('a4')) + '<div class="tr-pastilles">';
    tranches.forEach(function (b) { h += pastille('budget', b, b + ' DH', ''); });
    h += pastille('budget', '', t('neSaisPas'), '');
    h += pastille('budget', 'a-discuter', t('enParler'), '');
    h += '</div>' + barre(true, true);
    return h;
  }

  /** Vignette d'un projet, avec repli sur ce qui existe. */
  function vignette(p) {
    var i = p.images || {};
    return i.thumb_jpg || i.thumb || i.hero || i.triptych || i.logo || '';
  }

  function ecranResultat() {
    var liste = filtrer(3);
    var h = jauge();

    if (!liste.length) {
      return h + '<div class="tr-vide"><p><strong>' + esc(t('resultatAucun')) + '</strong></p>' +
        '<p>' + esc(t('aucunAide')) + '</p></div>' +
        '<div class="tr-refaire">' +
          '<button type="button" class="tr-btn" data-aller="1">' + esc(t('refaire')) + '</button> ' +
          '<a class="tr-btn" href="explorer.html#' + lang() + '">' + esc(t('voirTout')) + '</a> ' +
          '<a class="tr-btn tr-btn-or" href="contact.html#' + lang() + '">' + esc(t('enParler')) + '</a>' +
        '</div>';
    }

    h += '<h2 class="tr-question">' +
      esc(liste.length === 1 ? t('resultatUn') : t('resultatN').replace('{n}', liste.length)) + '</h2>';

    // Rappel des réponses : le visiteur voit sur quoi la sélection repose, et
    // comprend quoi élargir si elle lui semble courte.
    h += '<div class="tr-resume">';
    if (etat.quoi)   h += '<span>' + esc(t(etat.quoi)) + '</span>';
    if (etat.ville)  h += '<span>' + esc(etat.ville) + '</span>';
    if (etat.taille) h += '<span>' + esc(etat.taille) + '</span>';
    h += '</div>';

    h += '<div class="tr-liste">';
    liste.forEach(function (p) {
      var img = vignette(p), d = etat.dispos && etat.dispos[p.id];
      h += '<article class="tr-projet">' +
        '<div class="tr-projet-img"' + (img ? ' style="background-image:url(' + esc(img) + ')"' : '') + '></div>' +
        '<div class="tr-projet-corps">' +
          '<h3 class="tr-projet-nom">' + esc(nom(p)) + '</h3>' +
          '<p class="tr-projet-lieu">📍 ' + esc((p.location && (p.location[lang()] || p.location.fr)) || '') + '</p>' +
          '<div class="tr-projet-faits">' +
            (d && d.disponibles ? '<span class="tr-fait tr-fait-dispo">' + esc(t('disponibles').replace('{n}', d.disponibles)) + '</span>' : '') +
            (p.delivery && p.delivery.date ? '<span class="tr-fait">' + esc(t('livraison') + ' ' + p.delivery.date) + '</span>' : '') +
            (p.poi_count ? '<span class="tr-fait">' + esc(t('commodites').replace('{n}', p.poi_count)) + '</span>' : '') +
          '</div>' +
          '<div class="tr-projet-actions">' +
            '<a class="tr-btn tr-btn-or" href="disponibilites.html?projet=' + encodeURIComponent(p.id) + '#' + lang() + '">' + esc(t('choisir')) + '</a>' +
            '<a class="tr-btn" href="project.html?id=' + encodeURIComponent(p.id) + '#' + lang() + '">' + esc(t('voirProjet')) + '</a>' +
          '</div>' +
        '</div></article>';
    });
    h += '</div>';

    // Point de capture : on donne d'abord (la sélection), on demande ensuite.
    h += '<div class="tr-capture">' +
        '<p><strong>' + esc(t('captureTitre')) + '</strong><br>' + esc(t('captureAide')) + '</p>' +
        '<a class="tr-wa" id="trWhatsapp" href="#" target="_blank" rel="noopener">' +
          (typeof whatsappIconSvg === 'function' ? whatsappIconSvg() : '') +
          esc(t('captureBtn')) + '</a>' +
      '</div>';

    h += '<div class="tr-refaire"><button type="button" class="tr-btn" data-aller="1">' +
         esc(t('refaire')) + '</button></div>';
    return h;
  }

  function rendu() {
    var hote = document.getElementById('njTrouver');
    if (!hote) return '';
    var h = etat.ecran === 1 ? ecran1()
          : etat.ecran === 2 ? ecran2()
          : etat.ecran === 3 ? ecran3()
          : etat.ecran === 4 ? ecran4()
          : ecranResultat();
    if (typeof h === 'string') hote.innerHTML = h;
    majWhatsapp();
    majUrl();
    return h;
  }

  /** Lien WhatsApp du point de capture : numéro commercial de contacts.json. */
  function majWhatsapp() {
    var a = document.getElementById('trWhatsapp');
    if (!a) return;
    var contacts = window.siteContacts || {};
    var tels = (contacts.phones || []).filter(function (p) { return p.whatsapp; });
    // Le commercial d'abord ; à défaut le premier numéro WhatsApp déclaré.
    var choisi = tels.filter(function (p) { return /commercial/i.test(p.label || ''); })[0] || tels[0];
    if (!choisi) { a.style.display = 'none'; return; }
    a.style.display = '';
    var noms = filtrer(3).slice(0, 5).map(nom).join(', ');
    var sujet = t('waSujet').replace('{projets}', noms);
    a.href = (typeof contactWhatsappMessageHref === 'function')
      ? contactWhatsappMessageHref(choisi.number, lang(), { subject: sujet })
      : 'https://wa.me/' + String(choisi.number).replace(/\D/g, '');
  }

  /** L'état dans l'URL : le conseiller à distance ouvre le même écran. */
  function majUrl() {
    try {
      var p = new URLSearchParams();
      if (etat.quoi)   p.set('quoi', etat.quoi);
      if (etat.ville)  p.set('ville', etat.ville);
      if (etat.taille) p.set('taille', etat.taille);
      if (etat.ecran > 1) p.set('e', etat.ecran);
      var q = p.toString();
      history.replaceState({}, '', 'trouver.html' + (q ? '?' + q : '') + '#' + lang());
    } catch (e) {}
  }

  function lireUrl() {
    try {
      var p = new URLSearchParams(location.search);
      etat.quoi = p.get('quoi') || '';
      etat.ville = p.get('ville') || '';
      etat.taille = p.get('taille') || '';
      var e = parseInt(p.get('e'), 10);
      etat.ecran = (e >= 1 && e <= NB_ECRANS + 1) ? e : 1;
    } catch (err) {}
  }

  /* ── Interactions ─────────────────────────────────────────────────── */

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-champ],[data-aller],[data-passer]') : null;
    if (!el) return;

    if (el.hasAttribute('data-champ')) {
      var champ = el.getAttribute('data-champ');
      etat[champ] = el.getAttribute('data-valeur') || '';
      // Changer une réponse invalide les suivantes : garder une ville qui
      // n'existe plus dans le nouveau type donnerait zéro résultat.
      if (champ === 'quoi')  { etat.ville = ''; etat.taille = ''; }
      if (champ === 'ville') { etat.taille = ''; }
      etat.sens = 1; etat.ecran++;
      rendu();
      window.scrollTo(0, 0);
      return;
    }
    if (el.hasAttribute('data-passer')) { etat.sens = 1; etat.ecran++; rendu(); window.scrollTo(0, 0); return; }
    if (el.hasAttribute('data-aller')) {
      var n = parseInt(el.getAttribute('data-aller'), 10) || 1;
      if (n === 1) { etat.quoi = etat.ville = etat.taille = etat.budget = ''; }
      etat.sens = n < etat.ecran ? -1 : 1;
      etat.ecran = Math.max(1, n);
      rendu();
      window.scrollTo(0, 0);
    }
  });

  /* Le menu partagé rappelle ce hook à chaque changement de langue. */
  window.onLanguageChange = function () {
    var h = document.getElementById('trTitre'), s = document.getElementById('trSousTitre');
    if (h) h.textContent = t('titre');
    if (s) s.textContent = t('sousTitre');
    document.title = t('titre') + ' — Narjiss';
    rendu();
  };

  /* contacts.json arrive après le premier rendu (initPage le charge en second) :
     le lien WhatsApp est donc recalculé quand le numéro est enfin connu. */
  window.onContactDataChange = function () { majWhatsapp(); };

  /* Les disponibilités viennent de la base, pas de projects.json : on rend
     l'écran sans elles, puis on le repeint quand elles arrivent. La page ne
     doit jamais attendre le réseau pour afficher sa première question. */
  function chargerDispos() {
    fetch('api/lots-public.php?projets=1', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) return;
        etat.dispos = {};
        d.projets.forEach(function (p) { etat.dispos[p.id] = p; });
        if (etat.ecran > NB_ECRANS) rendu();   // seul le résultat les affiche
      })
      .catch(function () {});   // sans elles, les cartes perdent une pastille, rien de plus
  }

  document.addEventListener('DOMContentLoaded', function () {
    lireUrl();
    initPage('projects', '');
    chargerDispos();
  });
})();
