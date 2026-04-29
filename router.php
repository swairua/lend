<?php
// Simple router for PHP built-in server
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = trim($uri, '/');

// Route API requests to index.php
$apiPaths = array('api', 'auth', 'admin', 'borrower', 'messages', 'public');
foreach ($apiPaths as $path) {
    if (strpos($uri, $path . '/') === 0 || $uri === $path) {
        include dirname(__FILE__) . '/index.php';
        return;
    }
}

// Serve static files if they exist
$file = dirname(__FILE__) . '/' . $uri;
if ($uri && file_exists($file) && is_file($file)) {
    return false; // Let PHP serve the file
}

// Fallback to index.html for SPA
if (file_exists(dirname(__FILE__) . '/index.html')) {
    include dirname(__FILE__) . '/index.html';
    return;
}

// Default fallback
include dirname(__FILE__) . '/index.php';
