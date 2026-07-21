(function () {
    'use strict';

    function byLanguage(value, language) {
        if (!value) {
            return '';
        }

        return value[language] || value.fr || value.en || '';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function initNarjissMap() {
        var node = document.getElementById('narjissGlobalMap');

        if (!node || typeof L === 'undefined') {
            return;
        }

        var language = node.getAttribute('data-language') || window.currentLanguage || 'fr';
        language = language.substring(0, 2);

        var projects = Array.isArray(window.NarjissMapProjects) ? window.NarjissMapProjects : [];
        var copy = window.NarjissMapCopy || {};
        var projectUrl = node.getAttribute('data-projects-url') || (window.siteUrl ? window.siteUrl + '/projects' : '/projects');

        var map = L.map(node, {
            maxZoom: 22,
            scrollWheelZoom: true
        }).setView([30.37, -9.52], 11);

        var planLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxNativeZoom: 19,
            maxZoom: 22
        });

        var lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxNativeZoom: 20,
            maxZoom: 22
        });

        var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri',
            maxNativeZoom: 19,
            maxZoom: 22
        });

        planLayer.addTo(map);
        L.control.layers({
            'Plan OSM': planLayer,
            'Clair': lightLayer,
            'Satellite': satelliteLayer
        }, {}, {
            collapsed: true,
            position: 'topright'
        }).addTo(map);

        L.control.scale({
            position: 'bottomleft',
            imperial: false,
            metric: true
        }).addTo(map);

        var markers = [];

        projects.forEach(function (project) {
            if (!project.lat || !project.lng) {
                return;
            }

            var name = byLanguage(project.name, language);
            var location = byLanguage(project.location, language);
            var type = byLanguage(project.type, language);
            var status = project.status === 'live' ? (copy.live || 'Available') : (copy.soon || 'Soon');

            var icon = L.divIcon({
                html: '<div class="narjiss-project-marker">' + escapeHtml(name) + '</div>',
                iconSize: [190, 46],
                iconAnchor: [95, 44],
                popupAnchor: [0, -42],
                className: ''
            });

            var targetUrl = project.url || projectUrl;
            var popup = [
                '<div class="narjiss-popup">',
                '<div class="narjiss-popup__label">Narjiss</div>',
                '<div class="narjiss-popup__title">' + escapeHtml(name) + '</div>',
                '<div class="narjiss-popup__meta">' + escapeHtml(location) + '</div>',
                '<div class="narjiss-popup__badges">',
                '<span class="narjiss-popup__badge">' + escapeHtml(type) + '</span>',
                '<span class="narjiss-popup__badge">' + escapeHtml(status) + '</span>',
                '<span class="narjiss-popup__badge">' + escapeHtml(project.poi_count || 0) + ' POI</span>',
                '</div>',
                '<a class="narjiss-popup__link" href="' + escapeHtml(targetUrl) + '">' + escapeHtml(copy.viewProject || 'View projects') + '</a>',
                '</div>'
            ].join('');

            var marker = L.marker([project.lat, project.lng], {
                icon: icon,
                zIndexOffset: 1000
            }).bindPopup(popup);

            marker.on('mouseover', function () {
                marker.openPopup();
            });

            marker.addTo(map);
            markers.push(marker);
        });

        if (markers.length > 1) {
            map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25));
        }

        window.setTimeout(function () {
            map.invalidateSize();
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNarjissMap);
    } else {
        initNarjissMap();
    }
})();
