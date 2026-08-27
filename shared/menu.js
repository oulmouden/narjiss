/* ============================================================
   LOGIQUE COMMUNE — Menu, langues, liste des projets
   ============================================================ */

// ===== TRADUCTIONS DU MENU =====
var MENU_UI = {
  fr: {
    home: "Accueil",
    projects: "Projets",
    units: "Disponibilités",
    map: "Carte",
    guides: "Guides",
    about: "À propos",
    contact: "Contact",
    demo: "Démo",
    infos: "Infos",
    brand_tag: "Immobiliere",
    footer_about: "À propos",
    footer_fiche: "Fiche de renseignement",
    footer_navigation: "Navigation",
    footer_legal: "Légal",
    footer_brand_text: "Spécialiste de l'immobilier au Maroc avec visites virtuelles 360° et cartes interactives multilingues.",
    footer_legal_mentions: "Mentions légales",
    footer_privacy: "Confidentialité",
    footer_terms: "Conditions",
    footer_copyright: "Tous droits réservés",
    footer_pro: "Espace professionnel",
    footer_qr: "Affichettes QR",
    footer_agent: "Espace commercial",
    footer_raccourci: "📲 Créer un raccourci",
    footer_raccourci_aide: "Sur iPhone et iPad : touchez « Partager » en bas de Safari, puis « Sur l'écran d'accueil ».",
    footer_raccourci_ok: "✓ Raccourci créé"
  },
  en: {
    home: "Home",
    projects: "Projects",
    units: "Availability",
    map: "Map",
    guides: "Guides",
    about: "About",
    contact: "Contact",
    demo: "Demo",
    infos: "Info",
    brand_tag: "Real Estate",
    footer_about: "About",
    footer_fiche: "Information form",
    footer_navigation: "Navigation",
    footer_legal: "Legal",
    footer_brand_text: "Real estate specialist in Morocco with 360° virtual tours and multilingual interactive maps.",
    footer_legal_mentions: "Legal notice",
    footer_privacy: "Privacy",
    footer_terms: "Terms",
    footer_copyright: "All rights reserved",
    footer_pro: "Professional area",
    footer_qr: "QR posters",
    footer_agent: "Sales area",
    footer_raccourci: "📲 Add a shortcut",
    footer_raccourci_aide: "On iPhone and iPad: tap “Share” at the bottom of Safari, then “Add to Home Screen”.",
    footer_raccourci_ok: "✓ Shortcut added"
  },
  ar: {
    home: "الرئيسية",
    projects: "المشاريع",
    units: "عروض",
    map: "الخريطة",
    guides: "أدلة",
    about: "من نحن",
    contact: "اتصل بنا",
    demo: "عرض توضيحي",
    infos: "معلومات",
    brand_tag: "للعقار",
    footer_about: "من نحن",
    footer_fiche: "بطاقة معلومات",
    footer_navigation: "التنقل",
    footer_legal: "قانوني",
    footer_brand_text: "متخصص في العقارات بالمغرب مع جولات افتراضية 360° وخرائط تفاعلية متعددة اللغات.",
    footer_legal_mentions: "إشعار قانوني",
    footer_privacy: "الخصوصية",
    footer_terms: "الشروط",
    footer_copyright: "جميع الحقوق محفوظة",
    footer_pro: "فضاء المهنيين",
    footer_qr: "ملصقات QR",
    footer_agent: "فضاء المستشارين",
    footer_raccourci: "📲 إضافة اختصار",
    footer_raccourci_aide: "على iPhone وiPad: اضغط «مشاركة» أسفل Safari، ثم «إضافة إلى الشاشة الرئيسية».",
    footer_raccourci_ok: "✓ تمت إضافة الاختصار"
  },
  es: {
    home: "Inicio",
    projects: "Proyectos",
    units: "Disponibilidad",
    map: "Mapa",
    guides: "Guías",
    about: "Acerca de",
    contact: "Contacto",
    demo: "Demo",
    infos: "Info",
    brand_tag: "Inmobiliaria",
    footer_about: "Acerca de",
    footer_fiche: "Ficha de información",
    footer_navigation: "Navegación",
    footer_legal: "Legal",
    footer_brand_text: "Especialista inmobiliario en Marruecos con visitas virtuales 360° y mapas interactivos multilingües.",
    footer_legal_mentions: "Aviso legal",
    footer_privacy: "Privacidad",
    footer_terms: "Términos",
    footer_copyright: "Todos los derechos reservados",
    footer_pro: "Espacio profesional",
    footer_qr: "Carteles QR",
    footer_agent: "Espacio comercial",
    footer_raccourci: "📲 Crear un acceso directo",
    footer_raccourci_aide: "En iPhone y iPad: toca «Compartir» abajo en Safari, y luego «Añadir a pantalla de inicio».",
    footer_raccourci_ok: "✓ Acceso directo creado"
  }
};

/* ============================================================================
   RACCOURCI VERS LE SITE (installation PWA)
   ----------------------------------------------------------------------------
   Le site a déjà tout ce qu'il faut — manifest.json complet, icônes 192 et 512,
   HTTPS — mais rien ne le PROPOSAIT. L'installation restait cachée derrière un
   menu du navigateur que personne n'ouvre.

   L'écoute est posée ICI, au chargement du script, et non dans la construction
   du pied de page : Chrome émet `beforeinstallprompt` très tôt, une seule fois.
   Un écouteur installé après coup ne verrait jamais rien passer, et le bouton
   resterait muet sans qu'on comprenne pourquoi.

   `preventDefault()` empêche l'infobar maison de Chrome : on garde la main pour
   déclencher l'invite au clic sur NOTRE bouton, au moment choisi par l'usager.
   ========================================================================== */

var njInstallEvent = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    njInstallEvent = e;
    njMajRaccourci();
  });
  // Installé depuis notre bouton OU depuis le menu du navigateur : dans les
  // deux cas le bouton n'a plus lieu d'être.
  window.addEventListener('appinstalled', function () {
    njInstallEvent = null;
    njMajRaccourci();
  });
}

/** iOS ne propose aucune API d'installation : on l'explique au lieu de l'offrir. */
function njEstIOS() {
  var ua = navigator.userAgent || '';
  // iPadOS 13+ se présente comme un Mac : le tactile le trahit.
  return /iPad|iPhone|iPod/.test(ua) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Déjà lancé depuis le raccourci : plus rien à installer. */
function njDejaInstalle() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true; // Safari iOS
  } catch (e) { return false; }
}

/**
 * Montre ou cache le bouton, selon ce que le navigateur sait faire.
 *
 * Trois cas seulement :
 *   - Chrome / Edge / Android ont donné l'événement → bouton qui installe ;
 *   - Safari iOS n'a pas d'API → bouton qui explique le geste ;
 *   - le reste (Firefox bureau, déjà installé) → pas de bouton du tout.
 * Mieux vaut aucun bouton qu'un bouton qui ne ferait rien.
 */
function njMajRaccourci() {
  var zone = document.getElementById('footerRaccourci');
  if (!zone) return;
  var utile = !njDejaInstalle() && (njInstallEvent || njEstIOS());
  zone.classList.toggle('hide-raccourci', !utile);
}

function njInstallerRaccourci(bouton, aide) {
  var t = MENU_UI[currentLang] || MENU_UI.fr;

  if (njInstallEvent) {
    njInstallEvent.prompt();
    njInstallEvent.userChoice.then(function (choix) {
      // Refus : l'événement est consommé, Chrome n'en redonnera pas avant un
      // moment. On retire le bouton plutôt que d'en laisser un sans effet.
      njInstallEvent = null;
      if (choix && choix.outcome === 'accepted') bouton.textContent = t.footer_raccourci_ok;
      njMajRaccourci();
    }, function () { njInstallEvent = null; njMajRaccourci(); });
    return;
  }

  // iOS : le geste appartient au navigateur, on ne peut que le décrire.
  aide.hidden = !aide.hidden;
  bouton.setAttribute('aria-expanded', aide.hidden ? 'false' : 'true');
}

// ===== TYPES DE BIENS (centralisés) =====
var PROJECT_TYPE_LABELS = {
  appartements: { fr: 'Appartements', en: 'Apartments', ar: 'شقق', es: 'Apartamentos' },
  maisons: { fr: 'Maisons', en: 'Houses', ar: 'منازل', es: 'Casas' },
  bureaux: { fr: 'Bureaux', en: 'Offices', ar: 'مكاتب', es: 'Oficinas' },
  commerces: { fr: 'Commerces', en: 'Retail', ar: 'محلات تجارية', es: 'Comercios' },
  terrains: { fr: 'Terrains', en: 'Land plots', ar: 'أراضي', es: 'Terrenos' }
};

function projectTypes() {
  var keys = Array.prototype.slice.call(arguments);
  var labels = { fr: [], en: [], ar: [], es: [] };
  for (var i = 0; i < keys.length; i++) {
    var type = PROJECT_TYPE_LABELS[keys[i]];
    if (!type) continue;
    labels.fr.push(type.fr);
    labels.en.push(type.en);
    labels.ar.push(type.ar);
    labels.es.push(type.es);
  }
  return labels;
}

// ===== LISTE DES PROJETS (fallback si data/projects.json n'est pas disponible) =====
var DEFAULT_PROJECTS = [
  {
    id: 'jawhara',
    folder: 'jawhara',
    name: { fr: 'Résidence Al Jawhara', en: 'Al Jawhara Residence', ar: 'إقامة الجوهرة', es: 'Residencia Al Jawhara' },
    location: { fr: 'Dcheira El Jihadia, Agadir', en: 'Dcheira El Jihadia, Agadir', ar: 'الدشيرة الجهادية، أكادير', es: 'Dcheira El Jihadia, Agadir' },
    types: projectTypes('appartements'),
    lat: 30.3732,
    lng: -9.5372,
    icon: '🏠',
	status: 'live',
    detail_url: 'jawhara/jawhara.html',
    images: {
    logo: 'images/projects/jawhara/jawhara_logo.jpg',
      triptych: 'images/projects/jawhara/concept-hero.jpg'
    },
    media: {
      status_label: { fr: 'En ligne', en: 'Live', ar: 'متاح', es: 'En línea' },
      tour360: 'jawhara/Tour/index.htm',
      cover360: 'images/projects/jawhara/concept-hero.jpg',
      floorPlans: ['images/projects/jawhara/floor-plan-demo.svg'],
      gallery: [
        'images/projects/jawhara/concept-hero.jpg',
        'images/projects/jawhara/concept-hero.jpg',
        'images/projects/jawhara/jawhara_logo.jpg',
        'images/projects/jawhara/concept-hero.jpg'
      ]
    },
    poi_count: 41,
    has_tour: true,
    stats: [
      { fr: '41 POI', en: '41 POIs', ar: '41 نقطة', es: '41 POI' },
      { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
      { fr: 'Visite 360°', en: '360° Tour', ar: 'جولة 360°', es: 'Visita 360°' }
    ]
  },
  {
  id: 'tazroute',
  folder: 'tazroute',
  name: { fr: 'Tazroute', en: 'Tazroute', ar: 'تازروت', es: 'Tazroute' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.358739340382268,
  lng: -9.460496051159458,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/tazroute/tazroute_logo.jpg',
    triptych: 'images/projects/tazroute/concept-triptych.jpg'
  },
  poi_count: 27,
  has_tour: false,
  stats: [
    { fr: '27 POI', en: '27 POIs', ar: '27 نقطة', es: '27 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'dar_ben_cheikh',
  folder: 'dar_ben_cheikh',
  name: { fr: 'Dar Ben Cheikh', en: 'Dar Ben Cheikh', ar: 'دار بن الشيخ', es: 'Dar Ben Cheikh' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.361823687819253,
  lng: -9.436652468018211,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/dar_ben_cheikh/dar_ben_cheikh_logo.jpg',
    triptych: 'images/projects/dar_ben_cheikh/concept-hero.jpg'
  },
  poi_count: 8,
  has_tour: false,
  stats: [
    { fr: '8 POI', en: '8 POIs', ar: '8 نقطة', es: '8 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'tazroute_yassamine',
  folder: 'tazroute_yassamine',
  name: { fr: 'Tazroute Al Yassamine', en: 'Tazroute Al Yassamine', ar: 'تازروت الياسمين', es: 'Tazroute Al Yassamine' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.3616466330063,
  lng: -9.455007371697246,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/tazroute_yassamine/tazroute_yassamine_logo.jpg',
    triptych: 'images/projects/tazroute_yassamine/concept-hero.jpg'
  },
  poi_count: 21,
  has_tour: false,
  stats: [
    { fr: '21 POI', en: '21 POIs', ar: '21 نقطة', es: '21 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'farah',
  folder: 'farah',
  name: { fr: 'Farah', en: 'Farah', ar: 'فرح', es: 'Farah' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.3993056,
  lng: -9.5658333,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/farah/farah_logo.jpg',
    triptych: 'images/projects/farah/concept-hero.jpg'
  },
  poi_count: 108,
  has_tour: false,
  stats: [
    { fr: '108 POI', en: '108 POIs', ar: '108 نقطة', es: '108 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'amical',
  folder: 'amical',
  name: { fr: 'Lot Amical I', en: 'Lot Amical I', ar: 'تجزئة أميكال', es: 'Lot Amical I' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.33269020682961,
  lng: -9.511278096688889,
  icon: '📍',
  status: 'live',
 images: {
    logo: 'images/projects/amical/amical_logo.jpg',
    triptych: 'images/projects/amical/concept-hero.jpg'
  },
  poi_count: 74,
  has_tour: false,
  stats: [
    { fr: '74 POI', en: '74 POIs', ar: '74 نقطة', es: '74 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'azrou',
  folder: 'azrou',
  name: { fr: 'Lot Azrou', en: 'Lot Azrou', ar: 'تجزئة أزرو', es: 'Lot Azrou' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.358741122541407,
  lng: -9.460487731940148,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/azrou/azrou_logo.jpg',
    triptych: 'images/projects/azrou/concept-hero.jpg'
  },
  poi_count: 27,
  has_tour: false,
  stats: [
    { fr: '27 POI', en: '27 POIs', ar: '27 نقطة', es: '27 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'bayt_mawada',
  folder: 'bayt_mawada',
  name: { fr: 'Bayt Al Mawada', en: 'Bayt Al Mawada', ar: 'بيت المودة', es: 'Bayt Al Mawada' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('appartements'),
  lat: 30.381708282802176,
  lng: -9.468861100000003,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/bayt_mawada/bayt_mawada_logo.jpg',
    triptych: 'images/projects/bayt_mawada/concept-hero.jpg'
  },
  poi_count: 24,
  has_tour: false,
  stats: [
    { fr: '24 POI', en: '24 POIs', ar: '24 نقطة', es: '24 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'founty',
  folder: 'founty',
  name: { fr: 'Lot Founty', en: 'Lot Founty', ar: 'تجزئة فونتي', es: 'Lot Founty' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.400406468380485,
  lng: -9.573180104254527,
  icon: '📍',
  status: 'live',
  images: {
    logo: 'images/projects/founty/founty_logo.jpg',
    triptych: 'images/projects/founty/concept-hero.jpg'
  },
  poi_count: 122,
  has_tour: false,
  stats: [
    { fr: '122 POI', en: '122 POIs', ar: '122 نقطة', es: '122 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'nahda2',
  folder: 'nahda2',
  name: { fr: 'Lot Nahda 2', en: 'Lot Nahda 2', ar: 'تجزئة النهضة 2', es: 'Lot Nahda 2' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('terrains'),
  lat: 30.303208344750637,
  lng: -9.463554523291856,
  icon: '📍',
  status: 'live',
 images: {
    logo: 'images/projects/nahda2/nahda2_logo.jpg',
    triptych: 'images/projects/nahda2/concept-hero.jpg'
  },
  poi_count: 45,
  has_tour: false,
  stats: [
    { fr: '45 POI', en: '45 POIs', ar: '45 نقطة', es: '45 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'andalusia',
  folder: 'andalusia',
  name: { fr: 'R+3 Andalusia', en: 'R+3 Andalusia', ar: 'أندلسيا', es: 'Andalusia' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('appartements'),
  lat: 30.37161637201584,
  lng: -9.523500675483383,
  icon: '🏠',
  status: 'live',
  detail_url: 'andaloussia/andaloussia.html',
  images: {
    logo: 'images/projects/andalusia/andalusia_logo.jpg',
    triptych: 'images/projects/andalusia/concept-hero.jpg'
  },
  poi_count: 106,
  has_tour: true,
  stats: [
    { fr: '106 POI', en: '106 POIs', ar: '106 نقطة', es: '106 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
},
{
  id: 'kb',
  folder: 'kb',
  name: { fr: 'R+4 K&B', en: 'R+4 K&B', ar: 'كي أند بي', es: 'K&B' },
  location: { fr: 'Agadir', en: 'Agadir', ar: 'أكادير', es: 'Agadir' },
  types: projectTypes('appartements'),
  lat: 30.371826407823608,
  lng: -9.549940706126623,
  icon: '🏢',
  status: 'live',
  images: {
    logo: 'images/projects/kb/kb_logo.jpg',
    triptych: 'images/projects/kb/concept-hero.jpg'
  },
  poi_count: 78,
  has_tour: false,
  stats: [
    { fr: '78 POI', en: '78 POIs', ar: '78 نقطة', es: '78 POI' },
    { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
    { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
  ]
}
  
];

var PROJECTS = DEFAULT_PROJECTS.slice();
var siteProjectsPromise = null;

function normalizeProject(project) {
  project = project || {};

  if (!project.folder) project.folder = project.id || '';

  if (!project.types && project.type) {
    project.types = projectTypes(project.type);
  }

  if (!project.types) {
    project.types = projectTypes('appartements');
  }

  if (!project.icon) {
    project.icon = project.type === 'appartements' ? '🏢' : '📍';
  }

  if (!project.images) {
    project.images = {};
  }

  if (!project.images.logo && project.id) {
    project.images.logo = 'images/projects/' + project.id + '/' + project.id + '_logo.png';
  }

  if (project.images.hero && !project.images.triptych) {
    project.images.triptych = project.images.hero;
  }

  if (project.tour_url && !project.media) {
    project.media = {};
  }

  if (project.tour_url && project.media && !project.media.tour360) {
    project.media.tour360 = project.tour_url;
  }

  if (project.images.floorplan && project.media && !project.media.floorPlans) {
    project.media.floorPlans = [project.images.floorplan];
  }

  if (!project.stats) {
    var poi = Number(project.poi_count || 0);
    project.stats = [
      { fr: poi + ' POI', en: poi + ' POIs', ar: poi + ' نقطة', es: poi + ' POI' },
      { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
      project.has_tour
        ? { fr: 'Visite 360°', en: '360° Tour', ar: 'جولة 360°', es: 'Visita 360°' }
        : { fr: 'Carte interactive', en: 'Interactive map', ar: 'خريطة تفاعلية', es: 'Mapa interactivo' }
    ];
  }

  return project;
}

function setSiteProjects(projects) {
  if (!Array.isArray(projects) || !projects.length) {
    PROJECTS = DEFAULT_PROJECTS.slice();
  } else {
    PROJECTS = projects.map(normalizeProject);
  }

  window.PROJECTS = PROJECTS;
  return PROJECTS;
}

function loadSiteProjects(basePath) {
  basePath = basePath || '';

  if (!siteProjectsPromise) {
    siteProjectsPromise = fetch(basePath + 'data/projects.json', { cache: 'no-store' })
      .then(function(response) {
        if (!response.ok) throw new Error('projects.json not found');
        return response.json();
      })
      .then(function(projects) {
        return setSiteProjects(projects);
      })
      .catch(function() {
        return setSiteProjects(DEFAULT_PROJECTS);
      });
  }

  return siteProjectsPromise;
}

setSiteProjects(DEFAULT_PROJECTS);

// ===== ÉTAT GLOBAL =====
var currentLang = 'fr';
var SITE_CONTACTS_DEFAULT = {
  phones: [
    { label: "Standard", number: "+212 6 00 00 00 00", whatsapp: true }
  ],
  email: "contact@narjiss.company",
  address: {
    fr: "Agadir, Maroc",
    en: "Agadir, Morocco",
    ar: "أكادير، المغرب",
    es: "Agadir, Marruecos"
  },
  socials: []
};
var siteContacts = SITE_CONTACTS_DEFAULT;
var siteContactsPromise = null;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, function(ch) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
  });
}

function contactPhoneHref(number) {
  return "tel:" + String(number || "").replace(/[^\d+]/g, "");
}

function contactWhatsappHref(number) {
  return "https://wa.me/" + String(number || "").replace(/\D/g, "");
}

function contactWhatsappCallHref(number) {
  return "https://wa.me/" + String(number || "").replace(/\D/g, "") + "?text=" + encodeURIComponent("Bonjour, je souhaite vous appeler via WhatsApp.");
}

function contactWhatsappMessageText(lang, values) {
  values = values || {};
  var contacts = window.siteContacts || siteContacts || SITE_CONTACTS_DEFAULT;
  var templates = contacts.whatsappMessages || {};
  var template = templates[lang] || templates.fr || "Bonjour,\nJe suis : {name}\nTéléphone : {phone}\nJe souhaite me renseigner sur : {subject}";
  var subject = values.subject || values.project || values.message || "";
  return template
    .replace(/\{name\}/g, values.name || "...")
    .replace(/\{phone\}/g, values.phone || "...")
    .replace(/\{subject\}/g, subject || "...");
}

function contactWhatsappMessageHref(number, lang, values) {
  return "https://wa.me/" + String(number || "").replace(/\D/g, "") + "?text=" + encodeURIComponent(contactWhatsappMessageText(lang || currentLang, values));
}

function whatsappIconSvg() {
  return '<svg class="whatsapp-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.6A12.1 12.1 0 0 0 5.6 21.9L4 28l6.3-1.6A12.1 12.1 0 1 0 16 3.6zm0 21.9c-2 0-3.8-.6-5.4-1.6l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 16 25.5zm5.4-7.3c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.3-.3-.4-.6-.5z"/></svg>';
}

/**
 * Logos de marque des réseaux sociaux, partagés par le pied de page et les
 * pages qui affichent leurs propres liens (fiche contact notamment).
 *
 * Un réseau absent d'ici retombe sur la pastille portant son initiale : on
 * peut donc ajouter une entrée dans contacts.json sans toucher à ce fichier,
 * le lien reste utilisable en attendant son logo.
 */
var SOCIAL_LOGOS = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
};

/** Logo d'un réseau, ou chaîne vide si nous ne l'avons pas. */
function socialIconSvg(platform) {
  return SOCIAL_LOGOS[String(platform || "").toLowerCase()] || "";
}
window.socialIconSvg = socialIconSvg;

function loadSiteContacts(basePath) {
  basePath = basePath || "";
  if (!siteContactsPromise) {
    siteContactsPromise = fetch(basePath + "data/contacts.json")
      .then(function(response) {
        if (!response.ok) throw new Error("contacts.json not found");
        return response.json();
      })
      .then(function(data) {
        siteContacts = data || SITE_CONTACTS_DEFAULT;
        window.siteContacts = siteContacts;
        return siteContacts;
      })
      .catch(function() {
        siteContacts = SITE_CONTACTS_DEFAULT;
        window.siteContacts = siteContacts;
        return siteContacts;
      });
  }
  return siteContactsPromise;
}

function renderSocialLinks(contacts) {
  var socials = contacts && contacts.socials ? contacts.socials : [];
  var html = "";
  for (var i = 0; i < socials.length; i++) {
    var item = socials[i];
    if (!item.enabled || !item.url) continue;
    var nom = item.label || item.platform;
    var logo = socialIconSvg(item.platform);
    // Logo de marque quand nous l'avons, pastille à initiale sinon.
    var vignette = logo
      ? '<span class="footer-social-logo" data-reseau="' + escapeHtml(item.platform) + '">' + logo + '</span>'
      : '<span class="footer-social-dot">' + escapeHtml((nom || "?").charAt(0).toUpperCase()) + '</span>';
    html += '<a class="footer-social-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + vignette + escapeHtml(nom) + '</a>';
  }
  return html;
}

function updateFooterContacts(contacts, lang) {
  var phoneBox = document.getElementById("footerContactLinks");
  var socialBox = document.getElementById("footerSocialLinks");
  if (phoneBox) {
    var phones = contacts && contacts.phones ? contacts.phones : [];
    var phoneHtml = "";
    if (contacts && contacts.email) {
      phoneHtml += '<div class="footer-contact-row footer-contact-row-full"><a href="mailto:' + escapeHtml(contacts.email) + '">' + escapeHtml(contacts.email) + '</a></div>';
    }
    for (var i = 0; i < phones.length; i++) {
      phoneHtml += '<div class="footer-contact-row footer-phone-row">';
        phoneHtml += '<a class="phone-number" href="' + contactPhoneHref(phones[i].number) + '">' + escapeHtml(phones[i].number) + '</a>';
        if (phones[i].whatsapp) {
          phoneHtml += '<a class="footer-whatsapp-action footer-whatsapp-call" href="' + contactWhatsappCallHref(phones[i].number) + '" target="_blank" rel="noopener" title="Appeler par WhatsApp" aria-label="Appeler par WhatsApp">' + whatsappIconSvg() + '</a>';
          phoneHtml += '<a class="footer-whatsapp-action footer-whatsapp-write" href="' + contactWhatsappMessageHref(phones[i].number, lang) + '" target="_blank" rel="noopener" title="Ecrire par WhatsApp" aria-label="Ecrire par WhatsApp">✎</a>';
        }
      phoneHtml += '</div>';
    }
    var address = contacts && contacts.address ? menuText(contacts.address, lang) : "";
    if (address) phoneHtml += '<div class="footer-contact-row footer-contact-row-full"><span>' + escapeHtml(address) + '</span></div>';
    phoneBox.innerHTML = phoneHtml;
  }
  if (socialBox) {
    socialBox.innerHTML = renderSocialLinks(contacts);
  }
}

function menuText(value, lang) {
  if (!value) return '';
  return value[lang] || value.fr || value.en || '';
}

function getCurrentProjectForMenu() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  if (!id || !Array.isArray(PROJECTS)) return null;
  for (var i = 0; i < PROJECTS.length; i++) {
    if (PROJECTS[i].id === id || PROJECTS[i].folder === id) {
      return PROJECTS[i];
    }
  }
  return null;
}

function getProjectMenuLabel() {
  if (!/project\.html$/i.test(window.location.pathname)) return '';
  var project = getCurrentProjectForMenu();
  return project ? menuText(project.name, currentLang) : '';
}

// ===== THÈME CLAIR / NOCTURNE =====
// L'application initiale du thème (avant le rendu) se fait via un petit script
// inline dans le <head> de chaque page — voir le snippet « nj-theme ». Ici, on
// ne gère que l'état du bouton et la bascule manuelle mémorisée.
var NJ_THEME_KEY = 'nj-theme';

function njStoredTheme() {
  try { var t = localStorage.getItem(NJ_THEME_KEY); return (t === 'dark' || t === 'light') ? t : null; }
  catch (e) { return null; }
}
function njEffectiveTheme() {
  // Le clair est le défaut, même si le système du visiteur est en sombre :
  // le CSS ne suit plus prefers-color-scheme, et les deux doivent s'accorder.
  // Sans cela, le bouton croit être en nocturne et le premier clic ne fait rien.
  return njStoredTheme() || 'light';
}
function njUpdateThemeButton() {
  var boutons = document.querySelectorAll('.theme-toggle');
  if (!boutons.length) return;
  var dark = njEffectiveTheme() === 'dark';
  var label = dark ? 'Passer en mode clair' : 'Passer en mode nocturne';
  for (var i = 0; i < boutons.length; i++) {
    boutons[i].textContent = dark ? '☀️' : '🌙';
    boutons[i].setAttribute('aria-label', label);
    boutons[i].title = label;
  }
}
function njToggleTheme() {
  var next = njEffectiveTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(NJ_THEME_KEY, next); } catch (e) {}
  document.documentElement.setAttribute('data-theme', next);
  njUpdateThemeButton();
}
// Plus d'écoute de prefers-color-scheme : le thème ne dépend que du choix
// explicite du visiteur, le clair servant de défaut.

// ===== MENU HTML BUILDER =====
function buildMenuHTML(activePage, basePath) {
  basePath = basePath || '';
  var t = MENU_UI[currentLang];
  var projectLabel = getProjectMenuLabel();
  var langHash = '#' + currentLang;
  var brandName = currentLang === 'ar' ? 'نرجس' : 'NARJISS';
  return '' +
    '<nav class="main-nav">' +
      '<div class="nav-container">' +
        '<a href="' + basePath + 'index.html" class="nav-brand">' +
          '<div class="logo logo-image"><img src="' + basePath + 'images/logo-narjiss.jpg" alt="NARJISS"></div>' +
          '<div>' +
            '<div class="brand-name brand-narjiss">' + brandName + '</div>' +
            '<div class="brand-tag">' + t.brand_tag + '</div>' +
          '</div>' +
        '</a>' +
        (projectLabel ? '<div class="nav-project-label">' + projectLabel + '</div>' : '') +
        /* Jeu de boutons de langue propre au téléphone : sur petit écran, ceux
           du menu déroulant sont derrière le ☰, alors qu'il reste de la place
           dans la barre. Un second jeu plutôt qu'un déplacement : déplacer
           l'unique jeu aurait modifié la barre du grand écran. */
        '<div class="nav-langs nav-langs-mobile">' +
          '<button class="lang-btn' + (currentLang === 'fr' ? ' active' : '') + '" data-lang="fr">FR</button>' +
          '<button class="lang-btn' + (currentLang === 'ar' ? ' active' : '') + '" data-lang="ar">عربي</button>' +
          '<button class="lang-btn' + (currentLang === 'en' ? ' active' : '') + '" data-lang="en">EN</button>' +
          '<button class="lang-btn' + (currentLang === 'es' ? ' active' : '') + '" data-lang="es">ES</button>' +
          '<button class="theme-toggle" id="themeToggleMobile" type="button" ' +
            'aria-label="Basculer le thème clair / nocturne" title="Thème clair / nocturne">🌙</button>' +
        '</div>' +
        '<button class="nav-toggle" id="navToggle">☰</button>' +
        '<ul class="nav-links" id="navLinks">' +
          '<li><a href="' + basePath + 'index.html' + langHash + '"' + (activePage === 'home' ? ' class="active"' : '') + '>🏠 ' + t.home + '</a></li>' +
          '<li><a href="' + basePath + 'explorer.html' + langHash + '"' + (activePage === 'projects' ? ' class="active"' : '') + '><span class="nav-project-icon" aria-hidden="true"><span class="nav-project-explorer"></span><span class="nav-project-pin"></span></span>' + t.projects + '</a></li>' +
          '<li><a href="' + basePath + 'disponibilites.html' + langHash + '"' + (activePage === 'units' ? ' class="active"' : '') + '>🔑 ' + t.units + '</a></li>' +
          '<li><a href="' + basePath + 'guides.html' + langHash + '"' + (activePage === 'guides' ? ' class="active"' : '') + '>📖 ' + t.guides + '</a></li>' +
          '<li><a href="' + basePath + 'demo.html' + langHash + '"' + (activePage === 'demo' ? ' class="active"' : '') + '>▶️ ' + t.demo + '</a></li>' +
          /* « À propos » et « Contact » réunis sous un seul point d'entrée :
             ajouter « Démo » à six entrées de premier niveau aurait fait
             passer la barre sur deux lignes. Un <details> plutôt qu'un menu
             maison — il s'ouvre au clavier et se referme tout seul, sans une
             ligne de JavaScript. */
          '<li class="nav-groupe">' +
            '<details class="nav-details">' +
              '<summary' + (activePage === 'about' || activePage === 'contact' ? ' class="active"' : '') + '>ℹ️ ' + t.infos + '</summary>' +
              '<ul class="nav-sous-menu">' +
                '<li><a href="' + basePath + 'apropos.html' + langHash + '"' + (activePage === 'about' ? ' class="active"' : '') + '>' + t.about + '</a></li>' +
                '<li><a href="' + basePath + 'contact.html' + langHash + '"' + (activePage === 'contact' ? ' class="active"' : '') + '>' + t.contact + '</a></li>' +
              '</ul>' +
            '</details>' +
          '</li>' +
          '<div class="nav-langs">' +
            '<button class="lang-btn' + (currentLang === 'fr' ? ' active' : '') + '" data-lang="fr">FR</button>' +
            '<button class="lang-btn' + (currentLang === 'en' ? ' active' : '') + '" data-lang="en">EN</button>' +
            '<button class="lang-btn' + (currentLang === 'ar' ? ' active' : '') + '" data-lang="ar">عربي</button>' +
            '<button class="lang-btn' + (currentLang === 'es' ? ' active' : '') + '" data-lang="es">ES</button>' +
            '<button class="theme-toggle" id="themeToggle" type="button" aria-label="Basculer le thème clair / nocturne" title="Thème clair / nocturne">🌙</button>' +
          '</div>' +
        '</ul>' +
      '</div>' +
    '</nav>';
}

// ===== FOOTER HTML BUILDER =====
function buildFooterHTML(basePath) {
  basePath = basePath || '';
  var t = MENU_UI[currentLang];
  var year = new Date().getFullYear();
  var legalHash = '#' + currentLang;
  var langHash = '#' + currentLang;
  // Acces au back-office : volontairement discret, en pied de page et sans
  // bouton en evidence. Le libelle parle de « l'espace professionnel » plutot
  // que d'« admin », qui designe une cible. rel="nofollow" et la balise
  // noindex de la page de connexion le tiennent hors des moteurs.
  var adminLink = '<a class="footer-admin-link" href="' + basePath +
    'admin/login.php" rel="nofollow noopener">' + t.footer_pro + '</a>';
  // Affichettes QR à imprimer pour le bureau de vente. Page libre d'accès (elle
  // ne montre que des données publiques) mais tenue hors des moteurs : le
  // commercial l'ouvre et l'imprime sans session d'administration.
  var qrLink = '<a class="footer-admin-link" href="' + basePath +
    'qr.php" rel="nofollow noopener">' + t.footer_qr + '</a>';
  /* Espace des commerciaux. Leurs comptes sont crees par le super-admin, mais
     la page ne figurait nulle part : ils devaient connaitre l'URL par coeur,
     et « Espace professionnel » ci-dessus mene a la connexion admin, qui ne
     reconnait qu'un seul compte — la leur y etait refusee sans explication. */
  var agentLink = '<a class="footer-admin-link" href="' + basePath +
    'espace-agent.html" rel="nofollow noopener">' + t.footer_agent + '</a>';
  var legalNoticeUrl = basePath + 'mentions-legales.html' + legalHash;
  var privacyUrl = basePath + 'confidentialite.html' + legalHash;
  var termsUrl = basePath + 'conditions.html' + legalHash;
  return '' +
    '<footer class="main-footer">' +
      '<div class="footer-inner">' +
        '<div class="footer-grid">' +
          '<div class="footer-col footer-col-brand">' +
          '<div class="footer-brand">NARJISS</div>' +
          '<p>' + t.footer_brand_text + '</p>' +
          '<div class="footer-contact-links" id="footerContactLinks"></div>' +
          /* Raccourci vers le site. Masqué par défaut : njMajRaccourci() ne le
             révèle que si le navigateur sait vraiment faire quelque chose. */
          '<div class="footer-raccourci hide-raccourci" id="footerRaccourci">' +
            '<button type="button" class="footer-raccourci-btn" id="footerRaccourciBtn" ' +
              'aria-expanded="false">' + t.footer_raccourci + '</button>' +
            '<p class="footer-raccourci-aide" id="footerRaccourciAide" hidden>' +
              t.footer_raccourci_aide + '</p>' +
          '</div>' +
          '</div>' +
          '<div class="footer-col">' +
          '<h4>' + t.footer_navigation + '</h4>' +
          '<ul>' +
            '<li><a href="' + basePath + 'index.html' + langHash + '">' + t.home + '</a></li>' +
            '<li><a href="' + basePath + 'explorer.html' + langHash + '">' + t.projects + '</a></li>' +
            '<li><a href="' + basePath + 'guides.html' + langHash + '">' + t.guides + '</a></li>' +
            '<li><a href="' + basePath + 'carte.html' + langHash + '">' + t.map + '</a></li>' +
          '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
          '<h4>' + t.footer_about + '</h4>' +
          '<ul>' +
            '<li><a href="' + basePath + 'apropos.html' + langHash + '">' + t.about + '</a></li>' +
            '<li><a href="' + basePath + 'contact.html' + langHash + '">' + t.contact + '</a></li>' +
            // La fiche n'était atteignable que depuis la page Contact : sur mobile,
            // c'est elle qui remplit le nom et le numéro en photographiant la CIN.
            '<li><a href="' + basePath + 'fiche.html' + langHash + '">' + t.footer_fiche + '</a></li>' +
          '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
          '<h4>' + t.footer_legal + '</h4>' +
          '<ul>' +
            '<li><a href="' + legalNoticeUrl + '">' + t.footer_legal_mentions + '</a></li>' +
            '<li><a href="' + privacyUrl + '">' + t.footer_privacy + '</a></li>' +
            '<li><a href="' + termsUrl + '">' + t.footer_terms + '</a></li>' +
          '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-social-links" id="footerSocialLinks"></div>' +
        '<div class="footer-bottom">' +
          '<div>© ' + year + ' NARJISS</div>' +
          '<div><a href="' + legalNoticeUrl + '">' + t.footer_legal_mentions + '</a> | <a href="' + privacyUrl + '">' + t.footer_privacy + '</a> | <a href="' + termsUrl + '">' + t.footer_terms + '</a></div>' +
          '<div>' + t.footer_copyright + ' · ' + adminLink + ' · ' + agentLink +
            ' · ' + qrLink + '</div>' +
        '</div>' +
      '</div>' +
    '</footer>';
}


/* ============================================================================
   LANCEUR « ON EN PARLE ? »
   ----------------------------------------------------------------------------
   Une pastille fixe sur toutes les pages publiques, qui ouvre les quatre façons
   de nous joindre : écrire, appeler un conseiller, parler à l'hôtesse IA,
   entrer dans le bureau de vente.

   POURQUOI FLOTTANT, ET NON UN BOUTON EN PIED DE PAGE
   Un bouton en bas de page n'est vu que des visiteurs qui vont jusqu'en bas.
   La pastille suit le visiteur, et la bulle d'amorce va le chercher.

   POURQUOI LA PRÉSENCE DÉCIDE DE L'OPTION MISE EN AVANT
   Proposer « Parler à un conseiller » à 22 h un dimanche fabrique une
   déception. Quand personne ne décroche, c'est l'hôtesse IA — disponible en
   permanence — qui passe en avant, et « écrire » qui prend le relais du
   téléphone. Le compte vient de api/agent-presence.php?dispo, agrégat anonyme.
   ========================================================================== */
var NJ_PARLONS_UI = {
  fr: {
    btn: "On en parle ?",
    teaser: "Un projet en tête ? Dites-nous lequel, on vous répond.",
    title: "On en parle ?",
    subOn: "Un conseiller est joignable",
    subOff: "Personne au bureau à cette heure",
    close: "Fermer",
    writeT: "Écrire maintenant",
    writeD: "Laissez votre message, on vous rappelle",
    callT: "Parler à un conseiller",
    callD: "Par téléphone ou WhatsApp",
    aiT: "Parler à l'hôtesse IA",
    aiD: "À la voix, à toute heure, sans attendre",
    officeT: "Entrer dans le bureau de vente",
    officeD: "Visitez le bureau et nos projets en 360°",
    privacy: "Vos échanges restent confidentiels.",
    back: "← Retour",
    callIntro: "Appelez, ou écrivez-nous sur WhatsApp :",
    callPhone: "Appeler",
    callWa: "WhatsApp",
    fName: "Votre nom",
    fTel: "Téléphone",
    fMail: "E-mail",
    fMsg: "Votre message",
    send: "Envoyer",
    sending: "Envoi en cours…",
    thanks: "Merci ! Nous vous répondons au plus vite.",
    errContact: "Laissez au moins un téléphone ou un e-mail.",
    errEmpty: "Écrivez-nous quelques mots."
  },
  en: {
    btn: "Let's talk",
    teaser: "Got a project in mind? Tell us which one, we'll get back to you.",
    title: "Let's talk",
    subOn: "An advisor is available",
    subOff: "Nobody at the office right now",
    close: "Close",
    writeT: "Write to us now",
    writeD: "Leave your message, we'll call you back",
    callT: "Talk to an advisor",
    callD: "By phone or WhatsApp",
    aiT: "Talk to the AI host",
    aiD: "By voice, any time, no waiting",
    officeT: "Enter the sales office",
    officeD: "Tour the office and our projects in 360°",
    privacy: "Your messages stay confidential.",
    back: "← Back",
    callIntro: "Call us, or write on WhatsApp:",
    callPhone: "Call",
    callWa: "WhatsApp",
    fName: "Your name",
    fTel: "Phone",
    fMail: "E-mail",
    fMsg: "Your message",
    send: "Send",
    sending: "Sending…",
    thanks: "Thank you! We'll get back to you shortly.",
    errContact: "Leave at least a phone number or an e-mail.",
    errEmpty: "Write us a few words."
  },
  ar: {
    btn: "لنتحدث",
    teaser: "لديك مشروع في بالك؟ أخبرنا به، ونحن نجيبك.",
    title: "لنتحدث",
    subOn: "مستشار متاح الآن",
    subOff: "لا أحد في المكتب في هذه الساعة",
    close: "إغلاق",
    writeT: "اكتب إلينا الآن",
    writeD: "اترك رسالتك، وسنعاود الاتصال بك",
    callT: "التحدث إلى مستشار",
    callD: "عبر الهاتف أو واتساب",
    aiT: "التحدث إلى المضيفة الذكية",
    aiD: "بالصوت، في أي وقت، دون انتظار",
    officeT: "ادخل مكتب البيع",
    officeD: "زر المكتب ومشاريعنا بتقنية 360°",
    privacy: "تبقى محادثاتك سرية.",
    back: "← رجوع",
    callIntro: "اتصل بنا، أو راسلنا على واتساب:",
    callPhone: "اتصال",
    callWa: "واتساب",
    fName: "اسمك",
    fTel: "الهاتف",
    fMail: "البريد الإلكتروني",
    fMsg: "رسالتك",
    send: "إرسال",
    sending: "جارٍ الإرسال…",
    thanks: "شكرا لك! سنجيبك في أقرب وقت.",
    errContact: "اترك على الأقل رقم هاتف أو بريدا إلكترونيا.",
    errEmpty: "اكتب لنا بضع كلمات."
  },
  es: {
    btn: "¿Hablamos?",
    teaser: "¿Tiene un proyecto en mente? Díganos cuál y le respondemos.",
    title: "¿Hablamos?",
    subOn: "Un asesor está disponible",
    subOff: "No hay nadie en la oficina a esta hora",
    close: "Cerrar",
    writeT: "Escríbanos ahora",
    writeD: "Deje su mensaje y le llamamos",
    callT: "Hablar con un asesor",
    callD: "Por teléfono o WhatsApp",
    aiT: "Hablar con la anfitriona IA",
    aiD: "Por voz, a cualquier hora, sin esperas",
    officeT: "Entrar en la oficina de ventas",
    officeD: "Visite la oficina y nuestros proyectos en 360°",
    privacy: "Sus mensajes son confidenciales.",
    back: "← Volver",
    callIntro: "Llámenos o escríbanos por WhatsApp:",
    callPhone: "Llamar",
    callWa: "WhatsApp",
    fName: "Su nombre",
    fTel: "Teléfono",
    fMail: "Correo electrónico",
    fMsg: "Su mensaje",
    send: "Enviar",
    sending: "Enviando…",
    thanks: "¡Gracias! Le responderemos lo antes posible.",
    errContact: "Deje al menos un teléfono o un correo electrónico.",
    errEmpty: "Escríbanos unas palabras."
  }
};

/* Clé de session : une amorce refusée ne doit pas revenir à chaque page. */
var NJ_PARLONS_TEASER_KEY = 'nj-parlons-teaser-vu';
var njParlonsOnline = false;

/**
 * Le lanceur a-t-il sa place sur cette page ?
 *
 * Non sur bureaudevente.html : #stageAgentBtn y est déjà une pastille flottante
 * au même coin, et l'hôtesse y est de toute façon à portée de clic.
 * Non pendant une visite guidée : le conseiller est DÉJÀ en ligne avec le
 * visiteur, lui proposer de nous joindre n'aurait aucun sens.
 */
function njParlonsAutorise() {
  if (document.getElementById('stageAgentBtn')) return false;
  try {
    var p = new URLSearchParams(window.location.search);
    if (p.get('lghost') != null || p.get('lg')) return false;
    var r = window.sessionStorage.getItem('lg_role');
    if (r === 'host' || r === 'viewer') return false;
  } catch (e) { /* sessionStorage refusé (navigation privée) : on installe. */ }
  return true;
}

function njParlonsT() {
  return NJ_PARLONS_UI[currentLang] || NJ_PARLONS_UI.fr;
}

/** Élément avec classe et contenu, pour alléger la construction ci-dessous. */
function njParlonsEl(tag, cls, html) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

/**
 * Rend la liste des options. Rappelée après la sonde de présence, d'où la
 * reconstruction complète plutôt qu'une simple bascule de classe.
 */
function njParlonsRendreOptions(host, basePath) {
  var t = njParlonsT();
  host.innerHTML = '';
  host.className = 'nj-parlons-options';
  /* Quelle vue est à l'écran. Le marqueur est indispensable : les sous-vues
     réutilisent la classe .nj-parlons-options pour leur mise en forme, si bien
     que la sonde de présence, en revenant, croyait retrouver le menu et
     effaçait sous les doigts du visiteur la liste des numéros ou son
     formulaire à demi rempli. */
  host.dataset.vue = 'menu';

  /* L'ordre ne change pas — un menu qui se réordonne sous les yeux du visiteur
     est déroutant. Seule la mise en avant bouge. */
  var options = [
    { ico: '💬', t: t.writeT, d: t.writeD, act: 'write',  prim: !njParlonsOnline },
    { ico: '📞', t: t.callT,  d: t.callD,  act: 'call',   prim: njParlonsOnline },
    { ico: '🎙️', t: t.aiT,    d: t.aiD,    act: 'ai',     prim: false },
    { ico: '🏢', t: t.officeT, d: t.officeD, act: 'office', prim: false }
  ];

  options.forEach(function (o) {
    var b = njParlonsEl('button', 'nj-parlons-opt' + (o.prim ? ' primary' : ''));
    b.type = 'button';
    b.innerHTML =
      '<span class="nj-parlons-opt-ico" aria-hidden="true">' + o.ico + '</span>' +
      '<span><b>' + escapeHtml(o.t) + '</b><small>' + escapeHtml(o.d) + '</small></span>';
    b.addEventListener('click', function () { njParlonsAction(o.act, basePath); });
    host.appendChild(b);
  });
}

/** Aiguillage des quatre options. */
function njParlonsAction(action, basePath) {
  var corps = document.getElementById('njParlonsCorps');
  if (action === 'write')  { njParlonsFormulaire(corps, basePath); return; }
  if (action === 'call')   { njParlonsTelephones(corps, basePath); return; }
  /* L'hôtesse et le bureau de vente vivent tous deux sur bureaudevente.html ;
     ?hotesse=1 y ouvre le panneau d'accueil sans un clic de plus. */
  if (action === 'ai')     { window.location.href = basePath + 'bureaudevente.html?hotesse=1'; return; }
  if (action === 'office') { window.location.href = basePath + 'bureaudevente.html'; }
}

/** Bouton « retour » commun aux deux sous-vues. */
function njParlonsRetour(corps, basePath) {
  var b = njParlonsEl('button', 'nj-parlons-opt');
  b.type = 'button';
  b.innerHTML = '<span><b>' + escapeHtml(njParlonsT().back) + '</b></span>';
  b.addEventListener('click', function () { njParlonsRendreOptions(corps, basePath); });
  return b;
}

/**
 * Sous-vue « appeler » : les numéros réels du site, avec appel direct et
 * WhatsApp. Réutilise les fabricants de liens du pied de page plutôt que d'en
 * refaire — un seul endroit décide de la forme d'un numéro.
 */
function njParlonsTelephones(corps, basePath) {
  var t = njParlonsT();
  corps.innerHTML = '';
  corps.className = 'nj-parlons-options';
  corps.dataset.vue = 'appeler';
  corps.appendChild(njParlonsEl('p', 'nj-parlons-foot', escapeHtml(t.callIntro)));

  var phones = (siteContacts && siteContacts.phones) || [];
  phones.forEach(function (p) {
    var ligne = njParlonsEl('div', 'nj-parlons-opt');
    ligne.innerHTML =
      '<span class="nj-parlons-opt-ico" aria-hidden="true">📞</span>' +
      '<span style="flex:1"><b>' + escapeHtml(p.number) + '</b>' +
      '<small>' + escapeHtml(p.label || '') + '</small></span>';

    var appel = document.createElement('a');
    appel.href = contactPhoneHref(p.number);
    appel.textContent = t.callPhone;
    appel.style.cssText = 'font-weight:600;text-decoration:underline;color:inherit;';
    ligne.appendChild(appel);

    if (p.whatsapp) {
      var wa = document.createElement('a');
      wa.href = contactWhatsappMessageHref(p.number, currentLang);
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.textContent = t.callWa;
      wa.style.cssText = 'font-weight:600;text-decoration:underline;color:inherit;margin-inline-start:.6rem;';
      ligne.appendChild(wa);
    }
    corps.appendChild(ligne);
  });

  corps.appendChild(njParlonsRetour(corps, basePath));
}

/**
 * Sous-vue « écrire » : dépose sur api/message-depot.php, le même point que
 * l'hôtesse du bureau de vente. Les commerciaux traitent donc les messages du
 * lanceur depuis leur espace habituel, sans nouvelle boîte à surveiller.
 */
function njParlonsFormulaire(corps, basePath) {
  var t = njParlonsT();
  corps.innerHTML = '';
  corps.className = 'nj-parlons-form';
  corps.dataset.vue = 'ecrire';

  function champ(tag, type, ph, maxLen) {
    var el = document.createElement(tag);
    if (tag === 'input') el.type = type;
    el.placeholder = ph;
    if (maxLen) el.maxLength = maxLen;
    return el;
  }
  var fNom  = champ('input', 'text',  t.fName, 120);
  var fTel  = champ('input', 'tel',   t.fTel,  40);
  var fMail = champ('input', 'email', t.fMail, 160);
  var fMsg  = champ('textarea', '',   t.fMsg,  4000);
  [fNom, fTel, fMail, fMsg].forEach(function (el) { corps.appendChild(el); });

  var err = njParlonsEl('p', 'nj-parlons-err');
  err.hidden = true;
  corps.appendChild(err);
  function echec(msg) { err.textContent = msg; err.hidden = false; }

  var envoyer = njParlonsEl('button', 'nj-parlons-opt primary');
  envoyer.type = 'button';
  envoyer.innerHTML = '<span style="flex:1;text-align:center"><b>' + escapeHtml(t.send) + '</b></span>';
  envoyer.addEventListener('click', function () {
    var tel = fTel.value.trim(), mail = fMail.value.trim(), texte = fMsg.value.trim();
    /* Un message sans moyen de rappel est un message perdu : le commercial le
       lirait sans pouvoir y répondre. */
    if (!tel && !mail) { echec(t.errContact); fTel.focus(); return; }
    if (!texte) { echec(t.errEmpty); fMsg.focus(); return; }
    err.hidden = true;
    envoyer.disabled = true;
    envoyer.innerHTML = '<span style="flex:1;text-align:center"><b>' + escapeHtml(t.sending) + '</b></span>';

    var projet = getCurrentProjectForMenu();
    var fd = new FormData();
    fd.append('projet', projet ? projet.id : '');
    fd.append('nom', fNom.value.trim());
    fd.append('telephone', tel);
    fd.append('email', mail);
    fd.append('message', texte);
    fd.append('langue', currentLang);

    fetch(basePath + 'api/message-depot.php', { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'ko');
        corps.className = 'nj-parlons-options';
        corps.dataset.vue = 'merci';
        corps.innerHTML = '<p class="nj-parlons-foot">' + escapeHtml(t.thanks) + '</p>';
        corps.appendChild(njParlonsRetour(corps, basePath));
      })
      .catch(function () {
        envoyer.disabled = false;
        envoyer.innerHTML = '<span style="flex:1;text-align:center"><b>' + escapeHtml(t.send) + '</b></span>';
        echec(t.errEmpty);
      });
  });
  corps.appendChild(envoyer);
  corps.appendChild(njParlonsRetour(corps, basePath));
  fNom.focus();
}

/**
 * Sonde la présence et met à jour la pastille, le sous-titre et l'option mise
 * en avant. Appelée à l'installation puis à chaque ouverture : le battement
 * expire en 20 s (NJ_PRESENCE_TTL), une valeur gardée plus longtemps mentirait.
 */
function njParlonsSonderPresence(basePath, racine) {
  return fetch(basePath + 'api/agent-presence.php?dispo=1')
    .then(function (r) { return r.json(); })
    .then(function (d) { njParlonsOnline = !!(d && d.ok && d.online); })
    .catch(function () { njParlonsOnline = false; })
    .then(function () {
      var t = njParlonsT();
      racine.classList.toggle('on', njParlonsOnline);
      var sous = racine.querySelector('.nj-parlons-sous');
      if (sous) sous.textContent = njParlonsOnline ? t.subOn : t.subOff;
      var corps = document.getElementById('njParlonsCorps');
      /* On ne réécrit le corps que s'il montre encore le menu : le visiteur
         peut être en train de remplir le formulaire. */
      if (corps && corps.dataset.vue === 'menu') {
        njParlonsRendreOptions(corps, basePath);
      }
    });
}

/**
 * Construit et pose le lanceur. Rappelée à chaque changement de langue depuis
 * installMenuAndFooter() : on retire l'ancien plutôt que de traduire en place,
 * un panneau ouvert n'ayant pas à survivre à un changement de langue.
 */
function njParlonsInstaller(basePath) {
  basePath = basePath || '';
  var ancien = document.querySelector('.nj-parlons');
  if (ancien) ancien.remove();
  /* Cette classe commande la place réservée sous le pied de page (menu.css).
     Retirée quand le lanceur ne s'installe pas, pour ne pas laisser un blanc
     inexpliqué en bas de bureaudevente.html. */
  if (!njParlonsAutorise()) {
    document.documentElement.classList.remove('nj-parlons-actif');
    return;
  }
  document.documentElement.classList.add('nj-parlons-actif');

  var t = njParlonsT();
  var racine = njParlonsEl('div', 'nj-parlons');

  // ── Panneau (masqué au départ) ──────────────────────────────────────────
  var panneau = njParlonsEl('div', 'nj-parlons-panel');
  panneau.id = 'njParlonsPanel';
  panneau.hidden = true;
  panneau.setAttribute('role', 'dialog');
  panneau.setAttribute('aria-label', t.title);
  panneau.innerHTML =
    '<div class="nj-parlons-head">' +
      '<div class="nj-parlons-avatar" aria-hidden="true">💬</div>' +
      '<div class="nj-parlons-who">' +
        '<b>' + escapeHtml(t.title) + '<span class="nj-parlons-dot"></span></b>' +
        '<span class="nj-parlons-sous">' + escapeHtml(t.subOff) + '</span>' +
      '</div>' +
      '<button class="nj-parlons-close" type="button" aria-label="' + escapeHtml(t.close) + '">×</button>' +
    '</div>' +
    '<div class="nj-parlons-options" id="njParlonsCorps"></div>' +
    '<p class="nj-parlons-foot">🔒 ' + escapeHtml(t.privacy) + '</p>';

  // ── Bulle d'amorce ──────────────────────────────────────────────────────
  var amorce = njParlonsEl('div', 'nj-parlons-teaser');
  amorce.hidden = true;
  amorce.innerHTML =
    escapeHtml(t.teaser) +
    '<button class="nj-parlons-teaser-close" type="button" aria-label="' + escapeHtml(t.close) + '">×</button>';

  // ── Pastille ────────────────────────────────────────────────────────────
  var bouton = njParlonsEl('button', 'nj-parlons-btn');
  bouton.type = 'button';
  bouton.setAttribute('aria-expanded', 'false');
  bouton.setAttribute('aria-controls', 'njParlonsPanel');
  bouton.innerHTML =
    '<span class="nj-parlons-ico" aria-hidden="true">💬</span>' +
    '<span>' + escapeHtml(t.btn) + '</span>' +
    '<span class="nj-parlons-dot"></span>';

  racine.appendChild(panneau);
  racine.appendChild(amorce);
  racine.appendChild(bouton);
  document.body.appendChild(racine);

  njParlonsRendreOptions(document.getElementById('njParlonsCorps'), basePath);

  // ── Ouverture / fermeture ───────────────────────────────────────────────
  function masquerAmorce(definitif) {
    amorce.hidden = true;
    if (definitif) {
      try { window.sessionStorage.setItem(NJ_PARLONS_TEASER_KEY, '1'); } catch (e) {}
    }
  }
  function ouvrir() {
    panneau.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    masquerAmorce(true);
    njParlonsSonderPresence(basePath, racine);
  }
  function fermer() {
    panneau.hidden = true;
    bouton.setAttribute('aria-expanded', 'false');
    njParlonsRendreOptions(document.getElementById('njParlonsCorps'), basePath);
  }

  bouton.addEventListener('click', function () {
    if (panneau.hidden) ouvrir(); else fermer();
  });
  panneau.querySelector('.nj-parlons-close').addEventListener('click', fermer);
  amorce.querySelector('.nj-parlons-teaser-close').addEventListener('click', function (e) {
    e.stopPropagation();
    masquerAmorce(true);
  });
  amorce.addEventListener('click', ouvrir);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panneau.hidden) fermer();
  });
  /* Fermeture au clic à l'extérieur.
     composedPath() plutôt que contains() : le chemin est figé au moment où le
     clic part, alors que contains() n'est évalué qu'APRÈS les gestionnaires.
     Or cliquer une option reconstruit le corps du panneau, donc détache le
     bouton cliqué : contains() ne le retrouvait plus dans le lanceur, concluait
     à un clic extérieur, et refermait le panneau à l'instant même où le
     visiteur venait d'y entrer. */
  document.addEventListener('click', function (e) {
    if (panneau.hidden) return;
    var chemin = typeof e.composedPath === 'function' ? e.composedPath() : null;
    var dedans = chemin ? chemin.indexOf(racine) >= 0 : racine.contains(e.target);
    if (!dedans) fermer();
  });

  // ── L'amorce, une fois par session et jamais d'emblée ───────────────────
  var dejaVue = false;
  try { dejaVue = window.sessionStorage.getItem(NJ_PARLONS_TEASER_KEY) === '1'; } catch (e) {}
  if (!dejaVue) {
    /* Douze secondes : le temps de commencer à lire. Une bulle qui s'ouvre à
       l'arrivée se referme sans être lue. */
    window.setTimeout(function () {
      if (panneau.hidden && document.querySelector('.nj-parlons')) amorce.hidden = false;
    }, 12000);
  }

  njParlonsSonderPresence(basePath, racine);
}
// ===== INSTALLATION DU MENU & FOOTER =====
function installMenuAndFooter(activePage, basePath) {
  // Inject menu at the start of body
  var menuContainer = document.getElementById('mainMenu');
  if (menuContainer) {
    menuContainer.innerHTML = buildMenuHTML(activePage, basePath);
    // Le menu vient d'être écrasé : l'entrée profil doit être reposée. Appelé
    // ici plutôt que dans initPage() parce que switchLang() repasse par cette
    // fonction — sinon le profil disparaîtrait au premier clic sur « EN ».
    installProfilMenu(basePath);
  }

  // Inject footer
  var footerContainer = document.getElementById('mainFooter');
  if (footerContainer) {
    footerContainer.innerHTML = buildFooterHTML(basePath);
    updateFooterContacts(siteContacts, currentLang);
    // Le pied de page vient d'être réécrit : le bouton est neuf, il faut le
    // rebrancher. switchLang() repasse par ici, d'où le recâblage à chaque fois.
    var rBtn = document.getElementById('footerRaccourciBtn');
    var rAide = document.getElementById('footerRaccourciAide');
    if (rBtn && rAide) {
      rBtn.addEventListener('click', function () { njInstallerRaccourci(rBtn, rAide); });
    }
    njMajRaccourci();
  }

  // Hook language buttons
  var langBtns = document.querySelectorAll('.lang-btn');
  for (var i = 0; i < langBtns.length; i++) {
    langBtns[i].addEventListener('click', function() {
      switchLang(this.getAttribute('data-lang'), activePage, basePath);
    });
  }

  // Bouton de thème clair / nocturne
  var themeBtns = document.querySelectorAll('.theme-toggle');
  if (themeBtns.length) {
    njUpdateThemeButton();
    for (var b = 0; b < themeBtns.length; b++) {
      themeBtns[b].addEventListener('click', njToggleTheme);
    }
  }

  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function() {
      navLinks.classList.toggle('show');
    });
    // Fermeture automatique au clic sur un lien (mobile)
    var links = navLinks.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      links[j].addEventListener('click', function() {
        navLinks.classList.remove('show');
      });
    }
  }

  // Lanceur « On en parle ? ». Posé ici et non dans initPage() parce que
  // switchLang() repasse par cette fonction : le panneau doit se retraduire.
  njParlonsInstaller(basePath);
}

// ===== CHANGEMENT DE LANGUE =====
function switchLang(lang, activePage, basePath) {
  currentLang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  window.location.hash = lang;

  // Re-render menu and footer
  installMenuAndFooter(activePage, basePath);

  // Notify the page so it can re-render its content
  if (typeof window.onLanguageChange === 'function') {
    window.onLanguageChange(lang);
  }
  loadSiteContacts(basePath).then(function(contacts) {
    updateFooterContacts(contacts, lang);
    if (typeof window.onContactDataChange === 'function') {
      window.onContactDataChange(contacts, lang);
    }
  });
}

// ===== VISITE GUIDÉE EN DIRECT (chargée sur toutes les pages) =====
// ATTENTION : menu.js lui-même est mis en cache très longtemps par le serveur
// (10 ans côté CloudPanel/Nginx). À chaque modif de menu.js OU de liveguide.*,
// bumper LIVEGUIDE_VERSION ICI **et** le "?v=" de <script src="shared/menu.js?v=...">
// dans TOUTES les pages HTML — sinon les navigateurs gardent l'ancien menu.js
// indéfiniment et ne rechargeront jamais le nouveau code (même après F5/Ctrl+F5).
var LIVEGUIDE_VERSION = 'b6c2ec27'; // bump à chaque modif de liveguide.* pour casser le cache

// ----- Capture des cartes Leaflet pour la visite guidée ----------------------
// Ce bloc s'exécute AU CHARGEMENT de menu.js, et non depuis installLiveGuide()
// ni depuis liveguide.js. Raison : Leaflet n'expose AUCUN moyen de retrouver une
// instance de carte à partir du DOM — si on rate son constructeur, la carte est
// définitivement hors de portée. Or sur carte.html le `L.map()` inline suit
// immédiatement la balise <script src="shared/menu.js">, et liveguide.js est
// injecté de façon asynchrone : il arriverait toujours trop tard. Ici on passe
// avant, sur les cinq pages à carte (Leaflet est chargé en <head>, menu.js en
// fin de <body>, les L.map() ensuite).
//
// Les instances atterrissent dans window.LG_MAPS — l'équivalent pour Leaflet de
// window.LG_PANO pour Pannellum.
(function () {
  // Visiteur normal : on ne touche à rien (même logique de détection que
  // liveguide.js, qui ne se charge que si un rôle est actif).
  function liveGuideActive() {
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.get('lghost') != null || p.get('lg')) return true;
      var r = window.sessionStorage.getItem('lg_role');
      return r === 'host' || r === 'viewer';
    } catch (e) { return false; }
  }
  if (!liveGuideActive()) return;

  window.LG_MAPS = window.LG_MAPS || [];

  function wrapLeaflet(L) {
    if (!L || !L.Map || !L.Map.prototype || L.Map.__lgWrapped) return;
    var origInit = L.Map.prototype.initialize;
    L.Map.prototype.initialize = function () {
      var res = origInit.apply(this, arguments);
      window.LG_MAPS.push(this);
      window.LG_MAP = window.LG_MAPS[0]; // carte principale de la page
      return res;
    };
    L.Map.__lgWrapped = true;
  }

  if (window.L) { wrapLeaflet(window.L); return; }

  // Leaflet pas encore chargé (ordre de scripts différent sur une page future) :
  // on l'intercepte au moment où il s'installe sur window.
  var pending;
  try {
    Object.defineProperty(window, 'L', {
      configurable: true,
      get: function () { return pending; },
      set: function (v) { pending = v; wrapLeaflet(v); }
    });
  } catch (e) { /* navigateur récalcitrant : on se passe de la sync carte */ }
})();

function installLiveGuide(basePath) {
  basePath = basePath || '';
  if (document.getElementById('lg-script')) return; // déjà chargé
  var v = '?v=' + LIVEGUIDE_VERSION;
  // Config publique
  var cfg = document.createElement('script');
  cfg.src = basePath + 'shared/liveguide-config.js' + v;
  cfg.onload = function () {
    // Feuille de style
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = basePath + 'shared/liveguide.css' + v;
    document.head.appendChild(css);
    // Cœur (reçoit basePath pour résoudre l'endpoint d'auth et le lien visiteur)
    var js = document.createElement('script');
    js.id = 'lg-script';
    js.src = basePath + 'shared/liveguide.js' + v;
    js.setAttribute('data-base', basePath);
    document.body.appendChild(js);
  };
  document.head.appendChild(cfg);
}

// ===== INITIALISATION =====
function initPage(activePage, basePath) {
  basePath = basePath || '';
  installLiveGuide(basePath);
  // Detect language from hash
  var hash = window.location.hash.replace('#', '');
  var initialLang = ['fr', 'en', 'ar', 'es'].indexOf(hash) >= 0 ? hash : 'fr';
  currentLang = initialLang;
  document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLang;

  loadSiteProjects(basePath).then(function() {
    installMenuAndFooter(activePage, basePath);

    // Trigger initial render after projects are available
    if (typeof window.onLanguageChange === 'function') {
      window.onLanguageChange(initialLang);
    }

    loadSiteContacts(basePath).then(function(contacts) {
      updateFooterContacts(contacts, initialLang);
      if (typeof window.onContactDataChange === 'function') {
        window.onContactDataChange(contacts, initialLang);
      }
    });
  });
}

/* ============================================================================
   ENTRÉE PROFIL DU MENU PRINCIPAL
   ----------------------------------------------------------------------------
   Convention des sites à connexion : l'état « je suis connecté » se lit dans le
   menu, pas dans une page qu'il faut déjà avoir ouverte. Jusqu'ici le site était
   rigoureusement identique pour un visiteur anonyme et pour un commercial
   connecté — seul un bouton flottant trahissait la session.

   L'entrée n'apparaît QUE connecté. Pas de « Se connecter » pour le public :
   ça n'intéresse aucun client, et le lien existe déjà en pied de page.

   Deux précautions héritées du bouton « Faire visiter » :
     - aucun cookie → on ne demande rien au serveur. Le site n'en pose aucun
       aux visiteurs, donc l'écrasante majorité des pages ne coûte RIEN ;
     - la réponse est mémorisée : switchLang() reconstruit tout le menu à chaque
       changement de langue, et il serait absurde de redemander qui nous sommes
       à chaque clic sur « EN ».
   ========================================================================== */

var PROFIL_UI = {
  fr: { espace: 'Espace agent', visite: '🎥 Faire visiter', sortir: 'Déconnexion',
        connecte: 'Connecté', seul: 'Seul en ligne', collegues: 'en ligne' },
  en: { espace: 'Agent area', visite: '🎥 Start a tour', sortir: 'Sign out',
        connecte: 'Signed in', seul: 'Only you online', collegues: 'online' },
  es: { espace: 'Espacio agente', visite: '🎥 Iniciar visita', sortir: 'Cerrar sesión',
        connecte: 'Conectado', seul: 'Solo tú en línea', collegues: 'en línea' },
  ar: { espace: 'مساحة الوكيل', visite: '🎥 بدء الجولة', sortir: 'تسجيل الخروج',
        connecte: 'متصل', seul: 'أنت وحدك متصل', collegues: 'متصل' }
};

var njProfil = null;      // réponse de ?action=me, mémorisée
var njProfilDemande = false;

function njRoleLabel(role) {
  return role === 'superviseur' ? 'Superviseur'
       : role === 'gestionnaire' ? 'Gestionnaire'
       : role === 'commercial' ? 'Commercial' : '';
}

function installProfilMenu(basePath) {
  basePath = basePath || '';
  if (!document.getElementById('navLinks')) return;   // page sans menu
  if (njProfil) { njRendreProfil(basePath); return; } // déjà connu : on redessine
  if (njProfilDemande) return;                        // requête en vol
  if (!document.cookie) return;                       // visiteur ordinaire

  njProfilDemande = true;
  fetch(basePath + 'api/agent-auth.php?action=me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      njProfilDemande = false;
      if (!j || !j.ok || (!j.agent && !j.admin)) return;
      njProfil = j;
      njRendreProfil(basePath);
    })
    .catch(function () { njProfilDemande = false; });
}

function njRendreProfil(basePath) {
  var links = document.getElementById('navLinks');
  if (!links || links.querySelector('.nav-profil')) return;

  var t = PROFIL_UI[currentLang] || PROFIL_UI.fr;
  var nom = njProfil.agent ? njProfil.agent.name : (njProfil.name || 'admin');
  var role = njProfil.agent ? njRoleLabel(njProfil.agent.role) : 'Admin';

  var li = document.createElement('li');
  li.className = 'nav-groupe nav-profil';

  var det = document.createElement('details');
  det.className = 'nav-details';

  var sum = document.createElement('summary');
  sum.textContent = '👤 ' + nom;

  var ul = document.createElement('ul');
  ul.className = 'nav-sous-menu';

  // Ligne d'état : le point vert est la réponse à « suis-je connecté ? ».
  var etat = document.createElement('li');
  etat.className = 'nav-profil-etat';
  etat.textContent = '🟢 ' + t.connecte + (role ? ' · ' + role : '');
  ul.appendChild(etat);

  // Combien de collègues sont en ligne, en clair et sans ouvrir l'espace agent.
  var collegues = document.createElement('li');
  collegues.className = 'nav-profil-etat';
  collegues.textContent = '·  ·  ·';
  ul.appendChild(collegues);
  njCompterCollegues(basePath, collegues, t);

  ul.appendChild(njProfilLien(basePath + 'espace-agent.html', t.espace));

  // « Faire visiter » : même geste que le bouton flottant. On inscrit le rôle
  // puis on recharge, parce que la capture des cartes Leaflet (plus haut dans
  // CE fichier) ne se joue qu'au chargement de la page et seulement si un rôle
  // est déjà présent. Démarrer à chaud donnerait une visite où la carte ne
  // suivrait pas le conseiller, sans aucune erreur pour le signaler.
  var visite = njProfilLien('#', t.visite);
  visite.firstChild.addEventListener('click', function (ev) {
    ev.preventDefault();
    try { window.sessionStorage.setItem('lg_role', 'host'); } catch (e) {}
    window.location.reload();
  });
  ul.appendChild(visite);

  var sortir = njProfilLien('#', t.sortir);
  sortir.firstChild.addEventListener('click', function (ev) {
    ev.preventDefault();
    // L'admin du back-office a sa propre session et sa propre sortie.
    if (njProfil.admin) { window.location.href = basePath + 'admin/logout.php'; return; }
    fetch(basePath + 'api/agent-auth.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'action=logout'
    }).then(function () {
      njProfil = null;
      try { window.sessionStorage.removeItem('lg_role'); } catch (e) {}
      window.location.reload();
    });
  });
  ul.appendChild(sortir);

  det.appendChild(sum);
  det.appendChild(ul);
  li.appendChild(det);

  // Avant le bloc de langues, qui n'est pas un <li> mais ferme la barre.
  var langs = links.querySelector('.nav-langs');
  if (langs) links.insertBefore(li, langs); else links.appendChild(li);
}

function njProfilLien(href, texte) {
  var li = document.createElement('li');
  var a = document.createElement('a');
  a.href = href;
  a.textContent = texte;
  a.rel = 'nofollow noopener';
  li.appendChild(a);
  return li;
}

/** Nombre de collègues en ligne, hors soi-même. */
function njCompterCollegues(basePath, cible, t) {
  fetch(basePath + 'api/agent-presence.php?equipe=1', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (!j || !j.ok) { cible.remove(); return; }
      var moi = njProfil.agent ? njProfil.agent.id : 0;
      var n = (j.agents || []).filter(function (a) { return a.online && a.id !== moi; }).length;
      cible.textContent = n ? '🟢 ' + n + ' ' + t.collegues : '⚪ ' + t.seul;
    })
    .catch(function () { cible.remove(); });
}
