/**
 * disponibilites.js — étape 3 du parcours client : choisir son lot.
 *
 * Pensé d'abord pour le grand écran tactile du bureau de vente : cibles
 * larges, aucune saisie au clavier obligatoire, tout se fait au doigt.
 * La sélection du visiteur reste dans le navigateur (localStorage) jusqu'à
 * l'étape 5, où elle sera rattachée à une fiche.
 */

(function () {
  'use strict';

  var MAX_SELECTION = 3;         // au-delà, comparer ne veut plus rien dire
  var CLE_SELECTION = 'nj-selection-lots';

  var etat = {
    projet: 'jawhara',
    lots: [],
    facettes: null,
    filtres: {},
    selection: []
  };

  var T = {
    fr: {
      titre: 'Choisissez votre logement', dispo: 'Disponible', optionne: 'Optionné',
      reserve: 'Réservé', vendu: 'Vendu', tous: 'Tous', toutes: 'Toutes',
      typologie: 'Type', immeuble: 'Immeuble', niveau: 'À partir de l\'étage',
      orientation: 'Orientation', budget: 'Budget maximum', surface: 'Surface minimum',
      dispoSeuls: 'Uniquement les logements disponibles', reinit: 'Tout effacer',
      resultat: 'logement', resultats: 'logements', aucun: 'Aucun logement ne correspond à ces critères.',
      aucunAide: 'Élargissez votre budget ou retirez un filtre.',
      etage: 'Étage', rdc: 'Rez-de-chaussée', chambres: 'ch.', comparer: 'Comparer',
      selection: 'Ma sélection', vide: 'Aucun logement sélectionné',
      ajouter: 'Ajouter à ma sélection', retirer: 'Retirer', complet: 'Sélection complète (3 maximum)',
      suivant: 'Parler à un conseiller', precedent: 'Retour aux projets',
      indispo: 'Ce logement n\'est plus disponible', dh: 'DH', parM2: 'DH/m²',
      rue: 'Sur rue', cour: 'Sur cour', jardin: 'Sur jardin',
      double: 'Traversant', angle: 'Angle', erreur: 'Disponibilités indisponibles pour le moment.'
    }
  };

  function t(cle) {
    var lang = (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
    return T[lang][cle] || T.fr[cle] || cle;
  }

  function nombre(v) {
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function libelleNiveau(niveau) {
    return niveau === 'RDC' ? t('rdc') : t('etage') + ' ' + niveau;
  }

  function libelleOrientation(o) {
    return t(o) !== o ? t(o) : o;
  }

  /* ── Sélection du visiteur ─────────────────────────────────────────── */

  function chargerSelection() {
    try {
      var brut = JSON.parse(localStorage.getItem(CLE_SELECTION) || '[]');
      etat.selection = Array.isArray(brut) ? brut.slice(0, MAX_SELECTION) : [];
    } catch (e) {
      etat.selection = [];
    }
  }

  function enregistrerSelection() {
    try {
      localStorage.setItem(CLE_SELECTION, JSON.stringify(etat.selection));
    } catch (e) {
      // Navigation privée ou quota plein : la sélection ne survivra pas au
      // rechargement, mais la page continue de fonctionner.
    }
  }

  function estSelectionne(id) {
    return etat.selection.indexOf(id) !== -1;
  }

  function basculerSelection(id, statut) {
    if (statut !== 'disponible') return;
    var i = etat.selection.indexOf(id);
    if (i !== -1) {
      etat.selection.splice(i, 1);
    } else if (etat.selection.length < MAX_SELECTION) {
      etat.selection.push(id);
    } else {
      annoncer(t('complet'));
      return;
    }
    enregistrerSelection();
    // On rafraîchit la seule carte concernée, pas toute la grille : un
    // innerHTML global détruirait la carte que le visiteur vient de toucher,
    // lui ferait perdre le focus clavier et sauter la position de défilement.
    majCarte(id);
    rendreBarreSelection();
  }

  /** Reflète l'état de sélection sur une carte déjà présente dans le DOM. */
  function majCarte(id) {
    var carte = document.querySelector('.nj-lot[data-id="' + id + '"]');
    if (!carte) return;
    var choisi = estSelectionne(id);
    carte.classList.toggle('nj-choisi', choisi);
    carte.setAttribute('aria-pressed', choisi ? 'true' : 'false');
    var action = carte.querySelector('.nj-action');
    if (action && !action.classList.contains('nj-action-off')) {
      action.textContent = choisi ? '✓ ' + t('retirer') : '+ ' + t('ajouter');
    }
  }

  /** Message vocalisé pour les lecteurs d'écran, sans alerte bloquante. */
  function annoncer(message) {
    var live = document.getElementById('njLive');
    if (live) live.textContent = message;
  }

  /* ── Chargement ────────────────────────────────────────────────────── */

  function construireUrl() {
    var p = new URLSearchParams();
    p.set('projet', etat.projet);
    Object.keys(etat.filtres).forEach(function (k) {
      if (etat.filtres[k] !== '' && etat.filtres[k] != null) p.set(k, etat.filtres[k]);
    });
    return 'api/lots-public.php?' + p.toString();
  }

  function charger() {
    var grille = document.getElementById('njGrille');
    grille.setAttribute('aria-busy', 'true');
    return fetch(construireUrl(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || 'erreur');
        etat.lots = d.lots;
        if (!etat.facettes) etat.facettes = d.facettes;   // figées : voir api
        rendreFiltres();
        rendreLots();
        rendreBarreSelection();
      })
      .catch(function () {
        grille.innerHTML = '<p class="nj-vide">' + t('erreur') + '</p>';
      })
      .then(function () { grille.removeAttribute('aria-busy'); });
  }

  /* ── Rendu des filtres ─────────────────────────────────────────────── */

  var filtresRendus = false;

  function rendreFiltres() {
    if (filtresRendus || !etat.facettes) return;
    filtresRendus = true;
    var f = etat.facettes;

    function options(map, tout, formateur) {
      var html = '<option value="">' + tout + '</option>';
      Object.keys(map).forEach(function (k) {
        var libelle = formateur ? formateur(k) : k.toUpperCase();
        html += '<option value="' + k + '">' + libelle + ' (' + map[k] + ')</option>';
      });
      return html;
    }

    document.getElementById('fTypologie').innerHTML = options(f.typologies, t('tous'));
    document.getElementById('fImmeuble').innerHTML = options(f.immeubles, t('tous'));
    document.getElementById('fOrientation').innerHTML =
      options(f.orientations, t('toutes'), libelleOrientation);

    var niv = '<option value="">' + t('tous') + '</option>';
    Object.keys(f.niveaux).forEach(function (n) {
      niv += '<option value="' + f.niveaux[n] + '">' + libelleNiveau(n) + '</option>';
    });
    document.getElementById('fNiveau').innerHTML = niv;

    // Le curseur de budget part du prix le plus haut : on ne cache rien tant
    // que le visiteur n'a pas bougé le curseur.
    var budget = document.getElementById('fBudget');
    budget.min = Math.floor(f.prix_min / 50000) * 50000;
    budget.max = Math.ceil(f.prix_max / 50000) * 50000;
    budget.step = 50000;
    budget.value = budget.max;
    majEtiquetteBudget();

    var surface = document.getElementById('fSurface');
    surface.min = Math.floor(f.surface_min);
    surface.max = Math.ceil(f.surface_max);
    surface.step = 5;
    surface.value = surface.min;
    majEtiquetteSurface();
  }

  function majEtiquetteBudget() {
    var b = document.getElementById('fBudget');
    var actif = Number(b.value) < Number(b.max);
    document.getElementById('fBudgetVal').textContent =
      actif ? nombre(b.value) + ' ' + t('dh') : t('tous');
  }

  function majEtiquetteSurface() {
    var s = document.getElementById('fSurface');
    var actif = Number(s.value) > Number(s.min);
    document.getElementById('fSurfaceVal').textContent =
      actif ? s.value + ' m²' : t('toutes');
  }

  function lireFiltres() {
    var b = document.getElementById('fBudget');
    var s = document.getElementById('fSurface');
    etat.filtres = {
      typologie: document.getElementById('fTypologie').value,
      immeuble: document.getElementById('fImmeuble').value,
      orientation: document.getElementById('fOrientation').value,
      niveau_min: document.getElementById('fNiveau').value,
      // Un curseur laissé au maximum ne doit pas filtrer.
      budget_max: Number(b.value) < Number(b.max) ? b.value : '',
      surface_min: Number(s.value) > Number(s.min) ? s.value : '',
      disponible: document.getElementById('fDispo').checked ? '1' : ''
    };
  }

  /* ── Rendu des lots ────────────────────────────────────────────────── */

  function carte(lot) {
    var libre = lot.statut === 'disponible';
    var choisi = estSelectionne(lot.id);
    var titre = lot.typologie.toUpperCase() + ' · ' + lot.numero;
    var surface = lot.surface.toFixed(1).replace('.0', '') + ' m²';
    if (lot.balcon > 0) surface += ' + ' + lot.balcon.toFixed(1).replace('.0', '') + ' m²';

    return '' +
      '<article class="nj-lot nj-' + lot.statut + (choisi ? ' nj-choisi' : '') + '"' +
        ' data-id="' + lot.id + '" data-statut="' + lot.statut + '"' +
        ' tabindex="0" role="button" aria-pressed="' + (choisi ? 'true' : 'false') + '"' +
        ' aria-label="' + titre + ', ' + nombre(lot.prix) + ' dirhams, ' + t(lot.statut) + '">' +
        '<header class="nj-lot-tete">' +
          '<span class="nj-lot-num">' + titre + '</span>' +
          '<span class="nj-pastille">' + t(lot.statut) + '</span>' +
        '</header>' +
        '<p class="nj-lot-prix">' + nombre(lot.prix) + ' <small>' + t('dh') + '</small></p>' +
        '<ul class="nj-lot-carac">' +
          '<li>' + surface + '</li>' +
          (lot.chambres > 0 ? '<li>' + lot.chambres + ' ' + t('chambres') + '</li>' : '') +
          '<li>' + libelleOrientation(lot.orientation) + '</li>' +
          '<li>' + nombre(lot.prix_m2) + ' ' + t('parM2') + '</li>' +
        '</ul>' +
        (lot.notes ? '<p class="nj-lot-note">' + lot.notes + '</p>' : '') +
        '<footer class="nj-lot-pied">' +
          (libre
            ? '<span class="nj-action">' + (choisi ? '✓ ' + t('retirer') : '+ ' + t('ajouter')) + '</span>'
            : '<span class="nj-action nj-action-off">' + t('indispo') + '</span>') +
        '</footer>' +
      '</article>';
  }

  function rendreLots() {
    var grille = document.getElementById('njGrille');
    var compteur = document.getElementById('njCompteur');
    compteur.textContent = etat.lots.length + ' ' +
      (etat.lots.length > 1 ? t('resultats') : t('resultat'));

    if (!etat.lots.length) {
      grille.innerHTML = '<p class="nj-vide"><strong>' + t('aucun') + '</strong><br>' + t('aucunAide') + '</p>';
      return;
    }

    // Regroupement immeuble → niveau : c'est ainsi que le conseiller et le
    // client raisonnent devant le plan, pas en liste continue.
    var groupes = {};
    etat.lots.forEach(function (lot) {
      var g = lot.immeuble || '—';
      var n = lot.niveau;
      groupes[g] = groupes[g] || {};
      (groupes[g][n] = groupes[g][n] || { ordre: lot.niveau_ordre, lots: [] }).lots.push(lot);
    });

    var html = '';
    Object.keys(groupes).sort().forEach(function (imm) {
      var niveaux = groupes[imm];
      var cles = Object.keys(niveaux).sort(function (a, b) {
        return niveaux[a].ordre - niveaux[b].ordre;
      });
      var nb = cles.reduce(function (s, k) { return s + niveaux[k].lots.length; }, 0);
      html += '<section class="nj-immeuble"><h2>' + t('immeuble') + ' ' + imm +
              ' <small>' + nb + '</small></h2>';
      cles.forEach(function (n) {
        html += '<div class="nj-niveau"><h3>' + libelleNiveau(n) + '</h3><div class="nj-lots">' +
                niveaux[n].lots.map(carte).join('') + '</div></div>';
      });
      html += '</section>';
    });
    grille.innerHTML = html;
  }

  function rendreBarreSelection() {
    var barre = document.getElementById('njBarre');
    var n = etat.selection.length;
    document.getElementById('njBarreCompte').textContent = n + '/' + MAX_SELECTION;
    barre.classList.toggle('nj-barre-active', n > 0);

    var choisis = etat.lots.filter(function (l) { return estSelectionne(l.id); });
    document.getElementById('njBarreListe').innerHTML = n === 0
      ? '<span class="nj-barre-vide">' + t('vide') + '</span>'
      : choisis.map(function (l) {
          return '<span class="nj-jeton">' + l.typologie.toUpperCase() + ' ' + l.numero +
                 ' · ' + nombre(l.prix) + ' ' + t('dh') +
                 '<button type="button" class="nj-jeton-x" data-retirer="' + l.id +
                 '" aria-label="' + t('retirer') + ' ' + l.numero + '">×</button></span>';
        }).join('');
    document.getElementById('njSuivant').disabled = n === 0;
  }

  /* ── Démarrage ─────────────────────────────────────────────────────── */

  function init() {
    var params = new URLSearchParams(window.location.search);
    etat.projet = (params.get('projet') || 'jawhara').toLowerCase();
    chargerSelection();

    ['fTypologie', 'fImmeuble', 'fOrientation', 'fNiveau'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        lireFiltres(); charger();
      });
    });
    document.getElementById('fDispo').addEventListener('change', function () {
      lireFiltres(); charger();
    });

    // Les curseurs filtrent au relâchement, pas à chaque pixel : sur un écran
    // tactile, un appel par pixel saturerait le réseau pour rien.
    ['fBudget', 'fSurface'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', id === 'fBudget' ? majEtiquetteBudget : majEtiquetteSurface);
      el.addEventListener('change', function () { lireFiltres(); charger(); });
    });

    document.getElementById('njReinit').addEventListener('click', function () {
      ['fTypologie', 'fImmeuble', 'fOrientation', 'fNiveau'].forEach(function (id) {
        document.getElementById(id).value = '';
      });
      document.getElementById('fDispo').checked = false;
      var b = document.getElementById('fBudget'); b.value = b.max; majEtiquetteBudget();
      var s = document.getElementById('fSurface'); s.value = s.min; majEtiquetteSurface();
      lireFiltres(); charger();
    });

    // Délégation : la grille est reconstruite à chaque filtre, on ne peut pas
    // attacher les écouteurs aux cartes elles-mêmes.
    document.getElementById('njGrille').addEventListener('click', function (e) {
      var carte = e.target.closest('.nj-lot');
      if (carte) basculerSelection(Number(carte.dataset.id), carte.dataset.statut);
    });
    document.getElementById('njGrille').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var carte = e.target.closest('.nj-lot');
      if (carte) { e.preventDefault(); basculerSelection(Number(carte.dataset.id), carte.dataset.statut); }
    });
    document.getElementById('njBarreListe').addEventListener('click', function (e) {
      var b = e.target.closest('[data-retirer]');
      if (b) basculerSelection(Number(b.dataset.retirer), 'disponible');
    });

    // Étape suivante : le comparatif puis la mise en relation. Le canal est
    // repris tel quel pour qu'une borne reste identifiée comme telle.
    document.getElementById('njSuivant').addEventListener('click', function () {
      if (!etat.selection.length) return;
      var canal = new URLSearchParams(window.location.search).get('canal');
      window.location.href = 'ma-selection.html?projet=' + encodeURIComponent(etat.projet) +
        (canal ? '&canal=' + encodeURIComponent(canal) : '');
    });

    charger();
  }

  // Le menu partagé recharge les libellés à chaque changement de langue.
  window.onLanguageChange = function () {
    if (etat.facettes) { rendreLots(); rendreBarreSelection(); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    initPage('projects', '');
    init();
  });
})();
