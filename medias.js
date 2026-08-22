/**
 * medias.js — album photos et vidéos d'un projet.
 *
 * Deux onglets : les photos, présentées en diaporama (grande image + bande de
 * vignettes), et les vidéos, en grille. La page sert telle quelle depuis le
 * site, et embarquée en iframe (?embed=1) depuis la fenêtre de consultation
 * d'un lot, où le bouton « Album » a remplacé l'ancien bouton « Carte ».
 *
 * Les médias sont déclarés dans data/projects.json :
 *   - photos : clé "gallery" (chemins), complétée par les panoramas, par
 *     data/project-sliders.json et, en dernier recours, par l'image hero ;
 *   - vidéos : clé "videos", chaîne ou objet {src, poster, title}.
 * Le back-office (admin/project-edit.php, section « Photos et vidéos ») écrit
 * ces deux clés : rien ici n'est deviné à partir du contenu d'un dossier, le
 * navigateur ne sachant pas lister un répertoire.
 *
 * Les photos à 360° sont affichées dans Pannellum — la même visionneuse que la
 * fiche projet — et les photos plates dans une simple <img>. La distinction est
 * automatique : cf. estPanoramique() et verifierEquirectangulaire().
 */

(function () {
  'use strict';

  /**
   * Version des médias. Une photo remplacée garde son nom de fichier : sans ce
   * suffixe, la borne du bureau de vente — que personne ne rafraîchit —
   * continuerait d'afficher l'ancienne image. À incrémenter au remplacement.
   */
  var MEDIA_V = '1';

  var T = {
    fr: {
      titre: 'Photos et vidéos', photos: 'Photos', videos: 'Vidéos',
      sansPhoto: 'Aucune photo n’est encore publiée pour ce projet.',
      sansVideo: 'Aucune vidéo n’est encore publiée pour ce projet.',
      precedente: 'Photo précédente', suivante: 'Photo suivante',
      photoSur: 'Photo %1 sur %2', pleinEcran: 'Plein écran',
      quitterPleinEcran: 'Quitter le plein écran',
      projetLabel: 'Projet', retour: 'Voir les logements →',
      videoGenerique: 'Vidéo de présentation Narjiss, en attendant celles du projet.',
      photoDe: 'Photo du projet',
      vue360: 'Vue 360°', aide360: 'Glissez pour regarder autour de vous.'
    },
    en: {
      titre: 'Photos and videos', photos: 'Photos', videos: 'Videos',
      sansPhoto: 'No photo has been published for this project yet.',
      sansVideo: 'No video has been published for this project yet.',
      precedente: 'Previous photo', suivante: 'Next photo',
      photoSur: 'Photo %1 of %2', pleinEcran: 'Full screen',
      quitterPleinEcran: 'Exit full screen',
      projetLabel: 'Project', retour: 'See the homes →',
      videoGenerique: 'Narjiss corporate video, until the project has its own.',
      photoDe: 'Project photo',
      vue360: '360° view', aide360: 'Drag to look around.'
    },
    ar: {
      titre: 'الصور والفيديوهات', photos: 'الصور', videos: 'الفيديوهات',
      sansPhoto: 'لم تُنشر بعد أي صورة لهذا المشروع.',
      sansVideo: 'لم يُنشر بعد أي فيديو لهذا المشروع.',
      precedente: 'الصورة السابقة', suivante: 'الصورة التالية',
      photoSur: 'الصورة %1 من %2', pleinEcran: 'ملء الشاشة',
      quitterPleinEcran: 'إنهاء ملء الشاشة',
      projetLabel: 'المشروع', retour: '← عرض السكنات',
      videoGenerique: 'فيديو تقديمي لنرجس، في انتظار فيديوهات المشروع.',
      photoDe: 'صورة المشروع',
      vue360: 'عرض 360°', aide360: 'اسحب للنظر حولك.'
    },
    es: {
      titre: 'Fotos y vídeos', photos: 'Fotos', videos: 'Vídeos',
      sansPhoto: 'Todavía no hay ninguna foto publicada para este proyecto.',
      sansVideo: 'Todavía no hay ningún vídeo publicado para este proyecto.',
      precedente: 'Foto anterior', suivante: 'Foto siguiente',
      photoSur: 'Foto %1 de %2', pleinEcran: 'Pantalla completa',
      quitterPleinEcran: 'Salir de pantalla completa',
      projetLabel: 'Proyecto', retour: 'Ver las viviendas →',
      videoGenerique: 'Vídeo corporativo de Narjiss, a la espera de los del proyecto.',
      photoDe: 'Foto del proyecto',
      vue360: 'Vista 360°', aide360: 'Arrastra para mirar alrededor.'
    }
  };

  /** Vidéo institutionnelle : un projet sans tournage montre quand même
   *  quelque chose plutôt qu'un onglet mort. Même repli que project.js. */
  var VIDEO_GENERIQUE = {
    src: 'data/videos/generique/macharik-staging.mp4',
    poster: 'data/videos/generique/macharik-staging.jpg',
    title: { fr: 'Narjiss Immobilier', en: 'Narjiss Immobilier', ar: 'نرجس العقارية', es: 'Narjiss Immobilier' },
    generique: true
  };

  /**
   * Noms de fichiers qui annoncent une prise de vue sphérique. Les photos
   * sorties d'une Ricoh Theta ou d'un smartphone en mode panorama gardent
   * presque toujours l'une de ces marques : le nom suffit alors à les orienter
   * vers la bonne visionneuse sans attendre le chargement de l'image.
   */
  var NOM_360 = /(^|[\/\-_.])(360|pano|panorama|panoramique|equirect\w*|theta|vr)([\/\-_.]|$)/i;

  var etat = {
    projet: '',
    onglet: 'photos',
    photos: [],
    videos: [],
    index: 0,
    sliders: null   // data/project-sliders.json, null tant qu'il n'est pas lu
  };

  /** Visionneuse Pannellum en cours, s'il y en a une. */
  var visionneuse = null;

  function langue() {
    return (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
  }

  function t(cle) {
    return T[langue()][cle] || T.fr[cle] || cle;
  }

  function $(id) { return document.getElementById(id); }

  function echapper(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function versionne(url) {
    if (!url) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + MEDIA_V;
  }

  function embarque() {
    return document.documentElement.classList.contains('njm-embed');
  }

  /** Traduit un champ {fr,en,ar,es} — ou une chaîne saisie en clair. */
  function texte(valeur) {
    if (!valeur) return '';
    if (typeof valeur === 'string') return valeur;
    return valeur[langue()] || valeur.fr || '';
  }

  function projetCourant() {
    var liste = window.PROJECTS || [];
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].id === etat.projet || liste[i].folder === etat.projet) return liste[i];
    }
    return liste[0] || null;
  }

  /* ── Collecte des médias ───────────────────────────────────────────────── */

  /**
   * Photos du projet : l'album saisi au back-office, puis les vues 360°
   * déclarées. Ces deux listes-là sont pilotées depuis l'admin, et elles
   * seules — ce que le back-office montre est exactement ce que le visiteur
   * verra.
   *
   * Le slider d'accueil et l'image hero ne servent QUE de repli, quand rien
   * n'a encore été publié : les mêler à un album renseigné ferait réapparaître
   * une photo qu'on vient d'en retirer, sans moyen de comprendre d'où elle
   * revient.
   */
  function photosDuProjet(p) {
    if (!p) return [];
    var panoramas = (p.panoramas || []).map(function (item) {
      // Les panoramas portent une marque : leur nature sphérique est déclarée,
      // pas devinée. C'est la source la plus sûre.
      if (typeof item === 'string') return { src: item, pano: true };
      var copie = { pano: true };
      for (var k in item) { if (Object.prototype.hasOwnProperty.call(item, k)) copie[k] = item[k]; }
      return copie;
    });

    var album = [].concat(p.gallery || [])
                 .concat((p.media && p.media.gallery) || [])
                 .concat(panoramas);

    var sources = album.length ? album
      : [].concat((etat.sliders && etat.sliders[p.id]) || [])
          .concat([(p.images && p.images.hero) || '']);

    var vues = {};
    var out = [];
    for (var i = 0; i < sources.length; i++) {
      var item = sources[i];
      var src = (typeof item === 'string') ? item : (item && (item.src || item.url));
      if (!src || vues[src]) continue;
      vues[src] = true;
      out.push({
        src: src,
        // `room` vient des panoramas : la pièce photographiée fait une légende
        // toute trouvée, et elle est déjà traduite dans les quatre langues.
        legende: (typeof item === 'object' &&
                  (item.caption || item.title || item.room)) || '',
        pano: estPanoramique(item, src)
      });
    }
    return out;
  }

  /**
   * La photo est-elle une vue à 360° ?
   *
   * Deux indices ici, du plus sûr au plus faible : la déclaration explicite
   * (clé "panoramas" de projects.json, champ `pano` ou `type`), puis le nom du
   * fichier. Le troisième — les proportions 2:1 de la projection
   * équirectangulaire — n'est mesurable qu'une fois l'image chargée : c'est
   * verifierEquirectangulaire() qui s'en charge, après coup.
   */
  function estPanoramique(item, src) {
    if (item && typeof item === 'object') {
      if (item.pano === true || item.panorama === true || item.is360 === true) return true;
      if (item.type && /^(360|pano\w*|equirect\w*)$/i.test(String(item.type))) return true;
    }
    return NOM_360.test(String(src || ''));
  }

  /** Vidéos du projet, normalisées comme sur la fiche projet. */
  function videosDuProjet(p) {
    var brut = (p && (p.videos || (p.media && p.media.videos))) || [];
    var out = [];
    for (var i = 0; i < brut.length; i++) {
      var item = brut[i];
      var src = (typeof item === 'string') ? item : (item && item.src);
      if (!src) continue;
      out.push({
        src: src,
        poster: (typeof item === 'object' && item.poster) || '',
        title: (typeof item === 'object' && item.title) || ''
      });
    }
    return out.length ? out : [VIDEO_GENERIQUE];
  }

  /* ── Onglet « Photos » ─────────────────────────────────────────────────── */

  function rendrePhotos() {
    var pan = $('njmPanPhotos');
    if (!pan) return;

    detruireVisionneuse();

    if (!etat.photos.length) {
      pan.innerHTML = '<p class="njm-vide">' + echapper(t('sansPhoto')) + '</p>';
      return;
    }

    if (etat.index >= etat.photos.length) etat.index = 0;
    var seule = etat.photos.length < 2;

    pan.innerHTML =
      '<div class="njm-scene" id="njmScene">' +
        // Le média — image plate ou visionneuse 360° — vit dans sa propre
        // boîte : changer de photo n'a ainsi pas à reconstruire les flèches,
        // le compteur ni la bande de vignettes.
        '<div class="njm-scene-media" id="njmMedia"></div>' +
        (seule ? '' :
          '<button type="button" class="njm-fleche njm-fleche-prec" id="njmPrec" ' +
            'aria-label="' + echapper(t('precedente')) + '">‹</button>' +
          '<button type="button" class="njm-fleche njm-fleche-suiv" id="njmSuiv" ' +
            'aria-label="' + echapper(t('suivante')) + '">›</button>') +
        '<div class="njm-scene-outils">' +
          '<span class="njm-badge360" id="njmBadge360" hidden></span>' +
          '<button type="button" id="njmPlein">⛶ ' + echapper(t('pleinEcran')) + '</button>' +
        '</div>' +
        (seule ? '' : '<span class="njm-compteur" id="njmCompteur"></span>') +
      '</div>' +
      '<p class="njm-legende" id="njmLegende"></p>' +
      (seule ? '' : '<div class="njm-vignettes" id="njmVignettes">' +
        etat.photos.map(function (photo, i) {
          return '<button type="button" data-i="' + i + '" ' +
            'aria-current="' + (i === etat.index ? 'true' : 'false') + '" ' +
            'aria-label="' + echapper(t('photoSur').replace('%1', String(i + 1))
              .replace('%2', String(etat.photos.length))) + '">' +
            '<img src="' + echapper(versionne(photo.src)) + '" alt="" loading="lazy">' +
            (photo.pano ? '<span class="njm-vignette-360" aria-hidden="true">360°</span>' : '') +
            '</button>';
        }).join('') +
      '</div>');

    brancherPhotos();
    majPhotoCourante();
  }

  function brancherPhotos() {
    var prec = $('njmPrec');
    var suiv = $('njmSuiv');
    if (prec) prec.addEventListener('click', function () { allerA(etat.index - 1); });
    if (suiv) suiv.addEventListener('click', function () { allerA(etat.index + 1); });

    var vignettes = $('njmVignettes');
    if (vignettes) {
      vignettes.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-i]');
        if (b) allerA(Number(b.getAttribute('data-i')));
      });
    }

    var plein = $('njmPlein');
    if (plein) plein.addEventListener('click', basculerPleinEcran);

    // Le diaporama répond aussi aux flèches du clavier — attendu d'un album,
    // et indispensable sans écran tactile. Une vue 360° garde les siennes :
    // Pannellum s'en sert pour faire pivoter la scène.
    var scene = $('njmScene');
    if (scene) {
      scene.setAttribute('tabindex', '0');
      scene.addEventListener('keydown', function (e) {
        if (visionneuse) return;
        var avant = (document.documentElement.dir === 'rtl') ? 'ArrowLeft' : 'ArrowRight';
        var arriere = (document.documentElement.dir === 'rtl') ? 'ArrowRight' : 'ArrowLeft';
        if (e.key === avant) { allerA(etat.index + 1); e.preventDefault(); }
        else if (e.key === arriere) { allerA(etat.index - 1); e.preventDefault(); }
      });
    }
  }

  /** Fait défiler l'album en boucle : au bout, on revient au début. */
  function allerA(i) {
    var n = etat.photos.length;
    if (!n) return;
    etat.index = ((i % n) + n) % n;
    majPhotoCourante();
  }

  /**
   * Met à jour la photo affichée sans reconstruire la bande de vignettes :
   * un innerHTML global remettrait le défilement des vignettes à zéro à chaque
   * clic, et ferait clignoter les images déjà chargées.
   */
  function majPhotoCourante() {
    var courante = etat.photos[etat.index];
    if (!courante) return;

    rendreMedia();

    var legende = $('njmLegende');
    if (legende) legende.textContent = texte(courante.legende);

    var compteur = $('njmCompteur');
    if (compteur) {
      compteur.textContent = t('photoSur')
        .replace('%1', String(etat.index + 1))
        .replace('%2', String(etat.photos.length));
    }

    var vignettes = $('njmVignettes');
    if (vignettes) {
      var boutons = vignettes.querySelectorAll('button[data-i]');
      for (var i = 0; i < boutons.length; i++) {
        var actif = Number(boutons[i].getAttribute('data-i')) === etat.index;
        boutons[i].setAttribute('aria-current', actif ? 'true' : 'false');
        if (actif && boutons[i].scrollIntoView) {
          boutons[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }
    }
  }

  /* ── Affichage d'une photo : plate ou sphérique ────────────────────────── */

  function detruireVisionneuse() {
    if (!visionneuse) return;
    try { visionneuse.destroy(); } catch (e) { /* déjà démontée */ }
    visionneuse = null;
  }

  /**
   * Affiche la photo courante dans la visionneuse qui lui convient.
   *
   * Une vue à 360° passe par Pannellum, exactement comme sur la fiche projet.
   * `panoKo` retient l'échec d'un rendu sphérique (WebGL désactivé, image trop
   * lourde pour la carte graphique) : sans cette mémoire, chaque retour sur la
   * photo relancerait la même tentative vouée au même échec.
   */
  function rendreMedia() {
    var boite = $('njmMedia');
    var photo = etat.photos[etat.index];
    if (!boite || !photo) return;

    detruireVisionneuse();

    if (photo.pano && !photo.panoKo && window.pannellum) {
      majBadge360(true);
      boite.innerHTML = '<div class="njm-pano" id="njmPano"></div>';
      try {
        visionneuse = pannellum.viewer('njmPano', {
          type: 'equirectangular',
          panorama: versionne(photo.src),
          autoLoad: true,
          autoRotate: -2,
          showZoomCtrl: true,
          showFullscreenCtrl: false,   // la scène a déjà son bouton plein écran
          compass: false,
          hfov: 105
        });
        // Image illisible par la visionneuse : on retombe sur l'affichage plat
        // plutôt que de laisser un cadre noir et un message technique.
        visionneuse.on('error', function () {
          photo.panoKo = true;
          rendreMedia();
        });
        return;
      } catch (e) {
        photo.panoKo = true;
      }
    }

    afficherImagePlate(photo);
  }

  function afficherImagePlate(photo) {
    detruireVisionneuse();
    majBadge360(false);

    var boite = $('njmMedia');
    if (!boite) return;
    boite.innerHTML = '<img id="njmPhoto" src="' + echapper(versionne(photo.src)) +
      '" alt="' + echapper(texte(photo.legende) || t('photoDe')) + '">';

    var img = $('njmPhoto');
    if (!img) return;
    img.addEventListener('load', function () { verifierEquirectangulaire(photo, img); });
    // Une image déjà en cache est complète avant même la pose de l'écouteur :
    // on mesure tout de suite, sinon l'événement `load` ne viendra jamais.
    if (img.complete && img.naturalWidth) verifierEquirectangulaire(photo, img);
  }

  /**
   * Dernier filet pour reconnaître une vue à 360° dont le nom ne dit rien.
   *
   * Une projection équirectangulaire fait toujours exactement deux fois plus
   * large que haut. On tolère 5 % d'écart (recadrages approximatifs) et on
   * exige une image large : une bannière de 900 px au format 2:1 n'est pas un
   * panorama, et l'ouvrir dans la visionneuse 3D serait absurde.
   */
  function verifierEquirectangulaire(photo, img) {
    if (photo.pano || photo.panoKo || !window.pannellum) return;
    if (!img.naturalWidth || !img.naturalHeight) return;

    var ratio = img.naturalWidth / img.naturalHeight;
    if (ratio < 1.9 || ratio > 2.1 || img.naturalWidth < 1600) return;

    photo.pano = true;   // retenu : l'album ne remesure pas à chaque passage
    marquerVignette360(etat.photos.indexOf(photo));
    if (etat.photos[etat.index] === photo) rendreMedia();
  }

  function majBadge360(actif) {
    var badge = $('njmBadge360');
    if (!badge) return;
    badge.hidden = !actif;
    if (actif) {
      badge.textContent = '◉ ' + t('vue360');
      badge.title = t('aide360');
    }
  }

  /** Signale après coup une vignette reconnue comme sphérique. */
  function marquerVignette360(index) {
    var vignettes = $('njmVignettes');
    if (!vignettes || index < 0) return;
    var b = vignettes.querySelector('button[data-i="' + index + '"]');
    if (!b || b.querySelector('.njm-vignette-360')) return;
    var marque = document.createElement('span');
    marque.className = 'njm-vignette-360';
    marque.setAttribute('aria-hidden', 'true');
    marque.textContent = '360°';
    b.appendChild(marque);
  }

  function basculerPleinEcran() {
    var scene = $('njmScene');
    if (!scene) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (scene.requestFullscreen) scene.requestFullscreen();
    } catch (e) { /* le navigateur peut refuser : l'album reste utilisable */ }
  }

  function majLibellePlein() {
    var b = $('njmPlein');
    if (!b) return;
    var plein = !!document.fullscreenElement;
    b.textContent = (plein ? '✕ ' : '⛶ ') + (plein ? t('quitterPleinEcran') : t('pleinEcran'));
    // Pannellum se dimensionne sur son conteneur : il faut le prevenir que la
    // scène vient de changer de taille, sinon la vue garde le format d'avant.
    redimensionnerVisionneuse();
  }

  function redimensionnerVisionneuse() {
    if (!visionneuse) return;
    try { visionneuse.resize(); } catch (e) { /* visionneuse déjà démontée */ }
  }

  /* ── Onglet « Vidéos » ─────────────────────────────────────────────────── */

  function rendreVideos() {
    var pan = $('njmPanVideos');
    if (!pan) return;

    if (!etat.videos.length) {
      pan.innerHTML = '<p class="njm-vide">' + echapper(t('sansVideo')) + '</p>';
      return;
    }

    pan.innerHTML = '<div class="njm-videos">' +
      etat.videos.map(function (v) {
        var titre = texte(v.title);
        return '<figure class="njm-video">' +
          '<video controls preload="metadata" playsinline' +
            (v.poster ? ' poster="' + echapper(versionne(v.poster)) + '"' : '') + '>' +
            '<source src="' + echapper(versionne(v.src)) + '" type="video/mp4">' +
          '</video>' +
          (titre ? '<figcaption>' + echapper(titre) + '</figcaption>' : '') +
        '</figure>';
      }).join('') +
    '</div>';

    // Une seule vidéo à la fois : sans ça, deux bandes-son se superposent.
    var lecteurs = pan.querySelectorAll('video');
    [].forEach.call(lecteurs, function (v) {
      v.addEventListener('play', function () {
        [].forEach.call(lecteurs, function (autre) {
          if (autre !== v) autre.pause();
        });
      });
    });
  }

  /** Coupe le son en quittant l'onglet : une vidéo continuerait sinon. */
  function arreterVideos() {
    var pan = $('njmPanVideos');
    if (!pan) return;
    [].forEach.call(pan.querySelectorAll('video'), function (v) { v.pause(); });
  }

  /* ── Onglets, en-tête, navigation ──────────────────────────────────────── */

  function choisirOnglet(nom) {
    etat.onglet = (nom === 'videos') ? 'videos' : 'photos';
    if (etat.onglet === 'photos') arreterVideos();

    $('njmOngletPhotos').setAttribute('aria-selected', etat.onglet === 'photos' ? 'true' : 'false');
    $('njmOngletVideos').setAttribute('aria-selected', etat.onglet === 'videos' ? 'true' : 'false');
    $('njmPanPhotos').hidden = etat.onglet !== 'photos';
    $('njmPanVideos').hidden = etat.onglet !== 'videos';

    // Une visionneuse 360° masquée a mesuré un conteneur de taille nulle : au
    // retour sur l'onglet, elle doit reprendre ses dimensions.
    if (etat.onglet === 'photos') redimensionnerVisionneuse();

    // L'onglet actif est mémorisé dans l'URL : un lien partagé — ou l'iframe
    // rouverte — retombe sur la vue que le visiteur regardait.
    majUrl();
  }

  function majUrl() {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams(window.location.search);
    params.set('id', etat.projet);
    params.set('onglet', etat.onglet);
    try {
      window.history.replaceState(null, '',
        window.location.pathname + '?' + params.toString() + window.location.hash);
    } catch (e) { /* pas critique */ }
  }

  function rendreEnTete() {
    var p = projetCourant();
    var nom = p ? texte(p.name) : '';
    var lieu = p ? texte(p.location) : '';

    document.title = 'Narjiss — ' + t('titre') + (nom ? ' · ' + nom : '');
    $('njmTitre').textContent = t('titre');
    $('njmSousTitre').textContent = lieu ? nom + ' — ' + lieu : nom;
    $('njmProjetLabel').textContent = t('projetLabel');

    $('njmOngletPhotos').innerHTML = echapper(t('photos')) +
      '<span class="njm-compte">' + etat.photos.length + '</span>';
    $('njmOngletVideos').innerHTML = echapper(t('videos')) +
      '<span class="njm-compte">' + etat.videos.length + '</span>';

    var retour = $('njmRetour');
    retour.textContent = t('retour');
    retour.href = 'disponibilites.html?projet=' + encodeURIComponent(etat.projet) + '#' + langue();

    var note = $('njmNote');
    var generique = etat.videos.length === 1 && etat.videos[0].generique;
    note.textContent = generique ? t('videoGenerique') : '';

    rendreSelecteurProjets();
  }

  function rendreSelecteurProjets() {
    var sel = $('njmProjetSel');
    if (!sel) return;
    var projets = (window.PROJECTS || []).slice();
    sel.innerHTML = projets.map(function (p) {
      return '<option value="' + echapper(p.id) + '"' +
        (p.id === etat.projet ? ' selected' : '') + '>' +
        echapper(texte(p.name) || p.id) + '</option>';
    }).join('');
  }

  /* ── Démarrage ─────────────────────────────────────────────────────────── */

  function parametre(nom) {
    try { return new URLSearchParams(window.location.search).get(nom) || ''; }
    catch (e) { return ''; }
  }

  function chargerSliders() {
    // Les images du slider d'accueil complètent l'album : le fichier est
    // facultatif, son absence ne doit pas vider l'onglet Photos.
    return fetch('data/project-sliders.json?v=' + MEDIA_V, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (data) {
        etat.sliders = (data && typeof data === 'object') ? data : {};
      });
  }

  function rendreTout() {
    var p = projetCourant();
    if (p) etat.projet = p.id;
    etat.photos = photosDuProjet(p);
    etat.videos = videosDuProjet(p);
    etat.index = 0;
    rendreEnTete();
    rendrePhotos();
    rendreVideos();
    choisirOnglet(etat.onglet);
  }

  // Appelé par le menu partagé au premier rendu ET à chaque changement de langue.
  window.onLanguageChange = function () {
    rendreTout();
  };

  document.addEventListener('DOMContentLoaded', function () {
    etat.projet = parametre('id') || parametre('projet');
    etat.onglet = parametre('onglet') === 'videos' ? 'videos' : 'photos';

    if (embarque()) {
      // Dans l'iframe, le projet est imposé par la page hôte : proposer d'en
      // changer là ferait sortir le visiteur du lot qu'il consulte.
      var nav = document.querySelector('.njm-hero-nav');
      if (nav) nav.hidden = true;
    }

    $('njmOnglets').addEventListener('click', function (e) {
      var b = e.target.closest('.njm-onglet');
      if (b) choisirOnglet(b.getAttribute('data-onglet'));
    });

    $('njmProjetSel').addEventListener('change', function () {
      etat.projet = this.value;
      rendreTout();
    });

    document.addEventListener('fullscreenchange', majLibellePlein);
    window.addEventListener('resize', redimensionnerVisionneuse);

    chargerSliders().then(demarrer);
  });

  /**
   * Deux démarrages, selon le contexte.
   *
   * Sur le site, initPage() pose le menu, le pied de page et l'hôtesse, puis
   * déclenche le premier rendu via onLanguageChange. Dans l'iframe, rien de
   * tout cela n'a lieu d'être : la page hôte porte déjà le menu et l'hôtesse,
   * et une seconde hôtesse ouverte dans la fenêtre de consultation d'un lot
   * appellerait un conseiller par-dessus celle du parcours.
   */
  function demarrer() {
    if (!embarque()) {
      initPage('', '');
      return;
    }

    /* La visite guidée, ELLE, doit entrer dans le cadre.
     *
     * Se passer d'initPage() écartait aussi installLiveGuide(), qu'il appelle
     * au passage. L'album ne chargeait donc jamais liveguide.js : aucun clic
     * n'y était capté, aucun relais posé vers la page parente, et le conseiller
     * faisait défiler les photos pendant que le visiteur restait sur la
     * première — sans rien pour le signaler.
     *
     * installLiveGuide() seul, sans initPage() : c'est ce dernier qui pose le
     * menu et l'hôtesse, les deux choses dont on ne veut pas ici. Même geste
     * que tour-360.html, autre page autonome embarquée de la même façon.
     *
     * Le rôle voyage par sessionStorage, partagé entre la page et son cadre
     * (même origine, même onglet) : le cadre sait donc déjà s'il est chez un
     * conseiller ou chez un visiteur, et se tait pour tous les autres.
     */
    if (typeof installLiveGuide === 'function') installLiveGuide('');

    var hash = window.location.hash.replace('#', '');
    if (['fr', 'en', 'ar', 'es'].indexOf(hash) >= 0) currentLang = hash;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    loadSiteProjects('').then(rendreTout);
  }
})();
