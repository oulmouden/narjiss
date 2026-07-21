(function() {
  var UI = {
    fr: {
      placeholder: "Adresse, quartier, ville",
      all: "Tous",
      tour: "Visite 360",
      poi: "+50 POI",
      reset: "Réinitialiser",
      title: "Projets immobiliers Narjiss",
      count: "résultats",
      sortPoi: "Tri: Plus de POI ↓",
      sortName: "Tri: Nom A-Z",
      active: "En ligne",
      map: "Carte interactive",
      visit: "Visite 360 disponible",
      noVisit: "Carte du quartier",
      provider: "NARJISS IMMOBILIERE",
      open: "Voir le projet",
      empty: "Aucun projet ne correspond à votre recherche."
    },
    en: {
      placeholder: "Address, neighborhood, city",
      all: "All",
      tour: "360 tour",
      poi: "+50 POIs",
      reset: "Reset",
      title: "Narjiss real estate projects",
      count: "results",
      sortPoi: "Sort: Most POIs ↓",
      sortName: "Sort: Name A-Z",
      active: "Live",
      map: "Interactive map",
      visit: "360 tour available",
      noVisit: "Neighborhood map",
      provider: "NARJISS REAL ESTATE",
      open: "View project",
      empty: "No project matches your search."
    },
    ar: {
      placeholder: "العنوان، الحي، المدينة",
      all: "الكل",
      tour: "جولة 360",
      poi: "+50 نقطة",
      reset: "إعادة",
      title: "مشاريع نرجس العقارية",
      count: "نتيجة",
      sortPoi: "الترتيب: نقاط أكثر ↓",
      sortName: "الترتيب: الاسم",
      active: "متاح",
      map: "خريطة تفاعلية",
      visit: "جولة 360 متاحة",
      noVisit: "خريطة الحي",
      provider: "نرجس العقارية",
      open: "عرض المشروع",
      empty: "لا يوجد مشروع مطابق للبحث."
    },
    es: {
      placeholder: "Dirección, barrio, ciudad",
      all: "Todos",
      tour: "Visita 360",
      poi: "+50 POI",
      reset: "Restablecer",
      title: "Proyectos inmobiliarios Narjiss",
      count: "resultados",
      sortPoi: "Orden: Más POI ↓",
      sortName: "Orden: Nombre A-Z",
      active: "En línea",
      map: "Mapa interactivo",
      visit: "Visita 360 disponible",
      noVisit: "Mapa del barrio",
      provider: "NARJISS INMOBILIARIA",
      open: "Ver proyecto",
      empty: "Ningún proyecto coincide con tu búsqueda."
    }
  };

  var map;
  var markers = {};
  var filter = "all";
  var sortMode = "poi";
  var currentProjects = [];

  function tr(value, lang) {
    return value && (value[lang] || value.fr || value.en) || "";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function(ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function projectTypesHtml(project, lang) {
    var types = project.types && project.types[lang];
    if (!types || !types.length) return "";
    var html = '<div class="listing-types" aria-label="Types de biens">';
    for (var i = 0; i < types.length; i++) {
      html += '<span class="listing-type">' + escapeHtml(types[i]) + '</span>';
    }
    html += '</div>';
    return html;
  }

  function projectUrl(project, lang) {
    return "project.html?id=" + encodeURIComponent(project.id) + "#" + lang;
  }

  function projectImage(project) {
    if (project.images && project.images.logo) return project.images.logo;
    if (project.images && project.images.triptych) return project.images.triptych;
    return "";
  }

  function markerLabel(project, lang) {
    return tr(project.name, lang);
  }

  function makeMarker(project, lang) {
    return L.divIcon({
      html: '<div class="project-price-marker">' + markerLabel(project, lang) + '</div>',
      iconSize: [168, 34],
      iconAnchor: [84, 17],
      popupAnchor: [0, -18],
      className: ""
    });
  }

  function getFiltered(lang) {
    var q = document.getElementById("searchInput").value.trim().toLowerCase();
    var items = PROJECTS.filter(function(project) {
      var hay = [
        project.id,
        project.folder,
        tr(project.name, lang),
        tr(project.location, lang),
        (project.types && project.types[lang] || []).join(" ")
      ].join(" ").toLowerCase();
      if (q && hay.indexOf(q) < 0) return false;
      if (filter === "tour" && !project.has_tour) return false;
      if (filter === "poi" && (project.poi_count || 0) < 50) return false;
      return true;
    });

    items.sort(function(a, b) {
      if (sortMode === "name") return tr(a.name, lang).localeCompare(tr(b.name, lang));
      return (b.poi_count || 0) - (a.poi_count || 0);
    });
    return items;
  }

  function renderListings(lang) {
    var t = UI[lang];
    var grid = document.getElementById("listingGrid");
    currentProjects = getFiltered(lang);
    document.getElementById("resultsTitle").textContent = t.title;
    document.getElementById("resultsCount").textContent = currentProjects.length + " " + t.count;
    document.getElementById("sortBtn").textContent = sortMode === "poi" ? t.sortPoi : t.sortName;

    if (!currentProjects.length) {
      grid.innerHTML = '<div class="empty-state">' + t.empty + '</div>';
      renderMarkers(lang);
      return;
    }

    var html = "";
    for (var i = 0; i < currentProjects.length; i++) {
      var p = currentProjects[i];
      var img = projectImage(p);
      var typesHtml = projectTypesHtml(p, lang);
      html += '<a class="listing-card" data-project-id="' + p.id + '" href="' + projectUrl(p, lang) + '">' +
        '<div class="listing-media" style="' + (img ? 'background-image:url(' + img + ')' : '') + '">' +
          '<div class="listing-badges">' +
            typesHtml +
            '<div class="listing-badge">' + t.active + '</div>' +
          '</div>' +
          '<div class="favorite">♡</div>' +
          '<div class="listing-dots"><span></span><span></span><span></span><span></span></div>' +
        '</div>' +
        '<div class="listing-body">' +
          '<div class="listing-name">' + tr(p.name, lang) + '</div>' +
          '<div class="listing-meta">' + (p.poi_count || 0) + ' POI | 4 langues | ' + (p.has_tour ? t.visit : t.noVisit) + '</div>' +
          '<div class="listing-address">' + tr(p.location, lang) + '</div>' +
          '<div class="listing-provider">' + t.provider + '</div>' +
        '</div>' +
      '</a>';
    }
    grid.innerHTML = html;

    var cards = grid.querySelectorAll(".listing-card");
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener("mouseenter", function() {
        highlightProject(this.getAttribute("data-project-id"), true);
      });
      cards[c].addEventListener("mouseleave", function() {
        highlightProject(this.getAttribute("data-project-id"), false);
      });
    }
    renderMarkers(lang);
  }

  function renderMarkers(lang) {
    if (!map) return;
    Object.keys(markers).forEach(function(id) {
      map.removeLayer(markers[id]);
    });
    markers = {};
    var bounds = L.latLngBounds([]);

    currentProjects.forEach(function(project) {
      var marker = L.marker([project.lat, project.lng], { icon: makeMarker(project, lang) });
      marker.bindPopup(
        '<div class="popup-card">' +
          '<div class="pc-cat">Narjiss</div>' +
          '<div class="pc-name">' + tr(project.name, lang) + '</div>' +
          projectTypesHtml(project, lang) +
          '<div class="pc-loc">📍 ' + tr(project.location, lang) + '</div>' +
          '<a class="pc-link" href="' + projectUrl(project, lang) + '">' + UI[lang].open + '</a>' +
        '</div>'
      );
      marker.on("mouseover", function() { highlightCard(project.id, true); });
      marker.on("mouseout", function() { highlightCard(project.id, false); });
      marker.addTo(map);
      markers[project.id] = marker;
      bounds.extend([project.lat, project.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.22), { maxZoom: 13 });
    }
  }

  function highlightProject(id, state) {
    if (!markers[id]) return;
    var el = markers[id].getElement();
    if (el) el.classList.toggle("is-active", state);
    if (state) markers[id].openPopup();
  }

  function highlightCard(id, state) {
    var card = document.querySelector('.listing-card[data-project-id="' + id + '"]');
    if (card) card.classList.toggle("highlight", state);
  }

  function setupControls(lang) {
    var t = UI[lang];
    document.getElementById("searchInput").placeholder = t.placeholder;
    document.getElementById("filterAll").textContent = t.all;
    document.getElementById("filterTour").textContent = t.tour;
    document.getElementById("filterPoi").textContent = t.poi;
    document.getElementById("resetBtn").textContent = t.reset;

    document.getElementById("searchInput").oninput = function() {
      renderListings(lang);
    };
    var buttons = document.querySelectorAll(".filter-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].onclick = function() {
        filter = this.getAttribute("data-filter");
        for (var j = 0; j < buttons.length; j++) buttons[j].classList.remove("active");
        this.classList.add("active");
        renderListings(lang);
      };
    }
    document.getElementById("resetBtn").onclick = function() {
      filter = "all";
      sortMode = "poi";
      document.getElementById("searchInput").value = "";
      for (var j = 0; j < buttons.length; j++) buttons[j].classList.toggle("active", buttons[j].getAttribute("data-filter") === "all");
      renderListings(lang);
    };
    document.getElementById("sortBtn").onclick = function() {
      sortMode = sortMode === "poi" ? "name" : "poi";
      renderListings(lang);
    };
  }

  window.onLanguageChange = function(lang) {
    setupControls(lang);
    renderListings(lang);
  };

  document.addEventListener("DOMContentLoaded", function() {
    map = L.map("explorerMap", { scrollWheelZoom: true, maxZoom: 22 }).setView([30.37, -9.52], 12);
    var planLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
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
    planLayer.addTo(map);
    L.control.layers({
      "Plan OSM": planLayer,
      "Clair": cartoLightLayer,
      "Voyager": cartoVoyagerLayer,
      "Sombre": cartoDarkLayer,
      "Topographique": topoLayer,
      "Satellite": satelliteLayer
    }, {}, { position: "topright", collapsed: true }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false, metric: true }).addTo(map);
    var ExplorerViewControls = L.Control.extend({
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
          var target = document.querySelector(".map-pane") || document.getElementById("explorerMap");
          if (!target) return;
          if (document.fullscreenElement) document.exitFullscreen();
          else if (target.requestFullscreen) target.requestFullscreen();
          window.setTimeout(function() { map.invalidateSize(); }, 250);
        });
        L.DomEvent.on(compactBtn, "click", function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          var pane = document.querySelector(".map-pane");
          if (!pane) return;
          pane.classList.toggle("map-compact");
          compactBtn.innerHTML = pane.classList.contains("map-compact") ? "+" : "−";
          window.setTimeout(function() { map.invalidateSize(); }, 250);
        });
        L.DomEvent.disableClickPropagation(container);
        return container;
      }
    });
    map.addControl(new ExplorerViewControls());
    initPage("projects", "");
  });
})();
