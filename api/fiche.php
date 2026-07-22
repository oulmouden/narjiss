<?php
/**
 * api/fiche.php — enregistrement d'une fiche de renseignement remplie au
 * bureau de vente (tablette). Reçoit les champs + les photos de pièces.
 *
 * Les images ne sont JAMAIS écrites sous htdocs : voir api/fiche-config.php.
 */
require __DIR__ . '/fiche-config.php';
header('Content-Type: application/json; charset=utf-8');

function nj_fail(int $code, string $message): void {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  nj_fail(405, 'Méthode non autorisée.');
}

// Le formulaire est atteignable depuis une page publique : on borne le débit.
if (!nj_rate_ok()) {
  nj_fail(429, 'Trop de fiches envoyées depuis cet appareil. Réessayez plus tard.');
}

/* ── Projet ───────────────────────────────────────────────────────────── */
$projet = preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['projet'] ?? ''));
if ($projet === '' || !isset(nj_projects()[$projet])) {
  nj_fail(404, 'Projet inconnu.');
}

/* ── Consentement : sans lui, on n'enregistre rien ────────────────────── */
if (($_POST['consentement'] ?? '') !== '1') {
  nj_fail(422, 'Le consentement au traitement des données est obligatoire.');
}

/* ── Champs texte ─────────────────────────────────────────────────────── */
function nj_field(string $key, int $max = 200): string {
  $v = trim((string)($_POST[$key] ?? ''));
  $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v);   // caractères de contrôle
  return mb_substr($v, 0, $max);
}

/** N'accepte qu'une valeur figurant dans la liste blanche. */
function nj_choice(string $key, array $allowed, string $default = ''): string {
  $v = trim((string)($_POST[$key] ?? ''));
  return in_array($v, $allowed, true) ? $v : $default;
}

/** Cases à cocher multiples : ne garde que les valeurs connues. */
function nj_multi(string $key, array $allowed): array {
  $v = $_POST[$key] ?? [];
  if (!is_array($v)) return [];
  return array_values(array_intersect($v, $allowed));
}

$nom    = nj_field('nom', 120);
$prenom = nj_field('prenom', 120);
if ($nom === '' || $prenom === '') {
  nj_fail(422, 'Le nom et le prénom sont obligatoires.');
}

$telephone = nj_field('telephone', 40);
$email     = nj_field('email', 160);
if ($telephone === '' && $email === '') {
  nj_fail(422, 'Au moins un moyen de contact est requis (téléphone ou e-mail).');
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  nj_fail(422, 'Adresse e-mail invalide.');
}

$reference = nj_new_reference();
$dateIso   = date('c');

$fiche = [
  'reference'    => $reference,
  'date'         => $dateIso,
  'projet'       => $projet,
  'projet_nom'   => nj_project_name($projet),
  'conseiller'   => nj_field('conseiller', 120),
  'statut'       => 'prospect',           // passe à « client » depuis le back-office
  'expiration'   => nj_expiry_date($dateIso, 'prospect'),

  'identite' => [
    'nom'              => $nom,
    'prenom'           => $prenom,
    'date_naissance'   => nj_field('date_naissance', 20),
    'nationalite'      => nj_field('nationalite', 80),
    'situation'        => nj_choice('situation', ['celibataire', 'marie', 'autre']),
    'cnie'             => nj_field('cnie', 30),
    'cnie_validite'    => nj_field('cnie_validite', 20),
    'passeport'        => nj_field('passeport', 30),
  ],

  'coordonnees' => [
    'adresse'    => nj_field('adresse', 250),
    'ville'      => nj_field('ville', 100),
    'pays'       => nj_field('pays', 80),
    'mre'        => (($_POST['mre'] ?? '') === '1'),
    'telephone'  => $telephone,
    'email'      => $email,
  ],

  'situation_pro' => [
    'profession' => nj_field('profession', 120),
    'employeur'  => nj_field('employeur', 120),
    'revenu'     => nj_choice('revenu', ['<10k', '10-20k', '20-40k', '>40k']),
    // Exigé par l'obligation d'identification de la loi 43-05.
    'origine_fonds' => nj_multi('origine_fonds',
      ['epargne', 'credit', 'cession', 'donation', 'autre']),
  ],

  'projet_acquisition' => [
    'type'        => nj_multi('type_bien', ['appartement', 'villa', 'terrain', 'commercial', 'bureau']),
    'usage'       => nj_choice('usage', ['principale', 'secondaire', 'locatif', 'revente']),
    'financement' => nj_choice('financement', ['comptant', 'credit', 'mixte']),
    'echeance'    => nj_choice('echeance', ['immediate', '<6m', '6-12m', '>12m']),
    'budget'      => nj_field('budget', 60),
    'superficie'  => nj_field('superficie', 60),
    'observations'=> nj_field('observations', 1000),
  ],

  'origine_contact' => nj_multi('origine_contact',
    ['site', 'visite360', 'reseaux', 'affichage', 'recommandation', 'salon', 'spontane', 'autre']),

  'consentement' => [
    'traitement' => true,                                   // vérifié plus haut
    'marketing'  => (($_POST['marketing'] ?? '') === '1'),  // facultatif et distinct
    'horodatage' => $dateIso,
    'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
  ],

  'pieces' => [],
];

/* ── Pièces jointes ───────────────────────────────────────────────────── */
$dir = NJ_PIECES_DIR . DIRECTORY_SEPARATOR . $reference;

/** Valide et enregistre une image ; retourne le nom de fichier ou null. */
function nj_store_image(string $field, string $reference, string $dir): ?string {
  if (empty($_FILES[$field]) || ($_FILES[$field]['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    return null;
  }
  $tmp  = $_FILES[$field]['tmp_name'];
  $size = (int)$_FILES[$field]['size'];

  if ($size <= 0 || $size > NJ_MAX_PIECE_BYTES) return null;
  if (!is_uploaded_file($tmp)) return null;

  // On se fie au contenu réel, pas à l'extension ni au type déclaré :
  // un .jpg peut parfaitement contenir du PHP.
  $info = @getimagesize($tmp);
  if ($info === false) return null;
  $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2]] ?? null;
  if ($ext === null) return null;

  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $name = $field . '.' . $ext;
  return move_uploaded_file($tmp, $dir . DIRECTORY_SEPARATOR . $name) ? $name : null;
}

foreach (array_keys(nj_piece_types()) as $type) {
  if ($type === 'signature') continue;             // traitée à part (canvas)
  $stored = nj_store_image($type, $reference, $dir);
  if ($stored) $fiche['pieces'][$type] = $stored;
}

/* ── Signature manuscrite (canvas → PNG en base64) ────────────────────── */
$sig = (string)($_POST['signature'] ?? '');
if (preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $sig, $m)) {
  $bin = base64_decode($m[1], true);
  if ($bin !== false && strlen($bin) > 0 && strlen($bin) <= NJ_MAX_PIECE_BYTES) {
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    if (@file_put_contents($dir . DIRECTORY_SEPARATOR . 'signature.png', $bin) !== false) {
      $fiche['pieces']['signature'] = 'signature.png';
    }
  }
}

/* ── Enregistrement ───────────────────────────────────────────────────── */
if (!nj_fiches_append($fiche)) {
  nj_fail(500, 'Enregistrement impossible.');
}
nj_log_access('creation', $reference, $nom . ' ' . $prenom . ' / ' . $projet);

echo json_encode([
  'ok'        => true,
  'reference' => $reference,
], JSON_UNESCAPED_UNICODE);
