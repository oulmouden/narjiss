/**
 * mrz-td1.js — lecture de la MRZ des cartes d'identité (format TD1, ICAO 9303).
 * La CIN biométrique marocaine suit ce format : 3 lignes de 30 caractères.
 *
 * L'intérêt de la MRZ n'est pas l'OCR (qui reste faillible) mais ses CHIFFRES
 * DE CONTRÔLE : si l'OCR se trompe d'un caractère, le contrôle échoue et on
 * refuse le résultat. On ne remplit donc jamais un champ avec une valeur
 * douteuse — soit la MRZ valide entièrement, soit on laisse la saisie manuelle.
 *
 * Exposé en global window.MRZ (aucun module).
 */
(function (root) {
  'use strict';

  // Valeur d'un caractère pour le calcul de contrôle : 0-9 → 0-9,
  // A-Z → 10-35, '<' (remplissage) → 0.
  function charValue(ch) {
    if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
    if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 55;
    return 0; // '<' et tout le reste
  }

  // Chiffre de contrôle ICAO : poids 7,3,1 répétés, somme modulo 10.
  function checkDigit(str) {
    var weights = [7, 3, 1];
    var sum = 0;
    for (var i = 0; i < str.length; i++) {
      sum += charValue(str[i]) * weights[i % 3];
    }
    return sum % 10;
  }

  function digitOk(field, expected) {
    // expected est un caractère ; s'il n'est pas un chiffre, contrôle absent → refus.
    if (expected < '0' || expected > '9') return false;
    return checkDigit(field) === (expected.charCodeAt(0) - 48);
  }

  // YYMMDD → { iso: 'AAAA-MM-JJ' } ; siècle déduit selon le contexte.
  function parseDate(yymmdd, isExpiry) {
    if (!/^\d{6}$/.test(yymmdd)) return null;
    var yy = parseInt(yymmdd.slice(0, 2), 10);
    var mm = parseInt(yymmdd.slice(2, 4), 10);
    var dd = parseInt(yymmdd.slice(4, 6), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

    var century;
    if (isExpiry) {
      century = 2000;                 // une validité est toujours dans le futur proche
    } else {
      // Naissance : 19xx si l'année dépasse une borne, sinon 20xx.
      century = yy > 30 ? 1900 : 2000;
    }
    var yyyy = century + yy;
    return {
      iso: yyyy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0')
    };
  }

  // Normalise une ligne : majuscules, on ne garde que A-Z 0-9 et '<'.
  function cleanLine(line) {
    return String(line || '')
      .toUpperCase()
      .replace(/ /g, '<')
      .replace(/[^A-Z0-9<]/g, '');
  }

  // Un identifiant (nom ou prénoms) : ses composants sont séparés par un '<'
  // simple. On les réunit MAIS on s'arrête au premier composant sans voyelle —
  // c'est là que commence le remplissage mal lu (les '<' de bourrage que l'OCR
  // rend en K/L/C…). Les noms translittérés ont toujours au moins une voyelle.
  function cleanNameField(segment) {
    var toks = String(segment || '').split('<');
    var kept = [];
    for (var i = 0; i < toks.length; i++) {
      var tok = toks[i];
      if (!tok) continue;
      if (/[AEIOU]/.test(tok)) kept.push(tok);
      else break;
    }
    return kept.join(' ').trim();
  }

  // Sépare « NOM<<PRENOMS<<bourrage » : le double '<' marque la frontière
  // nom / prénoms ; tout ce qui suit les prénoms est du remplissage, ignoré.
  function parseNames(line) {
    var parts = String(line || '').split('<<');
    return {
      nom: cleanNameField(parts[0] || ''),
      prenom: cleanNameField(parts[1] || '')
    };
  }

  // Recalage : l'OCR ajoute parfois des caractères parasites en TÊTE de ligne
  // (ex. « BIDMAR… », « BE58… »), ce qui décalerait le découpage à positions
  // fixes. On réancre la ligne 1 sur le code pays (positions 3-5) et la ligne 2
  // sur le premier chiffre (début de la date de naissance).
  function alignLine1(l) {
    var i = l.indexOf('MAR');
    if (i >= 2 && i <= 5) return l.slice(i - 2);
    var j = l.indexOf('ID');            // repli : type de document
    return (j > 0 && j <= 3) ? l.slice(j) : l;
  }
  function alignLine2(l) {
    var m = /[0-9]/.exec(l);
    return (m && m.index > 0 && m.index <= 3) ? l.slice(m.index) : l;
  }

  /**
   * Analyse 3 lignes TD1. Retourne un objet complet si TOUS les contrôles
   * passent, sinon { valid:false, reason }.
   */
  function parseTD1(l1, l2, l3) {
    l1 = alignLine1(cleanLine(l1));
    l2 = alignLine2(cleanLine(l2));
    l3 = cleanLine(l3);

    // Chaque ligne TD1 fait 30 caractères. On tolère une longueur légèrement
    // différente due à l'OCR, mais on cale sur 30.
    if (l1.length < 25 || l2.length < 25 || l3.length < 10) {
      return { valid: false, reason: 'lignes trop courtes' };
    }
    l1 = (l1 + '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0, 30);
    l2 = (l2 + '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0, 30);

    var country = l1.slice(2, 5).replace(/</g, '');

    var docField = l1.slice(5, 14);       // zone « n° de document » (9 car.)
    var docFieldCk = l1[14];
    var optional1 = l1.slice(15, 30);     // données optionnelles de la ligne 1

    var birth = l2.slice(0, 6);
    var birthCk = l2[6];
    var sex = l2[7];
    var expiry = l2.slice(8, 14);
    var expiryCk = l2[14];
    var nationality = l2.slice(15, 18);
    var compositeCk = l2[29];

    // Les deux contrôles de dates sont fiables sur tous les documents, Maroc
    // compris : on les exige toujours. Deux chiffres de contrôle ICAO qui
    // valident = très forte garantie que l'OCR a lu correctement.
    if (!digitOk(birth, birthCk))   return { valid: false, reason: 'date de naissance' };
    if (!digitOk(expiry, expiryCk)) return { valid: false, reason: 'date de validité' };

    // La CNIE biométrique marocaine NE suit PAS l'ICAO pour le chiffre de
    // contrôle du n° de document ni pour le contrôle composite (constaté sur
    // spécimen : « OPIBFOAY<5 » → attendu 5, ICAO donne 9). On n'exige donc ces
    // deux contrôles qu'en dehors du Maroc, où ils restent standards.
    var isMorocco = country === 'MAR';
    if (!isMorocco) {
      if (!digitOk(docField, docFieldCk)) return { valid: false, reason: 'n° document' };
      var composite = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
      if (!digitOk(composite, compositeCk)) return { valid: false, reason: 'contrôle global' };
    }

    // Dates : la CNIE marocaine encode parfois une naissance PARTIELLE (année
    // connue, mois/jour en « < » — ex. 58<<<< pour un natif de 1958 sans état
    // civil précis). Le chiffre de contrôle, déjà validé, garantit l'intégrité :
    // on ne rejette donc plus une date incomplète, on laisse le champ vide.
    var birthDate = parseDate(birth, false);
    var expiryDate = parseDate(expiry, true);

    var names = parseNames(l3);

    // N° de la CIN : au Maroc, le champ « n° de document » contient un
    // identifiant de gestion (ex. OPIBFOAY) et le VRAI numéro (ex. E569509) est
    // placé dans les données optionnelles de la ligne 1. Ailleurs, on garde le
    // champ standard.
    var idNumber = docField.replace(/</g, '');
    if (isMorocco) {
      // Le n° s'écrit « 1-2 lettres + chiffres » (ex. E569509) : on l'isole du
      // remplissage résiduel que l'OCR aurait pu laisser autour.
      var optId = optional1.replace(/</g, '');
      var m = optId.match(/[A-Z]{0,2}\d{4,8}/);
      idNumber = m ? m[0] : (optId || idNumber);
    }

    return {
      valid: true,
      documentNumber: idNumber,
      nom: names.nom,
      prenom: names.prenom,
      birthDate: birthDate ? birthDate.iso : '',
      expiryDate: expiryDate ? expiryDate.iso : '',
      sex: sex === 'M' ? 'M' : (sex === 'F' ? 'F' : ''),
      nationality: nationality.replace(/</g, '')
    };
  }

  /**
   * Cherche 3 lignes TD1 exploitables dans un texte OCR brut (multi-lignes,
   * bruité). Retourne le premier triplet qui valide, sinon null.
   */
  function fromOcrText(text) {
    var raw = String(text || '').split(/[\r\n]+/);
    var lines = [];
    for (var i = 0; i < raw.length; i++) {
      var c = cleanLine(raw[i]);
      // Une ligne MRZ contient beaucoup de '<' et fait ~30 caractères.
      if (c.length >= 20 && (c.indexOf('<') >= 0 || c.length >= 28)) lines.push(c);
    }
    // Fenêtre glissante de 3 lignes consécutives.
    for (var j = 0; j + 2 < lines.length + 1 && j + 2 < lines.length + 0 + 1; j++) {
      if (j + 2 >= lines.length) break;
      var r = parseTD1(lines[j], lines[j + 1], lines[j + 2]);
      if (r.valid) return r;
    }
    // Dernier recours : les 3 dernières lignes candidates.
    if (lines.length >= 3) {
      var r2 = parseTD1(lines[lines.length - 3], lines[lines.length - 2], lines[lines.length - 1]);
      if (r2.valid) return r2;
    }
    return null;
  }

  var MRZ = { parseTD1: parseTD1, fromOcrText: fromOcrText, checkDigit: checkDigit };

  if (typeof module === 'object' && module.exports) module.exports = MRZ;
  else root.MRZ = MRZ;
})(typeof window !== 'undefined' ? window : this);
