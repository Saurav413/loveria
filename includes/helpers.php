<?php

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($data);
    exit;
}

function handle_cors_preflight(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        http_response_code(204);
        exit;
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function map_user(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'gender' => $user['gender'] ?? null,
        'nickname' => $user['nickname'] ?? null,
        'partner_nickname' => $user['partner_nickname'] ?? null,
        'relationship_date' => $user['relationship_date'] ?? null,
        'partner_user_id' => isset($user['partner_user_id']) && $user['partner_user_id'] !== null
            ? (int) $user['partner_user_id']
            : null,
        'latitude' => isset($user['latitude']) && $user['latitude'] !== null
            ? (float) $user['latitude']
            : null,
        'longitude' => isset($user['longitude']) && $user['longitude'] !== null
            ? (float) $user['longitude']
            : null,
        'location_updated_at' => $user['location_updated_at'] ?? null,
    ];
}

function haversine_km(float $lat1, float $lon1, float $lat2, float $lon2): float
{
    $toRad = static fn(float $deg): float => $deg * M_PI / 180;
    $earthKm = 6371.0;
    $dLat = $toRad($lat2 - $lat1);
    $dLon = $toRad($lon2 - $lon1);
    $a = sin($dLat / 2) ** 2
        + cos($toRad($lat1)) * cos($toRad($lat2)) * sin($dLon / 2) ** 2;
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthKm * $c;
}

function generate_otp_code(): string
{
    return (string) random_int(100000, 999999);
}

function generate_pairing_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 6; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

function mask_email(string $email): string
{
    $parts = explode('@', $email, 2);
    if (count($parts) !== 2) {
        return $email;
    }
    [$local, $domain] = $parts;
    if (strlen($local) <= 2) {
        return '**@' . $domain;
    }
    return $local[0] . str_repeat('*', max(strlen($local) - 2, 1)) . $local[strlen($local) - 1] . '@' . $domain;
}

function generate_verification_id(): string
{
    return bin2hex(random_bytes(16));
}

/**
 * Verify Google ID token via tokeninfo endpoint.
 * @return array{error?: string, status?: int, payload?: array}
 */
function verify_google_credential(string $credential, string $googleClientId): array
{
    if ($credential === '') {
        return ['error' => 'Google credential is required.', 'status' => 400];
    }
    if ($googleClientId === '') {
        return ['error' => 'Google sign-in is not configured on server.', 'status' => 500];
    }

    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) {
        return ['error' => 'Invalid Google credential.', 'status' => 401];
    }
    $payload = json_decode($raw, true);
    if (!is_array($payload) || empty($payload['email']) || empty($payload['sub'])) {
        return ['error' => 'Unable to read Google account details.', 'status' => 400];
    }
    if (($payload['aud'] ?? '') !== $googleClientId) {
        return ['error' => 'Invalid Google credential.', 'status' => 401];
    }
    $emailVerified = $payload['email_verified'] ?? false;
    if ($emailVerified !== true && $emailVerified !== 'true') {
        return ['error' => 'Google email is not verified.', 'status' => 400];
    }
    $iss = $payload['iss'] ?? '';
    $validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!in_array($iss, $validIssuers, true)) {
        return ['error' => 'Invalid Google token issuer.', 'status' => 401];
    }

    return ['payload' => $payload];
}

function fetch_user_by_id(mysqli $db, int $userId): ?array
{
    $stmt = $db->prepare(
        'SELECT id, email, gender, nickname, partner_nickname, relationship_date, partner_user_id,
                latitude, longitude, location_updated_at
         FROM users WHERE id = ?'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function pair_ids(int $userId, int $partnerUserId): array
{
    return [min($userId, $partnerUserId), max($userId, $partnerUserId)];
}
