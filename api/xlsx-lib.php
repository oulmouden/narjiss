<?php

declare(strict_types=1);

/**
 * api/xlsx-lib.php — lecture d'une feuille de classeur Excel, sans dépendance.
 *
 * Un .xlsx est une archive ZIP de fichiers XML. ZipArchive + SimpleXML
 * suffisent donc à en extraire une feuille : ni Composer, ni PhpSpreadsheet
 * à déployer. Les deux extensions sont vérifiées avant usage, la page
 * d'import retombant sur le CSV si elles manquent.
 *
 * Portée volontairement étroite : on lit une feuille en tableau de chaînes,
 * pour la donner à l'analyseur de grille existant (nj_lots_lire_csv). Rien
 * d'autre — pas d'écriture, pas de style, pas de graphique.
 */

/** Les deux extensions nécessaires sont-elles disponibles ? */
function nj_xlsx_supporte(): bool
{
    return class_exists('ZipArchive') && extension_loaded('simplexml');
}

/** Convertit « A », « Z », « AA »… en index de colonne 0-base. */
function nj_xlsx_col_index(string $ref): int
{
    $lettres = (string) preg_replace('/\d+/', '', $ref);
    $n = 0;
    $len = strlen($lettres);
    for ($i = 0; $i < $len; $i++) {
        $n = $n * 26 + (ord($lettres[$i]) - 64);
    }
    return max(0, $n - 1);
}

/**
 * Formats de nombre correspondant à une date.
 *
 * Les identifiants intégrés d'Excel sont figés (14 à 22 pour les dates et
 * heures, 45 à 47 pour les durées). Les formats personnalisés sont reconnus
 * à leur motif : un « y », « m » ou « d » hors littéral entre guillemets.
 */
function nj_xlsx_formats_dates(SimpleXMLElement $styles): array
{
    $dates = [];
    foreach ([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47] as $id) {
        $dates[$id] = true;
    }
    if (isset($styles->numFmts->numFmt)) {
        foreach ($styles->numFmts->numFmt as $fmt) {
            $code = (string) $fmt['formatCode'];
            $nu = (string) preg_replace('/"[^"]*"|\[[^\]]*\]/', '', $code);
            if (preg_match('/[ymd]/i', $nu)) {
                $dates[(int) $fmt['numFmtId']] = true;
            }
        }
    }

    // cellXfs : chaque style de cellule pointe vers un numFmtId.
    $parStyle = [];
    if (isset($styles->cellXfs->xf)) {
        $i = 0;
        foreach ($styles->cellXfs->xf as $xf) {
            $parStyle[$i++] = isset($dates[(int) $xf['numFmtId']]);
        }
    }
    return $parStyle;
}

/** Numéro de série Excel → date ISO. 1900-02-29 n'existe pas : d'où le -2. */
function nj_xlsx_date(float $serial): string
{
    if ($serial < 1) return '';
    $ts = (int) round(($serial - 25569) * 86400);
    return gmdate('Y-m-d', $ts);
}

/**
 * Lit une feuille d'un classeur et la rend en tableau de lignes de chaînes.
 *
 * @param  string $chemin  Fichier .xlsx
 * @param  string $feuille Nom de l'onglet recherché (insensible à la casse)
 * @return array{lignes: array<int, array<int, string>>, erreur: ?string}
 */
function nj_xlsx_lire_feuille(string $chemin, string $feuille): array
{
    $vide = ['lignes' => [], 'erreur' => null];
    if (!nj_xlsx_supporte()) {
        return $vide + ['erreur' => 'Lecture Excel indisponible sur ce serveur (extension zip ou simplexml absente).'];
    }

    $zip = new ZipArchive();
    if ($zip->open($chemin) !== true) {
        return ['lignes' => [], 'erreur' => 'Fichier Excel illisible ou corrompu.'];
    }

    /** Charge une entrée XML de l'archive, ou null si absente. */
    $xml = static function (string $nom) use ($zip): ?SimpleXMLElement {
        $raw = $zip->getFromName($nom);
        if ($raw === false || $raw === '') return null;
        $prev = libxml_use_internal_errors(true);
        $el = simplexml_load_string($raw);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);
        return $el ?: null;
    };

    $workbook = $xml('xl/workbook.xml');
    $rels     = $xml('xl/_rels/workbook.xml.rels');
    if (!$workbook || !$rels) {
        $zip->close();
        return ['lignes' => [], 'erreur' => 'Classeur Excel illisible (workbook manquant).'];
    }

    // rId → chemin de la feuille dans l'archive.
    $cibles = [];
    foreach ($rels->Relationship as $r) {
        $cibles[(string) $r['Id']] = ltrim((string) $r['Target'], '/');
    }

    $fichierFeuille = null;
    $noms = [];
    foreach ($workbook->sheets->sheet as $s) {
        $nom = (string) $s['name'];
        $noms[] = $nom;
        $rid = (string) $s->attributes('r', true)->id;
        if (mb_strtolower($nom) === mb_strtolower($feuille) && isset($cibles[$rid])) {
            $fichierFeuille = $cibles[$rid];
        }
    }
    if ($fichierFeuille === null) {
        $zip->close();
        return ['lignes' => [], 'erreur' => sprintf(
            'Onglet « %s » introuvable dans le classeur. Onglets présents : %s.',
            $feuille, implode(', ', $noms)
        )];
    }
    if (strpos($fichierFeuille, 'xl/') !== 0) {
        $fichierFeuille = 'xl/' . $fichierFeuille;
    }

    // Chaînes partagées : Excel déporte tout le texte dans une table unique.
    $chaines = [];
    if ($sst = $xml('xl/sharedStrings.xml')) {
        foreach ($sst->si as $si) {
            // Un <si> est soit un <t> simple, soit une suite de <r><t> (texte
            // enrichi) qu'il faut recoller.
            $chaines[] = isset($si->r) && count($si->r)
                ? implode('', array_map(static fn($r) => (string) $r->t, iterator_to_array($si->r, false)))
                : (string) $si->t;
        }
    }

    $stylesDate = ($st = $xml('xl/styles.xml')) ? nj_xlsx_formats_dates($st) : [];

    $sheet = $xml($fichierFeuille);
    $zip->close();
    if (!$sheet) {
        return ['lignes' => [], 'erreur' => 'Feuille Excel illisible.'];
    }

    $lignes = [];
    foreach ($sheet->sheetData->row as $row) {
        $cells = [];
        $max = -1;
        foreach ($row->c as $c) {
            $i = nj_xlsx_col_index((string) $c['r']);
            $type = (string) $c['t'];
            $val = '';

            if ($type === 'inlineStr') {
                $val = isset($c->is->t) ? (string) $c->is->t : '';
            } elseif ($type === 's') {
                $idx = (int) $c->v;
                $val = $chaines[$idx] ?? '';
            } elseif ($type === 'b') {
                $val = ((string) $c->v) === '1' ? 'Oui' : 'Non';
            } elseif ($type === 'e') {
                $val = '';                      // #N/A, #DIV/0! … : cellule vide
            } else {
                // Nombre, ou formule dont on lit la dernière valeur calculée.
                $brut = isset($c->v) ? (string) $c->v : '';
                $sIdx = isset($c['s']) ? (int) $c['s'] : -1;
                if ($brut !== '' && is_numeric($brut) && !empty($stylesDate[$sIdx])) {
                    $val = nj_xlsx_date((float) $brut);
                } else {
                    $val = $brut;
                }
            }

            $cells[$i] = trim($val);
            if ($i > $max) $max = $i;
        }

        $plate = [];
        for ($i = 0; $i <= $max; $i++) {
            $plate[] = $cells[$i] ?? '';
        }
        $lignes[] = $plate;
    }

    return ['lignes' => $lignes, 'erreur' => null];
}

/**
 * Convertit une feuille de classeur en CSV point-virgule sur disque.
 *
 * L'import de lots travaille sur un CSV du début à la fin (analyse, aperçu,
 * puis confirmation qui relit le fichier). Convertir à la réception plutôt
 * que de brancher un second analyseur laisse toute cette chaîne inchangée.
 *
 * @return ?string message d'erreur, ou null si la conversion a réussi
 */
function nj_xlsx_vers_csv(string $src, string $dest, string $feuille = 'Lots'): ?string
{
    $lu = nj_xlsx_lire_feuille($src, $feuille);
    if ($lu['erreur'] !== null) return $lu['erreur'];
    if (!$lu['lignes'])          return 'La feuille « ' . $feuille .' » est vide.';

    $fh = @fopen($dest, 'w');
    if (!$fh) return 'Impossible d\'écrire le fichier temporaire de conversion.';

    fwrite($fh, "\xEF\xBB\xBF");        // BOM : cohérent avec les CSV du dépôt
    foreach ($lu['lignes'] as $ligne) {
        if (!array_filter($ligne, static fn($c) => $c !== '')) continue;   // ligne vide
        fputcsv($fh, $ligne, ';', '"', '\\');
    }
    fclose($fh);
    return null;
}
