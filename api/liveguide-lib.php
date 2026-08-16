<?php

declare(strict_types=1);

/**
 * api/liveguide-lib.php — sessions de la visite guidée en direct.
 *
 * Avant, une session se résumait à un identifiant tiré au hasard côté
 * navigateur : quiconque recevait le lien entrait, pour toujours, et pouvait
 * même émettre à la place du conseiller (sur un canal de présence Pusher, tout
 * membre peut déclencher un « client event »). Le lien seul ne protégeait rien.
 *
 * Une session est désormais créée par le SERVEUR et porte deux secrets :
 *   - un CODE à 6 chiffres, communiqué de vive voix au visiteur, exigé pour
 *     s'abonner au canal (c'est l'équivalent du mot de passe de 3DVista) ;
 *   - un JETON HÔTE, remis seulement au créateur, seul à ouvrir le rôle « host ».
 *
 * Le jeton hôte n'est jamais stocké en clair (seulement son SHA-256) : une
 * lecture de la base ne permet pas de prendre la main sur une visite en cours.
 * Le code, lui, est stocké en clair — il est court, donc son empreinte serait
 * de toute façon cassable en une seconde, et le conseiller doit pouvoir le
 * relire s'il rouvre sa page. La protection contre la force brute vient du
 * compteur d'essais ci-dessous, pas du hachage.
 *
 * Une session expire d'elle-même (LG_SESSION_TTL_HOURS) et « Terminer » la
 * ferme immédiatement : un visiteur ne peut pas revenir dans un tour après coup.
 */

require_once __DIR__ . '/db.php';

/** Durée de vie d'une session, faute d'avoir été terminée explicitement. */
const LG_SESSION_TTL_HOURS = 8;

/**
 * Essais de code ratés tolérés avant de fermer la session à la saisie.
 *
 * Un code à 6 chiffres, c'est un million de combinaisons : sans plafond, un
 * script les épuise en quelques minutes. Avec 20 essais, la probabilité de
 * tomber juste est de 1 sur 50 000.
 *
 * Contrepartie assumée : quelqu'un qui détient le lien peut brûler les essais
 * et bloquer la saisie pour les vrais visiteurs. Le conseiller relance alors
 * une session — coût d'une poignée de secondes, contre un tour ouvert à tous.
 */
const LG_MAX_CODE_ATTEMPTS = 20;

/**
 * Connexion PDO + garantie que la table des sessions existe.
 * S'appuie sur nj_db() (crée la base au besoin), comme nj_adb().
 */
function nj_lgdb(): PDO {
  static $ready = false;
  $pdo = nj_db();
  if ($ready) return $pdo;

  $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS liveguide_sessions (
  session    VARCHAR(64) NOT NULL PRIMARY KEY,
  code       VARCHAR(8)  NOT NULL,
  host_hash  CHAR(64)    NOT NULL,
  statut     ENUM('active','ended') NOT NULL DEFAULT 'active',
  attempts   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME    NOT NULL,
  expires_at DATETIME    NOT NULL,
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL);

  $ready = true;
  return $pdo;
}

/**
 * Crée une session et renvoie ses secrets.
 *
 * @return array{session:string,code:string,host_token:string,expires_at:string}
 *         Le jeton hôte n'est lisible qu'ici : la base n'en garde que l'empreinte.
 */
function nj_lg_create(): array {
  $pdo = nj_lgdb();
  nj_lg_purge();

  $session   = bin2hex(random_bytes(8));                          // 16 caractères
  $code      = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  $hostToken = bin2hex(random_bytes(16));                         // 32 caractères
  $now       = new DateTimeImmutable('now');
  $expires   = $now->modify('+' . LG_SESSION_TTL_HOURS . ' hours');

  $st = $pdo->prepare(
    'INSERT INTO liveguide_sessions (session, code, host_hash, statut, created_at, expires_at)
     VALUES (?, ?, ?, "active", ?, ?)'
  );
  $st->execute([
    $session,
    $code,
    hash('sha256', $hostToken),
    $now->format('Y-m-d H:i:s'),
    $expires->format('Y-m-d H:i:s'),
  ]);

  return [
    'session'    => $session,
    'code'       => $code,
    'host_token' => $hostToken,
    'expires_at' => $expires->format('c'),
  ];
}

/** Lit une session, ou null si l'identifiant est inconnu. */
function nj_lg_get(string $session): ?array {
  if ($session === '') return null;
  $st = nj_lgdb()->prepare('SELECT * FROM liveguide_sessions WHERE session = ?');
  $st->execute([$session]);
  $row = $st->fetch();
  return $row ?: null;
}

/** Une session ouverte : ni terminée, ni expirée. */
function nj_lg_is_open(?array $row): bool {
  if (!$row || $row['statut'] !== 'active') return false;
  return strtotime((string) $row['expires_at']) > time();
}

/**
 * Trop d'essais ratés : la saisie du code est close.
 *
 * Volontairement distinct de nj_lg_is_open() — le plafond ne doit verrouiller
 * QUE la porte des visiteurs. S'il fermait la session entière, il suffirait de
 * détenir le lien et de taper 20 codes faux pour éjecter le conseiller de sa
 * propre visite.
 */
function nj_lg_code_locked(?array $row): bool {
  return !!$row && (int) $row['attempts'] >= LG_MAX_CODE_ATTEMPTS;
}

/**
 * Vérifie le code d'un visiteur. Un échec incrémente le compteur d'essais.
 *
 * @param array|null $row Session déjà lue (évite un second aller-retour).
 */
function nj_lg_check_code(?array $row, string $code): bool {
  if (!nj_lg_is_open($row) || nj_lg_code_locked($row)) return false;

  // hash_equals : comparaison à temps constant. Sans elle, le temps de réponse
  // trahit le nombre de chiffres devinés et réduit la recherche à ~60 essais.
  if (hash_equals((string) $row['code'], $code)) return true;

  $st = nj_lgdb()->prepare(
    'UPDATE liveguide_sessions SET attempts = attempts + 1 WHERE session = ?'
  );
  $st->execute([$row['session']]);
  return false;
}

/** Vérifie le jeton du conseiller : lui seul peut piloter la visite. */
function nj_lg_check_host(?array $row, string $token): bool {
  if (!nj_lg_is_open($row) || $token === '') return false;
  return hash_equals((string) $row['host_hash'], hash('sha256', $token));
}

/**
 * Ferme une session (bouton « Terminer »). Réservé au porteur du jeton hôte,
 * sinon n'importe quel visiteur pourrait couper la visite des autres.
 */
function nj_lg_end(string $session, string $token): bool {
  $row = nj_lg_get($session);
  if (!$row) return false;
  // On ne passe pas par nj_lg_check_host() : une session expirée doit rester
  // fermable sans erreur (le conseiller clique « Terminer » après coup).
  if ($token === '' || !hash_equals((string) $row['host_hash'], hash('sha256', $token))) {
    return false;
  }
  $st = nj_lgdb()->prepare('UPDATE liveguide_sessions SET statut = "ended" WHERE session = ?');
  $st->execute([$session]);
  return true;
}

/**
 * Supprime les sessions expirées depuis plus d'un jour.
 *
 * Appelé à la création d'une session : quelques visites par jour, la table ne
 * dépasse jamais quelques lignes — inutile de prévoir une tâche planifiée.
 */
function nj_lg_purge(): void {
  try {
    nj_lgdb()->exec(
      'DELETE FROM liveguide_sessions WHERE expires_at < (NOW() - INTERVAL 1 DAY)'
    );
  } catch (Throwable $e) {
    // Le ménage n'est jamais une raison de refuser une visite.
  }
}
