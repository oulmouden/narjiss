/**
 * ma-selection.js — étapes 4 et 5 du parcours client.
 *
 * Étape 4 : le comparatif côte à côte des logements retenus.
 * Étape 5 : le visiteur se présente, demande un conseiller et/ou une visite.
 *
 * La sélection vient du localStorage écrit par disponibilites.js. Elle n'est
 * envoyée au serveur qu'ici, au moment où le visiteur donne son accord.
 */

(function () {
  'use strict';

  var CLE_SELECTION = 'nj-selection-lots';
  var etat = { projet: 'jawhara', ids: [], lots: [] };

  function $(sel) { return document.querySelector(sel); }

  function nombre(v) {
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  var LIB_ORIENTATION = {
    rue: 'Sur rue', cour: 'Sur cour', jardin: 'Sur jardin',
    double: 'Traversant', angle: 'Angle'
  };
  var LIB_STATUT = {
    disponible: 'Disponible', optionne: 'Optionné',
    reserve: 'Réservé', vendu: 'Vendu'
  };

  function lireSelection() {
    try {
      var brut = JSON.parse(localStorage.getItem(CLE_SELECTION) || '[]');
      etat.ids = Array.isArray(brut) ? brut.slice(0, 3) : [];
    } catch (e) {
      etat.ids = [];
    }
  }

  function ecrireSelection() {
    try { localStorage.setItem(CLE_SELECTION, JSON.stringify(etat.ids)); } catch (e) {}
  }

  /* ── Étape 4 : le comparatif ───────────────────────────────────────── */

  var LIGNES = [
    ['Prix', function (l) { return '<strong>' + nombre(l.prix) + ' DH</strong>'; }],
    ['Prix au m²', function (l) { return nombre(l.prix_m2) + ' DH'; }],
    ['Type', function (l) { return l.typologie.toUpperCase(); }],
    ['Surface habitable', function (l) { return l.surface + ' m²'; }],
    ['Balcon', function (l) { return l.balcon > 0 ? l.balcon + ' m²' : '—'; }],
    ['Surface totale', function (l) { return l.surface_totale + ' m²'; }],
    ['Chambres', function (l) { return l.chambres || '—'; }],
    ['Salles de bain', function (l) { return l.sdb || '—'; }],
    ['Immeuble', function (l) { return l.immeuble; }],
    ['Niveau', function (l) { return l.niveau === 'RDC' ? 'Rez-de-chaussée' : 'Étage ' + l.niveau; }],
    ['Orientation', function (l) { return LIB_ORIENTATION[l.orientation] || l.orientation; }],
    ['Exposition', function (l) { return l.exposition || '—'; }],
    ['Parking', function (l) { return l.parking === 'aucun' ? '—' : l.parking; }],
    ['Disponibilité', function (l) {
      return '<span class="nj-pastille nj-p-' + l.statut + '">' +
             (LIB_STATUT[l.statut] || l.statut) + '</span>';
    }]
  ];

  /** Marque la meilleure valeur d'une ligne quand la comparaison a un sens. */
  function meilleur(cle, lots) {
    var vals = lots.map(function (l) { return l[cle]; });
    if (vals.length < 2) return -1;
    if (cle === 'prix' || cle === 'prix_m2') return vals.indexOf(Math.min.apply(null, vals));
    return vals.indexOf(Math.max.apply(null, vals));
  }

  function rendreComparatif() {
    var zone = $('#njComparatif');
    if (!etat.lots.length) {
      zone.innerHTML =
        '<div class="nj-vide"><p><strong>Votre sélection est vide.</strong></p>' +
        '<p>Retournez aux disponibilités pour choisir jusqu\'à trois logements.</p>' +
        '<p><a class="nj-btn" href="disponibilites.html?projet=' + etat.projet +
        '">Voir les logements</a></p></div>';
      $('#njFormulaire').hidden = true;
      return;
    }
    $('#njFormulaire').hidden = false;

    var iPrix = meilleur('prix', etat.lots);
    var iSurf = meilleur('surface', etat.lots);

    var html = '<table class="nj-compare"><thead><tr><th scope="col">Critère</th>';
    etat.lots.forEach(function (l) {
      html += '<th scope="col">' +
        '<span class="nj-compare-num">' + l.typologie.toUpperCase() + ' · ' + l.numero + '</span>' +
        '<button type="button" class="nj-retirer" data-retirer="' + l.id +
        '" aria-label="Retirer ' + l.numero + ' de ma sélection">Retirer</button></th>';
    });
    html += '</tr></thead><tbody>';

    LIGNES.forEach(function (ligne) {
      html += '<tr><th scope="row">' + ligne[0] + '</th>';
      etat.lots.forEach(function (l, i) {
        var marque = (ligne[0] === 'Prix' && i === iPrix && etat.lots.length > 1) ||
                     (ligne[0] === 'Surface habitable' && i === iSurf && etat.lots.length > 1);
        html += '<td' + (marque ? ' class="nj-mieux"' : '') + '>' + ligne[1](l) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    var notes = etat.lots.filter(function (l) { return l.notes; });
    if (notes.length) {
      html += '<ul class="nj-notes">' + notes.map(function (l) {
        return '<li><strong>' + l.numero + '</strong> — ' + l.notes + '</li>';
      }).join('') + '</ul>';
    }
    zone.innerHTML = html;

    // Champ caché envoyé au serveur : la source de vérité reste etat.ids.
    $('#fLots').value = etat.ids.join(',');
  }

  function retirer(id) {
    var i = etat.ids.indexOf(id);
    if (i === -1) return;
    etat.ids.splice(i, 1);
    ecrireSelection();
    etat.lots = etat.lots.filter(function (l) { return l.id !== id; });
    rendreComparatif();
  }

  /* ── Chargement des lots retenus ───────────────────────────────────── */

  function charger() {
    if (!etat.ids.length) { rendreComparatif(); return Promise.resolve(); }
    return fetch('api/lots-public.php?projet=' + encodeURIComponent(etat.projet), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error);
        var parId = {};
        d.lots.forEach(function (l) { parId[l.id] = l; });
        // Un lot disparu du catalogue (passé « bloqué ») est retiré en silence
        // plutôt que d'afficher une case vide.
        etat.lots = etat.ids.map(function (id) { return parId[id]; }).filter(Boolean);
        etat.ids = etat.lots.map(function (l) { return l.id; });
        ecrireSelection();
        rendreComparatif();
      })
      .catch(function () {
        $('#njComparatif').innerHTML =
          '<div class="nj-vide">Impossible de charger votre sélection pour le moment.</div>';
      });
  }

  /* ── Étape 5 : envoi ───────────────────────────────────────────────── */

  function envoyer(e) {
    e.preventDefault();
    var bouton = $('#njEnvoyer');
    var erreur = $('#njErreur');
    erreur.hidden = true;
    bouton.disabled = true;
    bouton.textContent = 'Envoi…';

    var data = new FormData($('#njFormulaire'));
    data.set('action', 'contact');
    data.set('projet', etat.projet);
    data.set('lots', etat.ids.join(','));
    data.set('canal', new URLSearchParams(location.search).get('canal') || 'web');
    data.set('langue', typeof currentLang !== 'undefined' ? currentLang : 'fr');

    fetch('api/parcours.php', { method: 'POST', body: data })
      .then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); })
      .then(function (res) {
        if (!res.j.ok) throw new Error(res.j.error || 'Envoi impossible.');
        confirmer(res.j);
      })
      .catch(function (err) {
        erreur.textContent = err.message;
        erreur.hidden = false;
        bouton.disabled = false;
        bouton.textContent = 'Envoyer ma demande';
      });
  }

  function confirmer(rep) {
    var c = rep.conseiller;
    var html =
      '<div class="nj-ok">' +
        '<p class="nj-ok-titre">Votre demande est enregistrée.</p>' +
        '<p>Référence <strong>' + rep.reference + '</strong> — notez-la, elle identifie votre dossier.</p>' +
        '<p>Logements retenus : <strong>' + rep.lots.join(', ') + '</strong>.</p>' +
        (rep.visite ? '<p>Votre demande de visite a été transmise ; nous confirmons le créneau par téléphone.</p>' : '');

    if (c && c.nom) {
      html += '<p>Votre conseiller : <strong>' + c.nom + '</strong>' +
              (c.en_ligne ? ' <span class="nj-enligne">en ligne</span>' : '') + '.</p>';
      if (c.whatsapp) {
        var msg = encodeURIComponent(
          'Bonjour, je suis ' + ($('#fNom').value || '') + '. Ma sélection Narjiss : ' +
          rep.lots.join(', ') + ' (référence ' + rep.reference + ').'
        );
        html += '<p><a class="nj-btn nj-btn-wa" target="_blank" rel="noopener" href="https://wa.me/' +
                c.whatsapp.replace(/[^0-9]/g, '') + '?text=' + msg +
                '">Écrire à ' + c.nom + ' sur WhatsApp</a></p>';
      }
    }
    html += '<p><a class="nj-btn nj-btn-clair" href="disponibilites.html?projet=' + etat.projet +
            '">Revoir les logements</a></p></div>';

    $('#njEtape5').innerHTML = html;
    // La sélection a rempli son office : on libère la borne pour le suivant.
    try { localStorage.removeItem(CLE_SELECTION); } catch (e) {}
    $('#njEtape5').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Démarrage ─────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    initPage('projects', '');
    etat.projet = (new URLSearchParams(location.search).get('projet') || 'jawhara').toLowerCase();
    lireSelection();

    var retour = 'disponibilites.html?projet=' + encodeURIComponent(etat.projet);
    $('#njRetour').href = retour;
    $('#njRetour2').href = retour;
    $('#njComparatif').addEventListener('click', function (e) {
      var b = e.target.closest('[data-retirer]');
      if (b) retirer(Number(b.dataset.retirer));
    });
    $('#njFormulaire').addEventListener('submit', envoyer);

    // La visite n'est proposée qu'à partir de demain : personne ne confirme
    // un créneau pour le jour même depuis un formulaire.
    var demain = new Date();
    demain.setDate(demain.getDate() + 1);
    $('#fVisite').min = demain.toISOString().slice(0, 10);

    charger();
  });
})();
