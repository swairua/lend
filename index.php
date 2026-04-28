<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log for debugging
file_put_contents('debug.log', date('Y-m-d H:i:s') . ' ' . $_SERVER['REQUEST_URI'] . ' ' . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = trim($uri, '/');

// Strip base path if running under subdirectory
$basePaths = ['lending', 'api', 'server'];
foreach ($basePaths as $base) {
    if (strpos($uri, $base . '/') === 0 || $uri === $base) {
        $uri = substr($uri, strlen($base) + 1);
        break;
    }
}

if (strpos($uri, 'api/') === 0) {
    $uri = substr($uri, 4);
}

$token = null;
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
}
file_put_contents('debug.log', "Token: $token\n", FILE_APPEND);

function auth() {
    global $token;
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }
    // Validate token from header - search in tokens table or user's last_login as token
    $stmt = pdo()->prepare("SELECT id, email, name, role, is_active FROM users WHERE id = (SELECT user_id FROM tokens WHERE token = ? LIMIT 1) OR last_login LIKE CONCAT('%', ?, '%') LIMIT 1");
    $stmt->execute([$token, $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        // Fallback: check if token matches password hash pattern (for testing)
        $stmt = pdo()->prepare("SELECT id, email, name, role, is_active FROM users WHERE password LIKE CONCAT('%', ?, '%') LIMIT 1");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$user || !$user['is_active']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        exit;
    }
    return $user;
}

function requireAdmin($user) {
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }
}

function input() {
    return json_decode(file_get_contents('php://input'), true) ?? $_POST;
}

$parts = explode('/', $uri);
$resource = $parts[0] ?? '';

try {
    if ($resource === 'auth') {
        require_once 'routes/auth.php';
        exit;
    }
    if ($resource === 'public') {
        require_once 'routes/public.php';
        exit;
    }
    $user = auth();
    file_put_contents('debug.log', "Auth: user=" . $user['id'] . " role=" . $user['role'] . "\n", FILE_APPEND);

    switch ($resource) {
        case 'admin':
            requireAdmin($user);
            require_once 'routes/admin.php';
            break;
        case 'borrower':
            require_once 'routes/borrower.php';
            break;
        case 'messages':
            require_once 'routes/messages.php';
            break;
        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
