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

  /**
   * Version des plans. Un plan remplacé garde le même nom de fichier : sans
   * ce suffixe, le navigateur — et surtout la borne du bureau de vente, que
   * personne ne vient rafraîchir — continue d'afficher l'ancienne image.
   * À incrémenter à chaque remplacement d'un plan, ET à chaque republication
   * d'une visite virtuelle 3DVista : l'`index.htm` de la visite garde lui aussi
   * son nom, donc sans ce suffixe le navigateur resert l'ancienne visite même
   * quand le serveur, lui, a bien été mis à jour.
   */
  var MEDIA_V = '4';

  function versionne(url) {
    if (!url) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + MEDIA_V;
  }

  var etat = {
    projet: '',
    lots: [],
    facettes: null,
    filtres: {},
    selection: [],
    choixActif: null,   // lot affiché dans le sélecteur du panneau « Mes choix »
    avecDonnees: null,  // ids des projets ayant une grille, null tant qu'inconnu
    vue: 'maquette',    // 'maquette' (plateau, par défaut), 'liste' ou 'plan' (façade)
    etage: {},          // étage affiché dans la maquette, par immeuble
    zones: null,        // numero_lot -> {plan, points}, null tant qu'inconnu
    plansZones: null,   // chemin de plan -> {largeur, hauteur}
    zonesProjet: null   // projet pour lequel zones/plansZones sont chargés
  };

  // Immeuble à ramener sous les yeux au premier rendu de la maquette (retour
  // depuis une autre page). Consommé une fois, puis oublié.
  var immARevoir = null;

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
      ajouterChoix: 'Ajouter à mes choix', retirerChoix: 'Dans mes choix', indispoChoix: 'Indisponible', retourFiche: 'Retour à la fiche', viderSelection: '✕ Vider',
      ajouter: 'Ajouter à ma sélection', retirer: 'Retirer',
      projet: 'Projet',
      detailsLot: 'Détails du lot', surfaceLot: 'Surface', chambresLot: 'Chambres', statutLot: 'Disponibilité',
      plan: 'Plan', tour360: '360°', medias: 'Album', fermer: 'Fermer',
      mediaProjet: 'Document du projet — le plan propre à ce lot sera ajouté prochainement.',
      sansPlan: 'Aucun plan disponible pour ce projet.',
      planArchi: "Plan d'architecte", planVisuel: 'Plan commercial',
      comparer: 'Glissez pour comparer les deux plans',
      sansTour: 'Aucune visite 360° disponible pour ce projet.',
      vue: 'Affichage', vuePlan: 'Plan', vueListe: 'Liste', vueMaquette: 'Maquette',
      maquetteAide: "Choisissez un étage, puis un logement sur le plateau. La position de chaque lot reflète son orientation.",
      pleinEcran: "Plein écran", quitterPleinEcran: "Quitter le plein écran",
      planZoomAide: "Pincez pour zoomer, glissez pour déplacer. Touchez un logement pour le choisir.",
      rdcCourt: 'RDC', circulation: 'Escalier / ascenseur', plateauVide: 'Aucun logement à cet étage avec les filtres actuels.',
      libres: 'libres', planAide: 'Chaque pastille est un lot. Touchez un lot libre pour l\'ajouter.',
      enPreparation: 'Données en cours de mise à jour',
      enPreparationTitre: 'Les disponibilités de ce projet arrivent bientôt.',
      enPreparationAide: 'La grille des lots est en cours de préparation. Nos conseillers peuvent déjà répondre à vos questions.',
      contacter: 'Contacter un conseiller', voirFiche: 'Voir la fiche du projet',
      visiterBureau: 'Bureau de vente',
      yAller: 'Itinéraire',
      partagerItineraire: 'Itinéraire WhatsApp',
      quartier: '📍 Le quartier',
      itineraireVers: 'Itinéraire vers',
      geoIndispo: "La géolocalisation n'est pas disponible dans ce navigateur.",
      geoRefus: "Impossible de récupérer votre position. Vérifiez l'autorisation de localisation.",
      complet: 'Sélection complète (3 maximum)',
      suivant: 'Envoyer mes choix', indispo: "Ce logement n'est plus disponible",
      dh: 'DH', parM2: 'DH/m²',
      rue: 'Sur rue', cour: 'Sur cour', jardin: 'Sur jardin',
      double: 'Traversant', angle: 'Angle',
      erreur: 'Disponibilités indisponibles pour le moment.',
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
      ajouterChoix: 'Add to my shortlist', retirerChoix: 'In my shortlist', indispoChoix: 'Unavailable', retourFiche: 'Back to details', viderSelection: '✕ Clear',
      ajouter: 'Add to my shortlist', retirer: 'Remove',
      projet: 'Project',
      detailsLot: 'Unit details', surfaceLot: 'Area', chambresLot: 'Bedrooms', statutLot: 'Availability',
      plan: 'Floor plan', tour360: '360°', medias: 'Album', fermer: 'Close',
      mediaProjet: 'Project document — the plan specific to this unit will be added soon.',
      sansPlan: 'No floor plan available for this project.',
      planArchi: 'Architect drawing', planVisuel: 'Sales plan',
      comparer: 'Drag to compare both plans',
      sansTour: 'No 360° tour available for this project.',
      vue: 'View', vuePlan: 'Plan', vueListe: 'List', vueMaquette: 'Floor mockup',
      maquetteAide: 'Pick a floor, then a home on the plate. Each unit sits according to its aspect.',
      pleinEcran: 'Full screen', quitterPleinEcran: 'Exit full screen',
      planZoomAide: 'Pinch to zoom, drag to pan. Tap a home to pick it.',
      rdcCourt: 'GF', circulation: 'Stairs / lift', plateauVide: 'No home on this floor with the current filters.',
      libres: 'free', planAide: 'Each tile is a unit. Tap a free unit to add it.',
      enPreparation: 'Data being updated',
      enPreparationTitre: 'Availability for this project is coming soon.',
      enPreparationAide: 'The unit list is being prepared. Our advisers can already answer your questions.',
      contacter: 'Contact an adviser', voirFiche: 'View the project page',
      visiterBureau: 'Sales office',
      yAller: 'Directions',
      partagerItineraire: 'Route via WhatsApp',
      quartier: '📍 The neighbourhood',
      itineraireVers: 'Route to',
      geoIndispo: 'Geolocation is not available in this browser.',
      geoRefus: 'Unable to get your location. Please check location permission.',
      complet: 'Shortlist full (3 maximum)',
      suivant: 'Send my selection', indispo: 'This home is no longer available',
      dh: 'MAD', parM2: 'MAD/m²',
      rue: 'Street facing', cour: 'Courtyard facing', jardin: 'Garden facing',
      double: 'Dual aspect', angle: 'Corner',
      erreur: 'Availability cannot be loaded right now.',
      fil: ['Your criteria', 'The project', 'The homes', 'My shortlist', 'An adviser']
    },
    ar: {
      titre: 'اختر سكنك', affiner: 'حدد الخيارات',
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
      ajouterChoix: 'إضافة إلى اختياراتي', retirerChoix: 'ضمن اختياراتي', indispoChoix: 'غير متاح', retourFiche: 'العودة إلى البطاقة', viderSelection: '✕ إفراغ',
      ajouter: 'أضف إلى اختياري', retirer: 'إزالة',
      projet: 'المشروع',
      detailsLot: 'تفاصيل الوحدة', surfaceLot: 'المساحة', chambresLot: 'الغرف', statutLot: 'التوفر',
      plan: 'المخطط', tour360: '360°', medias: 'الألبوم', fermer: 'إغلاق',
      mediaProjet: 'وثيقة المشروع — سيُضاف مخطط هذه الوحدة قريبا.',
      sansPlan: 'لا يوجد مخطط متاح لهذا المشروع.',
      planArchi: 'مخطط المهندس', planVisuel: 'المخطط التجاري',
      comparer: 'اسحب للمقارنة بين المخططين',
      sansTour: 'لا توجد جولة 360° متاحة لهذا المشروع.',
      vue: 'العرض', vuePlan: 'المخطط', vueListe: 'القائمة', vueMaquette: 'مجسم الطابق',
      maquetteAide: 'اختر طابقا ثم سكنا على المسطح. موقع كل وحدة يعكس اتجاهها.',
      pleinEcran: 'ملء الشاشة', quitterPleinEcran: 'إنهاء ملء الشاشة',
      planZoomAide: 'اقرص للتكبير، اسحب للتحريك. المس سكنا لاختياره.',
      rdcCourt: 'الأرضي', circulation: 'الدرج / المصعد', plateauVide: 'لا يوجد سكن في هذا الطابق بالمعايير الحالية.',
      libres: 'متاحة', planAide: 'كل مربع يمثل وحدة. المس وحدة متاحة لإضافتها.',
      enPreparation: 'البيانات قيد التحديث',
      enPreparationTitre: 'ستتوفر قائمة هذا المشروع قريبا.',
      enPreparationAide: 'قائمة الوحدات قيد الإعداد. يمكن لمستشارينا الإجابة عن أسئلتكم منذ الآن.',
      contacter: 'الاتصال بمستشار', voirFiche: 'عرض بطاقة المشروع',
      visiterBureau: 'مكتب البيع',
      yAller: 'المسار',
      partagerItineraire: 'المسار عبر واتساب',
      quartier: '📍 الحي',
      itineraireVers: 'المسار نحو',
      geoIndispo: 'تحديد الموقع غير متاح في هذا المتصفح.',
      geoRefus: 'تعذر الحصول على موقعك. تحقق من إذن تحديد الموقع.',
      complet: 'اكتمل الاختيار (3 كحد أقصى)',
      suivant: 'إرسال اختياراتي', indispo: 'هذا السكن لم يعد متاحا',
      dh: 'درهم', parM2: 'درهم/م²',
      rue: 'على الشارع', cour: 'على الفناء', jardin: 'على الحديقة',
      double: 'واجهتان', angle: 'زاوية',
      erreur: 'تعذر عرض المتوفر حاليا.',
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
      ajouterChoix: 'Añadir a mi selección', retirerChoix: 'En mi selección', indispoChoix: 'No disponible', retourFiche: 'Volver a la ficha', viderSelection: '✕ Vaciar',
      ajouter: 'Añadir a mi selección', retirer: 'Quitar',
      projet: 'Proyecto',
      detailsLot: 'Detalles del lote', surfaceLot: 'Superficie', chambresLot: 'Dormitorios', statutLot: 'Disponibilidad',
      plan: 'Plano', tour360: '360°', medias: 'Álbum', fermer: 'Cerrar',
      mediaProjet: 'Documento del proyecto — el plano propio de este lote se añadirá pronto.',
      sansPlan: 'No hay plano disponible para este proyecto.',
      planArchi: 'Plano de arquitecto', planVisuel: 'Plano comercial',
      comparer: 'Deslice para comparar los dos planos',
      sansTour: 'No hay visita 360° disponible para este proyecto.',
      vue: 'Vista', vuePlan: 'Plano', vueListe: 'Lista', vueMaquette: 'Maqueta',
      maquetteAide: 'Elija una planta y luego una vivienda. La posición de cada lote refleja su orientación.',
      pleinEcran: 'Pantalla completa', quitterPleinEcran: 'Salir de pantalla completa',
      planZoomAide: 'Pellizque para acercar, arrastre para mover. Toque una vivienda para elegirla.',
      rdcCourt: 'PB', circulation: 'Escalera / ascensor', plateauVide: 'Ninguna vivienda en esta planta con los filtros actuales.',
      libres: 'libres', planAide: 'Cada casilla es un lote. Toque un lote libre para añadirlo.',
      enPreparation: 'Datos en actualización',
      enPreparationTitre: 'Las disponibilidades de este proyecto llegarán pronto.',
      enPreparationAide: 'La lista de lotes se está preparando. Nuestros asesores ya pueden responder a sus preguntas.',
      contacter: 'Contactar con un asesor', voirFiche: 'Ver la ficha del proyecto',
      visiterBureau: 'Oficina de venta',
      yAller: 'Cómo llegar',
      partagerItineraire: 'Ruta por WhatsApp',
      quartier: '📍 El barrio',
      itineraireVers: 'Ruta hacia',
      geoIndispo: 'La geolocalización no está disponible en este navegador.',
      geoRefus: 'No se pudo obtener tu ubicación. Revisa el permiso de ubicación.',
      complet: 'Selección completa (3 máximo)',
      suivant: 'Enviar mi selección', indispo: 'Esta vivienda ya no está disponible',
      dh: 'DH', parM2: 'DH/m²',
      rue: 'A la calle', cour: 'Al patio', jardin: 'Al jardín',
      double: 'Doble orientación', angle: 'Esquina',
      erreur: 'Las disponibilidades no se pueden cargar por ahora.',
      fil: ['Sus criterios', 'El proyecto', 'Las viviendas', 'Mi selección', 'Un asesor']
    }
  };

  /** Langue courante du site, avec repli sur le français. */
  function langue() {
    return (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
  }

  function t(cle) {
    return T[langue()][cle] || T.fr[cle] || cle;
  }

  function nombre(v) {
    return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * Montant prêt à insérer dans du HTML.
   *
   * En arabe, « 589 000 » s'affichait « 000 589 » : l'espace des milliers est
   * un caractère neutre, et l'algorithme bidirectionnel réordonne les groupes
   * de chiffres qui l'entourent. <bdi dir="ltr"> isole le montant du sens de
   * lecture de la page ; la devise, elle, reste dans le flux arabe.
   */
  function montant(v) {
    return '<bdi dir="ltr">' + nombre(v) + '</bdi>';
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
      // Le lot qu'on vient d'ajouter devient celui qu'on consulte : sinon le
      // panneau continuerait d'afficher les documents du choix précédent.
      etat.choixActif = id;
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
    majChoixMaquette();
  }

  /** Reflète l'état de sélection sur une carte déjà présente dans le DOM. */
  function majCarte(id) {
    var carte = document.querySelector('.nj-lot[data-id="' + id + '"], ' +
      '.nj-carreau[data-id="' + id + '"], .nj-mq-lot[data-id="' + id + '"]');
    if (!carte) return;
    // Dans la maquette, la coche est redessinée avec le plateau : on se
    // contente de l'anneau porté par la classe, insérer du HTML dans du SVG
    // ne fonctionnerait pas.
    if (carte.classList.contains('nj-mq-lot')) {
      var choisiM = estSelectionne(id);
      carte.classList.toggle('nj-choisi', choisiM);
      carte.setAttribute('aria-pressed', choisiM ? 'true' : 'false');
      return;
    }
    if (carte.classList.contains('nj-carreau')) {
      var choisiC = estSelectionne(id);
      carte.classList.toggle('nj-choisi', choisiC);
      carte.setAttribute('aria-pressed', choisiC ? 'true' : 'false');
      var coche = carte.querySelector('.nj-carreau-coche');
      if (choisiC && !coche) {
        carte.insertAdjacentHTML('beforeend',
          '<span class="nj-carreau-coche" aria-hidden="true">\u2713</span>');
      } else if (!choisiC && coche) {
        coche.remove();
      }
      return;
    }
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

  /**
   * Contours des lots sur les plans d'étage, tracés dans le back-office.
   *
   * Chargés une fois par projet et indépendamment des filtres : un contour ne
   * dépend pas du budget saisi, et les recharger à chaque frappe ferait
   * clignoter le plan. Un échec n'est pas bloquant — la maquette retombe sur
   * le plateau schématique, qui n'a jamais eu besoin de ces données.
   */
  function chargerZones() {
    var projet = etat.projet;
    if (etat.zonesProjet === projet) return Promise.resolve();
    etat.zonesProjet = projet;
    etat.zones = null;
    etat.plansZones = null;

    return fetch('api/plan-zones-public.php?projet=' + encodeURIComponent(projet),
                 { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok || etat.projet !== projet) return;   // projet changé entre-temps
        etat.zones = d.zones || {};
        etat.plansZones = d.plans || {};
      })
      .catch(function () { etat.zones = {}; etat.plansZones = {}; });
  }

  function charger() {
    var grille = document.getElementById('njGrille');
    grille.setAttribute('aria-busy', 'true');
    chargerZones().then(function () {
      if (etat.vue === 'maquette') afficherLots();   // repeint avec le vrai plan
    });
    return fetch(construireUrl(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || 'erreur');
        etat.lots = d.lots;
        if (!etat.facettes) etat.facettes = d.facettes;   // figées : voir api
        rendreFiltres();
        afficherLots();
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
    majBasculeFiltres();
  }

  /**
   * Libellé du bouton de repli des filtres (téléphone).
   *
   * Repliés, les filtres ne se voient plus : sans ce compteur, un visiteur qui
   * ne trouve aucun logement n'aurait aucun moyen de comprendre qu'il a laissé
   * trois critères actifs.
   */
  function majBasculeFiltres() {
    var lbl = document.getElementById('njFiltresBasculeLbl');
    if (!lbl) return;
    var actifs = Object.keys(etat.filtres).filter(function (k) {
      return etat.filtres[k] !== '' && etat.filtres[k] != null;
    }).length;
    lbl.innerHTML = echapper(t('affiner')) +
      (actifs ? '<span class="nj-filtres-compte">' + actifs + '</span>' : '');
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
        '<p class="nj-lot-prix">' + montant(lot.prix) + ' <small>' + t('dh') + '</small></p>' +
        '<ul class="nj-lot-carac">' +
          '<li>' + surface + '</li>' +
          (lot.chambres > 0 ? '<li>' + lot.chambres + ' ' + t('chambres') + '</li>' : '') +
          '<li>' + libelleOrientation(lot.orientation) + '</li>' +
          '<li>' + montant(lot.prix_m2) + ' ' + t('parM2') + '</li>' +
        '</ul>' +
        (lot.notes ? '<p class="nj-lot-note">' + lot.notes + '</p>' : '') +
        boutonsMedias(lot) +
        '<footer class="nj-lot-pied">' +
          (libre
            ? '<span class="nj-action">' + (choisi ? '✓ ' + t('retirer') : '+ ' + t('ajouter')) + '</span>'
            : '<span class="nj-action nj-action-off">' + t('indispo') + '</span>') +
        '</footer>' +
      '</article>';
  }

  /* ── Consultation d'un lot : plan, visite 360°, carte ─────────────── */

  /** Le projet courant, tel que le menu partagé l'a chargé. */
  function projetCourant() {
    return (window.PROJECTS || []).filter(function (p) {
      return p.id === etat.projet;
    })[0] || null;
  }

  /**
   * Boutons de consultation d'un lot.
   *
   * Le plan et la visite 360° viennent du LOT quand la grille les renseigne
   * (colonnes plan_architecte / plan_visuel / visite_360), et retombent sinon
   * sur les documents du PROJET, identiques pour tous ses lots — un repli
   * signalé au visiteur par la mention « document du projet ». Les photos et
   * vidéos, elles, restent toujours celles du projet.
   */
  function mediasDuLot(lot) {
    var p = projetCourant();
    var b = [];
    if (planDuLot(lot) || (p && (p.plan_architecte_url || p.plan_visuel_url))) {
      b.push(bouton('plan', lot.id, '\u25A6', t('plan')));
    }
    if (lot.tour || (p && (p.apartment_tour_url || p.tour_url))) {
      b.push(bouton('tour', lot.id, '\u25CE', t('tour360')));
    }
    // L'album remplace l'ancienne carte : devant un lot, le visiteur veut voir
    // la résidence, pas la situer — la carte reste accessible depuis la fiche
    // projet et l'étape « localisation » du parcours.
    if (p) {
      b.push(bouton('medias', lot.id, '\u25A3', t('medias')));
    }
    return b;
  }

  function boutonsMedias(lot) {
    var b = mediasDuLot(lot);
    return b.length ? '<div class="nj-medias">' + b.join('') + '</div>' : '';
  }

  /**
   * Bouton « Ajouter à mes choix » de la fiche. Seuls les lots disponibles sont
   * sélectionnables (cf. basculerSelection). Le libellé reflète l'état, et le
   * bouton se désactive quand la sélection est déjà pleine.
   */
  function boutonChoix(lot) {
    // Un lot non disponible (réservé, vendu, optionné) ne peut pas être mis en
    // sélection. Plutôt que de masquer le bouton — ce qui laisse croire qu'il
    // ne marche pas — on l'affiche désactivé, avec le statut qui explique.
    if (lot.statut !== 'disponible') {
      return '<button type="button" class="nj-fiche-choix is-off" disabled>' +
        '⦸ ' + t('indispoChoix') + ' · ' + t(lot.statut) + '</button>';
    }
    var dans = estSelectionne(lot.id);
    var plein = !dans && etat.selection.length >= MAX_SELECTION;
    return '<button type="button" class="nj-fiche-choix' + (dans ? ' is-in' : '') +
      '" data-choix="' + lot.id + '" data-statut="' + echapper(lot.statut) + '"' +
      (plein ? ' disabled title="' + echapper(t('complet')) + '"' : '') + '>' +
      (dans ? '✓ ' + t('retirerChoix') : '＋ ' + t('ajouterChoix')) +
      '</button>';
  }

  /**
   * Plan propre au lot, s'il en a un. La grille peut porter trois chemins :
   * le plan d'architecte, le plan commercial, et l'ancienne colonne
   * `plan_fichier` conservée pour les grilles déjà importées.
   */
  function planDuLot(lot) {
    return lot.plan_architecte || lot.plan_visuel || lot.plan || '';
  }

  /**
   * Comparateur « avant/après » entre les deux plans d'un lot.
   *
   * Le plan commercial est en dessous et fixe la hauteur ; le plan
   * d'architecte est rogné par-dessus au fil du curseur. Le contrôle est un
   * <input type="range"> natif étalé sur toute l'image : on garde ainsi le
   * clavier, le tactile et les lecteurs d'écran sans les réécrire.
   */
  function comparateurPlans(archi, visuel, titre) {
    return '<div class="nj-compare" id="njCompare" style="--nj-x:50%" ' +
        'data-titre="' + echapper(titre) + '">' +
      '<img id="njCompareBas" src="' + versionne(visuel) + '" alt="' + t('planVisuel') + ' ' + titre + '">' +
      '<img id="njCompareHaut" class="nj-compare-haut" src="' + versionne(archi) + '" alt="' + t('planArchi') + ' ' + titre + '">' +
      '<span class="nj-compare-lbl nj-compare-lbl-g">' + t('planArchi') + '</span>' +
      '<span class="nj-compare-lbl nj-compare-lbl-d">' + t('planVisuel') + '</span>' +
      '<span class="nj-compare-trait" aria-hidden="true"></span>' +
      '<input type="range" class="nj-compare-range" id="njCompareRange" ' +
        'min="0" max="100" step="1" value="50" aria-label="' + t('comparer') + '">' +
      '</div>';
  }

  function echapper(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Branche le curseur du comparateur, une fois le corps injecté.
   *
   * Si l'un des deux plans ne se charge pas (chemin erroné dans la grille,
   * fichier absent du serveur), on ne laisse pas une image cassée : on
   * bascule sur l'affichage simple de celui qui reste, et sur le message
   * habituel si aucun des deux n'arrive.
   */
  function activerComparateur() {
    var boite = document.getElementById('njCompare');
    var curseur = document.getElementById('njCompareRange');
    if (!boite || !curseur) return;

    curseur.addEventListener('input', function () {
      boite.style.setProperty('--nj-x', this.value + '%');
    });

    var bas = document.getElementById('njCompareBas');
    var haut = document.getElementById('njCompareHaut');
    var titre = boite.getAttribute('data-titre') || '';
    var traite = false;

    function replier(perdu) {
      if (traite) return;
      var reste = perdu === haut ? bas : haut;
      // L'autre image peut avoir déjà échoué de son côté.
      var reste_ok = reste && !(reste.complete && reste.naturalWidth === 0);
      traite = true;
      document.getElementById('njMediaCorps').innerHTML = reste_ok
        ? '<img src="' + reste.getAttribute('src') + '" alt="' + t('plan') + ' ' + titre + '">'
        : '<p class="nj-media-vide">' + t('sansPlan') + '</p>';
    }

    [bas, haut].forEach(function (im) {
      if (!im) return;
      im.addEventListener('error', function () { replier(im); });
      // Une erreur peut précéder la pose de l'écouteur (image déjà en cache).
      if (im.complete && im.naturalWidth === 0) replier(im);
    });
  }

  /* Œil des listes de choix. En SVG plutôt qu'en emoji : le « × » voisin est
     un caractère texte qui suit la couleur du bouton, et un emoji aurait imposé
     sa propre teinte, différente selon la plateforme. */
  function oeilSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" ' +
      'fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '</svg>';
  }

  /* Bouton « voir » d'un lot choisi. Il porte data-fiche et la classe partagée
     nj-choix-voir : la délégation de clic existante ouvre déjà la fiche. */
  function boutonVoirChoix(lot, classe) {
    var libelle = t('detailsLot') + ' ' + lot.numero;
    return '<button type="button" class="' + classe + ' nj-choix-voir" data-fiche="' + lot.id +
      '" title="' + libelle + '" aria-label="' + libelle + '">' + oeilSvg() + '</button>';
  }

  function bouton(type, id, icone, libelle) {
    return '<button type="button" class="nj-media-btn" data-media="' + type +
      '" data-lot="' + id + '"><span aria-hidden="true">' + icone + '</span>' +
      libelle + '</button>';
  }

  /**
   * Fiche d'un lot : ses caractéristiques et ses trois documents.
   *
   * C'est la porte d'entrée depuis le plan, où les pastilles sont trop petites
   * pour porter les boutons eux-mêmes.
   */
  function ouvrirFiche(lotId) {
    var lot = etat.lots.filter(function (l) { return l.id === lotId; })[0];
    if (!lot) return;
    var lignes = [
      [t('typologie'), lot.typologie.toUpperCase()],
      [t('surfaceLot'), lot.surface + ' m²' + (lot.balcon > 0 ? ' + ' + lot.balcon + ' m²' : '')],
      [t('immeuble'), lot.immeuble],
      [t('etage'), lot.niveau === 'RDC' ? t('rdc') : lot.niveau],
      [t('orientation'), libelleOrientation(lot.orientation)],
      [t('statutLot'), t(lot.statut)]
    ];
    if (lot.chambres > 0) lignes.splice(2, 0, [t('chambresLot'), String(lot.chambres)]);

    var corps = '<div class="nj-fiche">' +
      '<p class="nj-fiche-prix">' + montant(lot.prix) + ' <small>' + t('dh') + '</small></p>' +
      '<dl>' + lignes.map(function (l) {
        return '<dt>' + l[0] + '</dt><dd>' + l[1] + '</dd>';
      }).join('') + '</dl>' +
      (lot.notes ? '<p class="nj-fiche-note">' + lot.notes + '</p>' : '') +
      boutonsMedias(lot) +
      '<div class="nj-fiche-actions">' + boutonChoix(lot) + boutonViderFiche(lot) + '</div>' +
      '</div>';

    document.getElementById('njMediaTitre').textContent =
      lot.typologie.toUpperCase() + ' · ' + lot.numero;
    document.getElementById('njMediaCorps').innerHTML = corps;
    majTitreProjet();
    majBoutonRetour(null);   // on EST sur la fiche : pas de retour vers elle-même
    majBoutonPlein(false);
    document.getElementById('njMediaNote').hidden = true;
    ouvrirModale();
    document.body.classList.add('nj-fige');
    document.getElementById('njMediaFermer').focus();
  }

  /**
   * Rappelle le projet dans l'en-tête de la fenêtre. Sur la carte du quartier
   * surtout, rien à l'écran ne dit de quelle résidence il s'agit : la référence
   * du lot seule (« F2 · A-2-08 ») ne suffit pas à situer le visiteur.
   */
  function majTitreProjet() {
    var el = document.getElementById('njMediaProjet');
    if (!el) return;
    var p = projetCourant();
    el.textContent = p ? menuText(p.name, langue()) : '';
  }

  /**
   * Affiche ou masque le plein écran de la fenêtre de consultation.
   *
   * Réservé aux documents (plan, 360°, carte) : sur la fiche, qui tient en
   * quelques lignes, agrandir n'apporterait rien.
   */
  function majBoutonPlein(actif) {
    var b = document.getElementById('njMediaPlein');
    if (!b) return;
    b.hidden = !actif;
    if (actif) majLibellePlein();
  }

  /** Accorde le libellé du bouton à l'état réel du plein écran. */
  function majLibellePlein() {
    var b = document.getElementById('njMediaPlein');
    if (!b) return;
    var plein = !!document.fullscreenElement;
    var libelle = plein ? t('quitterPleinEcran') : t('pleinEcran');
    b.textContent = (plein ? '✕ ' : '⛶ ') + libelle;
    b.setAttribute('title', libelle);
    b.setAttribute('aria-label', libelle);
  }

  /**
   * Affiche ou masque le retour vers la fiche, dans l'en-tête de la fenêtre.
   * La fenêtre est partagée par la fiche et les médias : sans ce masquage, la
   * fiche proposerait un retour vers elle-même.
   */
  function majBoutonRetour(lotId) {
    var b = document.getElementById('njMediaRetour');
    if (!b) return;
    if (lotId == null) { b.hidden = true; b.removeAttribute('data-retour-fiche'); return; }
    b.textContent = '← ' + t('retourFiche');
    b.setAttribute('data-retour-fiche', lotId);
    b.setAttribute('title', t('retourFiche'));
    b.setAttribute('aria-label', t('retourFiche'));
    b.hidden = false;
  }

  /** Ouvre la fenêtre de consultation sur un document donné. */
  function ouvrirMedia(type, lotId) {
    var lot = etat.lots.filter(function (l) { return l.id === lotId; })[0];
    if (!lot) return;
    var p = projetCourant();
    var titre = lot.typologie.toUpperCase() + ' · ' + lot.numero;
    var corps = '';
    var note = '';

    if (type === 'plan') {
      var planLot = planDuLot(lot);
      // Comparateur UNIQUEMENT si les deux plans sont propres au lot :
      // l'architecte (vignette découpée) et le commercial. Opposer la vignette
      // d'un lot au plan d'ensemble du projet n'aurait aucun sens — les
      // documents du projet ne servent qu'en dernier repli, en image simple.
      var archiLot   = lot.plan_architecte || '';
      var visuelLot  = lot.plan_visuel || '';
      var archiProj  = (p && p.plan_architecte_url) || '';
      var visuelProj = (p && p.plan_visuel_url) || '';
      if (archiLot && visuelLot && archiLot !== visuelLot) {
        corps = comparateurPlans(archiLot, visuelLot, titre);
      } else {
        var src = planLot || archiProj || visuelProj || '';
        corps = src
          ? '<img src="' + versionne(src) + '" alt="' + t('plan') + ' ' + titre + '">'
          : '<p class="nj-media-vide">' + t('sansPlan') + '</p>';
      }
      // L'avertissement « document du projet » ne vaut que pour un repli.
      if ((planLot || archiProj || visuelProj) && !planLot) note = t('mediaProjet');
    } else if (type === 'tour') {
      var tour = lot.tour || (p && (p.apartment_tour_url || p.tour_url));
      corps = tour
        ? '<iframe src="' + versionne(tour) + '" title="' + t('tour360') + '" allowfullscreen loading="lazy"></iframe>'
        : '<p class="nj-media-vide">' + t('sansTour') + '</p>';
      if (tour && !lot.tour) note = t('mediaProjet');
    } else if (type === 'medias') {
      // L'album du projet, servi par medias.html en mode embarqué : c'est la
      // même page que celle atteinte depuis le site, donc un seul endroit à
      // maintenir. medias.html n'a pas de marqueur de version dans son URL :
      // sans le ?v=, le navigateur — et surtout la borne du bureau de vente,
      // que personne ne vient rafraîchir — resservirait indéfiniment la
      // version en cache de la page embarquée, y compris après déploiement.
      corps = '<iframe title="' + t('medias') + '" loading="lazy" allow="fullscreen" ' +
        'allowfullscreen src="medias.html?id=' + encodeURIComponent(etat.projet) +
        '&amp;embed=1&amp;v=' + MEDIA_V + '#' + langue() + '"></iframe>';
      note = t('mediaProjet');
    }

    // Le média a été ouvert depuis la fiche « Info » : on offre un retour vers
    // elle, sinon « Fermer » renvoie tout au plan de l'immeuble et fait perdre
    // le contexte du lot.
    majBoutonRetour(lot.id);
    majTitreProjet();
    majBoutonPlein(true);

    document.getElementById('njMediaTitre').textContent = titre;
    document.getElementById('njMediaCorps').innerHTML = corps;
    activerComparateur();
    document.getElementById('njMediaNote').textContent = note;
    document.getElementById('njMediaNote').hidden = !note;
    ouvrirModale();
    document.body.classList.add('nj-fige');
    document.getElementById('njMediaFermer').focus();
  }

  /**
   * Ouvre la fenêtre de consultation.
   *
   * showModal() place le dialogue dans la « couche supérieure » du
   * navigateur, au-dessus de tout, y compris d'un élément en plein écran.
   * C'est ce qui manquait : avec un simple div, la fiche s'ouvrait bien du
   * premier clic, mais derrière le plan agrandi.
   */
  function ouvrirModale() {
    var d = document.getElementById('njMedia');
    if (!d.open) d.showModal();
  }

  function fermerMedia() {
    var d = document.getElementById('njMedia');
    // Sortir d'abord du plein écran : fermer le dialogue sans le faire
    // laisserait le navigateur en plein écran sur une fenêtre disparue.
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
    if (d.open) d.close();
    // Vider libère l'iframe : sans ça la visite 360° continue de tourner.
    document.getElementById('njMediaCorps').innerHTML = '';
    document.body.classList.remove('nj-fige');
  }

  /**
   * Vue « plan de commercialisation » : une ligne par étage, du dernier au
   * rez-de-chaussée, comme on lit une façade. C'est la représentation que le
   * conseiller a en tête devant son tableau mural, et la plus lisible à deux
   * mètres sur la borne du bureau de vente.
   */
  function rendrePlan() {
    var grille = document.getElementById('njGrille');
    if (!etat.lots.length) {
      grille.innerHTML = '<p class="nj-vide"><strong>' + t('aucun') + '</strong><br>' +
        t('aucunAide') + '</p>';
      return;
    }

    var groupes = {};
    etat.lots.forEach(function (lot) {
      var g = lot.immeuble || '—';
      groupes[g] = groupes[g] || {};
      (groupes[g][lot.niveau] = groupes[g][lot.niveau] ||
        { ordre: lot.niveau_ordre, lots: [] }).lots.push(lot);
    });

    var html = '<p class="nj-plan-aide">' + t('planAide') + '</p>';

    Object.keys(groupes).sort().forEach(function (imm) {
      var niveaux = groupes[imm];
      var tousLots = Object.keys(niveaux).reduce(function (acc, n) {
        return acc.concat(niveaux[n].lots);
      }, []);
      var libres = tousLots.filter(function (l) { return l.statut === 'disponible'; }).length;
      var pct = Math.round(libres / tousLots.length * 100);

      html += '<section class="nj-plan-imm">' +
        '<header class="nj-plan-tete">' +
          '<h2>' + t('immeuble') + ' ' + imm + '</h2>' +
          '<span class="nj-plan-compte"><bdi dir="ltr">' + libres + '/' + tousLots.length +
          '</bdi> ' + t('libres') + '</span>' +
          '<span class="nj-plan-jauge" role="img" aria-label="' + pct + '%">' +
            '<span style="width:' + pct + '%"></span></span>' +
        '</header>';

      // Du dernier étage vers le bas : on lit un immeuble comme on le voit.
      Object.keys(niveaux).sort(function (a, b) {
        return niveaux[b].ordre - niveaux[a].ordre;
      }).forEach(function (n) {
        var lots = niveaux[n].lots.slice().sort(function (a, b) {
          return a.numero.localeCompare(b.numero, undefined, { numeric: true });
        });
        html += '<div class="nj-plan-etage">' +
          '<span class="nj-plan-niveau">' + (n === 'RDC' ? t('rdc') : n) + '</span>' +
          '<div class="nj-plan-lots">' +
            lots.map(carreau).join('') +
          '</div></div>';
      });
      html += '</section>';
    });

    grille.innerHTML = html;
  }

  /** Une pastille de lot dans le plan. */
  function carreau(lot) {
    var libre = lot.statut === 'disponible';
    var choisi = estSelectionne(lot.id);
    var position = lot.numero.split('-').pop();
    var resume = lot.typologie.toUpperCase() + ' · ' + lot.numero + ' · ' +
      lot.surface + ' m² · ' + nombre(lot.prix) + ' ' + t('dh') + ' · ' + t(lot.statut);

    // Deux boutons cote a cote plutot qu'imbriques : un <button> ne peut pas
    // en contenir un autre, et la pastille reste la cible principale.
    return '<span class="nj-carreau-enveloppe">' +
      '<button type="button" class="nj-carreau nj-' + lot.statut +
      (choisi ? ' nj-choisi' : '') + '" data-id="' + lot.id +
      '" data-statut="' + lot.statut + '" title="' + resume + '" aria-label="' + resume +
      '" aria-pressed="' + (choisi ? 'true' : 'false') + '"' +
      (libre ? '' : ' disabled') + '>' +
      '<span class="nj-carreau-num">' + position + '</span>' +
      '<span class="nj-carreau-typo">' + lot.typologie.toUpperCase() + '</span>' +
      (choisi ? '<span class="nj-carreau-coche" aria-hidden="true">✓</span>' : '') +
      '</button>' +
      '<button type="button" class="nj-carreau-info" data-fiche="' + lot.id +
      '" title="' + t('detailsLot') + ' ' + lot.numero + '" aria-label="' +
      t('detailsLot') + ' ' + lot.numero + '">i</button>' +
      '</span>';
  }


  /* ── Maquette d'étage ─────────────────────────────────────────────────
     Le conseiller pose aujourd'hui une maquette physique sur son bureau et
     désigne l'appartement du doigt. On reproduit ce geste : une élévation
     d'immeuble où l'on choisit l'étage, puis le plateau de cet étage où
     chaque lot occupe une position cohérente avec son orientation réelle.

     La géométrie est déduite des données de la grille, sans plan importé :
     le jour où de vrais plans d'étage seront tracés, seule plateauSVG()
     changera, l'interaction et la sélection resteront identiques. */

  function nomEtage(niveau) {
    return niveau === 'RDC' ? t('rdcCourt') : 'R+' + niveau;
  }

  function parNumero(a, b) {
    return a.numero.localeCompare(b.numero, undefined, { numeric: true });
  }

  /* Légende des statuts, posée dans chaque immeuble (donc visible en plein
     écran). Mêmes couleurs que la légende globale, libellés traduits. */
  function legendeMaquetteHTML() {
    return '<p class="nj-legende nj-mq-legende">' +
      '<span><i style="background:var(--lot-dispo)"></i>' + t('disponible') + '</span>' +
      '<span><i style="background:var(--lot-optionne)"></i>' + t('optionne') + '</span>' +
      '<span><i style="background:var(--lot-reserve)"></i>' + t('reserve') + '</span>' +
      '<span><i style="background:var(--lot-vendu)"></i>' + t('vendu') + '</span>' +
      '</p>';
  }

  /* Contenu du panneau « Mes choix » de la maquette (sous la liste des
     niveaux). Reprend la sélection globale : jetons retirables + bouton vider. */
  function choixPanelHTML() {
    var choisis = etat.lots.filter(function (l) { return estSelectionne(l.id); });
    var tete = '<div class="nj-mq-choix-tete">' + t('selection') +
      ' <span class="nj-mq-choix-compte"><bdi dir="ltr">' + choisis.length + '/' +
      MAX_SELECTION + '</bdi></span></div>';
    if (!choisis.length) {
      return tete + '<p class="nj-mq-choix-vide">' + t('vide') + '</p>' + boutonBureauHTML();
    }

    /* Un lot à la fois. Empiler les trois choix ET leurs documents ferait un
       panneau de dix boutons minuscules ; le conseiller choisit le lot dans la
       liste déroulante, et les documents dessous ne concernent que celui-là,
       donc ils peuvent être grands — c'est ce qu'on vise sur la borne tactile. */
    var actif = choisis.filter(function (l) { return l.id === etat.choixActif; })[0] || choisis[0];
    etat.choixActif = actif.id;

    /* nombre() et non montant() : montant() enrobe le prix dans un <bdi>, que
       le contenu d'une <option> affiche tel quel — une <option> ne rend aucune
       balise. L'isolation bidirectionnelle du prix se perd, mais le sélecteur
       porte déjà la typologie et le numéro en tête, donc l'ordre reste lisible
       en arabe. */
    var options = choisis.map(function (l) {
      return '<option value="' + l.id + '"' + (l.id === actif.id ? ' selected' : '') + '>' +
        echapper(l.typologie.toUpperCase() + ' ' + l.numero + ' · ' +
                 nombre(l.prix) + ' ' + t('dh')) + '</option>';
    }).join('');

    var barre = '<div class="nj-mq-choix-barre">' +
      '<select class="nj-mq-choix-select" data-choix-actif="1" aria-label="' +
      t('selection') + '">' + options + '</select>' +
      '<button type="button" class="nj-mq-choix-x" data-retirer="' + actif.id +
      '" aria-label="' + t('retirer') + ' ' + echapper(actif.numero) + '">×</button></div>';

    /* Documents du lot affiché. La fiche vient en tête : c'est elle qui porte
       le prix et la surface, donc la première question du client. */
    var actions = '<button type="button" class="nj-media-btn nj-choix-voir" data-fiche="' +
      actif.id + '"><span aria-hidden="true">▤</span>' + t('detailsLot') + '</button>' +
      mediasDuLot(actif).join('');

    return tete + barre +
      '<div class="nj-mq-choix-actions">' + actions + '</div>' +
      boutonBureauHTML() +
      '<button type="button" class="nj-mq-choix-envoyer" data-envoyer-choix="1">' +
      t('suivant') + ' →</button>' +
      '<button type="button" class="nj-mq-choix-vider" data-vider-choix="1">' +
      t('viderSelection') + '</button>';
  }

  /* Bureau de vente. Le lien existait déjà en haut de page, mais le visiteur
     qui manipule la maquette l'a depuis longtemps quitté du regard : prendre
     rendez-vous doit rester à portée de doigt là où il choisit son logement. */
  function boutonBureauHTML() {
    var p = projetCourant();
    if (!p) return '';
    /* Dans la scène de la démo, la page est dans un cadre. bureaudevente.html
       ne connaît pas le mode embarqué : chargée dans le cadre, elle y
       empilerait son propre menu et son pied de page par-dessus ceux de la
       démo. On l'ouvre donc dans la fenêtre entière. */
    var cible = estEmbarque() ? ' target="_top"' : '';
    return '<a class="nj-mq-choix-bureau"' + cible + ' href="bureaudevente.html?id=' +
      encodeURIComponent(p.id) + '#' + langue() + '">' +
      '<span aria-hidden="true">🏢</span>' + t('visiterBureau') + '</a>';
  }

  /** La page est-elle affichée dans la scène de la démo (?embed) ? */
  function estEmbarque() {
    try { return new URLSearchParams(window.location.search).has('embed'); }
    catch (e) { return false; }
  }

  /* Rafraîchit tous les panneaux « Mes choix » présents dans les maquettes,
     sans reconstruire les sections (préserve le plein écran). */
  function majChoixMaquette() {
    document.querySelectorAll('.nj-mq-choix').forEach(function (el) {
      el.innerHTML = choixPanelHTML();
    });
  }

  /* Bouton « Vider » de la fiche, à côté d'« Ajouter à mes choix ». N'apparaît
     que si la sélection contient au moins un lot. Porte l'id du lot pour
     rouvrir la fiche à jour après le vidage. */
  function boutonViderFiche(lot) {
    if (!etat.selection.length) return '';
    return '<button type="button" class="nj-fiche-vider" data-vider-choix="' + lot.id + '">' +
      t('viderSelection') + '</button>';
  }

  /* Change l'étage affiché SANS reconstruire la section : on ne remplace que le
     plateau et l'état actif des boutons. Reconstruire toute la maquette
     (innerHTML) détruisait la section agrandie et faisait sortir du plein
     écran à chaque changement d'étage. */
  /**
   * Inscrit l'immeuble et l'étage regardés dans l'URL.
   *
   * Sans cela, partir vers le bureau de vente puis revenir en arrière ramenait
   * la maquette à son état par défaut — dernier étage du premier immeuble —
   * alors que le visiteur avait quitté, par exemple, le R+3 de l'immeuble A.
   * replaceState : on corrige l'entrée courante, on n'en empile pas une
   * nouvelle à chaque changement d'étage (le bouton Retour resterait coincé).
   */
  function memoriserVue(imm, niveau) {
    try {
      var params = new URLSearchParams(window.location.search);
      if (etat.projet) params.set('projet', etat.projet);
      params.set('imm', imm);
      params.set('etage', niveau);
      history.replaceState({}, '', 'disponibilites.html?' + params.toString() +
        window.location.hash);
    } catch (e) { /* URL non modifiable : la page reste utilisable */ }
  }

  function majEtage(imm, niveau) {
    var sel = (window.CSS && CSS.escape) ? CSS.escape(imm) : imm;
    var section = document.querySelector('.nj-mq-imm[data-imm="' + sel + '"]');
    if (!section) { rendreMaquette(); return; }

    var niveaux = {};
    etat.lots.forEach(function (lot) {
      if ((lot.immeuble || '—') !== imm) return;
      (niveaux[lot.niveau] = niveaux[lot.niveau] ||
        { ordre: lot.niveau_ordre, lots: [] }).lots.push(lot);
    });
    if (!niveaux[niveau]) { rendreMaquette(); return; }

    etat.etage[imm] = niveau;
    memoriserVue(imm, niveau);
    section.querySelectorAll('.nj-mq-etage').forEach(function (b) {
      var actif = b.getAttribute('data-etage') === niveau;
      b.classList.toggle('is-active', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    var plateau = section.querySelector('.nj-mq-plateau');
    if (plateau) {
      plateau.innerHTML = plateauOuPlan(niveaux[niveau].lots);
      section.querySelectorAll('.nj-mq-reel').forEach(activerNavigationPlan);
      // En plein écran, le nouvel étage doit s'afficher cadré comme l'ancien.
      if (document.fullscreenElement) {
        section.querySelectorAll('.nj-mq-reel').forEach(recadrerPlan);
      }
    }
  }

  function rendreMaquette() {
    var grille = document.getElementById('njGrille');
    if (!etat.lots.length) {
      grille.innerHTML = '<p class="nj-vide"><strong>' + t('aucun') + '</strong><br>' +
        t('aucunAide') + '</p>';
      return;
    }

    var groupes = {};
    etat.lots.forEach(function (lot) {
      var g = lot.immeuble || '—';
      groupes[g] = groupes[g] || {};
      (groupes[g][lot.niveau] = groupes[g][lot.niveau] ||
        { ordre: lot.niveau_ordre, lots: [] }).lots.push(lot);
    });

    var html = '<p class="nj-mq-aide">' + t('maquetteAide') + '</p>';

    Object.keys(groupes).sort().forEach(function (imm) {
      var niveaux = groupes[imm];
      // Du dernier étage vers le bas : on lit l'élévation comme la maquette.
      var ordres = Object.keys(niveaux).sort(function (a, b) {
        return niveaux[b].ordre - niveaux[a].ordre;
      });
      // Un filtre a pu faire disparaître l'étage retenu : on retombe alors
      // sur le plus haut encore présent.
      if (ordres.indexOf(etat.etage[imm]) === -1) etat.etage[imm] = ordres[0];
      var courant = etat.etage[imm];

      var tousLots = ordres.reduce(function (acc, n) {
        return acc.concat(niveaux[n].lots);
      }, []);
      var libres = tousLots.filter(function (l) { return l.statut === 'disponible'; }).length;
      var pct = Math.round(libres / tousLots.length * 100);

      html += '<section class="nj-mq-imm" data-imm="' + echapper(imm) + '">' +
        // Visible seulement en plein écran (CSS) : le bouton d'agrandissement
        // reste, lui, en haut de page, hors de la section agrandie.
        '<button type="button" class="nj-mq-sortie" data-agrandir="">✕ ' +
          t('quitterPleinEcran') + '</button>' +
        '<header class="nj-plan-tete">' +
          '<h2>' + t('immeuble') + ' ' + echapper(imm) + '</h2>' +
          '<span class="nj-plan-compte"><bdi dir="ltr">' + libres + '/' + tousLots.length +
          '</bdi> ' + t('libres') + '</span>' +
          '<span class="nj-plan-jauge" role="img" aria-label="' + pct + '%">' +
            '<span style="width:' + pct + '%"></span></span>' +
        '</header>' +
        legendeMaquetteHTML() +
        '<div class="nj-mq-corps">' +
          '<div class="nj-mq-colonne">' +
            '<div class="nj-mq-etages" role="group" aria-label="' + t('etage') + '">' +
              ordres.map(function (n) {
                var l = niveaux[n].lots;
                var lib = l.filter(function (x) { return x.statut === 'disponible'; }).length;
                var p = Math.round(lib / l.length * 100);
                var actif = n === courant;
                return '<button type="button" class="nj-mq-etage' + (actif ? ' is-active' : '') +
                  '" data-etage="' + echapper(n) + '" data-imm="' + echapper(imm) +
                  '" aria-pressed="' + (actif ? 'true' : 'false') + '">' +
                  '<span class="nj-mq-etage-nom">' + nomEtage(n) + '</span>' +
                  '<span class="nj-mq-etage-note"><bdi dir="ltr">' + lib + '/' + l.length +
                  '</bdi> ' + t('libres') + '</span>' +
                  '<span class="nj-mq-etage-jauge"><span style="width:' + p + '%"></span></span>' +
                  '</button>';
              }).join('') +
            '</div>' +
            // « Mes choix » sous la liste des niveaux : reste visible en plein
            // écran (la barre du bas, hors de la section agrandie, ne l'est pas).
            '<div class="nj-mq-choix">' + choixPanelHTML() + '</div>' +
          '</div>' +
          '<div class="nj-mq-plateau">' + plateauOuPlan(niveaux[courant].lots) + '</div>' +
        '</div>' +
      '</section>';
    });

    grille.innerHTML = html;
    // Les plans réels viennent d'être injectés : on leur greffe le zoom.
    grille.querySelectorAll('.nj-mq-reel').forEach(activerNavigationPlan);

    // Retour depuis le bureau de vente : ramener sous les yeux l'immeuble
    // quitté. Une seule fois — ensuite le visiteur navigue librement.
    if (immARevoir) {
      var sel = (window.CSS && CSS.escape) ? CSS.escape(immARevoir) : immARevoir;
      var cible = grille.querySelector('.nj-mq-imm[data-imm="' + sel + '"]');
      immARevoir = null;
      if (cible) cible.scrollIntoView({ block: 'start' });
    }
  }

  function arr(v) { return Math.round(v * 10) / 10; }

  /**
   * Le plateau schématique est un pis-aller : il reconstitue une disposition
   * plausible à partir des surfaces, faute de plan tracé. Dès qu'un plan
   * d'architecte a été découpé dans le back-office, on montre le vrai.
   *
   * Le basculement est décidé étage par étage : un immeuble peut avoir ses
   * étages courants tracés et pas son rez-de-chaussée, cas d'Andalusia où les
   * commerces n'ont pas encore de plan.
   */
  function plateauOuPlan(lotsEtage) {
    if (!etat.zones) return plateauSVG(lotsEtage);

    var traces = lotsEtage.filter(function (l) { return etat.zones[l.numero]; });
    // Un seul contour sur huit ne fait pas un plan lisible : sous la moitié,
    // le plateau schématique reste plus honnête qu'un plan à trous.
    if (traces.length < Math.max(2, Math.ceil(lotsEtage.length / 2))) {
      return plateauSVG(lotsEtage);
    }

    var chemin = etat.zones[traces[0].numero].plan;
    var dim = (etat.plansZones || {})[chemin];
    if (!dim || !dim.largeur || !dim.hauteur) return plateauSVG(lotsEtage);

    return planReelSVG(traces, chemin, dim);
  }

  /**
   * Le plan d'architecte, surchargé des contours cliquables.
   *
   * Même structure que lotSVG (classe nj-mq-lot, data-id, data-fiche) : la
   * délégation d'événements, la sélection et la fiche fonctionnent sans une
   * ligne de plus.
   */
  function planReelSVG(lots, chemin, dim) {
    var svg = '<svg viewBox="0 0 ' + dim.largeur + ' ' + dim.hauteur + '" ' +
      'class="nj-mq-reel" role="group" aria-label="' + t('plan') + '">' +
      '<image href="' + echapper(versionne(chemin)) + '" x="0" y="0" width="' +
      dim.largeur + '" height="' + dim.hauteur + '" preserveAspectRatio="none"/>';

    lots.forEach(function (lot) {
      var pts = etat.zones[lot.numero].points;
      var choisi = estSelectionne(lot.id);
      var libre = lot.statut === 'disponible';
      var position = lot.numero.split('-').pop();
      var resume = lot.typologie.toUpperCase() + ' · ' + lot.numero + ' · ' +
        lot.surface + ' m² · ' + nombre(lot.prix) + ' ' + t('dh') + ' · ' + t(lot.statut);

      var cx = 0, cy = 0;
      pts.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= pts.length; cy /= pts.length;

      svg += '<g class="nj-mq-lot nj-' + lot.statut + (choisi ? ' nj-choisi' : '') +
        '" data-id="' + lot.id + '" data-statut="' + lot.statut + '"' +
        (libre ? ' role="button" tabindex="0" aria-pressed="' + (choisi ? 'true' : 'false') + '"'
               : ' role="img"') +
        ' aria-label="' + echapper(resume) + '">' +
        '<title>' + echapper(resume) + '</title>' +
        '<polygon class="nj-mq-forme" points="' +
        pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>' +
        '<text class="nj-mq-num" x="' + arr(cx) + '" y="' + arr(cy - 4) +
        '" text-anchor="middle">' + echapper(position) + '</text>' +
        '<text class="nj-mq-info" x="' + arr(cx) + '" y="' + arr(cy + 22) +
        '" text-anchor="middle">' + lot.typologie.toUpperCase() + ' · ' + lot.surface + ' m²</text>';

      // Pastille d'information : ouvre la fiche sans toucher à la sélection.
      svg += '<g class="nj-mq-info-btn" role="button" tabindex="0" data-fiche="' + lot.id +
        '" aria-label="' + t('detailsLot') + ' ' + echapper(lot.numero) + '">' +
        '<circle cx="' + arr(cx + 62) + '" cy="' + arr(cy - 34) + '" r="15"/>' +
        '<text x="' + arr(cx + 62) + '" y="' + arr(cy - 27) + '" text-anchor="middle">i</text></g>';

      if (choisi) {
        svg += '<g class="nj-mq-coche" aria-hidden="true">' +
          '<circle cx="' + arr(cx - 62) + '" cy="' + arr(cy - 34) + '" r="15"/>' +
          '<text x="' + arr(cx - 62) + '" y="' + arr(cy - 27) + '" text-anchor="middle">✓</text></g>';
      }
      svg += '</g>';
    });

    return svg + '</svg>' +
      '<p class="nj-mq-plan-aide">' + t('planZoomAide') + '</p>';
  }

  /**
   * Dessine le plateau d'un étage.
   *
   * Les lots traversants et d'angle tiennent toute la profondeur et se
   * placent aux extrémités ; les autres se répartissent de part et d'autre
   * d'un couloir, côté rue en haut, côté cour en bas. Les largeurs sont
   * proportionnelles aux surfaces : le plateau reste donc juste, même sans
   * plan d'architecte tracé.
   */
  function plateauSVG(lotsEtage) {
    var W = 1000, H = 360;
    var x0 = 18, x1 = W - 18, y0 = 34, y1 = H - 34;
    var LARG = x1 - x0, PROF = y1 - y0;
    var hCouloir = 58;             // largeur du couloir de distribution

    var pleins = [], haut = [], bas = [];
    lotsEtage.slice().sort(parNumero).forEach(function (l) {
      var o = l.orientation;
      if (o === 'double' || o === 'angle') pleins.push(l);
      else if (o === 'cour' || o === 'jardin') bas.push(l);
      else haut.push(l);
    });
    // Deux extrémités seulement : le surplus rejoint la rangée la plus creuse.
    while (pleins.length > 2) {
      (haut.length <= bas.length ? haut : bas).push(pleins.pop());
    }

    var surf = function (l) { return Math.max(1, l.surface || 1); };
    var somme = function (tab) {
      return tab.reduce(function (a, l) { return a + surf(l); }, 0);
    };

    var blocs = [];
    var couloir = null;

    if (!haut.length && !bas.length) {
      // Que des traversants : ils se partagent toute la profondeur.
      var tt = somme(pleins), cx = x0;
      pleins.forEach(function (l) {
        var w = LARG * surf(l) / tt;
        blocs.push({ lot: l, x: cx, y: y0, w: w, h: PROF });
        cx += w;
      });
    } else {
      var g = pleins[0] || null, d = pleins[1] || null;
      var sH = somme(haut), sB = somme(bas);

      /* Les deux rangées bordent le même couloir : elles ont donc forcément
         la même longueur. Ce qui varie pour respecter les surfaces, c'est
         leur PROFONDEUR — exactement comme dans un immeuble réel, où le côté
         qui totalise moins de surface est simplement moins profond.

         Une fois les profondeurs fixées, il existe un facteur d'échelle k
         unique tel que chaque rectangle ait une aire proportionnelle à sa
         surface : largeur = k × surface / profondeur du bloc. */
      var hUtile = PROF - hCouloir;
      var hHaut = Math.round(hUtile * sH / (sH + sB));
      // Garde-fou : une rangée très déséquilibrée ne doit pas devenir un
      // filet illisible. On accepte alors une légère entorse à l'échelle.
      hHaut = Math.max(72, Math.min(hUtile - 72, hHaut));
      var hBas = hUtile - hHaut;

      var denom = (g ? surf(g) / PROF : 0) + (d ? surf(d) / PROF : 0) + sH / hHaut;
      var k = LARG / denom;
      var wG = g ? k * surf(g) / PROF : 0;
      var wD = d ? k * surf(d) / PROF : 0;
      var wMid = LARG - wG - wD;

      if (g) blocs.push({ lot: g, x: x0, y: y0, w: wG, h: PROF });
      if (d) blocs.push({ lot: d, x: x1 - wD, y: y0, w: wD, h: PROF });

      var xMid = x0 + wG;
      if (!bas.length || !haut.length) {
        // Une seule rangée occupée : elle prend toute la profondeur, inutile
        // de dessiner un couloir qui ne dessert rien.
        var seule = haut.length ? haut : bas;
        var ss = somme(seule), cxS = xMid;
        seule.forEach(function (l) {
          var w = wMid * surf(l) / ss;
          blocs.push({ lot: l, x: cxS, y: y0, w: w, h: PROF });
          cxS += w;
        });
      } else {
        var cxH = xMid;
        haut.forEach(function (l) {
          var w = wMid * surf(l) / sH;
          blocs.push({ lot: l, x: cxH, y: y0, w: w, h: hHaut });
          cxH += w;
        });
        var cxB = xMid;
        bas.forEach(function (l) {
          var w = wMid * surf(l) / sB;
          blocs.push({ lot: l, x: cxB, y: y1 - hBas, w: w, h: hBas });
          cxB += w;
        });
        couloir = { x: xMid, y: y0 + hHaut, w: wMid, h: hCouloir };
      }
    }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      t('vueMaquette') + '">' +
      '<rect class="nj-mq-dalle" x="' + x0 + '" y="' + y0 + '" width="' + LARG +
      '" height="' + PROF + '" rx="6"/>';

    if (couloir) {
      svg += '<rect class="nj-mq-couloir" x="' + arr(couloir.x) + '" y="' + arr(couloir.y) +
        '" width="' + arr(couloir.w) + '" height="' + arr(couloir.h) + '"/>';
      // Noyau escalier / ascenseur au centre du couloir.
      var nw = Math.min(96, couloir.w * 0.22);
      if (nw > 40) {
        var nx = couloir.x + (couloir.w - nw) / 2, ny = couloir.y + 6, nh = couloir.h - 12;
        svg += '<rect class="nj-mq-noyau" x="' + arr(nx) + '" y="' + arr(ny) +
          '" width="' + arr(nw) + '" height="' + arr(nh) + '" rx="3"/>';
        for (var i = 1; i <= 4; i++) {
          var ly = ny + nh * i / 5;
          svg += '<line x1="' + arr(nx + 6) + '" y1="' + arr(ly) + '" x2="' +
            arr(nx + nw - 6) + '" y2="' + arr(ly) +
            '" stroke="var(--surface)" stroke-width="2"/>';
        }
      }
    }

    blocs.forEach(function (b) { svg += lotSVG(b); });

    // Repères de lecture : quel côté donne sur la rue, quel côté sur la cour.
    if (couloir) {
      svg += '<text class="nj-mq-cote" x="' + x0 + '" y="22">' + t('rue') + '</text>' +
        '<text class="nj-mq-cote" x="' + x0 + '" y="' + (H - 8) + '">' + t('cour') + '</text>';
    }
    return svg + '</svg>';
  }

  /** Un lot dans le plateau : rectangle, libellés, pastille d'info. */
  function lotSVG(b) {
    var lot = b.lot;
    var choisi = estSelectionne(lot.id);
    var position = lot.numero.split('-').pop();
    var resume = lot.typologie.toUpperCase() + ' · ' + lot.numero + ' · ' +
      lot.surface + ' m² · ' + nombre(lot.prix) + ' ' + t('dh') +
      ' · ' + t(lot.statut);
    var libre = lot.statut === 'disponible';
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    var pad = 3;

    var s = '<g class="nj-mq-lot nj-' + lot.statut + (choisi ? ' nj-choisi' : '') +
      '" data-id="' + lot.id + '" data-statut="' + lot.statut + '"' +
      (libre ? ' role="button" tabindex="0" aria-pressed="' + (choisi ? 'true' : 'false') + '"'
             : ' role="img"') +
      ' aria-label="' + echapper(resume) + '">' +
      '<title>' + echapper(resume) + '</title>' +
      '<rect class="nj-mq-fond" x="' + arr(b.x + pad) + '" y="' + arr(b.y + pad) +
      '" width="' + arr(Math.max(2, b.w - 2 * pad)) + '" height="' +
      arr(Math.max(2, b.h - 2 * pad)) + '" rx="5"/>';

    if (b.w > 56) {
      // « F3 · 84 m² » tient sur une ligne dès 118 px. En dessous, un bloc
      // assez haut (typiquement un traversant d'extrémité) reste informatif
      // en empilant le type puis la surface, plutôt que de n'afficher qu'un
      // numéro que le client ne peut pas interpréter.
      var large = b.w > 118 && b.h > 74;
      var empile = !large && b.w > 62 && b.h > 130;
      s += '<text class="nj-mq-num" x="' + arr(cx) + '" y="' +
        arr(large ? cy - 2 : (empile ? cy - 12 : cy + 9)) +
        '" text-anchor="middle">' + echapper(position) + '</text>';
      if (large) {
        s += '<text class="nj-mq-info" x="' + arr(cx) + '" y="' + arr(cy + 20) +
          '" text-anchor="middle">' + lot.typologie.toUpperCase() + ' · ' +
          lot.surface + ' m²</text>';
      } else if (empile) {
        s += '<text class="nj-mq-info" x="' + arr(cx) + '" y="' + arr(cy + 10) +
          '" text-anchor="middle">' + lot.typologie.toUpperCase() + '</text>' +
          '<text class="nj-mq-info" x="' + arr(cx) + '" y="' + arr(cy + 28) +
          '" text-anchor="middle">' + lot.surface + ' m²</text>';
      }
    }

    // Pastille d'information : ouvre la fiche sans toucher à la sélection.
    if (b.w > 72 && b.h > 66) {
      var ix = b.x + b.w - 20, iy = b.y + 20;
      s += '<g class="nj-mq-info-btn" role="button" tabindex="0" data-fiche="' + lot.id +
        '" aria-label="' + t('detailsLot') + ' ' + echapper(lot.numero) + '">' +
        '<circle cx="' + arr(ix) + '" cy="' + arr(iy) + '" r="13"/>' +
        '<text x="' + arr(ix) + '" y="' + arr(iy + 6) + '" text-anchor="middle">i</text></g>';
    }
    if (choisi && b.w > 72) {
      var kx = b.x + 20, ky = b.y + 20;
      s += '<g class="nj-mq-coche" aria-hidden="true">' +
        '<circle cx="' + arr(kx) + '" cy="' + arr(ky) + '" r="13"/>' +
        '<text x="' + arr(kx) + '" y="' + arr(ky + 6) + '" text-anchor="middle">✓</text></g>';
    }
    return s + '</g>';
  }


  /* ── Plein écran et navigation au doigt sur le plan ──────────────────────
     Devant un client, sur la borne du bureau de vente, le plan doit occuper
     l'écran entier : c'est le geste central de la démonstration. On agrandit
     la section de l'immeuble — plan ET sélecteur d'étages — pour qu'on puisse
     continuer à circuler dans le bâtiment sans en sortir. */

  /**
   * L'immeuble que le visiteur regarde : celui dont le haut est le plus proche
   * du sommet de la fenêtre. Avec trois immeubles empilés, agrandir bêtement le
   * premier renverrait ailleurs quelqu'un descendu jusqu'au C.
   */
  function immeubleEnVue() {
    var sections = document.querySelectorAll('.nj-mq-imm');
    if (!sections.length) return null;
    var meilleur = sections[0], ecart = Infinity;
    for (var i = 0; i < sections.length; i++) {
      var d = Math.abs(sections[i].getBoundingClientRect().top);
      if (d < ecart) { ecart = d; meilleur = sections[i]; }
    }
    return meilleur;
  }

  /**
   * Le plein écran n'existe que pour la maquette : en vue Plan ou Liste, le
   * bouton n'aurait aucune cible. On le retire plutôt que de le laisser inerte.
   */
  function majBoutonPleinMaquette() {
    var b = document.getElementById('njPleinEcran');
    if (b) b.hidden = !document.querySelector('.nj-mq-imm');
  }

  function basculerPleinEcran(section) {
    if (!section) return;
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (section.requestFullscreen) section.requestFullscreen();
    else if (section.webkitRequestFullscreen) section.webkitRequestFullscreen();
  }

  document.addEventListener('fullscreenchange', function () {
    var plein = !!document.fullscreenElement;
    document.querySelectorAll('[data-agrandir]').forEach(function (b) {
      b.textContent = (plein ? '✕ ' + t('quitterPleinEcran') : '⛶ ' + t('pleinEcran'));
    });
    majLibellePlein();   // même bascule, pour la fenêtre de consultation
    // Le plan reprend son cadrage entier : on ne veut pas entrer en plein
    // écran sur un détail zoomé de la vue précédente.
    document.querySelectorAll('.nj-mq-reel').forEach(recadrerPlan);
  });

  /**
   * Zoom et déplacement du plan, au doigt comme à la souris.
   *
   * Même mécanique que l'éditeur d'admin : le viewBox du SVG porte les
   * coordonnées de l'image d'origine, on ne déplace donc qu'une fenêtre de
   * lecture. Le cadrage est borné à l'image — sans quoi, en dézoomant ou en
   * poussant sur un bord, le client se retrouve devant du vide.
   *
   * Le tap reste réservé à la sélection du lot : c'est le geste utile ici, et
   * la délégation de clic existante s'en charge. Seul un vrai glissement
   * déplace le plan.
   */
  function recadrerPlan(svg) {
    if (svg.njRecadrer) { svg.njRecadrer(); return; }
    var vb = svg.getAttribute('data-vb0');
    if (!vb) return;
    svg.setAttribute('viewBox', vb);
  }

  function activerNavigationPlan(svg) {
    if (svg.dataset.nav === '1') return;      // déjà équipé
    svg.dataset.nav = '1';

    var d = svg.viewBox.baseVal;
    var LARG = d.width, HAUT = d.height;
    svg.setAttribute('data-vb0', '0 0 ' + LARG + ' ' + HAUT);
    var vue = { x: 0, y: 0, w: LARG, h: HAUT };
    var ZOOM_MAX = 6;

    /* Aspect réel de l'élément à l'écran. En mode scène ou en plein écran, le
       SVG est étiré à la hauteur du panneau : son aspect ne suit plus celui de
       l'image, et cadrer l'image entière laissait le plan flotter au centre,
       entre deux bandes vides. Le cadrage « entier » est donc la plus grande
       fenêtre DE CET ASPECT qui tienne dans l'image (remplissage « cover ») :
       le plan occupe tout le panneau, le glissement montre le reste. Sur la
       page normale, l'élément suit l'aspect de l'image : rien ne change. */
    function ratioEcran() {
      var r = svg.getBoundingClientRect();
      return (r.width > 1 && r.height > 1) ? r.height / r.width : HAUT / LARG;
    }
    function largeurMax() { return Math.min(LARG, HAUT / ratioEcran()); }
    function cadrageEntier() {
      var w = largeurMax(), h = w * ratioEcran();
      return { x: (LARG - w) / 2, y: (HAUT - h) / 2, w: w, h: h };
    }

    // Redondant avec la feuille de style, mais posé aussi ici : si la règle
    // CSS ne s'applique pas, le navigateur s'approprie le pincement et nos
    // gestes ne voient jamais le second doigt.
    svg.style.touchAction = 'none';

    function appliquer() {
      vue.w = Math.max(LARG / ZOOM_MAX, Math.min(largeurMax(), vue.w));
      vue.h = vue.w * ratioEcran();
      vue.x = Math.max(0, Math.min(LARG - vue.w, vue.x));
      vue.y = Math.max(0, Math.min(HAUT - vue.h, vue.y));
      svg.setAttribute('viewBox', vue.x + ' ' + vue.y + ' ' + vue.w + ' ' + vue.h);
    }
    function versImage(clientX, clientY) {
      var r = svg.getBoundingClientRect();
      return { x: vue.x + (clientX - r.left) / r.width * vue.w,
               y: vue.y + (clientY - r.top) / r.height * vue.h };
    }

    /* ── Doigt : Touch Events ────────────────────────────────────────────
       Les Pointer Events sont plus modernes, mais sur les écrans tactiles
       Windows le second doigt n'arrivait pas de façon fiable tant qu'un
       premier geste ne l'avait pas « réveillé » — d'où un pincement qui ne
       marchait qu'après un zoom à la souris. Les Touch Events donnent la
       liste complète des contacts à chaque événement : plus de second doigt
       manquant. La souris garde son propre chemin, plus bas. */
    var pince = null;    // instantané pris au début du pincement
    var glisse = null;   // déplacement à un doigt
    /* Pas de garde-fou « un glissement ne doit pas sélectionner le lot
       d'arrivée » : il n'a pas lieu d'être, et c'est lui qui volait le premier
       clic sur la pastille « i ».

       Au doigt, le preventDefault() du touchmove supprime déjà le clic
       synthétisé pour ce geste. À la souris, un glissement part d'un élément
       et finit sur un autre : aucun clic n'est émis. Le seul cas restant — un
       glissement qui revient exactement sur son point de départ — est si rare
       et si inoffensif qu'il ne justifiait pas d'intercepter tous les clics du
       plan pour l'attraper. */
    var dernierToucher = 0;   // horodate le dernier contact, voir la souris

    function ecart(t) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    svg.addEventListener('touchstart', function (e) {
      dernierToucher = Date.now();
      var t = e.touches;
      if (t.length >= 2) {
        var c = versImage((t[0].clientX + t[1].clientX) / 2,
                          (t[0].clientY + t[1].clientY) / 2);
        pince = { d: ecart(t) || 1, cx: c.x, cy: c.y,
                  x: vue.x, y: vue.y, w: vue.w, h: vue.h };
        glisse = null;
      } else if (t.length === 1) {
        pince = null;
        glisse = { x: t[0].clientX, y: t[0].clientY };
      }
    }, { passive: true });

    svg.addEventListener('touchmove', function (e) {
      dernierToucher = Date.now();
      var t = e.touches;
      if (pince && t.length >= 2) {
        var ratio = ecart(t) / pince.d;
        var w = Math.max(LARG / ZOOM_MAX, Math.min(largeurMax(), pince.w / ratio));
        var h = w * ratioEcran();
        // Recalculé depuis l'instantané de départ, jamais de proche en
        // proche : sinon les arrondis font dériver le plan sous les doigts.
        vue.x = pince.cx - (pince.cx - pince.x) * (w / pince.w);
        vue.y = pince.cy - (pince.cy - pince.y) * (h / pince.h);
        vue.w = w; vue.h = h;
        appliquer();
        e.preventDefault();
        return;
      }
      if (glisse && t.length === 1 && vue.w < LARG) {
        // Déplacement seulement une fois zoomé : au cadrage entier il n'y a
        // rien à faire glisser, et un glissement parasite empêcherait de
        // choisir un logement d'une simple touche.
        var dx = t[0].clientX - glisse.x, dy = t[0].clientY - glisse.y;
        if (!glisse.actif && Math.hypot(dx, dy) < 8) return;
        glisse.actif = true;
        var r = svg.getBoundingClientRect();
        vue.x -= dx * (vue.w / r.width);
        vue.y -= dy * (vue.h / r.height);
        // On met à jour le point de référence sans recréer l'objet : le
        // remplacer perdrait `actif`, et le seuil de 8 px repartirait de zéro
        // à chaque mouvement — un glissement lent ne démarrerait jamais.
        glisse.x = t[0].clientX; glisse.y = t[0].clientY;
        appliquer();
        e.preventDefault();
      }
    }, { passive: false });

    svg.addEventListener('touchend', function (e) {
      dernierToucher = Date.now();
      if (!e.touches.length) { pince = null; glisse = null; }
    }, { passive: true });

    /* ── Souris ──────────────────────────────────────────────────────────
       Après un tap, le navigateur rejoue la séquence en souris pour les pages
       qui ne connaissent que la souris : mousedown, souvent un mousemove d'un
       pixel, mouseup, click. Ce mousemove fantôme passait pour un
       déplacement, levait le drapeau anti-glissement, et le clic qui suivait
       — celui de la pastille « i » — se faisait avaler. D'où deux touches
       nécessaires pour ouvrir la fiche.

       On ignore donc la souris juste après un contact tactile, et on exige un
       vrai déplacement avant de considérer qu'il y a glissement. */
    var SOURIS_APRES_DOIGT = 700;   // ms
    var sourisDepart = null;

    function sourisSynthetique() { return Date.now() - dernierToucher < SOURIS_APRES_DOIGT; }

    svg.addEventListener('mousedown', function (e) {
      if (sourisSynthetique()) return;
      if (e.button !== 0 || vue.w >= LARG) return;
      sourisDepart = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    });
    window.addEventListener('mousemove', function (e) {
      if (!sourisDepart || sourisSynthetique()) return;
      var r = svg.getBoundingClientRect();
      vue.x -= (e.clientX - sourisDepart.x) * (vue.w / r.width);
      vue.y -= (e.clientY - sourisDepart.y) * (vue.h / r.height);
      sourisDepart.x = e.clientX; sourisDepart.y = e.clientY;
      appliquer();
    });
    window.addEventListener('mouseup', function () { sourisDepart = null; });

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var c = versImage(e.clientX, e.clientY);
      var f = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      var w = Math.max(LARG / ZOOM_MAX, Math.min(largeurMax(), vue.w / f));
      var h = w * ratioEcran();
      vue.x = c.x - (c.x - vue.x) * (w / vue.w);
      vue.y = c.y - (c.y - vue.y) * (h / vue.h);
      vue.w = w; vue.h = h;
      appliquer();
    }, { passive: false });

    svg.addEventListener('dblclick', function () {
      vue = cadrageEntier();
      appliquer();
    });

    /* Recadrage extérieur (redimensionnement, changement d'étage en plein
       écran, mode scène) : repartir du cadrage entier de l'aspect COURANT. */
    svg.njRecadrer = function () { vue = cadrageEntier(); appliquer(); };

    vue = cadrageEntier();
    appliquer();   // le viewBox vient désormais de l'état JS, dès le départ

    /* Au premier rendu, l'élément n'est parfois pas encore mesurable (le
       panneau étiré n'a pas sa taille) : le cadrage retombe sur l'aspect de
       l'image, d'où un plan flottant au centre. On recadre à la frame
       suivante, une fois la mise en page stabilisée — aucune interaction ne
       peut s'être glissée entre-temps. */
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      if (svg.isConnected) { vue = cadrageEntier(); appliquer(); }
    }); });
  }

  /** Bascule entre la façade, la maquette et les cartes détaillées. */
  function changerVue(vue) {
    if (['plan', 'maquette', 'liste'].indexOf(vue) === -1) return;
    etat.vue = vue;
    try { localStorage.setItem('nj-vue-lots', vue); } catch (e) {}
    document.querySelectorAll('[data-vue]').forEach(function (b) {
      var actif = b.dataset.vue === vue;
      b.classList.toggle('is-active', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    // La maquette porte désormais sa propre légende sous le titre de chaque
    // immeuble : on masque la légende globale pour ne pas la doubler.
    var legGlobale = document.getElementById('njLegende');
    if (legGlobale) legGlobale.style.display = (vue === 'maquette') ? 'none' : '';
    afficherLots();
  }

  /** Rend la vue courante. */
  function afficherLots() {
    var compteur = document.getElementById('njCompteur');
    compteur.textContent = etat.lots.length + ' ' +
      (etat.lots.length > 1 ? t('resultats') : t('resultat'));
    if (etat.vue === 'plan') rendrePlan();
    else if (etat.vue === 'maquette') rendreMaquette();
    else rendreLots();
    majBoutonPleinMaquette();   // la vue vient peut-être de changer
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
                 ' · ' + montant(l.prix) + ' ' + t('dh') +
                 boutonVoirChoix(l, 'nj-jeton-voir') +
                 '<button type="button" class="nj-jeton-x" data-retirer="' + l.id +
                 '" aria-label="' + t('retirer') + ' ' + l.numero + '">×</button></span>';
        }).join('');
    document.getElementById('njSuivant').disabled = n === 0;
    var vider = document.getElementById('njVider');
    if (vider) vider.hidden = n === 0;
  }

  /** Vide toute la sélection en une fois (mise à jour en place : préserve le
      plein écran de la maquette). */
  function viderSelection() {
    if (!etat.selection.length) return;
    var ids = etat.selection.slice();
    etat.selection = [];
    enregistrerSelection();
    ids.forEach(majCarte);   // retire les anneaux/coches des lots concernés
    rendreBarreSelection();
    majChoixMaquette();
  }

  /** Envoie la sélection : passe à l'étape « Ma sélection » (comparatif puis
      mise en relation). Le canal éventuel est repris tel quel. */
  function envoyerChoix() {
    if (!etat.selection.length) return;
    var canal = new URLSearchParams(window.location.search).get('canal');
    /* En mode scène, ce bouton est le SEUL chemin vers la fiche contact : le
       bandeau du bas est masqué par .nj-embed. On propage donc le mode, sinon
       ma-selection.html s'afficherait dans le cadre avec son menu et son pied
       de page complets, au milieu de la démo. */
    window.location.href = 'ma-selection.html?projet=' + encodeURIComponent(etat.projet) +
      (canal ? '&canal=' + encodeURIComponent(canal) : '') +
      (estEmbarque() ? '&embed=1' : '');
  }

  /* ── Démarrage ─────────────────────────────────────────────────────── */

  /**
   * Remplit le sélecteur avec les douze projets du site, et pas seulement
   * ceux qui ont une grille : le visiteur doit voir toute l'offre, et savoir
   * qu'un projet existe même si ses lots ne sont pas encore saisis.
   */
  function rendreSelecteurProjets() {
    var select = document.getElementById('fProjet');
    var lang = langue();
    var projets = (window.PROJECTS || []).slice().sort(function (a, b) {
      return menuText(a.name, lang).localeCompare(menuText(b.name, lang));
    });

    select.innerHTML = projets.map(function (p) {
      var pret = etat.avecDonnees ? etat.avecDonnees.indexOf(p.id) !== -1 : true;
      return '<option value="' + p.id + '"' + (p.id === etat.projet ? ' selected' : '') + '>' +
        menuText(p.name, lang) + (pret ? '' : ' — ' + t('enPreparation')) + '</option>';
    }).join('');
  }

  /** Le projet choisi n'a pas encore de grille : on le dit, sans page vide. */
  function afficherEnPreparation() {
    var lang = langue();
    document.getElementById('njCompteur').textContent = '';
    document.getElementById('njLegende').innerHTML = '';
    document.getElementById('njGrille').innerHTML =
      '<div class="nj-vide nj-attente">' +
        '<p><strong>' + t('enPreparationTitre') + '</strong></p>' +
        '<p>' + t('enPreparationAide') + '</p>' +
        '<p class="nj-attente-liens">' +
          '<a class="nj-choix-lien" href="project.html?id=' + encodeURIComponent(etat.projet) +
          '#' + lang + '">' + t('voirFiche') + '</a>' +
          '<a class="nj-choix-lien" href="contact.html#' + lang + '">' + t('contacter') + '</a>' +
        '</p>' +
      '</div>';
    // Les filtres n'ont rien à filtrer : on les masque plutôt que de les
    // laisser vides et cliquables.
    basculerFiltres(false);
  }

  /** Montre ou cache les filtres, selon qu'il y a une grille à filtrer. */
  function basculerFiltres(visible) {
    var champs = document.querySelectorAll('.nj-filtres .nj-champ:not(.nj-champ-projet)');
    [].forEach.call(champs, function (c) { c.hidden = !visible; });
    var reinit = document.getElementById('njReinit');
    if (reinit) reinit.hidden = !visible;
  }

  /**
   * Charge la liste des projets ayant une grille, puis affiche le projet
   * courant. Appelée une fois au démarrage.
   */
  function demarrer() {
    return fetch('api/lots-public.php?projets=1', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        etat.avecDonnees = d.ok ? d.projets.map(function (p) { return p.id; }) : [];
      })
      .catch(function () { etat.avecDonnees = []; })
      .then(function () {
        // Sans projet dans l'URL, on ouvre le premier qui a des données ;
        // à défaut le premier du site, pour ne jamais afficher un écran nu.
        if (!etat.projet) {
          etat.projet = etat.avecDonnees[0] ||
            ((window.PROJECTS || [])[0] || {}).id || '';
        }
        rendreSelecteurProjets();
        appliquerLangue();
        return afficherProjet();
      });
  }

  /** Affiche le projet courant : sa grille, ou le message d'attente. */
  function afficherProjet() {
    if (etat.avecDonnees && etat.avecDonnees.indexOf(etat.projet) === -1) {
      afficherEnPreparation();
      return Promise.resolve();
    }
    basculerFiltres(true);
    filtresRendus = false;
    etat.facettes = null;
    return charger();
  }

  /** Changement de projet dans le sélecteur. */
  function changerProjet(id) {
    if (!id || id === etat.projet) return;
    etat.projet = id;
    // L'URL suit, pour que la page reste partageable et rechargeable.
    var params = new URLSearchParams(window.location.search);
    params.set('projet', id);
    // L'immeuble et l'étage retenus appartenaient à l'ancien projet.
    params.delete('imm'); params.delete('etage');
    history.replaceState({}, '', 'disponibilites.html?' + params.toString() +
      window.location.hash);
    etat.filtres = {};
    appliquerLangue();
    afficherProjet();
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    etat.projet = (params.get('projet') || '').toLowerCase();
    // Retour depuis le bureau de vente : on rouvre l'immeuble et l'étage
    // quittés, inscrits dans l'URL par memoriserVue().
    var immUrl = params.get('imm'), etageUrl = params.get('etage');
    if (immUrl && etageUrl) { etat.etage[immUrl] = etageUrl; immARevoir = immUrl; }
    chargerSelection();
    try {
      var vueGardee = localStorage.getItem('nj-vue-lots');
      if (['plan', 'maquette', 'liste'].indexOf(vueGardee) !== -1) etat.vue = vueGardee;
    } catch (e) {}
    document.querySelectorAll('[data-vue]').forEach(function (b) {
      b.addEventListener('click', function () { changerVue(this.dataset.vue); });
    });
    changerVue(etat.vue);

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

    /* Le repli des filtres n'existe que sur téléphone (le bouton y est seul
       visible) : inutile de tester la largeur ici, la feuille de style s'en
       charge. Dépliés, les filtres poussent la grille vers le bas — c'est
       voulu : on ne filtre pas et on ne regarde pas les résultats en même
       temps sur un écran de six centimètres. */
    var bascule = document.getElementById('njFiltresBascule');
    if (bascule) {
      bascule.addEventListener('click', function () {
        var ouvert = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
      });
    }

    document.getElementById('njReinit').addEventListener('click', function () {
      ['fTypologie', 'fImmeuble', 'fOrientation', 'fNiveau'].forEach(function (id) {
        document.getElementById(id).value = '';
      });
      document.getElementById('fDispo').checked = false;
      var b = document.getElementById('fBudget'); b.value = b.max; majEtiquetteBudget();
      var s = document.getElementById('fSurface'); s.value = s.min; majEtiquetteSurface();
      lireFiltres(); charger();
    });

    /* Changement de lot dans le panneau « Mes choix » : on redessine les
       panneaux pour que les boutons de documents suivent le lot choisi. */
    document.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-choix-actif]');
      if (!sel) return;
      etat.choixActif = Number(sel.value);
      majChoixMaquette();
    });

    // Délégation : la grille est reconstruite à chaque filtre, on ne peut pas
    // attacher les écouteurs aux cartes elles-mêmes.
    // Delegation au niveau du document : les boutons de consultation vivent
    // aussi dans la fenetre de la fiche, hors de la grille.
    document.addEventListener('click', function (e) {
      // Un bouton de consultation ne doit pas déclencher la sélection.
      // getAttribute plutôt que dataset : la pastille de la maquette est un
      // <g> SVG, et dataset n'y est pas garanti sur tous les navigateurs.
      var fiche = e.target.closest('.nj-carreau-info, .nj-mq-info-btn, .nj-choix-voir');
      if (fiche) {
        e.stopPropagation();
        ouvrirFiche(Number(fiche.getAttribute('data-fiche')));
        return;
      }
      var retourFiche = e.target.closest('[data-retour-fiche]');
      if (retourFiche) {
        e.stopPropagation();
        ouvrirFiche(Number(retourFiche.getAttribute('data-retour-fiche')));
        return;
      }
      // Retirer un lot (jeton × de la barre du bas OU du panneau « Mes choix »).
      var retirer = e.target.closest('[data-retirer]');
      if (retirer) {
        e.stopPropagation();
        basculerSelection(Number(retirer.getAttribute('data-retirer')), 'disponible');
        return;
      }
      // Envoyer la sélection (bouton du panneau « Mes choix », visible aussi
      // en plein écran, contrairement à la barre du bas).
      var envoyer = e.target.closest('[data-envoyer-choix]');
      if (envoyer) {
        e.stopPropagation();
        envoyerChoix();
        return;
      }
      // Vider toute la sélection (panneau maquette ou fiche).
      var viderChoix = e.target.closest('[data-vider-choix]');
      if (viderChoix) {
        e.stopPropagation();
        var relance = viderChoix.getAttribute('data-vider-choix');
        viderSelection();
        if (relance && relance !== '1') ouvrirFiche(Number(relance));  // rafraîchit la fiche
        return;
      }
      var media = e.target.closest('.nj-media-btn');
      if (media) {
        e.stopPropagation();
        ouvrirMedia(media.dataset.media, Number(media.dataset.lot));
        return;
      }
      var choix = e.target.closest('[data-choix]');
      if (choix) {
        e.stopPropagation();
        var lid = Number(choix.getAttribute('data-choix'));
        basculerSelection(lid, choix.getAttribute('data-statut'));
        // On rafraîchit toute la ligne d'actions (bouton choix + « Vider »)
        // pour refléter le nouvel état.
        var lotChoix = etat.lots.filter(function (l) { return l.id === lid; })[0];
        var actions = choix.closest('.nj-fiche-actions');
        if (lotChoix && actions) actions.innerHTML = boutonChoix(lotChoix) + boutonViderFiche(lotChoix);
        else if (lotChoix) choix.outerHTML = boutonChoix(lotChoix);
        return;
      }
      var agrandir = e.target.closest('[data-agrandir]');
      if (agrandir) {
        e.stopPropagation();
        // Le bouton vit maintenant en haut de page, hors des sections : il n'a
        // plus d'immeuble parent, on lui désigne celui que le visiteur regarde.
        basculerPleinEcran(agrandir.closest('.nj-mq-imm') || immeubleEnVue());
        return;
      }
      var etage = e.target.closest('[data-etage]');
      if (etage) {
        majEtage(etage.getAttribute('data-imm'), etage.getAttribute('data-etage'));
        return;
      }
      var carte = e.target.closest('.nj-lot, .nj-carreau, .nj-mq-lot');
      if (carte) basculerSelection(Number(carte.getAttribute('data-id')),
                                   carte.getAttribute('data-statut'));
    });
    document.getElementById('njGrille').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // La pastille d'info de la maquette est focusable : au clavier elle
      // doit ouvrir la fiche, pas sélectionner le lot qui l'entoure.
      var info = e.target.closest('.nj-mq-info-btn');
      if (info) {
        e.preventDefault();
        ouvrirFiche(Number(info.getAttribute('data-fiche')));
        return;
      }
      var carte = e.target.closest('.nj-lot, .nj-carreau, .nj-mq-lot');
      if (carte) {
        e.preventDefault();
        basculerSelection(Number(carte.getAttribute('data-id')),
                          carte.getAttribute('data-statut'));
      }
    });
    /* Les jetons « × » (barre du bas et panneau maquette) sont gérés par la
       délégation au niveau du document, pour ne pas double-basculer. */

    // Étape suivante : le comparatif puis la mise en relation. Le canal est
    // repris tel quel pour qu'une borne reste identifiée comme telle.
    document.getElementById('njVider').addEventListener('click', viderSelection);

    document.getElementById('njSuivant').addEventListener('click', envoyerChoix);

    document.getElementById('fProjet').addEventListener('change', function () {
      changerProjet(this.value);
    });

    document.getElementById('njMediaFermer').addEventListener('click', fermerMedia);
    // On agrandit la boîte, pas le corps seul : l'en-tête doit rester visible
    // pour offrir la sortie, le retour à la fiche et le nom du projet.
    document.getElementById('njMediaPlein').addEventListener('click', function () {
      basculerPleinEcran(document.querySelector('.nj-media-boite'));
    });
    document.getElementById('njMedia').addEventListener('click', function (e) {
      if (e.target === this) fermerMedia();   // clic sur le fond
    });
    // Échap est géré nativement par <dialog> : on se raccroche à sa fermeture
    // pour libérer l'iframe, sinon la visite 360° continuerait de tourner.
    document.getElementById('njMedia').addEventListener('close', function () {
      document.getElementById('njMediaCorps').innerHTML = '';
      document.body.classList.remove('nj-fige');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('njMedia').open) fermerMedia();
    });

    demarrer();
  }

  /* ── Actions du bandeau : contact, bureau de vente, itinéraire ─────── */

  /**
   * Boutons repris de project.html, en haut de page. Le projet courant donne
   * l'identifiant du bureau de vente et les coordonnées de l'itinéraire ;
   * sans coordonnées, les deux boutons d'itinéraire ne sont pas rendus.
   * Reconstruits à chaque changement de langue ou de projet.
   */
  function rendreActionsHero() {
    var zone = document.getElementById('njHeroActions');
    if (!zone) return;
    var lang = langue();
    var p = projetCourant();
    var html = '<a class="nj-act-or" href="contact.html#' + lang + '">' +
      t('contacter') + '</a>';
    if (p) {
      html += '<a href="bureaudevente.html?id=' + encodeURIComponent(p.id) +
        '#' + lang + '">🏢 ' + t('visiterBureau') + '</a>';
      if (p.lat && p.lng) {
        html += '<a href="localisation.html?projet=' + encodeURIComponent(p.id) +
          '#' + lang + '">' + t('quartier') + '</a>' +
          '<button type="button" id="njItineraire">' + t('yAller') + '</button>' +
          '<a class="nj-act-wa" id="njItineraireWa" href="#" target="_blank" rel="noopener">' +
          t('partagerItineraire') + '</a>';
      }
    }
    /* Le plein écran était enfoui dans l'en-tête de chaque immeuble, sous la
       ligne de flottaison. Remonté ici, il est visible dès l'arrivée — et un
       seul suffit, puisqu'il vise l'immeuble que le visiteur regarde. */
    html += '<button type="button" id="njPleinEcran" data-agrandir="" hidden>⛶ ' +
      t('pleinEcran') + '</button>';
    zone.innerHTML = html;
    majBoutonPleinMaquette();

    var btn = document.getElementById('njItineraire');
    if (btn) btn.addEventListener('click', function () { ouvrirItineraire(false); });
    var wa = document.getElementById('njItineraireWa');
    if (wa) wa.addEventListener('click', function (e) {
      e.preventDefault();
      ouvrirItineraire(true);
    });
  }

  /** Itinéraire depuis la position du visiteur, vers Google Maps ou WhatsApp. */
  function ouvrirItineraire(versWhatsapp) {
    var p = projetCourant();
    if (!p) return;
    if (!navigator.geolocation) { alert(t('geoIndispo')); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var nom = menuText(p.name, langue());
      var maps = 'https://www.google.com/maps/dir/?api=1' +
        '&origin=' + encodeURIComponent(pos.coords.latitude + ',' + pos.coords.longitude) +
        '&destination=' + encodeURIComponent(p.lat + ',' + p.lng) +
        '&travelmode=driving';
      var url = versWhatsapp
        ? 'https://wa.me/?text=' +
          encodeURIComponent(t('itineraireVers') + ' ' + nom + ' : ' + maps)
        : maps;
      window.open(url, '_blank', 'noopener');
    }, function () {
      alert(t('geoRefus'));
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
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
    majBasculeFiltres();
    texte('lblProjet', t('projet'));
    texte('njVueLabel', t('vue'));
    texte('njVuePlan', t('vuePlan'));
    texte('njVueMaquette', t('vueMaquette'));
    texte('njVueListe', t('vueListe'));
    texte('njMediaFermer', t('fermer'));
    texte('lblTypologie', t('typologie'));
    texte('lblImmeuble', t('immeuble'));
    texte('lblNiveau', t('niveau'));
    texte('lblOrientation', t('orientation'));
    texte('lblBudget', t('budget'));
    texte('lblSurface', t('surface'));
    texte('lblDispoSeuls', t('dispoSeuls'));
    texte('njReinit', t('reinit'));
    texte('njBarreLabel', t('selection'));
    texte('njVider', t('viderSelection'));

    // La flèche suit le sens de lecture : ← en arabe, comme sur carte.html.
    var suivant = document.getElementById('njSuivant');
    if (suivant) suivant.textContent = t('suivant') + (lang === 'ar' ? ' ←' : ' →');

    // Nom et localisation du projet : déjà traduits dans data/projects.json.
    var projet = (window.PROJECTS || []).filter(function (p) { return p.id === etat.projet; })[0];
    if (projet) {
      var nom = menuText(projet.name, lang);
      var lieu = menuText(projet.location, lang);
      texte('njSousTitre', lieu ? nom + ' — ' + lieu : nom);
      texte('njProjetBandeau', nom);   // rappel du nom au-dessus des résultats
    }
    rendreActionsHero();

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
    rendreSelecteurProjets();
    // Le message d'attente porte ses propres libellés et des liens suffixés
    // par la langue : il doit être reconstruit, pas seulement la grille.
    if (etat.avecDonnees && etat.avecDonnees.indexOf(etat.projet) === -1) {
      afficherEnPreparation();
      return;
    }
    if (etat.facettes) { afficherLots(); rendreBarreSelection(); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    initPage('units', '');
    init();
  });
})();
