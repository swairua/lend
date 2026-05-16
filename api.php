<?php
/**
 * Wayrus Lending - Single-file PHP API
 * Deploy: copy this file and .htaccess into the Apache document root.
 * On first request the schema is created and an admin user is seeded.
 *   Admin: admin@lending.com / Pass123
 */

// ========== CORS Headers ==========
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0); // set to 1 for debugging

// ---------- Error Logging Setup ----------
$LOG_DIR = __DIR__ . '/logs';
if (!is_dir($LOG_DIR)) {
    @mkdir($LOG_DIR, 0755, true);
}
$ERROR_LOG_FILE = $LOG_DIR . '/api-errors.log';
$ACCESS_LOG_FILE = $LOG_DIR . '/api-access.log';

function log_error($message, $context = []) {
    global $ERROR_LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' | ' . json_encode($context) : '';
    $logMessage = "[$timestamp] ERROR: $message$contextStr\n";
    @file_put_contents($ERROR_LOG_FILE, $logMessage, FILE_APPEND);
    error_log($logMessage);
}

function log_access($method, $uri, $statusCode, $responseTime = null) {
    global $ACCESS_LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user = $_SERVER['HTTP_AUTHORIZATION'] ?? 'anonymous';
    $responseTimeStr = $responseTime ? " | Response: {$responseTime}ms" : '';
    $logMessage = "[$timestamp] $method $uri | Status: $statusCode | IP: $ip | User: $user$responseTimeStr\n";
    @file_put_contents($ACCESS_LOG_FILE, $logMessage, FILE_APPEND);
}

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    log_error("PHP Error ($errno)", [
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    return false;
});

set_exception_handler(function($e) {
    log_error("Exception: " . get_class($e), [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
    exit;
});

$startTime = microtime(true);
$timestamp = date('Y-m-d H:i:s');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Database connection ----------
// MySQL Production Database Configuration
$DB_TYPE = 'mysql';
$DB_HOST = 'localhost';
$DB_NAME = 'wayrusc1_lending';
$DB_USER = 'wayrusc1_lending';
$DB_PASS = 'Sirgeorge.12';
$DB_FILE = __DIR__ . '/lending.db'; // Used only if DB_TYPE is 'sqlite'

$PDO_INSTANCE = null;
function pdo() {
    global $PDO_INSTANCE, $DB_TYPE, $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS, $DB_FILE;
    if ($PDO_INSTANCE === null) {
        try {
            if ($DB_TYPE === 'mysql') {
                $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";
                $PDO_INSTANCE = new PDO($dsn, $DB_USER, $DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } else {
                $dsn = "sqlite:$DB_FILE";
                $PDO_INSTANCE = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
                // Enable foreign keys for SQLite
                $PDO_INSTANCE->exec("PRAGMA foreign_keys = ON");
            }
        } catch (PDOException $e) {
            log_error("Database Connection Failed", [
                'type' => $DB_TYPE,
                'host' => $DB_HOST,
                'database' => $DB_NAME,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    return $PDO_INSTANCE;
}

function q($sql, $params = [])   { $s = pdo()->prepare($sql); $s->execute($params); return $s; }
function one($sql, $params = []) { return q($sql, $params)->fetch(); }
function all($sql, $params = []) { return q($sql, $params)->fetchAll(); }
function input() { return json_decode(file_get_contents('php://input'), true) ?? $_POST; }

// Initialize DEV_MODE - production server uses database, not mock data
$DEV_MODE = false;

// ---------- Bootstrap (idempotent schema + seed) ----------
function bootstrap() {
    try {
        // Create uploads directory
        $UPLOADS_DIR = __DIR__ . '/uploads';
        if (!is_dir($UPLOADS_DIR)) {
            @mkdir($UPLOADS_DIR, 0755, true);
        }

        $p = pdo();

        $p->exec("CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            photo_url TEXT,
            role VARCHAR(50) NOT NULL DEFAULT 'borrower',
            permissions TEXT,
            last_login TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS borrowers (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            national_id TEXT,
            address TEXT,
            business_name TEXT,
            business_type TEXT,
            monthly_income REAL,
            credit_score INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS loan_categories (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS loan_products (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            category_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            min_amount REAL NOT NULL,
            max_amount REAL NOT NULL,
            min_term_months INTEGER NOT NULL,
            max_term_months INTEGER NOT NULL,
            interest_rate REAL NOT NULL,
            interest_type TEXT DEFAULT 'flat',
            processing_fee_percent REAL DEFAULT 0,
            asset_transfer_fee REAL DEFAULT 0,
            tracking_system_fee REAL DEFAULT 0,
            late_fee_percent REAL DEFAULT 0,
            requires_security INTEGER DEFAULT 0,
            requires_guarantor INTEGER DEFAULT 0,
            requires_postdated_checks INTEGER DEFAULT 0,
            min_income REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES loan_categories(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            borrower_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            principal_amount REAL NOT NULL,
            interest_amount REAL NOT NULL,
            processing_fee REAL DEFAULT 0,
            asset_transfer_fee REAL DEFAULT 0,
            tracking_system_fee REAL DEFAULT 0,
            late_fee_rate REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            term_months INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            approved_by INTEGER,
            approved_at TIMESTAMP,
            disbursed_at TIMESTAMP,
            due_date DATE,
            security_details TEXT,
            guarantor_details TEXT,
            postdated_check_no TEXT,
            logbook_no TEXT,
            asset_description TEXT,
            asset_value REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES loan_products(id),
            FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            loan_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            method TEXT DEFAULT 'mpesa',
            reference TEXT,
            status TEXT DEFAULT 'completed',
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS repayments (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            loan_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            principal_paid REAL NOT NULL,
            interest_paid REAL NOT NULL,
            penalty_paid REAL DEFAULT 0,
            late_fee_paid REAL DEFAULT 0,
            payment_method TEXT DEFAULT 'mpesa',
            reference_number TEXT,
            paid_by INTEGER,
            paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
            FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            loan_id INTEGER,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'general',
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            key_name TEXT NOT NULL UNIQUE,
            key_value TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            borrower_id INTEGER,
            user_id INTEGER,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )");

        // Seed / repair demo users (admin + borrower) with valid Pass123 hash
        $demoUsers = [
            ['admin@lending.com',    'Admin User',    'admin',    null],
            ['borrower@lending.com', 'Borrower User', 'borrower', true],
        ];
        foreach ($demoUsers as [$email, $name, $role, $createBorrowerRow]) {
            $existing = one("SELECT id, password FROM users WHERE email = ?", [$email]);
            $freshHash = password_hash('Pass123', PASSWORD_BCRYPT);
            if (!$existing) {
                q("INSERT INTO users (email, password, name, role, is_active) VALUES (?, ?, ?, ?, 1)",
                  [$email, $freshHash, $name, $role]);
                $userId = (int)pdo()->lastInsertId();
                log_error("Demo user created", ['email' => $email, 'role' => $role]);
            } else {
                $userId = (int)$existing['id'];
                if (!password_verify('Pass123', $existing['password'])) {
                    q("UPDATE users SET password = ?, role = ?, is_active = 1 WHERE id = ?",
                      [$freshHash, $role, $userId]);
                    log_error("Demo user password reset", ['email' => $email]);
                }
            }
            if ($createBorrowerRow) {
                $b = one("SELECT id FROM borrowers WHERE user_id = ?", [$userId]);
                if (!$b) {
                    q("INSERT INTO borrowers (user_id, credit_score) VALUES (?, 750)", [$userId]);
                    log_error("Borrower row created", ['user_id' => $userId]);
                }
            }
        }

        // Seed loan categories
        if (!one("SELECT id FROM loan_categories LIMIT 1")) {
            q("INSERT INTO loan_categories (name, code, description) VALUES (?, ?, ?)",
              ['Asset Finance', 'ASSET', 'Asset purchase/financing with logbook transfer']);
            q("INSERT INTO loan_categories (name, code, description) VALUES (?, ?, ?)",
              ['Micro Finance', 'MICRO', 'Small loans against salary or security']);
            q("INSERT INTO loan_categories (name, code, description) VALUES (?, ?, ?)",
              ['LPO Finance', 'LPO', 'Advancing against Local Purchase Orders']);
            log_error("Loan categories seeded", []);
        }

        // Seed loan products
        if (!one("SELECT id FROM loan_products LIMIT 1")) {
            q("INSERT INTO loan_products (category_id, name, description, min_amount, max_amount, min_term_months, max_term_months, interest_rate, interest_type, processing_fee_percent, asset_transfer_fee, tracking_system_fee, late_fee_percent, requires_security, requires_guarantor, requires_postdated_checks, min_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [1, 'Asset Finance', 'Finance for vehicle/asset purchase with logbook transfer', 50000, 5000000, 6, 60, 19.5, 'reducing', 4, 7000, 25000, 2.5, 1, 1, 0, 50000]);
            q("INSERT INTO loan_products (category_id, name, description, min_amount, max_amount, min_term_months, max_term_months, interest_rate, interest_type, processing_fee_percent, asset_transfer_fee, tracking_system_fee, late_fee_percent, requires_security, requires_guarantor, requires_postdated_checks, min_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [2, 'Micro Loan - Small', 'Quick small loan up to 10k', 5000, 10000, 1, 2, 15, 'flat', 4, 0, 0, 2.5, 1, 0, 1, 10000]);
            q("INSERT INTO loan_products (category_id, name, description, min_amount, max_amount, min_term_months, max_term_months, interest_rate, interest_type, processing_fee_percent, asset_transfer_fee, tracking_system_fee, late_fee_percent, requires_security, requires_guarantor, requires_postdated_checks, min_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [2, 'Micro Loan - Medium', 'Quick loan up to 50k', 10001, 50000, 1, 3, 15, 'flat', 4, 0, 0, 2.5, 1, 0, 1, 20000]);
            q("INSERT INTO loan_products (category_id, name, description, min_amount, max_amount, min_term_months, max_term_months, interest_rate, interest_type, processing_fee_percent, asset_transfer_fee, tracking_system_fee, late_fee_percent, requires_security, requires_guarantor, requires_postdated_checks, min_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [3, 'LPOS Finance', 'Finance for LPOS equipment', 10000, 100000, 3, 24, 12, 'flat', 3, 0, 0, 2.5, 1, 0, 0, 15000]);
            log_error("Loan products seeded", []);
        }

        // Seed default settings (SQLite doesn't support ON DUPLICATE KEY, use INSERT OR IGNORE)
        $defaults = [
            'company_name' => 'Wayrus Lending',
            'currency' => 'KES',
            'default_interest_rate' => '10',
            'default_processing_fee' => '4.00',
            'late_penalty_rate' => '2.5',
            'asset_transfer_fee' => '7000',
            'tracking_system_fee' => '25000',
        ];
        foreach ($defaults as $k => $v) {
            q("INSERT OR IGNORE INTO settings (key_name, key_value) VALUES (?, ?)", [$k, $v]);
        }
    } catch (Exception $e) {
        log_error("Bootstrap failed", [
            'error' => $e->getMessage(),
            'code' => $e->getCode()
        ]);
        throw $e;
    }
}

try {
    bootstrap();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Bootstrap failed: ' . $e->getMessage()]);
    exit;
}

// ========== UTILITY ENDPOINTS (Temporary - remove after testing) ==========
if (isset($_GET['action'])) {
    if ($_GET['action'] === 'reset_demo_passwords') {
        try {
            $freshHash = password_hash('Pass123', PASSWORD_BCRYPT);
            q("UPDATE users SET password = ? WHERE email IN (?, ?)",
              [$freshHash, 'admin@lending.com', 'borrower@lending.com']);
            echo json_encode(['success' => true, 'message' => 'Demo passwords reset']);
            exit;
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }
    if ($_GET['action'] === 'debug_login') {
        $email = $_GET['email'] ?? 'admin@lending.com';
        $user = one("SELECT id, email, password FROM users WHERE email = ?", [$email]);
        if ($user) {
            echo json_encode([
                'success' => true,
                'user' => $user['email'],
                'password_verify_Pass123' => password_verify('Pass123', $user['password']),
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
        exit;
    }
}

// ---------- Routing ----------
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = trim($uri, '/');

// Strip out common base paths and the filename itself
foreach (['api.php', 'api', 'lending', 'server'] as $base) {
    if ($uri === $base || strpos($uri, $base . '/') === 0) {
        $uri = substr($uri, strlen($base) + 1);
        break;
    }
}

$uri = trim($uri, '/');
$method = $_SERVER['REQUEST_METHOD'];

$token = null;
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $token = trim(str_replace('Bearer', '', $_SERVER['HTTP_AUTHORIZATION']));
}

function auth() {
    global $token;
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }
    $u = one("SELECT u.id, u.email, u.name, u.role, u.is_active
              FROM tokens t JOIN users u ON u.id = t.user_id
              WHERE t.token = ? LIMIT 1", [$token]);
    if (!$u || !$u['is_active']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid token']);
        exit;
    }
    return $u;
}
function requireAdmin($u) {
    if ($u['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }
}

try {
    $resource = explode('/', $uri)[0] ?? '';

    // ====================================================================
    // AUTH
    // ====================================================================
    if ($resource === 'auth') {
        if ($method === 'POST' && strpos($uri, 'auth/login') !== false) {
            $d = input();
            $email = $d['email'] ?? '';
            $password = $d['password'] ?? '';
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

            // Debug logging
            log_error("Login attempt", ['email' => $email, 'password_length' => strlen($password)]);

            try {
                $user = one("SELECT * FROM users WHERE email = ?", [$email]);

                if (!$user) {
                    log_error("User not found", ['email' => $email]);
                    http_response_code(401);
                    echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
                    exit;
                }

                $passwordMatch = password_verify($password, $user['password']);
                log_error("Password check", ['email' => $email, 'match' => $passwordMatch, 'is_active' => $user['is_active']]);

                if ($passwordMatch && $user['is_active']) {
                    // Successful login
                    $tok = 't_' . bin2hex(random_bytes(32));
                    q("INSERT INTO tokens (user_id, token) VALUES (?, ?)", [$user['id'], $tok]);
                    q("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [$user['id']]);
                    $b = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);

                    // Log successful login
                    $logMsg = "[$timestamp] LOGIN SUCCESS | Email: $email | User ID: {$user['id']} | Role: {$user['role']} | IP: $ip | UA: $userAgent\n";
                    @file_put_contents($LOG_DIR . '/login.log', $logMsg, FILE_APPEND);

                    $payload = [
                        'id' => $user['id'], 'email' => $user['email'], 'name' => $user['name'],
                        'phone' => $user['phone'], 'role' => $user['role'],
                        'borrower_id' => $b['id'] ?? null,
                    ];
                    log_access('POST', 'auth/login', 200);
                    echo json_encode(['success' => true, 'token' => $tok, 'user' => $payload,
                                      'data' => ['token' => $tok, 'user' => $payload]]);
                    exit;
                }

                // Failed login - log the attempt
                $reason = !$passwordMatch ? 'Invalid password' : 'User inactive';
                $logMsg = "[$timestamp] LOGIN FAILED | Email: $email | Reason: $reason | IP: $ip | UA: $userAgent\n";
                @file_put_contents($LOG_DIR . '/login.log', $logMsg, FILE_APPEND);
                log_error("Login failed", ['email' => $email, 'reason' => $reason]);

                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
                exit;
            } catch (Exception $e) {
                $logMsg = "[$timestamp] LOGIN EXCEPTION | Email: $email | Error: {$e->getMessage()} | IP: $ip\n";
                @file_put_contents($LOG_DIR . '/login.log', $logMsg, FILE_APPEND);
                log_error("Login exception", ['email' => $email, 'error' => $e->getMessage(), 'ip' => $ip]);
                throw $e;
            }
        }
        if ($method === 'POST' && strpos($uri, 'auth/logout') !== false) {
            if ($token) q("DELETE FROM tokens WHERE token = ?", [$token]);
            log_access('POST', 'auth/logout', 200);
            echo json_encode(['success' => true]);
            exit;
        }
        if ($method === 'GET' && strpos($uri, 'auth/me') !== false) {
            $u = auth();
            $row = one("SELECT id, email, name, phone, role FROM users WHERE id = ?", [$u['id']]);
            $b = one("SELECT id FROM borrowers WHERE user_id = ?", [$u['id']]);
            $row['borrower_id'] = $b['id'] ?? null;
            // Try to fetch photo_url if column exists
            try {
                $fullRow = one("SELECT photo_url FROM users WHERE id = ?", [$u['id']]);
                if ($fullRow && $fullRow['photo_url']) {
                    $row['photo_url'] = $fullRow['photo_url'];
                }
            } catch (Exception $e) {
                // photo_url column doesn't exist yet, continue without it
            }
            log_access('GET', 'auth/me', 200);
            echo json_encode(['success' => true, 'data' => $row]);
            exit;
        }
        if ($method === 'PUT' && strpos($uri, 'auth/profile') !== false) {
            $u = auth();
            $d = input();
            try {
                // Update user profile fields
                $updates = [];
                $values = [];

                if (isset($d['name'])) {
                    $updates[] = "name = ?";
                    $values[] = $d['name'];
                }
                if (isset($d['phone'])) {
                    $updates[] = "phone = ?";
                    $values[] = $d['phone'];
                }
                if (isset($d['photo_url'])) {
                    // Try to update photo_url if column exists
                    try {
                        $updates[] = "photo_url = ?";
                        $values[] = $d['photo_url'];
                    } catch (Exception $e) {
                        // photo_url column doesn't exist yet, skip it
                    }
                }

                if ($updates) {
                    $updates[] = "updated_at = CURRENT_TIMESTAMP";
                    $values[] = $u['id'];
                    q("UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?", $values);
                }

                // Update borrower profile if provided
                $borrower = one("SELECT id FROM borrowers WHERE user_id = ?", [$u['id']]);
                if ($borrower && (isset($d['address']) || isset($d['business_name']) || isset($d['business_type']) || isset($d['monthly_income']))) {
                    $b_updates = [];
                    $b_values = [];

                    if (isset($d['address'])) {
                        $b_updates[] = "address = ?";
                        $b_values[] = $d['address'];
                    }
                    if (isset($d['business_name'])) {
                        $b_updates[] = "business_name = ?";
                        $b_values[] = $d['business_name'];
                    }
                    if (isset($d['business_type'])) {
                        $b_updates[] = "business_type = ?";
                        $b_values[] = $d['business_type'];
                    }
                    if (isset($d['monthly_income'])) {
                        $b_updates[] = "monthly_income = ?";
                        $b_values[] = floatval($d['monthly_income']);
                    }

                    if ($b_updates) {
                        $b_updates[] = "updated_at = CURRENT_TIMESTAMP";
                        $b_values[] = $borrower['id'];
                        q("UPDATE borrowers SET " . implode(", ", $b_updates) . " WHERE id = ?", $b_values);
                    }
                }

                // Return updated user data
                $row = one("SELECT id, email, name, phone, role FROM users WHERE id = ?", [$u['id']]);
                $b = one("SELECT id FROM borrowers WHERE user_id = ?", [$u['id']]);
                $row['borrower_id'] = $b['id'] ?? null;
                // Try to fetch photo_url if column exists
                try {
                    $fullRow = one("SELECT photo_url FROM users WHERE id = ?", [$u['id']]);
                    if ($fullRow && $fullRow['photo_url']) {
                        $row['photo_url'] = $fullRow['photo_url'];
                    }
                } catch (Exception $e) {
                    // photo_url column doesn't exist yet
                }

                log_access('PUT', 'auth/profile', 200);
                echo json_encode(['success' => true, 'data' => $row]);
                exit;
            } catch (Exception $e) {
                log_error("Profile update exception", ['user_id' => $u['id'], 'error' => $e->getMessage()]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to update profile']);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Not found']);
        exit;
    }

    // ====================================================================
    // PUBLIC
    // ====================================================================
    // Handle /categories endpoint (alias for public/categories)
    if ($resource === 'categories') {
        $data = $DEV_MODE ? $MOCK_CATEGORIES : all("SELECT * FROM loan_categories WHERE is_active = 1 ORDER BY name");
        log_access('GET', '/categories', 200);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    // Handle /products endpoint (alias for public/products)
    if ($resource === 'products') {
        $catId = $_GET['category_id'] ?? null;
        if ($DEV_MODE) {
            $data = $MOCK_PRODUCTS;
            if ($catId) {
                $data = array_filter($data, function($p) use ($catId) { return $p['category_id'] == $catId; });
            }
        } else {
            $sql = "SELECT lp.*, lc.name as category_name, lc.code as category_code
                    FROM loan_products lp LEFT JOIN loan_categories lc ON lp.category_id = lc.id
                    WHERE lp.is_active = 1";
            $params = [];
            if ($catId) { $sql .= " AND lp.category_id = ?"; $params[] = $catId; }
            $sql .= " ORDER BY lp.min_amount";
            $data = all($sql, $params);
        }
        log_access('GET', '/products', 200);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    // Handle /loans/calculate endpoint
    if ($method === 'POST' && strpos($uri, 'loans/calculate') !== false) {
        $d = input();
        $product = $DEV_MODE ? (array_values(array_filter($MOCK_PRODUCTS, function($p) { return $p['id'] == ($d['product_id'] ?? 0); }))  [0] ?? null) : one("SELECT * FROM loan_products WHERE id = ?", [$d['product_id'] ?? 0]);
        if (!$product) {
            log_error("Product not found", ['product_id' => $d['product_id'] ?? 'unknown']);
            echo json_encode(['success' => false, 'error' => 'Product not found']);
            exit;
        }
        $amount = floatval($d['amount'] ?? 0);
        $term = intval($d['term_months'] ?? 1);
        $interest = ($amount * floatval($product['interest_rate']) / 100) * ($term / 12);
        $procFee = $amount * (floatval($product['processing_fee_percent'] ?? 0) / 100);
        $assetFee = floatval($product['asset_transfer_fee'] ?? 0);
        $trackFee = floatval($product['tracking_system_fee'] ?? 0);
        $total = $amount + $interest + $procFee + $assetFee + $trackFee;
        log_access('POST', 'loans/calculate', 200);
        echo json_encode(['success' => true, 'data' => [
            'principal' => $amount, 'interest' => $interest,
            'processing_fee' => $procFee, 'asset_transfer_fee' => $assetFee,
            'tracking_system_fee' => $trackFee, 'total_amount' => $total,
            'monthly_payment' => $total / max($term, 1),
        ]]);
        exit;
    }

    if ($resource === 'public') {
        if (strpos($uri, 'public/categories') !== false) {
            $data = $DEV_MODE ? $MOCK_CATEGORIES : all("SELECT * FROM loan_categories WHERE is_active = 1 ORDER BY name");
            log_access('GET', 'public/categories', 200);
            echo json_encode(['success' => true, 'data' => $data]);
            exit;
        }
        if (preg_match('#public/products/(\d+)#', $uri, $m)) {
            $data = one("SELECT * FROM loan_products WHERE id = ?", [$m[1]]);
            log_access('GET', 'public/products/' . $m[1], 200);
            echo json_encode(['success' => true, 'data' => $data]);
            exit;
        }
        if (strpos($uri, 'public/products') !== false) {
            $catId = $_GET['category_id'] ?? null;
            if ($DEV_MODE) {
                $data = $MOCK_PRODUCTS;
                if ($catId) {
                    $data = array_filter($data, function($p) use ($catId) { return $p['category_id'] == $catId; });
                }
            } else {
                $sql = "SELECT lp.*, lc.name as category_name, lc.code as category_code
                        FROM loan_products lp LEFT JOIN loan_categories lc ON lp.category_id = lc.id
                        WHERE lp.is_active = 1";
                $params = [];
                if ($catId) { $sql .= " AND lp.category_id = ?"; $params[] = $catId; }
                $sql .= " ORDER BY lp.min_amount";
                $data = all($sql, $params);
            }
            log_access('GET', 'public/products', 200);
            echo json_encode(['success' => true, 'data' => $data]);
            exit;
        }
        if ($method === 'POST' && strpos($uri, 'public/loans/calculate') !== false) {
            $d = input();
            $product = one("SELECT * FROM loan_products WHERE id = ?", [$d['product_id'] ?? 0]);
            if (!$product) { 
                log_error("Product not found", ['product_id' => $d['product_id'] ?? 'unknown']);
                echo json_encode(['success' => false, 'error' => 'Product not found']); exit; 
            }
            $amount = floatval($d['amount'] ?? 0);
            $term = intval($d['term_months'] ?? 1);
            $interest = ($amount * floatval($product['interest_rate']) / 100) * ($term / 12);
            $procFee = $amount * floatval($product['processing_fee_percent']) / 100;
            $assetFee = floatval($product['asset_transfer_fee']);
            $trackFee = floatval($product['tracking_system_fee']);
            $total = $amount + $interest + $procFee + $assetFee + $trackFee;
            log_access('POST', 'public/loans/calculate', 200);
            echo json_encode(['success' => true, 'data' => [
                'principal' => $amount, 'interest' => $interest,
                'processing_fee' => $procFee, 'asset_transfer_fee' => $assetFee,
                'tracking_system_fee' => $trackFee, 'total_amount' => $total,
                'monthly_payment' => $total / max($term, 1),
            ]]);
            exit;
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Not found']);
        exit;
    }

    // ====================================================================
    // Authenticated routes
    // ====================================================================
    $user = auth();

    // -------------------- BORROWER --------------------
    if ($resource === 'borrower') {
        $borrower = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);
        if (!$borrower) {
            // Auto-create a borrower record so the user can apply
            q("INSERT INTO borrowers (user_id) VALUES (?)", [$user['id']]);
            $borrower = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);
            log_error("Borrower record auto-created", ['user_id' => $user['id']]);
        }
        $bid = $borrower['id'];

        if (strpos($uri, 'borrower/dashboard') !== false) {
            $totalLoans  = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ?", [$bid]);
            $activeLoans = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ? AND status='active'", [$bid]);
            $pending     = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ? AND status='pending'", [$bid]);
            $disbursed   = one("SELECT COALESCE(SUM(total_amount),0) t FROM loans WHERE borrower_id = ? AND status IN ('active','completed')", [$bid]);
            $repaid      = one("SELECT COALESCE(SUM(r.amount),0) t FROM repayments r JOIN loans l ON r.loan_id=l.id WHERE l.borrower_id = ?", [$bid]);
            log_access('GET', 'borrower/dashboard', 200);
            echo json_encode(['success' => true, 'data' => [
                'total_loans' => $totalLoans['c'],
                'active_loans' => $activeLoans['c'],
                'pending_loans' => $pending['c'],
                'total_disbursed' => $disbursed['t'],
                'total_repaid' => $repaid['t'],
                'balance_due' => floatval($disbursed['t']) - floatval($repaid['t']),
            ]]);
            exit;
        }

        if (preg_match('#borrower/loans/(\d+)#', $uri, $m)) {
            $loan = one("SELECT l.*, lp.name as product_name, lp.description as product_description
                         FROM loans l LEFT JOIN loan_products lp ON l.product_id = lp.id
                         WHERE l.id = ? AND l.borrower_id = ?", [$m[1], $bid]);
            if (!$loan) { 
                log_error("Loan not found", ['loan_id' => $m[1], 'borrower_id' => $bid]);
                http_response_code(404); 
                echo json_encode(['success' => false, 'error' => 'Not found']); 
                exit; 
            }
            $reps = all("SELECT * FROM repayments WHERE loan_id = ? ORDER BY paid_at DESC", [$loan['id']]);
            $paid = array_sum(array_map(fn($r) => floatval($r['amount']), $reps));
            $loan['repayments'] = $reps;
            $loan['total_paid'] = $paid;
            $loan['balance'] = floatval($loan['total_amount']) - $paid;
            log_access('GET', 'borrower/loans/' . $m[1], 200);
            echo json_encode(['success' => true, 'data' => $loan]);
            exit;
        }

        if (strpos($uri, 'borrower/loans') !== false) {
            if ($method === 'POST') {
                $d = input();
                try {
                    $product = one("SELECT * FROM loan_products WHERE id = ? AND is_active = 1", [$d['product_id'] ?? 0]);
                    if (!$product) { 
                        log_error("Invalid product for loan", ['product_id' => $d['product_id'] ?? 'unknown']);
                        echo json_encode(['success' => false, 'error' => 'Invalid product']); 
                        exit; 
                    }
                    $amount = floatval($d['amount'] ?? 0);
                    $term   = intval($d['term_months'] ?? 1);
                    if ($amount < $product['min_amount'] || $amount > $product['max_amount']) {
                        log_error("Loan amount out of range", ['amount' => $amount, 'min' => $product['min_amount'], 'max' => $product['max_amount']]);
                        echo json_encode(['success' => false, 'error' => 'Amount out of range']); 
                        exit;
                    }
                    if ($term < $product['min_term_months'] || $term > $product['max_term_months']) {
                        log_error("Loan term out of range", ['term' => $term, 'min' => $product['min_term_months'], 'max' => $product['max_term_months']]);
                        echo json_encode(['success' => false, 'error' => 'Term out of range']); 
                        exit;
                    }
                    // Calculate interest based on product type (flat vs reducing)
                    $interest = 0;
                    if (strtolower($product['interest_type'] ?? 'flat') === 'flat') {
                        $interest = ($amount * floatval($product['interest_rate']) / 100) * ($term / 12);
                    } else {
                        $r = floatval($product['interest_rate'] ?? 0) / 100 / 12;
                        $n = $term;
                        if ($r == 0) {
                            $interest = 0;
                        } else {
                            $monthly = $amount * $r / (1 - pow(1 + $r, -$n));
                            $interest = $monthly * $n - $amount;
                        }
                    }
                    $procFee  = $amount * floatval($product['processing_fee_percent']) / 100;
                    $assetFee = floatval($product['asset_transfer_fee']);
                    $trackFee = floatval($product['tracking_system_fee']);
                    $total    = $amount + $interest + $procFee + $assetFee + $trackFee;
                    $due      = date('Y-m-d', strtotime("+{$term} months"));
                    q("INSERT INTO loans (borrower_id, product_id, principal_amount, interest_amount, processing_fee,
                        asset_transfer_fee, tracking_system_fee, late_fee_rate, total_amount, term_months, status,
                        security_details, guarantor_details, due_date)
                       VALUES (?,?,?,?,?,?,?,?,?,?, 'pending', ?, ?, ?)",
                       [$bid, $product['id'], $amount, $interest, $procFee, $assetFee, $trackFee,
                        floatval($product['late_fee_percent']), $total, $term,
                        $d['security_details'] ?? null, $d['guarantor_details'] ?? null, $due]);
                    $loanId = pdo()->lastInsertId();
                    if ($procFee > 0) {
                        q("INSERT INTO payments (loan_id, type, amount, method, status) VALUES (?,'processing_fee',?,'bank','pending')", [$loanId, $procFee]);
                    }
                    foreach (all("SELECT id FROM users WHERE role='admin' AND is_active=1") as $a) {
                        q("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type)
                           VALUES (?,?,?,?,?,'loan_update')",
                           [$user['id'], $a['id'], $loanId, 'New Loan Application',
                            "New loan application #$loanId. Amount: $amount, Term: $term months."]);
                    }
                    log_access('POST', 'borrower/loans', 201);
                    echo json_encode(['success' => true, 'data' => ['id' => $loanId]]);
                    exit;
                } catch (Exception $e) {
                    log_error("Loan creation exception", ['borrower_id' => $bid, 'error' => $e->getMessage()]);
                    throw $e;
                }
            }
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
            if ($DEV_MODE) {
                $loans = [
                    ['id' => 1, 'borrower_id' => 1, 'product_id' => 1, 'principal_amount' => 100000, 'interest_amount' => 12500, 'processing_fee' => 2500, 'asset_transfer_fee' => 500, 'tracking_system_fee' => 200, 'total_amount' => 115700, 'term_months' => 12, 'status' => 'active', 'created_at' => date('Y-m-d H:i:s', time() - 86400 * 30), 'product_name' => 'Vehicle Loan', 'interest_rate' => 12.5, 'category_name' => 'Asset-Based Lending', 'category_code' => 'ABL', 'total_paid' => 20000, 'balance' => 95700],
                ];
                $tot = ['c' => 1];
            } else {
                $loans = all("SELECT l.*, lp.name as product_name, lp.interest_rate,
                                     lc.name as category_name, lc.code as category_code
                              FROM loans l
                              LEFT JOIN loan_products lp ON l.product_id = lp.id
                              LEFT JOIN loan_categories lc ON lp.category_id = lc.id
                              WHERE l.borrower_id = ? ORDER BY l.created_at DESC LIMIT $limit OFFSET $off", [$bid]);
                $tot = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ?", [$bid]);
                foreach ($loans as &$l) {
                    $p = one("SELECT COALESCE(SUM(amount),0) t FROM repayments WHERE loan_id = ?", [$l['id']]);
                    $l['total_paid'] = $p['t'];
                    $l['balance'] = floatval($l['total_amount']) - floatval($p['t']);
                }
            }
            log_access('GET', 'borrower/loans', 200);
            echo json_encode(['success' => true, 'data' => ['loans' => $loans,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }
    }

    // -------------------- MESSAGES --------------------
    if ($resource === 'messages') {
        if (strpos($uri, 'messages/unread') !== false) {
            if ($DEV_MODE) {
                $count = 2;
            } else {
                $u = one("SELECT COUNT(*) c FROM messages WHERE recipient_id = ? AND is_read = 0", [$user['id']]);
                $count = $u['c'] ?? 0;
            }
            log_access('GET', 'messages/unread', 200);
            echo json_encode(['success' => true, 'data' => ['unread' => $count]]);
            exit;
        }
        if ($method === 'PUT' && preg_match('#messages/(\d+)/read#', $uri, $m)) {
            q("UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?", [$m[1], $user['id']]);
            log_access('PUT', 'messages/' . $m[1] . '/read', 200);
            echo json_encode(['success' => true]); 
            exit;
        }
        if ($method === 'DELETE' && preg_match('#messages/(\d+)$#', $uri, $m)) {
            q("DELETE FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)", [$m[1], $user['id'], $user['id']]);
            log_access('DELETE', 'messages/' . $m[1], 200);
            echo json_encode(['success' => true]); 
            exit;
        }
        if ($method === 'GET' && preg_match('#messages/(\d+)$#', $uri, $m)) {
            $msg = one("SELECT * FROM messages WHERE id = ?", [$m[1]]);
            if ($msg && $msg['recipient_id'] == $user['id'] && !$msg['is_read']) {
                q("UPDATE messages SET is_read = 1 WHERE id = ?", [$msg['id']]);
            }
            log_access('GET', 'messages/' . $m[1], 200);
            echo json_encode(['success' => true, 'data' => $msg]); 
            exit;
        }
        if ($method === 'POST') {
            $d = input();
            q("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type)
               VALUES (?,?,?,?,?,'general')",
               [$user['id'], $d['recipient_id'], $d['loan_id'] ?? null, $d['subject'], $d['message']]);
            log_access('POST', 'messages', 201);
            echo json_encode(['success' => true]); 
            exit;
        }
        // List
        $folder = $_GET['folder'] ?? 'inbox';
        $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
        if ($DEV_MODE) {
            $msgs = [
                ['id' => 1, 'sender_id' => 2, 'recipient_id' => 1, 'loan_id' => null, 'subject' => 'Loan Approved', 'message' => 'Your loan application has been approved.', 'type' => 'notification', 'is_read' => 0, 'created_at' => date('Y-m-d H:i:s', time() - 86400), 'sender_name' => 'Admin', 'recipient_name' => 'You'],
                ['id' => 2, 'sender_id' => 1, 'recipient_id' => 2, 'loan_id' => null, 'subject' => 'Re: Loan Status', 'message' => 'Thank you for the update.', 'type' => 'message', 'is_read' => 1, 'created_at' => date('Y-m-d H:i:s', time() - 172800), 'sender_name' => 'You', 'recipient_name' => 'Admin'],
            ];
            $tot = ['c' => 2];
        } else if ($folder === 'sent') {
            $msgs = all("SELECT m.*, u.name as recipient_name, u.email as recipient_email
                         FROM messages m LEFT JOIN users u ON m.recipient_id = u.id
                         WHERE m.sender_id = ? ORDER BY m.created_at DESC LIMIT $limit OFFSET $off", [$user['id']]);
            $tot  = one("SELECT COUNT(*) c FROM messages WHERE sender_id = ?", [$user['id']]);
        } else {
            $msgs = all("SELECT m.*, u.name as sender_name, u.email as sender_email
                         FROM messages m LEFT JOIN users u ON m.sender_id = u.id
                         WHERE m.recipient_id = ? ORDER BY m.created_at DESC LIMIT $limit OFFSET $off", [$user['id']]);
            $tot  = one("SELECT COUNT(*) c FROM messages WHERE recipient_id = ?", [$user['id']]);
        }
        $unread = one("SELECT COUNT(*) c FROM messages WHERE recipient_id = ? AND is_read = 0", [$user['id']]);
        log_access('GET', 'messages', 200);
        echo json_encode(['success' => true, 'data' => [
            'messages' => $msgs, 'unread_count' => $unread['c'],
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]
        ]]);
        exit;
    }

    // -------------------- ADMIN --------------------
    if ($resource === 'admin') {
        requireAdmin($user);

        if (strpos($uri, 'admin/dashboard') !== false) {
            $borrowers = one("SELECT COUNT(*) c FROM users WHERE role='borrower'");
            $loans = all("SELECT status, principal_amount, total_amount, created_at FROM loans");
            $tot = count($loans);
            $active = $pending = $approved = $defaulted = 0; $disbursed = 0.0;
            foreach ($loans as $l) {
                if ($l['status'] === 'active')   $active++;
                if ($l['status'] === 'pending')  $pending++;
                if ($l['status'] === 'approved') $approved++;
                if ($l['status'] === 'defaulted') $defaulted++;
                if (in_array($l['status'], ['active','completed'])) $disbursed += floatval($l['principal_amount']);
            }
            $collected = one("SELECT COALESCE(SUM(amount),0) t FROM repayments");
            $defaultRate  = $tot > 0 ? ($defaulted / $tot * 100) : 0;
            $approvalRate = ($tot - $pending) > 0 ? ($approved / ($tot - $pending) * 100) : 0;
            $monthly = all("SELECT strftime('%Y-%m', created_at) month, COUNT(*) count, COALESCE(SUM(principal_amount),0) total
                            FROM loans WHERE status IN ('active','completed') AND created_at >= datetime('now', '-6 months')
                            GROUP BY strftime('%Y-%m', created_at) ORDER BY month");
            $catDist = [];
            if ($tot > 0) {
                $catRows = all("SELECT lc.id, lc.name category, COUNT(*) count
                                FROM loans l LEFT JOIN loan_products lp ON l.product_id=lp.id
                                LEFT JOIN loan_categories lc ON lp.category_id=lc.id
                                WHERE lc.id IS NOT NULL
                                GROUP BY lc.id, lc.name");
                foreach ($catRows as $row) {
                    $row['percentage'] = ($row['count'] / $tot) * 100;
                    $catDist[] = $row;
                }
            }
            $recentLoans = all("SELECT l.*, u.name borrower_name, lp.name product_name, lc.name category_name
                                 FROM loans l
                                 LEFT JOIN borrowers b ON l.borrower_id=b.id
                                 LEFT JOIN users u ON b.user_id=u.id
                                 LEFT JOIN loan_products lp ON l.product_id=lp.id
                                 LEFT JOIN loan_categories lc ON lp.category_id=lc.id
                                 ORDER BY l.created_at DESC LIMIT 5");
            $recentRep = all("SELECT r.*, u.name borrower_name FROM repayments r
                              LEFT JOIN loans l ON r.loan_id=l.id
                              LEFT JOIN borrowers b ON l.borrower_id=b.id
                              LEFT JOIN users u ON b.user_id=u.id
                              ORDER BY r.paid_at DESC LIMIT 5");
            log_access('GET', 'admin/dashboard', 200);
            echo json_encode(['success' => true, 'data' => [
                'total_borrowers' => $borrowers['c'], 'total_loans' => $tot,
                'active_loans' => $active, 'pending_loans' => $pending,
                'total_disbursed' => $disbursed, 'total_collected' => $collected['t'],
                'default_rate' => $defaultRate, 'approval_rate' => $approvalRate,
                'monthly_disbursements' => $monthly, 'category_distribution' => $catDist,
                'recent_loans' => $recentLoans, 'recent_repayments' => $recentRep,
            ]]);
            exit;
        }

        // Loan actions
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/approve$#', $uri, $m)) {
            try {
                $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
                if (!$loan || $loan['status'] !== 'pending') {
                    log_error("Loan approval failed - not pending", ['loan_id' => $m[1], 'status' => $loan['status'] ?? 'unknown']);
                    echo json_encode(['success' => false, 'error' => 'Loan is not pending']); 
                    exit;
                }
                $d = input(); $approve = $d['approve'] ?? true;
                $ns = $approve ? 'approved' : 'rejected';
                q("UPDATE loans SET status=?, approved_by=?, approved_at=CURRENT_TIMESTAMP WHERE id=?", [$ns, $user['id'], $m[1]]);
                $b = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
                q("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?,?,?,?,?,?)",
                  [$user['id'], $b['user_id'], $m[1],
                   $approve ? 'Loan Approved' : 'Loan Rejected',
                   $approve ? "Your loan #{$m[1]} has been approved." : "Your loan #{$m[1]} has been rejected.",
                   $approve ? 'approval' : 'rejection']);
                log_access('POST', 'admin/loans/' . $m[1] . '/approve', 200);
                echo json_encode(['success' => true]); 
                exit;
            } catch (Exception $e) {
                log_error("Loan approval exception", ['loan_id' => $m[1], 'error' => $e->getMessage()]);
                throw $e;
            }
        }
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/disburse$#', $uri, $m)) {
            try {
                $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
                if (!$loan || $loan['status'] !== 'approved') {
                    log_error("Loan disbursement failed - not approved", ['loan_id' => $m[1], 'status' => $loan['status'] ?? 'unknown']);
                    echo json_encode(['success' => false, 'error' => 'Loan must be approved first']); 
                    exit;
                }
                $d = input();
                $amt = $d['disbursement_amount'] ?? $loan['principal_amount'];
                q("UPDATE loans SET status='active', disbursed_at=CURRENT_TIMESTAMP WHERE id=?", [$m[1]]);
                q("INSERT INTO payments (loan_id, type, amount, method, reference, status)
                   VALUES (?,'disbursement',?,'bank',?,'completed')", [$m[1], $amt, $d['reference'] ?? null]);
                $b = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
                q("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type)
                   VALUES (?,?,?,'Loan Disbursed',?,'disbursement')",
                  [$user['id'], $b['user_id'], $m[1], "Your loan #{$m[1]} has been disbursed."]);
                log_access('POST', 'admin/loans/' . $m[1] . '/disburse', 200);
                echo json_encode(['success' => true]); 
                exit;
            } catch (Exception $e) {
                log_error("Loan disbursement exception", ['loan_id' => $m[1], 'error' => $e->getMessage()]);
                throw $e;
            }
        }
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/reactivate$#', $uri, $m)) {
            q("UPDATE loans SET status='pending', approved_by=NULL, approved_at=NULL, disbursed_at=NULL WHERE id=?", [$m[1]]);
            log_access('POST', 'admin/loans/' . $m[1] . '/reactivate', 200);
            echo json_encode(['success' => true]); 
            exit;
        }
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/default$#', $uri, $m)) {
            q("UPDATE loans SET status='defaulted' WHERE id=?", [$m[1]]);
            log_access('POST', 'admin/loans/' . $m[1] . '/default', 200);
            echo json_encode(['success' => true]); 
            exit;
        }

        // Single loan
        if (preg_match('#admin/loans/(\d+)$#', $uri, $m)) {
            $loan = one("SELECT l.*, u.name borrower_name, u.email borrower_email, u.phone borrower_phone,
                                lp.name product_name, lp.description product_description
                         FROM loans l
                         LEFT JOIN borrowers b ON l.borrower_id=b.id
                         LEFT JOIN users u ON b.user_id=u.id
                         LEFT JOIN loan_products lp ON l.product_id=lp.id
                         WHERE l.id = ?", [$m[1]]);
            if (!$loan) { 
                log_error("Admin loan not found", ['loan_id' => $m[1]]);
                http_response_code(404); 
                echo json_encode(['success' => false, 'error' => 'Not found']); 
                exit; 
            }
            $loan['repayments'] = all("SELECT * FROM repayments WHERE loan_id = ? ORDER BY paid_at DESC", [$loan['id']]);
            $loan['payments']   = all("SELECT * FROM payments   WHERE loan_id = ? ORDER BY created_at DESC", [$loan['id']]);
            $paid = array_sum(array_map(fn($r) => floatval($r['amount']), $loan['repayments']));
            $loan['total_paid'] = $paid;
            $loan['balance'] = floatval($loan['total_amount']) - $paid;
            log_access('GET', 'admin/loans/' . $m[1], 200);
            echo json_encode(['success' => true, 'data' => $loan]);
            exit;
        }

        // Loans list
        if (strpos($uri, 'admin/loans') !== false) {
            $status = $_GET['status'] ?? null;
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
            $sql = "SELECT l.*, u.name borrower_name, u.email borrower_email, lp.name product_name, lc.name category_name
                    FROM loans l
                    LEFT JOIN borrowers b ON l.borrower_id=b.id
                    LEFT JOIN users u ON b.user_id=u.id
                    LEFT JOIN loan_products lp ON l.product_id=lp.id
                    LEFT JOIN loan_categories lc ON lp.category_id=lc.id WHERE 1=1";
            $params = [];
            if ($status && $status !== 'all') { $sql .= " AND l.status = ?"; $params[] = $status; }
            $sql .= " ORDER BY l.created_at DESC LIMIT $limit OFFSET $off";
            $loans = all($sql, $params);
            foreach ($loans as &$l) {
                $p = one("SELECT COALESCE(SUM(amount),0) t FROM repayments WHERE loan_id = ?", [$l['id']]);
                $l['total_paid'] = $p['t'];
                $l['balance'] = floatval($l['total_amount']) - floatval($p['t']);
            }
            $tot = $status && $status !== 'all'
                ? one("SELECT COUNT(*) c FROM loans WHERE status = ?", [$status])
                : one("SELECT COUNT(*) c FROM loans");
            log_access('GET', 'admin/loans', 200);
            echo json_encode(['success' => true, 'data' => ['loans' => $loans,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }

        // Borrowers
        if (strpos($uri, 'admin/borrowers') !== false) {
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
            $rows = all("SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
                                b.id borrower_id, b.national_id, b.address, b.business_name, b.business_type,
                                b.monthly_income, b.credit_score
                         FROM users u LEFT JOIN borrowers b ON u.id = b.user_id
                         WHERE u.role = 'borrower' ORDER BY u.created_at DESC LIMIT $limit OFFSET $off");
            $tot = one("SELECT COUNT(*) c FROM users WHERE role='borrower'");
            log_access('GET', 'admin/borrowers', 200);
            echo json_encode(['success' => true, 'data' => ['borrowers' => $rows,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }

        // Categories CRUD
        if (strpos($uri, 'admin/categories') !== false) {
            if ($method === 'POST') {
                $d = input();
                q("INSERT INTO loan_categories (name, code, description, is_active) VALUES (?,?,?,?)",
                  [$d['name'], $d['code'], $d['description'] ?? null, $d['is_active'] ?? 1]);
                log_access('POST', 'admin/categories', 201);
                echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]); 
                exit;
            }
            if ($method === 'PUT' && preg_match('#categories/(\d+)#', $uri, $m)) {
                $d = input();
                q("UPDATE loan_categories SET name=?, code=?, description=?, is_active=? WHERE id=?",
                  [$d['name'], $d['code'], $d['description'], $d['is_active'], $m[1]]);
                log_access('PUT', 'admin/categories/' . $m[1], 200);
                echo json_encode(['success' => true]); 
                exit;
            }
            if ($method === 'DELETE' && preg_match('#categories/(\d+)#', $uri, $m)) {
                q("DELETE FROM loan_categories WHERE id=?", [$m[1]]);
                log_access('DELETE', 'admin/categories/' . $m[1], 200);
                echo json_encode(['success' => true]); 
                exit;
            }
            log_access('GET', 'admin/categories', 200);
            echo json_encode(['success' => true, 'data' => all("SELECT * FROM loan_categories ORDER BY name")]);
            exit;
        }

        // Products CRUD
        if (strpos($uri, 'admin/products') !== false) {
            if ($method === 'POST') {
                $d = input();
                q("INSERT INTO loan_products (category_id, name, description, min_amount, max_amount,
                       min_term_months, max_term_months, interest_rate, interest_type, processing_fee_percent,
                       asset_transfer_fee, tracking_system_fee, late_fee_percent, is_active)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  [$d['category_id'], $d['name'], $d['description'] ?? null,
                   $d['min_amount'], $d['max_amount'], $d['min_term_months'], $d['max_term_months'],
                   $d['interest_rate'], $d['interest_type'] ?? 'flat', $d['processing_fee_percent'] ?? 0,
                   $d['asset_transfer_fee'] ?? 0, $d['tracking_system_fee'] ?? 0,
                   $d['late_fee_percent'] ?? 0, $d['is_active'] ?? 1]);
                log_access('POST', 'admin/products', 201);
                echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]); 
                exit;
            }
            if ($method === 'PUT' && preg_match('#products/(\d+)#', $uri, $m)) {
                $d = input();
                $allowed = ['category_id','name','description','min_amount','max_amount','min_term_months',
                            'max_term_months','interest_rate','interest_type','processing_fee_percent',
                            'asset_transfer_fee','tracking_system_fee','late_fee_percent','is_active'];
                $fields = []; $values = [];
                foreach ($d as $k => $v) {
                    if (in_array($k, $allowed)) { $fields[] = "$k = ?"; $values[] = $v; }
                }
                if ($fields) {
                    $values[] = $m[1];
                    q("UPDATE loan_products SET " . implode(', ', $fields) . " WHERE id = ?", $values);
                }
                log_access('PUT', 'admin/products/' . $m[1], 200);
                echo json_encode(['success' => true]); 
                exit;
            }
            if ($method === 'DELETE' && preg_match('#products/(\d+)#', $uri, $m)) {
                q("DELETE FROM loan_products WHERE id=?", [$m[1]]);
                log_access('DELETE', 'admin/products/' . $m[1], 200);
                echo json_encode(['success' => true]); 
                exit;
            }
            log_access('GET', 'admin/products', 200);
            echo json_encode(['success' => true, 'data' => all(
                "SELECT lp.*, lc.name category_name FROM loan_products lp
                 LEFT JOIN loan_categories lc ON lp.category_id=lc.id ORDER BY lp.name")]);
            exit;
        }

        // Settings
        if (strpos($uri, 'admin/settings') !== false) {
            if ($method === 'PUT') {
                $d = input();
                foreach ($d as $k => $v) {
                    q("INSERT INTO settings (key_name, key_value) VALUES (?, ?)
                       ON DUPLICATE KEY UPDATE key_value = ?", [$k, $v, $v]);
                }
                log_access('PUT', 'admin/settings', 200);
                echo json_encode(['success' => true]); 
                exit;
            }
            $rows = all("SELECT * FROM settings");
            $out = [];
            foreach ($rows as $r) $out[$r['key_name']] = $r['key_value'];
            log_access('GET', 'admin/settings', 200);
            echo json_encode(['success' => true, 'data' => $out]); 
            exit;
        }

        // Repayments
        if (strpos($uri, 'admin/repayments') !== false) {
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
            $rows = all("SELECT r.*, u.name borrower_name, l.principal_amount
                         FROM repayments r
                         LEFT JOIN loans l ON r.loan_id=l.id
                         LEFT JOIN borrowers b ON l.borrower_id=b.id
                         LEFT JOIN users u ON b.user_id=u.id
                         ORDER BY r.paid_at DESC LIMIT $limit OFFSET $off");
            $tot = one("SELECT COUNT(*) c FROM repayments");
            log_access('GET', 'admin/repayments', 200);
            echo json_encode(['success' => true, 'data' => ['repayments' => $rows,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }

        // Users
        if (strpos($uri, 'admin/users') !== false) {
            if ($method === 'POST') {
                try {
                    $d = input();
                    $email = $d['email'] ?? '';
                    $name = $d['name'] ?? '';
                    $phone = $d['phone'] ?? null;
                    $role = $d['role'] ?? 'borrower';
                    $password = $d['password'] ?? null;

                    // Validate required fields
                    if (!$email || !$name) {
                        log_error("User creation validation failed", ['email' => $email, 'name' => $name]);
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'Email and name are required']);
                        exit;
                    }

                    // Check if user already exists
                    $existing = one("SELECT id FROM users WHERE email = ?", [$email]);
                    if ($existing) {
                        log_error("User creation failed - email exists", ['email' => $email]);
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'User with this email already exists']);
                        exit;
                    }

                    // Generate default password if not provided
                    if (!$password) {
                        $password = bin2hex(random_bytes(8));
                    }
                    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

                    // Create user
                    q("INSERT INTO users (email, password, name, phone, role, is_active) VALUES (?, ?, ?, ?, ?, 1)",
                      [$email, $hashedPassword, $name, $phone, $role]);

                    $userId = pdo()->lastInsertId();
                    $newUser = one("SELECT id, email, name, phone, role, created_at FROM users WHERE id = ?", [$userId]);

                    // Create borrower record if role is borrower
                    if ($role === 'borrower') {
                        q("INSERT INTO borrowers (user_id, credit_score) VALUES (?, 750)", [$userId]);
                    }

                    log_error("User created successfully via admin", ['user_id' => $userId, 'email' => $email, 'role' => $role]);
                    log_access('POST', 'admin/users', 201);
                    echo json_encode(['success' => true, 'data' => $newUser]);
                    exit;
                } catch (Exception $e) {
                    log_error("User creation exception", ['email' => $email ?? 'unknown', 'error' => $e->getMessage()]);
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to create user: ' . $e->getMessage()]);
                    exit;
                }
            }

            // GET /admin/users - list users
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
            $rows = all("SELECT id, email, name, phone, role, is_active, created_at FROM users
                         ORDER BY created_at DESC LIMIT $limit OFFSET $off");
            $tot = one("SELECT COUNT(*) c FROM users");
            log_access('GET', 'admin/users', 200);
            echo json_encode(['success' => true, 'data' => ['users' => $rows,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }
    }

    // -------------------- DOCUMENTS (UPLOADS) --------------------
    if ($resource === 'uploads') {
        $user = auth(); // Require authentication

        if ($method === 'GET') {
            // GET /uploads - list documents for borrower
            $borrower_id = $_GET['borrower_id'] ?? null;

            $sql = "SELECT id, file_name, file_path, doc_type, file_size, created_at FROM documents WHERE 1=1";
            $params = [];

            if ($borrower_id) {
                $sql .= " AND borrower_id = ?";
                $params[] = $borrower_id;
            }

            $sql .= " ORDER BY created_at DESC";
            $data = all($sql, $params);

            // Add file_url and original_name to each document for frontend
            foreach ($data as &$doc) {
                $doc['file_url'] = '/' . $doc['file_path'];
                $doc['original_name'] = $doc['file_name'];
            }

            log_access('GET', 'uploads', 200);
            echo json_encode(['success' => true, 'data' => $data]);
            exit;
        }

        if ($method === 'POST') {
            // POST /uploads - upload new document
            if (!isset($_FILES['file'])) {
                log_error("Upload failed - no file", []);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'File is required']);
                exit;
            }

            $file = $_FILES['file'];
            $doc_type = $_POST['doc_type'] ?? 'general';
            $borrower_id = isset($_POST['borrower_id']) ? (int) trim($_POST['borrower_id']) : 0;

            if ($file['error'] !== UPLOAD_ERR_OK) {
                log_error("Upload failed - upload error", ['error' => $file['error']]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Upload error: ' . $file['error']]);
                exit;
            }

            // Validate borrower_id is provided
            if (!$borrower_id) {
                log_error("Upload failed - Borrower ID is required", ['borrower_id' => $_POST['borrower_id'] ?? null]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Borrower ID is required']);
                exit;
            }

            // Validate borrower exists
            $borrower = one("SELECT id FROM borrowers WHERE id = ?", [$borrower_id]);
            if (!$borrower) {
                // Debug: Check if table exists and has any rows
                $allBorrowers = all("SELECT id FROM borrowers");
                log_error("Upload failed - borrower not found", [
                    'borrower_id' => $borrower_id,
                    'borrower_id_type' => gettype($borrower_id),
                    'total_borrowers' => count($allBorrowers),
                    'all_borrower_ids' => array_column($allBorrowers, 'id')
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Borrower not found']);
                exit;
            }

            // Save file with unique name
            $file_name = basename($file['name']);
            $file_ext = pathinfo($file_name, PATHINFO_EXTENSION);
            $unique_name = date('Ymdhis') . '_' . bin2hex(random_bytes(4)) . '.' . $file_ext;
            $file_path = 'uploads/' . $unique_name;
            $full_path = __DIR__ . '/' . $file_path;

            if (!move_uploaded_file($file['tmp_name'], $full_path)) {
                log_error("Upload failed - cannot save file", ['file' => $file_name]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to save file']);
                exit;
            }

            // Save to database
            try {
                q("INSERT INTO documents (borrower_id, user_id, file_name, file_path, doc_type, file_size, mime_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?)",
                  [$borrower_id, $user['id'], $file_name, $file_path, $doc_type, $file['size'], $file['type']]);

                $doc_id = pdo()->lastInsertId();
                $data = one("SELECT id, file_name, file_path, doc_type, file_size, created_at FROM documents WHERE id = ?", [$doc_id]);

                // Add file_url to response (maps file_path for frontend)
                if ($data) {
                    $data['file_url'] = '/' . $data['file_path'];
                    $data['original_name'] = $data['file_name'];
                }

                log_error("File uploaded successfully", ['doc_id' => $doc_id, 'file' => $file_name, 'size' => $file['size']]);
                log_access('POST', 'uploads', 201);
                echo json_encode(['success' => true, 'data' => $data]);
                exit;
            } catch (Exception $e) {
                // Delete the uploaded file if database insert fails
                @unlink($full_path);
                log_error("Upload database insert failed", ['file' => $file_name, 'error' => $e->getMessage()]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to save document info']);
                exit;
            }
        }

        if ($method === 'DELETE' && preg_match('#uploads/(\d+)#', $uri, $m)) {
            // DELETE /uploads/:id - delete document
            $doc_id = $m[1];
            $doc = one("SELECT file_path FROM documents WHERE id = ?", [$doc_id]);

            if (!$doc) {
                log_error("Delete failed - document not found", ['doc_id' => $doc_id]);
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Document not found']);
                exit;
            }

            // Delete file from disk
            $full_path = __DIR__ . '/' . $doc['file_path'];
            if (file_exists($full_path)) {
                @unlink($full_path);
            }

            // Delete from database
            q("DELETE FROM documents WHERE id = ?", [$doc_id]);

            log_error("Document deleted", ['doc_id' => $doc_id, 'file' => $doc['file_path']]);
            log_access('DELETE', 'uploads/' . $doc_id, 200);
            echo json_encode(['success' => true]);
            exit;
        }

        http_response_code(404);
        log_error("Invalid uploads request", ['method' => $method, 'uri' => $uri]);
        echo json_encode(['success' => false, 'error' => 'Invalid request']);
        exit;
    }

    http_response_code(404);
    log_error("Endpoint not found", ['uri' => $uri, 'method' => $method]);
    echo json_encode(['success' => false, 'error' => 'Endpoint not found', 'uri' => $uri]);
} catch (Exception $e) {
    http_response_code(500);
    log_error("Request exception", ['error' => $e->getMessage(), 'code' => $e->getCode()]);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    $endTime = microtime(true);
    $responseTime = round(($endTime - $startTime) * 1000);
}
