/**
 * assets/cin-mrz.js — lecture MRZ du DOS de la CIN marocaine, 100 % locale.
 *
 * Module partagé (fiche.html en a sa propre copie intégrée ; cette version sert
 * les autres pages, comme ma-selection.html). L'image est traitée entièrement
 * dans le navigateur via Tesseract (OCR) + mrz-td1.js (analyse + chiffres de
 * contrôle). Aucun octet n'est envoyé à un serveur.
 *
 * Dépendances (à charger AVANT ce fichier) :
 *   assets/vendor/tesseract/tesseract.min.js   → window.Tesseract
 *   assets/vendor/mrz/mrz-td1.js               → window.MRZ
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
    return typeof window.Tesseract !== 'undefined' && typeof window.MRZ !== 'undefined';
  }

  async function getWorker() {
    if (worker) return worker;
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
    var iw = img.naturalWidth, ih = img.naturalHeight;
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

  window.NarjissCIN = { supported: supported, scanFile: scanFile };
})();
