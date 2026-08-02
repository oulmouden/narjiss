(function() {
  var UI = {
    fr: {
      placeholder: "Adresse, quartier, ville",
      typesLabel: "Types de biens", filterByType: "Filtrer par",
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
      empty: "Aucun projet ne correspond à votre recherche.",
      viewMap: "Carte",
      viewBoth: "Les deux",
      viewList: "Liste",
      viewLabel: "Affichage"
    },
    en: {
      placeholder: "Address, neighborhood, city",
      typesLabel: "Property types", filterByType: "Filter by",
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
      empty: "No project matches your search.",
      viewMap: "Map",
      viewBoth: "Both",
      viewList: "List",
      viewLabel: "View"
    },
    ar: {
      placeholder: "العنوان، الحي، المدينة",
      typesLabel: "أنواع العقارات", filterByType: "تصفية حسب",
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
      empty: "لا يوجد مشروع مطابق للبحث.",
      viewMap: "الخريطة",
      viewBoth: "الاثنان",
      viewList: "القائمة",
      viewLabel: "العرض"
    },
    es: {
      placeholder: "Dirección, barrio, ciudad",
      typesLabel: "Tipos de bienes", filterByType: "Filtrar por",
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
      empty: "Ningún proyecto coincide con tu búsqueda.",
      viewMap: "Mapa",
      viewBoth: "Ambos",
      viewList: "Lista",
      viewLabel: "Vista"
    }
  };

  var map;
  var markers = {};
  var filter = "all";
  var sortMode = "poi";
  var currentProjects = [];
  var ecouteurTypesPose = false;
  var typeFilter = "";

  /** Langue courante du site, avec repli sur le français. */
  function currentLangOuFr() {
    return (typeof currentLang !== "undefined" && UI[currentLang]) ? currentLang : "fr";
  }
  var viewMode = "both";

  try {
    var savedView = window.localStorage.getItem("narjissExplorerView");
    if (savedView === "map" || savedView === "both" || savedView === "list") viewMode = savedView;
  } catch (e) {}

  function applyViewMode() {
    var layout = document.getElementById("explorerLayout");
    if (layout) {
      layout.classList.toggle("view-map", viewMode === "map");
      layout.classList.toggle("view-list", viewMode === "list");
    }
    var select = document.getElementById("viewSelect");
    if (select) select.value = viewMode;
    if (map && viewMode !== "list") {
      window.setTimeout(function() { map.invalidateSize(); }, 220);
    }
  }

  var MIN_MAP = 280;
  var MIN_LIST = 380;
  var HANDLE_W = 11;
  var resizePending = false;

  function scheduleMapResize() {
    if (!map || resizePending) return;
    resizePending = true;
    window.requestAnimationFrame(function() {
      resizePending = false;
      map.invalidateSize();
    });
  }

  function setMapWidth(px, persist) {
    var layout = document.getElementById("explorerLayout");
    if (!layout) return;
    var max = layout.getBoundingClientRect().width - MIN_LIST - HANDLE_W;
    if (max < MIN_MAP) return;
    px = Math.max(MIN_MAP, Math.min(px, max));
    layout.style.setProperty("--map-w", px + "px");
    if (persist) {
      try { window.localStorage.setItem("narjissExplorerSplit", String(Math.round(px))); } catch (e) {}
    }
    scheduleMapResize();
  }

  function resetMapWidth() {
    var layout = document.getElementById("explorerLayout");
    if (layout) layout.style.removeProperty("--map-w");
    try { window.localStorage.removeItem("narjissExplorerSplit"); } catch (e) {}
    scheduleMapResize();
  }

  function currentMapWidth() {
    var pane = document.querySelector(".map-pane");
    return pane ? pane.getBoundingClientRect().width : MIN_MAP;
  }

  function setupSplitter() {
    var handle = document.getElementById("splitHandle");
    var layout = document.getElementById("explorerLayout");
    if (!handle || !layout) return;

    var saved = null;
    try { saved = window.localStorage.getItem("narjissExplorerSplit"); } catch (e) {}
    if (saved) setMapWidth(parseFloat(saved), false);

    var dragging = false;
    var lastWidth = null;

    handle.addEventListener("pointerdown", function(e) {
      dragging = true;
      lastWidth = null;
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("is-dragging");
      document.body.classList.add("is-splitting");
      e.preventDefault();
    });

    handle.addEventListener("pointermove", function(e) {
      if (!dragging) return;
      var rect = layout.getBoundingClientRect();
      var rtl = document.documentElement.getAttribute("dir") === "rtl";
      lastWidth = rtl ? rect.right - e.clientX : e.clientX - rect.left;
      setMapWidth(lastWidth, false);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("is-dragging");
      document.body.classList.remove("is-splitting");
      if (lastWidth !== null) setMapWidth(lastWidth, true);
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    handle.addEventListener("dblclick", function() {
      resetMapWidth();
    });

    handle.addEventListener("keydown", function(e) {
      var rtl = document.documentElement.getAttribute("dir") === "rtl";
      var step = e.shiftKey ? 64 : 24;
      if (e.key === "ArrowLeft") {
        setMapWidth(currentMapWidth() + (rtl ? step : -step), true);
      } else if (e.key === "ArrowRight") {
        setMapWidth(currentMapWidth() + (rtl ? -step : step), true);
      } else if (e.key === "Home" || e.key === "Escape") {
        resetMapWidth();
      } else {
        return;
      }
      e.preventDefault();
    });

    window.addEventListener("resize", function() {
      if (layout.style.getPropertyValue("--map-w")) setMapWidth(currentMapWidth(), false);
    });
  }

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
    var t = UI[lang] || UI.fr;
    var html = '<div class="listing-types" aria-label="' + escapeHtml(t.typesLabel) + '">';
    for (var i = 0; i < types.length; i++) {
      var valeur = escapeHtml(types[i]);
      // Une pastille pleine se lit comme un bouton : elle en devient un, et
      // filtre la liste sur ce type via la recherche déjà en place.
      var actif = project.type && project.type === typeFilter ? ' is-active' : '';
      html += '<button type="button" class="listing-type' + actif + '" data-type="' +
              escapeHtml(project.type || '') + '" title="' +
              escapeHtml(t.filterByType) + ' ' + valeur + '">' + valeur + '</button>';
    }
    html += '</div>';
    return html;
  }

  /**
   * Filtre la liste sur un type de bien.
   *
   * On stocke l'identifiant neutre du projet (« appartements », « terrains »)
   * et non le libellé affiché : sinon le filtre poserait « Appartements » dans
   * une recherche textuelle, et passer en arabe ne renverrait plus rien.
   */
  function filterByType(typeKey, lang) {
    // Recliquer sur le type actif le retire : le geste est réversible.
    typeFilter = (typeFilter === typeKey) ? "" : typeKey;
    renderListings(lang);
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
      if (typeFilter && project.type !== typeFilter) return false;
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
    document.getElementById("resetBtn").textContent = t.reset;

    document.getElementById("searchInput").oninput = function() {
      renderListings(lang);
    };
    document.getElementById("resetBtn").onclick = function() {
      document.getElementById("searchInput").value = "";
      typeFilter = "";
      renderListings(lang);
    };

    // Délégation sur le document : les pastilles vivent aussi bien dans les
    // cartes de la liste que dans les popups Leaflet, recréées à chaque
    // ouverture. setupControls est rappelée à chaque changement de langue,
    // d'où le drapeau : sans lui, un clic déclencherait autant de filtrages
    // que de langues visitées.
    if (!ecouteurTypesPose) {
      ecouteurTypesPose = true;
      document.addEventListener("click", function(e) {
        var chip = e.target.closest(".listing-type[data-type]");
        if (!chip) return;
        e.preventDefault();
        e.stopPropagation();
        filterByType(chip.dataset.type, currentLangOuFr());
      });
    }

    document.getElementById("viewSelectLabel").textContent = t.viewLabel;
    var viewSelect = document.getElementById("viewSelect");
    viewSelect.querySelector('option[value="map"]').textContent = t.viewMap;
    viewSelect.querySelector('option[value="list"]').textContent = t.viewList;
    viewSelect.querySelector('option[value="both"]').textContent = t.viewBoth;
    viewSelect.onchange = function() {
      viewMode = this.value;
      try { window.localStorage.setItem("narjissExplorerView", viewMode); } catch (e) {}
      applyViewMode();
    };
    applyViewMode();
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
    setupSplitter();
    initPage("projects", "");
  });
})();
