<?php
/**
 * api/lots-lib.php — lots d'un projet : lecture, filtres et import CSV.
 *
 * Partagé par le back-office (admin/lots*.php) et, plus tard, par le parcours
 * client. Le front public ne doit interroger que la vue v_lots_publics, qui
 * masque les lots bloqués et les notes internes.
 *
 * Le CSV est le canal d'alimentation, MySQL la source de vérité : le chef de
 * bureau de vente maintient un Excel (voir data/lots/), l'admin l'importe.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/** Valeurs acceptées par les colonnes ENUM de la table `lots`. */
function nj_lot_enums(): array
{
    return [
        'typologie'   => ['studio', 'f2', 'f3', 'f4', 'f5', 'duplex', 'bureau', 'commerce'],
        'orientation' => ['rue', 'cour', 'jardin', 'double', 'angle'],
        'exposition'  => ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'],
        'parking'     => ['aucun', 'sous-sol', 'exterieur', 'box'],
        'statut'      => ['disponible', 'optionne', 'reserve', 'vendu', 'bloque'],
    ];
}

/**
 * Variantes de saisie tolérées. Le bureau de vente tape « Réservé »,
 * « RESERVE » ou « reservee » : tout doit tomber sur la même valeur.
 */
function nj_lot_alias(): array
{
    return [
        'double orientation' => 'double', 'traversant' => 'double',
        'sous sol' => 'sous-sol', 'soussol' => 'sous-sol', 'ss' => 'sous-sol',
        'exterieure' => 'exterieur', 'dehors' => 'exterieur',
        'option' => 'optionne', 'optionnee' => 'optionne',
        'reservee' => 'reserve', 'resa' => 'reserve',
        'vendue' => 'vendu', 'signe' => 'vendu',
        'bloquee' => 'bloque', 'temoin' => 'bloque',
        'libre' => 'disponible', 'dispo' => 'disponible',
        't2' => 'f2', 't3' => 'f3', 't4' => 'f4', 't5' => 'f5',
        'local commercial' => 'commerce', 'magasin' => 'commerce',
    ];
}

/** Minuscules, sans accents, espaces réduits — pour comparer des saisies libres. */
function nj_lot_norm(?string $value): string
{
    $v = trim((string) $value);
    if ($v === '') return '';
    $accents = [
        'à'=>'a','á'=>'a','â'=>'a','ä'=>'a','ã'=>'a','å'=>'a','ç'=>'c','è'=>'e','é'=>'e',
        'ê'=>'e','ë'=>'e','ì'=>'i','í'=>'i','î'=>'i','ï'=>'i','ñ'=>'n','ò'=>'o','ó'=>'o',
        'ô'=>'o','ö'=>'o','õ'=>'o','ù'=>'u','ú'=>'u','û'=>'u','ü'=>'u','ý'=>'y','ÿ'=>'y',
    ];
    $v = strtr(mb_strtolower($v, 'UTF-8'), $accents);
    return (string) preg_replace('/\s+/u', ' ', $v);
}

/**
 * Ordre numérique d'un niveau, pour trier et filtrer « à partir du 2e étage ».
 * RDC vaut 0, un sous-sol vaut -1.
 */
function nj_lot_niveau_ordre(?string $niveau): int
{
    $n = nj_lot_norm($niveau);
    if ($n === 'rdc' || $n === '0' || $n === 'rez-de-chaussee') return 0;
    if (str_starts_with($n, 'ss') || str_starts_with($n, 'sous-sol')) return -1;
    return (int) $n;
}

/** Nombre saisi à la française : « 1 234,50 » → 1234.50. */
function nj_lot_nombre(?string $value, float $defaut = 0.0): float
{
    $v = str_replace([' ', ' ', ','], ['', '', '.'], trim((string) $value));
    return is_numeric($v) ? (float) $v : $defaut;
}

/** Colonnes que le CSV doit obligatoirement porter. */
const NJ_LOT_COLONNES_REQUISES = [
    'projet', 'numero_lot', 'typologie', 'surface_habitable', 'prix_dh', 'statut', 'orientation',
];

/**
 * Lit et valide un CSV de lots sans rien écrire en base.
 *
 * Retourne ['lignes' => [...], 'erreurs' => [...], 'alertes' => [...]].
 * Une erreur écarte la ligne ; une alerte la laisse passer en la signalant
 * (prix au m² aberrant, par exemple), car seul le chef de vente peut trancher.
 */
function nj_lots_lire_csv(string $chemin): array
{
    $lignes = $erreurs = $alertes = [];
    $vus = [];

    $fh = @fopen($chemin, 'r');
    if (!$fh) {
        return ['lignes' => [], 'erreurs' => ['Fichier illisible.'], 'alertes' => []];
    }

    // Détecte le séparateur sur la première ligne : Excel FR écrit des ';',
    // Excel EN et la plupart des exports écrivent des ','.
    $premiere = (string) fgets($fh);
    $premiere = preg_replace('/^\xEF\xBB\xBF/', '', $premiere);   // BOM UTF-8
    $sep = substr_count($premiere, ';') >= substr_count($premiere, ',') ? ';' : ',';
    $entete = array_map(
        static fn($c) => nj_lot_norm(str_replace(' ', '_', (string) $c)),
        str_getcsv(rtrim($premiere, "\r\n"), $sep, '"', '\\')
    );

    $manquantes = array_diff(NJ_LOT_COLONNES_REQUISES, $entete);
    if ($manquantes) {
        fclose($fh);
        return [
            'lignes'  => [],
            'erreurs' => ['Colonnes obligatoires absentes : ' . implode(', ', $manquantes)],
            'alertes' => [],
        ];
    }

    $enums = nj_lot_enums();
    $alias = nj_lot_alias();
    $numero_ligne = 1;

    while (($cells = fgetcsv($fh, 0, $sep, '"', '\\')) !== false) {
        $numero_ligne++;
        if ($cells === [null] || (count($cells) === 1 && trim((string) $cells[0]) === '')) {
            continue;   // ligne vide
        }

        $row = [];
        foreach ($entete as $i => $col) {
            $row[$col] = isset($cells[$i]) ? trim((string) $cells[$i]) : '';
        }

        /** Résout une valeur d'ENUM, ou null si elle est vide/inconnue. */
        $enum = function (string $col) use ($row, $enums, $alias, &$erreurs, $numero_ligne): ?string {
            $v = nj_lot_norm($row[$col] ?? '');
            $v = $alias[$v] ?? $v;
            if ($v === '') return null;
            if (!in_array($v, $enums[$col], true)) {
                $erreurs[] = "Ligne $numero_ligne : $col = « {$row[$col]} » n'est pas une valeur connue.";
                return null;
            }
            return $v;
        };

        $projet = nj_lot_norm($row['projet'] ?? '');
        $numero = trim((string) ($row['numero_lot'] ?? ''));
        if ($projet === '' || $numero === '') {
            $erreurs[] = "Ligne $numero_ligne : projet ou numero_lot vide.";
            continue;
        }
        $cle = $projet . '|' . mb_strtolower($numero);
        if (isset($vus[$cle])) {
            $erreurs[] = "Ligne $numero_ligne : numero_lot « $numero » déjà présent ligne {$vus[$cle]}.";
            continue;
        }

        $typologie = $enum('typologie');
        if ($typologie === null) continue;   // erreur déjà enregistrée

        $surface = nj_lot_nombre($row['surface_habitable'] ?? '');
        if ($surface <= 0) {
            $erreurs[] = "Ligne $numero_ligne : surface_habitable invalide.";
            continue;
        }
        $prix = nj_lot_nombre($row['prix_dh'] ?? '');
        if ($prix <= 0) {
            $erreurs[] = "Ligne $numero_ligne : prix_dh invalide.";
            continue;
        }

        // Garde-fou : une virgule oubliée ou un zéro en trop se voit ici.
        $prix_m2 = $prix / $surface;
        if ($prix_m2 < 3000 || $prix_m2 > 40000) {
            $alertes[] = sprintf(
                'Ligne %d (%s) : prix au m² inhabituel, %s DH/m². À vérifier.',
                $numero_ligne, $numero, number_format($prix_m2, 0, ',', ' ')
            );
        }

        $statut = $enum('statut') ?? 'disponible';
        $fin_option = trim((string) ($row['date_fin_option'] ?? ''));
        if ($statut !== 'optionne' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fin_option)) {
            // Une échéance n'a de sens que sur une option ; sinon on l'ignore.
            $fin_option = null;
        }

        $vus[$cle] = $numero_ligne;
        $lignes[] = [
            'projet'            => $projet,
            'immeuble'          => mb_substr(trim((string) ($row['immeuble'] ?? '')), 0, 32),
            'niveau'            => mb_substr(trim((string) ($row['niveau'] ?? '')), 0, 8),
            'niveau_ordre'      => nj_lot_niveau_ordre($row['niveau'] ?? ''),
            'numero_lot'        => mb_substr($numero, 0, 32),
            'typologie'         => $typologie,
            'surface_habitable' => round($surface, 2),
            'surface_balcon'    => round(nj_lot_nombre($row['surface_balcon'] ?? ''), 2),
            'nb_chambres'       => (int) nj_lot_nombre($row['nb_chambres'] ?? ''),
            'nb_sdb'            => (int) nj_lot_nombre($row['nb_sdb'] ?? ''),
            'orientation'       => $enum('orientation') ?? 'rue',
            'exposition'        => $enum('exposition'),
            'ascenseur'         => in_array(nj_lot_norm($row['ascenseur'] ?? 'oui'), ['non', '0', 'no'], true) ? 0 : 1,
            'parking'           => $enum('parking') ?? 'aucun',
            'prix_dh'           => round($prix, 2),
            'statut'            => $statut,
            'date_fin_option'   => $fin_option,
            'plan_fichier'      => mb_substr(trim((string) ($row['plan_fichier'] ?? '')), 0, 255),
            // Documents propres au lot. Vides = on retombe sur ceux du projet.
            'plan_architecte'   => mb_substr(trim((string) ($row['plan_architecte'] ?? '')), 0, 255),
            'plan_visuel'       => mb_substr(trim((string) ($row['plan_visuel'] ?? '')), 0, 255),
            'visite_360'        => mb_substr(trim((string) ($row['visite_360'] ?? '')), 0, 255),
            'notes'             => mb_substr(trim((string) ($row['notes'] ?? '')), 0, 500),
            'ligne_csv'         => $numero_ligne,
        ];
    }
    fclose($fh);

    return ['lignes' => $lignes, 'erreurs' => $erreurs, 'alertes' => $alertes];
}

/**
 * Compare les lignes validées à la base : ce qui sera créé, modifié, inchangé.
 * Sert à l'écran d'aperçu — on ne fait jamais confirmer un import à l'aveugle.
 */
function nj_lots_apercu(array $lignes, string $projet): array
{
    $pdo = nj_db();
    $existants = [];
    $st = $pdo->prepare('SELECT numero_lot, statut, prix_dh, surface_habitable FROM lots WHERE projet = ?');
    $st->execute([$projet]);
    foreach ($st->fetchAll() as $r) {
        $existants[mb_strtolower($r['numero_lot'])] = $r;
    }

    $creations = $modifications = $inchanges = [];
    foreach ($lignes as $l) {
        $cle = mb_strtolower($l['numero_lot']);
        if (!isset($existants[$cle])) {
            $creations[] = $l;
            continue;
        }
        $avant = $existants[$cle];
        $diff = [];
        if ($avant['statut'] !== $l['statut']) {
            $diff['statut'] = [$avant['statut'], $l['statut']];
        }
        if (abs((float) $avant['prix_dh'] - $l['prix_dh']) >= 0.01) {
            $diff['prix_dh'] = [(float) $avant['prix_dh'], $l['prix_dh']];
        }
        if (abs((float) $avant['surface_habitable'] - $l['surface_habitable']) >= 0.01) {
            $diff['surface_habitable'] = [(float) $avant['surface_habitable'], $l['surface_habitable']];
        }
        if ($diff) {
            $modifications[] = $l + ['diff' => $diff];
        } else {
            $inchanges[] = $l;
        }
    }

    // Lots présents en base mais absents du fichier : souvent un oubli, parfois
    // une suppression voulue. On le signale, on ne décide pas à sa place.
    $dans_fichier = array_flip(array_map(
        static fn($l) => mb_strtolower($l['numero_lot']),
        $lignes
    ));
    $orphelins = array_values(array_diff_key($existants, $dans_fichier));

    return [
        'creations'     => $creations,
        'modifications' => $modifications,
        'inchanges'     => $inchanges,
        'orphelins'     => $orphelins,
    ];
}

/**
 * Écrit les lignes en base (upsert sur projet + numero_lot), historise les
 * changements de statut et journalise l'import. Tout ou rien : une erreur en
 * cours de route annule l'ensemble, pour ne jamais laisser une grille à moitié
 * importée un jour de salon.
 */
function nj_lots_importer(array $lignes, string $projet, string $fichier, string $auteur): array
{
    $pdo = nj_db();
    $stats = ['lues' => count($lignes), 'creees' => 0, 'majs' => 0, 'rejetees' => 0];

    $anciens = [];
    $st = $pdo->prepare('SELECT id, numero_lot, statut FROM lots WHERE projet = ?');
    $st->execute([$projet]);
    foreach ($st->fetchAll() as $r) {
        $anciens[mb_strtolower($r['numero_lot'])] = $r;
    }

    $sql = 'INSERT INTO lots
              (projet, immeuble, niveau, niveau_ordre, numero_lot, typologie,
               surface_habitable, surface_balcon, nb_chambres, nb_sdb,
               orientation, exposition, ascenseur, parking, prix_dh, statut,
               date_fin_option, plan_fichier, plan_architecte, plan_visuel,
               visite_360, notes, created_at)
            VALUES
              (:projet, :immeuble, :niveau, :niveau_ordre, :numero_lot, :typologie,
               :surface_habitable, :surface_balcon, :nb_chambres, :nb_sdb,
               :orientation, :exposition, :ascenseur, :parking, :prix_dh, :statut,
               :date_fin_option, :plan_fichier, :plan_architecte, :plan_visuel,
               :visite_360, :notes, NOW())
            ON DUPLICATE KEY UPDATE
              immeuble = VALUES(immeuble), niveau = VALUES(niveau),
              niveau_ordre = VALUES(niveau_ordre), typologie = VALUES(typologie),
              surface_habitable = VALUES(surface_habitable),
              surface_balcon = VALUES(surface_balcon),
              nb_chambres = VALUES(nb_chambres), nb_sdb = VALUES(nb_sdb),
              orientation = VALUES(orientation), exposition = VALUES(exposition),
              ascenseur = VALUES(ascenseur), parking = VALUES(parking),
              prix_dh = VALUES(prix_dh), statut = VALUES(statut),
              date_fin_option = VALUES(date_fin_option),
              plan_fichier = VALUES(plan_fichier),
              plan_architecte = VALUES(plan_architecte),
              plan_visuel = VALUES(plan_visuel),
              visite_360 = VALUES(visite_360),
              notes = VALUES(notes)';

    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare($sql);
        $hist = $pdo->prepare(
            'INSERT INTO lot_status_history
               (lot_id, ancien_statut, nouveau_statut, auteur, commentaire, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        );

        foreach ($lignes as $l) {
            $params = $l;
            unset($params['ligne_csv']);
            $ins->execute($params);

            $cle = mb_strtolower($l['numero_lot']);
            if (isset($anciens[$cle])) {
                $stats['majs']++;
                if ($anciens[$cle]['statut'] !== $l['statut']) {
                    $hist->execute([
                        (int) $anciens[$cle]['id'], $anciens[$cle]['statut'],
                        $l['statut'], $auteur, 'import ' . basename($fichier),
                    ]);
                }
            } else {
                $stats['creees']++;
            }
        }

        $pdo->prepare(
            'INSERT INTO lot_imports
               (projet, fichier, auteur, lignes_lues, lignes_creees, lignes_majs,
                lignes_rejetees, rapport, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute([
            $projet, basename($fichier), $auteur,
            $stats['lues'], $stats['creees'], $stats['majs'], $stats['rejetees'],
            json_encode(['ok' => true], JSON_UNESCAPED_UNICODE),
        ]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return $stats;
}

/** Liste filtrée des lots d'un projet, pour le back-office. */
function nj_lots_liste(string $projet, array $filtres = []): array
{
    $where  = ['projet = :projet'];
    $params = ['projet' => $projet];

    foreach (['immeuble', 'typologie', 'statut', 'orientation'] as $col) {
        if (!empty($filtres[$col])) {
            $where[] = "$col = :$col";
            $params[$col] = $filtres[$col];
        }
    }
    if (!empty($filtres['prix_max'])) {
        $where[] = 'prix_dh <= :prix_max';
        $params['prix_max'] = (float) $filtres['prix_max'];
    }
    if (isset($filtres['niveau_min']) && $filtres['niveau_min'] !== '') {
        $where[] = 'niveau_ordre >= :niveau_min';
        $params['niveau_min'] = (int) $filtres['niveau_min'];
    }

    $st = nj_db()->prepare(
        'SELECT * FROM lots WHERE ' . implode(' AND ', $where)
        . ' ORDER BY immeuble, niveau_ordre, numero_lot'
    );
    $st->execute($params);
    return $st->fetchAll();
}

/** Compte des lots par statut, pour le bandeau de synthèse. */
function nj_lots_synthese(string $projet): array
{
    $st = nj_db()->prepare(
        'SELECT statut, COUNT(*) AS n, SUM(prix_dh) AS ca
         FROM lots WHERE projet = ? GROUP BY statut'
    );
    $st->execute([$projet]);
    $out = [];
    foreach ($st->fetchAll() as $r) {
        $out[$r['statut']] = ['n' => (int) $r['n'], 'ca' => (float) $r['ca']];
    }
    return $out;
}

/** Change le statut d'un lot et l'historise. */
function nj_lot_set_statut(int $lotId, string $statut, string $auteur): bool
{
    if (!in_array($statut, nj_lot_enums()['statut'], true)) return false;

    $pdo = nj_db();
    $st = $pdo->prepare('SELECT statut FROM lots WHERE id = ?');
    $st->execute([$lotId]);
    $ancien = $st->fetchColumn();
    if ($ancien === false) return false;
    if ($ancien === $statut) return true;

    $pdo->prepare('UPDATE lots SET statut = ?, date_fin_option = IF(? = \'optionne\', date_fin_option, NULL) WHERE id = ?')
        ->execute([$statut, $statut, $lotId]);
    $pdo->prepare(
        'INSERT INTO lot_status_history
           (lot_id, ancien_statut, nouveau_statut, auteur, commentaire, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())'
    )->execute([$lotId, (string) $ancien, $statut, $auteur, 'modification manuelle']);

    return true;
}

/** Libellés d'affichage des statuts. */
function nj_lot_statut_libelle(string $statut): string
{
    return [
        'disponible' => 'Disponible', 'optionne' => 'Optionné', 'reserve' => 'Réservé',
        'vendu' => 'Vendu', 'bloque' => 'Bloqué',
    ][$statut] ?? $statut;
}

/**
 * Pourquoi la grille est-elle inaccessible ?
 *
 * Trois causes donnent le même écran vide, et il faut les distinguer sous
 * peine d'envoyer l'exploitant sur une fausse piste :
 *   'ok'         tout va bien ;
 *   'sans-base'  PHP n'atteint pas MySQL (identifiants api/.env) ;
 *   'sans-table' la base répond mais le schéma n'a pas été migré.
 */
function nj_lots_etat_schema(): string
{
    static $etat = null;
    if ($etat !== null) return $etat;
    try {
        $pdo = nj_db();
    } catch (Throwable $e) {
        return $etat = 'sans-base';
    }
    try {
        $st = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
        );
        $st->execute(['lots']);
        return $etat = ((int) $st->fetchColumn() > 0) ? 'ok' : 'sans-table';
    } catch (Throwable $e) {
        return $etat = 'sans-base';
    }
}

/** Raccourci : la grille est-elle exploitable ? */
function nj_lots_schema_present(): bool
{
    return nj_lots_etat_schema() === 'ok';
}
