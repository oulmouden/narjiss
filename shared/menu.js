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
    brand_tag: "Immobilier",
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
    brand_tag: "العقارات",
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

// ===== LISTE DES PROJETS (centralisée) =====
var PROJECTS = [
  {
    id: 'andaloussia',
    folder: 'andaloussia',
    name: { fr: 'Résidence Al Jawhara', en: 'Al Jawhara Residence', ar: 'إقامة الجوهرة', es: 'Residencia Al Jawhara' },
    location: { fr: 'Dcheira El Jihadia, Agadir', en: 'Dcheira El Jihadia, Agadir', ar: 'الدشيرة الجهادية، أكادير', es: 'Dcheira El Jihadia, Agadir' },
    lat: 30.3732,
    lng: -9.5372,
    icon: '🏠',
    status: 'live',
    poi_count: 41,
    has_tour: true,
    stats: [
      { fr: '41 POI', en: '41 POIs', ar: '41 نقطة', es: '41 POI' },
      { fr: '4 langues', en: '4 languages', ar: '4 لغات', es: '4 idiomas' },
      { fr: 'Visite 360°', en: '360° Tour', ar: 'جولة 360°', es: 'Visita 360°' }
    ]
  },
  {
    id: 'jawhara',
    folder: 'jawhara',
    name: { fr: 'Appartement Hivernage', en: 'Hivernage Apartment', ar: 'شقة الإيفرناج', es: 'Apartamento Hivernage' },
    location: { fr: 'Hivernage, Marrakech', en: 'Hivernage, Marrakech', ar: 'الإيفرناج، مراكش', es: 'Hivernage, Marrakech' },
    lat: 31.6223,
    lng: -8.0009,
    icon: '🕌',
    status: 'soon',
    poi_count: 19,
    has_tour: true,
    stats: [
      { fr: '21 panoramas', en: '21 panoramas', ar: '21 بانوراما', es: '21 panoramas' },
      { fr: 'Bientôt', en: 'Coming soon', ar: 'قريبا', es: 'Pronto' }
    ]
  },
  {
    id: 'leslilas',
    folder: 'leslilas',
    name: { fr: 'Résidence Les Lilas', en: 'Les Lilas Residence', ar: 'إقامة الليلك', es: 'Residencia Les Lilas' },
    location: { fr: 'Maroc', en: 'Morocco', ar: 'المغرب', es: 'Marruecos' },
    lat: 33.5731,
    lng: -7.5898,
    icon: '🌸',
    status: 'soon',
    poi_count: 0,
    has_tour: false,
    stats: [
      { fr: 'Bientôt', en: 'Coming soon', ar: 'قريبا', es: 'Pronto' }
    ]
  }
];

// ===== ÉTAT GLOBAL =====
var currentLang = 'fr';

// ===== MENU HTML BUILDER =====
function buildMenuHTML(activePage, basePath) {
  basePath = basePath || '';
  var t = MENU_UI[currentLang];
  return '' +
    '<nav class="main-nav">' +
      '<div class="nav-container">' +
        '<a href="' + basePath + 'index.html" class="nav-brand">' +
          '<div class="logo">N</div>' +
          '<div>' +
            '<div class="brand-name">Narjiss</div>' +
            '<div class="brand-tag">' + t.brand_tag + '</div>' +
          '</div>' +
        '</a>' +
        '<button class="nav-toggle" id="navToggle">☰</button>' +
        '<ul class="nav-links" id="navLinks">' +
          '<li><a href="' + basePath + 'index.html"' + (activePage === 'home' ? ' class="active"' : '') + '>🏠 ' + t.home + '</a></li>' +
          '<li><a href="' + basePath + 'index.html#projects"' + (activePage === 'projects' ? ' class="active"' : '') + '>📂 ' + t.projects + '</a></li>' +
          '<li><a href="' + basePath + 'carte.html"' + (activePage === 'map' ? ' class="active"' : '') + '>🗺️ ' + t.map + '</a></li>' +
          '<li><a href="' + basePath + 'apropos.html"' + (activePage === 'about' ? ' class="active"' : '') + '>ℹ️ ' + t.about + '</a></li>' +
          '<li><a href="' + basePath + 'contact.html"' + (activePage === 'contact' ? ' class="active"' : '') + '>✉️ ' + t.contact + '</a></li>' +
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
  return '' +
    '<footer class="main-footer">' +
      '<div class="footer-grid">' +
        '<div class="footer-col">' +
          '<div class="footer-brand">Narjiss</div>' +
          '<p>' + t.footer_brand_text + '</p>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>' + t.footer_navigation + '</h4>' +
          '<ul>' +
            '<li><a href="' + basePath + 'index.html">' + t.home + '</a></li>' +
            '<li><a href="' + basePath + 'index.html#projects">' + t.projects + '</a></li>' +
            '<li><a href="' + basePath + 'carte.html">' + t.map + '</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>' + t.footer_about + '</h4>' +
          '<ul>' +
            '<li><a href="' + basePath + 'apropos.html">' + t.about + '</a></li>' +
            '<li><a href="' + basePath + 'contact.html">' + t.contact + '</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>' + t.footer_legal + '</h4>' +
          '<ul>' +
            '<li><a href="#">' + t.footer_legal_mentions + '</a></li>' +
            '<li><a href="#">' + t.footer_privacy + '</a></li>' +
            '<li><a href="#">' + t.footer_terms + '</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '© ' + year + ' Narjiss · ' + t.footer_copyright + ' · Cartes : © OpenStreetMap' +
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
}

// ===== INITIALISATION =====
function initPage(activePage, basePath) {
  basePath = basePath || '';
  // Detect language from hash
  var hash = window.location.hash.replace('#', '');
  var initialLang = ['fr', 'en', 'ar', 'es'].indexOf(hash) >= 0 ? hash : 'fr';
  currentLang = initialLang;
  document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLang;

  installMenuAndFooter(activePage, basePath);

  // Trigger initial render
  if (typeof window.onLanguageChange === 'function') {
    window.onLanguageChange(initialLang);
  }
}
