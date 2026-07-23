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

  // Sépare « NOM<<PRENOM<AUTRE » en { nom, prenom }.
  function parseNames(line) {
    var parts = line.split('<<');
    var primary = (parts[0] || '').replace(/</g, ' ').trim();
    var secondary = (parts.slice(1).join('<<') || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim();
    return { nom: primary, prenom: secondary };
  }

  /**
   * Analyse 3 lignes TD1. Retourne un objet complet si TOUS les contrôles
   * passent, sinon { valid:false, reason }.
   */
  function parseTD1(l1, l2, l3) {
    l1 = cleanLine(l1); l2 = cleanLine(l2); l3 = cleanLine(l3);

    // Chaque ligne TD1 fait 30 caractères. On tolère une longueur légèrement
    // différente due à l'OCR, mais on cale sur 30.
    if (l1.length < 25 || l2.length < 25 || l3.length < 10) {
      return { valid: false, reason: 'lignes trop courtes' };
    }
    l1 = (l1 + '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0, 30);
    l2 = (l2 + '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0, 30);

    var docNumber = l1.slice(5, 14);
    var docNumberCk = l1[14];

    var birth = l2.slice(0, 6);
    var birthCk = l2[6];
    var sex = l2[7];
    var expiry = l2.slice(8, 14);
    var expiryCk = l2[14];
    var nationality = l2.slice(15, 18);
    var compositeCk = l2[29];

    // Contrôles individuels : chacun doit valider.
    if (!digitOk(docNumber, docNumberCk)) return { valid: false, reason: 'n° document' };
    if (!digitOk(birth, birthCk))         return { valid: false, reason: 'date de naissance' };
    if (!digitOk(expiry, expiryCk))       return { valid: false, reason: 'date de validité' };

    // Contrôle composite : couvre l'ensemble des zones sensibles.
    var composite = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
    if (!digitOk(composite, compositeCk)) return { valid: false, reason: 'contrôle global' };

    var birthDate = parseDate(birth, false);
    var expiryDate = parseDate(expiry, true);
    if (!birthDate || !expiryDate) return { valid: false, reason: 'dates illisibles' };

    var names = parseNames(l3);

    return {
      valid: true,
      documentNumber: docNumber.replace(/</g, ''),
      nom: names.nom,
      prenom: names.prenom,
      birthDate: birthDate.iso,
      expiryDate: expiryDate.iso,
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
