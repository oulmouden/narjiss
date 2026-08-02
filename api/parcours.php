<?php
/**
 * api/parcours.php — étape 5 du parcours client : la sélection devient un lead.
 *
 * Le visiteur a choisi 1 à 3 logements (étape 3), il se présente ici. On crée
 * une fiche prospect dans la table `fiches` déjà utilisée par le back-office —
 * pas une table concurrente — puis on lui rattache la sélection et, si
 * demandé, une visite.
 *
 *   POST action=contact   { projet, nom, prenom, telephone, email, lots[],
 *                           canal, message, visite_date, consentement }
 *   GET  action=recap&token=…   relit une sélection (sert au QR code de borne)
 *
 * Tout est écrit dans une seule transaction : pas de fiche orpheline sans
 * sélection, ni de sélection pointant sur une fiche inexistante.
 */

declare(strict_types=1);

require_once __DIR__ . '/lots-lib.php';
require_once __DIR__ . '/fiche-config.php';
require_once __DIR__ . '/agents-lib.php';
require_once __DIR__ . '/data.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/** Réponse d'erreur uniforme. */
function nj_p_fail(int $code, string $message): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Champ posté, nettoyé des caractères de contrôle et tronqué. */
function nj_p_champ(string $cle, int $max = 200): string
{
    $v = trim((string) ($_POST[$cle] ?? ''));
    $v = (string) preg_replace('/[\x00-\x1F\x7F]/u', '', $v);
    return mb_substr($v, 0, $max);
}

$action = (string) ($_GET['action'] ?? $_POST['action'] ?? '');

/* ── Relecture d'une sélection par son jeton (QR code de la borne) ────── */
if ($action === 'recap') {
    $token = preg_replace('/[^a-f0-9]/', '', (string) ($_GET['token'] ?? ''));
    if (strlen((string) $token) !== 32) {
        nj_p_fail(400, 'Jeton invalide.');
    }
    try {
        $st = nj_db()->prepare(
            'SELECT s.token, s.projet, s.canal, s.created_at, s.fiche_reference,
                    l.numero_lot, l.typologie, l.surface_habitable, l.prix_dh, l.statut
             FROM parcours_sessions s
             JOIN parcours_selection ps ON ps.session_id = s.id
             JOIN lots l ON l.id = ps.lot_id
             WHERE s.token = ?
             ORDER BY ps.rang'
        );
        $st->execute([$token]);
        $rows = $st->fetchAll();
    } catch (Throwable $e) {
        error_log('parcours recap: ' . $e->getMessage());
        nj_p_fail(500, 'Lecture impossible.');
    }
    if (!$rows) {
        nj_p_fail(404, 'Sélection introuvable ou expirée.');
    }
    echo json_encode([
        'ok'     => true,
        'projet' => $rows[0]['projet'],
        'canal'  => $rows[0]['canal'],
        'date'   => $rows[0]['created_at'],
        'lots'   => array_map(static fn(array $r): array => [
            'numero'    => $r['numero_lot'],
            'typologie' => $r['typologie'],
            'surface'   => (float) $r['surface_habitable'],
            'prix'      => (float) $r['prix_dh'],
            'statut'    => $r['statut'],
        ], $rows),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action !== 'contact' || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    nj_p_fail(405, 'Action non reconnue.');
}

/* ── Validation ───────────────────────────────────────────────────────── */

$projet = strtolower(nj_p_champ('projet', 64));
$projets = nj_projects();
if ($projet === '' || !isset($projets[$projet])) {
    nj_p_fail(404, 'Projet inconnu.');
}

$canal = nj_p_champ('canal', 20);
if (!in_array($canal, ['web', 'kiosque', 'salon', 'conseiller'], true)) {
    $canal = 'web';
}

// La borne du bureau de vente et les salons partagent une seule adresse IP
// entre tous les visiteurs : un plafond de 6/heure les bloquerait dès le
// troisième client. Le canal vient du navigateur, donc falsifiable — il ne
// permet que d'assouplir un garde-fou anti-spam, jamais d'accéder à une donnée.
$plafond = in_array($canal, ['kiosque', 'salon', 'conseiller'], true) ? 40 : 6;
if (!nj_rate_ok($plafond)) {
    nj_p_fail(429, 'Trop de demandes envoyées depuis ce poste. Réessayez dans une heure.');
}

$nom = nj_p_champ('nom', 120);
if (mb_strlen($nom) < 2) {
    nj_p_fail(422, 'Merci d\'indiquer votre nom.');
}
$telephone = nj_p_champ('telephone', 40);
if (!preg_match('/^[0-9 +().-]{8,40}$/', $telephone)) {
    nj_p_fail(422, 'Numéro de téléphone invalide.');
}
$email = nj_p_champ('email', 160);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    nj_p_fail(422, 'Adresse e-mail invalide.');
}

// Consentement explicite : sans lui on ne conserve rien.
if (nj_p_champ('consentement', 10) !== '1') {
    nj_p_fail(422, 'Votre accord est nécessaire pour enregistrer la demande.');
}

$lotsPostes = $_POST['lots'] ?? [];
if (!is_array($lotsPostes)) {
    $lotsPostes = explode(',', (string) $lotsPostes);
}
$ids = array_values(array_unique(array_filter(array_map('intval', $lotsPostes))));
if (!$ids || count($ids) > 3) {
    nj_p_fail(422, 'Sélectionnez entre 1 et 3 logements.');
}

$dateVisite = nj_p_champ('visite_date', 20);
$veutVisite = $dateVisite !== '';
if ($veutVisite) {
    $d = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $dateVisite);
    if (!$d) {
        // Le champ du formulaire est un simple sélecteur de date. Sans heure,
        // createFromFormat reprendrait l'heure d'envoi, ce qui donnerait un
        // « créneau » à 13h51. On pose 10h00, que le conseiller ajustera en
        // confirmant par téléphone.
        $d = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $dateVisite . ' 10:00:00');
    }
    if (!$d) {
        nj_p_fail(422, 'Date de visite illisible.');
    }
    if ($d < new DateTimeImmutable('today')) {
        nj_p_fail(422, 'La date de visite est déjà passée.');
    }
    $dateVisite = $d->format('Y-m-d H:i:s');
}

/* ── Écriture ─────────────────────────────────────────────────────────── */

$pdo = nj_db();

try {
    // Les lots doivent exister, appartenir au projet et être proposables :
    // on ne prend pas rendez-vous sur un lot vendu ou masqué.
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare(
        "SELECT id, numero_lot, statut FROM v_lots_publics
         WHERE projet = ? AND id IN ($in)"
    );
    $st->execute(array_merge([$projet], $ids));
    $trouves = $st->fetchAll();
    if (count($trouves) !== count($ids)) {
        nj_p_fail(422, 'Un des logements sélectionnés n\'est plus proposé.');
    }
    $vendus = array_filter($trouves, static fn(array $l): bool => $l['statut'] === 'vendu');
    if ($vendus) {
        nj_p_fail(409, 'Le logement ' . implode(', ', array_column($vendus, 'numero_lot'))
            . ' vient d\'être vendu. Actualisez votre sélection.');
    }

    $conseiller = nj_resolve_commercial($projet);
    $reference  = nj_new_reference();
    $maintenant = (new DateTimeImmutable())->format('c');
    $token      = bin2hex(random_bytes(16));

    $fiche = [
        'reference'  => $reference,
        'date'       => $maintenant,
        'projet'     => $projet,
        'projet_nom' => (string) ($projets[$projet]['name']['fr'] ?? $projet),
        'conseiller' => (string) ($conseiller['name'] ?? ''),
        'statut'     => 'prospect',
        'expiration' => nj_expiry_date($maintenant, 'prospect'),
        'identite'   => ['nom' => $nom, 'prenom' => nj_p_champ('prenom', 120)],
        'coordonnees' => [
            'telephone' => $telephone,
            'email'     => $email,
            'ville'     => nj_p_champ('ville', 100),
        ],
        'projet_acquisition' => [
            'budget'  => nj_p_champ('budget', 60),
            'lots'    => array_column($trouves, 'numero_lot'),
            'message' => nj_p_champ('message', 1000),
        ],
        'origine_contact' => [
            'source' => 'parcours-client',
            'canal'  => $canal,
            'note'   => nj_p_champ('source_note', 120),
        ],
        'consentement' => [
            'accepte' => true,
            'date'    => $maintenant,
            'texte'   => 'Accord donné pour être recontacté au sujet de cette sélection.',
        ],
    ];

    $pdo->beginTransaction();

    if (!nj_fiche_insert($fiche)) {
        throw new RuntimeException('Insertion de la fiche refusée.');
    }

    $pdo->prepare(
        'INSERT INTO parcours_sessions
           (token, projet, canal, source_note, langue, critere_budget_max,
            etape, fiche_reference, agent_id, created_at, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, 5, ?, ?, NOW(), NOW())'
    )->execute([
        $token, $projet, $canal, nj_p_champ('source_note', 120),
        substr(nj_p_champ('langue', 2) ?: 'fr', 0, 2),
        nj_lot_nombre(nj_p_champ('budget', 60)) ?: null,
        $reference,
        isset($conseiller['id']) ? (int) $conseiller['id'] : null,
    ]);
    $sessionId = (int) $pdo->lastInsertId();

    $sel = $pdo->prepare(
        'INSERT INTO parcours_selection (session_id, lot_id, rang, created_at)
         VALUES (?, ?, ?, NOW())'
    );
    foreach ($ids as $rang => $lotId) {
        $sel->execute([$sessionId, $lotId, $rang + 1]);
    }

    $visiteId = null;
    if ($veutVisite) {
        $pdo->prepare(
            'INSERT INTO visites
               (fiche_reference, session_id, projet, date_visite, agent_id,
                statut, commentaire, created_at)
             VALUES (?, ?, ?, ?, ?, \'demande\', ?, NOW())'
        )->execute([
            $reference, $sessionId, $projet, $dateVisite,
            isset($conseiller['id']) ? (int) $conseiller['id'] : null,
            nj_p_champ('message', 500),
        ]);
        $visiteId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('parcours contact: ' . $e->getMessage());
    nj_p_fail(500, 'Enregistrement impossible. Réessayez ou appelez-nous.');
}

// Journalisé après le commit : la trace ne doit pas faire échouer l'écriture.
nj_log_access('parcours', $reference, $canal . ' / ' . count($ids) . ' lots');

echo json_encode([
    'ok'         => true,
    'reference'  => $reference,
    'token'      => $token,
    'visite'     => $visiteId !== null,
    'conseiller' => $conseiller ? [
        'nom'      => (string) ($conseiller['name'] ?? ''),
        'whatsapp' => (string) ($conseiller['whatsapp'] ?? ''),
        'en_ligne' => isset($conseiller['id']) && nj_agent_is_online((int) $conseiller['id']),
    ] : null,
    'lots' => array_column($trouves, 'numero_lot'),
], JSON_UNESCAPED_UNICODE);
