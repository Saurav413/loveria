<?php
/**
 * App configuration. Values can be overridden by a root .env file
 * (KEY=VALUE lines) if present.
 */

function loveria_load_env(string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

loveria_load_env(dirname(__DIR__) . '/.env');

return [
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'db_user' => getenv('DB_USER') ?: 'root',
    'db_password' => getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '',
    'db_name' => getenv('DB_NAME') ?: 'loveria_db',
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',
    'smtp_host' => getenv('SMTP_HOST') ?: 'smtp.gmail.com',
    'smtp_port' => (int) (getenv('SMTP_PORT') ?: 587),
    'smtp_user' => getenv('SMTP_USER') ?: '',
    'smtp_pass' => preg_replace('/\s+/', '', (string) (getenv('SMTP_PASS') ?: '')),
    'smtp_from' => getenv('SMTP_FROM') ?: (getenv('SMTP_USER') ?: ''),
];
