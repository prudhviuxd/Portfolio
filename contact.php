<?php
/* =========================================================
   Contact form handler for the portfolio's enquiry form.
   Sends each enquiry to TO_EMAIL with the visitor as Reply-To.

   Needs PHP's mail() function, which most shared hosting
   (cPanel, Hostinger, GoDaddy...) provides. If messages land
   in spam, set FROM_EMAIL to an address on your own domain
   (create it in your hosting panel), e.g. hello@yourdomain.com.
   ========================================================= */

const TO_EMAIL   = 'prudhviuxd@gmail.com';
const FROM_EMAIL = '';            // '' = no-reply@<your domain>
const FROM_NAME  = 'Portfolio enquiry';
const RATE_LIMIT = 5;             // messages per visitor per hour
const MIN_SECONDS = 3;            // faster than this is a bot

const TOPICS = [
  'Full-time UX or design leadership role',
  'Consulting or freelance project',
  'UX audit or research',
  'Design thinking workshop',
  'Speaking or mentoring',
  'Something else',
];

$isFetch = (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch');

function respond(bool $ok, string $msg, int $code = 200): void {
  global $isFetch;
  http_response_code($code);
  if ($isFetch) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $ok, 'message' => $msg]);
  } else {
    // Browsers without JavaScript post the form directly: show a page.
    header('Content-Type: text/html; charset=utf-8');
    $m = htmlspecialchars($msg, ENT_QUOTES, 'UTF-8');
    $t = $ok ? 'Message sent' : 'Message not sent';
    echo "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
       . "<title>$t</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d0d;color:#d8d8d8;font-family:Helvetica,Arial,sans-serif;text-align:center;padding:24px}"
       . "h1{font-weight:400;font-size:40px;letter-spacing:-.04em;margin:0 0 12px}a{color:#e8a165}</style></head>"
       . "<body><main><h1>$t</h1><p>$m</p><p><a href=\"index.html#contact\">Back to the site</a></p></main></body></html>";
  }
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Allow: POST');
  respond(false, 'Please use the form on the site.', 405);
}

// Strip anything that could break out of a header line.
function clean_line(string $s, int $max): string {
  $s = trim(preg_replace('/[\r\n\t\0]+/', ' ', $s));
  return mb_substr($s, 0, $max, 'UTF-8');
}

$name    = clean_line($_POST['name'] ?? '', 100);
$email   = clean_line($_POST['email'] ?? '', 200);
$topic   = clean_line($_POST['topic'] ?? '', 100);
$message = trim(str_replace("\0", '', (string)($_POST['message'] ?? '')));
$trap    = trim((string)($_POST['company'] ?? ''));
$started = (int)($_POST['t'] ?? 0);

// Bots: the hidden field is filled, or the form came back too fast.
// Pretend success so they learn nothing.
if ($trap !== '') respond(true, 'Thanks, your message is on its way.');
if ($started > 0 && (time() * 1000 - $started) < MIN_SECONDS * 1000) respond(true, 'Thanks, your message is on its way.');

if ($name === '')                                   respond(false, 'Please enter your name.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL))     respond(false, 'Please enter a valid email address.', 422);
if (!in_array($topic, TOPICS, true))                respond(false, 'Please choose a topic.', 422);
$len = mb_strlen($message, 'UTF-8');
if ($len < 20)                                      respond(false, 'Your message needs at least 20 characters.', 422);
if ($len > 5000)                                    respond(false, 'Please keep your message under 5,000 characters.', 422);

// Simple per-visitor rate limit, stored outside the web root.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$store = rtrim(sys_get_temp_dir(), '/\\') . '/portfolio_contact_' . md5(__DIR__) . '.json';
$fh = @fopen($store, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
  $log = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
  $now = time();
  foreach ($log as $k => $times) {
    $log[$k] = array_values(array_filter($times, fn($ts) => $ts > $now - 3600));
    if (!$log[$k]) unset($log[$k]);
  }
  $key = hash('sha256', $ip);
  if (count($log[$key] ?? []) >= RATE_LIMIT) {
    flock($fh, LOCK_UN); fclose($fh);
    respond(false, 'You have sent several messages already. Please try again in an hour, or email ' . TO_EMAIL . '.', 429);
  }
  $log[$key][] = $now;
  ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($log));
  flock($fh, LOCK_UN); fclose($fh);
}

// Build the email.
$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'localhost'));
$host = preg_replace('/^www\./', '', $host);
if (!preg_match('/^[a-z0-9.-]+$/', $host)) $host = 'localhost';
$from = FROM_EMAIL !== '' ? FROM_EMAIL : 'no-reply@' . $host;

$enc = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
$subject = $enc('Portfolio enquiry: ' . $topic . ' from ' . $name);
$body = "New enquiry from your portfolio\n"
      . "--------------------------------\n\n"
      . "Name:    $name\n"
      . "Email:   $email\n"
      . "Topic:   $topic\n"
      . "Sent:    " . gmdate('D, j M Y H:i') . " UTC\n"
      . "Site:    $host\n\n"
      . "Message:\n$message\n\n"
      . "--------------------------------\n"
      . "Reply to this email to answer $name directly.\n";

$headers = [
  'From: ' . $enc(FROM_NAME) . " <$from>",
  'Reply-To: ' . $enc($name) . " <$email>",
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
  'X-Mailer: Portfolio contact form',
];

$sent = @mail(TO_EMAIL, $subject, $body, implode("\r\n", $headers), '-f' . $from);
// Some hosts refuse a custom envelope sender; try once more without it.
if (!$sent) $sent = @mail(TO_EMAIL, $subject, $body, implode("\r\n", $headers));

if (!$sent) respond(false, 'The message could not be sent right now. Please email ' . TO_EMAIL . ' directly.', 500);
respond(true, "Thanks, $name. Your message is on its way, and I usually reply within one business day.");
