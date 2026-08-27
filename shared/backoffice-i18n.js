/* ============================================================
   LANGUES DES PAGES MÉTIER (espace commercial, éditeur de visites)
   ------------------------------------------------------------
   Ces deux pages ne chargent pas shared/menu.js : elles n'ont donc
   ni les boutons de langue du site, ni currentLang. Elles restaient
   en français alors que le site parle quatre langues — un commercial
   arabophone travaillait en arabe face au client, puis basculait en
   français dès qu'il ouvrait son espace.

   Ce module leur apporte le sélecteur et la traduction, avec le même
   vocabulaire visuel que le site (classe .lang-btn de menu.css) : on
   retrouve le même sélecteur au même endroit, pas un deuxième modèle
   à apprendre.

   MÉMORISATION — localStorage ('nj-lang'), pas le hash.
   Le site public tient sa langue dans l'adresse (#ar) : c'est ce qu'il
   faut pour un LIEN que l'on partage. Ici personne ne partage l'URL de
   son espace de travail ; ce qu'il faut, c'est qu'un agent choisisse sa
   langue UNE fois et la retrouve à chaque ouverture, y compris après
   déconnexion. Le hash reste accepté en entrée : un lien peut donc
   toujours imposer une langue (…/espace-agent.html#ar), et ce choix-là
   est mémorisé à son tour.

   Le module ne traduit rien tout seul : chaque page lui donne son
   dictionnaire. Il fournit la langue, les boutons, le sens d'écriture
   et le parcours du DOM.
   ============================================================ */
(function () {
  'use strict';

  var LANGUES = ['fr', 'en', 'ar', 'es'];
  // Libellés des boutons repris tels quels du menu du site (menu.js) :
  // l'arabe s'y écrit « عربي » et non « AR ».
  var LIBELLES = { fr: 'FR', en: 'EN', ar: 'عربي', es: 'ES' };
  var CLE = 'nj-lang';

  var abonnes = [];
  var courante = null;

  function valide(l) { return LANGUES.indexOf(l) >= 0 ? l : null; }

  function lire() {
    // Ordre : ce qu'impose l'adresse, puis ce que l'agent a choisi, puis ce
    // que déclare la page. Le hash passe devant pour qu'un lien reste un lien.
    var h = valide((window.location.hash || '').replace('#', ''));
    if (h) return h;
    try {
      var s = valide(window.localStorage.getItem(CLE));
      if (s) return s;
    } catch (e) { /* stockage refusé : on se contente de la page */ }
    return valide((document.documentElement.getAttribute('lang') || '').slice(0, 2)) || 'fr';
  }

  function marquerDocument(l) {
    document.documentElement.setAttribute('lang', l);
    // dir sur <html> et non sur un conteneur : les champs de saisie, les
    // menus déroulants et les barres de défilement en dépendent.
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
  }

  function majBoutons() {
    var btns = document.querySelectorAll('.lang-btn[data-lang]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-lang') === courante);
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-lang') === courante ? 'true' : 'false');
    }
  }

  var NJ_LANG = {
    LANGUES: LANGUES,

    courante: function () {
      if (!courante) { courante = lire(); marquerDocument(courante); }
      return courante;
    },

    /** Cherche une clé dans le dictionnaire d'une page.
     *  `vars` remplace les jetons {nom} — un pluriel ou un nom propre ne se
     *  concatène pas de la même façon d'une langue à l'autre. */
    t: function (dico, cle, vars) {
      var d = dico[this.courante()] || dico.fr || {};
      var s = d[cle];
      // Repli sur le français plutôt que sur la clé : une traduction oubliée
      // laisse une phrase lisible, pas un identifiant technique à l'écran.
      if (s === undefined) s = (dico.fr || {})[cle];
      if (s === undefined) return cle;
      if (vars) {
        s = String(s).replace(/\{(\w+)\}/g, function (tout, nom) {
          return vars[nom] !== undefined ? vars[nom] : tout;
        });
      }
      return s;
    },

    /** Applique le dictionnaire au balisage statique.
     *    data-i18n        → textContent
     *    data-i18n-html   → innerHTML (à réserver aux libellés qui portent du balisage)
     *    data-i18n-title  → title
     *    data-i18n-ph     → placeholder
     *    data-i18n-aria   → aria-label
     *  Le texte d'origine reste dans le HTML : la page est lisible avant même
     *  que ce module ne s'exécute, et le jour où le script manque, elle reste
     *  en français plutôt que vide. */
    traduire: function (dico, racine) {
      var self = this;
      var hote = racine || document;
      var champs = [
        ['data-i18n', function (el, v) { el.textContent = v; }],
        ['data-i18n-html', function (el, v) { el.innerHTML = v; }],
        ['data-i18n-title', function (el, v) { el.title = v; }],
        ['data-i18n-ph', function (el, v) { el.setAttribute('placeholder', v); }],
        ['data-i18n-aria', function (el, v) { el.setAttribute('aria-label', v); }]
      ];
      champs.forEach(function (c) {
        var els = hote.querySelectorAll('[' + c[0] + ']');
        for (var i = 0; i < els.length; i++) {
          c[1](els[i], self.t(dico, els[i].getAttribute(c[0])));
        }
      });
      var titre = document.querySelector('title[data-i18n]');
      if (titre) document.title = self.t(dico, titre.getAttribute('data-i18n'));
    },

    /** Change de langue et prévient les abonnés. */
    definir: function (l) {
      l = valide(l) || 'fr';
      if (l === courante) return;
      courante = l;
      try { window.localStorage.setItem(CLE, l); } catch (e) {}
      // Le hash suit s'il portait déjà une langue : sinon un rechargement
      // ramènerait l'ancienne, le hash passant devant le stockage.
      if (valide((window.location.hash || '').replace('#', ''))) {
        window.location.hash = l;
      }
      marquerDocument(l);
      majBoutons();
      for (var i = 0; i < abonnes.length; i++) {
        try { abonnes[i](l); } catch (e) {}
      }
    },

    /** S'abonner aux changements de langue. */
    sur: function (fn) { if (typeof fn === 'function') abonnes.push(fn); },

    /** Locale complète, pour les dates et les nombres. */
    locale: function () {
      return { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA', es: 'es-ES' }[this.courante()] || 'fr-FR';
    },

    /** Pose les quatre boutons dans l'élément donné. */
    boutons: function (hote) {
      if (!hote) return;
      hote.innerHTML = '';
      hote.classList.add('lang-switch');
      // Mise en ligne posée ici et non dans une feuille : le module sert deux
      // pages aux styles différents, et .lang-switch n'existe pas dans
      // menu.css (le menu du site aligne ses boutons autrement). Les couleurs,
      // elles, restent à la charge de la page qui l'accueille.
      hote.style.display = 'flex';
      hote.style.gap = '4px';
      LANGUES.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lang-btn';
        b.setAttribute('data-lang', l);
        b.textContent = LIBELLES[l];
        b.addEventListener('click', function () { NJ_LANG.definir(l); });
        hote.appendChild(b);
      });
      majBoutons();
    }
  };

  window.NJ_LANG = NJ_LANG;
  NJ_LANG.courante(); // pose lang/dir tout de suite, avant le premier rendu
})();
