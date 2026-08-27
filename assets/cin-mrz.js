/**
 * assets/cin-mrz.js — lecture MRZ du DOS de la CIN marocaine, 100 % locale.
 *
 * Module partagé (fiche.html en a sa propre copie intégrée ; cette version sert
 * les autres pages, comme ma-selection.html). L'image est traitée entièrement
 * dans le navigateur via Tesseract (OCR) + mrz-td1.js (analyse + chiffres de
 * contrôle). Aucun octet n'est envoyé à un serveur.
 *
 * Dépendance à charger AVANT ce fichier :
 *   assets/vendor/mrz/mrz-td1.js               → window.MRZ
 * Tesseract, lui, est chargé à la demande par precharger() / getWorker() :
 * inutile de faire porter le moteur aux visites qui ne scannent rien.
 *
 * API :
 *   window.NarjissCIN.supported()      -> bool
 *   window.NarjissCIN.scanFile(file)   -> Promise<null | {
 *       nom, prenom, birthDate, documentNumber, expiryDate, ...
 *   }>   (null = lecture impossible / MRZ non valide)
 */
(function () {
  'use strict';

  var worker = null;

  function supported() {
    // Tesseract n'est pas encore chargé à ce stade : on ne teste que l'analyse
    // MRZ, seule dépendance réellement présente au démarrage.
    return typeof window.MRZ !== 'undefined';
  }

  /**
   * Chargement du moteur d'OCR à la demande.
   *
   * tesseract.min.js ne pèse que 66 Ko, mais c'est lui qui déclenche ensuite le
   * téléchargement du cœur WebAssembly (3,9 Mo) et du modèle de police. On ne
   * l'appelle donc qu'au clic sur « Photographier » ou « Importer » : une
   * visite qui ne scanne rien ne paie rien, et le téléchargement démarre
   * pendant que l'appareil photo est ouvert plutôt qu'après la prise de vue.
   */
  var promesseOcr = null;
  function chargerOcr() {
    if (promesseOcr) return promesseOcr;
    if (typeof window.Tesseract !== 'undefined') {
      promesseOcr = Promise.resolve();
      return promesseOcr;
    }
    promesseOcr = new Promise(function (resoudre, rejeter) {
      var el = document.createElement('script');
      el.src = new URL('assets/vendor/tesseract/tesseract.min.js', document.baseURI).href;
      el.onload = function () { resoudre(); };
      el.onerror = function () {
        // Un échec de téléchargement ne doit pas rester silencieux : sans cette
        // remise à zéro, un réseau revenu ne permettrait plus jamais de réessayer.
        promesseOcr = null;
        rejeter(new Error('moteur OCR indisponible'));
      };
      document.head.appendChild(el);
    });
    return promesseOcr;
  }


  async function getWorker() {
    if (worker) return worker;
    await chargerOcr();
    // Tesseract crée son Web Worker en blob : les chemins DOIVENT être absolus.
    var vbase = new URL('assets/vendor/tesseract/', document.baseURI).href;
    var opts = {
      workerPath: vbase + 'worker.min.js',
      corePath: vbase + 'tesseract-core-simd-lstm.wasm.js',
      langPath: vbase + 'lang',
      gzip: true
    };
    try {
      worker = await window.Tesseract.createWorker('ocrb_int', 1, opts);
    } catch (e) {
      worker = await window.Tesseract.createWorker('eng', 1, opts);   // repli
    }
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: '6'
    });
    return worker;
  }

  function loadImage(file) {
    // La capture caméra fournit un canvas : déjà utilisable comme source de
    // dessin, inutile de le repasser par un objet URL.
    if (file && file.tagName === 'CANVAS') return Promise.resolve(file);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image illisible')); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* Canvas optimisé pour l'OCR : rotation, agrandissement ~2200 px, gris, et
     un renfort de contraste optionnel (en dernier recours seulement). */
  function toCanvas(img, rotate, contrast) {
    rotate = rotate || 0;
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var swap = (rotate === 90 || rotate === 270);
    var rw = swap ? ih : iw, rh = swap ? iw : ih;
    var targetW = 2200;
    var scale = rw < targetW ? (targetW / rw) : 1;
    var w = Math.round(rw * scale), h = Math.round(rh * scale);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rotate * Math.PI / 180);
    ctx.drawImage(img, -iw * scale / 2, -ih * scale / 2, iw * scale, ih * scale);
    ctx.restore();
    var data = ctx.getImageData(0, 0, w, h);
    var p = data.data;
    for (var i = 0; i < p.length; i += 4) {
      var g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      if (contrast) g = g < 128 ? Math.max(0, g - 45) : Math.min(255, g + 45);
      p[i] = p[i + 1] = p[i + 2] = g;
    }
    ctx.putImageData(data, 0, 0);
    return cv;
  }

  async function scanFile(file) {
    if (!supported() || !file) return null;
    var w = await getWorker();
    var img = await loadImage(file);
    // 4 orientations (la photo peut être tournée) + renfort de contraste ; on
    // garde la MEILLEURE lecture (nom ET prénom), pas la première valide.
    var attempts = [
      toCanvas(img, 0, false),
      toCanvas(img, 270, false),
      toCanvas(img, 90, false),
      toCanvas(img, 180, false),
      toCanvas(img, 0, true)
    ];
    var parsed = null;
    for (var a = 0; a < attempts.length; a++) {
      var res = await w.recognize(attempts[a]);
      var p = window.MRZ.fromOcrText(res.data.text);
      if (p) {
        if (!parsed) parsed = p;                      // 1re lecture valide = repli
        if (p.nom && p.prenom) { parsed = p; break; } // lecture complète : on garde
      }
    }
    return parsed;
  }

  /* ── Vue caméra avec cadre de visée ─────────────────────────────────
     Le cadre n'est pas décoratif : c'est lui qui est capturé. Photographier
     toute la scène laisse la bande de lettres occuper une fraction de l'image,
     sans assez de pixels pour être lue ; ici la carte remplit le cadre, donc
     l'image transmise à la lecture.

     Le balisage et les styles sont créés ici, pas dans la page : une seule
     description pour toutes les pages qui utilisent ce module. */

  var STYLE_CAM = [
    '.njc-dlg{border:0;padding:0;background:transparent;max-width:96vw}',
    '.njc-dlg::backdrop{background:rgba(0,0,0,.72)}',
    '.njc-boite{background:#10141c;color:#fff;border-radius:14px;padding:.9rem;width:min(92vw,760px)}',
    '.njc-titre{margin:0 0 .6rem;font-weight:700;text-align:center}',
    '.njc-vue{position:relative;background:#000;border-radius:10px;overflow:hidden;aspect-ratio:4/3}',
    /* `contain` : le cadre affiché doit correspondre exactement à ce que voit
       le capteur, sinon la zone capturée ne serait pas celle qu'on a alignée. */
    '.njc-vue video{width:100%;height:100%;object-fit:contain;display:block}',
    '.njc-cadre{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);',
    'width:86%;aspect-ratio:1.585;border:2px solid #ffd166;border-radius:8px;',
    'box-shadow:0 0 0 100vmax rgba(0,0,0,.45);pointer-events:none}',
    '.njc-bande{position:absolute;left:0;right:0;bottom:4%;height:32%;',
    'border:1px dashed rgba(255,209,102,.75);border-radius:4px}',
    '.njc-aide{margin:.6rem 0 0;font-size:.85rem;opacity:.85;text-align:center}',
    '.njc-actions{display:flex;gap:.5rem;justify-content:center;margin-top:.8rem}',
    '.njc-actions button{min-height:44px;padding:0 1.1rem;border-radius:9px;cursor:pointer;',
    'font:inherit;font-weight:700;border:0}',
    '.njc-capturer{background:#14603a;color:#fff}',
    '.njc-fermer{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35)}'
  ].join('');

  function disponible() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Ouvre la caméra et rend la découpe du cadre.
   *
   * @param {{titre:string, aide:string, capturer:string, fermer:string}} libelles
   * @returns {Promise<HTMLCanvasElement|null>} null si la caméra est refusée
   *          ou si l'utilisateur ferme sans capturer.
   */
  function ouvrirCamera(libelles) {
    libelles = libelles || {};
    if (!disponible()) return Promise.resolve(null);

    if (!document.getElementById('njc-style')) {
      var st = document.createElement('style');
      st.id = 'njc-style';
      st.textContent = STYLE_CAM;
      document.head.appendChild(st);
    }

    var dlg = document.createElement('dialog');
    dlg.className = 'njc-dlg';
    dlg.innerHTML =
      '<div class="njc-boite">' +
        '<p class="njc-titre"></p>' +
        '<div class="njc-vue"><video playsinline muted autoplay></video>' +
          '<div class="njc-cadre"><span class="njc-bande"></span></div></div>' +
        '<p class="njc-aide"></p>' +
        '<div class="njc-actions">' +
          '<button type="button" class="njc-capturer"></button>' +
          '<button type="button" class="njc-fermer"></button>' +
        '</div>' +
      '</div>';
    dlg.querySelector('.njc-titre').textContent = libelles.titre || '';
    dlg.querySelector('.njc-aide').textContent = libelles.aide || '';
    dlg.querySelector('.njc-capturer').textContent = libelles.capturer || 'OK';
    dlg.querySelector('.njc-fermer').textContent = libelles.fermer || 'X';
    document.body.appendChild(dlg);

    var video = dlg.querySelector('video');
    var vue = dlg.querySelector('.njc-vue');
    var cadre = dlg.querySelector('.njc-cadre');
    var flux = null;

    function ranger() {
      if (flux) {
        // Sans cet arrêt explicite, la lampe de la caméra reste allumée et le
        // navigateur garde le périphérique occupé.
        flux.getTracks().forEach(function (p) { p.stop(); });
        flux = null;
      }
      video.srcObject = null;
      if (dlg.open) dlg.close();
      dlg.remove();
    }

    /* Découpe la zone du cadre dans l'image du capteur. La vidéo est affichée
       en `contain` : centrée et complète, avec d'éventuelles bandes noires. On
       retrouve la zone filmée par une règle de trois, puis on convertit les
       coordonnées du cadre — exprimées à l'écran — en pixels du capteur. */
    function decouper() {
      var vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return null;
      var boite = vue.getBoundingClientRect();
      var r = cadre.getBoundingClientRect();
      var echelle = Math.min(boite.width / vw, boite.height / vh);
      var decX = (boite.width - vw * echelle) / 2;
      var decY = (boite.height - vh * echelle) / 2;
      var sx = (r.left - boite.left - decX) / echelle;
      var sy = (r.top - boite.top - decY) / echelle;
      var sw = r.width / echelle, sh = r.height / echelle;
      sx = Math.max(0, Math.min(sx, vw - 1));
      sy = Math.max(0, Math.min(sy, vh - 1));
      sw = Math.max(1, Math.min(sw, vw - sx));
      sh = Math.max(1, Math.min(sh, vh - sy));
      var c = document.createElement('canvas');
      c.width = Math.round(sw); c.height = Math.round(sh);
      c.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return c;
    }

    return new Promise(function (resoudre) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' },
                 width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      }).then(function (f) {
        flux = f;
        video.srcObject = f;
        dlg.showModal();
        dlg.querySelector('.njc-capturer').addEventListener('click', function () {
          var image = decouper();
          ranger();
          resoudre(image);
        });
        dlg.querySelector('.njc-fermer').addEventListener('click', function () {
          ranger(); resoudre(null);
        });
        dlg.addEventListener('cancel', function () { ranger(); resoudre(null); });
      }).catch(function () {
        dlg.remove();
        resoudre(null);
      });
    });
  }

  window.NarjissCIN = { supported: supported,
    precharger: function () { return chargerOcr(); }, scanFile: scanFile,
    cameraDisponible: disponible, ouvrirCamera: ouvrirCamera };
})();
