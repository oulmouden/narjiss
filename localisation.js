/**
 * localisation.js — page allégée « le projet dans son territoire ».
 *
 * Extrait de la section Localisation de project.js : carte Leaflet, marqueur
 * de la résidence, POI du quartier lus dans le CSV du projet, panneau de
 * catégories avec tri et filtre de distance. Tout le reste de la fiche projet
 * (médias, typologies, simulateur, dessin, routage) est volontairement absent.
 *
 * Projet lu dans l'URL : ?projet=<id> (alias ?id=<id>).
 */

(function () {
  'use strict';

  var UI = {
    fr: {
      kicker: "Localisation",
      title: "Le projet dans son territoire",
      text: "Repérez l'adresse et les commodités du quartier. Touchez une catégorie pour n'afficher que ses points sur la carte.",
      gpsLabel: "Coordonnées GPS",
      back: "Retour aux disponibilités",
      globalMap: "Carte globale",
      projectSheet: "Voir la fiche du projet",
      poiLoading: "Chargement des points d'intérêt du quartier...",
      poiCount: "points d'intérêt visibles",
      poiFallback: "Aucun fichier POI n'a encore été trouvé pour ce projet. La résidence reste visible sur la carte.",
      noProject: "Projet introuvable.",
      yourResidence: "Votre résidence",
      rating: "Note", reviews: "avis",
      sortBy: "Tri", sortDist: "Distance", sortName: "Nom", allCategories: "Toutes les catégories", gotoPoint: "Aller à un point…", gotoRepere: "Aller à un repère…",
      filterMax: "Filtre", allDistances: "Toutes", minWalk: "min à pied",
      walk: "à pied", drive: "en voiture",
      reperes: "Repères",
      jeuQuartier: "Quartier", jeuReperes: "Repères", reperesCount: " repères de la ville",
      popupZoom: "Zoomer", popupTrace: "Trajet"
    },
    en: {
      kicker: "Location",
      title: "The project in its territory",
      text: "Locate the address and the neighbourhood amenities. Tap a category to show only its points on the map.",
      gpsLabel: "GPS coordinates",
      back: "Back to availability",
      globalMap: "Global map",
      projectSheet: "View the project page",
      poiLoading: "Loading neighborhood points of interest...",
      poiCount: "visible points of interest",
      poiFallback: "No POI file has been found for this project yet. The residence remains visible on the map.",
      noProject: "Project not found.",
      yourResidence: "Your residence",
      rating: "Rating", reviews: "reviews",
      sortBy: "Sort", sortDist: "Distance", sortName: "Name", allCategories: "All categories", gotoPoint: "Go to a place…", gotoRepere: "Go to a landmark…",
      filterMax: "Filter", allDistances: "All", minWalk: "min walk",
      walk: "walk", drive: "drive",
      reperes: "Landmarks",
      jeuQuartier: "Neighbourhood", jeuReperes: "Landmarks", reperesCount: " city landmarks",
      popupZoom: "Zoom in", popupTrace: "Route"
    },
    ar: {
      kicker: "الموقع",
      title: "المشروع داخل مجاله",
      text: "حدد العنوان ومرافق الحي. المس فئة لعرض نقاطها وحدها على الخريطة.",
      gpsLabel: "إحداثيات GPS",
      back: "العودة إلى العروض",
      globalMap: "الخريطة الشاملة",
      projectSheet: "عرض بطاقة المشروع",
      poiLoading: "جاري تحميل نقاط الاهتمام في الحي...",
      poiCount: "نقطة اهتمام ظاهرة",
      poiFallback: "لم يتم العثور بعد على ملف نقاط الاهتمام لهذا المشروع. تبقى الإقامة ظاهرة على الخريطة.",
      noProject: "المشروع غير موجود.",
      yourResidence: "إقامتك",
      rating: "التقييم", reviews: "تقييم",
      sortBy: "الترتيب", sortDist: "المسافة", sortName: "الاسم", allCategories: "كل الفئات", gotoPoint: "الانتقال إلى نقطة…", gotoRepere: "الانتقال إلى معلمة…",
      filterMax: "تصفية", allDistances: "الكل", minWalk: "دقيقة مشيا",
      walk: "مشيا", drive: "بالسيارة",
      reperes: "معالم",
      jeuQuartier: "الحي", jeuReperes: "معالم", reperesCount: " من معالم المدينة",
      popupZoom: "تكبير", popupTrace: "المسار"
    },
    es: {
      kicker: "Localización",
      title: "El proyecto en su territorio",
      text: "Ubica la dirección y los servicios del barrio. Toca una categoría para mostrar solo sus puntos en el mapa.",
      gpsLabel: "Coordenadas GPS",
      back: "Volver a la disponibilidad",
      globalMap: "Mapa global",
      projectSheet: "Ver la ficha del proyecto",
      poiLoading: "Cargando puntos de interés del barrio...",
      poiCount: "puntos de interés visibles",
      poiFallback: "Todavía no se ha encontrado ningún archivo POI para este proyecto. La residencia sigue visible en el mapa.",
      noProject: "Proyecto no encontrado.",
      yourResidence: "Tu residencia",
      rating: "Nota", reviews: "reseñas",
      sortBy: "Orden", sortDist: "Distancia", sortName: "Nombre", allCategories: "Todas las categorías", gotoPoint: "Ir a un punto…", gotoRepere: "Ir a una referencia…",
      filterMax: "Filtro", allDistances: "Todas", minWalk: "min a pie",
      walk: "a pie", drive: "en coche",
      reperes: "Referencias",
      jeuQuartier: "Barrio", jeuReperes: "Referencias", reperesCount: " referencias de la ciudad",
      popupZoom: "Acercar", popupTrace: "Trayecto"
    }
  };

  var CATEGORY_LABELS = {
    ecole: { fr: "Ecole", en: "School", ar: "مدرسة", es: "Escuela" },
    education: { fr: "Ecole", en: "School", ar: "مدرسة", es: "Escuela" },
    school: { fr: "Ecole", en: "School", ar: "مدرسة", es: "Escuela" },
    transport: { fr: "Transport", en: "Transport", ar: "نقل", es: "Transporte" },
    admin: { fr: "Administration", en: "Administration", ar: "إدارة", es: "Administración" },
    administration: { fr: "Administration", en: "Administration", ar: "إدارة", es: "Administración" },
    magasin: { fr: "Magasin", en: "Shop", ar: "متجر", es: "Tienda" },
    shop: { fr: "Magasin", en: "Shop", ar: "متجر", es: "Tienda" },
    banque: { fr: "Banque", en: "Bank", ar: "بنك", es: "Banco" },
    bank: { fr: "Banque", en: "Bank", ar: "بنك", es: "Banco" },
    cafe: { fr: "Cafe", en: "Cafe", ar: "مقهى", es: "Cafe" },
    sante: { fr: "Sante", en: "Health", ar: "صحة", es: "Salud" },
    health: { fr: "Sante", en: "Health", ar: "صحة", es: "Salud" },
    pharmacie: { fr: "Pharmacie", en: "Pharmacy", ar: "صيدلية", es: "Farmacia" },
    pharmacy: { fr: "Pharmacie", en: "Pharmacy", ar: "صيدلية", es: "Farmacia" },
    mosquee: { fr: "Mosquee", en: "Mosque", ar: "مسجد", es: "Mezquita" },
    mosque: { fr: "Mosquee", en: "Mosque", ar: "مسجد", es: "Mezquita" },
    hammam: { fr: "Hammam", en: "Hammam", ar: "حمام", es: "Hammam" },
    restaurant: { fr: "Restaurant", en: "Restaurant", ar: "مطعم", es: "Restaurante" },
    hotel: { fr: "Hotel", en: "Hotel", ar: "فندق", es: "Hotel" },
    parc: { fr: "Parc", en: "Park", ar: "حديقة", es: "Parque" },
    park: { fr: "Parc", en: "Park", ar: "حديقة", es: "Parque" },
    sport: { fr: "Sport", en: "Sport", ar: "رياضة", es: "Deporte" },
    marche: { fr: "Marche", en: "Market", ar: "سوق", es: "Mercado" },
    market: { fr: "Marche", en: "Market", ar: "سوق", es: "Mercado" },
    aeroport: { fr: "Aeroport", en: "Airport", ar: "مطار", es: "Aeropuerto" },
    plage: { fr: "Plage", en: "Beach", ar: "شاطئ", es: "Playa" },
    medina: { fr: "Medina / Souk", en: "Medina / Souk", ar: "مدينة / سوق", es: "Medina / Zoco" },
    hopital: { fr: "Hopital", en: "Hospital", ar: "مستشفى", es: "Hospital" },
    monument: { fr: "Monument", en: "Landmark", ar: "معلمة", es: "Monumento" },
    marina: { fr: "Marina", en: "Marina", ar: "مارينا", es: "Marina" },
    musee: { fr: "Musee", en: "Museum", ar: "متحف", es: "Museo" },
    stade: { fr: "Stade", en: "Stadium", ar: "ملعب", es: "Estadio" },
    home: { fr: "Residence", en: "Residence", ar: "الإقامة", es: "Residencia" }
  };

  var POI_MARKER_STYLES = {
    pharmacie: { color: "#2ecc71", icon: "medical" },
    pharmacy: { color: "#2ecc71", icon: "medical" },
    sante: { color: "#2ecc71", icon: "medical" },
    health: { color: "#2ecc71", icon: "medical" },
    cafe: { color: "#e67e22", icon: "coffee" },
    restaurant: { color: "#e67e22", icon: "food" },
    magasin: { color: "#9b59b6", icon: "shop" },
    shop: { color: "#9b59b6", icon: "shop" },
    banque: { color: "#2b8cbe", icon: "bank" },
    bank: { color: "#2b8cbe", icon: "bank" },
    admin: { color: "#2b8cbe", icon: "bank" },
    administration: { color: "#2b8cbe", icon: "bank" },
    ecole: { color: "#8e44ad", icon: "school" },
    school: { color: "#8e44ad", icon: "school" },
    education: { color: "#8e44ad", icon: "school" },
    mosquee: { color: "#16a085", icon: "mosque" },
    mosque: { color: "#16a085", icon: "mosque" },
    transport: { color: "#3498db", icon: "bus" },
    hotel: { color: "#2f80ed", icon: "bed" },
    hammam: { color: "#00a6a6", icon: "waves" },
    parc: { color: "#6ab04c", icon: "leaf" },
    park: { color: "#6ab04c", icon: "leaf" },
    sport: { color: "#6ab04c", icon: "sport" },
    marche: { color: "#9b59b6", icon: "shop" },
    market: { color: "#9b59b6", icon: "shop" },
    loisir: { color: "#6ab04c", icon: "leaf" },
    aeroport: { color: "#2980b9", icon: "plane" },
    plage: { color: "#e1b12c", icon: "beach" },
    medina: { color: "#c0392b", icon: "landmark" },
    hopital: { color: "#e74c3c", icon: "medical" },
    monument: { color: "#8d6e63", icon: "castle" },
    marina: { color: "#0097e6", icon: "anchor" },
    musee: { color: "#6c5ce7", icon: "museum" },
    stade: { color: "#d35400", icon: "stadium" }
  };

  var mapInstance = null;
  var mapMarkers = [];
  var markerMap = {};
  var homePoi = null;
  var currentPois = [];
  var currentSort = 'distance';
  var maxDistanceFilter = 0;
  // Catégorie affichée seule sur la carte ('' = toutes). Pilotée par la liste
  // déroulante de la barre, et par les en-têtes dépliables de la liste.
  var categorieFiltre = '';
  // Jeu affiché : 'quartier' (commodités) ou 'reperes' (aéroport, plage…).
  var modeListe = 'quartier';
  var jeuxCharges = { quartier: null, reperes: null };
  var projetAffiche = null;
  var premierJeuAffiche = false;   // le tout premier cadrage est sec, les suivants volent
  var projectId = '';

  /* ── Helpers ───────────────────────────────────────────────────────── */

  function lang() {
    return (typeof currentLang !== 'undefined' && UI[currentLang]) ? currentLang : 'fr';
  }

  function t() {
    return UI[lang()];
  }

  function text(value, l) {
    if (!value) return '';
    return value[l] || value.fr || value.en || '';
  }

  function findProject() {
    var list = window.PROJECTS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === projectId) return list[i];
    }
    return null;
  }

  /** Dossier et préfixe du CSV de POI, comme dans project.js. */
  function projectDataBase(project) {
    if (project.detail_url) {
      var clean = project.detail_url.split('#')[0].split('?')[0];
      var parts = clean.split('/');
      if (parts.length >= 2) {
        return { folder: parts[0], slug: parts[1].replace(/\.html$/i, '') };
      }
    }
    return { folder: project.folder, slug: project.id };
  }

  /* ── Lecture du CSV de POI ─────────────────────────────────────────── */

  function splitCsvLine(line) {
    var cells = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      var next = line.charAt(i + 1);
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ';' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  }

  function parseCSV(raw) {
    var lines = raw.replace(/\r/g, '').split('\n').filter(function (line) {
      return line.trim() !== '';
    });
    if (lines.length < 2) return [];
    var header = splitCsvLine(lines[0]);
    var idx = {};
    for (var i = 0; i < header.length; i++) {
      var key = header[i].trim().toLowerCase();
      if (key.indexOf('cat') === 0) idx.cat = i;
      if (key.indexOf('emoji') === 0) idx.emoji = i;
      if (key.indexOf('nom') === 0 || key.indexOf('name') === 0) idx.nom = i;
      if (key.indexOf('adresse') === 0 || key.indexOf('address') === 0) idx.adresse = i;
      if (key.indexOf('note') === 0 || key.indexOf('rating') === 0) idx.note = i;
      if (key.indexOf('latitude') === 0 || key === 'lat') idx.lat = i;
      if (key.indexOf('longitude') === 0 || key === 'lng') idx.lng = i;
      if (key.indexOf('nb avis') === 0 || key.indexOf('avis') >= 0 || key.indexOf('reviews') >= 0) idx.avis = i;
      if (key.indexOf('telephone') === 0 || key.indexOf('téléphone') === 0 || key.indexOf('phone') === 0) idx.tel = i;
      if (key.indexOf('horaires') === 0 || key.indexOf('notes') >= 0 || key.indexOf('hours') === 0) idx.horaires = i;
    }

    var pois = [];
    for (var j = 1; j < lines.length; j++) {
      var c = splitCsvLine(lines[j]);
      var lat = parseFloat((c[idx.lat] || '').replace(',', '.'));
      var lng = parseFloat((c[idx.lng] || '').replace(',', '.'));
      if (!isFinite(lat) || !isFinite(lng)) continue;
      pois.push({
        cat: (c[idx.cat] || '').trim().toLowerCase(),
        emoji: (c[idx.emoji] || '📍').trim() || '📍',
        nom: (c[idx.nom] || '').trim(),
        adresse: (c[idx.adresse] || '').trim(),
        note: (c[idx.note] || '').trim(),
        avis: (c[idx.avis] || '').trim(),
        tel: (c[idx.tel] || '').trim(),
        horaires: (c[idx.horaires] || '').trim(),
        lat: lat,
        lng: lng
      });
    }
    return pois;
  }

  /** CSV dans la langue courante, sinon repli sur le français. */
  function loadProjectPois(project, l) {
    var base = projectDataBase(project);
    var primary = base.folder + '/' + base.slug + '_' + l + '.csv';
    var fallback = base.folder + '/' + base.slug + '_fr.csv';
    return fetch(primary).then(function (response) {
      if (!response.ok) throw new Error('CSV not found');
      return response.text();
    }).catch(function () {
      if (primary === fallback) throw new Error('CSV not found');
      return fetch(fallback).then(function (response) {
        if (!response.ok) throw new Error('CSV not found');
        return response.text();
      });
    }).then(parseCSV);
  }

  /* ── Repères ──────────────────────────────────────────────────────────────
     Les lieux qui situent un projet d'un coup d'œil : aéroport, plage, gare,
     centre-ville. Ils vivent dans un CSV distinct des commodités de quartier
     (<projet>_major_<langue>.csv), parce qu'ils répondent à une autre
     question — non pas « qu'ai-je en bas de chez moi » mais « où suis-je ». */

  function loadProjectReperes(project, l) {
    var base = projectDataBase(project);
    var primary = base.folder + '/' + base.slug + '_major_' + l + '.csv';
    var fallback = base.folder + '/' + base.slug + '_major_fr.csv';
    return fetch(primary).then(function (r) {
      if (!r.ok) throw new Error('CSV reperes introuvable');
      return r.text();
    }).catch(function () {
      if (primary === fallback) throw new Error('CSV reperes introuvable');
      return fetch(fallback).then(function (r) {
        if (!r.ok) throw new Error('CSV reperes introuvable');
        return r.text();
      });
    }).then(parseCSV);
  }


  /* ── Distances ─────────────────────────────────────────────────────── */

  function haversineDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var toRad = function (v) { return v * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function walkingMinutes(meters) { return Math.max(1, Math.round(meters / 80)); }
  function drivingMinutes(meters) { return Math.max(1, Math.round(meters / 420)); }

  function formatDistance(meters) {
    if (!meters) return '';
    if (meters < 1000) return Math.round(meters) + ' m';
    return (meters / 1000).toFixed(1).replace('.', ',') + ' km';
  }

  function distanceMeta(poi) {
    if (!poi._distance) return '';
    /* Sur un repère, seule la voiture a un sens : annoncer « 15 min à pied »
       pour l'aéroport ou « 2 h de marche » pour la marina décrédibilise le
       reste des chiffres. Le quartier, lui, se juge d'abord au temps de
       marche. */
    if (modeListe === 'reperes') {
      return formatDistance(poi._distance) + ' · ' + poi._driving + ' min ' + t().drive;
    }
    return formatDistance(poi._distance) + ' · ' + poi._walking + ' min ' + t().walk +
      ' · ' + poi._driving + ' min ' + t().drive;
  }

  /* ── Catégories et marqueurs ───────────────────────────────────────── */

  function normalizeCategory(cat) {
    return (cat || '').toString().trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_');
  }

  function categoryLabel(cat, l) {
    if (!cat) return 'POI';
    var key = normalizeCategory(cat);
    if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key][l] || CATEGORY_LABELS[key].fr;
    return cat.replace(/_/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
  }

  function poiMarkerStyle(cat) {
    return POI_MARKER_STYLES[normalizeCategory(cat)] || { color: '#7f8c8d', icon: 'pin' };
  }

  function poiIconSvg(icon) {
    var paths = {
      medical: '<path d="M12 5v14M5 12h14"/>',
      coffee: '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 5h6"/>',
      food: '<path d="M5 12h14"/><path d="M7 12a5 5 0 0 1 10 0"/><path d="M8 12v5h8v-5"/><path d="M12 5v2"/>',
      shop: '<path d="M6 7h12l-1 6H8L6 7z"/><path d="M6 7l-1-3H3"/><circle cx="9" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/>',
      bank: '<path d="M4 10h16"/><path d="M6 10v7M10 10v7M14 10v7M18 10v7"/><path d="M3 18h18"/><path d="M5 8l7-4 7 4"/>',
      school: '<path d="M3 9l9-4 9 4-9 4-9-4z"/><path d="M7 11v4l5 2 5-2v-4"/><path d="M19 10v5"/>',
      mosque: '<path d="M12 5a5 5 0 0 0 0 10 6 6 0 0 1 0-10z" class="poi-google-svg-fill"/><path d="M5 18h14"/><path d="M7 18v-5M17 18v-5"/>',
      bus: '<path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M4 10h16"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/>',
      bed: '<path d="M4 17V7"/><path d="M4 13h16v4"/><path d="M7 13V9h5a3 3 0 0 1 3 3v1"/><path d="M20 17v-5"/>',
      waves: '<path d="M4 9c2 2 4 2 6 0s4-2 6 0 3 2 4 1"/><path d="M4 15c2 2 4 2 6 0s4-2 6 0 3 2 4 1"/>',
      leaf: '<path d="M5 19c8-1 13-6 14-14C11 5 6 10 5 19z"/><path d="M5 19c3-4 6-7 10-9"/>',
      sport: '<circle cx="12" cy="12" r="7"/><path d="M5 12h14"/><path d="M12 5c2 2 3 4 3 7s-1 5-3 7"/><path d="M12 5c-2 2-3 4-3 7s1 5 3 7"/>',
      plane: '<path d="M21 15l-8-3.5V6a1.5 1.5 0 0 0-3 0v5.5L2 15v2l8-2v3l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-3l8 2z"/>',
      beach: '<path d="M12 4a8 5 0 0 1 8 5H4a8 5 0 0 1 8-5z"/><path d="M12 4v16"/><path d="M4 20h6"/>',
      landmark: '<path d="M4 21h16"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>',
      castle: '<path d="M4 21V8l2 1V7h2v2h2V7h2v2h2V7h2v2l2-1v13z"/><path d="M10 21v-4h4v4"/>',
      anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13"/><path d="M5 13a7 7 0 0 0 14 0"/><path d="M6 12H4v1M18 12h2v1"/>',
      museum: '<path d="M4 9l8-5 8 5"/><path d="M5 9h14"/><path d="M6 9v8M10 9v8M14 9v8M18 9v8"/><path d="M4 20h16"/>',
      stadium: '<ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="4" ry="2.6"/>',
      pin: '<path d="M12 20s6-5 6-10a6 6 0 0 0-12 0c0 5 6 10 6 10z"/><circle cx="12" cy="10" r="2"/>'
    };
    return '<svg class="poi-google-svg" viewBox="0 0 24 24" aria-hidden="true">' +
      (paths[icon] || paths.pin) + '</svg>';
  }

  function makeIcon(poi, isHome) {
    if (isHome) {
      return L.divIcon({
        html: '<div class="project-pin-marker"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
        className: 'project-home-marker-icon'
      });
    }
    /* Repères : l'emoji du CSV plutôt qu'une icône de la palette. Aéroport,
       marina, stade ou musée n'y figurent pas et tomberaient tous sur la même
       pastille grise — or ce sont justement eux qu'on veut distinguer. */
    if (modeListe === 'reperes') {
      return L.divIcon({
        html: '<div class="repere-marker">' + (poi.emoji || '📍') + '</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
        className: 'repere-marker-icon'
      });
    }
    var style = poiMarkerStyle(poi.cat);
    return L.divIcon({
      html: '<div class="poi-google-marker" style="background:' + style.color + '">' +
        poiIconSvg(style.icon) + '</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17],
      className: 'poi-google-marker-icon'
    });
  }

  function poiLegendMarker(cat) {
    var style = poiMarkerStyle(cat);
    return '<span class="poi-legend-marker" style="background:' + style.color + '">' +
      poiIconSvg(style.icon) + '</span>';
  }

  function makePopup(poi, l, index) {
    var u = UI[l] || UI.fr;
    var cat = poi.cat === 'home' ? u.yourResidence : categoryLabel(poi.cat, l);
    var note = poi.note
      ? '<div class="popup-meta">★ ' + u.rating + ' ' + poi.note +
        (poi.avis ? ' · ' + poi.avis + ' ' + u.reviews : '') + '</div>'
      : '';
    var phone = poi.tel
      ? '<div class="popup-meta popup-phone">📞 <a href="tel:' +
        poi.tel.replace(/\s/g, '') + '">' + poi.tel + '</a></div>'
      : '';
    var hours = poi.horaires ? '<div class="popup-meta">' + poi.horaires + '</div>' : '';
    /* La distance est ce qu'on vient chercher devant un plan de quartier. Elle
       figure dans la liste et dans le menu déroulant, mais celui qui ouvre une
       étiquette depuis la carte n'a lu ni l'une ni l'autre. Même formulation
       qu'ailleurs — repère à la voiture, quartier à pied — pour ne pas donner
       deux chiffres différents du même trajet. */
    var distance = poi.cat !== 'home' && poi._distance
      ? '<div class="popup-meta popup-distance">📏 ' + distanceMeta(poi) + '</div>'
      : '';
    /* Actions dans l'étiquette : le visiteur qui vient d'ouvrir un point veut
       souvent s'en approcher, et voir ce qui le sépare de la résidence. Les
       mettre ici évite de repartir chercher la liste.
       Le trajet vaut pour les deux jeux : « à 4 min à pied » ne dit pas dans
       quelle direction, et c'est précisément la question devant un plan de
       quartier. Le tracé, lui, le montre. */
    var actions = '';
    if (poi.cat !== 'home' && typeof index === 'number') {
      actions = '<div class="popup-actions">' +
        '<button type="button" class="popup-action" data-zoom="' + index + '">⌖ ' + u.popupZoom + '</button>' +
        '<button type="button" class="popup-action" data-trace="' + index + '">↝ ' + u.popupTrace + '</button>' +
      '</div>';
    }
    return '<div class="project-popup">' +
      '<div class="popup-cat">' + cat + '</div>' +
      '<div class="popup-name">' + (poi.nom || cat) + '</div>' +
      (poi.adresse ? '<div class="popup-address">📍 ' + poi.adresse + '</div>' : '') +
      distance + note + phone + hours + actions +
    '</div>';
  }

  /* ── Trajet depuis la résidence ────────────────────────────────────────────
     Une ligne à vol d'oiseau, tracée sous les yeux du visiteur. Pas de calcul
     d'itinéraire routier : les distances affichées partout sur cette page sont
     déjà des distances directes (Haversine), une route sinueuse les
     contredirait. La ligne dit exactement ce que dit le chiffre.
     Vaut pour les deux jeux : sur un repère elle situe la ville, sur un point
     du quartier elle répond à « de quel côté ? », que « 4 min à pied » laisse
     entier. */

  var traceCourante = null;
  var traceLisere = null;

  function effacerTrace() {
    if (traceCourante && traceCourante.njFinir) traceCourante.njFinir();
    if (mapInstance) {
      if (traceCourante) mapInstance.removeLayer(traceCourante);
      if (traceLisere) mapInstance.removeLayer(traceLisere);
    }
    traceCourante = null;
    traceLisere = null;
  }

  function tracerDepuisResidence(index) {
    if (!mapInstance || !homePoi) return;
    var poi = currentPois[index];
    if (!poi || poi.cat === 'home') return;
    effacerTrace();

    var depart = L.latLng(homePoi.lat, homePoi.lng);
    var arrivee = L.latLng(poi.lat, poi.lng);
    /* Deux traits superposés : un liseré large posé en premier — donc dessous
       — puis le trajet par-dessus. C'est ce que font les applications
       d'itinéraire : au-dessus d'un pâté de maisons chargé, un trait seul se
       perd dans le détail du plan, quelle que soit sa couleur. Les teintes
       viennent de la feuille de style (--nj-trajet) ; celles passées ici ne
       servent que de repli. */
    traceLisere = L.polyline([depart, arrivee], {
      className: 'nj-trace-lisere', color: '#ffffff', weight: 9, opacity: .9
    }).addTo(mapInstance);
    traceCourante = L.polyline([depart, arrivee], {
      className: 'nj-trace', color: '#1D4ED8', weight: 4, opacity: .95
    }).addTo(mapInstance);

    /* L'animation part de la longueur réelle du tracé, connue seulement une
       fois le chemin SVG posé. On la publie en variable CSS : le dessin se
       fait alors par le navigateur, sans minuterie à entretenir.

       Mais cette longueur est celle du tracé À CET INSTANT, en pixels, au zoom
       courant — et le vol qui suit change justement le zoom. En s'approchant,
       le trait s'allonge et déborde du pointillé : « trait plein sur
       --nj-longueur, puis vide sur autant » laissait le trajet s'arrêter en
       plein milieu, sans jamais rejoindre le point. D'où la remise à plat dès
       que le dessin est fini, ou dès que la carte bouge — le pointillé n'avait
       de raison d'être que pendant l'animation. */
    var chemin = traceCourante.getElement && traceCourante.getElement();
    var cheminLisere = traceLisere.getElement && traceLisere.getElement();
    if (chemin && chemin.getTotalLength) {
      // Le liseré se dessine avec le trajet, sinon il le précèderait d'un
      // trait blanc annonçant le chemin avant qu'il n'existe.
      var traits = cheminLisere ? [chemin, cheminLisere] : [chemin];
      var longueur = chemin.getTotalLength();
      traits.forEach(function (t) {
        t.style.setProperty('--nj-longueur', longueur);
        t.classList.add('nj-trace-anime');
      });

      var finir = function () {
        chemin.removeEventListener('animationend', finir);
        if (mapInstance) mapInstance.off('zoomend moveend', finir);
        traits.forEach(function (t) {
          t.classList.remove('nj-trace-anime');
          t.style.removeProperty('--nj-longueur');
          t.style.strokeDasharray = 'none';
          t.style.strokeDashoffset = '0';
        });
      };
      chemin.addEventListener('animationend', finir);
      mapInstance.on('zoomend moveend', finir);
      /* Gardé sur la couche : un trajet effacé avant la fin de son animation
         laisserait sinon son écouteur accroché à la carte, un par trajet. */
      traceCourante.njFinir = finir;
      /* Filet de sécurité : sans animation — mouvement réduit, onglet en
         arrière-plan — « animationend » ne vient jamais. */
      setTimeout(finir, 1600);
    }

    /* Les deux extrémités visibles : le trajet n'a de sens qu'entier. Un point
       du quartier est souvent à quelques centaines de mètres : plafonner à 16
       comme pour un repère à 12 km laisserait alors le tracé minuscule au
       centre d'un cadre trop large. */
    var court = depart.distanceTo(arrivee) < 800;
    mapInstance.flyToBounds(L.latLngBounds([depart, arrivee]).pad(0.25),
      { maxZoom: court ? 17 : 16, duration: 1.1 });
  }

  /** Ouvrir une catégorie n'affiche que ses marqueurs ; la refermer les rend tous. */
  /** Clic sur un en-tête de catégorie : ouvre, ou referme si déjà ouverte. */
  function toggleCategory(cat) {
    var btn = document.querySelector('.poi-category-btn[data-cat="' + cat + '"]');
    var wasOpen = btn && btn.classList.contains('active');
    appliquerCategorie(wasOpen ? '' : cat);
  }

  /**
   * Point unique de vérité du filtre par catégorie : la carte, la liste et la
   * liste déroulante de la barre disent la même chose. Passer par deux chemins
   * séparés laissait le menu afficher « Écoles » alors que la carte montrait
   * tout, dès qu'on refermait la catégorie depuis la liste.
   */
  function appliquerCategorie(cat) {
    categorieFiltre = cat || '';
    /* Le tracé pointait vers un marqueur que le filtre vient peut-être de
       retirer : une ligne qui ne mène plus nulle part. */
    effacerTrace();

    var buttons = document.querySelectorAll('.poi-category-btn');
    var lists = document.querySelectorAll('.poi-list');
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
    for (var j = 0; j < lists.length; j++) lists[j].classList.remove('show');

    var select = document.getElementById('poiCatFilter');
    if (select && select.value !== categorieFiltre) select.value = categorieFiltre;

    // Le sélecteur de points suit la catégorie : il ne doit proposer que ce
    // que la carte montre.
    var points = document.getElementById('poiPointFilter');
    if (points && currentPois && currentPois.length) {
      points.innerHTML = optionsPointsHTML(currentPois, UI[lang()] || UI.fr);
    }

    if (!mapInstance) return;
    if (categorieFiltre) {
      var btn = document.querySelector('.poi-category-btn[data-cat="' + categorieFiltre + '"]');
      var list = document.getElementById('poi-list-' + categorieFiltre);
      if (btn) btn.classList.add('active');
      if (list) list.classList.add('show');
      for (var m = 0; m < mapMarkers.length; m++) {
        if (mapMarkers[m]._cat === categorieFiltre || mapMarkers[m]._cat === 'home') {
          mapInstance.addLayer(mapMarkers[m]);
        } else {
          mapInstance.removeLayer(mapMarkers[m]);
        }
      }
    } else {
      for (var n = 0; n < mapMarkers.length; n++) mapInstance.addLayer(mapMarkers[n]);
    }
  }

  function focusPoi(index) {
    var marker = markerMap[index];
    if (!marker || !mapInstance) return;
    if (!mapInstance.hasLayer(marker)) marker.addTo(mapInstance);
    /* Sur un repère, choisir dans la liste trace le trajet depuis la
       résidence : c'est ce qu'on vient y chercher — la distance, montrée
       plutôt qu'écrite. Zoomer à 17 sur un aéroport à 12 km ferait au
       contraire perdre la résidence de vue. */
    if (modeListe === 'reperes') {
      marker.openPopup();
      tracerDepuisResidence(index);
      return;
    }
    mapInstance.setView(marker.getLatLng(), 17);
    marker.openPopup();
  }

  /* ── Panneau latéral ───────────────────────────────────────────────── */

  /**
   * Les deux onglets du panneau. Le bouton « Repères » reste absent quand le
   * projet n'a pas de fichier : proposer un onglet vide serait pire que ne
   * rien proposer.
   */
  function basculeJeuxHTML(l) {
    var u = UI[l] || UI.fr;
    if (!jeuxCharges.reperes) return '';
    return '<div class="poi-jeux" role="tablist">' +
      '<button type="button" class="poi-jeu' + (modeListe === 'quartier' ? ' active' : '') +
        '" data-jeu="quartier" role="tab" aria-selected="' + (modeListe === 'quartier') + '">' +
        u.jeuQuartier + '</button>' +
      '<button type="button" class="poi-jeu' + (modeListe === 'reperes' ? ' active' : '') +
        '" data-jeu="reperes" role="tab" aria-selected="' + (modeListe === 'reperes') + '">' +
        u.jeuReperes + '</button>' +
    '</div>';
  }

  /**
   * Pose la bascule dans son conteneur fixe, sous les coordonnées GPS.
   *
   * Elle vivait en tête de #poiSummary, qui défile : passé une vingtaine de
   * POI, les deux onglets sortaient de l'écran et on ne pouvait plus revenir
   * aux repères sans remonter toute la liste. Étant désormais hors de la zone
   * défilante, elle se redessine séparément — à chaque bascule pour l'état
   * actif, et quand le fichier des repères finit d'arriver.
   */
  function rendreBascule(l) {
    var zone = document.getElementById('poiJeux');
    if (!zone) return;
    zone.innerHTML = basculeJeuxHTML(l);
    var btns = zone.querySelectorAll('.poi-jeu');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        afficherJeu(this.getAttribute('data-jeu'), l);
      });
    }
  }

  /** Repères : liste plate, triée par distance. Les regrouper par catégorie
      donnerait onze rubriques d'un seul élément. */
  /**
   * Options du sélecteur de points : les POI eux-mêmes, filtrés par la
   * catégorie choisie et le temps de marche, dans l'ordre de tri courant.
   *
   * Sorti de la construction de la barre parce qu'il faut le reconstruire
   * quand la catégorie change — sans quoi le menu continuait de proposer les
   * 77 points alors que la carte n'en montrait plus que 15.
   */
  function optionsPointsHTML(pois, u) {
    var choix = [];
    for (var i = 0; i < pois.length; i++) {
      var poi = pois[i];
      if (poi.cat === 'home') continue;
      if (categorieFiltre && poi.cat !== categorieFiltre) continue;
      if (maxDistanceFilter > 0 && poi._walking > maxDistanceFilter) continue;
      choix.push({ poi: poi, idx: i });
    }
    choix.sort(function (a, b) {
      if (currentSort === 'name') return a.poi.nom.localeCompare(b.poi.nom);
      return (a.poi._distance || 0) - (b.poi._distance || 0);
    });
    var html = '<option value="">' + (u.gotoPoint || 'Aller à un point…') + '</option>';
    for (var k = 0; k < choix.length; k++) {
      var d = choix[k].poi._walking;
      html += '<option value="' + choix[k].idx + '">' + isoler(echapper(choix[k].poi.nom)) +
        (d ? ' — ' + isoler(d + ' ' + u.minWalk) : '') + '</option>';
    }
    return html;
  }

  /* Isole un libellé du texte qui le suit, à la manière de <bdi>.
     Beaucoup de nos POI portent un nom bilingue qui se termine en arabe
     (« École Salam مدرسة السلام »). Sans isolation, l'algorithme bidirectionnel
     d'Unicode absorbe le nombre qui suit dans la portée arabe et le réaffiche à
     sa gauche : « École Salam 1 — مدرسة السلام min à pied ». Le CSS
     (unicode-bidi:isolate) règle le cas dans la liste dépliable, mais le texte
     d'une <option> est dessiné par le système, hors de portée des feuilles de
     style : il faut alors les marques Unicode elles-mêmes.
     U+2068 FIRST STRONG ISOLATE ouvre, U+2069 POP DIRECTIONAL ISOLATE ferme. */
  function isoler(s) {
    return String.fromCharCode(0x2068) + s + String.fromCharCode(0x2069);
  }

  /** Échappe un texte destiné à du HTML (les noms viennent d'un CSV libre). */
  function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /**
   * Liste déroulante des repères de la ville, pour la barre au-dessus de la
   * carte : mêmes points que la liste, atteignables sans la dérouler.
   */
  function reperesSelectHTML(pois, u) {
    var items = [];
    for (var i = 0; i < pois.length; i++) {
      if (pois[i].cat === 'home') continue;
      items.push({ poi: pois[i], idx: i });
    }
    items.sort(function (a, b) {
      if (currentSort === 'name') return a.poi.nom.localeCompare(b.poi.nom);
      return (a.poi._distance || 0) - (b.poi._distance || 0);
    });
    var opts = '<option value="">' + (u.gotoRepere || 'Aller à un repère…') + '</option>';
    for (var k = 0; k < items.length; k++) {
      var km = items[k].poi._distance ? (Math.round(items[k].poi._distance / 100) / 10) + ' km' : '';
      opts += '<option value="' + items[k].idx + '">' +
        (items[k].poi.emoji ? items[k].poi.emoji + ' ' : '') +
        isoler(echapper(items[k].poi.nom)) + (km ? ' — ' + isoler(km) : '') + '</option>';
    }
    return '<select class="poi-filter" id="poiPointFilter" aria-label="' +
      (u.gotoRepere || 'Repère') + '">' + opts + '</select>';
  }

  function reperesListeHTML(pois, l) {
    var items = [];
    for (var i = 0; i < pois.length; i++) {
      if (pois[i].cat === 'home') continue;
      items.push({ poi: pois[i], idx: i });
    }
    items.sort(function (a, b) {
      if (currentSort === 'name') return a.poi.nom.localeCompare(b.poi.nom);
      return (a.poi._distance || 0) - (b.poi._distance || 0);
    });
    return '<div class="poi-list show">' + items.map(function (it) {
      return '<button class="poi-item repere-item" data-idx="' + it.idx + '">' +
        '<span class="repere-emoji" aria-hidden="true">' + (it.poi.emoji || '📍') + '</span><span>' +
        '<span class="poi-name">' + it.poi.nom + '</span>' +
        '<span class="poi-meta">' + distanceMeta(it.poi) + '</span></span></button>';
    }).join('') + '</div>';
  }

  function updatePoiSummary(pois, l, hasCsv) {
    var box = document.getElementById('poiSummary');
    if (!box) return;
    var u = UI[l] || UI.fr;
    if (!hasCsv) {
      box.innerHTML = '<div class="poi-note">' + u.poiFallback + '</div>';
      return;
    }

    var categories = {};
    var order = [];
    for (var i = 0; i < pois.length; i++) {
      if (pois[i].cat === 'home') continue;
      if (!categories[pois[i].cat]) {
        categories[pois[i].cat] = { count: 0, items: [] };
        order.push(pois[i].cat);
      }
      categories[pois[i].cat].count++;
      categories[pois[i].cat].items.push({ poi: pois[i], idx: i });
    }

    for (var c in categories) {
      categories[c].items.sort(function (a, b) {
        if (currentSort === 'name') return a.poi.nom.localeCompare(b.poi.nom);
        return (a.poi._distance || 0) - (b.poi._distance || 0);
      });
    }

    // Pas de récapitulatif par catégorie ici : la liste dépliable ci-dessous
    // porte déjà le compte de chaque catégorie dans son badge.
    var count = Math.max(0, pois.length - 1);
    rendreBascule(l);   // conteneur fixe, hors de la liste qui défile

    /* Commandes : elles vivent dans la barre au-dessus de la carte, pas dans
       la liste. Sur un téléphone, la liste est repoussée sous la carte — les
       filtres y auraient été hors de vue au moment où l'on regarde le plan. */
    var barre = document.getElementById('poiControles');
    if (barre) {
      var opts = '<option value="">' + (u.allCategories || 'Toutes les catégories') + '</option>';
      for (var oc = 0; oc < order.length; oc++) {
        opts += '<option value="' + order[oc] + '"' + (categorieFiltre === order[oc] ? ' selected' : '') + '>' +
                isoler(categoryLabel(order[oc], l)) + ' (' + categories[order[oc]].count + ')</option>';
      }
      var optsPoints = optionsPointsHTML(pois, u);

      barre.innerHTML =
        '<span class="poi-count-inline"><b>' + count + '</b> ' +
          (modeListe === 'reperes' ? u.reperesCount : u.poiCount) + '</span>' +
        (modeListe === 'reperes' ? reperesSelectHTML(pois, u) :
          '<select class="poi-filter" id="poiCatFilter" aria-label="' + (u.allCategories || 'Catégorie') + '">' + opts + '</select>' +
          '<select class="poi-filter" id="poiDistanceFilter" aria-label="' + u.filterMax + '">' +
            '<option value="0"' + (maxDistanceFilter === 0 ? ' selected' : '') + '>' + u.allDistances + '</option>' +
            '<option value="5"' + (maxDistanceFilter === 5 ? ' selected' : '') + '>≤ 5 ' + u.minWalk + '</option>' +
            '<option value="10"' + (maxDistanceFilter === 10 ? ' selected' : '') + '>≤ 10 ' + u.minWalk + '</option>' +
            '<option value="15"' + (maxDistanceFilter === 15 ? ' selected' : '') + '>≤ 15 ' + u.minWalk + '</option>' +
            '<option value="30"' + (maxDistanceFilter === 30 ? ' selected' : '') + '>≤ 30 ' + u.minWalk + '</option>' +
          '</select>' +
          '<select class="poi-filter poi-filter-points" id="poiPointFilter" aria-label="' +
            (u.gotoPoint || 'Aller à un point') + '">' + optsPoints + '</select>' +
          '<span class="poi-tri">' +
            '<button class="poi-sort' + (currentSort === 'distance' ? ' active' : '') + '" data-sort="distance">📏 ' + u.sortDist + '</button>' +
            '<button class="poi-sort' + (currentSort === 'name' ? ' active' : '') + '" data-sort="name">🔤 ' + u.sortName + '</button>' +
          '</span>');
      brancherBarre(barre, l);
    }

    var html = '';

    if (modeListe === 'reperes') {
      // Pas de catégories dépliables ni de filtre par temps de marche : on ne
      // rejoint pas l'aéroport à pied.
      box.innerHTML =
        '<div class="poi-count"><span>' + count + '</span>' + u.reperesCount + '</div>' +
        reperesListeHTML(pois, l);
      brancherPanneau(box, l);
      return;
    }

    for (var k = 0; k < order.length; k++) {
      var cat = order[k];
      var items = categories[cat].items;
      if (maxDistanceFilter > 0) {
        items = items.filter(function (it) { return it.poi._walking <= maxDistanceFilter; });
      }
      if (!items.length) continue;
      html += '<div class="poi-category">' +
        '<button class="poi-category-btn" data-cat="' + cat + '">' + poiLegendMarker(cat) +
        '<span class="label">' + categoryLabel(cat, l) + '</span>' +
        '<span class="count">' + items.length + '</span><span class="arrow">▶</span></button>' +
        '<div class="poi-list" id="poi-list-' + cat + '">';
      for (var x = 0; x < items.length; x++) {
        var poi = items[x].poi;
        var rating = poi.note ? ' · ★ ' + poi.note : '';
        html += '<button class="poi-item" data-idx="' + items[x].idx + '">' +
          '<span class="poi-dot"></span><span>' +
          '<span class="poi-name">' + poi.nom + '</span>' +
          '<span class="poi-meta">' + distanceMeta(poi) + rating + '</span></span></button>';
      }
      html += '</div></div>';
    }

    box.innerHTML = html;
    brancherPanneau(box, l);
  }

  /** Écouteurs du panneau. Extrait de updatePoiSummary : les deux modes en ont
      besoin, et la liste est reconstruite à chaque tri, filtre ou bascule. */
  /** Écouteurs de la barre au-dessus de la carte (tri, distance, catégorie). */
  function brancherBarre(barre, l) {
    var sortBtns = barre.querySelectorAll('.poi-sort');
    for (var s = 0; s < sortBtns.length; s++) {
      sortBtns[s].addEventListener('click', function () {
        currentSort = this.getAttribute('data-sort');
        updatePoiSummary(currentPois, l, true);
      });
    }
    var filter = barre.querySelector('#poiDistanceFilter');
    if (filter) {
      filter.addEventListener('change', function () {
        maxDistanceFilter = parseInt(this.value, 10) || 0;
        updatePoiSummary(currentPois, l, true);
      });
    }
    var point = barre.querySelector('#poiPointFilter');
    if (point) {
      point.addEventListener('change', function () {
        var idx = parseInt(this.value, 10);
        // Le sélecteur revient sur son invite : il désigne une action (aller
        // voir ce point), pas un état durable comme les filtres voisins.
        this.selectedIndex = 0;
        if (!isNaN(idx)) focusPoi(idx);
      });
    }
    var cat = barre.querySelector('#poiCatFilter');
    if (cat) {
      cat.addEventListener('change', function () {
        // Même effet qu'un clic sur l'en-tête de catégorie : la carte ne montre
        // plus que ces points, et la liste s'ouvre sur eux.
        appliquerCategorie(this.value);
      });
    }
  }

  function brancherPanneau(box, l) {
    // La bascule et les commandes vivent hors de ce conteneur : rendreBascule()
    // et brancherBarre() branchent leurs propres écouteurs.
    var catBtns = box.querySelectorAll('.poi-category-btn');
    for (var b = 0; b < catBtns.length; b++) {
      catBtns[b].addEventListener('click', function () {
        toggleCategory(this.getAttribute('data-cat'));
      });
    }
    var itemBtns = box.querySelectorAll('.poi-item');
    for (var p = 0; p < itemBtns.length; p++) {
      itemBtns[p].addEventListener('click', function () {
        focusPoi(parseInt(this.getAttribute('data-idx'), 10));
      });
    }
  }

  /* ── Carte ─────────────────────────────────────────────────────────── */

  function renderPois(project, pois, l, anime) {
    if (!mapInstance || !window.L) return;
    for (var i = 0; i < mapMarkers.length; i++) mapInstance.removeLayer(mapMarkers[i]);
    mapMarkers = [];
    markerMap = {};
    homePoi = null;

    for (var j = 0; j < pois.length; j++) {
      if (pois[j].cat === 'home') homePoi = pois[j];
    }
    if (!homePoi) {
      homePoi = {
        cat: 'home',
        emoji: project.icon,
        nom: text(project.name, l),
        adresse: text(project.location, l),
        lat: project.lat,
        lng: project.lng
      };
      pois = [homePoi].concat(pois);
    } else {
      homePoi.nom = text(project.name, l);
      homePoi.adresse = text(project.location, l) || homePoi.adresse;
    }
    currentPois = pois;

    for (var d = 0; d < pois.length; d++) {
      if (pois[d].cat === 'home') {
        pois[d]._distance = 0;
        pois[d]._walking = 0;
        pois[d]._driving = 0;
      } else {
        pois[d]._distance = haversineDistance(homePoi.lat, homePoi.lng, pois[d].lat, pois[d].lng);
        pois[d]._walking = walkingMinutes(pois[d]._distance);
        pois[d]._driving = drivingMinutes(pois[d]._distance);
      }
    }

    var bounds = L.latLngBounds([]);
    for (var m = 0; m < pois.length; m++) {
      var poi = pois[m];
      var isHome = poi.cat === 'home';
      var marker = L.marker([poi.lat, poi.lng], {
        icon: makeIcon(poi, isHome),
        zIndexOffset: isHome ? 1000 : 0
      }).bindPopup(makePopup(poi, l, m));
      marker._cat = poi.cat;
      marker.addTo(mapInstance);
      mapMarkers.push(marker);
      markerMap[m] = marker;
      bounds.extend([poi.lat, poi.lng]);
    }

    /* Au premier rendu on cadre sec ; à chaque bascule on VOLE vers le nouveau
       cadrage. Le mouvement est l'argument : il montre qu'on change d'échelle,
       du quartier à la ville. Un saut donnerait deux images sans lien. */
    if (bounds.isValid()) {
      if (anime) mapInstance.flyToBounds(bounds.pad(0.18), { maxZoom: 15, duration: 1.2 });
      else mapInstance.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
    }
  }

  function renderMap(project, l) {
    if (!window.L) return;
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
    mapMarkers = [];
    mapInstance = L.map('projectMap', { scrollWheelZoom: false, maxZoom: 22 })
      .setView([project.lat, project.lng], 14);
    // La molette ne détourne pas le défilement de la page tant que le visiteur
    // n'est pas entré dans la carte : elle s'active au clic, se coupe à la sortie.
    var conteneur = mapInstance.getContainer();
    conteneur.addEventListener('click', function () { mapInstance.scrollWheelZoom.enable(); });
    conteneur.addEventListener('mouseleave', function () { mapInstance.scrollWheelZoom.disable(); });
    /* Fonds de carte : plan OSM, vue satellite (Esri) et hybride (satellite +
       noms de rues). Le satellite est indispensable pour un bien immobilier —
       le client voit le vrai bâti et l'environnement. */
    var fondPlan = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxNativeZoom: 19, maxZoom: 22
    });
    var fondSat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, Maxar, Earthstar Geographics', maxNativeZoom: 19, maxZoom: 22
    });
    var etiquettes = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 19, maxZoom: 22
    });
    var fondHybride = L.layerGroup([fondSat, etiquettes]);

    fondPlan.addTo(mapInstance);   // fond par défaut

    var noms = {
      fr: { plan: 'Plan', sat: 'Satellite', hyb: 'Hybride' },
      en: { plan: 'Map', sat: 'Satellite', hyb: 'Hybrid' },
      ar: { plan: 'خريطة', sat: 'قمر صناعي', hyb: 'مختلط' },
      es: { plan: 'Mapa', sat: 'Satélite', hyb: 'Híbrido' }
    }[l] || { plan: 'Plan', sat: 'Satellite', hyb: 'Hybride' };
    var fonds = {};
    fonds[noms.plan] = fondPlan;
    fonds[noms.sat] = fondSat;
    fonds[noms.hyb] = fondHybride;
    L.control.layers(fonds, null, { position: 'topright', collapsed: true }).addTo(mapInstance);

    // Échelle métrique (utile pour juger les distances aux commodités).
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(mapInstance);

    // Plein écran, via l'API native du navigateur (pas de plugin à charger).
    var CtrlPlein = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var a = L.DomUtil.create('a', 'leaflet-bar leaflet-control leaflet-control-pleinecran');
        a.href = '#'; a.title = 'Plein écran'; a.setAttribute('role', 'button');
        a.innerHTML = '⛶';
        a.style.cssText = 'display:flex;align-items:center;justify-content:center;' +
          'width:30px;height:30px;font-size:18px;background:#fff;color:#333;text-decoration:none';
        L.DomEvent.on(a, 'click', function (e) {
          L.DomEvent.stop(e);
          var el = mapInstance.getContainer();
          if (document.fullscreenElement) { document.exitFullscreen(); }
          else if (el.requestFullscreen) { el.requestFullscreen(); }
          setTimeout(function () { mapInstance.invalidateSize(); }, 250);
        });
        return a;
      }
    });
    mapInstance.addControl(new CtrlPlein());

    /* Les boutons de l'étiquette vivent dans un fragment que Leaflet détruit
       et reconstruit à chaque ouverture : on délègue depuis le conteneur de la
       carte plutôt que de recâbler un écouteur à chaque popup. */
    mapInstance.getContainer().addEventListener('click', function (e) {
      var zoom = e.target.closest('[data-zoom]');
      if (zoom) {
        var iz = parseInt(zoom.getAttribute('data-zoom'), 10);
        var mz = markerMap[iz];
        if (mz) mapInstance.flyTo(mz.getLatLng(), 17, { duration: 1 });
        return;
      }
      var trace = e.target.closest('[data-trace]');
      if (trace) tracerDepuisResidence(parseInt(trace.getAttribute('data-trace'), 10));
    });

    var summary = document.getElementById('poiSummary');
    if (summary) summary.innerHTML = '<div class="poi-note">' + UI[l].poiLoading + '</div>';
    /* La bascule vit hors du panneau : elle n'est plus effacée avec lui. Sans
       ce vidage, les onglets du projet précédent resteraient affichés pendant
       le chargement du suivant, et un clic basculerait sur des repères qui ne
       sont plus les bons. */
    var jeux = document.getElementById('poiJeux');
    if (jeux) jeux.innerHTML = '';

    /* Les deux jeux sont chargés d'emblée, mais un seul est affiché : la
       bascule doit être instantanée devant un client, pas attendre un
       téléchargement. Les repères sont facultatifs — leur absence désactive
       simplement le bouton. */
    jeuxCharges = { quartier: null, reperes: null };
    premierJeuAffiche = false;
    projetAffiche = project;

    loadProjectReperes(project, l)
      .then(function (r) { jeuxCharges.reperes = r && r.length ? r : null; })
      .catch(function () { jeuxCharges.reperes = null; })
      .then(function () {
        /* Les deux chargements courent en parallèle et le panneau se dessine
           dès que le quartier est prêt — souvent avant les repères. Sans ce
           repeint, l'onglet « Repères » n'apparaissait jamais : au moment de
           construire la bascule, le jeu était encore inconnu. */
        if (jeuxCharges.quartier) updatePoiSummary(currentPois, l, true);
      });

    loadProjectPois(project, l).then(function (pois) {
      if (!pois.length) throw new Error('Empty CSV');
      jeuxCharges.quartier = pois;
      afficherJeu(modeListe, l);
    }).catch(function () {
      renderPois(project, [], l);
      updatePoiSummary(currentPois, l, false);
    });
  }

  /**
   * Bascule entre les commodités du quartier et les repères de la ville.
   *
   * Les deux jeux n'ont pas la même échelle : une pharmacie est à 300 m,
   * l'aéroport à 12 km. Les afficher ensemble imposait un zoom de compromis,
   * trop large pour lire le quartier et trop serré pour situer la ville.
   * Séparés, chaque bascule recadre la carte sur ce qu'elle montre —
   * renderPois s'en charge déjà.
   */
  // Poignée de lecture, utile pour régler la mise en scène depuis la console.
  window.njLoc = {
    carte: function () { return mapInstance; },
    mode: function () { return modeListe; }
  };

  function afficherJeu(mode, l) {
    if (mode === 'reperes' && !jeuxCharges.reperes) mode = 'quartier';
    effacerTrace();   // un trajet ne survit pas au changement de jeu
    modeListe = mode;
    var jeu = mode === 'reperes' ? jeuxCharges.reperes : jeuxCharges.quartier;
    if (!projetAffiche || !jeu) return;
    renderPois(projetAffiche, jeu, l, premierJeuAffiche);
    premierJeuAffiche = true;
    updatePoiSummary(currentPois, l, true);
  }

  /* ── Textes de la page ─────────────────────────────────────────────── */

  function appliquerLangue() {
    var l = lang();
    var u = UI[l];
    var project = findProject();
    var texte = function (id, valeur) {
      var el = document.getElementById(id);
      if (el) el.textContent = valeur;
    };

    texte('locKicker', u.kicker);
    texte('locTitre', u.title);
    texte('locTexte', u.text);
    texte('locRetour', (l === 'ar' ? '→ ' : '← ') + u.back);
    texte('locCarteGlobale', u.globalMap);
    texte('locFiche', u.projectSheet);

    var suffixe = (projectId ? '?projet=' + encodeURIComponent(projectId) : '') + '#' + l;
    document.getElementById('locRetour').href = 'disponibilites.html' + suffixe;
    document.getElementById('locCarteGlobale').href = 'carte.html#' + l;
    document.getElementById('locFiche').href = 'project.html' +
      (projectId ? '?id=' + encodeURIComponent(projectId) : '') + '#' + l;

    if (!project) {
      texte('locNom', u.noProject);
      texte('locLieu', '');
      return;
    }
    texte('locNom', text(project.name, l));
    texte('locLieu', text(project.location, l));
    document.title = 'Narjiss — ' + text(project.name, l) + ' — ' + u.kicker;
  }

  // Le menu partagé rappelle cette fonction à chaque changement de langue :
  // les popups et les libellés de catégorie doivent suivre, donc on recharge
  // le CSV de la nouvelle langue.
  window.onLanguageChange = function () {
    // Sans projet dans l'URL, on ouvre le premier du site plutôt qu'un écran nu.
    if (!projectId && (window.PROJECTS || []).length) {
      projectId = window.PROJECTS[0].id;
    }
    appliquerLangue();
    var project = findProject();
    if (project) {
      renderMap(project, lang());
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    projectId = (params.get('projet') || params.get('id') || '').toLowerCase();
    initPage('projects', '');
  });
})();
