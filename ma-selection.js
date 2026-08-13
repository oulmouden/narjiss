/**
 * ma-selection.js — étapes 4 et 5 du parcours client.
 *
 * Étape 4 : le comparatif côte à côte des logements retenus.
 * Étape 5 : le visiteur se présente, demande un conseiller et/ou une visite.
 *
 * La sélection vient du localStorage écrit par disponibilites.js. Elle n'est
 * envoyée au serveur qu'ici, au moment où le visiteur donne son accord.
 */

(function () {
  'use strict';

  var CLE_SELECTION = 'nj-selection-lots';
  var etat = { projet: 'jawhara', ids: [], lots: [] };

  /* Mentions légales du consentement (jamais tronquées). Reprises de fiche.html. */
  var LEGAL = {
    fr: "Les informations recueillies font l'objet d'un traitement par NARJISS IMMOBILIÈRE, responsable du traitement, " +
        "aux fins du suivi de votre demande commerciale et de la constitution de votre dossier d'acquisition. Ce traitement " +
        "est déclaré auprès de la CNDP conformément à la loi n° 09-08. Vos données sont conservées pendant la durée légale " +
        "applicable, puis supprimées, et ne sont transmises à aucun tiers hors obligations légales. Vous disposez d'un droit " +
        "d'accès, de rectification et d'opposition aux données vous concernant.",
    en: "The information collected is processed by NARJISS IMMOBILIÈRE, as data controller, in order to follow up on your " +
        "commercial request and build your acquisition file. This processing is declared to the CNDP in accordance with law " +
        "no. 09-08. Your data is kept for the applicable legal period, then deleted, and is not shared with any third party " +
        "except where required by law. You have a right to access, rectify and object to the data concerning you.",
    ar: "تخضع المعلومات المجمّعة لمعالجة من طرف نرجس العقارية، المسؤولة عن المعالجة، من أجل تتبع طلبكم التجاري وتكوين ملف " +
        "الاقتناء الخاص بكم. هذه المعالجة مصرّح بها لدى اللجنة الوطنية (CNDP) وفق القانون رقم 09-08. تُحفظ بياناتكم للمدة " +
        "القانونية ثم تُحذف، ولا تُنقل لأي طرف ثالث خارج الالتزامات القانونية. لكم حق الاطلاع والتصحيح والاعتراض.",
    es: "La información recogida es tratada por NARJISS IMMOBILIÈRE, responsable del tratamiento, con el fin de dar seguimiento " +
        "a su solicitud comercial y constituir su expediente de adquisición. Este tratamiento está declarado ante la CNDP " +
        "conforme a la ley n.º 09-08. Sus datos se conservan durante el plazo legal aplicable y luego se suprimen, y no se " +
        "comunican a ningún tercero salvo obligación legal. Usted tiene derecho de acceso, rectificación y oposición."
  };

  function $(sel) { return document.querySelector(sel); }

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

  var T = {
    fr: {
      titre: 'Ma sélection',
      sousTitre: 'Comparez vos logements, puis parlons-en avec un conseiller.',
      fil: ['Vos critères', 'Le projet', 'Les logements', 'Ma sélection', 'Un conseiller'],
      titreComparatif: 'Vos logements côte à côte',
      aideComparatif: 'Le meilleur prix et la plus grande surface sont mis en évidence.',
      modifier: 'Modifier ma sélection',
      titreContact: 'Parler à un conseiller',
      suivezNous: 'Suivez-nous',
      aideContact: 'Un conseiller vous rappelle avec votre sélection sous les yeux. Vous pouvez aussi proposer une date de visite.',
      nom: 'Nom', prenom: 'Prénom', tel: 'Téléphone', email: 'E-mail', ville: 'Ville',
      visite: 'Date de visite souhaitée',
      visiteAide: 'Facultatif — nous confirmons le créneau par téléphone.',
      message: 'Votre message',
      messagePlaceholder: 'Une question, une contrainte de financement, un horaire qui vous arrange…',
      consentement: "Je reconnais avoir été informé(e) de ce qui précède et je consens au traitement de mes données pour les finalités indiquées.",
      consentContact: "J'accepte d'être recontacté(e) par Narjiss Immobilière (téléphone, e-mail ou WhatsApp) au sujet de cette sélection.",
      marketing: "J'accepte de recevoir les offres commerciales de Narjiss Immobilière (facultatif, sans effet sur ma demande).",
      mrzTitre: "Remplissage automatique", mrzAide: "Photographiez ou importez le dos de votre CIN : le nom et le prénom se remplissent seuls.",
      mrzBtn: "🖼️ Importer une image", mrzCam: "📷 Photographier la CIN",
      mrzLive: "🎥 Scanner avec la caméra", camTitre: "Placez la carte dans le cadre",
      camAide: "Le dos de la carte, bien à plat. La bande de lettres du bas doit être nette.",
      camCapturer: "Capturer", camFermer: "Fermer", mrzReading: "Lecture en cours… gardez la carte bien à plat et nette.",
      mrzOk: "Carte lue. Vérifiez le nom et le prénom remplis.", mrzKo: "Lecture impossible. Reprenez la photo (nette, MRZ visible) ou saisissez à la main.",
      consentRequis: "Merci de cocher les consentements obligatoires avant d'envoyer.",
      ficheComplete: "📋 Remplir la fiche client complète →",
      ficheCompleteAide: "Pas encore décidé ? Enregistrez vos coordonnées via la fiche client complète — un conseiller vous recontactera.",
      envoyer: 'Envoyer ma demande', envoiEnCours: 'Envoi…', retour: 'Retour aux logements',
      videTitre: 'Votre sélection est vide.',
      videAide: "Retournez aux disponibilités pour choisir jusqu'à trois logements.",
      voirLogements: 'Voir les logements',
      erreurChargement: 'Impossible de charger votre sélection pour le moment.',
      okTitre: 'Votre demande est enregistrée.',
      okRef: 'Référence {ref} — notez-la, elle identifie votre dossier.',
      okLots: 'Logements retenus : {lots}.',
      okVisite: 'Votre demande de visite a été transmise ; nous confirmons le créneau par téléphone.',
      okConseiller: 'Votre conseiller : {nom}.', enLigne: 'en ligne',
      okWhatsapp: 'Écrire à {nom} sur WhatsApp',
      waMessage: 'Bonjour, je suis {nom}. Ma sélection Narjiss : {lots} (référence {ref}).',
      revoir: 'Revoir les logements',
      critere: 'Critère', retirerLot: 'Retirer', retirerAria: 'Retirer {num} de ma sélection',
      lignes: ['Prix', 'Prix au m²', 'Type', 'Surface habitable', 'Balcon', 'Surface totale',
               'Chambres', 'Salles de bain', 'Immeuble', 'Niveau', 'Orientation',
               'Exposition', 'Parking', 'Disponibilité'],
      etage: 'Étage', rdc: 'Rez-de-chaussée', dh: 'DH', aucun: '—', nousConsulter: 'Nous consulter',
      disponible: 'Disponible', optionne: 'Optionné', reserve: 'Réservé', vendu: 'Vendu',
      rue: 'Sur rue', cour: 'Sur cour', jardin: 'Sur jardin', double: 'Traversant', angle: 'Angle'
    },
    en: {
      titre: 'My shortlist',
      sousTitre: "Compare your homes, then let's discuss them with an adviser.",
      fil: ['Your criteria', 'The project', 'The homes', 'My shortlist', 'An adviser'],
      titreComparatif: 'Your homes side by side',
      aideComparatif: 'The best price and the largest area are highlighted.',
      modifier: 'Change my shortlist',
      titreContact: 'Talk to an adviser',
      suivezNous: 'Follow us',
      aideContact: 'An adviser will call you back with your shortlist in front of them. You can also suggest a viewing date.',
      nom: 'Last name', prenom: 'First name', tel: 'Phone', email: 'Email', ville: 'City',
      visite: 'Preferred viewing date',
      visiteAide: 'Optional — we confirm the slot by phone.',
      message: 'Your message',
      messagePlaceholder: 'A question, a financing constraint, a time that suits you…',
      consentement: "I acknowledge I have been informed of the above and consent to the processing of my data for the stated purposes.",
      consentContact: "I agree to be contacted by Narjiss Immobilière (phone, e-mail or WhatsApp) about this shortlist.",
      marketing: "I agree to receive commercial offers from Narjiss Immobilière (optional, no effect on my request).",
      mrzTitre: "Automatic fill", mrzAide: "Photograph or import the back of your ID card: the name fills in automatically.",
      mrzBtn: "🖼️ Import an image", mrzCam: "📷 Photograph the ID card",
      mrzLive: "🎥 Scan with the camera", camTitre: "Place the card inside the frame",
      camAide: "The back of the card, flat. The band of letters must be sharp.",
      camCapturer: "Capture", camFermer: "Close", mrzReading: "Reading… keep the card flat and sharp.",
      mrzOk: "Card read. Check the filled name.", mrzKo: "Could not read. Retake the photo (sharp, MRZ visible) or type it in.",
      consentRequis: "Please tick the required consents before sending.",
      ficheComplete: "📋 Fill in the full client form →",
      ficheCompleteAide: "Not decided yet? Save your details via the full client form — an adviser will get back to you.",
      envoyer: 'Send my request', envoiEnCours: 'Sending…', retour: 'Back to the homes',
      videTitre: 'Your shortlist is empty.',
      videAide: 'Go back to availability to pick up to three homes.',
      voirLogements: 'See the homes',
      erreurChargement: 'Your shortlist cannot be loaded right now.',
      okTitre: 'Your request has been recorded.',
      okRef: 'Reference {ref} — please note it, it identifies your file.',
      okLots: 'Selected homes: {lots}.',
      okVisite: 'Your viewing request has been passed on; we will confirm the slot by phone.',
      okConseiller: 'Your adviser: {nom}.', enLigne: 'online',
      okWhatsapp: 'Message {nom} on WhatsApp',
      waMessage: 'Hello, I am {nom}. My Narjiss shortlist: {lots} (reference {ref}).',
      revoir: 'Back to the homes',
      critere: 'Criterion', retirerLot: 'Remove', retirerAria: 'Remove {num} from my shortlist',
      lignes: ['Price', 'Price per m²', 'Type', 'Living area', 'Balcony', 'Total area',
               'Bedrooms', 'Bathrooms', 'Building', 'Floor', 'Aspect',
               'Sun exposure', 'Parking', 'Availability'],
      etage: 'Floor', rdc: 'Ground floor', dh: 'MAD', aucun: '—', nousConsulter: 'Price on request',
      disponible: 'Available', optionne: 'Under option', reserve: 'Reserved', vendu: 'Sold',
      rue: 'Street facing', cour: 'Courtyard facing', jardin: 'Garden facing',
      double: 'Dual aspect', angle: 'Corner'
    },
    ar: {
      titre: 'اختياري',
      sousTitre: 'قارن بين المساكن، ثم لنتحدث عنها مع مستشار.',
      fil: ['معاييرك', 'المشروع', 'المساكن', 'اختياري', 'مستشار'],
      titreComparatif: 'مساكنك جنبا إلى جنب',
      aideComparatif: 'أفضل سعر وأكبر مساحة مميزان في الجدول.',
      modifier: 'تعديل اختياري',
      titreContact: 'التحدث إلى مستشار',
      suivezNous: 'تابعونا',
      aideContact: 'سيعاود مستشار الاتصال بك واختيارك أمامه. يمكنك أيضا اقتراح تاريخ للزيارة.',
      nom: 'الاسم العائلي', prenom: 'الاسم الشخصي', tel: 'الهاتف',
      email: 'البريد الإلكتروني', ville: 'المدينة',
      visite: 'تاريخ الزيارة المطلوب',
      visiteAide: 'اختياري — نؤكد الموعد هاتفيا.',
      message: 'رسالتك',
      messagePlaceholder: 'سؤال، قيد تمويلي، أو وقت يناسبك…',
      consentement: "أُقرّ بأنني أُطلعتُ على ما سبق وأوافق على معالجة بياناتي للأغراض المذكورة.",
      consentContact: "أوافق على أن تتصل بي نرجس العقارية (هاتف أو بريد أو واتساب) بخصوص هذا الاختيار.",
      marketing: "أوافق على تلقّي العروض التجارية من نرجس العقارية (اختياري، دون أثر على طلبي).",
      mrzTitre: "التعبئة التلقائية", mrzAide: "صوّروا أو استوردوا ظهر بطاقتكم الوطنية: يُملأ الاسم تلقائياً.",
      mrzBtn: "🖼️ استيراد صورة", mrzCam: "📷 تصوير البطاقة الوطنية",
      mrzLive: "🎥 المسح بالكاميرا", camTitre: "ضعوا البطاقة داخل الإطار",
      camAide: "ظهر البطاقة، مسطّحاً. يجب أن يكون شريط الحروف واضحاً.",
      camCapturer: "التقاط", camFermer: "إغلاق", mrzReading: "جاري القراءة… أبقوا البطاقة مسطحة وواضحة.",
      mrzOk: "تمت قراءة البطاقة. تحققوا من الاسم.", mrzKo: "تعذّرت القراءة. أعيدوا التصوير أو أدخلوا يدوياً.",
      consentRequis: "يرجى تحديد الموافقات الإلزامية قبل الإرسال.",
      ficheComplete: "📋 ملء بطاقة العميل الكاملة →",
      ficheCompleteAide: "لم تقرروا بعد؟ سجّلوا بياناتكم عبر بطاقة العميل الكاملة — سيعاود مستشار الاتصال بكم.",
      envoyer: 'إرسال طلبي', envoiEnCours: 'جاري الإرسال…', retour: 'العودة إلى المساكن',
      videTitre: 'اختيارك فارغ.',
      videAide: 'ارجع إلى المتوفر لاختيار ثلاثة مساكن كحد أقصى.',
      voirLogements: 'عرض المساكن',
      erreurChargement: 'تعذر تحميل اختيارك حاليا.',
      okTitre: 'تم تسجيل طلبك.',
      okRef: 'المرجع {ref} — احتفظ به، فهو يعرّف ملفك.',
      okLots: 'المساكن المختارة: {lots}.',
      okVisite: 'تم إرسال طلب الزيارة؛ سنؤكد الموعد هاتفيا.',
      okConseiller: 'مستشارك: {nom}.', enLigne: 'متصل',
      okWhatsapp: 'مراسلة {nom} عبر واتساب',
      waMessage: 'مرحبا، أنا {nom}. اختياري لدى نرجس: {lots} (المرجع {ref}).',
      revoir: 'العودة إلى المساكن',
      critere: 'المعيار', retirerLot: 'إزالة', retirerAria: 'إزالة {num} من اختياري',
      lignes: ['السعر', 'السعر للمتر المربع', 'النوع', 'المساحة السكنية', 'الشرفة',
               'المساحة الإجمالية', 'الغرف', 'الحمامات', 'العمارة', 'الطابق', 'الاتجاه',
               'التعرض للشمس', 'موقف السيارة', 'التوفر'],
      etage: 'الطابق', rdc: 'الطابق الأرضي', dh: 'درهم', aucun: '—', nousConsulter: 'السعر عند الطلب',
      disponible: 'متاح', optionne: 'محجوز مؤقتا', reserve: 'محجوز', vendu: 'مباع',
      rue: 'على الشارع', cour: 'على الفناء', jardin: 'على الحديقة',
      double: 'واجهتان', angle: 'زاوية'
    },
    es: {
      titre: 'Mi selección',
      sousTitre: 'Compare sus viviendas y hablemos de ellas con un asesor.',
      fil: ['Sus criterios', 'El proyecto', 'Las viviendas', 'Mi selección', 'Un asesor'],
      titreComparatif: 'Sus viviendas una al lado de otra',
      aideComparatif: 'Se destacan el mejor precio y la mayor superficie.',
      modifier: 'Modificar mi selección',
      titreContact: 'Hablar con un asesor',
      suivezNous: 'Síguenos',
      aideContact: 'Un asesor le llamará con su selección delante. También puede proponer una fecha de visita.',
      nom: 'Apellido', prenom: 'Nombre', tel: 'Teléfono', email: 'Correo electrónico', ville: 'Ciudad',
      visite: 'Fecha de visita deseada',
      visiteAide: 'Opcional — confirmamos la cita por teléfono.',
      message: 'Su mensaje',
      messagePlaceholder: 'Una pregunta, una limitación de financiación, un horario que le convenga…',
      consentement: "Reconozco haber sido informado(a) de lo anterior y consiento el tratamiento de mis datos para los fines indicados.",
      consentContact: "Acepto ser contactado(a) por Narjiss Immobilière (teléfono, correo o WhatsApp) sobre esta selección.",
      marketing: "Acepto recibir ofertas comerciales de Narjiss Immobilière (opcional, sin efecto en mi solicitud).",
      mrzTitre: "Relleno automático", mrzAide: "Fotografíe o importe el reverso de su DNI: el nombre se rellena solo.",
      mrzBtn: "🖼️ Importar una imagen", mrzCam: "📷 Fotografiar el DNI",
      mrzLive: "🎥 Escanear con la cámara", camTitre: "Coloque la tarjeta en el marco",
      camAide: "El reverso de la tarjeta, plano. La banda de letras debe verse nítida.",
      camCapturer: "Capturar", camFermer: "Cerrar", mrzReading: "Leyendo… mantenga la tarjeta plana y nítida.",
      mrzOk: "Tarjeta leída. Verifique el nombre.", mrzKo: "No se pudo leer. Repita la foto o escríbalo a mano.",
      consentRequis: "Marque los consentimientos obligatorios antes de enviar.",
      ficheComplete: "📋 Rellenar la ficha de cliente completa →",
      ficheCompleteAide: "¿Aún no ha decidido? Guarde sus datos con la ficha de cliente completa — un asesor le contactará.",
      envoyer: 'Enviar mi solicitud', envoiEnCours: 'Enviando…', retour: 'Volver a las viviendas',
      videTitre: 'Su selección está vacía.',
      videAide: 'Vuelva a las disponibilidades para elegir hasta tres viviendas.',
      voirLogements: 'Ver las viviendas',
      erreurChargement: 'No se puede cargar su selección por ahora.',
      okTitre: 'Su solicitud ha sido registrada.',
      okRef: 'Referencia {ref} — anótela, identifica su expediente.',
      okLots: 'Viviendas seleccionadas: {lots}.',
      okVisite: 'Su solicitud de visita ha sido transmitida; confirmaremos la cita por teléfono.',
      okConseiller: 'Su asesor: {nom}.', enLigne: 'en línea',
      okWhatsapp: 'Escribir a {nom} por WhatsApp',
      waMessage: 'Hola, soy {nom}. Mi selección Narjiss: {lots} (referencia {ref}).',
      revoir: 'Volver a las viviendas',
      critere: 'Criterio', retirerLot: 'Quitar', retirerAria: 'Quitar {num} de mi selección',
      lignes: ['Precio', 'Precio por m²', 'Tipo', 'Superficie habitable', 'Balcón',
               'Superficie total', 'Dormitorios', 'Baños', 'Edificio', 'Planta',
               'Orientación', 'Exposición', 'Aparcamiento', 'Disponibilidad'],
      etage: 'Planta', rdc: 'Planta baja', dh: 'DH', aucun: '—', nousConsulter: 'Consúltenos',
      disponible: 'Disponible', optionne: 'En opción', reserve: 'Reservado', vendu: 'Vendido',
      rue: 'A la calle', cour: 'Al patio', jardin: 'Al jardín',
      double: 'Doble orientación', angle: 'Esquina'
    }
  };

  function langue() {
    return (typeof currentLang !== 'undefined' && T[currentLang]) ? currentLang : 'fr';
  }
  function t(cle) {
    return T[langue()][cle] || T.fr[cle] || cle;
  }
  /** Remplace les {jetons} d'un libellé traduit par leurs valeurs. */
  function tf(cle, valeurs) {
    return String(t(cle)).replace(/\{(\w+)\}/g, function (_, k) {
      return valeurs[k] !== undefined ? valeurs[k] : '';
    });
  }

  function lireSelection() {
    try {
      var brut = JSON.parse(localStorage.getItem(CLE_SELECTION) || '[]');
      etat.ids = Array.isArray(brut) ? brut.slice(0, 3) : [];
    } catch (e) {
      etat.ids = [];
    }
  }

  function ecrireSelection() {
    try { localStorage.setItem(CLE_SELECTION, JSON.stringify(etat.ids)); } catch (e) {}
  }

  /* ── Étape 4 : le comparatif ───────────────────────────────────────── */

  // Un rendu par critère, dans l'ordre de T[lang].lignes : les libellés sont
  // traduits, seule la mise en forme de la valeur vit ici.
  var LIGNES = [
    function (l) {
      return '<strong>' + (l.prix != null ? montant(l.prix) + ' ' + t('dh') : t('nousConsulter')) + '</strong>';
    },
    function (l) { return l.prix_m2 != null ? montant(l.prix_m2) + ' ' + t('dh') : t('nousConsulter'); },
    function (l) { return l.typologie.toUpperCase(); },
    function (l) { return l.surface + ' m²'; },
    function (l) { return l.balcon > 0 ? l.balcon + ' m²' : t('aucun'); },
    function (l) { return l.surface_totale + ' m²'; },
    function (l) { return l.chambres || t('aucun'); },
    function (l) { return l.sdb || t('aucun'); },
    function (l) { return l.immeuble; },
    function (l) { return l.niveau === 'RDC' ? t('rdc') : t('etage') + ' ' + l.niveau; },
    function (l) { return t(l.orientation); },
    function (l) { return l.exposition || t('aucun'); },
    function (l) { return l.parking === 'aucun' ? t('aucun') : l.parking; },
    function (l) {
      return '<span class="nj-pastille nj-p-' + l.statut + '">' + t(l.statut) + '</span>';
    }
  ];
  // Index des colonnes comparables, pour la mise en évidence.
  var IDX_PRIX = 0, IDX_SURFACE = 3;

  /** Marque la meilleure valeur d'une ligne quand la comparaison a un sens. */
  function meilleur(cle, lots) {
    var vals = lots.map(function (l) { return l[cle]; });
    if (vals.length < 2) return -1;
    // Prix masques (projet « nous consulter ») : aucune valeur a mettre en avant.
    if (vals.some(function (v) { return v == null; })) return -1;
    if (cle === 'prix' || cle === 'prix_m2') return vals.indexOf(Math.min.apply(null, vals));
    return vals.indexOf(Math.max.apply(null, vals));
  }

  function rendreComparatif() {
    var zone = $('#njComparatif');
    if (!etat.lots.length) {
      zone.innerHTML =
        '<div class="nj-vide"><p><strong>' + t('videTitre') + '</strong></p>' +
        '<p>' + t('videAide') + '</p>' +
        '<p><a class="nj-btn" href="disponibilites.html?projet=' + etat.projet +
        '">' + t('voirLogements') + '</a></p></div>';
      $('#njFormulaire').hidden = true;
      return;
    }
    $('#njFormulaire').hidden = false;

    var iPrix = meilleur('prix', etat.lots);
    var iSurf = meilleur('surface', etat.lots);

    var html = '<table class="nj-compare"><thead><tr><th scope="col">' + t('critere') + '</th>';
    etat.lots.forEach(function (l) {
      html += '<th scope="col">' +
        '<span class="nj-compare-num">' + l.typologie.toUpperCase() + ' · ' + l.numero + '</span>' +
        '<button type="button" class="nj-retirer" data-retirer="' + l.id +
        '" aria-label="' + tf('retirerAria', { num: l.numero }) + '">' +
        t('retirerLot') + '</button></th>';
    });
    html += '</tr></thead><tbody>';

    var libelles = T[langue()].lignes;
    LIGNES.forEach(function (rendu, ligne) {
      html += '<tr><th scope="row">' + libelles[ligne] + '</th>';
      etat.lots.forEach(function (l, i) {
        var marque = etat.lots.length > 1 &&
          ((ligne === IDX_PRIX && i === iPrix) || (ligne === IDX_SURFACE && i === iSurf));
        html += '<td' + (marque ? ' class="nj-mieux"' : '') + '>' + rendu(l) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    var notes = etat.lots.filter(function (l) { return l.notes; });
    if (notes.length) {
      html += '<ul class="nj-notes">' + notes.map(function (l) {
        return '<li><strong>' + l.numero + '</strong> — ' + l.notes + '</li>';
      }).join('') + '</ul>';
    }
    zone.innerHTML = html;

    // Champ caché envoyé au serveur : la source de vérité reste etat.ids.
    $('#fLots').value = etat.ids.join(',');
  }

  function retirer(id) {
    var i = etat.ids.indexOf(id);
    if (i === -1) return;
    etat.ids.splice(i, 1);
    ecrireSelection();
    etat.lots = etat.lots.filter(function (l) { return l.id !== id; });
    rendreComparatif();
  }

  /* ── Chargement des lots retenus ───────────────────────────────────── */

  function charger() {
    if (!etat.ids.length) { rendreComparatif(); return Promise.resolve(); }
    return fetch('api/lots-public.php?projet=' + encodeURIComponent(etat.projet), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error);
        var parId = {};
        d.lots.forEach(function (l) { parId[l.id] = l; });
        // Un lot disparu du catalogue (passé « bloqué ») est retiré en silence
        // plutôt que d'afficher une case vide.
        etat.lots = etat.ids.map(function (id) { return parId[id]; }).filter(Boolean);
        etat.ids = etat.lots.map(function (l) { return l.id; });
        ecrireSelection();
        rendreComparatif();
      })
      .catch(function () {
        $('#njComparatif').innerHTML =
          '<div class="nj-vide">' + t('erreurChargement') + '</div>';
      });
  }

  /* ── Étape 5 : envoi ───────────────────────────────────────────────── */

  /* ── Scan / import du dos de la CIN (remplissage nom + prénom) ────────── */
  function setStatutMrz(kind, msg) {
    var el = $('#njMrzStatus');
    if (!el) return;
    el.className = 'nj-mrz-status' + (kind ? ' ' + kind : '');
    el.textContent = msg || '';
  }
  function setupMrz() {
    var input = $('#njMrzInput');
    var box = $('#njMrz');
    if (!input) return;
    // Sans les libs (vieux navigateur), on masque : la saisie manuelle reste.
    if (!(window.NarjissCIN && window.NarjissCIN.supported())) {
      if (box) box.style.display = 'none';
      return;
    }
    /* « Photographier » ouvre l'appareil photo arrière du téléphone,
       « Importer » ouvre la galerie ou le disque. Les deux alimentent le même
       champ, donc la même lecture juste dessous. */
    var cam = $('#njMrzCam');
    var pick = $('#njMrzPick');
    /* Le moteur d'OCR se télécharge dès le clic, pendant que l'appareil photo
       est ouvert : la lecture peut ainsi commencer dès le retour de la photo. */
    var precharge = function () {
      if (window.NarjissCIN && window.NarjissCIN.precharger) {
        try { window.NarjissCIN.precharger().catch(function () {}); } catch (e) {}
      }
    };
    if (cam) cam.addEventListener('click', function () {
      precharge();
      input.setAttribute('capture', 'environment');
      input.click();
    });
    if (pick) pick.addEventListener('click', function () {
      precharge();
      input.removeAttribute('capture');
      input.click();
    });

    input.addEventListener('change', function () {
      var file = this.files && this.files[0];
      var self = this;
      if (!file) return;
      lireCarte(file).then(function () { self.value = ''; });  // reprise immédiate
    });

    /* Vue caméra avec cadre de visée. Elle n'apparaît que si le navigateur
       sait ouvrir une caméra — sur le poste du bureau de vente comme sur le
       téléphone. Le cadre garantit que la bande de lettres occupe l'image,
       là où une photo de la scène entière la laissait trop petite pour être
       lue. */
    var live = $('#njMrzLive');
    if (live && window.NarjissCIN.cameraDisponible && window.NarjissCIN.cameraDisponible()) {
      live.hidden = false;
      live.addEventListener('click', async function () {
        precharge();                       // le moteur se charge pendant le cadrage
        var image = await window.NarjissCIN.ouvrirCamera({
          titre: t('camTitre'), aide: t('camAide'),
          capturer: t('camCapturer'), fermer: t('camFermer')
        });
        if (image) await lireCarte(image);
      });
    }

    /** Lecture d'une image de carte, fichier choisi ou capture caméra. */
    function lireCarte(source) {
      setStatutMrz('', t('mrzReading'));
      return window.NarjissCIN.scanFile(source).then(function (p) {
        if (!p) { setStatutMrz('ko', t('mrzKo')); return; }
        // On ne remplit que si le champ est vide : jamais écraser une saisie.
        var nom = $('#fNom'), pre = $('#fPrenom');
        if (nom && !nom.value && p.nom) nom.value = p.nom;
        if (pre && !pre.value && p.prenom) pre.value = p.prenom;
        setStatutMrz('ok', t('mrzOk'));
      }).catch(function () {
        setStatutMrz('ko', t('mrzKo'));
      });
    }
  }

  /* ── Consentements : l'envoi n'est possible qu'une fois tous cochés ────── */
  function consentementsOk() {
    var reqs = document.querySelectorAll('[data-consent-requis]');
    return Array.prototype.every.call(reqs, function (c) { return c.checked; });
  }
  function majBoutonEnvoi() {
    var b = $('#njEnvoyer');
    if (b) b.disabled = !consentementsOk();
  }
  function setupConsentements() {
    document.querySelectorAll('[data-consent-requis]').forEach(function (c) {
      c.addEventListener('change', majBoutonEnvoi);
    });
    majBoutonEnvoi();
  }

  /* Fiche client complète : en cas de non-choix immédiat, on enregistre quand
     même le prospect. On bascule vers fiche.html en emportant le projet et les
     coordonnées déjà saisies (pré-remplissage), sans exiger de sélection. */
  function setupFicheComplete() {
    var lien = $('#njFicheComplete');
    if (!lien) return;
    lien.addEventListener('click', function (e) {
      e.preventDefault();
      var p = new URLSearchParams();
      p.set('projet', etat.projet);
      [['nom', 'fNom'], ['prenom', 'fPrenom'], ['telephone', 'fTel'],
       ['email', 'fEmail'], ['ville', 'fVille']].forEach(function (m) {
        var el = $('#' + m[1]);
        if (el && el.value.trim()) p.set(m[0], el.value.trim());
      });
      window.location.href = 'fiche.html?' + p.toString();
    });
  }

  function envoyer(e) {
    e.preventDefault();
    var bouton = $('#njEnvoyer');
    var erreur = $('#njErreur');
    erreur.hidden = true;
    // Garde-fou (au cas où le bouton serait forcé) : consentements obligatoires.
    if (!consentementsOk()) {
      erreur.textContent = t('consentRequis');
      erreur.hidden = false;
      return;
    }
    bouton.disabled = true;
    bouton.textContent = t('envoiEnCours');

    var data = new FormData($('#njFormulaire'));
    data.set('action', 'contact');
    data.set('projet', etat.projet);
    data.set('lots', etat.ids.join(','));
    data.set('canal', new URLSearchParams(location.search).get('canal') || 'web');
    data.set('langue', typeof currentLang !== 'undefined' ? currentLang : 'fr');

    fetch('api/parcours.php', { method: 'POST', body: data })
      .then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); })
      .then(function (res) {
        if (!res.j.ok) throw new Error(res.j.error || 'Envoi impossible.');
        confirmer(res.j);
      })
      .catch(function (err) {
        erreur.textContent = err.message;
        erreur.hidden = false;
        bouton.disabled = false;
        bouton.textContent = t('envoyer');
      });
  }

  function confirmer(rep) {
    var c = rep.conseiller;
    var html =
      '<div class="nj-ok">' +
        '<p class="nj-ok-titre">' + t('okTitre') + '</p>' +
        '<p>' + tf('okRef', { ref: '<strong>' + rep.reference + '</strong>' }) + '</p>' +
        '<p>' + tf('okLots', { lots: '<strong>' + rep.lots.join(', ') + '</strong>' }) + '</p>' +
        (rep.visite ? '<p>' + t('okVisite') + '</p>' : '');

    if (c && c.nom) {
      html += '<p>' + tf('okConseiller', { nom: '<strong>' + c.nom + '</strong>' }) +
              (c.en_ligne ? ' <span class="nj-enligne">' + t('enLigne') + '</span>' : '') + '</p>';
      if (c.whatsapp) {
        var msg = encodeURIComponent(tf('waMessage', {
          nom: $('#fNom').value || '', lots: rep.lots.join(', '), ref: rep.reference
        }));
        html += '<p><a class="nj-btn nj-btn-wa" target="_blank" rel="noopener" href="https://wa.me/' +
                c.whatsapp.replace(/[^0-9]/g, '') + '?text=' + msg +
                '">' + tf('okWhatsapp', { nom: c.nom }) + '</a></p>';
      }
    }
    html += '<p><a class="nj-btn nj-btn-clair" href="disponibilites.html?projet=' + etat.projet +
            '">' + t('revoir') + '</a></p></div>';

    $('#njEtape5').innerHTML = html;
    // La sélection a rempli son office : on libère la borne pour le suivant.
    try { localStorage.removeItem(CLE_SELECTION); } catch (e) {}
    $('#njEtape5').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Démarrage ─────────────────────────────────────────────────────── */

  /** Applique la langue courante au texte figé de la page. */
  function appliquerLangue() {
    var texte = function (id, valeur) {
      var el = document.getElementById(id);
      if (el) el.textContent = valeur;
    };
    document.title = 'Narjiss — ' + t('titre');
    texte('njTitre', t('titre'));
    texte('njSousTitre', t('sousTitre'));
    texte('njTitreComparatif', t('titreComparatif'));
    texte('njAideComparatif', t('aideComparatif'));
    texte('njRetour', t('modifier'));
    texte('njTitreContact', t('titreContact'));
    texte('njAideContact', t('aideContact'));
    texte('lblNom', t('nom'));
    texte('lblPrenom', t('prenom'));
    texte('lblTel', t('tel'));
    texte('lblEmail', t('email'));
    texte('lblVille', t('ville'));
    texte('lblVisite', t('visite'));
    texte('lblVisiteAide', t('visiteAide'));
    texte('lblMessage', t('message'));
    texte('lblConsentement', t('consentement'));
    texte('lblConsentContact', t('consentContact'));
    texte('lblMarketing', t('marketing'));
    texte('njLegal', LEGAL[langue()] || LEGAL.fr);
    texte('lblMrzTitre', t('mrzTitre'));
    texte('lblMrzAide', t('mrzAide'));
    texte('lblMrzBtn', t('mrzBtn'));
    texte('lblMrzCam', t('mrzCam'));
    texte('lblMrzLive', t('mrzLive'));
    texte('njFicheComplete', t('ficheComplete'));
    texte('njFicheAide', t('ficheCompleteAide'));
    texte('njEnvoyer', t('envoyer'));
    texte('njRetour2', t('retour'));
    var msg = document.getElementById('fMessage');
    if (msg) msg.placeholder = t('messagePlaceholder');

    var fil = document.getElementById('njFil');
    if (fil) {
      var etapes = T[langue()].fil;
      [].forEach.call(fil.children, function (li, i) {
        if (etapes[i]) li.textContent = etapes[i];
      });
    }
    // Le comparatif porte lui aussi des libellés traduits.
    if (etat.lots.length) rendreComparatif();
  }

  /* ── Réseaux sociaux ─────────────────────────────────────────────────
   *
   * URL dans data/contacts.json et logos dans shared/menu.js, exactement
   * comme le pied de page : une adresse qui change, ou un logo à ajouter,
   * ne se corrige qu'à un seul endroit. Ici les liens sont simplement plus
   * grands et sur fond clair — c'est la dernière chose que voit un visiteur
   * qui n'a pas rempli le formulaire.
   */
  function rendreSocial(contacts) {
    var bloc = document.getElementById('njSocial');
    var zone = document.getElementById('njSocialLiens');
    if (!bloc || !zone) return;
    // texte() est local à appliquerLangue() : on pose le titre à la main.
    var titre = document.getElementById('njSocialTitre');
    if (titre) titre.textContent = t('suivezNous');
    var liste = (contacts && contacts.socials) || [];
    var html = '';
    liste.forEach(function (s) {
      // Sans logo, on n'affiche rien : ici les liens sont grands et isolés,
      // une pastille à initiale y ferait tache. Le pied de page, lui, garde
      // son repli.
      var logo = typeof window.socialIconSvg === 'function' ? window.socialIconSvg(s.platform) : '';
      if (!logo || !s.enabled || !s.url) return;
      var nom = s.label || s.platform;
      html += '<a class="nj-social-lien" data-reseau="' + s.platform +
        '" href="' + s.url + '" target="_blank" rel="noopener"' +
        ' title="' + nom + '" aria-label="' + nom + '">' + logo + nom + '</a>';
    });
    zone.innerHTML = html;
    bloc.hidden = !html;   // aucun réseau exploitable : pas de titre orphelin
  }

  // Appelé par le menu partagé une fois data/contacts.json chargé.
  window.onContactDataChange = function (contacts) { rendreSocial(contacts); };

  // Appelé par le menu partagé à chaque changement de langue.
  window.onLanguageChange = function () {
    appliquerLangue();
    rendreSocial(window.siteContacts);
  };

  document.addEventListener('DOMContentLoaded', function () {
    initPage('units', '');
    etat.projet = (new URLSearchParams(location.search).get('projet') || 'jawhara').toLowerCase();
    lireSelection();

    var retour = 'disponibilites.html?projet=' + encodeURIComponent(etat.projet);
    $('#njRetour').href = retour;
    $('#njRetour2').href = retour;
    $('#njComparatif').addEventListener('click', function (e) {
      var b = e.target.closest('[data-retirer]');
      if (b) retirer(Number(b.dataset.retirer));
    });
    $('#njFormulaire').addEventListener('submit', envoyer);
    setupMrz();
    setupConsentements();
    setupFicheComplete();

    // La visite n'est proposée qu'à partir de demain : personne ne confirme
    // un créneau pour le jour même depuis un formulaire.
    var demain = new Date();
    demain.setDate(demain.getDate() + 1);
    $('#fVisite').min = demain.toISOString().slice(0, 10);

    appliquerLangue();
    charger();
  });
})();
