(function () {
  function initMap(node) {
    if (!window.L || node.dataset.ready === '1') return;

    var key = node.getAttribute('data-narjiss-map');
    var projects = (window.NarjissBridgeMaps && window.NarjissBridgeMaps[key]) || [];
    var center = projects.length ? [projects[0].lat, projects[0].lng] : [30.42, -9.6];
    var map = L.map(node).setView(center, 11);
    var bounds = [];

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    projects.forEach(function (project) {
      if (!project.lat || !project.lng) return;
      var marker = L.marker([project.lat, project.lng]).addTo(map);
      marker.bindPopup(
        '<strong>' + escapeHtml(project.title) + '</strong><br>' +
        escapeHtml(project.location || '') + '<br>' +
        '<a href="' + encodeURI(project.url) + '">Voir le projet</a>'
      );
      bounds.push([project.lat, project.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [28, 28] });
    }

    node.dataset.ready = '1';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-narjiss-map]').forEach(initMap);
  });
})();
