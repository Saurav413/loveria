<?php
/**
 * Router for PHP's built-in server:
 *   php -S localhost:8080 router.php
 */
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');

if ($uri === '/' || $uri === '') {
    require __DIR__ . '/index.php';
    return true;
}

if (preg_match('#^/api(?:/|$)#', $uri)) {
    require __DIR__ . '/api/index.php';
    return true;
}

$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false; // serve static file
}

http_response_code(404);
echo 'Not found';
return true;
