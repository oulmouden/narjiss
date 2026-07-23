<?php
/**
 * api/mail.php — envoi d'e-mails de notification pour Narjiss Immobilière.
 *
 * Adapté du client SMTP autonome de domiciliation (shared/mail.php), sans
 * dépendance à une base de données : la configuration vient de api/.env.
 *
 *  - Prod  : SMTP (SSL 465 ou STARTTLS 587, AUTH LOGIN) réglé dans .env.
 *  - Dev   : si SMTP_HOST est vide, l'e-mail est écrit dans
 *            data/mail-outbox/*.eml, ce qui rend les notifications testables
 *            sans serveur de messagerie.
 */
require_once __DIR__ . '/config.php';

/** Gabarit HTML sobre aux couleurs Narjiss. */
function nj_mail_template(string $titre, string $corpsHtml, ?string $ctaLabel = null, ?string $ctaUrl = null): string {
  $cta = '';
  if ($ctaLabel && $ctaUrl) {
    $u = htmlspecialchars($ctaUrl, ENT_QUOTES);
    $l = htmlspecialchars($ctaLabel);
    $cta = '<tr><td style="padding:6px 32px 26px"><a href="' . $u . '" style="display:inline-block;background:#006aff;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px">' . $l . '</a></td></tr>';
  }
  return '<!doctype html><html><body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 0">'
    . '<tr><td align="center">'
    . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #dbe3ee;border-radius:14px;overflow:hidden">'
    . '<tr><td style="padding:20px 32px;background:#0c2340"><span style="font-size:19px;font-weight:800;color:#fff;letter-spacing:.04em">NARJISS <span style="color:#f0a860">IMMOBILIÈRE</span></span></td></tr>'
    . '<tr><td style="padding:26px 32px 6px"><h1 style="margin:0 0 14px;font-size:19px;color:#0c2340">' . htmlspecialchars($titre) . '</h1>'
    . '<div style="font-size:14.5px;line-height:1.65;color:#35405a">' . $corpsHtml . '</div></td></tr>'
    . $cta
    . '<tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#8a96ad">Notification interne — Narjiss Immobilière. Ne pas transférer : ce message peut contenir des données personnelles de prospect.</td></tr>'
    . '</table></td></tr></table></body></html>';
}

/** Encode un nom d'expéditeur si non-ASCII. */
function nj_mail_encode_name(string $n): string {
  return preg_match('/[^\x20-\x7e]/', $n) ? '=?UTF-8?B?' . base64_encode($n) . '?=' : $n;
}

/**
 * Envoie un e-mail HTML. Retourne [ok(bool), info(string)].
 * $to vide ou invalide → [false, 'destinataire invalide'].
 */
function nj_mail(?string $to, string $subject, string $htmlBody): array {
  $to = trim((string)$to);
  if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) return [false, 'destinataire invalide'];

  $fromMail = nj_config('MAIL_FROM', 'no-reply@narjiss.company');
  $fromName = nj_config('MAIL_FROM_NAME', 'Narjiss Immobilière');
  $host     = trim(nj_config('SMTP_HOST', ''));

  $headers  = 'From: ' . nj_mail_encode_name($fromName) . " <$fromMail>\r\n";
  $headers .= "MIME-Version: 1.0\r\n";
  $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
  $headers .= "Content-Transfer-Encoding: 8bit\r\n";
  $subjectEnc = '=?UTF-8?B?' . base64_encode($subject) . '?=';

  // ── Mode dev : boîte d'envoi locale ──────────────────────────────────────
  if ($host === '') {
    $dir = __DIR__ . '/../data/mail-outbox';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $eml = "To: $to\r\nSubject: $subject\r\nFrom: $fromName <$fromMail>\r\n$headers\r\n$htmlBody";
    $f = $dir . '/' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.eml';
    return [(bool)@file_put_contents($f, $eml), 'outbox:' . basename($f)];
  }

  // ── Mode prod : SMTP, avec repli en outbox si échec ──────────────────────
  try {
    return nj_smtp_send($to, $subjectEnc, $htmlBody, $headers, $fromMail);
  } catch (Throwable $e) {
    $dir = __DIR__ . '/../data/mail-outbox';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    @file_put_contents($dir . '/FAILED-' . date('Ymd-His') . '.eml', "To: $to\r\nSubject: $subject\r\n\r\n$htmlBody");
    return [false, 'smtp: ' . $e->getMessage()];
  }
}

/** Client SMTP minimal : SSL (465) ou STARTTLS (587), AUTH LOGIN. */
function nj_smtp_send(string $to, string $subjectEnc, string $body, string $headers, string $fromMail): array {
  $host   = nj_config('SMTP_HOST');
  $port   = (int)nj_config('SMTP_PORT', '465');
  $secure = nj_config('SMTP_SECURE', 'ssl');
  $user   = nj_config('SMTP_USER', '');
  $pass   = nj_config('SMTP_PASS', '');
  $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;

  $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
  if (!$fp) throw new RuntimeException("connexion $host:$port impossible ($errstr)");
  stream_set_timeout($fp, 15);

  $read = function () use ($fp) {
    $data = '';
    while ($line = fgets($fp, 512)) { $data .= $line; if (isset($line[3]) && $line[3] === ' ') break; }
    return $data;
  };
  $cmd = function ($c) use ($fp, $read) { fwrite($fp, $c . "\r\n"); return $read(); };
  $expect = function ($resp, $codes) { $c = (int)substr($resp, 0, 3); if (!in_array($c, (array)$codes, true)) throw new RuntimeException('SMTP: ' . trim($resp)); };

  $expect($read(), 220);
  $ehlo = nj_config('SMTP_EHLO', 'narjiss.company');
  $expect($cmd("EHLO $ehlo"), 250);
  if ($secure === 'tls') {
    $expect($cmd('STARTTLS'), 220);
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) throw new RuntimeException('STARTTLS échec');
    $expect($cmd("EHLO $ehlo"), 250);
  }
  if ($user !== '') {
    $expect($cmd('AUTH LOGIN'), 334);
    $expect($cmd(base64_encode($user)), 334);
    $expect($cmd(base64_encode($pass)), 235);
  }
  $expect($cmd("MAIL FROM:<$fromMail>"), 250);
  $expect($cmd("RCPT TO:<$to>"), [250, 251]);
  $expect($cmd('DATA'), 354);
  $data = "To: $to\r\nSubject: $subjectEnc\r\n$headers\r\n$body\r\n.";
  $expect($cmd($data), 250);
  $cmd('QUIT');
  fclose($fp);
  return [true, 'smtp ok'];
}
