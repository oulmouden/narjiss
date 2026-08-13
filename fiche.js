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
      qrAffichettes: "Affichettes QR (bureau de vente)",
      nouveauClient: "Nouveau client",
      resetConfirm: "Effacer toute la fiche et démarrer un nouveau client ?",
      mrzTitle: "Remplissage automatique",
      mrzHint: "Photographiez le dos de votre carte nationale : les champs se remplissent seuls.",
      mrzScanBtn: "🖼️ Importer une image",
      mrzCamBtn: "📷 Photographier la CIN",
      mrzLiveBtn: "🎥 Scanner avec la caméra",
      camTitre: "Placez la carte dans le cadre",
      camAide: "Le dos de la carte, bien à plat. La bande de lettres du bas doit être nette.",
      camCapturer: "Capturer", camFermer: "Fermer",
      camRefus: "Caméra indisponible ou refusée. Utilisez « Photographier ».",
      btnCsv: "⤓ CSV", btnPdf: "⤓ PDF",
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
      qrAffichettes: "ملصقات QR (مكتب البيع)",
      nouveauClient: "زبون جديد",
      resetConfirm: "مسح كل البطاقة والبدء بزبون جديد؟",
      mrzTitle: "التعبئة التلقائية",
      mrzHint: "صوّروا ظهر البطاقة الوطنية: تُملأ الحقول تلقائياً.",
      mrzScanBtn: "🖼️ استيراد صورة",
      mrzCamBtn: "📷 تصوير البطاقة الوطنية",
      mrzLiveBtn: "🎥 المسح بالكاميرا",
      camTitre: "ضعوا البطاقة داخل الإطار",
      camAide: "ظهر البطاقة، مسطّحاً. يجب أن يكون شريط الحروف واضحاً.",
      camCapturer: "التقاط", camFermer: "إغلاق",
      camRefus: "الكاميرا غير متاحة أو مرفوضة. استعملوا « التصوير ».",
      btnCsv: "⤓ CSV", btnPdf: "⤓ PDF",
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

  /* Pré-remplissage depuis l'URL : quand on arrive de « Ma sélection » (client
     qui n'a pas encore choisi), on emporte les coordonnées déjà saisies pour
     ne pas les redemander. On ne remplit que les champs vides. */
  function prefillFromUrl() {
    var params = new URLSearchParams(window.location.search);
    ['nom', 'prenom', 'telephone', 'email', 'ville'].forEach(function (k) {
      var v = params.get(k);
      if (v) setIfEmpty(k, v);
    });
    refreshRequired();
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
        // Le récapitulatif est constitué AVANT la remise à zéro du
        // formulaire : après form.reset(), les champs sont vides et il n'y
        // aurait plus rien à exporter.
        var recap = collecterFiche(form, res.reference);
        showResult('ok', esc(t('okTitre')) + '<span class="ref">' + esc(res.reference) + '</span>' +
          '<div class="result-actions">' +
            '<button type="button" id="btnCsv">' + esc(t('btnCsv')) + '</button>' +
            '<button type="button" id="btnPdf">' + esc(t('btnPdf')) + '</button>' +
          '</div>');
        document.getElementById('btnCsv').onclick = function () { exporterCsv(recap); };
        document.getElementById('btnPdf').onclick = function () { exporterPdf(recap); };
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

  /* ── Enregistrement local de la fiche : CSV et PDF ─────────────────────── */

  /**
   * Récapitulatif lisible de ce qui vient d'être envoyé.
   *
   * Les libellés sont pris sur le formulaire lui-même plutôt que redéfinis
   * ici : le récapitulatif suit ainsi la langue affichée, et une étiquette
   * modifiée dans la page n'a pas à l'être une seconde fois.
   */
  function collecterFiche(form, reference) {
    var lignes = [];
    var parNom = {};

    function libelle(el) {
      var lab = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
      if (!lab && el.closest) lab = el.closest('label');
      if (!lab) return el.name;
      /* Le libellé enveloppe parfois le champ lui-même : sans cette copie
         élaguée, le titre d'une liste déroulante emportait le texte de TOUTES
         ses options (« Projet visité — Choisir — Residence Al Jawhara… »). */
      var copie = lab.cloneNode(true);
      [].forEach.call(copie.querySelectorAll('select, input, textarea, option'),
        function (nx) { nx.parentNode.removeChild(nx); });
      var texte = copie.textContent.replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').trim();
      return texte || el.name;
    }

    [].forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (['file', 'submit', 'button', 'reset', 'hidden'].indexOf(el.type) !== -1) return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;

      var valeur = (el.value || '').trim();
      if (!valeur) return;
      // Pour une liste déroulante, le texte affiché parle, pas le code interne.
      if (el.tagName === 'SELECT' && el.selectedIndex >= 0) {
        valeur = el.options[el.selectedIndex].textContent.trim();
      }
      // Les cases d'un même groupe (origine des fonds, type de bien…) se
      // cumulent sur une seule ligne au lieu d'en produire une par case.
      var cle = el.name;
      if (parNom[cle] !== undefined) {
        lignes[parNom[cle]][1] += ', ' + valeur;
        return;
      }
      parNom[cle] = lignes.length;
      lignes.push([libelle(el), valeur]);
    });

    return { reference: reference, date: new Date().toLocaleString(), lignes: lignes };
  }

  /** Déclenche le téléchargement d'un contenu construit dans le navigateur. */
  function telecharger(blob, nom) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Libération différée : révoquer immédiatement annulerait le téléchargement
    // sur certains navigateurs.
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function exporterCsv(recap) {
    function champ(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
    var lignes = [[champ('Champ'), champ('Valeur')].join(';'),
                  [champ('Référence'), champ(recap.reference)].join(';'),
                  [champ('Date'), champ(recap.date)].join(';')];
    recap.lignes.forEach(function (l) {
      lignes.push([champ(l[0]), champ(l[1])].join(';'));
    });
    /* Point-virgule et BOM : c'est ce qu'attend Excel en configuration
       française. Avec une virgule et sans BOM, tout atterrit dans une seule
       colonne et les accents ressortent en caractères illisibles. */
    var contenu = '\uFEFF' + lignes.join('\r\n');
    telecharger(new Blob([contenu], { type: 'text/csv;charset=utf-8' }),
                'fiche-' + recap.reference + '.csv');
  }

  /**
   * PDF par la fenêtre d'impression du navigateur.
   *
   * Aucune bibliothèque PDF n'est embarquée, et en ajouter une pour ce seul
   * besoin alourdirait la page de plusieurs centaines de kilo-octets. Chrome,
   * Edge et Safari — y compris sur téléphone — proposent « Enregistrer au
   * format PDF » dans cette fenêtre.
   */
  function exporterPdf(recap) {
    var ancien = document.getElementById('ficheRecap');
    if (ancien) ancien.remove();

    var box = document.createElement('div');
    box.id = 'ficheRecap';
    box.dir = document.documentElement.dir;
    var html = '<h1>' + esc(t('titre') || 'Narjiss') + '</h1>' +
      '<p class="ref-print">' + esc(recap.reference) + ' — ' + esc(recap.date) + '</p>' +
      '<table><tbody>';
    recap.lignes.forEach(function (l) {
      html += '<tr><th>' + esc(l[0]) + '</th><td>' + esc(l[1]) + '</td></tr>';
    });
    box.innerHTML = html + '</tbody></table>';
    document.body.appendChild(box);

    window.print();
  }

  /* ── Réinitialisation complète (changement de client) ──────────────────── */
  function resetForm() {
    var form = document.getElementById('ficheForm');
    if (!form) return;
    form.reset();                                   // champs, choix, consentement
    var sc = document.getElementById('sigClear');
    if (sc) sc.click();                             // signature
    buildPieces();                                  // pièces / photos
    mrzResetFields();
    mrzSetStatus('', '');                           // statut de lecture MRZ
    var dbg = document.getElementById('mrzDebugOut');
    if (dbg) dbg.textContent = '';
    var result = document.getElementById('result');
    if (result) { result.className = 'result'; result.innerHTML = ''; }
    refreshRequired();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Champs alimentés par la lecture MRZ. On les réinitialise au début de chaque
  // scan pour qu'une NOUVELLE carte remplace bien les valeurs de la précédente.
  var MRZ_FIELDS = ['nom', 'prenom', 'date_naissance', 'cnie', 'cnie_validite'];
  function mrzResetFields() {
    MRZ_FIELDS.forEach(function(name) {
      var el = document.querySelector('[name="' + name + '"]');
      if (el) el.value = '';
    });
  }

  // Surlignage des champs OBLIGATOIRES encore vides (fond rouge) : quand le scan
  // ne remplit pas tout (ex. nom/prénom illisibles), le conseiller voit d'un
  // coup d'œil ce qu'il reste à saisir. Le rouge disparaît dès que le champ est
  // renseigné.
  var REQUIRED_FIELDS = ['projet', 'nom', 'prenom', 'telephone'];
  function refreshRequired() {
    REQUIRED_FIELDS.forEach(function(name) {
      var el = document.querySelector('[name="' + name + '"]');
      if (!el) return;
      el.classList.toggle('field-required-empty', !String(el.value || '').trim());
    });
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

  async function getMrzWorker() {
    if (mrzWorker) return mrzWorker;
    await chargerOcr();
    // Tesseract crée un Web Worker en blob (sa base d'URL devient « blob:… ») :
    // les chemins passés ici DOIVENT être absolus, sinon l'importScripts interne
    // échoue avec « The URL '…/worker.min.js' is invalid » et l'OCR ne démarre
    // jamais. On résout donc sur document.baseURI.
    var vbase = new URL('assets/vendor/tesseract/', document.baseURI).href;
    // Modèle OCR-B dédié MRZ (vendorisé, aucun appel à un CDN). Entraîné sur la
    // police OCR-B et les 37 caractères de la MRZ : il lit correctement les
    // chevrons « < » là où le modèle « eng » générique les confondait avec des
    // lettres. Repli sur « eng » si le modèle dédié manque.
    var opts = {
      workerPath: vbase + 'worker.min.js',
      corePath: vbase + 'tesseract-core-simd-lstm.wasm.js',
      langPath: vbase + 'lang',
      gzip: true
    };
    try {
      mrzWorker = await Tesseract.createWorker('ocrb_int', 1, opts);
    } catch (e) {
      mrzWorker = await Tesseract.createWorker('eng', 1, opts);   // repli si le modèle dédié manque
    }
    // La MRZ n'utilise qu'un jeu de caractères restreint : on le contraint,
    // ce qui réduit fortement les erreurs d'OCR.
    await mrzWorker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: '6'          // bloc de texte uniforme
    });
    return mrzWorker;
  }

  function loadImageFromFile(file) {
    // La capture caméra fournit directement un canvas : il est déjà utilisable
    // comme source de dessin, inutile de le repasser par un objet URL.
    if (file && file.tagName === 'CANVAS') return Promise.resolve(file);
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload = function() { resolve(img); };
      img.onerror = function() { reject(new Error('image illisible')); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* Prépare un canvas optimisé pour l'OCR de la MRZ à partir d'une photo :
     ROTATION (0/90/180/270 — les clients photographient la carte dans tous les
     sens), agrandissement à ~2200 px de large et niveaux de gris. Le contraste
     n'est appliqué qu'en dernier recours (un contraste trop fort épaissit les
     chevrons « < » et casse la séparation « << » nom/prénom). */
  function mrzCanvas(img, rotate, contrast) {
    rotate = rotate || 0;
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var swap = (rotate === 90 || rotate === 270);
    var rw = swap ? ih : iw, rh = swap ? iw : ih;   // dimensions après rotation
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
    if (typeof window.MRZ === 'undefined') {
      var box = document.getElementById('mrzScan');
      if (box) box.style.display = 'none';
      return;
    }

    /* « Photographier » ouvre l'appareil photo arrière du téléphone
       (capture=environment), « Importer » ouvre la galerie ou le disque. Les
       deux alimentent le même champ, donc la même lecture MRZ juste dessous. */
    var cam = document.getElementById('mrzCam');
    var pick = document.getElementById('mrzPick');
    if (cam) cam.addEventListener('click', function () {
      chargerOcr().catch(function () {});   // démarre pendant la prise de vue
      input.setAttribute('capture', 'environment');
      input.click();
    });
    if (pick) pick.addEventListener('click', function () {
      chargerOcr().catch(function () {});
      input.removeAttribute('capture');
      input.click();
    });

    // ?mrzdebug=1 dans l'URL : journalise le texte OCR brut dans la console,
    // pour diagnostiquer une photo qui ne se lit pas.
    var MRZ_DEBUG = /[?&]mrzdebug=1/.test(location.search);

    input.addEventListener('change', function () {
      var file = this.files && this.files[0];
      var champ = this;
      if (!file) return;
      lireCarte(file).then(function () { champ.value = ''; });  // reprise immédiate
    });

    /**
     * Lecture d'une image de carte, quelle qu'en soit la provenance : fichier
     * choisi, photo prise par l'appareil, ou capture de la vue caméra. Le
     * traitement est identique — seule la source change.
     */
    async function lireCarte(source) {
      mrzResetFields();                 // nouvelle carte : on repart de zéro
      mrzSetStatus('', t('mrzReading'));

      try {
        var worker = await getMrzWorker();
        var img = await loadImageFromFile(source);
        // On essaie les 4 orientations (la photo peut être tournée), puis un
        // renforcement de contraste en dernier recours. On conserve la MEILLEURE
        // lecture (nom ET prénom) plutôt que la première simplement valide, et on
        // s'arrête dès qu'une lecture est complète.
        var attempts = [
          mrzCanvas(img, 0, false),
          mrzCanvas(img, 270, false),
          mrzCanvas(img, 90, false),
          mrzCanvas(img, 180, false),
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
        refreshRequired();               // met à jour les repères rouges
        mrzSetStatus('ok', t('mrzOk'));
        return true;
      } catch (e) {
        if (MRZ_DEBUG) {
          console.log('[MRZ debug] erreur', e);
          mrzShowDebug('ERREUR: ' + (e && (e.name + ': ' + e.message) || String(e)));
        }
        mrzSetStatus('ko', t('mrzKo'));
        return false;
      }
    }

    setupCamera(lireCarte);
  }

  /* ── Scan par la caméra, avec cadre de visée ───────────────────────────── */

  /**
   * Ouvre la caméra et ne capture QUE l'intérieur du cadre.
   *
   * C'est la différence avec « Photographier » : une photo de toute la scène
   * laisse la bande de lettres occuper une petite partie de l'image, sans assez
   * de pixels pour être lue. Ici la carte remplit le cadre, donc l'image
   * envoyée à la lecture.
   *
   * Fonctionne sur le poste du bureau de vente comme sur le téléphone : la même
   * API, la caméra arrière étant simplement demandée en priorité.
   */
  function setupCamera(lire) {
    var bouton = document.getElementById('mrzLive');
    var dlg = document.getElementById('camDlg');
    if (!bouton || !dlg) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    var video = document.getElementById('camVideo');
    var cadre = document.getElementById('camCadre');
    var vue = document.getElementById('camVue');
    var flux = null;

    bouton.hidden = false;

    function fermer() {
      if (flux) {
        // Sans cet arrêt explicite, la petite lampe de la caméra reste allumée
        // et le navigateur garde le périphérique occupé.
        flux.getTracks().forEach(function (p) { p.stop(); });
        flux = null;
      }
      video.srcObject = null;
      if (dlg.open) dlg.close();
    }

    bouton.addEventListener('click', async function () {
      chargerOcr().catch(function () {});   // le moteur se charge pendant le cadrage
      try {
        flux = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 }, height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (e) {
        mrzSetStatus('ko', t('camRefus'));
        return;
      }
      video.srcObject = flux;
      dlg.showModal();
    });

    document.getElementById('camFermer').addEventListener('click', fermer);
    dlg.addEventListener('cancel', function () { fermer(); });

    document.getElementById('camCapturer').addEventListener('click', async function () {
      if (!video.videoWidth) return;
      var image = decouperCadre();
      fermer();
      if (image) await lire(image);
    });

    /**
     * Découpe la zone du cadre dans l'image du capteur.
     *
     * La vidéo est affichée en `contain` : elle est centrée et complète, avec
     * d'éventuelles bandes noires. On retrouve donc la zone réellement filmée
     * par une règle de trois, puis on convertit les coordonnées du cadre —
     * exprimées à l'écran — en coordonnées du capteur.
     */
    function decouperCadre() {
      var vw = video.videoWidth, vh = video.videoHeight;
      var boite = vue.getBoundingClientRect();
      var r = cadre.getBoundingClientRect();

      var echelle = Math.min(boite.width / vw, boite.height / vh);
      var decX = (boite.width - vw * echelle) / 2;
      var decY = (boite.height - vh * echelle) / 2;

      var sx = (r.left - boite.left - decX) / echelle;
      var sy = (r.top - boite.top - decY) / echelle;
      var sw = r.width / echelle;
      var sh = r.height / echelle;

      // Le cadre peut déborder de l'image sur un capteur très large : on borne.
      sx = Math.max(0, Math.min(sx, vw - 1));
      sy = Math.max(0, Math.min(sy, vh - 1));
      sw = Math.max(1, Math.min(sw, vw - sx));
      sh = Math.max(1, Math.min(sh, vh - sy));

      var c = document.createElement('canvas');
      c.width = Math.round(sw);
      c.height = Math.round(sh);
      c.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return c;
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.lang-switch button').forEach(function(b) {
      b.onclick = function() { applyLang(this.getAttribute('data-lang')); };
    });
    setupSignature();
    setupMrz();

    /* La fiche est atteinte depuis le site (bouton « Nous contacter », page de
       contact), qui passe la langue courante en ancre : #ar. Sans cette
       lecture, un visiteur arabophone arrivait sur un formulaire en français
       et devait le rebasculer à la main. La fiche ne connaît que deux langues
       (français et arabe) : anglais et espagnol retombent sur le français. */
    var demandee = (window.location.hash || '').replace('#', '').toLowerCase();
    applyLang(demandee === 'ar' ? 'ar' : 'fr');
    prefillFromUrl();   // coordonnées venues de « Ma sélection », le cas échéant
    document.getElementById('ficheForm').addEventListener('submit', submitForm);

    var resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.onclick = function() {
      if (window.confirm(t('resetConfirm'))) resetForm();
    };

    // Le rouge des champs obligatoires se met à jour dès qu'on saisit.
    var formEl = document.getElementById('ficheForm');
    formEl.addEventListener('input', refreshRequired);
    formEl.addEventListener('change', refreshRequired);
    refreshRequired();

    // menu.js charge data/projects.json de façon asynchrone : on repeuple
    // la liste quand elle arrive, sinon seuls les projets par défaut sortent.
    if (typeof window.loadSiteProjects === 'function') {
      window.loadSiteProjects().then(fillProjects).catch(function() {});
    }
  });
})();
