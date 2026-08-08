<?php
/**
 * api/plan-zones-lib.php — zones cliquables des plans d'étage.
 *
 * Lit et écrit la table `plan_zones` (voir sql/004_plan_zones.sql), recense
 * les plans disponibles sur le disque, et sait reprendre la détection
 * automatique produite par tools/plan-zones.py.
 *
 * Partagé par l'éditeur d'admin (admin/plan-zones.php) et, plus tard, par
 * l'explorateur public. Le front public ne doit lire que les zones affectées
 * à un lot visible : une zone sans `numero_lot` est un brouillon d'édition.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/** Racine du site, quel que soit l'appelant. */
function nj_zones_racine(): string
{
    return dirname(__DIR__);
}

/** La table existe-t-elle ? Sert à afficher un message utile plutôt qu'un 500. */
function nj_zones_schema_present(): bool
{
    try {
        nj_db()->query('SELECT 1 FROM `plan_zones` LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Plans d'étage disponibles pour un projet, par balayage du disque.
 *
 * Les plans ne sont pas déclarés : ils sont déposés dans le dossier du projet
 * (andalusia/plans/, jawhara/floorplan/…). Les recenser depuis le système de
 * fichiers évite un inventaire à tenir à jour à la main, qui serait faux dès
 * le premier ajout.
 *
 * @return array<string,array{chemin:string,nom:string,largeur:int,hauteur:int}>
 */
function nj_zones_plans(string $projet): array
{
    $racine = nj_zones_racine();
    $dossiers = [$projet . '/plans', $projet . '/floorplan'];
    $plans = [];

    foreach ($dossiers as $rel) {
        $abs = $racine . '/' . $rel;
        if (!is_dir($abs)) continue;

        foreach (scandir($abs) ?: [] as $fichier) {
            if ($fichier[0] === '.') continue;
            $ext = strtolower(pathinfo($fichier, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) continue;

            $chemin = $rel . '/' . $fichier;
            $taille = @getimagesize($abs . '/' . $fichier) ?: [0, 0];
            $plans[$chemin] = [
                'chemin'  => $chemin,
                'nom'     => pathinfo($fichier, PATHINFO_FILENAME),
                'largeur' => (int) $taille[0],
                'hauteur' => (int) $taille[1],
            ];
        }
    }

    ksort($plans);
    return $plans;
}

/**
 * Zones enregistrées pour un plan.
 *
 * @return array<int,array{id:int,numero_lot:string,points:array,origine:string}>
 */
function nj_zones_lire(string $projet, string $plan): array
{
    if (!nj_zones_schema_present()) return [];

    $st = nj_db()->prepare(
        'SELECT id, numero_lot, points, largeur, hauteur, origine
           FROM plan_zones WHERE projet = ? AND plan = ? ORDER BY id'
    );
    $st->execute([$projet, $plan]);

    $zones = [];
    foreach ($st->fetchAll() as $r) {
        $points = json_decode((string) $r['points'], true);
        if (!is_array($points) || count($points) < 3) continue;   // polygone dégénéré
        $zones[] = [
            'id'         => (int) $r['id'],
            'numero_lot' => (string) $r['numero_lot'],
            'points'     => $points,
            'largeur'    => (int) $r['largeur'],
            'hauteur'    => (int) $r['hauteur'],
            'origine'    => (string) $r['origine'],
        ];
    }
    return $zones;
}

/**
 * Remplace en bloc les zones d'un plan.
 *
 * L'éditeur envoie l'état complet du plan, pas un diff : on efface puis on
 * réécrit dans une transaction. Un diff imposerait de suivre les créations,
 * suppressions et déplacements de sommets côté navigateur pour un gain nul —
 * un plan ne porte qu'une poignée de polygones.
 *
 * @param array $zones  [['numero_lot'=>..,'points'=>[[x,y],..],'origine'=>..], …]
 * @return int          nombre de zones écrites
 */
function nj_zones_enregistrer(string $projet, string $plan, array $zones,
                              int $largeur, int $hauteur): int
{
    // Filet de sécurité : sauvegarder l'état courant AVANT de l'effacer.
    // L'enregistrement remplace tout le plan (DELETE + INSERT) ; sans copie
    // préalable, un report malheureux ou un envoi vide détruit le travail
    // manuel sans retour possible. On garde donc un instantané horodaté.
    nj_zones_backup($projet, $plan);

    $db = nj_db();
    $db->beginTransaction();
    try {
        $del = $db->prepare('DELETE FROM plan_zones WHERE projet = ? AND plan = ?');
        $del->execute([$projet, $plan]);

        $ins = $db->prepare(
            'INSERT INTO plan_zones (projet, plan, numero_lot, points, largeur, hauteur, origine)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        $n = 0;
        foreach ($zones as $z) {
            $points = nj_zones_nettoyer_points($z['points'] ?? []);
            $numero = mb_substr(trim((string) ($z['numero_lot'] ?? '')), 0, 32);
            // Un polygone sans lot n'a personne à qui appartenir : il ne
            // servirait qu'à encombrer le plan. L'éditeur part du lot, il ne
            // peut pas en produire ; on refuse quand même, par sécurité.
            if ($numero === '' || count($points) < 3) continue;
            $ins->execute([
                $projet,
                $plan,
                $numero,
                json_encode($points),
                $largeur,
                $hauteur,
                ($z['origine'] ?? 'manuel') === 'auto' ? 'auto' : 'manuel',
            ]);
            $n++;
        }

        $db->commit();
        return $n;
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * Instantané horodaté des zones d'un plan, avant écrasement.
 *
 * Écrit outputs/plan-zones/backups/<projet>/<plan>-<AAAAMMJJ-HHMMSS>.json avec
 * l'état complet lisible (numero_lot + points). Ne fait rien s'il n'y a rien à
 * sauver. Conserve les 40 sauvegardes les plus récentes par plan.
 *
 * @return string|null  chemin du fichier écrit, ou null si rien à sauver
 */
function nj_zones_backup(string $projet, string $plan): ?string
{
    if (!nj_zones_schema_present()) return null;
    $zones = nj_zones_lire($projet, $plan);
    if (!$zones) return null;                       // rien à perdre

    $dir = nj_zones_racine() . '/outputs/plan-zones/backups/'
         . preg_replace('/[^a-z0-9_-]/i', '_', $projet);
    if (!is_dir($dir)) @mkdir($dir, 0775, true);

    $base = preg_replace('/[^a-z0-9]+/i', '_', pathinfo($plan, PATHINFO_FILENAME));
    $file = $dir . '/' . $base . '-' . date('Ymd-His') . '.json';

    @file_put_contents($file, json_encode([
        'projet'        => $projet,
        'plan'          => $plan,
        'sauvegarde_le' => date('c'),
        'zones'         => $zones,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

    // Rétention : ne garder que les 40 instantanés les plus récents de ce plan.
    $anciens = glob($dir . '/' . $base . '-*.json') ?: [];
    if (count($anciens) > 40) {
        usort($anciens, static fn($a, $b) => filemtime($a) <=> filemtime($b));
        foreach (array_slice($anciens, 0, count($anciens) - 40) as $vieux) @unlink($vieux);
    }
    return $file;
}

/** Force des couples d'entiers ; rejette tout ce qui n'est pas un point. */
function nj_zones_nettoyer_points($points): array
{
    if (!is_array($points)) return [];
    $out = [];
    foreach ($points as $p) {
        if (!is_array($p) || count($p) < 2) continue;
        $out[] = [(int) round((float) $p[0]), (int) round((float) $p[1])];
    }
    return $out;
}

/**
 * Récupère la détection automatique de tools/plan-zones.py pour un plan.
 *
 * Le script écrit dans outputs/plan-zones/, éventuellement dans un
 * sous-dossier quand on compare plusieurs réglages (p6/, p8/…). On prend donc
 * le fichier le plus récent portant le bon nom, plutôt qu'un chemin figé.
 *
 * @return array{zones:array,source:string}|null
 */
function nj_zones_detection(string $plan): ?array
{
    $base = pathinfo($plan, PATHINFO_FILENAME);
    $racine = nj_zones_racine() . '/outputs/plan-zones';
    if (!is_dir($racine)) return null;

    $candidats = array_merge(
        glob($racine . '/' . $base . '-zones.json') ?: [],
        glob($racine . '/*/' . $base . '-zones.json') ?: []
    );
    if (!$candidats) return null;

    usort($candidats, static fn($a, $b) => filemtime($b) <=> filemtime($a));
    $fichier = $candidats[0];

    $data = json_decode((string) file_get_contents($fichier), true);
    if (!is_array($data) || empty($data['zones'])) return null;

    $zones = [];
    foreach ($data['zones'] as $z) {
        $points = nj_zones_nettoyer_points($z['points'] ?? []);
        if (count($points) < 3) continue;
        $zones[] = [
            'numero_lot' => (string) ($z['numero_lot'] ?? ''),
            'points'     => $points,
            'origine'    => 'auto',
        ];
    }
    if (!$zones) return null;

    return [
        'zones'   => $zones,
        'source'  => str_replace(
            str_replace('\\', '/', nj_zones_racine()) . '/', '',
            str_replace('\\', '/', $fichier)
        ),
        'largeur' => (int) ($data['largeur'] ?? 0),
        'hauteur' => (int) ($data['hauteur'] ?? 0),
    ];
}

/**
 * Combien de zones affectées, par plan, pour un projet.
 * Alimente le tableau de bord : voir d'un coup d'œil ce qui reste à faire.
 *
 * @return array<string,array{total:int,affectees:int}>
 */
function nj_zones_avancement(string $projet): array
{
    if (!nj_zones_schema_present()) return [];

    $st = nj_db()->prepare(
        "SELECT plan,
                COUNT(*) AS total,
                SUM(CASE WHEN numero_lot <> '' THEN 1 ELSE 0 END) AS affectees
           FROM plan_zones WHERE projet = ? GROUP BY plan"
    );
    $st->execute([$projet]);

    $out = [];
    foreach ($st->fetchAll() as $r) {
        $out[(string) $r['plan']] = [
            'total'     => (int) $r['total'],
            'affectees' => (int) $r['affectees'],
        ];
    }
    return $out;
}
