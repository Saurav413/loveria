<?php

require_once dirname(__DIR__) . '/includes/helpers.php';
require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/mail.php';

handle_cors_preflight();

$config = require dirname(__DIR__) . '/config/config.php';

try {
    $db = db_connect($config);
} catch (Throwable $e) {
    json_response(['error' => 'Database connection failed.'], 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_api_path();

try {
    route_request($db, $config, $method, $path);
} catch (Throwable $e) {
    json_response(['error' => 'Server error.'], 500);
}

function parse_api_path(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if (preg_match('#/api(?:/index\.php)?(?:/(.*))?$#', $uri, $m)) {
        return trim($m[1] ?? '', '/');
    }
    if (!empty($_SERVER['PATH_INFO'])) {
        return trim($_SERVER['PATH_INFO'], '/');
    }
    return trim($uri, '/');
}

function route_request(mysqli $db, array $config, string $method, string $path): void
{
    $parts = $path === '' ? [] : explode('/', $path);
    $body = read_json_body();

    // GET /api/config/public
    if ($method === 'GET' && ($parts[0] ?? '') === 'config' && ($parts[1] ?? '') === 'public') {
        json_response([
            'googleClientId' => $config['google_client_id'],
            'smtpConfigured' => smtp_is_configured($config),
        ]);
    }

    // POST /api/auth/google/start
    if ($method === 'POST' && ($parts[0] ?? '') === 'auth' && ($parts[1] ?? '') === 'google' && ($parts[2] ?? '') === 'start') {
        auth_google_start($db, $config, $body);
    }

    // POST /api/auth/google/verify
    if ($method === 'POST' && ($parts[0] ?? '') === 'auth' && ($parts[1] ?? '') === 'google' && ($parts[2] ?? '') === 'verify') {
        auth_google_verify($db, $body);
    }

    // POST /api/user/nicknames
    if ($method === 'POST' && ($parts[0] ?? '') === 'user' && ($parts[1] ?? '') === 'nicknames') {
        user_nicknames($db, $body);
    }

    // POST /api/user/gender
    if ($method === 'POST' && ($parts[0] ?? '') === 'user' && ($parts[1] ?? '') === 'gender') {
        user_gender($db, $body);
    }

    // POST /api/user/relationship-date
    if ($method === 'POST' && ($parts[0] ?? '') === 'user' && ($parts[1] ?? '') === 'relationship-date') {
        user_relationship_date($db, $body);
    }

    // POST /api/user/profile-picture
    if ($method === 'POST' && ($parts[0] ?? '') === 'user' && ($parts[1] ?? '') === 'profile-picture') {
        user_profile_picture_save($db, $body);
    }

    // GET /api/user/profile-picture/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'user' && ($parts[1] ?? '') === 'profile-picture' && isset($parts[2])) {
        user_profile_picture_get($db, (int) $parts[2]);
    }

    // GET /api/user/:id
    if ($method === 'GET' && ($parts[0] ?? '') === 'user' && isset($parts[1]) && ctype_digit($parts[1])) {
        user_get($db, (int) $parts[1]);
    }

    // POST /api/location/update
    if ($method === 'POST' && ($parts[0] ?? '') === 'location' && ($parts[1] ?? '') === 'update') {
        location_update($db, $body);
    }

    // GET /api/location/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'location' && isset($parts[1]) && ctype_digit($parts[1])) {
        location_get($db, (int) $parts[1]);
    }

    // POST /api/reminders
    if ($method === 'POST' && ($parts[0] ?? '') === 'reminders' && !isset($parts[1])) {
        reminders_create($db, $body);
    }

    // GET /api/reminders/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'reminders' && isset($parts[1]) && ctype_digit($parts[1])) {
        reminders_list($db, (int) $parts[1]);
    }

    // PATCH /api/reminders/:id/notified
    if ($method === 'PATCH' && ($parts[0] ?? '') === 'reminders' && isset($parts[1]) && ($parts[2] ?? '') === 'notified') {
        reminders_notified($db, (int) $parts[1]);
    }

    // POST /api/couple-photo
    if ($method === 'POST' && ($parts[0] ?? '') === 'couple-photo') {
        couple_photo_save($db, $body);
    }

    // GET /api/couple-photo/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'couple-photo' && isset($parts[1])) {
        couple_photo_get($db, (int) $parts[1]);
    }

    // POST /api/pairing/create-code
    if ($method === 'POST' && ($parts[0] ?? '') === 'pairing' && ($parts[1] ?? '') === 'create-code') {
        pairing_create_code($db, $body);
    }

    // POST /api/pairing/connect
    if ($method === 'POST' && ($parts[0] ?? '') === 'pairing' && ($parts[1] ?? '') === 'connect') {
        pairing_connect($db, $body);
    }

    // POST /api/drawing/save
    if ($method === 'POST' && ($parts[0] ?? '') === 'drawing' && ($parts[1] ?? '') === 'save') {
        drawing_save($db, $body);
    }

    // GET /api/drawing/self/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'drawing' && ($parts[1] ?? '') === 'self' && isset($parts[2])) {
        drawing_self($db, (int) $parts[2]);
    }

    // GET /api/drawing/partner/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'drawing' && ($parts[1] ?? '') === 'partner' && isset($parts[2])) {
        drawing_partner($db, (int) $parts[2]);
    }

    // POST /api/drawing/stroke
    if ($method === 'POST' && ($parts[0] ?? '') === 'drawing' && ($parts[1] ?? '') === 'stroke') {
        drawing_stroke($db, $body);
    }

    // POST /api/drawing/clear
    if ($method === 'POST' && ($parts[0] ?? '') === 'drawing' && ($parts[1] ?? '') === 'clear') {
        drawing_clear_event($db, $body);
    }

    // GET /api/drawing/events/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'drawing' && ($parts[1] ?? '') === 'events' && isset($parts[2])) {
        drawing_events($db, (int) $parts[2]);
    }

    // POST /api/slideshow/upload
    if ($method === 'POST' && ($parts[0] ?? '') === 'slideshow' && ($parts[1] ?? '') === 'upload') {
        slideshow_upload($db, $body);
    }

    // GET /api/slideshow/:userId
    if ($method === 'GET' && ($parts[0] ?? '') === 'slideshow' && isset($parts[1]) && ctype_digit($parts[1])) {
        slideshow_list($db, (int) $parts[1]);
    }

    // DELETE /api/slideshow/:photoId
    if ($method === 'DELETE' && ($parts[0] ?? '') === 'slideshow' && isset($parts[1]) && ctype_digit($parts[1])) {
        slideshow_delete($db, (int) $parts[1], $body);
    }

    json_response(['error' => 'Not found.'], 404);
}

function auth_google_start(mysqli $db, array $config, array $body): void
{
    $credential = (string) ($body['credential'] ?? '');
    $verification = verify_google_credential($credential, $config['google_client_id']);
    if (isset($verification['error'])) {
        json_response(['error' => $verification['error']], (int) $verification['status']);
    }

    if (!smtp_is_configured($config)) {
        json_response(['error' => 'Email OTP is not configured on server.'], 500);
    }

    $email = $verification['payload']['email'];
    $googleSub = $verification['payload']['sub'];
    $otpCode = generate_otp_code();
    $codeHash = password_hash($otpCode, PASSWORD_BCRYPT);
    $verificationId = generate_verification_id();

    $db->query('DELETE FROM email_verifications WHERE expires_at < NOW()');
    $stmt = $db->prepare(
        'INSERT INTO email_verifications (id, email, google_sub, code_hash, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))'
    );
    $stmt->bind_param('ssss', $verificationId, $email, $googleSub, $codeHash);
    $stmt->execute();
    $stmt->close();

    $sent = send_otp_email($config, $email, $otpCode);
    if (!$sent['ok']) {
        json_response(['error' => $sent['error'] ?? 'Failed to send verification code.'], 500);
    }

    json_response([
        'message' => 'Verification code sent.',
        'verificationId' => $verificationId,
        'email' => mask_email($email),
    ]);
}

function auth_google_verify(mysqli $db, array $body): void
{
    $verificationId = (string) ($body['verificationId'] ?? '');
    $code = trim((string) ($body['code'] ?? ''));
    if ($verificationId === '' || $code === '') {
        json_response(['error' => 'Verification ID and code are required.'], 400);
    }

    $stmt = $db->prepare(
        'SELECT id, email, google_sub, code_hash, expires_at, used_at
         FROM email_verifications WHERE id = ?'
    );
    $stmt->bind_param('s', $verificationId);
    $stmt->execute();
    $verification = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$verification) {
        json_response(['error' => 'Invalid verification request.'], 400);
    }
    if (!empty($verification['used_at'])) {
        json_response(['error' => 'Verification code already used.'], 400);
    }
    if (strtotime($verification['expires_at']) < time()) {
        json_response(['error' => 'Verification code expired.'], 400);
    }
    if (!password_verify($code, $verification['code_hash'])) {
        json_response(['error' => 'Invalid verification code.'], 401);
    }

    $upd = $db->prepare('UPDATE email_verifications SET used_at = NOW() WHERE id = ?');
    $upd->bind_param('s', $verificationId);
    $upd->execute();
    $upd->close();

    $find = $db->prepare('SELECT * FROM users WHERE email = ?');
    $find->bind_param('s', $verification['email']);
    $find->execute();
    $user = $find->get_result()->fetch_assoc();
    $find->close();

    if (!$user) {
        $synthetic = password_hash('google:' . $verification['google_sub'] . ':' . time(), PASSWORD_BCRYPT);
        $ins = $db->prepare('INSERT INTO users (email, password) VALUES (?, ?)');
        $ins->bind_param('ss', $verification['email'], $synthetic);
        $ins->execute();
        $newId = (int) $ins->insert_id;
        $ins->close();
        $user = fetch_user_by_id($db, $newId);
    }

    json_response([
        'message' => 'Google sign-in successful.',
        'user' => map_user($user),
    ]);
}

function user_nicknames(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $nickname = (string) ($body['nickname'] ?? '');
    $partnerNickname = (string) ($body['partnerNickname'] ?? '');
    if ($userId <= 0 || $nickname === '' || $partnerNickname === '') {
        json_response(['error' => 'User ID and both nicknames are required.'], 400);
    }

    $stmt = $db->prepare('UPDATE users SET nickname = ?, partner_nickname = ? WHERE id = ?');
    $stmt->bind_param('ssi', $nickname, $partnerNickname, $userId);
    $stmt->execute();
    if ($stmt->affected_rows === 0) {
        $stmt->close();
        $exists = fetch_user_by_id($db, $userId);
        if (!$exists) {
            json_response(['error' => 'User not found.'], 404);
        }
    }
    $stmt->close();
    $user = fetch_user_by_id($db, $userId);
    json_response(['message' => 'Nicknames updated successfully.', 'user' => map_user($user)]);
}

function user_gender(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $gender = (string) ($body['gender'] ?? '');
    $allowed = ['male', 'female', 'others'];
    if ($userId <= 0 || !in_array($gender, $allowed, true)) {
        json_response(['error' => 'User ID and valid gender are required.'], 400);
    }

    $stmt = $db->prepare('UPDATE users SET gender = ? WHERE id = ?');
    $stmt->bind_param('si', $gender, $userId);
    $stmt->execute();
    if ($stmt->affected_rows === 0 && !fetch_user_by_id($db, $userId)) {
        $stmt->close();
        json_response(['error' => 'User not found.'], 404);
    }
    $stmt->close();
    $user = fetch_user_by_id($db, $userId);
    json_response(['message' => 'Gender updated successfully.', 'user' => map_user($user)]);
}

function user_relationship_date(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $relationshipDate = (string) ($body['relationshipDate'] ?? '');
    if ($userId <= 0 || $relationshipDate === '') {
        json_response(['error' => 'User ID and relationship date are required.'], 400);
    }

    $stmt = $db->prepare('UPDATE users SET relationship_date = ? WHERE id = ?');
    $stmt->bind_param('si', $relationshipDate, $userId);
    $stmt->execute();
    if ($stmt->affected_rows === 0 && !fetch_user_by_id($db, $userId)) {
        $stmt->close();
        json_response(['error' => 'User not found.'], 404);
    }
    $stmt->close();
    $user = fetch_user_by_id($db, $userId);
    json_response(['message' => 'Relationship date updated successfully.', 'user' => map_user($user)]);
}

function user_get(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $user = fetch_user_by_id($db, $userId);
    if (!$user) {
        json_response(['error' => 'User not found.'], 404);
    }
    json_response(['user' => map_user($user)]);
}

function location_update(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $latitude = isset($body['latitude']) ? (float) $body['latitude'] : null;
    $longitude = isset($body['longitude']) ? (float) $body['longitude'] : null;

    if ($userId <= 0) {
        json_response(['error' => 'Valid user ID is required.'], 400);
    }
    if ($latitude === null || $longitude === null || !is_finite($latitude) || !is_finite($longitude)) {
        json_response(['error' => 'Valid latitude and longitude are required.'], 400);
    }
    if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
        json_response(['error' => 'Latitude/longitude out of range.'], 400);
    }

    $stmt = $db->prepare(
        'UPDATE users SET latitude = ?, longitude = ?, location_updated_at = NOW() WHERE id = ?'
    );
    $stmt->bind_param('ddi', $latitude, $longitude, $userId);
    $stmt->execute();
    if ($stmt->affected_rows === 0 && !fetch_user_by_id($db, $userId)) {
        $stmt->close();
        json_response(['error' => 'User not found.'], 404);
    }
    $stmt->close();
    json_response(['message' => 'Location updated successfully.']);
}

function location_get(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }

    $stmt = $db->prepare(
        'SELECT id, nickname, partner_user_id, latitude, longitude, location_updated_at FROM users WHERE id = ?'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $currentUser = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$currentUser) {
        json_response(['error' => 'User not found.'], 404);
    }

    $partner = null;
    $partnerUserId = (int) ($currentUser['partner_user_id'] ?? 0);
    if ($partnerUserId > 0) {
        $pstmt = $db->prepare(
            'SELECT id, nickname, latitude, longitude, location_updated_at FROM users WHERE id = ?'
        );
        $pstmt->bind_param('i', $partnerUserId);
        $pstmt->execute();
        $partner = $pstmt->get_result()->fetch_assoc() ?: null;
        $pstmt->close();
    }

    $distanceKm = null;
    if (
        $currentUser['latitude'] !== null
        && $currentUser['longitude'] !== null
        && $partner
        && $partner['latitude'] !== null
        && $partner['longitude'] !== null
    ) {
        $distanceKm = round(haversine_km(
            (float) $currentUser['latitude'],
            (float) $currentUser['longitude'],
            (float) $partner['latitude'],
            (float) $partner['longitude']
        ), 2);
    }

    json_response([
        'self' => [
            'id' => (int) $currentUser['id'],
            'nickname' => $currentUser['nickname'] ?: 'You',
            'latitude' => $currentUser['latitude'] !== null ? (float) $currentUser['latitude'] : null,
            'longitude' => $currentUser['longitude'] !== null ? (float) $currentUser['longitude'] : null,
            'updated_at' => $currentUser['location_updated_at'] ?? null,
        ],
        'partner' => $partner ? [
            'id' => (int) $partner['id'],
            'nickname' => $partner['nickname'] ?: 'Partner',
            'latitude' => $partner['latitude'] !== null ? (float) $partner['latitude'] : null,
            'longitude' => $partner['longitude'] !== null ? (float) $partner['longitude'] : null,
            'updated_at' => $partner['location_updated_at'] ?? null,
        ] : null,
        'distance_km' => $distanceKm,
    ]);
}

function reminders_create(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $reminderDate = (string) ($body['reminderDate'] ?? '');
    $note = trim((string) ($body['note'] ?? ''));
    if ($userId <= 0 || $reminderDate === '' || $note === '') {
        json_response(['error' => 'User ID, date, and note are required.'], 400);
    }

    $stmt = $db->prepare('INSERT INTO reminders (user_id, reminder_date, note) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $userId, $reminderDate, $note);
    $stmt->execute();
    $id = (int) $stmt->insert_id;
    $stmt->close();

    http_response_code(201);
    json_response([
        'message' => 'Reminder created successfully.',
        'reminder' => [
            'id' => $id,
            'user_id' => $userId,
            'reminder_date' => $reminderDate,
            'note' => $note,
            'is_notified' => 0,
        ],
    ], 201);
}

function reminders_list(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $stmt = $db->prepare(
        'SELECT id, user_id, reminder_date, note, is_notified
         FROM reminders WHERE user_id = ? ORDER BY reminder_date ASC, id ASC'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    json_response(['reminders' => $rows]);
}

function reminders_notified(mysqli $db, int $reminderId): void
{
    if ($reminderId <= 0) {
        json_response(['error' => 'Invalid reminder ID.'], 400);
    }
    $stmt = $db->prepare('UPDATE reminders SET is_notified = 1 WHERE id = ?');
    $stmt->bind_param('i', $reminderId);
    $stmt->execute();
    if ($stmt->affected_rows === 0) {
        $stmt->close();
        json_response(['error' => 'Reminder not found.'], 404);
    }
    $stmt->close();
    json_response(['message' => 'Reminder marked as notified.']);
}

function couple_photo_save(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $imageData = trim((string) ($body['imageData'] ?? ''));
    if ($userId <= 0 || $imageData === '') {
        json_response(['error' => 'User ID and image are required.'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO couple_photos (user_id, image_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)'
    );
    $stmt->bind_param('is', $userId, $imageData);
    $stmt->execute();
    $stmt->close();
    json_response(['message' => 'Couple photo saved successfully.'], 201);
}

function couple_photo_get(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $stmt = $db->prepare('SELECT id, user_id, image_data FROM couple_photos WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        json_response(['error' => 'No couple photo found.'], 404);
    }
    json_response(['photo' => $row]);
}

function user_profile_picture_save(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $imageData = trim((string) ($body['imageData'] ?? ''));
    if ($userId <= 0 || $imageData === '') {
        json_response(['error' => 'User ID and image are required.'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO user_profile_photos (user_id, image_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)'
    );
    $stmt->bind_param('is', $userId, $imageData);
    $stmt->execute();
    $stmt->close();
    json_response(['message' => 'Profile picture saved successfully.'], 201);
}

function user_profile_picture_get(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $stmt = $db->prepare('SELECT id, user_id, image_data FROM user_profile_photos WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        json_response(['error' => 'No profile picture found.'], 404);
    }
    json_response(['photo' => $row]);
}

function pairing_create_code(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    if ($userId <= 0) {
        json_response(['error' => 'Valid user ID is required.'], 400);
    }

    $code = generate_pairing_code();
    for ($i = 0; $i < 5; $i++) {
        $check = $db->prepare('SELECT id FROM pairing_codes WHERE code = ?');
        $check->bind_param('s', $code);
        $check->execute();
        $exists = $check->get_result()->fetch_assoc();
        $check->close();
        if (!$exists) {
            break;
        }
        $code = generate_pairing_code();
    }

    $del = $db->prepare('DELETE FROM pairing_codes WHERE owner_user_id = ? AND status = "active"');
    $del->bind_param('i', $userId);
    $del->execute();
    $del->close();

    $ins = $db->prepare('INSERT INTO pairing_codes (code, owner_user_id, status) VALUES (?, ?, "active")');
    $ins->bind_param('si', $code, $userId);
    $ins->execute();
    $ins->close();

    json_response(['code' => $code, 'message' => 'Pairing code created.'], 201);
}

function pairing_connect(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $code = strtoupper(trim((string) ($body['code'] ?? '')));
    if ($userId <= 0 || $code === '') {
        json_response(['error' => 'Valid user ID and code are required.'], 400);
    }

    $db->begin_transaction();
    try {
        $stmt = $db->prepare('SELECT id, owner_user_id, status FROM pairing_codes WHERE code = ? FOR UPDATE');
        $stmt->bind_param('s', $code);
        $stmt->execute();
        $pair = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$pair) {
            $db->rollback();
            json_response(['error' => 'Pairing code not found.'], 404);
        }
        if ($pair['status'] !== 'active') {
            $db->rollback();
            json_response(['error' => 'Pairing code has already been used.'], 400);
        }
        if ((int) $pair['owner_user_id'] === $userId) {
            $db->rollback();
            json_response(['error' => 'You cannot use your own pairing code.'], 400);
        }

        $ownerId = (int) $pair['owner_user_id'];
        $pairId = (int) $pair['id'];

        $u1 = $db->prepare('UPDATE users SET partner_user_id = ? WHERE id = ?');
        $u1->bind_param('ii', $userId, $ownerId);
        $u1->execute();
        $u1->close();

        $u2 = $db->prepare('UPDATE users SET partner_user_id = ? WHERE id = ?');
        $u2->bind_param('ii', $ownerId, $userId);
        $u2->execute();
        $u2->close();

        $upd = $db->prepare(
            'UPDATE pairing_codes SET status = "connected", connected_user_id = ?, connected_at = NOW() WHERE id = ?'
        );
        $upd->bind_param('ii', $userId, $pairId);
        $upd->execute();
        $upd->close();

        $user = fetch_user_by_id($db, $userId);
        $db->commit();
        json_response([
            'message' => 'Connected with your partner successfully.',
            'user' => map_user($user),
        ]);
    } catch (Throwable $e) {
        $db->rollback();
        json_response(['error' => 'Database error.'], 500);
    }
}

function drawing_save(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $imageData = trim((string) ($body['imageData'] ?? ''));
    if ($userId <= 0 || $imageData === '') {
        json_response(['error' => 'Valid user ID and drawing image are required.'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO shared_drawings (user_id, image_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)'
    );
    $stmt->bind_param('is', $userId, $imageData);
    $stmt->execute();
    $stmt->close();
    json_response(['message' => 'Drawing saved successfully.'], 201);
}

function drawing_self(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $stmt = $db->prepare('SELECT image_data, updated_at FROM shared_drawings WHERE user_id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        json_response(['error' => 'No drawing found.'], 404);
    }
    json_response(['drawing' => $row]);
}

function drawing_partner(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $user = fetch_user_by_id($db, $userId);
    if (!$user) {
        json_response(['error' => 'User not found.'], 404);
    }
    $partnerUserId = (int) ($user['partner_user_id'] ?? 0);
    if ($partnerUserId <= 0) {
        json_response(['error' => 'User is not paired yet.'], 400);
    }

    $stmt = $db->prepare('SELECT image_data, updated_at FROM shared_drawings WHERE user_id = ?');
    $stmt->bind_param('i', $partnerUserId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) {
        json_response(['error' => 'No partner drawing found yet.'], 404);
    }
    json_response(['drawing' => $row]);
}

function resolve_pair_for_user(mysqli $db, int $userId): array
{
    $user = fetch_user_by_id($db, $userId);
    if (!$user) {
        json_response(['error' => 'User not found.'], 404);
    }
    $partnerUserId = (int) ($user['partner_user_id'] ?? 0);
    if ($partnerUserId <= 0) {
        json_response(['error' => 'User is not paired yet.'], 400);
    }
    [$a, $b] = pair_ids($userId, $partnerUserId);
    return [$a, $b, $partnerUserId];
}

function drawing_stroke(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $stroke = $body['stroke'] ?? null;
    if ($userId <= 0 || !is_array($stroke)) {
        json_response(['error' => 'Valid user ID and stroke are required.'], 400);
    }
    [$a, $b] = resolve_pair_for_user($db, $userId);
    $payload = json_encode($stroke);
    $type = 'stroke';
    $stmt = $db->prepare(
        'INSERT INTO drawing_events (pair_user_a, pair_user_b, from_user_id, event_type, payload)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('iiiss', $a, $b, $userId, $type, $payload);
    $stmt->execute();
    $stmt->close();

    // prune old events for this pair (keep last ~500)
    $db->query(
        "DELETE FROM drawing_events
         WHERE pair_user_a = {$a} AND pair_user_b = {$b}
           AND id NOT IN (
             SELECT id FROM (
               SELECT id FROM drawing_events
               WHERE pair_user_a = {$a} AND pair_user_b = {$b}
               ORDER BY id DESC LIMIT 500
             ) t
           )"
    );

    json_response(['message' => 'Stroke recorded.']);
}

function drawing_clear_event(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    if ($userId <= 0) {
        json_response(['error' => 'Valid user ID is required.'], 400);
    }
    [$a, $b] = resolve_pair_for_user($db, $userId);
    $type = 'clear';
    $stmt = $db->prepare(
        'INSERT INTO drawing_events (pair_user_a, pair_user_b, from_user_id, event_type, payload)
         VALUES (?, ?, ?, ?, NULL)'
    );
    $stmt->bind_param('iiis', $a, $b, $userId, $type);
    $stmt->execute();
    $stmt->close();
    json_response(['message' => 'Clear recorded.']);
}

function drawing_events(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    [$a, $b] = resolve_pair_for_user($db, $userId);
    $since = isset($_GET['since']) ? (int) $_GET['since'] : 0;

    $stmt = $db->prepare(
        'SELECT id, from_user_id, event_type, payload, created_at
         FROM drawing_events
         WHERE pair_user_a = ? AND pair_user_b = ? AND id > ? AND from_user_id <> ?
         ORDER BY id ASC
         LIMIT 200'
    );
    $stmt->bind_param('iiii', $a, $b, $since, $userId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $events = [];
    foreach ($rows as $row) {
        $events[] = [
            'id' => (int) $row['id'],
            'from_user_id' => (int) $row['from_user_id'],
            'event_type' => $row['event_type'],
            'stroke' => $row['payload'] ? json_decode($row['payload'], true) : null,
            'created_at' => $row['created_at'],
        ];
    }
    json_response(['events' => $events]);
}

function slideshow_upload(mysqli $db, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    $imageData = trim((string) ($body['imageData'] ?? ''));
    $caption = trim((string) ($body['caption'] ?? ''));
    if ($userId <= 0 || $imageData === '') {
        json_response(['error' => 'Valid user ID and image are required.'], 400);
    }

    $user = fetch_user_by_id($db, $userId);
    if (!$user) {
        json_response(['error' => 'User not found.'], 404);
    }
    $partnerUserId = (int) ($user['partner_user_id'] ?? 0);
    if ($partnerUserId <= 0) {
        json_response(['error' => 'Pair with your partner before uploading shared photos.'], 400);
    }

    [$a, $b] = pair_ids($userId, $partnerUserId);
    $captionVal = $caption !== '' ? $caption : null;
    $stmt = $db->prepare(
        'INSERT INTO shared_slideshow_photos (pair_user_a, pair_user_b, uploaded_by, caption, image_data)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('iiiss', $a, $b, $userId, $captionVal, $imageData);
    try {
        $stmt->execute();
    } catch (mysqli_sql_exception $e) {
        $stmt->close();
        if (str_contains($e->getMessage(), 'max_allowed_packet') || $e->getCode() === 1153) {
            json_response(['error' => 'Image is too large. Please upload a smaller photo.'], 413);
        }
        json_response(['error' => 'Database error.'], 500);
    }
    $stmt->close();
    json_response(['message' => 'Photo added to shared slideshow.'], 201);
}

function slideshow_list(mysqli $db, int $userId): void
{
    if ($userId <= 0) {
        json_response(['error' => 'Invalid user ID.'], 400);
    }
    $user = fetch_user_by_id($db, $userId);
    if (!$user) {
        json_response(['error' => 'User not found.'], 404);
    }
    $partnerUserId = (int) ($user['partner_user_id'] ?? 0);
    if ($partnerUserId <= 0) {
        json_response(['error' => 'User is not paired yet.'], 400);
    }

    [$a, $b] = pair_ids($userId, $partnerUserId);
    $stmt = $db->prepare(
        'SELECT id, image_data, caption, uploaded_by, created_at
         FROM shared_slideshow_photos
         WHERE pair_user_a = ? AND pair_user_b = ?
         ORDER BY created_at DESC'
    );
    $stmt->bind_param('ii', $a, $b);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    json_response(['photos' => $rows]);
}

function slideshow_delete(mysqli $db, int $photoId, array $body): void
{
    $userId = (int) ($body['userId'] ?? 0);
    if ($photoId <= 0 || $userId <= 0) {
        json_response(['error' => 'Valid photo ID and user ID are required.'], 400);
    }

    $user = fetch_user_by_id($db, $userId);
    if (!$user) {
        json_response(['error' => 'User not found.'], 404);
    }
    $partnerUserId = (int) ($user['partner_user_id'] ?? 0);
    if ($partnerUserId <= 0) {
        json_response(['error' => 'User is not paired yet.'], 400);
    }

    [$a, $b] = pair_ids($userId, $partnerUserId);
    $stmt = $db->prepare(
        'DELETE FROM shared_slideshow_photos WHERE id = ? AND pair_user_a = ? AND pair_user_b = ?'
    );
    $stmt->bind_param('iii', $photoId, $a, $b);
    $stmt->execute();
    if ($stmt->affected_rows === 0) {
        $stmt->close();
        json_response(['error' => 'Photo not found.'], 404);
    }
    $stmt->close();
    json_response(['message' => 'Photo removed from slideshow.']);
}
