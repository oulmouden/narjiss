<?php
/**
 * tools/importer-equipe.php — crée les comptes de l'équipe commerciale depuis un CSV.
 *
 * Passe par nj_agent_create(), donc exactement ce que fait le formulaire de admin/agents.php
 * (hachage du mot de passe, contrôle d'unicité de l'e-mail). Un compte qui existe déjà est
 * laissé tel quel : rejouer le script ne change rien pour lui.
 *
 * Le CSV n'est pas dans le dépôt (adresses personnelles) : data/equipe.csv, séparateur « ; »,
 * en-tête  nom;email;role;date  — role = Admin | Commercial, date = jj/mm/aaaa (date d'entrée).
 *
 * Usage (SSH, depuis la racine du site) :
 *     php tools/importer-equipe.php data/equipe.csv /root/narjiss-equipe-acces.txt
 *
 * Le second argument reçoit les mots de passe provisoires : il doit être HORS du dossier web
 * (le script refuse un chemin sous la racine du site). À transmettre à chacun, puis à supprimer.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/../api/agents-lib.php';

$csv    = $argv[1] ?? '';
$sortie = $argv[2] ?? '';
$racine = realpath(dirname(__DIR__));
if ($csv === '' || !is_file($csv) || $sortie === '') {
    fwrite(STDERR, "Usage : php tools/importer-equipe.php <equipe.csv> <fichier-des-acces-hors-web>\n");
    exit(1);
}
$dirSortie = realpath(dirname($sortie)) ?: '';
if ($dirSortie === '' || strpos($dirSortie . DIRECTORY_SEPARATOR, $racine . DIRECTORY_SEPARATOR) === 0) {
    fwrite(STDERR, "Le fichier des accès doit être écrit HORS du site (ex. /root/), pas dans $racine.\n");
    exit(1);
}

$pdo     = nj_adb();
$lettres = 'abcdefghjkmnpqrstuvwxyz';   // sans i, l, o : lisibles à voix haute et au téléphone
$lignes  = [sprintf("%-20s %-30s %-12s %s", 'Nom', 'E-mail', 'Rôle', 'Mot de passe provisoire')];
$crees   = 0; $ignores = 0;

$fh = fopen($csv, 'r');
$entete = null;
while (($row = fgetcsv($fh, 0, ';')) !== false) {
    if ($entete === null) {
        $entete = array_map(static fn($c) => strtolower(trim((string) preg_replace('/^\xEF\xBB\xBF/', '', $c))), $row);
        continue;
    }
    $r = array_combine($entete, array_pad($row, count($entete), ''));
    $nom   = trim((string) ($r['nom'] ?? ''));
    $email = strtolower(trim((string) ($r['email'] ?? '')));
    if ($nom === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $ignores++; continue; }

    $nom  = (string) preg_replace('/^(Mr|Mme|M\.)\s+/i', '', $nom);
    $nom  = mb_convert_case(mb_strtolower($nom, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');   // « ASMA AYOUB » → « Asma Ayoub »
    $role = strtolower(trim((string) ($r['role'] ?? ''))) === 'admin' ? 'superviseur' : 'commercial';

    if (nj_agent_by_email($email)) {
        $lignes[] = sprintf("%-20s %-30s %-12s %s", $nom, $email, $role, '(déjà présent, inchangé)');
        $ignores++;
        continue;
    }
    $mdp = 'Narjiss-' . substr(str_shuffle($lettres), 0, 4) . random_int(10, 99);
    $id  = nj_agent_create($nom, $email, $mdp, $role, '', '', '');
    $date = date('Y-m-d 09:00:00');
    if (preg_match('~^(\d{2})/(\d{2})/(\d{4})$~', trim((string) ($r['date'] ?? '')), $m)) {
        $date = "$m[3]-$m[2]-$m[1] 09:00:00";                    // date d'entrée dans l'ancien outil
    }
    $pdo->prepare('UPDATE agents SET statut = "active", created_at = ? WHERE id = ?')->execute([$date, $id]);
    $lignes[] = sprintf("%-20s %-30s %-12s %s", $nom, $email, $role, $mdp);
    $crees++;
}
fclose($fh);

$texte = "Accès provisoires — espace commercial — " . date('d/m/Y H:i') . "\n"
       . "À transmettre à chacun ; le mot de passe se change dans l'espace commercial (mot de passe oublié).\n"
       . "Supprimer ce fichier une fois les accès transmis.\n\n" . implode("\n", $lignes) . "\n";
file_put_contents($sortie, $texte);
@chmod($sortie, 0600);
printf("%d compte(s) créé(s), %d ignoré(s). Accès écrits dans %s\n", $crees, $ignores, $sortie);
