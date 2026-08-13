<?php
/**
 * api/message-depot.php — dépôt d'un message sur un bureau de vente.
 *
 * Deux appelants :
 *  · le visiteur de bureaudevente.html — enregistre sa voix dans le navigateur
 *    et/ou écrit son message, et saisit ses coordonnées au clavier ;
 *  · l'hôtesse IA (api/agent.py) — quand aucun commercial n'est joignable, elle
 *    prend le message à l'oral et le dépose ici (texte + numéro dicté).
 *
 * POST action=deposer {projet, nom, telephone?, email?, message?, texte?,
 *                      langue?, duree?, audio?} → {ok:true, id}
 *
 * Règles : au moins un CONTENU (audio ou message écrit) et au moins un MOYEN DE
 * CONTACT (téléphone ou e-mail) — sans quoi le message est une impasse.
 *
 * Sécurité : honeypot, plafond horaire par IP, format audio vérifié aux octets,
 * numéro normalisé E.164, enregistrement rangé hors htdocs.
 */
require __DIR__ . '/messages-lib.php';
require_once __DIR__ . '/data.php';
require_once __DIR__ . '/mail.php';
header('Content-Type: application/json; charset=utf-8');

function nj_depot_out(array $data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  nj_depot_out(['ok' => false, 'error' => 'Méthode non autorisée.'], 405);
}

// Honeypot : un humain ne remplit pas ce champ caché → on feint le succès.
if (!empty($_POST['site_web'])) nj_depot_out(['ok' => true, 'id' => 0]);

/** Coupe et nettoie une valeur postée (mêmes règles que api/rendezvous.php). */
function nj_msg_clean(string $key, int $max): string {
  $v = trim((string)($_POST[$key] ?? ''));
  $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v);
  return mb_substr($v, 0, $max);
}

try {
  // ── Bureau ciblé ─────────────────────────────────────────────────────────
  // Aucun projet précisé (formulaire de contact du site) : le message part au
  // « renseignement général », traité par les gestionnaires et l'admin.
  $projet   = preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['projet'] ?? ''));
  $projects = nj_projects();
  if ($projet === '') {
    $projet = NJ_MSG_PROJET_GENERAL;
  } elseif (!isset($projects[$projet])) {
    nj_depot_out(['ok' => false, 'error' => 'Projet inconnu.'], 404);
  }

  $pdo = nj_msg_db();

  // ── Anti-flood (empreinte salée : l'IP n'est jamais stockée en clair) ─────
  $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|narjiss-messages');
  $st = $pdo->prepare('SELECT COUNT(*) FROM messages WHERE ip_hash = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)');
  $st->execute([$ipHash]);
  if ((int)$st->fetchColumn() >= NJ_MSG_MAX_PAR_IP_H) {
    nj_depot_out(['ok' => false, 'error' => 'Trop de messages déposés, réessayez plus tard.'], 429);
  }

  // ── Champs ───────────────────────────────────────────────────────────────
  $nom     = nj_msg_clean('nom', 120);
  $email   = nj_msg_clean('email', 160);
  $message = nj_msg_clean('message', 4000);   // écrit au clavier par le visiteur
  $texte   = nj_msg_clean('texte', 4000);     // pris à l'oral par l'hôtesse IA
  $telBrut = nj_msg_clean('telephone', 40);
  $langue  = preg_replace('/[^a-z]/', '', strtolower((string)($_POST['langue'] ?? 'fr'))) ?: 'fr';
  $duree   = max(0, min(NJ_MSG_MAX_DUREE_S, (int)($_POST['duree'] ?? 0)));
  $canal   = ($_POST['canal'] ?? '') === 'hotesse' ? 'hotesse' : 'web';

  $tel = $telBrut !== '' ? nj_msg_tel_e164($telBrut) : null;
  if ($telBrut !== '' && $tel === null) {
    nj_depot_out(['ok' => false, 'error' => 'Numéro de téléphone invalide.'], 400);
  }
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    nj_depot_out(['ok' => false, 'error' => 'Adresse e-mail invalide.'], 400);
  }
  if ($tel === null && $email === '') {
    nj_depot_out(['ok' => false, 'error' => 'Laissez un téléphone ou un e-mail pour être rappelé.'], 400);
  }

  // ── Enregistrement (facultatif : le visiteur peut préférer écrire) ───────
  $audio = nj_msg_audio_save('audio');
  if (!$audio && !empty($_FILES['audio'])) {
    nj_depot_out(['ok' => false, 'error' => 'Enregistrement illisible ou trop lourd.'], 400);
  }
  if (!$audio && $message === '' && $texte === '') {
    nj_depot_out(['ok' => false, 'error' => 'Message vide.'], 400);
  }

  // ── Transcription de l'audio (si OPENAI_API_KEY est renseignée) ──────────
  if ($audio && $texte === '') {
    $texte = (string)nj_msg_transcrire(nj_msg_audio_path($audio['fichier']), $langue);
  }

  $st = $pdo->prepare('INSERT INTO messages
      (projet, canal, visiteur_nom, telephone, telephone_brut, email, langue,
       message_texte, transcription, audio_fichier, audio_mime, duree_s, ip_hash, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())');
  $st->execute([
    $projet, $canal, $nom, $tel ?? '', $telBrut, $email, $langue,
    $message !== '' ? $message : null,
    $texte !== '' ? $texte : null,
    $audio['fichier'] ?? '', $audio['mime'] ?? '', $duree, $ipHash,
  ]);
  $id = (int)$pdo->lastInsertId();

  // ── Prévenir les commerciaux du bureau (best-effort) ─────────────────────
  try {
    $projetNom = nj_msg_projet_nom($projet);
    $dests = [];
    if ($projet === NJ_MSG_PROJET_GENERAL) {
      // Personne n'est rattaché à ce bureau fictif : on prévient l'encadrement.
      foreach (nj_agents_list('', 'active') as $a) {
        if (!empty($a['email']) && in_array($a['role'], ['gestionnaire', 'superviseur'], true)) $dests[] = $a['email'];
      }
    } else {
      foreach (nj_agents_list($projet, 'active') as $a) {
        if (!empty($a['email'])) $dests[] = $a['email'];
      }
    }
    if (!$dests && ($secours = trim(nj_config('FICHE_NOTIFY_TO', '')))) $dests[] = $secours;

    if ($dests) {
      $he = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
      $corps = '<b>' . $he($nom ?: 'Un visiteur') . '</b> a laissé un message au bureau de vente '
             . '<b>' . $he($projetNom) . '</b>.'
             . ($tel   ? '<br>Téléphone : <b>' . $he(nj_msg_tel_affiche($tel)) . '</b>' : '')
             . ($email ? '<br>E-mail : <b>' . $he($email) . '</b>' : '')
             . ($duree ? '<br>Message vocal de ' . (int)floor($duree / 60) . ' min ' . ($duree % 60) . ' s' : '')
             . ($message ? '<br><br>« ' . $he(mb_substr($message, 0, 400)) . ' »' : '')
             . ($texte ? '<br><br><i>Transcription (à vérifier) : « ' . $he(mb_substr($texte, 0, 400)) . ' »</i>' : '');
      $url = rtrim(nj_base_url(), '/') . '/espace-agent.html';
      foreach (array_unique($dests) as $to) {
        nj_mail($to, 'Nouveau message — bureau de vente ' . $projetNom,
                nj_mail_template('Un message vous attend', $corps, 'Ouvrir mon espace', $url));
      }
    }
  } catch (Throwable $e) { /* notification best-effort */ }

  nj_depot_out(['ok' => true, 'id' => $id]);

} catch (Throwable $e) {
  nj_depot_out(['ok' => false, 'error' => 'Service indisponible.'], 500);
}
