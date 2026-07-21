(function() {
  var PAGE_UI = {
    fr: {
      loadingTitle: "Projet introuvable",
      loadingText: "Ce projet n'existe pas encore dans la collection Narjiss.",
      backProjects: "Retour aux projets",
      eyebrowLive: "Collection privee - Disponible",
      eyebrowSoon: "Collection privee - Avant-premiere",
      heroCopyLive: "Une experience immobiliere composee comme un dossier d'agence premium: contexte, reperes, visite et acces direct a l'exploration detaillee.",
      heroCopySoon: "Une adresse en preparation dans la collection Narjiss, deja positionnee pour offrir une lecture claire du quartier et du potentiel.",
      openExperience: "Ouvrir l'experience",
      contactAdvisor: "Contacter un conseiller",
      overviewKicker: "Vision",
      overviewTitle: "Une adresse presentee avec la precision d'une agence de luxe.",
      overviewLive: "Chaque projet Narjiss rassemble les informations essentielles, les points d'interet et les supports immersifs dans une page fluide, elegantement lisible et directement exploitable.",
      overviewSoon: "Cette page prepare la mise en valeur complete du projet. Les donnees publiques restent consultables, et l'experience detaillee pourra etre activee des que les supports seront disponibles.",
      visualCaption: "Visuel d'ambiance conceptuel - non contractuel.",
      atelierTitle: "Signature immobiliere a Agadir",
      essentials: ["Statut", "Quartier", "Points d'interet", "Experience"],
      statusLive: "Actif",
      statusSoon: "Bientot",
      poiEmpty: "A enrichir",
      tourYes: "360 disponible",
      tourNo: "Preview",
      pillarsKicker: "Experience",
      pillarsTitle: "Tout ce qu'un client doit comprendre avant la visite.",
      pillars: [
        { title: "Lecture du quartier", text: "Position, acces et environnement sont presentes sans friction pour situer la valeur du bien." },
        { title: "Parcours immersif", text: "Les projets actifs conservent un acces direct vers la carte detaillee et les contenus existants." },
        { title: "Presentation commerciale", text: "La page reste sobre, haut de gamme et exploitable pour des clients internationaux." }
      ],
      mapKicker: "Localisation",
      mapTitle: "Le projet dans son territoire",
      mapText: "Reperez l'adresse, comparez les projets Narjiss et basculez vers la carte globale lorsque vous souhaitez une vision complete.",
      gpsLabel: "Coordonnees GPS",
      mapPoiLoading: "Chargement des points d'interet du quartier...",
      mapPoiCount: "points d'interet visibles",
      mapPoiFallback: "Aucun fichier POI n'a encore ete trouve pour ce projet. La residence reste visible sur la carte.",
      majorKicker: "Reperes",
      majorTitle: "Principaux lieux autour du projet",
      majorLoading: "Chargement des lieux majeurs...",
      majorEmpty: "Aucun lieu majeur disponible pour ce projet.",
      yourResidence: "Votre residence",
      rating: "Note",
      reviews: "avis",
      sortBy: "Tri",
      sortDist: "Distance",
      sortName: "Nom",
      filterMax: "Filtre",
      allDistances: "Toutes",
      minWalk: "min a pied",
      walk: "a pied",
      drive: "en voiture",
      routeTitle: "Calculer l'itineraire vers la residence",
      routePrompt: "Entrez votre adresse de depart (rue, ville, pays) :",
      routeMissingHome: "La position de la residence n'est pas encore chargee",
      routeNotFound: "Adresse introuvable. Essayez d'etre plus precis.",
      geolocationTitle: "Me localiser",
      searchLabel: "Rechercher une adresse...",
      clearDrawings: "Effacer les dessins",
      globalMap: "Carte globale",
      goFromHere: "Y aller depuis ma position",
      shareWhatsapp: "Envoyer l'itineraire par WhatsApp",
      geolocationUnsupported: "La geolocalisation n'est pas disponible dans ce navigateur.",
      geolocationDenied: "Impossible de recuperer votre position. Verifiez l'autorisation de localisation.",
      itineraryMessage: "Itineraire vers",
      relatedKicker: "Collection",
      relatedTitle: "Explorer d'autres adresses Narjiss"
    },
    en: {
      loadingTitle: "Project not found",
      loadingText: "This project is not yet part of the Narjiss collection.",
      backProjects: "Back to projects",
      eyebrowLive: "Private collection - Available",
      eyebrowSoon: "Private collection - Preview",
      heroCopyLive: "A real estate experience composed like a premium agency dossier: context, landmarks, tour and direct access to detailed exploration.",
      heroCopySoon: "An upcoming address in the Narjiss collection, already positioned to offer a clear reading of its neighborhood and potential.",
      openExperience: "Open experience",
      contactAdvisor: "Contact an advisor",
      overviewKicker: "Vision",
      overviewTitle: "An address presented with luxury-agency precision.",
      overviewLive: "Each Narjiss project brings essential information, points of interest and immersive assets into one fluid, elegant and actionable page.",
      overviewSoon: "This page prepares the full project presentation. Public data remains visible, and the detailed experience can be activated as soon as assets are ready.",
      visualCaption: "Concept mood visual - non contractual.",
      atelierTitle: "Real estate signature in Agadir",
      essentials: ["Status", "District", "Points of interest", "Experience"],
      statusLive: "Active",
      statusSoon: "Soon",
      poiEmpty: "To enrich",
      tourYes: "360 available",
      tourNo: "Preview",
      pillarsKicker: "Experience",
      pillarsTitle: "Everything a client needs before the visit.",
      pillars: [
        { title: "Neighborhood reading", text: "Position, access and surroundings are presented clearly to reveal the property's value." },
        { title: "Immersive path", text: "Active projects keep direct access to the detailed map and existing content." },
        { title: "Sales presentation", text: "The page stays restrained, high-end and ready for international clients." }
      ],
      mapKicker: "Location",
      mapTitle: "The project in its territory",
      mapText: "Locate the address, compare Narjiss projects and switch to the global map when you want the full view.",
      gpsLabel: "GPS coordinates",
      mapPoiLoading: "Loading neighborhood points of interest...",
      mapPoiCount: "visible points of interest",
      mapPoiFallback: "No POI file has been found for this project yet. The residence remains visible on the map.",
      majorKicker: "Landmarks",
      majorTitle: "Key places around the project",
      majorLoading: "Loading key places...",
      majorEmpty: "No key places are available for this project.",
      yourResidence: "Your residence",
      rating: "Rating",
      reviews: "reviews",
      sortBy: "Sort",
      sortDist: "Distance",
      sortName: "Name",
      filterMax: "Filter",
      allDistances: "All",
      minWalk: "min walk",
      walk: "walk",
      drive: "drive",
      routeTitle: "Calculate route to the residence",
      routePrompt: "Enter your starting address (street, city, country):",
      routeMissingHome: "The residence position is not loaded yet",
      routeNotFound: "Address not found. Try being more specific.",
      geolocationTitle: "Locate me",
      searchLabel: "Search an address...",
      clearDrawings: "Clear drawings",
      globalMap: "Global map",
      goFromHere: "Go from my current location",
      shareWhatsapp: "Send route via WhatsApp",
      geolocationUnsupported: "Geolocation is not available in this browser.",
      geolocationDenied: "Unable to get your location. Please check location permission.",
      itineraryMessage: "Route to",
      relatedKicker: "Collection",
      relatedTitle: "Explore other Narjiss addresses"
    },
    ar: {
      loadingTitle: "المشروع غير موجود",
      loadingText: "هذا المشروع غير مضاف بعد إلى مجموعة نرجس.",
      backProjects: "العودة إلى المشاريع",
      eyebrowLive: "مجموعة خاصة - متاح",
      eyebrowSoon: "مجموعة خاصة - قريبا",
      heroCopyLive: "تجربة عقارية مصممة كملف وكالة راقية: سياق، معالم، زيارة ورابط مباشر للاستكشاف المفصل.",
      heroCopySoon: "عنوان قيد التحضير ضمن مجموعة نرجس، مع موقع واضح يساعد على فهم الحي والإمكانات.",
      openExperience: "فتح التجربة",
      contactAdvisor: "اتصل بمستشار",
      overviewKicker: "الرؤية",
      overviewTitle: "عنوان يقدم بدقة وكالة فاخرة.",
      overviewLive: "يجمع كل مشروع من نرجس المعلومات الأساسية ونقاط الاهتمام والوسائط الغامرة في صفحة أنيقة وسهلة الاستخدام.",
      overviewSoon: "تهيئ هذه الصفحة العرض الكامل للمشروع. تبقى البيانات العامة ظاهرة ويمكن تفعيل التجربة المفصلة عند توفر المواد.",
      visualCaption: "صورة أجواء تصورية - غير تعاقدية.",
      atelierTitle: "بصمة عقارية في أكادير",
      essentials: ["الحالة", "الحي", "نقاط الاهتمام", "التجربة"],
      statusLive: "نشط",
      statusSoon: "قريبا",
      poiEmpty: "قيد الإغناء",
      tourYes: "360 متاح",
      tourNo: "معاينة",
      pillarsKicker: "التجربة",
      pillarsTitle: "كل ما يحتاجه العميل قبل الزيارة.",
      pillars: [
        { title: "قراءة الحي", text: "الموقع والوصول والمحيط تعرض بوضوح لإبراز قيمة العقار." },
        { title: "مسار غامر", text: "المشاريع النشطة تحتفظ برابط مباشر للخريطة التفصيلية والمحتوى الحالي." },
        { title: "عرض تجاري", text: "تبقى الصفحة راقية ومباشرة ومناسبة للعملاء الدوليين." }
      ],
      mapKicker: "الموقع",
      mapTitle: "المشروع داخل مجاله",
      mapText: "حدد العنوان، قارن مشاريع نرجس وانتقل إلى الخريطة الشاملة عند الحاجة.",
      gpsLabel: "إحداثيات GPS",
      mapPoiLoading: "جاري تحميل نقاط الاهتمام في الحي...",
      mapPoiCount: "نقطة اهتمام ظاهرة",
      mapPoiFallback: "لم يتم العثور بعد على ملف نقاط الاهتمام لهذا المشروع. تبقى الإقامة ظاهرة على الخريطة.",
      majorKicker: "معالم",
      majorTitle: "أهم الأماكن حول المشروع",
      majorLoading: "جاري تحميل الأماكن الرئيسية...",
      majorEmpty: "لا توجد أماكن رئيسية متاحة لهذا المشروع.",
      yourResidence: "إقامتك",
      rating: "التقييم",
      reviews: "تقييم",
      sortBy: "الترتيب",
      sortDist: "المسافة",
      sortName: "الاسم",
      filterMax: "تصفية",
      allDistances: "الكل",
      minWalk: "دقيقة مشيا",
      walk: "مشيا",
      drive: "بالسيارة",
      routeTitle: "حساب المسار نحو الإقامة",
      routePrompt: "أدخل عنوان الانطلاق (شارع، مدينة، بلد):",
      routeMissingHome: "لم يتم تحميل موقع الإقامة بعد",
      routeNotFound: "لم يتم العثور على العنوان. حاول بتفاصيل أكثر.",
      geolocationTitle: "تحديد موقعي",
      searchLabel: "ابحث عن عنوان...",
      clearDrawings: "مسح الرسومات",
      globalMap: "الخريطة الشاملة",
      goFromHere: "اذهب من موقعي الحالي",
      shareWhatsapp: "إرسال المسار عبر واتساب",
      geolocationUnsupported: "تحديد الموقع غير متاح في هذا المتصفح.",
      geolocationDenied: "تعذر الحصول على موقعك. تحقق من إذن تحديد الموقع.",
      itineraryMessage: "المسار نحو",
      relatedKicker: "المجموعة",
      relatedTitle: "استكشف عناوين أخرى من نرجس"
    },
    es: {
      loadingTitle: "Proyecto no encontrado",
      loadingText: "Este proyecto todavia no forma parte de la coleccion Narjiss.",
      backProjects: "Volver a proyectos",
      eyebrowLive: "Coleccion privada - Disponible",
      eyebrowSoon: "Coleccion privada - Avance",
      heroCopyLive: "Una experiencia inmobiliaria compuesta como un dossier de agencia premium: contexto, referencias, visita y acceso directo a la exploracion detallada.",
      heroCopySoon: "Una direccion en preparacion dentro de la coleccion Narjiss, ya posicionada para leer con claridad su barrio y potencial.",
      openExperience: "Abrir experiencia",
      contactAdvisor: "Contactar asesor",
      overviewKicker: "Vision",
      overviewTitle: "Una direccion presentada con precision de agencia de lujo.",
      overviewLive: "Cada proyecto Narjiss reune informacion esencial, puntos de interes y recursos inmersivos en una pagina fluida, elegante y accionable.",
      overviewSoon: "Esta pagina prepara la presentacion completa del proyecto. Los datos publicos siguen visibles y la experiencia detallada podra activarse cuando los recursos esten listos.",
      visualCaption: "Visual conceptual de ambiente - no contractual.",
      atelierTitle: "Firma inmobiliaria en Agadir",
      essentials: ["Estado", "Barrio", "Puntos de interes", "Experiencia"],
      statusLive: "Activo",
      statusSoon: "Pronto",
      poiEmpty: "Por enriquecer",
      tourYes: "360 disponible",
      tourNo: "Preview",
      pillarsKicker: "Experiencia",
      pillarsTitle: "Todo lo que un cliente necesita antes de visitar.",
      pillars: [
        { title: "Lectura del barrio", text: "Posicion, accesos y entorno se presentan con claridad para revelar el valor del inmueble." },
        { title: "Recorrido inmersivo", text: "Los proyectos activos conservan acceso directo al mapa detallado y al contenido existente." },
        { title: "Presentacion comercial", text: "La pagina se mantiene sobria, premium y lista para clientes internacionales." }
      ],
      mapKicker: "Localizacion",
      mapTitle: "El proyecto en su territorio",
      mapText: "Ubica la direccion, compara proyectos Narjiss y abre el mapa global cuando quieras la vision completa.",
      gpsLabel: "Coordenadas GPS",
      mapPoiLoading: "Cargando puntos de interes del barrio...",
      mapPoiCount: "puntos de interes visibles",
      mapPoiFallback: "Todavia no se ha encontrado ningun archivo POI para este proyecto. La residencia sigue visible en el mapa.",
      majorKicker: "Referencias",
      majorTitle: "Lugares principales alrededor del proyecto",
      majorLoading: "Cargando lugares principales...",
      majorEmpty: "No hay lugares principales disponibles para este proyecto.",
      yourResidence: "Tu residencia",
      rating: "Nota",
      reviews: "resenas",
      sortBy: "Orden",
      sortDist: "Distancia",
      sortName: "Nombre",
      filterMax: "Filtro",
      allDistances: "Todas",
      minWalk: "min a pie",
      walk: "a pie",
      drive: "en coche",
      routeTitle: "Calcular ruta hacia la residencia",
      routePrompt: "Introduce tu direccion de salida (calle, ciudad, pais):",
      routeMissingHome: "La posicion de la residencia aun no esta cargada",
      routeNotFound: "Direccion no encontrada. Intenta ser mas preciso.",
      geolocationTitle: "Localizarme",
      searchLabel: "Buscar una direccion...",
      clearDrawings: "Borrar dibujos",
      globalMap: "Mapa global",
      goFromHere: "Ir desde mi ubicacion actual",
      shareWhatsapp: "Enviar ruta por WhatsApp",
      geolocationUnsupported: "La geolocalizacion no esta disponible en este navegador.",
      geolocationDenied: "No se pudo obtener tu ubicacion. Revisa el permiso de ubicacion.",
      itineraryMessage: "Ruta hacia",
      relatedKicker: "Coleccion",
      relatedTitle: "Explorar otras direcciones Narjiss"
    }
  };

  var gradients = [
    "linear-gradient(135deg, #00aeef 0%, #7dd3fc 58%, #ffb020 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #a5f3fc 56%, #f59e0b 100%)",
    "linear-gradient(135deg, #0ea5e9 0%, #7dd3fc 58%, #fb923c 100%)",
    "linear-gradient(135deg, #4f46e5 0%, #93c5fd 55%, #ffb020 100%)"
  ];
  var mapInstance;
  var mapMarkers = [];
  var markerMap = {};
  var homePoi = null;
  var currentPois = [];
  var currentSort = "distance";
  var maxDistanceFilter = 0;
  var routingControl = null;
  var drawnItems = null;
  var activeProjectId = "";
  var activeProject = null;
  var majorRouteLayer = null;
  var majorRouteMarker = null;

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
    café: { fr: "Cafe", en: "Cafe", ar: "مقهى", es: "Cafe" },
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
    home: { fr: "Residence", en: "Residence", ar: "الإقامة", es: "Residencia" }
  };

  function text(value, lang) {
    if (!value) return "";
    return value[lang] || value.fr || value.en || "";
  }

  function getLangFromHash() {
    var hash = window.location.hash.replace("#", "");
    return ["fr", "en", "ar", "es"].indexOf(hash) >= 0 ? hash : currentLang || "fr";
  }

  function getProjectId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id") || params.get("project") || params.get("p") || "";
  }

  function findProject() {
    var id = getProjectId();
    if (!id && PROJECTS.length) return PROJECTS[0];
    for (var i = 0; i < PROJECTS.length; i++) {
      if (PROJECTS[i].id === id || PROJECTS[i].folder === id) return PROJECTS[i];
    }
    return null;
  }

  function projectUrl(project, lang) {
    return "project.html?id=" + encodeURIComponent(project.id) + "#" + lang;
  }

  function detailUrl(project, lang) {
    if (project.detail_url) return project.detail_url + "#" + lang;
    return "";
  }

  function projectDataBase(project) {
    if (project.detail_url) {
      var clean = project.detail_url.split("#")[0].split("?")[0];
      var parts = clean.split("/");
      if (parts.length >= 2) {
        return { folder: parts[0], slug: parts[1].replace(/\.html$/i, "") };
      }
    }
    return { folder: project.folder, slug: project.id };
  }

  function drawStorageKey() {
    return "narjiss_project_drawings_" + (activeProjectId || "default");
  }

  function renderNotFound(lang) {
    var t = PAGE_UI[lang];
    document.title = "Narjiss - " + t.loadingTitle;
    document.getElementById("projectApp").innerHTML =
      '<section class="not-found">' +
        '<div class="section-kicker">Narjiss</div>' +
        '<h1>' + t.loadingTitle + '</h1>' +
        '<p>' + t.loadingText + '</p>' +
        '<p><a class="btn-luxe btn-dark" href="index.html#projects">' + t.backProjects + '</a></p>' +
      '</section>';
  }

  function renderStats(project, lang, t) {
    var statLabels = t.essentials;
    var values = [
      project.status === "live" ? t.statusLive : t.statusSoon,
      text(project.location, lang),
      project.poi_count ? project.poi_count + " POI" : t.poiEmpty,
      project.has_tour ? t.tourYes : t.tourNo
    ];
    var html = "";
    for (var i = 0; i < statLabels.length; i++) {
      html += '<div class="signature-item"><div class="signature-label">' + statLabels[i] + '</div><div class="signature-value">' + values[i] + '</div></div>';
    }
    return html;
  }

  function renderPillars(t) {
    var html = "";
    for (var i = 0; i < t.pillars.length; i++) {
      html += '<article class="experience-card"><div class="num">0' + (i + 1) + '</div><h3>' + t.pillars[i].title + '</h3><p>' + t.pillars[i].text + '</p></article>';
    }
    return html;
  }

  function renderRelated(project, lang) {
    var html = "";
    for (var i = 0; i < PROJECTS.length; i++) {
      var item = PROJECTS[i];
      if (item.id === project.id) continue;
      html += '<a class="related-card" href="' + projectUrl(item, lang) + '" style="background:linear-gradient(180deg, rgba(20,20,29,.15), rgba(20,20,29,.82)),' + gradients[i % gradients.length] + '">' +
        '<span>' + (item.status === "live" ? "Narjiss Live" : "Narjiss Preview") + '</span>' +
        '<strong>' + text(item.name, lang) + '</strong>' +
        '<span>' + text(item.location, lang) + '</span>' +
      '</a>';
    }
    return html;
  }

  function renderProjectVisual(project, lang, t) {
    if (!project.images || !project.images.triptych) return "";
    return '<div class="project-visual">' +
      '<img src="' + project.images.triptych + '" alt="' + text(project.name, lang) + '">' +
      '<div class="project-visual-caption">' + t.visualCaption + '</div>' +
    '</div>';
  }

  function mediaImage(project, index) {
    var media = project.media || {};
    var gallery = media.gallery || [];
    return gallery[index] || gallery[0] || (project.images && (project.images.triptych || project.images.logo)) || "";
  }

  function projectFloorPlan(project) {
    var imagePath = project.images && (project.images.triptych || project.images.logo);
    if (imagePath && imagePath.indexOf("/") >= 0) {
      return imagePath.slice(0, imagePath.lastIndexOf("/") + 1) + "floorplan.png";
    }
    return "images/projects/" + (project.folder || project.id) + "/floorplan.png";
  }

  function projectMassPlanPdf(project) {
    var floorPlan = projectFloorPlan(project);
    return floorPlan.slice(0, floorPlan.lastIndexOf("/") + 1) + "PLAN DE MASSE.pdf";
  }

  function renderMediaTile(src, alt, extraClass, caption) {
    if (!src) return '<div class="media-tile ' + extraClass + '"></div>';
    return '<figure class="media-tile ' + extraClass + '">' +
      '<img src="' + src + '" alt="' + alt + '">' +
      (caption || "") +
    '</figure>';
  }

  function renderFloorPlanTile(src, pdfUrl, alt, caption) {
    if (!src) return '<div class="media-tile floor-plan-tile"></div>';
    return '<a class="media-tile floor-plan-tile floor-plan-link" href="' + pdfUrl + '" target="_blank" rel="noopener" aria-label="' + alt + '">' +
      '<img src="' + src + '" alt="' + alt + '">' +
      (caption || "") +
    '</a>';
  }

  function renderProjectMedia(project, lang, t, name, location, contactAction) {
    var media = project.media || {};
    var statusLabel = text(media.status_label, lang) || (project.status === "live" ? t.statusLive : t.statusSoon);
    var tourCover = media.cover360 || mediaImage(project, 1);
    var floorPlan = projectFloorPlan(project);
    var massPlanPdf = projectMassPlanPdf(project);
    var allPhotosLabel = lang === "en" ? "See all photos" : lang === "es" ? "Ver todas las fotos" : lang === "ar" ? "عرض كل الصور" : "Voir toutes les photos";
    var tourLabel = lang === "en" ? "EXPLORE 3D TOUR" : lang === "es" ? "EXPLORAR TOUR 3D" : lang === "ar" ? "استكشاف الجولة 3D" : "EXPLORER 3D TOUR";
    var floorLabel = lang === "ar" ? "المخطط" : "Floor plan";
    var backLabel = t.backProjects;
    var shareLabel = lang === "en" ? "Share" : lang === "es" ? "Compartir" : lang === "ar" ? "مشاركة" : "Partager";
    var saveLabel = lang === "en" ? "Save" : lang === "es" ? "Guardar" : lang === "ar" ? "حفظ" : "Sauvegarder";

    return '<section class="media-showcase">' +
      '<div class="property-toolbar">' +
        '<a href="explorer.html#' + lang + '">← ' + backLabel + '</a>' +
        '<div class="property-toolbar-actions">' +
          '<button type="button">♡ ' + saveLabel + '</button>' +
          '<button type="button">⇧ ' + shareLabel + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="property-summary">' +
        '<div><h1>' + name + '</h1><p>📍 ' + location + '</p></div>' +
        '<div class="hero-actions">' + contactAction + '</div>' +
      '</div>' +
      '<div class="media-wall">' +
        renderMediaTile(mediaImage(project, 0), name, "main", '<figcaption class="media-badge"><span class="media-dot"></span>' + statusLabel + '</figcaption>') +
        '<div class="media-tile">' +
          (tourCover ? '<img src="' + tourCover + '" alt="' + tourLabel + '">' : '') +
          '<div class="tour-overlay"><button class="tour-trigger" type="button" id="openMediaTour" aria-label="' + tourLabel + '"><span>□</span></button><div class="tour-pill">' + tourLabel + '</div></div>' +
        '</div>' +
        renderMediaTile(mediaImage(project, 2), name, "top-last", "") +
        renderFloorPlanTile(floorPlan, massPlanPdf, floorLabel + " " + name, '<figcaption class="floor-badge">⌗ ' + floorLabel + '</figcaption>') +
        renderMediaTile(mediaImage(project, 3), name, "last", '<figcaption class="photos-badge">▦ ' + allPhotosLabel + '</figcaption>') +
      '</div>' +
      '<div class="media-tour-modal" id="mediaTourModal" aria-hidden="true">' +
        '<div class="media-tour-panel">' +
          '<div class="media-tour-head"><strong>' + tourLabel + ' - ' + name + '</strong><button type="button" id="closeMediaTour">Fermer</button></div>' +
          '<div id="mediaTourMount"></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderClassicHero(project, lang, t, name, location, heroActions) {
    return '<section class="project-hero">' +
      '<div class="hero-inner">' +
        '<div class="eyebrow"><span>' + project.icon + '</span><span>' + (project.status === "live" ? t.eyebrowLive : t.eyebrowSoon) + '</span></div>' +
        '<h1 class="hero-title">' + name + '</h1>' +
        '<p class="hero-location">📍 ' + location + '</p>' +
        '<div class="hero-panel">' +
          '<p class="hero-summary">' + (project.status === "live" ? t.heroCopyLive : t.heroCopySoon) + '</p>' +
          '<div class="hero-actions">' + heroActions + '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function setupProjectMedia(project, lang) {
    var openBtn = document.getElementById("openMediaTour");
    var closeBtn = document.getElementById("closeMediaTour");
    var modal = document.getElementById("mediaTourModal");
    var mount = document.getElementById("mediaTourMount");
    if (!openBtn || !closeBtn || !modal || !mount) return;
    var tourUrl = project.media && project.media.tour360 ? project.media.tour360 : "tours/" + project.id + "/index.html";

    function showMissingTour() {
      mount.innerHTML = '<div class="media-tour-missing"><div><strong>Export 3dVista non trouve pour le moment.</strong><p>Copie ton export dans <code>C:/xampp/htdocs/narjiss/tours/' + project.id + '/</code> avec un fichier <code>index.html</code>, puis recharge cette page.</p></div></div>';
    }

    function openTour() {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      if (!tourUrl) {
        showMissingTour();
        return;
      }
      fetch(tourUrl, { method: "HEAD" }).then(function(response) {
        if (response.ok) {
          mount.innerHTML = '<iframe class="media-tour-frame" src="' + tourUrl + '" allowfullscreen></iframe>';
        } else {
          showMissingTour();
        }
      }).catch(showMissingTour);
    }

    function closeTour() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      mount.innerHTML = "";
    }

    openBtn.addEventListener("click", openTour);
    closeBtn.addEventListener("click", closeTour);
    modal.addEventListener("click", function(event) {
      if (event.target === modal) closeTour();
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape") closeTour();
    });
  }

  function splitCsvLine(line) {
    var cells = [];
    var current = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      var next = line.charAt(i + 1);
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ";" && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  }

  function parseCSV(text) {
    var lines = text.replace(/\r/g, "").split("\n").filter(function(line) {
      return line.trim() !== "";
    });
    if (lines.length < 2) return [];
    var header = splitCsvLine(lines[0]);
    var idx = {};
    for (var i = 0; i < header.length; i++) {
      var key = header[i].trim().toLowerCase();
      if (key.indexOf("cat") === 0) idx.cat = i;
      if (key.indexOf("emoji") === 0) idx.emoji = i;
      if (key.indexOf("nom") === 0 || key.indexOf("name") === 0) idx.nom = i;
      if (key.indexOf("adresse") === 0 || key.indexOf("address") === 0) idx.adresse = i;
      if (key.indexOf("note") === 0 || key.indexOf("rating") === 0) idx.note = i;
      if (key.indexOf("latitude") === 0 || key === "lat") idx.lat = i;
      if (key.indexOf("longitude") === 0 || key === "lng") idx.lng = i;
      if (key.indexOf("nb avis") === 0 || key.indexOf("avis") >= 0 || key.indexOf("reviews") >= 0) idx.avis = i;
      if (key.indexOf("telephone") === 0 || key.indexOf("téléphone") === 0 || key.indexOf("phone") === 0) idx.tel = i;
      if (key.indexOf("horaires") === 0 || key.indexOf("notes") >= 0 || key.indexOf("hours") === 0) idx.horaires = i;
    }

    var pois = [];
    for (var j = 1; j < lines.length; j++) {
      var c = splitCsvLine(lines[j]);
      var lat = parseFloat((c[idx.lat] || "").replace(",", "."));
      var lng = parseFloat((c[idx.lng] || "").replace(",", "."));
      if (!isFinite(lat) || !isFinite(lng)) continue;
      pois.push({
        cat: (c[idx.cat] || "").trim().toLowerCase(),
        emoji: (c[idx.emoji] || "📍").trim() || "📍",
        nom: (c[idx.nom] || "").trim(),
        adresse: (c[idx.adresse] || "").trim(),
        note: (c[idx.note] || "").trim(),
        avis: (c[idx.avis] || "").trim(),
        tel: (c[idx.tel] || "").trim(),
        horaires: (c[idx.horaires] || "").trim(),
        lat: lat,
        lng: lng
      });
    }
    return pois;
  }

  function haversineDistance(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var toRad = function(v) { return v * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function walkingMinutes(meters) {
    return Math.max(1, Math.round(meters / 80));
  }

  function drivingMinutes(meters) {
    return Math.max(1, Math.round(meters / 420));
  }

  function formatDistance(meters) {
    if (!meters) return "";
    if (meters < 1000) return Math.round(meters) + " m";
    return (meters / 1000).toFixed(1).replace(".", ",") + " km";
  }

  function distanceMeta(poi, t) {
    if (!poi._distance) return "";
    return formatDistance(poi._distance) + " · " + poi._walking + " min " + t.walk + " · " + poi._driving + " min " + t.drive;
  }

  function normalizeCategory(cat) {
    return (cat || "").toString().trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
  }

  function categoryLabel(cat, lang) {
    if (!cat) return "POI";
    var key = normalizeCategory(cat);
    if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key][lang] || CATEGORY_LABELS[key].fr;
    return cat.replace(/_/g, " ").replace(/\b\w/g, function(ch) {
      return ch.toUpperCase();
    });
  }

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
    loisir: { color: "#6ab04c", icon: "leaf" }
  };

  function poiMarkerStyle(cat) {
    return POI_MARKER_STYLES[normalizeCategory(cat)] || { color: "#7f8c8d", icon: "pin" };
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
      pin: '<path d="M12 20s6-5 6-10a6 6 0 0 0-12 0c0 5 6 10 6 10z"/><circle cx="12" cy="10" r="2"/>'
    };
    return '<svg class="poi-google-svg" viewBox="0 0 24 24" aria-hidden="true">' + (paths[icon] || paths.pin) + '</svg>';
  }

  function makeIcon(poi, isHome) {
    if (isHome) {
      return L.divIcon({
        html: '<div class="project-pin-marker"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
        className: "project-home-marker-icon"
      });
    }
    var style = poiMarkerStyle(poi.cat);
    var size = 34;
    return L.divIcon({
      html: '<div class="poi-google-marker" style="background:' + style.color + '">' + poiIconSvg(style.icon) + '</div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
      className: "poi-google-marker-icon"
    });
  }

  function poiLegendMarker(cat) {
    var style = poiMarkerStyle(cat);
    return '<span class="poi-legend-marker" style="background:' + style.color + '">' + poiIconSvg(style.icon) + '</span>';
  }

  function makePopup(poi, lang) {
    var t = PAGE_UI[lang];
    var cat = poi.cat === "home" ? t.yourResidence : categoryLabel(poi.cat, lang);
    var note = poi.note ? '<div class="popup-meta">★ ' + t.rating + ' ' + poi.note + (poi.avis ? ' · ' + poi.avis + ' ' + t.reviews : '') + '</div>' : "";
    var phone = poi.tel ? '<div class="popup-meta popup-phone">📞 <a href="tel:' + poi.tel.replace(/\s/g, "") + '">' + poi.tel + '</a></div>' : "";
    var hours = poi.horaires ? '<div class="popup-meta">' + poi.horaires + '</div>' : "";
    return '<div class="project-popup">' +
      '<div class="popup-cat">' + cat + '</div>' +
      '<div class="popup-name">' + (poi.nom || cat) + '</div>' +
      (poi.adresse ? '<div class="popup-address">📍 ' + poi.adresse + '</div>' : '') +
      note + phone + hours +
    '</div>';
  }

  function toggleCategory(cat) {
    var btn = document.querySelector('.poi-category-btn[data-cat="' + cat + '"]');
    var list = document.getElementById("poi-list-" + cat);
    var wasOpen = btn && btn.classList.contains("active");
    var buttons = document.querySelectorAll(".poi-category-btn");
    var lists = document.querySelectorAll(".poi-list");
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("active");
    for (var j = 0; j < lists.length; j++) lists[j].classList.remove("show");

    if (!wasOpen && btn && list) {
      btn.classList.add("active");
      list.classList.add("show");
      for (var m = 0; m < mapMarkers.length; m++) {
        if (mapMarkers[m]._cat === cat || mapMarkers[m]._cat === "home") mapInstance.addLayer(mapMarkers[m]);
        else mapInstance.removeLayer(mapMarkers[m]);
      }
    } else {
      for (var n = 0; n < mapMarkers.length; n++) mapInstance.addLayer(mapMarkers[n]);
    }
  }

  function focusPoi(index) {
    var marker = markerMap[index];
    if (!marker || !mapInstance) return;
    if (!mapInstance.hasLayer(marker)) marker.addTo(mapInstance);
    mapInstance.setView(marker.getLatLng(), 17);
    marker.openPopup();
  }

  function showMajorRoute(index) {
    if (!mapInstance || !currentMajorPois[index]) return;
    var poi = currentMajorPois[index];
    var origin = homePoi || (activeProject ? {
      lat: activeProject.lat,
      lng: activeProject.lng,
      cat: "home",
      emoji: activeProject.icon,
      nom: text(activeProject.name, getLangFromHash()),
      adresse: text(activeProject.location, getLangFromHash())
    } : null);
    if (!origin) return;

    if (majorRouteLayer) {
      mapInstance.removeLayer(majorRouteLayer);
      majorRouteLayer = null;
    }
    if (majorRouteMarker) {
      mapInstance.removeLayer(majorRouteMarker);
      majorRouteMarker = null;
    }

    var t = PAGE_UI[getLangFromHash()];
    var latlngs = [
      [origin.lat, origin.lng],
      [poi.lat, poi.lng]
    ];
    majorRouteLayer = L.polyline(latlngs, {
      color: "#c15a00",
      weight: 4,
      opacity: .95,
      dashArray: "8, 8"
    }).addTo(mapInstance);

    majorRouteMarker = L.marker([poi.lat, poi.lng], {
      icon: makeIcon(poi, false)
    }).bindPopup(makePopup(poi, getLangFromHash())).addTo(mapInstance);
    var mapEl = document.getElementById("projectMapSection") || document.getElementById("projectMap");
    if (mapEl && typeof mapEl.scrollIntoView === "function") {
      mapEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function centerMajorRoute() {
      mapInstance.invalidateSize();
      mapInstance.fitBounds(L.latLngBounds(latlngs).pad(0.25), { maxZoom: 14 });
      majorRouteMarker.openPopup();
    }
    window.setTimeout(centerMajorRoute, 150);
    window.setTimeout(centerMajorRoute, 700);

    var cards = document.querySelectorAll(".major-card");
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove("active");
    var card = document.querySelector('.major-card[data-major-idx="' + index + '"]');
    if (card) card.classList.add("active");
  }

  function updatePoiSummary(pois, lang, hasCsv) {
    var box = document.getElementById("poiSummary");
    if (!box) return;
    var t = PAGE_UI[lang];
    if (!hasCsv) {
      box.innerHTML = '<div class="poi-note">' + t.mapPoiFallback + '</div>';
      return;
    }

    var categories = {};
    var order = [];
    for (var i = 0; i < pois.length; i++) {
      if (pois[i].cat === "home") continue;
      if (!categories[pois[i].cat]) {
        categories[pois[i].cat] = { count: 0, emoji: pois[i].emoji, items: [] };
        order.push(pois[i].cat);
      }
      categories[pois[i].cat].count++;
      categories[pois[i].cat].items.push({ poi: pois[i], idx: i });
    }

    for (var c in categories) {
      categories[c].items.sort(function(a, b) {
        if (currentSort === "name") return a.poi.nom.localeCompare(b.poi.nom);
        return (a.poi._distance || 0) - (b.poi._distance || 0);
      });
    }

    var chips = "";
    var keys = Object.keys(categories).slice(0, 8);
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      chips += '<span class="poi-chip">' + poiLegendMarker(key) + '<span>' + categoryLabel(key, lang) + ' · ' + categories[key].count + '</span></span>';
    }
    var count = Math.max(0, pois.length - 1);
    var html =
      '<div class="poi-count"><span>' + count + '</span>' + t.mapPoiCount + '</div>' +
      '<div class="poi-chips">' + chips + '</div>' +
      '<div class="poi-controls">' +
        '<div class="poi-control-row"><label>' + t.sortBy + '</label>' +
          '<button class="poi-sort' + (currentSort === "distance" ? " active" : "") + '" data-sort="distance">📏 ' + t.sortDist + '</button>' +
          '<button class="poi-sort' + (currentSort === "name" ? " active" : "") + '" data-sort="name">🔤 ' + t.sortName + '</button>' +
        '</div>' +
        '<div class="poi-control-row"><label>' + t.filterMax + '</label>' +
          '<select class="poi-filter" id="poiDistanceFilter">' +
            '<option value="0"' + (maxDistanceFilter === 0 ? " selected" : "") + '>' + t.allDistances + '</option>' +
            '<option value="5"' + (maxDistanceFilter === 5 ? " selected" : "") + '>≤ 5 ' + t.minWalk + '</option>' +
            '<option value="10"' + (maxDistanceFilter === 10 ? " selected" : "") + '>≤ 10 ' + t.minWalk + '</option>' +
            '<option value="15"' + (maxDistanceFilter === 15 ? " selected" : "") + '>≤ 15 ' + t.minWalk + '</option>' +
            '<option value="30"' + (maxDistanceFilter === 30 ? " selected" : "") + '>≤ 30 ' + t.minWalk + '</option>' +
          '</select>' +
        '</div>' +
      '</div>';

    for (var k = 0; k < order.length; k++) {
      var cat = order[k];
      var items = categories[cat].items;
      if (maxDistanceFilter > 0) {
        items = items.filter(function(it) { return it.poi._walking <= maxDistanceFilter; });
      }
      if (!items.length) continue;
      html += '<div class="poi-category">' +
        '<button class="poi-category-btn" data-cat="' + cat + '">' + poiLegendMarker(cat) + '<span class="label">' + categoryLabel(cat, lang) + '</span><span class="count">' + items.length + '</span><span class="arrow">▶</span></button>' +
        '<div class="poi-list" id="poi-list-' + cat + '">';
      for (var x = 0; x < items.length; x++) {
        var poi = items[x].poi;
        var distLabel = distanceMeta(poi, t);
        var rating = poi.note ? " · ★ " + poi.note : "";
        html += '<button class="poi-item" data-idx="' + items[x].idx + '"><span class="poi-dot"></span><span><span class="poi-name">' + poi.nom + '</span><span class="poi-meta">' + distLabel + rating + '</span></span></button>';
      }
      html += '</div></div>';
    }

    box.innerHTML = html;

    var sortBtns = box.querySelectorAll(".poi-sort");
    for (var s = 0; s < sortBtns.length; s++) {
      sortBtns[s].addEventListener("click", function() {
        currentSort = this.getAttribute("data-sort");
        updatePoiSummary(currentPois, lang, true);
      });
    }
    var filter = document.getElementById("poiDistanceFilter");
    if (filter) {
      filter.addEventListener("change", function() {
        maxDistanceFilter = parseInt(this.value, 10) || 0;
        updatePoiSummary(currentPois, lang, true);
      });
    }
    var catBtns = box.querySelectorAll(".poi-category-btn");
    for (var b = 0; b < catBtns.length; b++) {
      catBtns[b].addEventListener("click", function() {
        toggleCategory(this.getAttribute("data-cat"));
      });
    }
    var itemBtns = box.querySelectorAll(".poi-item");
    for (var p = 0; p < itemBtns.length; p++) {
      itemBtns[p].addEventListener("click", function() {
        focusPoi(parseInt(this.getAttribute("data-idx"), 10));
      });
    }
  }

  function loadProjectPois(project, lang) {
    var base = projectDataBase(project);
    var primary = base.folder + "/" + base.slug + "_" + lang + ".csv";
    var fallback = base.folder + "/" + base.slug + "_fr.csv";
    return fetch(primary).then(function(response) {
      if (!response.ok) throw new Error("CSV not found");
      return response.text();
    }).catch(function() {
      if (primary === fallback) throw new Error("CSV not found");
      return fetch(fallback).then(function(response) {
        if (!response.ok) throw new Error("CSV not found");
        return response.text();
      });
    }).then(function(text) {
      return parseCSV(text);
    });
  }

  function loadProjectMajorPois(project, lang) {
    var base = projectDataBase(project);
    var primary = base.folder + "/" + base.slug + "_major_" + lang + ".csv";
    var fallback = base.folder + "/" + base.slug + "_major_fr.csv";
    return fetch(primary).then(function(response) {
      if (!response.ok) throw new Error("Major CSV not found");
      return response.text();
    }).catch(function() {
      if (primary === fallback) throw new Error("Major CSV not found");
      return fetch(fallback).then(function(response) {
        if (!response.ok) throw new Error("Major CSV not found");
        return response.text();
      });
    }).then(function(text) {
      return parseCSV(text);
    });
  }

  var currentMajorPois = [];

  function renderMajorPois(project, lang) {
    var box = document.getElementById("majorGrid");
    if (!box) return;
    var t = PAGE_UI[lang];
    box.innerHTML = '<p class="major-empty">' + t.majorLoading + '</p>';

    loadProjectMajorPois(project, lang).then(function(pois) {
      var home = null;
      for (var i = 0; i < pois.length; i++) {
        if (pois[i].cat === "home") {
          home = pois[i];
          break;
        }
      }
      if (!home) {
        home = {
          lat: project.lat,
          lng: project.lng
        };
      }

      var items = [];
      for (var j = 0; j < pois.length; j++) {
        if (pois[j].cat === "home") continue;
        pois[j]._distance = haversineDistance(home.lat, home.lng, pois[j].lat, pois[j].lng);
        pois[j]._walking = walkingMinutes(pois[j]._distance);
        pois[j]._driving = drivingMinutes(pois[j]._distance);
        items.push(pois[j]);
      }
      items.sort(function(a, b) {
        return a._distance - b._distance;
      });
      currentMajorPois = items;

      if (!items.length) {
        box.innerHTML = '<p class="major-empty">' + t.majorEmpty + '</p>';
        return;
      }

      var html = "";
      for (var k = 0; k < items.length; k++) {
        var poi = items[k];
        var address = poi.adresse ? '<div>' + poi.adresse + '</div>' : "";
        var note = poi.note ? '<div>★ ' + t.rating + ' ' + poi.note + (poi.avis ? ' · ' + poi.avis + ' ' + t.reviews : '') + '</div>' : "";
        html += '<button class="major-card" type="button" data-major-idx="' + k + '">' +
          '<div class="major-icon">' + poi.emoji + '</div>' +
          '<div>' +
            '<div class="major-name">' + poi.nom + '</div>' +
            '<div class="major-meta">' +
              '<div>' + distanceMeta(poi, t) + '</div>' +
              address +
              note +
            '</div>' +
          '</div>' +
        '</button>';
      }
      box.innerHTML = html;
      var cards = box.querySelectorAll(".major-card");
      for (var c = 0; c < cards.length; c++) {
        cards[c].addEventListener("click", function() {
          showMajorRoute(parseInt(this.getAttribute("data-major-idx"), 10));
        });
      }
    }).catch(function() {
      currentMajorPois = [];
      box.innerHTML = '<p class="major-empty">' + t.majorEmpty + '</p>';
    });
  }

  function renderPois(project, pois, lang) {
    if (!mapInstance || !window.L) return;
    for (var i = 0; i < mapMarkers.length; i++) mapInstance.removeLayer(mapMarkers[i]);
    mapMarkers = [];
    markerMap = {};
    currentPois = pois;
    homePoi = null;

    var bounds = L.latLngBounds([]);
    var hasHome = false;
    for (var j = 0; j < pois.length; j++) {
      var poi = pois[j];
      var isHome = poi.cat === "home";
      if (isHome) {
        hasHome = true;
        homePoi = poi;
      }
    }
    if (!hasHome) {
      homePoi = {
        cat: "home",
        emoji: project.icon,
        nom: text(project.name, lang),
        adresse: text(project.location, lang),
        lat: project.lat,
        lng: project.lng
      };
      pois = [homePoi].concat(pois);
      currentPois = pois;
      hasHome = true;
    }
    if (homePoi) {
      homePoi.emoji = project.icon;
      homePoi.nom = text(project.name, lang);
      homePoi.adresse = text(project.location, lang) || homePoi.adresse;
    }
    if (homePoi) {
      for (var d = 0; d < pois.length; d++) {
        if (pois[d].cat !== "home") {
          pois[d]._distance = haversineDistance(homePoi.lat, homePoi.lng, pois[d].lat, pois[d].lng);
          pois[d]._walking = walkingMinutes(pois[d]._distance);
          pois[d]._driving = drivingMinutes(pois[d]._distance);
        } else {
          pois[d]._distance = 0;
          pois[d]._walking = 0;
          pois[d]._driving = 0;
        }
      }
    }

    for (var j = 0; j < pois.length; j++) {
      var poi = pois[j];
      var isHome = poi.cat === "home";
      var marker = L.marker([poi.lat, poi.lng], {
        icon: makeIcon(poi, isHome),
        zIndexOffset: isHome ? 1000 : 0
      }).bindPopup(makePopup(poi, lang));
      if (isHome) {
        marker.on("mouseover", function() {
          this.openPopup();
        });
      }
      marker._cat = poi.cat;
      marker.addTo(mapInstance);
      mapMarkers.push(marker);
      markerMap[j] = marker;
      bounds.extend([poi.lat, poi.lng]);
    }

    if (bounds.isValid()) {
      mapInstance.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
    }
  }

  function startRouting(lang) {
    var t = PAGE_UI[lang];
    if (!homePoi || !mapInstance || !window.L || !L.Routing) {
      alert(t.routeMissingHome);
      return;
    }
    if (routingControl) {
      mapInstance.removeControl(routingControl);
      routingControl = null;
      return;
    }
    var startAddress = prompt(t.routePrompt, "");
    if (!startAddress) return;
    fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(startAddress) + "&format=json&limit=1")
      .then(function(r) { return r.json(); })
      .then(function(results) {
        if (!results.length) {
          alert(t.routeNotFound);
          return;
        }
        routingControl = L.Routing.control({
          waypoints: [
            L.latLng(parseFloat(results[0].lat), parseFloat(results[0].lon)),
            L.latLng(homePoi.lat, homePoi.lng)
          ],
          routeWhileDragging: true,
          showAlternatives: true,
          fitSelectedRoutes: true,
          collapsible: true,
          position: "topleft",
          lineOptions: { styles: [{ color: "#c15a00", weight: 5, opacity: .85 }] },
          router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1", profile: "driving" })
        }).addTo(mapInstance);
      }).catch(function(err) {
        alert(err.message);
      });
  }

  function openCurrentPositionRoute(project, lang, shareOnly) {
    var t = PAGE_UI[lang];
    if (!navigator.geolocation) {
      alert(t.geolocationUnsupported);
      return;
    }
    navigator.geolocation.getCurrentPosition(function(position) {
      var userLat = position.coords.latitude;
      var userLng = position.coords.longitude;
      var projectName = text(project.name, lang);
      var mapsUrl = "https://www.google.com/maps/dir/?api=1" +
        "&origin=" + encodeURIComponent(userLat + "," + userLng) +
        "&destination=" + encodeURIComponent(project.lat + "," + project.lng) +
        "&travelmode=driving";
      var whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(t.itineraryMessage + " " + projectName + " : " + mapsUrl);
      var whatsappBtns = document.querySelectorAll(".projectWhatsappRoute");
      for (var i = 0; i < whatsappBtns.length; i++) {
        whatsappBtns[i].href = whatsappUrl;
        whatsappBtns[i].classList.add("show");
      }
      window.open(shareOnly ? whatsappUrl : mapsUrl, "_blank", "noopener");
    }, function() {
      alert(t.geolocationDenied);
    }, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000
    });
  }

  function setupRouteButtons(project, lang) {
    var routeBtns = document.querySelectorAll(".projectCurrentRoute");
    for (var i = 0; i < routeBtns.length; i++) {
      routeBtns[i].addEventListener("click", function() {
        openCurrentPositionRoute(project, lang, false);
      });
    }
    var whatsappBtns = document.querySelectorAll(".projectWhatsappRoute");
    for (var j = 0; j < whatsappBtns.length; j++) {
      whatsappBtns[j].addEventListener("click", function(event) {
        event.preventDefault();
        openCurrentPositionRoute(project, lang, true);
      });
    }
  }

  function installMapControls(lang) {
    if (!mapInstance || !window.L) return;
    var t = PAGE_UI[lang];
    var osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxNativeZoom: 19,
      maxZoom: 22
    });
    var cartoLightLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxNativeZoom: 20,
      maxZoom: 22
    });
    var cartoVoyagerLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxNativeZoom: 20,
      maxZoom: 22
    });
    var cartoDarkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxNativeZoom: 20,
      maxZoom: 22
    });
    var topoLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap © OpenTopoMap",
      maxNativeZoom: 17,
      maxZoom: 22
    });
    var satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "© Esri",
      maxNativeZoom: 19,
      maxZoom: 22
    });
    osmLayer.addTo(mapInstance);
    L.control.layers({
      "Plan OSM": osmLayer,
      "Clair": cartoLightLayer,
      "Voyager": cartoVoyagerLayer,
      "Sombre": cartoDarkLayer,
      "Topographique": topoLayer,
      "Satellite": satelliteLayer
    }, {}, { position: "topright", collapsed: true }).addTo(mapInstance);
    L.control.scale({ position: "bottomleft", imperial: false, metric: true }).addTo(mapInstance);

    var ViewControls = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function() {
        var container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        var fullBtn = L.DomUtil.create("a", "map-tool-btn", container);
        var compactBtn = L.DomUtil.create("a", "map-tool-btn", container);
        fullBtn.href = "#";
        compactBtn.href = "#";
        fullBtn.innerHTML = "⛶";
        compactBtn.innerHTML = "−";
        fullBtn.title = "Plein écran";
        compactBtn.title = "Réduire / agrandir la carte";

        L.DomEvent.on(fullBtn, "click", function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          var target = document.getElementById("projectMapSection") || document.getElementById("projectMap");
          if (!target) return;
          if (document.fullscreenElement) document.exitFullscreen();
          else if (target.requestFullscreen) target.requestFullscreen();
          window.setTimeout(function() { mapInstance.invalidateSize(); }, 250);
        });

        L.DomEvent.on(compactBtn, "click", function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          var wrap = document.querySelector(".map-composition");
          if (!wrap) return;
          wrap.classList.toggle("map-compact");
          compactBtn.innerHTML = wrap.classList.contains("map-compact") ? "+" : "−";
          window.setTimeout(function() { mapInstance.invalidateSize(); }, 250);
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
      }
    });
    mapInstance.addControl(new ViewControls());

    try {
      var measureFn = null;
      if (L.control && typeof L.control.polylineMeasure === "function") measureFn = L.control.polylineMeasure;
      else if (L.Control && L.Control.PolylineMeasure) measureFn = function(opts) { return new L.Control.PolylineMeasure(opts); };
      if (measureFn) {
        measureFn({
          position: "topleft",
          unit: "metres",
          showBearings: false,
          clearMeasurementsOnStop: false,
          showClearControl: true,
          showUnitControl: false,
          measureControlTitleOn: "Mesurer une distance",
          measureControlTitleOff: "Arreter la mesure",
          measureControlLabel: "📏"
        }).addTo(mapInstance);
      }
    } catch (e) {}

    try {
      if (typeof window.GeoSearch !== "undefined" && window.GeoSearch.GeoSearchControl) {
        mapInstance.addControl(new window.GeoSearch.GeoSearchControl({
          provider: new window.GeoSearch.OpenStreetMapProvider(),
          style: "bar",
          showMarker: true,
          showPopup: true,
          autoClose: true,
          retainZoomLevel: false,
          animateZoom: true,
          keepResult: true,
          searchLabel: t.searchLabel,
          position: "topleft"
        }));
      }
    } catch (e) {}

    try {
      if (L.control && typeof L.control.locate === "function") {
        L.control.locate({
          position: "topleft",
          strings: { title: t.geolocationTitle },
          locateOptions: { maxZoom: 22, enableHighAccuracy: true },
          flyTo: true,
          cacheLocation: true,
          drawCircle: true,
          drawMarker: true,
          showCompass: true
        }).addTo(mapInstance);
      }
    } catch (e) {}

    try {
      if (L.Control && L.Control.MiniMap) {
        var miniLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxNativeZoom: 19, maxZoom: 22 });
        new L.Control.MiniMap(miniLayer, {
          position: "bottomright",
          width: 145,
          height: 145,
          zoomLevelOffset: -5,
          toggleDisplay: true,
          minimized: false
        }).addTo(mapInstance);
      }
    } catch (e) {}

    try {
      if (L.Control && L.Control.Draw) {
        drawnItems = new L.FeatureGroup();
        mapInstance.addLayer(drawnItems);
        loadDrawings();
        var drawControl = new L.Control.Draw({
          position: "topleft",
          draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: false,
            circlemarker: false,
            marker: true
          },
          edit: { featureGroup: drawnItems }
        });
        mapInstance.addControl(drawControl);
        mapInstance.on(L.Draw.Event.CREATED, function(event) {
          drawnItems.addLayer(event.layer);
          saveDrawings();
        });
        mapInstance.on(L.Draw.Event.EDITED, saveDrawings);
        mapInstance.on(L.Draw.Event.DELETED, saveDrawings);

        var ClearDrawingsButton = L.Control.extend({
          options: { position: "topleft" },
          onAdd: function() {
            var container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
            var btn = L.DomUtil.create("a", "", container);
            btn.innerHTML = "🧹";
            btn.href = "#";
            btn.title = t.clearDrawings;
            btn.style.cssText = "cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;text-decoration:none;background:white;";
            L.DomEvent.on(btn, "click", function(e) {
              L.DomEvent.stopPropagation(e);
              L.DomEvent.preventDefault(e);
              if (drawnItems) drawnItems.clearLayers();
              saveDrawings();
            });
            L.DomEvent.disableClickPropagation(container);
            return container;
          }
        });
        mapInstance.addControl(new ClearDrawingsButton());
      }
    } catch (e) {}

    try {
      if (L.Routing && L.Routing.control) {
        var RoutingButton = L.Control.extend({
          options: { position: "topleft" },
          onAdd: function() {
            var container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
            var btn = L.DomUtil.create("a", "", container);
            btn.innerHTML = "🚗";
            btn.href = "#";
            btn.title = t.routeTitle;
            btn.style.cssText = "cursor:pointer;width:30px;height:30px;display:flex;align-items:center;justify-content:center;text-decoration:none;background:white;";
            L.DomEvent.on(btn, "click", function(e) {
              L.DomEvent.stopPropagation(e);
              L.DomEvent.preventDefault(e);
              startRouting(lang);
            });
            L.DomEvent.disableClickPropagation(container);
            return container;
          }
        });
        mapInstance.addControl(new RoutingButton());
      }
    } catch (e) {}
  }

  function saveDrawings() {
    if (!drawnItems) return;
    try {
      localStorage.setItem(drawStorageKey(), JSON.stringify(drawnItems.toGeoJSON()));
    } catch (e) {
      console.warn("Unable to save drawings", e);
    }
  }

  function loadDrawings() {
    if (!drawnItems || !window.L) return;
    try {
      var raw = localStorage.getItem(drawStorageKey());
      if (!raw) return;
      L.geoJSON(JSON.parse(raw), {
        pointToLayer: function(feature, latlng) {
          return L.marker(latlng);
        },
        onEachFeature: function(feature, layer) {
          drawnItems.addLayer(layer);
        },
        style: function() {
          return {
            color: "#c15a00",
            weight: 3,
            opacity: .9,
            fillColor: "#c15a00",
            fillOpacity: .18
          };
        }
      });
    } catch (e) {
      console.warn("Unable to load drawings", e);
    }
  }

  function renderMap(project, lang) {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
    mapMarkers = [];
    majorRouteLayer = null;
    majorRouteMarker = null;
    activeProjectId = project.id;
    activeProject = project;
    if (!window.L) return;
    var mapOptions = { scrollWheelZoom: false, maxZoom: 22 };
    try {
      if (L.Control && L.Control.Fullscreen) {
        mapOptions.fullscreenControl = true;
        mapOptions.fullscreenControlOptions = { position: "topleft" };
      }
    } catch (e) {}
    mapInstance = L.map("projectMap", mapOptions).setView([project.lat, project.lng], 14);
    installMapControls(lang);

    updatePoiSummary([], lang, true);
    var summary = document.getElementById("poiSummary");
    if (summary) summary.innerHTML = '<div class="poi-note">' + PAGE_UI[lang].mapPoiLoading + '</div>';

    loadProjectPois(project, lang).then(function(pois) {
      if (!pois.length) throw new Error("Empty CSV");
      renderPois(project, pois, lang);
      updatePoiSummary(pois, lang, true);
    }).catch(function() {
      var homePoi = [{
        cat: "home",
        emoji: project.icon,
        nom: text(project.name, lang),
        adresse: text(project.location, lang),
        lat: project.lat,
        lng: project.lng
      }];
      renderPois(project, homePoi, lang);
      updatePoiSummary(homePoi, lang, false);
    });
  }

  function renderProject(lang) {
    var project = findProject();
    if (!project) {
      renderNotFound(lang);
      return;
    }

    var t = PAGE_UI[lang];
    var name = text(project.name, lang);
    var location = text(project.location, lang);
    var gradient = gradients[PROJECTS.indexOf(project) % gradients.length];
    var topActions = '<a class="btn-luxe btn-gold" href="contact.html#' + lang + '">' + t.contactAdvisor + '</a>' +
      '<button class="btn-luxe btn-glass projectCurrentRoute" type="button">' + t.goFromHere + '</button>' +
      '<a class="btn-luxe btn-whatsapp projectWhatsappRoute" href="#" target="_blank" rel="noopener">' + t.shareWhatsapp + '</a>';

    document.title = name + " - Narjiss";
    document.documentElement.style.setProperty("--project-gradient", gradient);
    document.getElementById("projectApp").innerHTML =
      renderProjectMedia(project, lang, t, name, location, topActions) +
      '<section class="signature-strip"><div class="signature-grid">' + renderStats(project, lang, t) + '</div></section>' +
      '<section class="section">' +
          '<div class="editorial-grid">' +
          '<div>' +
            '<div class="section-kicker">' + t.overviewKicker + '</div>' +
            '<h2>' + t.overviewTitle + '</h2>' +
            '<p class="lead-copy">' + (project.status === "live" ? t.overviewLive : t.overviewSoon) + '</p>' +
          '</div>' +
          '<div class="atelier-card">' +
            '<div class="atelier-content">' +
              '<div class="atelier-icon">' + project.icon + '</div>' +
              '<h3>' + t.atelierTitle + '</h3>' +
              '<p>' + location + '</p>' +
            '</div>' +
          '</div>' +
          renderProjectVisual(project, lang, t) +
        '</div>' +
      '</section>' +
      '<section class="experience-band"><div class="section">' +
        '<div class="section-kicker">' + t.pillarsKicker + '</div>' +
        '<h2>' + t.pillarsTitle + '</h2>' +
        '<div class="experience-grid" style="margin-top:1rem">' + renderPillars(t) + '</div>' +
      '</div></section>' +
      '<section class="section">' +
        '<div class="section-kicker">' + t.majorKicker + '</div>' +
        '<h2>' + t.majorTitle + ' ' + name + '</h2>' +
        '<div class="major-grid" id="majorGrid"></div>' +
      '</section>' +
      '<section class="section" id="projectMapSection">' +
        '<div class="map-composition">' +
          '<aside class="map-aside">' +
            '<div class="map-intro"><div class="section-kicker">' + t.mapKicker + '</div><h3>' + t.mapTitle + '</h3><p>' + t.mapText + '</p><div class="coordinate"><span>' + t.gpsLabel + ' :</span> ' + project.lat.toFixed(6) + ', ' + project.lng.toFixed(6) + '</div></div>' +
            '<div class="poi-summary" id="poiSummary"></div>' +
            '<div class="map-actions">' +
              '<button class="btn-luxe btn-gold projectCurrentRoute" type="button">' + t.goFromHere + '</button>' +
              '<a class="btn-luxe btn-whatsapp projectWhatsappRoute" href="#" target="_blank" rel="noopener">' + t.shareWhatsapp + '</a>' +
              '<a class="btn-luxe btn-glass map-global-link" href="carte.html#' + lang + '">' + t.globalMap + '</a>' +
            '</div>' +
          '</aside>' +
          '<div id="projectMap"></div>' +
        '</div>' +
      '</section>' +
      '<section class="section" style="padding-top:0">' +
        '<div class="section-kicker">' + t.relatedKicker + '</div>' +
        '<h2>' + t.relatedTitle + '</h2>' +
        '<div class="related-grid">' + renderRelated(project, lang) + '</div>' +
      '</section>';

    renderMap(project, lang);
    renderMajorPois(project, lang);
    setupProjectMedia(project, lang);
    setupRouteButtons(project, lang);
  }

  window.onLanguageChange = function(lang) {
    renderProject(lang);
  };

  document.addEventListener("DOMContentLoaded", function() {
    initPage("projects", "");
  });
})();
