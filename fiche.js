(function() {
  'use strict';

  /* =========================================================================
     Fiche de renseignement client — tablette du bureau de vente.
     Bilingue FR / AR : le client signe un consentement, il doit pouvoir le lire.
     ========================================================================= */

  var T = {
    fr: {
      subtitle: "Fiche de renseignement — bureau de vente",
      s0: "Visite", s1: "1. Identité", s2: "2. Coordonnées",
      s3: "3. Situation professionnelle", s4: "4. Projet d'acquisition",
      s5: "5. Origine du contact", s6: "6. Pièces justificatives", s7: "7. Consentement",
      projet: "Projet visité *", conseiller: "Conseiller",
      nom: "Nom *", prenom: "Prénom *", naissance: "Date de naissance",
      nationalite: "Nationalité", cnie: "N° CNIE", cnieval: "CNIE valable jusqu'au",
      passeport: "N° Passeport (non-résident)", situation: "Situation familiale",
      choose: "— Choisir —", celib: "Célibataire", marie: "Marié(e)", autre: "Autre",
      adresse: "Adresse", ville: "Ville", pays: "Pays de résidence",
      tel: "Téléphone *", email: "E-mail", mre: "Marocain résidant à l'étranger (MRE)",
      profession: "Profession", employeur: "Employeur",
      revenu: "Revenu mensuel net", fonds: "Origine des fonds",
      typebien: "Type de bien recherché", usage: "Usage prévu",
      financement: "Mode de financement", echeance: "Échéance envisagée",
      budget: "Budget envisagé", superficie: "Superficie souhaitée", observations: "Observations",
      signature: "Signature du client", effacer: "Effacer", envoyer: "Enregistrer la fiche",
      mrzTitle: "Remplissage automatique",
      mrzHint: "Photographiez le dos de votre carte nationale : les champs se remplissent seuls.",
      mrzScanBtn: "📷 Scanner ou importer le dos de la CIN",
      mrzReading: "Lecture en cours… gardez la carte bien à plat et nette.",
      mrzOk: "Carte lue avec succès. Vérifiez les champs remplis.",
      mrzKo: "Lecture impossible. Reprenez la photo (bien nette, MRZ visible) ou remplissez à la main.",
      consent1: "Je reconnais avoir été informé(e) de ce qui précède et je consens au traitement de mes données pour les finalités indiquées.",
      consent2: "J'accepte de recevoir des offres commerciales de Narjiss Immobilière (facultatif, sans effet sur ma demande).",
      photographier: "📷 Photo ou fichier", reprendre: "Remplacer l'image",
      envoiEnCours: "Enregistrement…",
      okTitre: "Fiche enregistrée. Merci !",
      okRef: "Référence de votre fiche :",
      errObligatoire: "Merci de remplir les champs obligatoires (projet, nom, prénom, téléphone).",
      errConsent: "Le consentement au traitement des données est obligatoire.",
      errSignature: "La signature du client est requise.",
      errReseau: "Enregistrement impossible. Vérifiez la connexion et réessayez."
    },
    ar: {
      subtitle: "بطاقة معلومات — مكتب البيع",
      s0: "الزيارة", s1: "1. الهوية", s2: "2. معطيات الاتصال",
      s3: "3. الوضعية المهنية", s4: "4. مشروع الاقتناء",
      s5: "5. مصدر الاتصال", s6: "6. الوثائق", s7: "7. الموافقة",
      projet: "المشروع المزار *", conseiller: "المستشار",
      nom: "الاسم العائلي *", prenom: "الاسم الشخصي *", naissance: "تاريخ الازدياد",
      nationalite: "الجنسية", cnie: "رقم البطاقة الوطنية", cnieval: "صالحة إلى غاية",
      passeport: "رقم جواز السفر (لغير المقيمين)", situation: "الحالة العائلية",
      choose: "— اختر —", celib: "أعزب / عزباء", marie: "متزوج(ة)", autre: "أخرى",
      adresse: "العنوان", ville: "المدينة", pays: "بلد الإقامة",
      tel: "الهاتف *", email: "البريد الإلكتروني", mre: "مغربي مقيم بالخارج",
      profession: "المهنة", employeur: "المشغّل",
      revenu: "الدخل الشهري الصافي", fonds: "مصدر الأموال",
      typebien: "نوع العقار المطلوب", usage: "الاستعمال المتوقع",
      financement: "طريقة التمويل", echeance: "الأجل المتوقع",
      budget: "الميزانية", superficie: "المساحة المطلوبة", observations: "ملاحظات",
      signature: "توقيع الزبون", effacer: "مسح", envoyer: "تسجيل البطاقة",
      mrzTitle: "التعبئة التلقائية",
      mrzHint: "صوّروا ظهر البطاقة الوطنية: تُملأ الحقول تلقائياً.",
      mrzScanBtn: "📷 مسح أو استيراد ظهر البطاقة",
      mrzReading: "جاري القراءة… أبقوا البطاقة مسطحة وواضحة.",
      mrzOk: "تمت قراءة البطاقة بنجاح. تحققوا من الحقول.",
      mrzKo: "تعذرت القراءة. أعيدوا التصوير (بوضوح) أو املؤوا يدوياً.",
      consent1: "أقر بأنني اطلعت على ما سبق وأوافق على معالجة بياناتي للأغراض المذكورة.",
      consent2: "أوافق على تلقي العروض التجارية من نرجس العقارية (اختياري، دون أثر على طلبي).",
      photographier: "📷 صورة أو ملف", reprendre: "تغيير الصورة",
      envoiEnCours: "جاري التسجيل…",
      okTitre: "تم تسجيل البطاقة. شكراً لكم!",
      okRef: "مرجع بطاقتكم:",
      errObligatoire: "المرجو ملء الحقول الإجبارية (المشروع، الاسم، النسب، الهاتف).",
      errConsent: "الموافقة على معالجة البيانات إجبارية.",
      errSignature: "توقيع الزبون مطلوب.",
      errReseau: "تعذر التسجيل. تحققوا من الاتصال وأعيدوا المحاولة."
    }
  };

  /* Mentions légales — traitées à part : ce sont elles qui rendent le
     consentement valable, elles ne doivent jamais être tronquées. */
  var LEGAL = {
    fr: "Les informations recueillies font l'objet d'un traitement par NARJISS IMMOBILIÈRE, responsable du traitement, " +
        "aux fins de : (i) le suivi de votre demande commerciale et la constitution de votre dossier d'acquisition ; " +
        "(ii) le respect des obligations d'identification de la clientèle prévues par la loi n° 43-05 relative à la lutte " +
        "contre le blanchiment de capitaux. Ce traitement est déclaré auprès de la CNDP conformément à la loi n° 09-08. " +
        "Vos données et les copies de pièces d'identité sont conservées pendant la durée légale applicable, puis supprimées. " +
        "Elles ne sont transmises à aucun tiers hors obligations légales. Vous disposez d'un droit d'accès, de rectification " +
        "et d'opposition aux données vous concernant.",
    ar: "تخضع المعلومات المجمّعة لمعالجة من طرف نرجس العقارية، المسؤولة عن المعالجة، من أجل: (1) تتبع طلبكم التجاري " +
        "وتكوين ملف الاقتناء الخاص بكم؛ (2) احترام التزامات التعرف على الزبناء المنصوص عليها في القانون رقم 43-05 " +
        "المتعلق بمكافحة غسل الأموال. وقد تم التصريح بهذه المعالجة لدى اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع " +
        "الشخصي طبقاً للقانون رقم 09-08. تُحفظ معطياتكم ونسخ وثائق الهوية طيلة المدة القانونية المعمول بها ثم تُحذف. " +
        "ولا تُنقل إلى أي طرف ثالث خارج الالتزامات القانونية. لكم الحق في الولوج إلى معطياتكم وتصحيحها والاعتراض عليها."
  };

  /* Les valeurs (value) sont celles attendues par api/fiche.php ; seuls les
     libellés changent avec la langue. */
  var CHOICES = {
    revenu: { name: 'revenu', type: 'radio', host: 'revenuChoices', items: [
      ['<10k',   "Moins de 10 000 DH", "أقل من 10.000 درهم"],
      ['10-20k', "10 000 – 20 000 DH", "10.000 – 20.000 درهم"],
      ['20-40k', "20 000 – 40 000 DH", "20.000 – 40.000 درهم"],
      ['>40k',   "Plus de 40 000 DH",  "أكثر من 40.000 درهم"]
    ]},
    fonds: { name: 'origine_fonds[]', type: 'checkbox', host: 'fondsChoices', items: [
      ['epargne',  "Épargne",              "ادخار"],
      ['credit',   "Crédit bancaire",      "قرض بنكي"],
      ['cession',  "Cession de bien",      "بيع عقار"],
      ['donation', "Donation / héritage",  "هبة / إرث"],
      ['autre',    "Autre",                "أخرى"]
    ]},
    type: { name: 'type_bien[]', type: 'checkbox', host: 'typeChoices', items: [
      ['appartement', "Appartement",      "شقة"],
      ['villa',       "Villa",            "فيلا"],
      ['terrain',     "Lot de terrain",   "بقعة أرضية"],
      ['commercial',  "Local commercial", "محل تجاري"],
      ['bureau',      "Bureau",           "مكتب"]
    ]},
    usage: { name: 'usage', type: 'radio', host: 'usageChoices', items: [
      ['principale', "Résidence principale",   "سكن رئيسي"],
      ['secondaire', "Résidence secondaire",   "سكن ثانوي"],
      ['locatif',    "Investissement locatif", "استثمار كرائي"],
      ['revente',    "Revente",                "إعادة البيع"]
    ]},
    fin: { name: 'financement', type: 'radio', host: 'finChoices', items: [
      ['comptant', "Comptant",       "نقداً"],
      ['credit',   "Crédit bancaire","قرض بنكي"],
      ['mixte',    "Mixte",          "مختلط"]
    ]},
    ech: { name: 'echeance', type: 'radio', host: 'echChoices', items: [
      ['immediate', "Immédiate",       "فورية"],
      ['<6m',       "Moins de 6 mois", "أقل من 6 أشهر"],
      ['6-12m',     "6 à 12 mois",     "من 6 إلى 12 شهراً"],
      ['>12m',      "Plus de 12 mois", "أكثر من 12 شهراً"]
    ]},
    contact: { name: 'origine_contact[]', type: 'checkbox', host: 'contactChoices', items: [
      ['site',           "Site web",              "الموقع الإلكتروني"],
      ['visite360',      "Visite virtuelle 360°", "الجولة الافتراضية 360"],
      ['reseaux',        "Réseaux sociaux",       "شبكات التواصل"],
      ['affichage',      "Panneau / affichage",   "لوحة إشهارية"],
      ['recommandation', "Recommandation",        "توصية"],
      ['salon',          "Salon immobilier",      "معرض عقاري"],
      ['spontane',       "Passage spontané",      "زيارة عفوية"],
      ['autre',          "Autre",                 "أخرى"]
    ]}
  };

  var PIECES = [
    ['cnie-recto',  "CNIE — recto",   "البطاقة الوطنية — الوجه"],
    ['cnie-verso',  "CNIE — verso",   "البطاقة الوطنية — الظهر"],
    ['passeport',   "Passeport",      "جواز السفر"],
    ['justificatif',"Justificatif",   "وثيقة مثبتة"]
  ];

  var lang = 'fr';

  function t(key) { return (T[lang] || T.fr)[key] || ''; }
  function label(item) { return lang === 'ar' ? item[2] : item[1]; }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ── Construction des groupes de choix ──────────────────────────────── */
  function buildChoices() {
    Object.keys(CHOICES).forEach(function(key) {
      var g = CHOICES[key];
      var host = document.getElementById(g.host);
      if (!host) return;
      var html = '';
      g.items.forEach(function(item) {
        html += '<label><input type="' + g.type + '" name="' + g.name + '" value="' + esc(item[0]) + '"> ' +
                '<span>' + esc(label(item)) + '</span></label>';
      });
      host.innerHTML = html;
    });
  }

  /* ── Pièces justificatives (caméra de la tablette) ──────────────────── */
  function buildPieces() {
    var host = document.getElementById('piecesGrid');
    if (!host) return;
    var html = '';
    PIECES.forEach(function(p) {
      html += '<div class="piece" data-piece="' + esc(p[0]) + '">' +
                '<b>' + esc(label(p)) + '</b>' +
                '<label class="pick">' + esc(t('photographier')) +
                  '<input type="file" name="' + esc(p[0]) + '" accept="image/*">' +
                '</label>' +
                '<img alt="">' +
                '<span class="status"></span>' +
              '</div>';
    });
    host.innerHTML = html;

    host.querySelectorAll('.piece').forEach(function(box) {
      var input = box.querySelector('input[type=file]');
      input.addEventListener('change', function() {
        var file = this.files && this.files[0];
        var img = box.querySelector('img');
        var status = box.querySelector('.status');
        if (!file) { img.classList.remove('show'); status.textContent = ''; return; }
        // Aperçu local uniquement : rien n'est envoyé avant la validation.
        img.src = URL.createObjectURL(file);
        img.classList.add('show');
        status.textContent = Math.round(file.size / 1024) + ' Ko';
        box.querySelector('.pick').firstChild.nodeValue = t('reprendre');
      });
    });
  }

  /* ── Signature manuscrite ───────────────────────────────────────────── */
  var sigCanvas, sigCtx, sigDrawn = false;

  function setupSignature() {
    sigCanvas = document.getElementById('sigPad');
    if (!sigCanvas) return;

    function resize() {
      // Le canvas doit être redimensionné en pixels réels, sinon le trait
      // est flou et décalé par rapport au doigt sur écran haute densité.
      var ratio = window.devicePixelRatio || 1;
      var rect = sigCanvas.getBoundingClientRect();
      var data = sigDrawn ? sigCanvas.toDataURL() : null;
      sigCanvas.width = rect.width * ratio;
      sigCanvas.height = rect.height * ratio;
      sigCtx = sigCanvas.getContext('2d');
      sigCtx.scale(ratio, ratio);
      sigCtx.lineWidth = 2.2;
      sigCtx.lineCap = 'round';
      sigCtx.lineJoin = 'round';
      sigCtx.strokeStyle = '#1f2430';
      if (data) {
        var img = new Image();
        img.onload = function() { sigCtx.drawImage(img, 0, 0, rect.width, rect.height); };
        img.src = data;
      }
    }
    resize();
    window.addEventListener('resize', resize);

    var drawing = false;

    function pos(e) {
      var r = sigCanvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    sigCanvas.addEventListener('pointerdown', function(e) {
      drawing = true;
      sigDrawn = true;
      sigCanvas.setPointerCapture(e.pointerId);
      var p = pos(e);
      sigCtx.beginPath();
      sigCtx.moveTo(p.x, p.y);
      e.preventDefault();
    });
    sigCanvas.addEventListener('pointermove', function(e) {
      if (!drawing) return;
      var p = pos(e);
      sigCtx.lineTo(p.x, p.y);
      sigCtx.stroke();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev) {
      sigCanvas.addEventListener(ev, function() { drawing = false; });
    });

    document.getElementById('sigClear').onclick = function() {
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      sigDrawn = false;
    };
  }

  /* ── Liste des projets ──────────────────────────────────────────────── */
  function fillProjects() {
    var sel = document.getElementById('projetSelect');
    if (!sel) return;
    var list = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get('projet') || '';
    var html = '<option value="">' + esc(t('choose')) + '</option>';
    list.forEach(function(p) {
      var name = (p.name && (p.name[lang === 'ar' ? 'ar' : 'fr'] || p.name.fr)) || p.id;
      html += '<option value="' + esc(p.id) + '"' + (p.id === wanted ? ' selected' : '') + '>' +
              esc(name) + '</option>';
    });
    sel.innerHTML = html;
  }

  /* ── Langue ─────────────────────────────────────────────────────────── */
  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var value = t(key);
      if (!value) return;
      // On préserve l'astérisque « obligatoire » présente dans le libellé.
      if (/\*$/.test(value)) {
        el.innerHTML = esc(value.replace(/\s*\*$/, '')) + ' <b class="req">*</b>';
      } else {
        el.textContent = value;
      }
    });

    document.getElementById('legalText').textContent = LEGAL[next] || LEGAL.fr;
    document.querySelectorAll('.lang-switch button').forEach(function(b) {
      b.classList.toggle('on', b.getAttribute('data-lang') === next);
    });

    buildChoices();
    buildPieces();
    fillProjects();
  }

  /* ── Envoi ──────────────────────────────────────────────────────────── */
  function showResult(kind, html) {
    var box = document.getElementById('result');
    box.className = 'result show ' + kind;
    box.innerHTML = html;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function submitForm(e) {
    e.preventDefault();
    var form = document.getElementById('ficheForm');
    var btn = document.getElementById('sendBtn');

    if (!form.projet.value || !form.nom.value.trim() || !form.prenom.value.trim() || !form.telephone.value.trim()) {
      showResult('ko', esc(t('errObligatoire')));
      return;
    }
    if (!document.getElementById('consentBox').checked) {
      showResult('ko', esc(t('errConsent')));
      return;
    }
    if (!sigDrawn) {
      showResult('ko', esc(t('errSignature')));
      return;
    }

    var data = new FormData(form);
    data.set('signature', sigCanvas.toDataURL('image/png'));

    btn.disabled = true;
    btn.textContent = t('envoiEnCours');

    fetch('api/fiche.php', { method: 'POST', body: data })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res || !res.ok) throw new Error((res && res.error) || 'ko');
        showResult('ok', esc(t('okTitre')) + '<span class="ref">' + esc(res.reference) + '</span>');
        form.reset();
        document.getElementById('sigClear').click();
        buildPieces();
        btn.disabled = false;
        btn.textContent = t('envoyer');
      })
      .catch(function(err) {
        showResult('ko', esc(err.message && err.message !== 'ko' ? err.message : t('errReseau')));
        btn.disabled = false;
        btn.textContent = t('envoyer');
      });
  }

  /* ── Lecture MRZ de la CIN (dos) → remplissage automatique ──────────────
     L'image est traitée entièrement dans le navigateur (OCR Tesseract local).
     Le remplissage n'a lieu QUE si les chiffres de contrôle de la MRZ valident
     — sinon on ne touche à rien : jamais de donnée fausse injectée. */
  var mrzWorker = null;

  function mrzSetStatus(kind, msg) {
    var el = document.getElementById('mrzStatus');
    if (!el) return;
    el.className = 'mrz-status' + (kind ? ' ' + kind : '');
    el.textContent = msg || '';
  }

  function setIfEmpty(name, value) {
    if (!value) return;
    var el = document.querySelector('[name="' + name + '"]');
    if (el && !el.value) el.value = value;
  }

  async function getMrzWorker() {
    if (mrzWorker) return mrzWorker;
    // Tesseract crée un Web Worker en blob (sa base d'URL devient « blob:… ») :
    // les chemins passés ici DOIVENT être absolus, sinon l'importScripts interne
    // échoue avec « The URL '…/worker.min.js' is invalid » et l'OCR ne démarre
    // jamais. On résout donc sur document.baseURI.
    var vbase = new URL('assets/vendor/tesseract/', document.baseURI).href;
    // Assets vendorisés : aucun appel à un CDN, tout est servi localement.
    mrzWorker = await Tesseract.createWorker('eng', 1, {
      workerPath: vbase + 'worker.min.js',
      corePath: vbase + 'tesseract-core-simd-lstm.wasm.js',
      langPath: vbase + 'lang',
      gzip: true
    });
    // La MRZ n'utilise qu'un jeu de caractères restreint : on le contraint,
    // ce qui réduit fortement les erreurs d'OCR.
    await mrzWorker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: '6'          // bloc de texte uniforme
    });
    return mrzWorker;
  }

  function loadImageFromFile(file) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload = function() { resolve(img); };
      img.onerror = function() { reject(new Error('image illisible')); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* Prépare un canvas optimisé pour l'OCR de la MRZ à partir d'une photo :
     recadrage vertical optionnel (la MRZ est en bas d'une carte à plat),
     agrandissement à ~1600 px de large, niveaux de gris et renforcement de
     contraste. Une photo brute de carte entière lit mal ; ce nettoyage change
     tout. */
  function mrzCanvas(img, cropTopFrac, contrast) {
    var sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (cropTopFrac) { sy = Math.round(sh * cropTopFrac); sh = sh - sy; }
    var targetW = 1600;
    var scale = sw < targetW ? (targetW / sw) : 1;
    var w = Math.round(sw * scale), h = Math.round(sh * scale);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h);
    var p = data.data;
    for (var i = 0; i < p.length; i += 4) {
      var g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      // Un contraste trop agressif épaissit les chevrons « < » et casse la
      // séparation « << » nom/prénom : par défaut on reste en simples niveaux
      // de gris, le contraste n'est appliqué qu'en dernier recours.
      if (contrast) g = g < 128 ? Math.max(0, g - 45) : Math.min(255, g + 45);
      p[i] = p[i + 1] = p[i + 2] = g;
    }
    ctx.putImageData(data, 0, 0);
    return cv;
  }

  // Affiche le texte OCR brut directement sous le bouton (mode ?mrzdebug=1),
  // pour diagnostiquer sur mobile sans ouvrir la console du navigateur.
  function mrzShowDebug(text) {
    var el = document.getElementById('mrzDebugOut');
    if (!el) {
      el = document.createElement('pre');
      el.id = 'mrzDebugOut';
      el.style.cssText = 'white-space:pre-wrap;font-size:11px;line-height:1.35;' +
        'background:#0b1021;color:#7CFC98;padding:10px;margin-top:10px;max-height:240px;' +
        'overflow:auto;border-radius:8px;user-select:all';
      var host = document.getElementById('mrzStatus');
      if (host && host.parentNode) host.parentNode.appendChild(el);
      else document.body.appendChild(el);
    }
    el.textContent = text;
  }

  function setupMrz() {
    var input = document.getElementById('mrzInput');
    if (!input) return;

    // Sans support (très vieux navigateur), on masque la fonction : la saisie
    // manuelle reste toujours possible.
    if (typeof Tesseract === 'undefined' || typeof window.MRZ === 'undefined') {
      var box = document.getElementById('mrzScan');
      if (box) box.style.display = 'none';
      return;
    }

    // ?mrzdebug=1 dans l'URL : journalise le texte OCR brut dans la console,
    // pour diagnostiquer une photo qui ne se lit pas.
    var MRZ_DEBUG = /[?&]mrzdebug=1/.test(location.search);

    input.addEventListener('change', async function () {
      var file = this.files && this.files[0];
      if (!file) return;
      mrzSetStatus('', t('mrzReading'));

      try {
        var worker = await getMrzWorker();
        var img = await loadImageFromFile(file);
        // Plusieurs prétraitements successifs : image entière en niveaux de
        // gris, puis bande basse (MRZ d'une carte à plat), puis contraste
        // renforcé en dernier recours. On conserve la MEILLEURE lecture (nom ET
        // prénom) plutôt que la première simplement valide.
        var attempts = [
          mrzCanvas(img, 0, false),
          mrzCanvas(img, 0.5, false),
          mrzCanvas(img, 0, true)
        ];
        var parsed = null, dump = '';
        for (var a = 0; a < attempts.length; a++) {
          var res = await worker.recognize(attempts[a]);
          if (MRZ_DEBUG) dump += '=== essai ' + (a + 1) + ' ===\n' + res.data.text + '\n';
          var p = window.MRZ.fromOcrText(res.data.text);
          if (p) {
            if (!parsed) parsed = p;                         // 1re lecture valide = repli
            if (p.nom && p.prenom) { parsed = p; break; }    // lecture complète : on garde
          }
        }
        if (MRZ_DEBUG) {
          console.log('[MRZ debug]\n' + dump);
          mrzShowDebug(dump + '\n>> résultat: ' + JSON.stringify(parsed));
        }

        if (!parsed) { mrzSetStatus('ko', t('mrzKo')); return; }

        // Remplissage — uniquement les champs présents dans la MRZ, et sans
        // écraser ce que le client aurait déjà saisi.
        setIfEmpty('nom', parsed.nom);
        setIfEmpty('prenom', parsed.prenom);
        setIfEmpty('date_naissance', parsed.birthDate);
        setIfEmpty('cnie', parsed.documentNumber);
        setIfEmpty('cnie_validite', parsed.expiryDate);
        mrzSetStatus('ok', t('mrzOk'));
      } catch (e) {
        if (MRZ_DEBUG) {
          console.log('[MRZ debug] erreur', e);
          mrzShowDebug('ERREUR: ' + (e && (e.name + ': ' + e.message) || String(e)));
        }
        mrzSetStatus('ko', t('mrzKo'));
      } finally {
        this.value = '';                  // permet une reprise immédiate
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.lang-switch button').forEach(function(b) {
      b.onclick = function() { applyLang(this.getAttribute('data-lang')); };
    });
    setupSignature();
    setupMrz();
    applyLang('fr');
    document.getElementById('ficheForm').addEventListener('submit', submitForm);

    // menu.js charge data/projects.json de façon asynchrone : on repeuple
    // la liste quand elle arrive, sinon seuls les projets par défaut sortent.
    if (typeof window.loadSiteProjects === 'function') {
      window.loadSiteProjects().then(fillProjects).catch(function() {});
    }
  });
})();
