/* ============================================================
   VOIR LE MOT DE PASSE PENDANT LA SAISIE
   ------------------------------------------------------------
   Un champ masqué se saisit à l'aveugle. Sur un téléphone, avec
   un clavier qui corrige tout seul, c'est la première cause
   d'échec de connexion — et l'erreur ne se voit qu'après coup,
   sous la forme d'un « identifiants incorrects » qui n'apprend
   rien.

   Ce fichier équipe TOUS les champs de mot de passe de la page,
   sans que chacune ait à s'en occuper : un seul <script> suffit,
   y compris sur les champs ajoutés plus tard (voir l'observateur
   en fin de fichier).

   Rien n'est mémorisé : le champ repasse en masqué à chaque
   chargement. Un mot de passe laissé en clair sur un poste
   d'agence, c'est le mot de passe donné à qui passe derrière.
   ============================================================ */
(function () {
  'use strict';

  var MOTS = {
    fr: { voir: 'Afficher le mot de passe', cacher: 'Masquer le mot de passe' },
    en: { voir: 'Show password', cacher: 'Hide password' },
    ar: { voir: 'إظهار كلمة المرور', cacher: 'إخفاء كلمة المرور' },
    es: { voir: 'Mostrar la contraseña', cacher: 'Ocultar la contraseña' }
  };

  function langue() {
    var l = (document.documentElement.getAttribute('lang') || 'fr').slice(0, 2);
    return MOTS[l] ? l : 'fr';
  }

  /* L'œil et l'œil barré, dessinés plutôt qu'écrits : le bouton doit rester
     carré quelle que soit la langue, et un mot y changerait sa largeur. */
  var OEIL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>' +
    '<circle cx="12" cy="12" r="3"/></svg>';
  var OEIL_BARRE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
    '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>' +
    '<line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function styleUneFois() {
    if (document.getElementById('njVoirMdpStyle')) return;
    var s = document.createElement('style');
    s.id = 'njVoirMdpStyle';
    s.textContent =
      '.nj-mdp-boite{position:relative;display:block}' +
      /* Le champ se rétrécit de la largeur du bouton : posé PAR-DESSUS, il
         recouvrirait la fin d'un mot de passe long. */
      '.nj-mdp-boite>input{padding-inline-end:2.9rem!important;width:100%;box-sizing:border-box}' +
      '.nj-mdp-oeil{position:absolute;top:50%;inset-inline-end:.35rem;transform:translateY(-50%);' +
      'display:inline-flex;align-items:center;justify-content:center;' +
      'width:2.2rem;height:2.2rem;padding:0;border:0;border-radius:8px;' +
      'background:transparent;color:currentColor;opacity:.62;cursor:pointer}' +
      '.nj-mdp-oeil:hover{opacity:1}' +
      '.nj-mdp-oeil:focus-visible{outline:2px solid currentColor;outline-offset:1px;opacity:1}';
    document.head.appendChild(s);
  }

  function equiper(champ) {
    if (!champ || champ.dataset.njMdp === '1') return;
    // Un champ caché ou en lecture seule n'a personne à aider.
    if (champ.disabled || champ.readOnly) return;
    champ.dataset.njMdp = '1';

    styleUneFois();
    var t = MOTS[langue()];

    var boite = document.createElement('span');
    boite.className = 'nj-mdp-boite';
    champ.parentNode.insertBefore(boite, champ);
    boite.appendChild(champ);

    var bouton = document.createElement('button');
    bouton.type = 'button';           // sans quoi il enverrait le formulaire
    bouton.className = 'nj-mdp-oeil';
    bouton.tabIndex = -1;             // la tabulation va du champ au bouton d'envoi
    bouton.innerHTML = OEIL;
    bouton.setAttribute('aria-label', t.voir);
    bouton.title = t.voir;
    boite.appendChild(bouton);

    bouton.addEventListener('click', function () {
      var montre = champ.type === 'password';
      champ.type = montre ? 'text' : 'password';
      bouton.innerHTML = montre ? OEIL_BARRE : OEIL;
      bouton.setAttribute('aria-label', montre ? t.cacher : t.voir);
      bouton.title = bouton.getAttribute('aria-label');
      /* Le curseur revient où il était : sans ça, changer de type le renvoie
         au début du champ et la frappe suivante s'insère devant tout. */
      var pos = champ.value.length;
      champ.focus();
      try { champ.setSelectionRange(pos, pos); } catch (e) { /* type sans sélection */ }
    });
  }

  function balayer(racine) {
    var champs = (racine || document).querySelectorAll('input[type="password"]');
    for (var i = 0; i < champs.length; i++) equiper(champs[i]);
  }

  function demarrer() {
    balayer(document);
    /* Les formulaires construits par script — la réinitialisation, l'espace
       commercial — arrivent après ce fichier. On surveille donc les ajouts
       plutôt que de demander à chaque page de nous rappeler. */
    if (window.MutationObserver) {
      new MutationObserver(function (lots) {
        for (var i = 0; i < lots.length; i++) {
          var n = lots[i].addedNodes;
          for (var j = 0; j < n.length; j++) {
            if (n[j].nodeType !== 1) continue;
            if (n[j].matches && n[j].matches('input[type="password"]')) equiper(n[j]);
            else balayer(n[j]);
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
