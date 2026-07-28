/* ============================================================
   LOGIQUE COMMUNE — Menu, langues, liste des projets
   ============================================================ */

// ===== TRADUCTIONS DU MENU =====
var MENU_UI = {
  fr: {
    home: "Accueil",
    projects: "Projets",
    map: "Carte",
    about: "À propos",
    contact: "Contact",
    brand_tag: "Immobiliere",
    footer_about: "À propos",
    footer_navigation: "Navigation",
    footer_legal: "Légal",
    footer_brand_text: "Spécialiste de l'immobilier au Maroc avec visites virtuelles 360° et cartes interactives multilingues.",
    footer_legal_mentions: "Mentions légales",
    footer_privacy: "Confidentialité",
    footer_terms: "Conditions",
    footer_copyright: "Tous droits réservés"
  },
  en: {
    home: "Home",
    projects: "Projects",
    map: "Map",
    about: "About",
    contact: "Contact",
    brand_tag: "Real Estate",
    footer_about: "About",
    footer_navigation: "Navigation",
    footer_legal: "Legal",
    footer_brand_text: "Real estate specialist in Morocco with 360° virtual tours and multilingual interactive maps.",
    footer_legal_mentions: "Legal notice",
    footer_privacy: "Privacy",
    footer_terms: "Terms",
    footer_copyright: "All rights reserved"
  },
  ar: {
    home: "الرئيسية",
    projects: "المشاريع",
    map: "الخريطة",
    about: "من نحن",
    contact: "اتصل بنا",
    brand_tag: "للعقار",
    footer_about: "من نحن",
    footer_navigation: "التنقل",
    footer_legal: "قانوني",
    footer_brand_text: "متخصص في العقارات بالمغرب مع جولات افتراضية 360° وخرائط تفاعلية متعددة اللغات.",
    footer_legal_mentions: "إشعار قانوني",
    footer_privacy: "الخصوصية",
    footer_terms: "الشروط",
    footer_copyright: "جميع الحقوق محفوظة"
  },
  es: {
    home: "Inicio",
    projects: "Proyectos",
    map: "Mapa",
    about: "Acerca de",
    contact: "Contacto",
    brand_tag: "Inmobiliaria",
    footer_about: "Acerca de",
    footer_navigation: "Navegación",
    footer_legal: "Legal",
    footer_brand_text: "Especialista inmobiliario en Marruecos con visitas virtuales 360° y mapas interactivos multilingües.",
    footer_legal_mentions: "Aviso legal",
    footer_privacy: "Privacidad",
    footer_terms: "Términos",
    footer_copyright: "Todos los derechos reservados"
  }
};

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
    logo: 'images/projects/jawhara/jawhara_logo.png',
      triptych: 'images/projects/jawhara/concept-hero.png'
    },
    media: {
      status_label: { fr: 'En ligne', en: 'Live', ar: 'متاح', es: 'En línea' },
      tour360: 'jawhara/Tour/index.htm',
      cover360: 'images/projects/jawhara/concept-hero.png',
      floorPlans: ['images/projects/jawhara/floor-plan-demo.svg'],
      gallery: [
        'images/projects/jawhara/concept-hero.png',
        'images/projects/jawhara/concept-hero.png',
        'images/projects/jawhara/jawhara_logo.png',
        'images/projects/jawhara/concept-hero.png'
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
    logo: 'images/projects/tazroute/tazroute_logo.png',
    triptych: 'images/projects/tazroute/concept-triptych.png'
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
    logo: 'images/projects/dar_ben_cheikh/dar_ben_cheikh_logo.png',
    triptych: 'images/projects/dar_ben_cheikh/concept-hero.png'
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
    logo: 'images/projects/tazroute_yassamine/tazroute_yassamine_logo.png',
    triptych: 'images/projects/tazroute_yassamine/concept-hero.png'
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
    logo: 'images/projects/farah/farah_logo.png',
    triptych: 'images/projects/farah/concept-hero.png'
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
    logo: 'images/projects/amical/amical_logo.png',
    triptych: 'images/projects/amical/concept-hero.png'
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
    logo: 'images/projects/azrou/azrou_logo.png',
    triptych: 'images/projects/azrou/concept-hero.png'
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
    logo: 'images/projects/bayt_mawada/bayt_mawada_logo.png',
    triptych: 'images/projects/bayt_mawada/concept-hero.png'
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
    logo: 'images/projects/founty/founty_logo.png',
    triptych: 'images/projects/founty/concept-hero.png'
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
    logo: 'images/projects/nahda2/nahda2_logo.png',
    triptych: 'images/projects/nahda2/concept-hero.png'
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
    logo: 'images/projects/andalusia/andalusia_logo.png',
    triptych: 'images/projects/andalusia/concept-hero.png'
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
    logo: 'images/projects/kb/kb_logo.png',
    triptych: 'images/projects/kb/concept-hero.png'
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
    html += '<a class="footer-social-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener"><span class="footer-social-dot">' + escapeHtml((item.label || item.platform || "?").charAt(0).toUpperCase()) + '</span>' + escapeHtml(item.label || item.platform) + '</a>';
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
        '<button class="nav-toggle" id="navToggle">☰</button>' +
        '<ul class="nav-links" id="navLinks">' +
          '<li><a href="' + basePath + 'index.html' + langHash + '"' + (activePage === 'home' ? ' class="active"' : '') + '>🏠 ' + t.home + '</a></li>' +
          '<li><a href="' + basePath + 'explorer.html' + langHash + '"' + (activePage === 'projects' ? ' class="active"' : '') + '><span class="nav-project-icon" aria-hidden="true"><span class="nav-project-explorer"></span><span class="nav-project-pin"></span></span>' + t.projects + '</a></li>' +
          '<li><a href="' + basePath + 'carte.html' + langHash + '"' + (activePage === 'map' ? ' class="active"' : '') + '>🗺️ ' + t.map + '</a></li>' +
          '<li><a href="' + basePath + 'apropos.html' + langHash + '"' + (activePage === 'about' ? ' class="active"' : '') + '>ℹ️ ' + t.about + '</a></li>' +
          '<li><a href="' + basePath + 'contact.html' + langHash + '"' + (activePage === 'contact' ? ' class="active"' : '') + '>✉️ ' + t.contact + '</a></li>' +
          '<div class="nav-langs">' +
            '<button class="lang-btn' + (currentLang === 'fr' ? ' active' : '') + '" data-lang="fr">FR</button>' +
            '<button class="lang-btn' + (currentLang === 'en' ? ' active' : '') + '" data-lang="en">EN</button>' +
            '<button class="lang-btn' + (currentLang === 'ar' ? ' active' : '') + '" data-lang="ar">عربي</button>' +
            '<button class="lang-btn' + (currentLang === 'es' ? ' active' : '') + '" data-lang="es">ES</button>' +
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
  var isLocal = ['localhost', '127.0.0.1'].indexOf(window.location.hostname) >= 0;
  var adminLink = isLocal ? '<a class="footer-admin-link" href="' + basePath + 'admin/login.php" rel="nofollow">Admin</a>' : '';
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
          '</div>' +
          '<div class="footer-col">' +
          '<h4>' + t.footer_navigation + '</h4>' +
          '<ul>' +
            '<li><a href="' + basePath + 'index.html' + langHash + '">' + t.home + '</a></li>' +
            '<li><a href="' + basePath + 'explorer.html' + langHash + '">' + t.projects + '</a></li>' +
            '<li><a href="' + basePath + 'carte.html' + langHash + '">' + t.map + '</a></li>' +
          '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
          '<h4>' + t.footer_about + '</h4>' +
          '<ul>' +
            '<li><a href="' + basePath + 'apropos.html' + langHash + '">' + t.about + '</a></li>' +
            '<li><a href="' + basePath + 'contact.html' + langHash + '">' + t.contact + '</a></li>' +
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
          '<div>' + t.footer_copyright + (adminLink ? ' · ' + adminLink : '') + '</div>' +
        '</div>' +
      '</div>' +
    '</footer>';
}

// ===== INSTALLATION DU MENU & FOOTER =====
function installMenuAndFooter(activePage, basePath) {
  // Inject menu at the start of body
  var menuContainer = document.getElementById('mainMenu');
  if (menuContainer) {
    menuContainer.innerHTML = buildMenuHTML(activePage, basePath);
  }

  // Inject footer
  var footerContainer = document.getElementById('mainFooter');
  if (footerContainer) {
    footerContainer.innerHTML = buildFooterHTML(basePath);
    updateFooterContacts(siteContacts, currentLang);
  }

  // Hook language buttons
  var langBtns = document.querySelectorAll('.lang-btn');
  for (var i = 0; i < langBtns.length; i++) {
    langBtns[i].addEventListener('click', function() {
      switchLang(this.getAttribute('data-lang'), activePage, basePath);
    });
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
var LIVEGUIDE_VERSION = '7'; // bump à chaque modif de liveguide.* pour casser le cache

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
