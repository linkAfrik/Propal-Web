<?php
/**
 * COPHIR contact forms (Infomaniak / any PHP host).
 * Receives the website forms (name, email, message) and emails them to CONTACT_TO.
 * Answers in JSON; the page falls back to a pre-filled email if this fails.
 */
const CONTACT_TO = 'contact@cophir.com';
// Sender address: must belong to a domain hosted on the same account (Infomaniak requirement).
const CONTACT_FROM = 'site@cophir.com';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

// Honeypot: bots fill this hidden field, people do not.
if (!empty($_POST['company_url'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function field(string $name, int $max = 2000): string {
    $v = isset($_POST[$name]) ? trim((string) $_POST[$name]) : '';
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return mb_substr($v, 0, $max);
}

$form = field('form-name', 40) === 'capabilities' ? 'capabilities' : 'opportunity';
$email = field('email', 200);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'email']);
    exit;
}

$labels = ['name' => 'Name', 'email' => 'Email', 'message' => 'Message', 'enquiry' => 'Enquiry'];

foreach (['name', 'message'] as $r) {
    if (field($r, 5000) === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'missing', 'field' => $r]);
        exit;
    }
}

$lines = [];
foreach ($labels as $key => $label) {
    $v = field($key, 5000);
    if ($v !== '') $lines[] = $label . ":\n" . $v . "\n";
}
$lines[] = 'Sent from: ' . (isset($_SERVER['HTTP_REFERER']) ? mb_substr($_SERVER['HTTP_REFERER'], 0, 300) : 'website');

$subject = $form === 'capabilities' ? 'COPHIR website: capabilities' : 'COPHIR website: opportunity';
$name = preg_replace('/[\r\n]+/', ' ', field('name', 120));
$subject .= ' – ' . $name;

$headers = [
    'From: COPHIR website <' . CONTACT_FROM . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = mail(CONTACT_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail']);
    exit;
}
echo json_encode(['ok' => true]);
