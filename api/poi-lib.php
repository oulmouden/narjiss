<?php
/**
 * api/poi-lib.php — lecture, contrôle et écriture des CSV de POI.
 *
 * Les points d'intérêt ne vivent pas en base : ce sont des fichiers CSV posés
 * dans le dossier du projet et lus directement par localisation.js, un par jeu
 * et par langue :
 *
 *   <folder>/<slug>_<lang>.csv          POI du quartier   (onglet « Quartier »)
 *   <folder>/<slug>_major_<lang>.csv    grands repères    (onglet « Repères »)
 *
 * Le lecteur du site est volontairement permissif — une ligne dont les
 * coordonnées sont illisibles est ignorée sans un mot. C'est confortable en
 * production, mais redoutable à la saisie : on croit avoir importé 80 POI et
 * la carte en affiche 61, sans rien dire. D'où cette bibliothèque, dont le
 * seul rôle est de dire à l'avance ce que le site retiendra, et surtout ce
 * qu'il jettera.
 */

declare(strict_types=1);

const NJ_POI_LANGUES = ['fr', 'en', 'ar', 'es'];

/** Jeux de points : le quartier au quotidien, les repères à l'échelle de la ville. */
const NJ_POI_JEUX = [
    'quartier' => 'POI du quartier',
    'reperes'  => 'Grands repères',
];

/** En-tête canonique réécrit à l'enregistrement, quel que soit celui reçu. */
const NJ_POI_ENTETE = ['Catégorie', 'Emoji', 'Nom', 'Adresse', 'Note',
                       'Latitude', 'Longitude', 'Nb Avis', 'Téléphone', 'Horaires / Notes'];

/**
 * Catégories reconnues par localisation.js (couleur + pictogramme + libellé
 * traduit). Une catégorie absente d'ici s'affiche quand même, mais avec le
 * marqueur générique et son nom brut en guise de libellé : c'est une alerte,
 * pas une erreur.
 */
const NJ_POI_CATEGORIES = [
    'home', 'pharmacie', 'pharmacy', 'sante', 'health', 'cafe', 'restaurant',
    'magasin', 'shop', 'banque', 'bank', 'admin', 'administration', 'ecole',
    'school', 'education', 'mosquee', 'mosque', 'transport', 'hotel', 'hammam',
    'parc', 'park', 'sport', 'marche', 'market', 'loisir', 'aeroport', 'plage',
    'medina', 'hopital', 'monument', 'marina', 'musee', 'stade',
];

/** Emprise approximative du Maroc : au-delà, c'est une inversion lat/lng ou une faute de frappe. */
const NJ_POI_BORNES = ['lat' => [27.0, 36.0], 'lng' => [-14.0, -1.0]];

/**
 * Dossier et préfixe des fichiers d'un projet.
 *
 * Même règle que projectDataBase() dans localisation.js : quand le projet a
 * une page dédiée (« jawhara/jawhara.html »), ce sont son dossier et le nom de
 * cette page qui nomment les CSV — pas l'id du projet. Se tromper ici écrirait
 * un fichier que le site ne lirait jamais.
 */
function nj_poi_base(string $id, array $projet): array
{
    $detail = (string) ($projet['detail_url'] ?? '');
    if ($detail !== '') {
        $propre = explode('?', explode('#', $detail)[0])[0];
        $parts  = explode('/', $propre);
        if (count($parts) >= 2) {
            return ['folder' => $parts[0], 'slug' => preg_replace('/\.html$/i', '', $parts[1])];
        }
    }
    return ['folder' => (string) ($projet['folder'] ?? $id), 'slug' => $id];
}

/** Chemin absolu du CSV d'un projet, pour un jeu et une langue. */
function nj_poi_chemin(string $id, array $projet, string $jeu, string $lang): string
{
    $base   = nj_poi_base($id, $projet);
    $suffix = ($jeu === 'reperes' ? '_major_' : '_') . $lang;
    return dirname(__DIR__) . '/' . $base['folder'] . '/' . $base['slug'] . $suffix . '.csv';
}

/** Chemin relatif à la racine du site, pour l'affichage. */
function nj_poi_chemin_relatif(string $id, array $projet, string $jeu, string $lang): string
{
    $base   = nj_poi_base($id, $projet);
    $suffix = ($jeu === 'reperes' ? '_major_' : '_') . $lang;
    return $base['folder'] . '/' . $base['slug'] . $suffix . '.csv';
}

/** Découpe une ligne CSV séparée par des point-virgules, guillemets compris. */
function nj_poi_decouper(string $ligne): array
{
    $cells = [];
    $cur = '';
    $quote = false;
    $n = strlen($ligne);
    for ($i = 0; $i < $n; $i++) {
        $ch = $ligne[$i];
        if ($ch === '"' && ($ligne[$i + 1] ?? '') === '"') { $cur .= '"'; $i++; }
        elseif ($ch === '"') { $quote = !$quote; }
        elseif ($ch === ';' && !$quote) { $cells[] = $cur; $cur = ''; }
        else { $cur .= $ch; }
    }
    $cells[] = $cur;
    return $cells;
}

/**
 * Lit un CSV de POI et dit ce que le site en ferait.
 *
 * Retourne ['lignes' => [...], 'erreurs' => [...], 'alertes' => [...]].
 * Une erreur empêche l'import ; une alerte le laisse passer en le signalant,
 * car seule une personne connaissant le quartier peut trancher.
 */
function nj_poi_lire_csv(string $chemin): array
{
    $erreurs = [];
    $alertes = [];

    $brut = @file_get_contents($chemin);
    if ($brut === false || trim($brut) === '') {
        return ['lignes' => [], 'erreurs' => ['Fichier vide ou illisible.'], 'alertes' => []];
    }

    // BOM d'Excel, puis encodage. Un export « CSV Windows » arrive en
    // Windows-1252 : les accents y passent, l'arabe non — d'où le refus net
    // plutôt qu'un fichier de POI arabes en caractères illisibles.
    $brut = preg_replace('/^\xEF\xBB\xBF/', '', $brut);
    if (!mb_check_encoding($brut, 'UTF-8')) {
        $converti = @mb_convert_encoding($brut, 'UTF-8', 'Windows-1252');
        if ($converti === false || !mb_check_encoding($converti, 'UTF-8')) {
            return ['lignes' => [], 'erreurs' => ['Encodage non reconnu. Enregistrez le fichier en UTF-8 (dans Excel : « CSV UTF-8 »).'], 'alertes' => []];
        }
        $brut = $converti;
        $alertes[] = 'Fichier converti depuis Windows-1252. Vérifiez les accents dans l\'aperçu ; pour l\'arabe, réexportez en UTF-8.';
    }

    $lignes = array_values(array_filter(
        explode("\n", str_replace("\r", '', $brut)),
        static fn($l) => trim($l) !== ''
    ));
    if (count($lignes) < 2) {
        return ['lignes' => [], 'erreurs' => ['Le fichier ne contient qu\'une ligne : en-tête sans données ?'], 'alertes' => []];
    }

    // Le lecteur du site ne connaît QUE le point-virgule. Un fichier à virgules
    // se lirait comme une seule colonne, sans coordonnées, donc zéro POI
    // affiché : autant le dire tout de suite.
    if (substr_count($lignes[0], ';') === 0) {
        return [
            'lignes'  => [],
            'erreurs' => ['Séparateur non reconnu : le site attend des point-virgules. Réexportez en « CSV (séparateur : point-virgule) ».'],
            'alertes' => [],
        ];
    }

    // Repérage des colonnes par préfixe, exactement comme localisation.js :
    // les fichiers existants viennent d'exports variés, l'en-tête n'est pas
    // toujours au mot près.
    $idx = [];
    foreach (nj_poi_decouper($lignes[0]) as $i => $titre) {
        $k = mb_strtolower(trim($titre));
        if (str_starts_with($k, 'cat')) $idx['cat'] = $i;
        if (str_starts_with($k, 'emoji')) $idx['emoji'] = $i;
        if (str_starts_with($k, 'nom') || str_starts_with($k, 'name')) $idx['nom'] = $i;
        if (str_starts_with($k, 'adresse') || str_starts_with($k, 'address')) $idx['adresse'] = $i;
        if (str_starts_with($k, 'note') || str_starts_with($k, 'rating')) $idx['note'] = $i;
        if (str_starts_with($k, 'latitude') || $k === 'lat') $idx['lat'] = $i;
        if (str_starts_with($k, 'longitude') || $k === 'lng') $idx['lng'] = $i;
        if (str_contains($k, 'avis') || str_contains($k, 'reviews')) $idx['avis'] = $i;
        if (str_starts_with($k, 'telephone') || str_starts_with($k, 'téléphone') || str_starts_with($k, 'phone')) $idx['tel'] = $i;
        if (str_starts_with($k, 'horaires') || str_contains($k, 'notes') || str_starts_with($k, 'hours')) $idx['horaires'] = $i;
    }
    $manquantes = array_diff(['cat', 'nom', 'lat', 'lng'], array_keys($idx));
    if ($manquantes) {
        return [
            'lignes'  => [],
            'erreurs' => ['Colonnes indispensables absentes : ' . implode(', ', $manquantes)
                          . '. En-tête attendu : ' . implode(';', NJ_POI_ENTETE)],
            'alertes' => [],
        ];
    }

    $val = static fn(array $c, string $k) => isset($idx[$k]) ? trim($c[$idx[$k]] ?? '') : '';

    $retenues = [];
    $rejets   = [];
    $horsZone = [];
    $inconnues = [];
    $doublons = [];
    $vues     = [];
    $nbHome   = 0;

    for ($j = 1; $j < count($lignes); $j++) {
        $c   = nj_poi_decouper($lignes[$j]);
        $num = $j + 1;                       // numéro affiché à l'utilisateur

        $lat = (float) str_replace(',', '.', $val($c, 'lat'));
        $lng = (float) str_replace(',', '.', $val($c, 'lng'));
        $latBrut = $val($c, 'lat');
        $lngBrut = $val($c, 'lng');

        // C'est LE contrôle qui justifie cet écran : le site ignore ces lignes
        // en silence, ici on les compte et on les montre.
        if ($latBrut === '' || $lngBrut === '' || !is_finite($lat) || !is_finite($lng)
            || ($lat === 0.0 && $latBrut !== '0') || ($lng === 0.0 && $lngBrut !== '0')) {
            $rejets[] = ['ligne' => $num, 'nom' => $val($c, 'nom')];
            continue;
        }

        $nom = $val($c, 'nom');
        if ($nom === '') {
            $rejets[] = ['ligne' => $num, 'nom' => '(sans nom)'];
            continue;
        }

        $cat = mb_strtolower($val($c, 'cat'));
        if ($cat === '') $cat = 'loisir';
        if (!in_array($cat, NJ_POI_CATEGORIES, true)) $inconnues[$cat] = true;
        if ($cat === 'home') $nbHome++;

        if ($lat < NJ_POI_BORNES['lat'][0] || $lat > NJ_POI_BORNES['lat'][1]
            || $lng < NJ_POI_BORNES['lng'][0] || $lng > NJ_POI_BORNES['lng'][1]) {
            $horsZone[] = ['ligne' => $num, 'nom' => $nom];
        }

        $cle = $cat . '|' . mb_strtolower($nom) . '|' . round($lat, 5) . '|' . round($lng, 5);
        if (isset($vues[$cle])) { $doublons[] = $nom; } else { $vues[$cle] = true; }

        $retenues[] = [
            'cat'      => $cat,
            'emoji'    => $val($c, 'emoji') !== '' ? $val($c, 'emoji') : '📍',
            'nom'      => $nom,
            'adresse'  => $val($c, 'adresse'),
            'note'     => $val($c, 'note'),
            'lat'      => $lat,
            'lng'      => $lng,
            'avis'     => $val($c, 'avis'),
            'tel'      => $val($c, 'tel'),
            'horaires' => $val($c, 'horaires'),
        ];
    }

    if (!$retenues) {
        $erreurs[] = 'Aucune ligne exploitable : toutes ont été écartées faute de nom ou de coordonnées.';
    }
    if ($rejets) {
        $apercu = array_slice(array_map(static fn($r) => 'ligne ' . $r['ligne'] . ' (' . $r['nom'] . ')', $rejets), 0, 12);
        $alertes[] = count($rejets) . ' ligne(s) seront ignorées par le site, faute de coordonnées lisibles ou de nom : '
                     . implode(', ', $apercu) . (count($rejets) > 12 ? '…' : '');
    }
    if ($horsZone) {
        $alertes[] = count($horsZone) . ' point(s) hors du Maroc — latitude et longitude inversées ? '
                     . implode(', ', array_slice(array_column($horsZone, 'nom'), 0, 8));
    }
    if ($inconnues) {
        $alertes[] = 'Catégories inconnues, affichées avec le marqueur générique : '
                     . implode(', ', array_slice(array_keys($inconnues), 0, 10))
                     . '. Catégories reconnues : ' . implode(', ', NJ_POI_CATEGORIES);
    }
    if ($doublons) {
        $alertes[] = count($doublons) . ' doublon(s) exact(s) (même nom, même position) : '
                     . implode(', ', array_slice(array_unique($doublons), 0, 8));
    }
    if ($nbHome === 0) {
        $alertes[] = 'Aucune ligne de catégorie « home ». La première ligne d\'un fichier de quartier est '
                   . 'habituellement le projet lui-même ; sans elle, le compteur affiché sera décalé d\'une unité.';
    } elseif ($nbHome > 1) {
        $alertes[] = $nbHome . ' lignes « home » : le projet apparaîtra plusieurs fois sur la carte.';
    }

    return ['lignes' => $retenues, 'erreurs' => $erreurs, 'alertes' => $alertes];
}

/** Répartition par catégorie, triée du plus fourni au moins fourni. */
function nj_poi_par_categorie(array $lignes): array
{
    $par = [];
    foreach ($lignes as $l) {
        $par[$l['cat']] = ($par[$l['cat']] ?? 0) + 1;
    }
    arsort($par);
    return $par;
}

/**
 * Compare le fichier reçu à celui déjà en place.
 *
 * L'import REMPLACE le fichier : la seule question utile avant de confirmer est
 * « qu'est-ce que je perds ? ». D'où cette comparaison des totaux et des
 * catégories plutôt qu'un diff ligne à ligne, illisible sur 80 points.
 */
function nj_poi_apercu(array $lignes, string $cheminExistant): array
{
    $avant = null;
    if (is_file($cheminExistant)) {
        $lu = nj_poi_lire_csv($cheminExistant);
        $avant = [
            'total'      => count($lu['lignes']),
            'categories' => nj_poi_par_categorie($lu['lignes']),
        ];
    }
    return [
        'avant' => $avant,
        'apres' => ['total' => count($lignes), 'categories' => nj_poi_par_categorie($lignes)],
    ];
}

/** Échappe une cellule : guillemets doublés dès qu'un séparateur traîne. */
function nj_poi_cellule(string $v): string
{
    if (strpbrk($v, ";\"\n") === false) return $v;
    return '"' . str_replace('"', '""', $v) . '"';
}

/**
 * Écrit le CSV, après sauvegarde de l'ancien.
 *
 * Le fichier est réécrit depuis les lignes analysées, avec l'en-tête canonique :
 * ce qui est enregistré est donc exactement ce que l'aperçu a montré, et non le
 * fichier reçu — dont l'en-tête ou le séparateur pouvaient être approximatifs.
 */
function nj_poi_ecrire(array $lignes, string $chemin, string $dossierSauvegarde): void
{
    if (is_file($chemin)) {
        if (!is_dir($dossierSauvegarde)) mkdir($dossierSauvegarde, 0775, true);
        copy($chemin, $dossierSauvegarde . '/' . basename($chemin, '.csv') . '-' . date('Ymd-His') . '.csv');
    }
    $dossier = dirname($chemin);
    if (!is_dir($dossier)) mkdir($dossier, 0775, true);

    $out = implode(';', NJ_POI_ENTETE) . "\n";
    foreach ($lignes as $l) {
        $out .= implode(';', array_map('nj_poi_cellule', [
            $l['cat'], $l['emoji'], $l['nom'], $l['adresse'], $l['note'],
            // Point décimal imposé : une virgule casserait le séparateur.
            rtrim(rtrim(number_format($l['lat'], 6, '.', ''), '0'), '.'),
            rtrim(rtrim(number_format($l['lng'], 6, '.', ''), '0'), '.'),
            $l['avis'], $l['tel'], $l['horaires'],
        ])) . "\n";
    }
    if (file_put_contents($chemin, $out, LOCK_EX) === false) {
        throw new RuntimeException('Écriture impossible dans ' . $dossier . ' (droits du dossier ?).');
    }
}
