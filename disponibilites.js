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
      titre: 'Choisissez votre logement', affiner: 'Affiner',
      disponible: 'Disponible', optionne: 'Optionné', reserve: 'Réservé', vendu: 'Vendu',
      tous: 'Tous', toutes: 'Toutes',
      typologie: 'Type', immeuble: 'Immeuble', niveau: "À partir de l'étage",
      orientation: 'Orientation', budget: 'Budget maximum', surface: 'Surface minimum',
      dispoSeuls: 'Uniquement les logements disponibles', reinit: 'Tout effacer',
      resultat: 'logement', resultats: 'logements',
      aucun: 'Aucun logement ne correspond à ces critères.',
      aucunAide: 'Élargissez votre budget ou retirez un filtre.',
      etage: 'Étage', rdc: 'Rez-de-chaussée', chambres: 'ch.',
      selection: 'Ma sélection', vide: 'Aucun logement sélectionné',
      ajouter: 'Ajouter à ma sélection', retirer: 'Retirer',
      complet: 'Sélection complète (3 maximum)',
      suivant: 'Parler à un conseiller', indispo: "Ce logement n'est plus disponible",
      dh: 'DH', parM2: 'DH/m²',
      rue: 'Sur rue', cour: 'Sur cour', jardin: 'Sur jardin',
      double: 'Traversant', angle: 'Angle',
      erreur: 'Disponibilités indisponibles pour le moment.',
      choisirProjet: 'Quel projet vous intéresse ?',
      choisirAide: 'Sélectionnez un projet pour voir ses logements disponibles.',
      aucunProjet: "Aucune grille de logements n'est encore publiée.",
      aucunProjetAide: 'Nos conseillers restent à votre disposition.',
      voirProjets: 'Voir tous nos projets', dispoSur: 'disponibles sur',
      fil: ['Vos critères', 'Le projet', 'Les logements', 'Ma sélection', 'Un conseiller']
    },
    en: {
      titre: 'Choose your home', affiner: 'Refine',
      disponible: 'Available', optionne: 'Under option', reserve: 'Reserved', vendu: 'Sold',
      tous: 'All', toutes: 'All',
      typologie: 'Type', immeuble: 'Building', niveau: 'From floor',
      orientation: 'Aspect', budget: 'Maximum budget', surface: 'Minimum area',
      dispoSeuls: 'Available homes only', reinit: 'Clear all',
      resultat: 'home', resultats: 'homes',
      aucun: 'No home matches these criteria.',
      aucunAide: 'Raise your budget or remove a filter.',
      etage: 'Floor', rdc: 'Ground floor', chambres: 'bed',
      selection: 'My shortlist', vide: 'No home selected',
      ajouter: 'Add to my shortlist', retirer: 'Remove',
      complet: 'Shortlist full (3 maximum)',
      suivant: 'Talk to an adviser', indispo: 'This home is no longer available',
      dh: 'MAD', parM2: 'MAD/m²',
      rue: 'Street facing', cour: 'Courtyard facing', jardin: 'Garden facing',
      double: 'Dual aspect', angle: 'Corner',
      erreur: 'Availability cannot be loaded right now.',
      choisirProjet: 'Which project interests you?',
      choisirAide: 'Pick a project to see its available homes.',
      aucunProjet: 'No unit list has been published yet.',
      aucunProjetAide: 'Our advisers remain at your disposal.',
      voirProjets: 'See all our projects', dispoSur: 'available out of',
      fil: ['Your criteria', 'The project', 'The homes', 'My shortlist', 'An adviser']
    },
    ar: {
      titre: 'اختر سكنك', affiner: 'تصفية',
      disponible: 'متاح', optionne: 'محجوز مؤقتا', reserve: 'محجوز', vendu: 'مباع',
      tous: 'الكل', toutes: 'الكل',
      typologie: 'النوع', immeuble: 'العمارة', niveau: 'ابتداء من الطابق',
      orientation: 'الاتجاه', budget: 'الميزانية القصوى', surface: 'المساحة الدنيا',
      dispoSeuls: 'المساكن المتاحة فقط', reinit: 'مسح الكل',
      resultat: 'سكن', resultats: 'مسكن',
      aucun: 'لا يوجد سكن مطابق لهذه المعايير.',
      aucunAide: 'وسّع ميزانيتك أو أزل أحد عوامل التصفية.',
      etage: 'الطابق', rdc: 'الطابق الأرضي', chambres: 'غرفة',
      selection: 'اختياري', vide: 'لم يتم اختيار أي سكن',
      ajouter: 'أضف إلى اختياري', retirer: 'إزالة',
      complet: 'اكتمل الاختيار (3 كحد أقصى)',
      suivant: 'التحدث إلى مستشار', indispo: 'هذا السكن لم يعد متاحا',
      dh: 'درهم', parM2: 'درهم/م²',
      rue: 'على الشارع', cour: 'على الفناء', jardin: 'على الحديقة',
      double: 'واجهتان', angle: 'زاوية',
      erreur: 'تعذر عرض المتوفر حاليا.',
      choisirProjet: 'ما هو المشروع الذي يهمك؟',
      choisirAide: 'اختر مشروعا لعرض المساكن المتاحة فيه.',
      aucunProjet: 'لم تُنشر بعد أي قائمة مساكن.',
      aucunProjetAide: 'مستشارونا رهن إشارتكم.',
      voirProjets: 'عرض كل مشاريعنا', dispoSur: 'متاح من أصل',
      fil: ['معاييرك', 'المشروع', 'المساكن', 'اختياري', 'مستشار']
    },
    es: {
      titre: 'Elija su vivienda', affiner: 'Afinar',
      disponible: 'Disponible', optionne: 'En opción', reserve: 'Reservado', vendu: 'Vendido',
      tous: 'Todos', toutes: 'Todas',
      typologie: 'Tipo', immeuble: 'Edificio', niveau: 'A partir de la planta',
      orientation: 'Orientación', budget: 'Presupuesto máximo', surface: 'Superficie mínima',
      dispoSeuls: 'Solo viviendas disponibles', reinit: 'Borrar todo',
      resultat: 'vivienda', resultats: 'viviendas',
      aucun: 'Ninguna vivienda coincide con estos criterios.',
      aucunAide: 'Amplíe su presupuesto o quite un filtro.',
      etage: 'Planta', rdc: 'Planta baja', chambres: 'hab.',
      selection: 'Mi selección', vide: 'Ninguna vivienda seleccionada',
      ajouter: 'Añadir a mi selección', retirer: 'Quitar',
      complet: 'Selección completa (3 máximo)',
      suivant: 'Hablar con un asesor', indispo: 'Esta vivienda ya no está disponible',
      dh: 'DH', parM2: 'DH/m²',
      rue: 'A la calle', cour: 'Al patio', jardin: 'Al jardín',
      double: 'Doble orientación', angle: 'Esquina',
      erreur: 'Las disponibilidades no se pueden cargar por ahora.',
      choisirProjet: '¿Qué proyecto le interesa?',
      choisirAide: 'Elija un proyecto para ver sus viviendas disponibles.',
      aucunProjet: 'Todavía no se ha publicado ninguna lista de viviendas.',
      aucunProjetAide: 'Nuestros asesores quedan a su disposición.',
      voirProjets: 'Ver todos nuestros proyectos', dispoSur: 'disponibles de',
      fil: ['Sus criterios', 'El proyecto', 'Las viviendas', 'Mi selección', 'Un asesor']
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
    var premierRendu = !filtresRendus && !document.getElementById('fTypologie').options.length;
    filtresRendus = true;
    var f = etat.facettes;

    // Un changement de langue reconstruit les libellés des options : on
    // mémorise les choix en cours pour ne pas les effacer sous les doigts
    // du visiteur.
    var choix = {};
    ['fTypologie', 'fImmeuble', 'fOrientation', 'fNiveau'].forEach(function (id) {
      choix[id] = document.getElementById(id).value;
    });
    var budgetAvant = document.getElementById('fBudget').value;
    var surfaceAvant = document.getElementById('fSurface').value;

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
    // Tri sur le rang, pas sur la clé : Object.keys remonte « 1, 2, 3 » avant
    // « RDC », qui se retrouverait en bas de la liste.
    Object.keys(f.niveaux).sort(function (a, b) {
      return f.niveaux[a] - f.niveaux[b];
    }).forEach(function (n) {
      niv += '<option value="' + f.niveaux[n] + '">' + libelleNiveau(n) + '</option>';
    });
    document.getElementById('fNiveau').innerHTML = niv;

    // Le curseur de budget part du prix le plus haut : on ne cache rien tant
    // que le visiteur n'a pas bougé le curseur.
    var budget = document.getElementById('fBudget');
    budget.min = Math.floor(f.prix_min / 50000) * 50000;
    budget.max = Math.ceil(f.prix_max / 50000) * 50000;
    budget.step = 50000;
    budget.value = premierRendu ? budget.max : budgetAvant;

    var surface = document.getElementById('fSurface');
    surface.min = Math.floor(f.surface_min);
    surface.max = Math.ceil(f.surface_max);
    surface.step = 5;
    surface.value = premierRendu ? surface.min : surfaceAvant;

    Object.keys(choix).forEach(function (id) {
      if (choix[id]) document.getElementById(id).value = choix[id];
    });
    majEtiquetteBudget();
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

  /**
   * Aucun projet dans l'URL — cas de l'entrée de menu, qui ne peut pas en
   * désigner un. On demande à l'API lesquels ont une grille : un seul, on y va
   * directement ; plusieurs, on laisse choisir ; aucun, on le dit franchement
   * plutôt que d'afficher une page vide.
   */
  function choisirProjet() {
    var grille = document.getElementById('njGrille');
    document.getElementById('njCompteur').textContent = '';
    return fetch('api/lots-public.php?projets=1', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error);
        if (d.projets.length === 1) {
          etat.projet = d.projets[0].id;
          appliquerLangue();
          return charger();
        }
        var lang = (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
        if (!d.projets.length) {
          grille.innerHTML = '<p class="nj-vide"><strong>' + t('aucunProjet') + '</strong><br>' +
            t('aucunProjetAide') + '<br><br><a class="nj-choix-lien" href="explorer.html#' +
            lang + '">' + t('voirProjets') + '</a></p>';
          return;
        }
        grille.innerHTML =
          '<div class="nj-choix"><h2>' + t('choisirProjet') + '</h2>' +
          '<p>' + t('choisirAide') + '</p><ul>' +
          d.projets.map(function (p) {
            var nom = menuText(p.nom, lang) || p.id;
            var lieu = menuText(p.lieu, lang);
            return '<li><a href="disponibilites.html?projet=' + encodeURIComponent(p.id) +
              '#' + lang + '"><strong>' + nom + '</strong>' +
              (lieu ? '<span class="nj-choix-lieu">' + lieu + '</span>' : '') +
              '<span class="nj-choix-compte">' + p.disponibles + ' ' +
              t('dispoSur') + ' ' + p.total + '</span></a></li>';
          }).join('') + '</ul></div>';
      })
      .catch(function () {
        grille.innerHTML = '<p class="nj-vide">' + t('erreur') + '</p>';
      });
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    etat.projet = (params.get('projet') || '').toLowerCase();
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

    if (etat.projet) charger(); else choisirProjet();
  }

  /** Applique la langue courante à tout le texte figé de la page. */
  function appliquerLangue() {
    var lang = (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
    var texte = function (id, valeur) {
      var el = document.getElementById(id);
      if (el) el.textContent = valeur;
    };

    document.title = 'Narjiss — ' + t('titre');
    texte('njTitre', t('titre'));
    texte('njAffiner', t('affiner'));
    texte('lblTypologie', t('typologie'));
    texte('lblImmeuble', t('immeuble'));
    texte('lblNiveau', t('niveau'));
    texte('lblOrientation', t('orientation'));
    texte('lblBudget', t('budget'));
    texte('lblSurface', t('surface'));
    texte('lblDispoSeuls', t('dispoSeuls'));
    texte('njReinit', t('reinit'));
    texte('njBarreLabel', t('selection'));

    // La flèche suit le sens de lecture : ← en arabe, comme sur carte.html.
    var suivant = document.getElementById('njSuivant');
    if (suivant) suivant.textContent = t('suivant') + (lang === 'ar' ? ' ←' : ' →');

    // Nom et localisation du projet : déjà traduits dans data/projects.json.
    var projet = (window.PROJECTS || []).filter(function (p) { return p.id === etat.projet; })[0];
    if (projet) {
      var nom = menuText(projet.name, lang);
      var lieu = menuText(projet.location, lang);
      texte('njSousTitre', lieu ? nom + ' — ' + lieu : nom);
    }

    var fil = document.getElementById('njFil');
    if (fil) {
      var etapes = T[lang].fil;
      [].forEach.call(fil.children, function (li, i) {
        if (etapes[i]) li.textContent = etapes[i];
      });
    }

    var legende = document.getElementById('njLegende');
    if (legende) {
      legende.innerHTML = ['disponible', 'optionne', 'reserve', 'vendu'].map(function (st) {
        return '<span><i style="background:var(--lot-' +
          (st === 'disponible' ? 'dispo' : st) + ')"></i>' + t(st) + '</span>';
      }).join('');
    }

    // Les options des filtres portent des libellés traduits : on les reconstruit.
    filtresRendus = false;
    rendreFiltres();
  }

  // Appelé par le menu partagé à chaque changement de langue.
  window.onLanguageChange = function () {
    appliquerLangue();
    // L'écran de choix du projet porte ses propres libellés et des liens
    // suffixés par la langue : il doit être reconstruit, pas seulement la grille.
    if (!etat.projet) { choisirProjet(); return; }
    if (etat.facettes) { rendreLots(); rendreBarreSelection(); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    initPage('units', '');
    init();
  });
})();
