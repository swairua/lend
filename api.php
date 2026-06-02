<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';

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

function logSystem($logType, $action, $details = [], $userId = null, $status = 'success', $entityType = null, $entityId = null) {
    global $db;
    try {
        $detailsJson = !empty($details) ? json_encode($details) : null;
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $stmt = pdo()->prepare("
            INSERT INTO system_logs (log_type, action, entity_type, entity_id, details, user_id, ip_address, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$logType, $action, $entityType, $entityId, $detailsJson, $userId, $ipAddress, $status]);
    } catch (Exception $e) {
        error_log("System logging failed: " . $e->getMessage());
    }
}

// Map audit-style actions to log_type for unified system_logs storage
function actionToLogType($action) {
    $map = [
        'loan_'              => 'loan_action',
        'payment_'           => 'payment',
        'borrower_'          => 'user_mgmt',
        'role_'              => 'admin_action',
        'user_'              => 'user_mgmt',
    ];
    foreach ($map as $prefix => $type) {
        if (strpos($action, $prefix) === 0) return $type;
    }
    return 'admin_action';
}

function logAudit($userId, $action, $entityType, $entityId, $details = []) {
    $logType = actionToLogType($action);
    logSystem($logType, $action, $details, $userId, 'success', $entityType, $entityId);
}

function encryptSmtpPass($plain) {
    if (!defined('APP_KEY') || empty($plain)) return $plain;
    $method = 'aes-256-cbc';
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($method));
    $encrypted = openssl_encrypt($plain, $method, APP_KEY, 0, $iv);
    return base64_encode($iv . '::' . $encrypted);
}

function decryptSmtpPass($encrypted) {
    if (!defined('APP_KEY') || empty($encrypted)) return $encrypted;
    $method = 'aes-256-cbc';
    $data = base64_decode($encrypted);
    if ($data === false) return $encrypted;
    $parts = explode('::', $data, 2);
    if (count($parts) !== 2) return $encrypted;
    return openssl_decrypt($parts[1], $method, APP_KEY, 0, $parts[0]);
}

function sendMail($to, $subject, $body, $isHtml = true) {
    try {
        $rows = all("SELECT key_name, key_value FROM settings WHERE key_name IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from')");
        $config = [];
        foreach ($rows as $r) $config[$r['key_name']] = $r['key_value'];
        if (empty($config['smtp_host']) || empty($config['smtp_user']) || empty($config['smtp_pass'])) {
            log_error("sendMail failed: SMTP not fully configured");
            return false;
        }
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->Port = intval($config['smtp_port'] ?? 587);
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp_user'];
        $mail->Password = decryptSmtpPass($config['smtp_pass']);
        $mail->SMTPSecure = (intval($config['smtp_port'] ?? 587) === 465)
            ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 30;
        $fromAddr = !empty($config['smtp_from']) ? $config['smtp_from'] : $config['smtp_user'];
        $mail->setFrom($fromAddr, 'Lending System');
        $mail->addReplyTo($fromAddr);
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->isHTML($isHtml);
        $mail->Body = $body;
        if (!$isHtml) {
            $mail->AltBody = strip_tags($body);
        }
        return $mail->send();
    } catch (Exception $e) {
        log_error("sendMail failed", ['to' => $to, 'error' => $e->getMessage()]);
        return false;
    }
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
            kra_pin TEXT,
            tcc_number TEXT,
            client_type VARCHAR(50) DEFAULT 'individual',
            is_verified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        // Migrate existing tables: add columns if missing (safe for re-runs)
        try { $p->exec("ALTER TABLE borrowers ADD COLUMN kra_pin TEXT"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE borrowers ADD COLUMN tcc_number TEXT"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE borrowers ADD COLUMN client_type VARCHAR(50) DEFAULT 'individual'"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE borrowers ADD COLUMN is_verified INTEGER DEFAULT 0"); } catch (Exception $e) {}

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
            interest_type VARCHAR(50) DEFAULT 'flat',
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
            status VARCHAR(50) DEFAULT 'pending',
            approved_by INTEGER,
            approved_at TIMESTAMP,
            released_by INTEGER,
            released_at TIMESTAMP,
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
            method VARCHAR(50) DEFAULT 'mpesa',
            reference TEXT,
            status VARCHAR(50) DEFAULT 'completed',
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
            payment_method VARCHAR(50) DEFAULT 'mpesa',
            reference_number TEXT,
            paid_by INTEGER,
            paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
            FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS disbursements (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            loan_id INTEGER NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            disbursement_method VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            loan_id INTEGER,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'general',
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
            loan_id INTEGER,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS mpesa_transactions (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            loan_id INTEGER,
            transaction_type VARCHAR(50) NOT NULL,
            phone TEXT NOT NULL,
            amount REAL,
            mpesa_reference TEXT UNIQUE,
            safaricom_receipt TEXT,
            checkout_request_id TEXT UNIQUE,
            command_id TEXT UNIQUE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            validation_result VARCHAR(100),
            response_code TEXT,
            response_message TEXT,
            request_payload TEXT,
            response_payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            log_type VARCHAR(50) NOT NULL,
            action VARCHAR(255) NOT NULL,
            entity_type VARCHAR(50),
            entity_id INTEGER,
            details TEXT,
            user_id INTEGER,
            ip_address VARCHAR(45),
            status VARCHAR(50) DEFAULT 'success',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            company TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS invoice_products (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            unit_price DECIMAL(15,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            unit_type VARCHAR(50) DEFAULT 'piece',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS quotations (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            quote_number VARCHAR(50) NOT NULL UNIQUE,
            customer_id INTEGER,
            client_name TEXT NOT NULL,
            client_email TEXT,
            client_phone TEXT,
            client_address TEXT,
            quote_date DATE NOT NULL,
            expiry_date DATE,
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_total DECIMAL(15,2) DEFAULT 0,
            discount DECIMAL(15,2) DEFAULT 0,
            grand_total DECIMAL(15,2) DEFAULT 0,
            notes TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS quotation_items (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            quotation_id INTEGER NOT NULL,
            invoice_product_id INTEGER,
            description TEXT NOT NULL,
            quantity DECIMAL(15,2) NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            amount DECIMAL(15,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
            FOREIGN KEY (invoice_product_id) REFERENCES invoice_products(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            invoice_number VARCHAR(50) NOT NULL UNIQUE,
            quotation_id INTEGER,
            customer_id INTEGER,
            client_name TEXT NOT NULL,
            client_email TEXT,
            client_phone TEXT,
            client_address TEXT,
            invoice_date DATE NOT NULL,
            due_date DATE,
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_total DECIMAL(15,2) DEFAULT 0,
            discount DECIMAL(15,2) DEFAULT 0,
            grand_total DECIMAL(15,2) DEFAULT 0,
            notes TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            invoice_id INTEGER NOT NULL,
            invoice_product_id INTEGER,
            description TEXT NOT NULL,
            quantity DECIMAL(15,2) NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            amount DECIMAL(15,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY (invoice_product_id) REFERENCES invoice_products(id) ON DELETE SET NULL
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            key_name VARCHAR(50) NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            system_role INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $p->exec("CREATE TABLE IF NOT EXISTS role_permissions (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            role_id INTEGER NOT NULL,
            permission_key VARCHAR(255) NOT NULL,
            granted INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (role_id, permission_key),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )");

        // Migrate existing quotations / invoices — add customer_id column if missing
        try { $p->exec("ALTER TABLE quotations ADD COLUMN customer_id INTEGER"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE invoices ADD COLUMN customer_id INTEGER"); } catch (Exception $e) {}
        // Fix TEXT→VARCHAR for UNIQUE columns (MySQL requires VARCHAR for UNIQUE)
        try { $p->exec("ALTER TABLE quotations MODIFY COLUMN quote_number VARCHAR(50) NOT NULL"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE invoices MODIFY COLUMN invoice_number VARCHAR(50) NOT NULL"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE quotations ADD UNIQUE (quote_number)"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE invoices ADD UNIQUE (invoice_number)"); } catch (Exception $e) {}
        // Rename system_logs.timestamp → created_at for consistency with all query code
        try { $p->exec("ALTER TABLE system_logs CHANGE COLUMN `timestamp` `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch (Exception $e) {}
        // Add entity_type, entity_id, ip_address columns to system_logs for richer audit context
        try { $p->exec("ALTER TABLE system_logs ADD COLUMN entity_type VARCHAR(50)"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE system_logs ADD COLUMN entity_id INTEGER"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE system_logs ADD COLUMN ip_address VARCHAR(45)"); } catch (Exception $e) {}
        // Add released_by / released_at columns to loans table for release workflow
        try { $p->exec("ALTER TABLE loans ADD COLUMN released_by INTEGER REFERENCES users(id) ON DELETE SET NULL"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE loans ADD COLUMN released_at TIMESTAMP"); } catch (Exception $e) {}
        // Add password reset token columns to users table
        try { $p->exec("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL"); } catch (Exception $e) {}
        try { $p->exec("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL"); } catch (Exception $e) {}

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

        // Seed roles and permissions
        $seedRoles = [
            ['admin', 'Admin', 'Full system access', true],
            ['releaser', 'Releaser', 'Can release loans', false],
            ['manager', 'Manager', 'Can manage loans and repayments', false],
            ['agent', 'Agent', 'Can handle customer interactions', false],
            ['borrower', 'Borrower', 'Can apply for and manage loans', false],
        ];

        $allPerms = [
            'Dashboard', 'Loan Applications (view)', 'Approve Loans', 'Release Loans', 'Disburse Loans',
            'Create Loan', 'Loan Categories', 'Loan Products', 'Borrowers', 'Repayments', 'Disbursements',
            'Reports', 'Users', 'Settings', 'System Logs', 'Customers / Invoicing', 'Admin Messages',
            'My Loans', 'Apply for Loan', 'Payments', 'Profile', 'Messages',
        ];

        foreach ($seedRoles as [$key, $name, $desc, $sysRole]) {
            $existing = one("SELECT id FROM roles WHERE key_name = ?", [$key]);
            if (!$existing) {
                q("INSERT INTO roles (key_name, name, description, system_role) VALUES (?, ?, ?, ?)",
                  [$key, $name, $desc, $sysRole ? 1 : 0]);
                $roleId = (int)pdo()->lastInsertId();

                // Set default permissions based on role
                $defaultPerms = [];
                if ($key === 'admin') {
                    $defaultPerms = array_fill_keys($allPerms, true);
                } elseif ($key === 'releaser') {
                    $defaultPerms = array_fill_keys(['Dashboard', 'Loan Applications (view)', 'Release Loans', 'Reports'], true);
                } elseif ($key === 'manager') {
                    $defaultPerms = array_fill_keys(['Dashboard', 'Loan Applications (view)', 'Approve Loans', 'Create Loan', 'Borrowers', 'Repayments', 'Reports'], true);
                } elseif ($key === 'agent') {
                    $defaultPerms = array_fill_keys(['Dashboard', 'Borrowers', 'Messages', 'Payments'], true);
                } elseif ($key === 'borrower') {
                    $defaultPerms = array_fill_keys(['Dashboard', 'My Loans', 'Apply for Loan', 'Payments', 'Profile', 'Messages'], true);
                }

                foreach ($allPerms as $perm) {
                    $granted = isset($defaultPerms[$perm]) ? 1 : 0;
                    q("INSERT INTO role_permissions (role_id, permission_key, granted) VALUES (?, ?, ?)",
                      [$roleId, $perm, $granted]);
                }
                log_error("Role seeded", ['key' => $key, 'id' => $roleId]);
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
        } else {
            // Fix category names if they differ from seed (e.g. after manual reordering)
            $fixed = 0;
            $expected = [
                1 => ['Asset Finance', 'ASSET', 'Asset purchase/financing with logbook transfer'],
                2 => ['Micro Finance', 'MICRO', 'Small loans against salary or security'],
                3 => ['LPO Finance', 'LPO', 'Advancing against Local Purchase Orders'],
            ];
            foreach ($expected as $id => $vals) {
                $row = one("SELECT name, code FROM loan_categories WHERE id=?", [$id]);
                if ($row && ($row['name'] !== $vals[0] || $row['code'] !== $vals[1])) {
                    q("UPDATE loan_categories SET name=?, code=?, description=? WHERE id=?", [$vals[0], $vals[1], $vals[2], $id]);
                    $fixed++;
                }
            }
            if ($fixed) {
                log_error("Loan categories corrected", ['fixed_count' => $fixed]);
            }
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

        // Seed default settings
        $defaults = [
            'company_name' => 'Wayrus Lending',
            'company_email' => '',
            'company_phone' => '',
            'company_address' => '',
            'default_currency' => 'KES',
            'default_interest_rate' => '10',
            'default_processing_fee' => '4.00',
            'late_penalty_rate' => '2.5',
            'asset_transfer_fee' => '7000',
            'tracking_system_fee' => '25000',
        ];
        foreach ($defaults as $k => $v) {
            q("INSERT IGNORE INTO settings (key_name, key_value) VALUES (?, ?)", [$k, $v]);
        }

        // Cleanup: remove legacy 'currency' key — use 'default_currency' instead
        q("DELETE FROM settings WHERE key_name = 'currency'");

        // Create performance indexes
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)",
            "CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id)",
            "CREATE INDEX IF NOT EXISTS idx_repayments_loan_id ON repayments(loan_id)",
        ];
        foreach ($indexes as $indexSql) {
            try {
                $p->exec($indexSql);
            } catch (Exception $e) {
                // Index might already exist, continue
            }
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
function requireRole($u, ...$roles) {
    if (!in_array($u['role'], $roles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Access denied. Required role: ' . implode(' or ', $roles)]);
        exit;
    }
}

try {
    $resource = explode('/', $uri)[0] ?? '';

    // ====================================================================
    // AUTH
    // ====================================================================
    if ($resource === 'auth') {
        // Forgot password — generates reset token and sends email
        if ($method === 'POST' && strpos($uri, 'auth/forgot-password') !== false) {
            $d = input();
            $email = $d['email'] ?? '';
            if (!$email) {
                echo json_encode(['success' => false, 'error' => 'Email is required']);
                exit;
            }
            $user = one("SELECT id, name, email FROM users WHERE email = ?", [$email]);
            if (!$user) {
                // Don't reveal whether the email exists
                echo json_encode(['success' => true, 'message' => 'If the email exists, a reset link has been sent']);
                exit;
            }
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
            q("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?", [$token, $expires, $user['id']]);
            $resetLink = "https://lending.wayrus.co.ke/reset-password/$token";
            $subject = "Password Reset - Lending System";
            $body = "<h2>Password Reset</h2><p>Dear {$user['name']},</p><p>We received a request to reset your password.</p>";
            $body .= "<p>Click the link below to reset your password (valid for 1 hour):</p>";
            $body .= "<p><a href=\"$resetLink\" style=\"display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;\">Reset Password</a></p>";
            $body .= "<p>If you did not request this, please ignore this email.</p><p>Best regards,<br/>Lending System</p>";
            sendMail($email, $subject, $body, true);
            log_access('POST', 'auth/forgot-password', 200);
            echo json_encode(['success' => true, 'message' => 'If the email exists, a reset link has been sent']);
            exit;
        }

        // Reset password — validates token and updates password
        if ($method === 'POST' && strpos($uri, 'auth/reset-password') !== false) {
            $d = input();
            $token = $d['token'] ?? '';
            $password = $d['password'] ?? '';
            if (!$token || !$password) {
                echo json_encode(['success' => false, 'error' => 'Token and password are required']);
                exit;
            }
            if (strlen($password) < 6) {
                echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters']);
                exit;
            }
            $user = one("SELECT id, name, email FROM users WHERE reset_token = ? AND reset_token_expires > CURRENT_TIMESTAMP", [$token]);
            if (!$user) {
                echo json_encode(['success' => false, 'error' => 'Invalid or expired reset token']);
                exit;
            }
            $hashed = password_hash($password, PASSWORD_BCRYPT);
            q("UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [$hashed, $user['id']]);
            logSystem('user_mgmt', 'password_reset', ['user_id' => $user['id']], $user['id'], 'success', 'user', $user['id']);
            log_access('POST', 'auth/reset-password', 200);
            echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
            exit;
        }

        if ($method === 'POST' && strpos($uri, 'auth/login') !== false) {
            $d = input();
            $email = $d['email'] ?? '';
            $password = $d['password'] ?? '';

            try {
                $user = one("SELECT id, email, name, phone, password, role, is_active FROM users WHERE email = ?", [$email]);

                if (!$user || !$user['is_active']) {
                    http_response_code(401);
                    echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
                    exit;
                }

                if (!password_verify($password, $user['password'])) {
                    http_response_code(401);
                    echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
                    exit;
                }

                // Successful login - create token and update last_login
                $tok = 't_' . bin2hex(random_bytes(32));
                q("INSERT INTO tokens (user_id, token) VALUES (?, ?)", [$user['id'], $tok]);
                q("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [$user['id']]);
                $b = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);

                $payload = [
                    'id' => $user['id'], 'email' => $user['email'], 'name' => $user['name'],
                    'phone' => $user['phone'], 'role' => $user['role'],
                    'borrower_id' => $b['id'] ?? null,
                ];
                echo json_encode(['success' => true, 'token' => $tok, 'user' => $payload,
                                  'data' => ['token' => $tok, 'user' => $payload]]);
                exit;
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Server error']);
                exit;
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
            $allLoansData = all("SELECT id, status FROM loans WHERE borrower_id = ?", [$bid]);
            error_log("[borrower/dashboard] User={$user['id']}, Borrower={$bid}, All loans: " . json_encode($allLoansData));

            $totalLoans  = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ?", [$bid]);
            $activeLoans = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ? AND status='active'", [$bid]);
            $pending     = one("SELECT COUNT(*) c FROM loans WHERE borrower_id = ? AND status='pending'", [$bid]);
            error_log("[borrower/dashboard] User={$user['id']}, Borrower={$bid}, Total={$totalLoans['c']}, Active={$activeLoans['c']}, Pending={$pending['c']}");
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
            $loan = one("SELECT l.*, u.phone as borrower_phone, lp.name as product_name, lp.description as product_description
                         FROM loans l LEFT JOIN users u ON l.borrower_id = u.id LEFT JOIN loan_products lp ON l.product_id = lp.id
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
                    logAudit($user['id'], 'loan_created', 'loan', $loanId, [
                        'loan_amount' => $amount,
                        'annual_interest_rate' => $product['interest_rate'],
                        'term_months' => $term,
                        'product_id' => $product['id'],
                        'product_name' => $product['name']
                    ]);
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
                $totalCount = isset($tot['c']) ? intval($tot['c']) : 0;
                error_log("[borrower/loans] User={$user['id']}, Borrower={$bid}, Found=" . $totalCount . " total, Returning=" . count($loans) . ", Page=$page, Limit=$limit, Offset=$off");
                foreach ($loans as &$l) {
                    $p = one("SELECT COALESCE(SUM(amount),0) t FROM repayments WHERE loan_id = ?", [$l['id']]);
                    $l['total_paid'] = $p['t'];
                    $l['balance'] = floatval($l['total_amount']) - floatval($p['t']);
                }
            }
            log_access('GET', 'borrower/loans', 200);
            $finalTotalCount = isset($tot['c']) ? $tot['c'] : 0;
            echo json_encode(['success' => true, 'data' => ['loans' => $loans,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $finalTotalCount]]]);
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
        requireRole($user, 'admin', 'releaser', 'manager', 'agent');

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
            $monthly = all("SELECT DATE_FORMAT(created_at, '%Y-%m') month, COUNT(*) count, COALESCE(SUM(principal_amount),0) total
                            FROM loans WHERE status IN ('active','completed') AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                            GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month");
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

        // Create new loan (admin registration of pre-existing loans)
        if ($method === 'POST' && $uri === 'admin/loans') {
            $u = auth();
            try {
                $d = input();

                $borrower_id = $d['borrower_id'] ?? null;
                $product_id = $d['product_id'] ?? null;
                $amount = $d['amount'] ?? null;
                $term_months = $d['term_months'] ?? null;

                if (!$borrower_id || !$product_id || !$amount || !$term_months) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Missing required fields: borrower_id, product_id, amount, term_months']);
                    exit;
                }

                $borrower = one("SELECT id FROM borrowers WHERE id = ?", [$borrower_id]);
                if (!$borrower) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Borrower not found']);
                    exit;
                }

                $product = one("SELECT * FROM loan_products WHERE id = ?", [$product_id]);
                if (!$product) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Product not found']);
                    exit;
                }

                $interest_rate = floatval($product['interest_rate'] ?? 10);
                $total_amount = floatval($amount) + (floatval($amount) * $interest_rate * intval($term_months) / 100 / 12);

                $due_date = new DateTime();
                $due_date->add(new DateInterval('P' . intval($term_months) . 'M'));

                $security_details = $d['security_details'] ?? null;
                $guarantor_details = $d['guarantor_details'] ?? null;
                $purpose = $d['purpose'] ?? null;
                $document_ids = $d['document_ids'] ?? [];

                q("INSERT INTO loans (borrower_id, product_id, principal_amount, total_amount, term_months, interest_rate, status, due_date, security_details, guarantor_details, purpose)
                   VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
                  [$borrower_id, $product_id, floatval($amount), $total_amount, intval($term_months), $interest_rate, $due_date->format('Y-m-d'), $security_details, $guarantor_details, $purpose]);

                $loanId = pdo()->lastInsertId();

                if (is_array($document_ids) && count($document_ids) > 0) {
                    foreach ($document_ids as $docId) {
                        q("UPDATE documents SET loan_id = ? WHERE id = ? AND borrower_id = ?", [$loanId, $docId, $borrower_id]);
                    }
                }

                logAudit($u['id'], 'loan_created_admin', 'loan', $loanId, [
                    'borrower_id' => $borrower_id,
                    'product_id' => $product_id,
                    'principal_amount' => floatval($amount),
                    'term_months' => intval($term_months),
                    'security_details' => $security_details,
                    'guarantor_details' => $guarantor_details,
                    'document_ids' => $document_ids,
                    'created_by_user_id' => $u['id']
                ]);

                log_access('POST', 'admin/loans', 201);
                echo json_encode(['success' => true, 'data' => ['id' => intval($loanId)]]);
                exit;
            } catch (Exception $e) {
                log_error("Loan creation exception", ['error' => $e->getMessage()]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to create loan']);
                exit;
            }
        }

        // Approve loan (admin only)
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/approve$#', $uri, $m)) {
            requireRole($user, 'admin');
            try {
                $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
                if (!$loan || $loan['status'] !== 'pending') {
                    log_error("Loan approval failed - not pending", ['loan_id' => $m[1], 'status' => $loan['status'] ?? 'unknown']);
                    echo json_encode(['success' => false, 'error' => 'Loan is not pending']); 
                    exit;
                }
                $d = input(); $approve = $d['approve'] ?? true;
                $ns = $approve ? 'approved' : 'rejected';
                q("UPDATE loans SET status=?, approved_by=?, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$ns, $user['id'], $m[1]]);
                $b = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
                q("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?,?,?,?,?,?)",
                  [$user['id'], $b['user_id'], $m[1],
                   $approve ? 'Loan Approved' : 'Loan Rejected',
                   $approve ? "Your loan #{$m[1]} has been approved." : "Your loan #{$m[1]} has been rejected.",
                   $approve ? 'approval' : 'rejection']);
                // Email notification
                $borrowerUser = one("SELECT email, name FROM users WHERE id = ?", [$b['user_id']]);
                if ($borrowerUser) {
                    $actionLabel = $approve ? 'Approved' : 'Rejected';
                    $subject = "Loan $actionLabel - Loan #{$m[1]}";
                    $body = "<h2>Loan $actionLabel</h2><p>Dear {$borrowerUser['name']},</p>";
                    $body .= "<p>Your loan application #{$m[1]} has been <strong>" . strtolower($actionLabel) . "</strong>.</p>";
                    if (!$approve && !empty($d['reason'])) $body .= "<p><strong>Reason:</strong> " . htmlspecialchars($d['reason']) . "</p>";
                    $body .= "<p>Best regards,<br/>Lending System</p>";
                    sendMail($borrowerUser['email'], $subject, $body, true);
                }
                logAudit($user['id'], $approve ? 'loan_approved' : 'loan_rejected', 'loan', $m[1], [
                    'previous_status' => 'pending',
                    'new_status' => $ns,
                    'approved_by_user_id' => $user['id'],
                    'rejection_reason' => $approve ? null : ($d['reason'] ?? null)
                ]);
                log_access('POST', 'admin/loans/' . $m[1] . '/approve', 200);
                echo json_encode(['success' => true]);
                exit;
            } catch (Exception $e) {
                log_error("Loan approval exception", ['loan_id' => $m[1], 'error' => $e->getMessage()]);
                throw $e;
            }
        }
        // Release approved loan (admin or releaser)
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/release$#', $uri, $m)) {
            requireRole($user, 'admin', 'releaser');
            try {
                $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
                if (!$loan || $loan['status'] !== 'approved') {
                    echo json_encode(['success' => false, 'error' => 'Loan must be approved first']);
                    exit;
                }
                q("UPDATE loans SET status='released', released_by=?, released_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$user['id'], $m[1]]);
                $borrowerUser = one("SELECT u.email, u.name FROM loans l JOIN borrowers b ON l.borrower_id = b.id JOIN users u ON b.user_id = u.id WHERE l.id = ?", [$m[1]]);
                if ($borrowerUser) {
                    $subject = "Loan Released for Disbursement - Loan #{$m[1]}";
                    $body = "<h2>Loan Released</h2><p>Dear {$borrowerUser['name']},</p><p>Your loan #{$m[1]} has been released and is ready for disbursement.</p><p>You will be notified once the funds have been sent.</p><p>Best regards,<br/>Lending System</p>";
                    sendMail($borrowerUser['email'], $subject, $body, true);
                }
                logAudit($user['id'], 'loan_released', 'loan', $m[1], [
                    'previous_status' => 'approved',
                    'new_status' => 'released',
                    'released_by_user_id' => $user['id']
                ]);
                log_access('POST', 'admin/loans/' . $m[1] . '/release', 200);
                echo json_encode(['success' => true, 'message' => 'Loan released for disbursement']);
                exit;
            } catch (Exception $e) {
                log_error("Loan release exception", ['loan_id' => $m[1], 'error' => $e->getMessage()]);
                throw $e;
            }
        }
        // Disburse loan (admin or releaser) — requires 'released' status
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/disburse$#', $uri, $m)) {
            requireRole($user, 'admin', 'releaser');
            try {
                $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
                if (!$loan || $loan['status'] !== 'released') {
                    log_error("Loan disbursement failed - not released", ['loan_id' => $m[1], 'status' => $loan['status'] ?? 'unknown']);
                    echo json_encode(['success' => false, 'error' => 'Loan must be released first']); 
                    exit;
                }
                $d = input();
                $amt = $d['disbursement_amount'] ?? $loan['principal_amount'];
                q("UPDATE loans SET status='active', disbursed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$m[1]]);
                q("INSERT INTO payments (loan_id, type, amount, method, reference, status)
                   VALUES (?,'disbursement',?,'bank',?,'completed')", [$m[1], $amt, $d['reference'] ?? null]);
                $b = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
                q("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type)
                   VALUES (?,?,?,'Loan Disbursed',?,'disbursement')",
                  [$user['id'], $b['user_id'], $m[1], "Your loan #{$m[1]} has been disbursed."]);
                $borrowerUser = one("SELECT email, name FROM users WHERE id = ?", [$b['user_id']]);
                if ($borrowerUser) {
                    $subject = "Loan Disbursed - Loan #{$m[1]}";
                    $body = "<h2>Loan Disbursed</h2><p>Dear {$borrowerUser['name']},</p><p>Your loan #{$m[1]} has been disbursed.</p>";
                    $body .= "<p><strong>Amount:</strong> " . number_format($amt, 2) . "</p>";
                    if (!empty($d['reference'])) $body .= "<p><strong>Reference:</strong> " . htmlspecialchars($d['reference']) . "</p>";
                    $body .= "<p>Best regards,<br/>Lending System</p>";
                    sendMail($borrowerUser['email'], $subject, $body, true);
                }
                logAudit($user['id'], 'loan_disbursed', 'loan', $m[1], [
                    'disbursement_amount' => $amt,
                    'method' => 'bank',
                    'reference' => $d['reference'] ?? null,
                    'disbursed_by_user_id' => $user['id'],
                    'principal_amount' => floatval($loan['principal_amount'])
                ]);
                log_access('POST', 'admin/loans/' . $m[1] . '/disburse', 200);
                echo json_encode(['success' => true]);
                exit;
            } catch (Exception $e) {
                log_error("Loan disbursement exception", ['loan_id' => $m[1], 'error' => $e->getMessage()]);
                throw $e;
            }
        }
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/reactivate$#', $uri, $m)) {
            requireRole($user, 'admin');
            $loan = one("SELECT status FROM loans WHERE id = ?", [$m[1]]);
            if (!$loan) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Loan not found']);
                exit;
            }
            $oldStatus = $loan['status'];
            q("UPDATE loans SET status='pending', approved_by=NULL, approved_at=NULL, released_by=NULL, released_at=NULL, disbursed_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$m[1]]);
            logAudit($user['id'], 'loan_reactivated', 'loan', $m[1], [
                'previous_status' => $oldStatus,
                'new_status' => 'pending',
                'reactivated_by_user_id' => $user['id']
            ]);
            log_access('POST', 'admin/loans/' . $m[1] . '/reactivate', 200);
            echo json_encode(['success' => true]);
            exit;
        }
        if ($method === 'POST' && preg_match('#admin/loans/(\d+)/default$#', $uri, $m)) {
            requireRole($user, 'admin');
            $loan = one("SELECT status FROM loans WHERE id = ?", [$m[1]]);
            if (!$loan) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Loan not found']);
                exit;
            }
            if ($loan['status'] === 'defaulted') {
                echo json_encode(['success' => false, 'error' => 'Loan is already defaulted']);
                exit;
            }
            $oldStatus = $loan['status'];
            q("UPDATE loans SET status='defaulted', updated_at=CURRENT_TIMESTAMP WHERE id=?", [$m[1]]);
            logAudit($user['id'], 'loan_defaulted', 'loan', $m[1], [
                'previous_status' => $oldStatus,
                'new_status' => 'defaulted',
                'defaulted_by_user_id' => $user['id']
            ]);
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
            $sql = "SELECT l.*, u.name borrower_name, u.email borrower_email, lp.name product_name, lc.name category_name,
                           COALESCE(SUM(r.amount), 0) as total_paid
                    FROM loans l
                    LEFT JOIN borrowers b ON l.borrower_id=b.id
                    LEFT JOIN users u ON b.user_id=u.id
                    LEFT JOIN loan_products lp ON l.product_id=lp.id
                    LEFT JOIN loan_categories lc ON lp.category_id=lc.id
                    LEFT JOIN repayments r ON l.id=r.loan_id
                    WHERE 1=1";
            $params = [];
            if ($status && $status !== 'all') { $sql .= " AND l.status = ?"; $params[] = $status; }
            $sql .= " GROUP BY l.id ORDER BY l.created_at DESC LIMIT $limit OFFSET $off";
            $loans = all($sql, $params);
            foreach ($loans as &$l) {
                $l['balance'] = floatval($l['total_amount']) - floatval($l['total_paid']);
            }
            $countSql = "SELECT COUNT(*) c FROM loans WHERE 1=1";
            $countParams = [];
            if ($status && $status !== 'all') { $countSql .= " AND status = ?"; $countParams[] = $status; }
            $tot = one($countSql, $countParams);
            $totalCount = isset($tot['c']) ? $tot['c'] : 0;
            log_access('GET', 'admin/loans', 200);
            echo json_encode(['success' => true, 'data' => ['loans' => $loans,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $totalCount]]]);
            exit;
        }

        // SSE Stream for loan updates
        if (strpos($uri, 'admin/loans/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastUpdateId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $status = $_GET['status'] ?? null;
            $pollInterval = 2; // Check for updates every 2 seconds
            $maxDuration = 300; // 5 minutes max connection time
            $startTime = time();

            function sendSSEData($id, $data, $eventName = 'loan-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getUpdatedLoans($since, $status) {
                $sql = "SELECT l.*, u.name borrower_name, u.email borrower_email, lp.name product_name,
                               lc.name category_name, COALESCE(SUM(r.amount), 0) as total_paid,
                               UNIX_TIMESTAMP(l.updated_at) as updated_timestamp
                        FROM loans l
                        LEFT JOIN borrowers b ON l.borrower_id=b.id
                        LEFT JOIN users u ON b.user_id=u.id
                        LEFT JOIN loan_products lp ON l.product_id=lp.id
                        LEFT JOIN loan_categories lc ON lp.category_id=lc.id
                        LEFT JOIN repayments r ON l.id=r.loan_id
                        WHERE UNIX_TIMESTAMP(l.updated_at) > ?";
                $params = [$since];
                if ($status && $status !== 'all') {
                    $sql .= " AND l.status = ?";
                    $params[] = $status;
                }
                $sql .= " GROUP BY l.id ORDER BY l.updated_at DESC";
                return all($sql, $params);
            }

            $currentTimestamp = time();
            sendSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to loan stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $updatedLoans = getUpdatedLoans($lastUpdateId, $status);

                if (!empty($updatedLoans)) {
                    foreach ($updatedLoans as $loan) {
                        $loan['balance'] = floatval($loan['total_amount']) - floatval($loan['total_paid']);
                        $newTimestamp = $loan['updated_timestamp'];
                        sendSSEData($newTimestamp, $loan);
                        $lastUpdateId = max($lastUpdateId, $newTimestamp);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // SSE Stream for borrower updates
        if (strpos($uri, 'admin/borrowers/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastUpdateId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $pollInterval = 2;
            $maxDuration = 300;
            $startTime = time();

            function sendSSEData($id, $data, $eventName = 'borrower-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getUpdatedBorrowers($since) {
                $sql = "SELECT u.id, u.name, u.email, u.phone, u.is_active,
                               UNIX_TIMESTAMP(u.updated_at) as updated_timestamp,
                               b.id borrower_id, b.national_id, b.address, b.business_name, b.business_type,
                               b.monthly_income, b.credit_score
                        FROM users u
                        LEFT JOIN borrowers b ON u.id = b.user_id
                        WHERE u.role = 'borrower' AND UNIX_TIMESTAMP(u.updated_at) > ?
                        ORDER BY u.updated_at DESC";
                return all($sql, [$since]);
            }

            $currentTimestamp = time();
            sendSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to borrower stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $updatedBorrowers = getUpdatedBorrowers($lastUpdateId);

                if (!empty($updatedBorrowers)) {
                    foreach ($updatedBorrowers as $borrower) {
                        $newTimestamp = $borrower['updated_timestamp'];
                        sendSSEData($newTimestamp, $borrower);
                        $lastUpdateId = max($lastUpdateId, $newTimestamp);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // SSE Stream for repayment updates
        if (strpos($uri, 'admin/repayments/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastUpdateId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $pollInterval = 2;
            $maxDuration = 300;
            $startTime = time();

            function sendRepaymentSSEData($id, $data, $eventName = 'repayment-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getUpdatedRepayments($since) {
                $sql = "SELECT r.*, u.name borrower_name, u.email borrower_email,
                               l.status loan_status, l.principal_amount,
                               UNIX_TIMESTAMP(r.created_at) as updated_timestamp
                        FROM repayments r
                        LEFT JOIN loans l ON r.loan_id = l.id
                        LEFT JOIN borrowers b ON l.borrower_id = b.id
                        LEFT JOIN users u ON b.user_id = u.id
                        WHERE UNIX_TIMESTAMP(r.created_at) > ?
                        ORDER BY r.created_at DESC";
                return all($sql, [$since]);
            }

            $currentTimestamp = time();
            sendRepaymentSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to repayment stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendRepaymentSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $updatedRepayments = getUpdatedRepayments($lastUpdateId);

                if (!empty($updatedRepayments)) {
                    foreach ($updatedRepayments as $repayment) {
                        $newTimestamp = $repayment['updated_timestamp'];
                        sendRepaymentSSEData($newTimestamp, $repayment);
                        $lastUpdateId = max($lastUpdateId, $newTimestamp);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // SSE Stream for dashboard stats updates
        if (strpos($uri, 'admin/stats/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastCheckTime = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $pollInterval = 1;
            $maxDuration = 300;
            $startTime = time();

            function sendStatsSSEData($id, $data, $eventName = 'stats-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getDashboardStats() {
                $stats = [];
                $result = one("SELECT
                    (SELECT COUNT(*) FROM users WHERE role='borrower') as total_borrowers,
                    (SELECT COUNT(*) FROM loans) as total_loans,
                    (SELECT COUNT(*) FROM loans WHERE status='active') as active_loans,
                    (SELECT COUNT(*) FROM loans WHERE status='pending') as pending_loans,
                    (SELECT COALESCE(SUM(principal_amount), 0) FROM loans WHERE status IN ('active','completed','defaulted')) as total_disbursed,
                    (SELECT COALESCE(SUM(amount), 0) FROM repayments) as total_collected");

                $stats['total_borrowers'] = intval($result['total_borrowers'] ?? 0);
                $stats['total_loans'] = intval($result['total_loans'] ?? 0);
                $stats['active_loans'] = intval($result['active_loans'] ?? 0);
                $stats['pending_loans'] = intval($result['pending_loans'] ?? 0);
                $stats['total_disbursed'] = floatval($result['total_disbursed'] ?? 0);
                $stats['total_collected'] = floatval($result['total_collected'] ?? 0);
                $stats['timestamp'] = time();
                return $stats;
            }

            $currentTimestamp = time();
            sendStatsSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to stats stream'
            ], 'connected');

            $lastStats = null;
            $lastStatsJson = null;

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendStatsSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $currentStats = getDashboardStats();
                $currentStatsJson = json_encode($currentStats);

                if ($lastStatsJson === null || $lastStatsJson !== $currentStatsJson) {
                    sendStatsSSEData($currentStats['timestamp'], $currentStats);
                    $lastStatsJson = $currentStatsJson;
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // Borrowers
        if (strpos($uri, 'admin/borrowers') !== false) {

            // POST /admin/borrowers – create a new borrower (user + borrower record)
            if ($method === 'POST') {
                $u = auth();
                $d = input();
                $name = trim($d['name'] ?? '');
                $email = trim($d['email'] ?? '');
                $phone = trim($d['phone'] ?? '');
                $password = $d['password'] ?? bin2hex(random_bytes(6));
                if (!$name || !$email) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Name and email are required']);
                    exit;
                }
                $existing = one("SELECT id FROM users WHERE email = ?", [$email]);
                if ($existing) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'A user with this email already exists']);
                    exit;
                }
                try {
                    pdo()->beginTransaction();
                    $hashed = password_hash($password, PASSWORD_BCRYPT);
                    q("INSERT INTO users (email, password, name, phone, role, is_active) VALUES (?, ?, ?, ?, 'borrower', 1)",
                      [$email, $hashed, $name, $phone]);
                    $userId = pdo()->lastInsertId();
                    $nationalId = $d['national_id'] ?? null;
                    $address = $d['address'] ?? null;
                    $businessName = $d['business_name'] ?? null;
                    $businessType = $d['business_type'] ?? null;
                    $monthlyIncome = $d['monthly_income'] ?? null;
                    $creditScore = $d['credit_score'] ?? 750;
                    q("INSERT INTO borrowers (user_id, national_id, address, business_name, business_type, monthly_income, credit_score)
                       VALUES (?, ?, ?, ?, ?, ?, ?)",
                      [$userId, $nationalId, $address, $businessName, $businessType, $monthlyIncome, $creditScore]);
                    $borrowerId = pdo()->lastInsertId();
                    pdo()->commit();
                    $borrower = one("SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
                                            b.id borrower_id, b.national_id, b.address, b.business_name, b.business_type,
                                            b.monthly_income, b.credit_score, b.kra_pin, b.tcc_number, b.client_type, b.is_verified
                                     FROM users u LEFT JOIN borrowers b ON u.id = b.user_id
                                     WHERE u.id = ?", [$userId]);
                    logAudit($u['id'], 'borrower_created_admin', 'borrower', $borrowerId, ['email' => $email]);
                    log_access('POST', 'admin/borrowers', 201);
                    echo json_encode(['success' => true, 'data' => $borrower, 'generated_password' => $password]);
                    exit;
                } catch (Exception $e) {
                    pdo()->rollBack();
                    log_error("Borrower creation failed", ['error' => $e->getMessage()]);
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to create borrower']);
                    exit;
                }
            }

            // PUT /admin/borrowers/{id} – update borrower KYC/details
            if ($method === 'PUT' && preg_match('#admin/borrowers/(\d+)$#', $uri, $m)) {
                $d = input();
                $fields = [];
                $params = [];
                foreach (['national_id','address','business_name','business_type','monthly_income','credit_score','kra_pin','tcc_number','client_type','is_verified'] as $f) {
                    if (array_key_exists($f, $d)) {
                        $fields[] = "$f = ?";
                        $params[] = $d[$f];
                    }
                }
                if (empty($fields)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'No fields to update']);
                    exit;
                }
                $params[] = $m[1];
                q("UPDATE borrowers SET " . implode(', ', $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?", $params);
                log_access('PUT', 'admin/borrowers/' . $m[1], 200);
                echo json_encode(['success' => true, 'message' => 'Borrower updated']);
                exit;
            }

            // GET /admin/borrowers – list borrowers
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 20); $off = ($page - 1) * $limit;
            $rows = all("SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
                                b.id borrower_id, b.national_id, b.address, b.business_name, b.business_type,
                                b.monthly_income, b.credit_score, b.kra_pin, b.tcc_number, b.client_type, b.is_verified
                         FROM users u LEFT JOIN borrowers b ON u.id = b.user_id
                         WHERE u.role = 'borrower' ORDER BY u.created_at DESC LIMIT $limit OFFSET $off");
            $tot = one("SELECT COUNT(*) c FROM users WHERE role='borrower'");
            log_access('GET', 'admin/borrowers', 200);
            echo json_encode(['success' => true, 'data' => ['borrowers' => $rows,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }

        // SSE Stream for category updates
        if (strpos($uri, 'admin/categories/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastUpdateId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $pollInterval = 2;
            $maxDuration = 300;
            $startTime = time();

            function sendCategorySSEData($id, $data, $eventName = 'category-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getUpdatedCategories($since) {
                $sql = "SELECT *, UNIX_TIMESTAMP(updated_at) as updated_timestamp
                        FROM loan_categories
                        WHERE UNIX_TIMESTAMP(updated_at) > ?
                        ORDER BY updated_at DESC";
                return all($sql, [$since]);
            }

            $currentTimestamp = time();
            sendCategorySSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to category stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendCategorySSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $updatedCategories = getUpdatedCategories($lastUpdateId);

                if (!empty($updatedCategories)) {
                    foreach ($updatedCategories as $category) {
                        $newTimestamp = $category['updated_timestamp'];
                        sendCategorySSEData($newTimestamp, $category);
                        $lastUpdateId = max($lastUpdateId, $newTimestamp);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // SSE Stream for product updates
        if (strpos($uri, 'admin/products/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastUpdateId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $pollInterval = 2;
            $maxDuration = 300;
            $startTime = time();

            function sendProductSSEData($id, $data, $eventName = 'product-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getUpdatedProducts($since) {
                $sql = "SELECT lp.*, lc.name category_name, UNIX_TIMESTAMP(lp.updated_at) as updated_timestamp
                        FROM loan_products lp
                        LEFT JOIN loan_categories lc ON lp.category_id = lc.id
                        WHERE UNIX_TIMESTAMP(lp.updated_at) > ?
                        ORDER BY lp.updated_at DESC";
                return all($sql, [$since]);
            }

            $currentTimestamp = time();
            sendProductSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to product stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendProductSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $updatedProducts = getUpdatedProducts($lastUpdateId);

                if (!empty($updatedProducts)) {
                    foreach ($updatedProducts as $product) {
                        $newTimestamp = $product['updated_timestamp'];
                        sendProductSSEData($newTimestamp, $product);
                        $lastUpdateId = max($lastUpdateId, $newTimestamp);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // SSE Stream for user updates
        if (strpos($uri, 'admin/users/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastUpdateId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $role = $_GET['role'] ?? null;
            $pollInterval = 2;
            $maxDuration = 300;
            $startTime = time();

            function sendUserSSEData($id, $data, $eventName = 'user-updated') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getUpdatedUsers($since, $role) {
                $sql = "SELECT id, name, email, phone, role, is_active, created_at,
                               UNIX_TIMESTAMP(updated_at) as updated_timestamp
                        FROM users
                        WHERE UNIX_TIMESTAMP(updated_at) > ?";
                $params = [$since];
                if ($role) {
                    $sql .= " AND role = ?";
                    $params[] = $role;
                }
                $sql .= " ORDER BY updated_at DESC";
                return all($sql, $params);
            }

            $currentTimestamp = time();
            sendUserSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to user stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendUserSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $updatedUsers = getUpdatedUsers($lastUpdateId, $role);

                if (!empty($updatedUsers)) {
                    foreach ($updatedUsers as $user) {
                        $newTimestamp = $user['updated_timestamp'];
                        sendUserSSEData($newTimestamp, $user);
                        $lastUpdateId = max($lastUpdateId, $newTimestamp);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
            exit;
        }

        // SSE Stream for system logs
        if (strpos($uri, 'admin/logs/stream') !== false) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('Access-Control-Allow-Origin: *');

            ignore_user_abort(true);
            set_time_limit(0);

            $lastLogId = isset($_GET['since']) ? intval($_GET['since']) : 0;
            $pollInterval = 1;
            $maxDuration = 300;
            $startTime = time();

            function sendLogSSEData($id, $data, $eventName = 'log-created') {
                echo "id: {$id}\n";
                echo "event: {$eventName}\n";
                echo "data: " . json_encode($data) . "\n\n";
                ob_flush();
                flush();
            }

            function getNewLogs($since) {
                $sql = "SELECT * FROM system_logs WHERE id > ? ORDER BY id DESC LIMIT 100";
                return all($sql, [$since]);
            }

            $currentTimestamp = time();
            sendLogSSEData($currentTimestamp, [
                'type' => 'connection-established',
                'timestamp' => $currentTimestamp,
                'message' => 'Connected to logs stream'
            ], 'connected');

            while (true) {
                if (time() - $startTime > $maxDuration) {
                    sendLogSSEData(time(), ['type' => 'timeout'], 'stream-closed');
                    break;
                }

                $newLogs = getNewLogs($lastLogId);

                if (!empty($newLogs)) {
                    foreach ($newLogs as $log) {
                        sendLogSSEData($log['id'], $log);
                        $lastLogId = max($lastLogId, $log['id']);
                    }
                }

                if (connection_aborted()) {
                    break;
                }

                sleep($pollInterval);
            }
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
                q("UPDATE loan_categories SET name=?, code=?, description=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
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
                       asset_transfer_fee, tracking_system_fee, late_fee_percent, requires_security,
                       requires_guarantor, requires_postdated_checks, min_income, is_active)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  [$d['category_id'], $d['name'], $d['description'] ?? null,
                   $d['min_amount'], $d['max_amount'], $d['min_term_months'], $d['max_term_months'],
                   $d['interest_rate'], $d['interest_type'] ?? 'flat', $d['processing_fee_percent'] ?? 0,
                   $d['asset_transfer_fee'] ?? 0, $d['tracking_system_fee'] ?? 0,
                   $d['late_fee_percent'] ?? 0, $d['requires_security'] ?? 0,
                   $d['requires_guarantor'] ?? 0, $d['requires_postdated_checks'] ?? 0,
                   $d['min_income'] ?? 0, $d['is_active'] ?? 1]);
                log_access('POST', 'admin/products', 201);
                echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]); 
                exit;
            }
            if ($method === 'PUT' && preg_match('#products/(\d+)#', $uri, $m)) {
                $d = input();
                $product_id = $m[1];
                log_error("PUT /admin/products/$product_id payload", ['input' => $d]);
                $allowed = ['category_id','name','description','min_amount','max_amount','min_term_months',
                            'max_term_months','interest_rate','interest_type','processing_fee_percent',
                            'asset_transfer_fee','tracking_system_fee','late_fee_percent',
                            'requires_security','requires_guarantor','requires_postdated_checks','min_income',
                            'is_active'];
                $fields = []; $values = [];
                foreach ($d as $k => $v) {
                    if (in_array($k, $allowed)) { $fields[] = "$k = ?"; $values[] = $v; }
                    else { log_error("PUT /admin/products/$product_id skipped field", ['field' => $k, 'value' => $v]); }
                }
                if ($fields) {
                    $fields[] = "updated_at = CURRENT_TIMESTAMP";
                    $values[] = $product_id;
                    $sql = "UPDATE loan_products SET " . implode(', ', $fields) . " WHERE id = ?";
                    log_error("PUT /admin/products/$product_id sql", ['sql' => $sql, 'params' => $values]);
                    try {
                        q($sql, $values);
                        log_error("PUT /admin/products/$product_id success", ['affected_fields' => count($fields) - 1]);
                    } catch (Exception $e) {
                        log_error("PUT /admin/products/$product_id db error", ['error' => $e->getMessage()]);
                        http_response_code(500);
                        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
                        exit;
                    }
                } else {
                    log_error("PUT /admin/products/$product_id no allowed fields", ['received_keys' => array_keys($d)]);
                }
                log_access('PUT', 'admin/products/' . $product_id, 200);
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

        // Upload Company Logo
        if ($method === 'POST' && strpos($uri, 'admin/upload-logo') !== false) {
            requireRole($user, 'admin');
            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'File is required']);
                exit;
            }

            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Upload error: ' . $file['error']]);
                exit;
            }

            $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            if (!in_array($file['type'], $allowed_types)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, SVG']);
                exit;
            }

            $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $unique_name = 'logo_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $file_ext;
            $file_path = 'uploads/' . $unique_name;
            $full_path = __DIR__ . '/' . $file_path;

            if (!move_uploaded_file($file['tmp_name'], $full_path)) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to save file']);
                exit;
            }

            $file_url = '/' . $file_path;

            q("INSERT INTO settings (key_name, key_value) VALUES ('company_logo', ?)
               ON DUPLICATE KEY UPDATE key_value = ?, updated_at = CURRENT_TIMESTAMP", [$file_url, $file_url]);

            log_access('POST', 'admin/upload-logo', 200);
            echo json_encode(['success' => true, 'data' => ['file_url' => $file_url]]);
            exit;
        }

        // Settings
        if (strpos($uri, 'admin/settings') !== false) {
            if ($method === 'PUT' || $method === 'POST') {
                requireRole($user, 'admin');
                $d = input();
                $settings = [];
                if (isset($d['settings']) && is_array($d['settings'])) {
                    $settings = $d['settings'];
                } elseif (is_array($d)) {
                    $settings = $d;
                }
                foreach ($settings as $s) {
                    $key_name = $s['key_name'] ?? $s['key'] ?? '';
                    $key_value = $s['key_value'] ?? $s['value'] ?? '';
                    if ($key_name !== '') {
                        q("INSERT INTO settings (key_name, key_value) VALUES (?, ?)
                           ON DUPLICATE KEY UPDATE key_value = ?, updated_at = CURRENT_TIMESTAMP", [$key_name, $key_value, $key_value]);
                    }
                }
                logSystem('admin_action', 'settings_updated', ['count' => count($settings)], $user['id'], 'success', 'settings', null);
                log_access($method, 'admin/settings', 200);
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

        // Email Settings
        if (strpos($uri, 'admin/email-settings') !== false) {
            if ($method === 'GET') {
                $rows = all("SELECT key_name, key_value FROM settings WHERE key_name IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from')");
                $config = [];
                foreach ($rows as $r) $config[$r['key_name']] = $r['key_value'];
                // Mask the password ? never expose the real encrypted value
                if (!empty($config['smtp_pass'])) $config['smtp_pass'] = '********';
                log_access('GET', 'admin/email-settings', 200);
                echo json_encode(['success' => true, 'data' => $config]);
                exit;
            }

            if ($method === 'POST' && !strpos($uri, 'admin/email-settings/test')) {
                requireRole($user, 'admin');
                $d = input();
                $fields = ['smtp_host' => $d['smtp_host'] ?? '', 'smtp_port' => $d['smtp_port'] ?? '587', 'smtp_user' => $d['smtp_user'] ?? '', 'smtp_pass' => $d['smtp_pass'] ?? '', 'smtp_from' => $d['smtp_from'] ?? ''];
                // If password sentinel sent, keep existing; otherwise encrypt
                if ($fields['smtp_pass'] === '********') {
                    unset($fields['smtp_pass']);
                } elseif (!empty($fields['smtp_pass'])) {
                    $fields['smtp_pass'] = encryptSmtpPass($fields['smtp_pass']);
                }
                foreach ($fields as $k => $v) {
                    q("INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?, updated_at = CURRENT_TIMESTAMP", [$k, $v, $v]);
                }
                log_access('POST', 'admin/email-settings', 200);
                echo json_encode(['success' => true, 'message' => 'Email settings saved successfully']);
                exit;
            }

            if ($method === 'POST' && strpos($uri, 'admin/email-settings/test') !== false) {
                $rows = all("SELECT key_name, key_value FROM settings WHERE key_name IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from')");
                $config = [];
                foreach ($rows as $r) $config[$r['key_name']] = $r['key_value'];
                if (empty($config['smtp_from'])) {
                    echo json_encode(['success' => false, 'message' => 'Email settings not configured']);
                    exit;
                }
                try {
                    $body = '<h2>Test Email</h2><p>This is a test email to verify your SMTP configuration.</p><p>If you received this, your email settings are working correctly.</p>';
                    $sent = sendMail($config['smtp_from'], 'Test Email from Lending System', $body, true);
                    if ($sent) {
                        echo json_encode(['success' => true, 'message' => 'Email sent successfully! Check your inbox.']);
                    } else {
                        echo json_encode(['success' => false, 'message' => 'Failed to send test email. Check your SMTP settings.']);
                    }
                } catch (Exception $e) {
                    echo json_encode(['success' => false, 'message' => 'Email test failed: ' . $e->getMessage()]);
                }
                log_access('POST', 'admin/email-settings/test', $sent ? 200 : 400);
                exit;
            }
        }

        // Send receipt via email (admin only)
        if ($method === 'POST' && strpos($uri, 'admin/send-receipt') !== false) {
            requireRole($user, 'admin');
            $d = input();
            $loanId = intval($d['loan_id'] ?? 0);
            $repaymentId = intval($d['repayment_id'] ?? 0);
            $recipientEmail = $d['recipient_email'] ?? '';
            if (!$loanId || !$recipientEmail) {
                echo json_encode(['success' => false, 'error' => 'loan_id and recipient_email required']);
                exit;
            }
            $loan = one("SELECT l.*, u.name borrower_name, u.email borrower_email FROM loans l LEFT JOIN users u ON l.user_id = u.id WHERE l.id = ?", [$loanId]);
            if (!$loan) { echo json_encode(['success' => false, 'error' => 'Loan not found']); exit; }
            $borrowerName = $loan['borrower_name'] ?? 'Borrower';
            $subject = "Payment Receipt - Loan #$loanId";
            $body = "<h2>Payment Receipt</h2><p>Dear $borrowerName,</p><p>Thank you for your payment on Loan #$loanId.</p>";
            if ($repaymentId) {
                $rep = one("SELECT * FROM repayments WHERE id = ?", [$repaymentId]);
                if ($rep) $body .= "<p><strong>Amount:</strong> " . number_format($rep['amount'], 2) . "</p><p><strong>Date:</strong> {$rep['paid_at']}</p>";
            }
            $body .= "<p>If you have any questions, please contact our support team.</p><p>Best regards,<br/>Lending System</p>";
            $sent = sendMail($recipientEmail, $subject, $body, true);
            logSystem('payment', 'receipt_sent', ['loan_id' => $loanId, 'recipient' => $recipientEmail, 'sent' => $sent], $user['id'], $sent ? 'success' : 'failed', 'loan', $loanId);
            log_access('POST', 'admin/send-receipt', $sent ? 200 : 400);
            echo json_encode(['success' => $sent, 'message' => $sent ? 'Receipt sent successfully' : 'Failed to send receipt']);
            exit;
        }

        // Send invoice via email (admin only)
        if ($method === 'POST' && strpos($uri, 'admin/send-invoice') !== false) {
            requireRole($user, 'admin');
            $d = input();
            $loanId = intval($d['loan_id'] ?? 0);
            $recipientEmail = $d['recipient_email'] ?? '';
            if (!$loanId || !$recipientEmail) {
                echo json_encode(['success' => false, 'error' => 'loan_id and recipient_email required']);
                exit;
            }
            $loan = one("SELECT l.*, u.name borrower_name, u.email borrower_email FROM loans l LEFT JOIN users u ON l.user_id = u.id WHERE l.id = ?", [$loanId]);
            if (!$loan) { echo json_encode(['success' => false, 'error' => 'Loan not found']); exit; }
            $borrowerName = $loan['borrower_name'] ?? 'Borrower';
            $balance = floatval($loan['total_amount'] ?? 0) - floatval($loan['total_paid'] ?? 0);
            $subject = "Loan Invoice - Loan #$loanId";
            $body = "<h2>Loan Invoice</h2><p>Dear $borrowerName,</p><p>Please find your updated loan invoice for Loan #$loanId.</p>";
            $body .= "<p><strong>Principal:</strong> " . number_format($loan['principal_amount'] ?? 0, 2) . "</p>";
            $body .= "<p><strong>Total Amount:</strong> " . number_format($loan['total_amount'] ?? 0, 2) . "</p>";
            $body .= "<p><strong>Paid:</strong> " . number_format($loan['total_paid'] ?? 0, 2) . "</p>";
            $body .= "<p><strong>Balance:</strong> " . number_format($balance, 2) . "</p>";
            $body .= "<p>If you have any questions, please contact our support team.</p><p>Best regards,<br/>Lending System</p>";
            $sent = sendMail($recipientEmail, $subject, $body, true);
            logSystem('payment', 'invoice_sent', ['loan_id' => $loanId, 'recipient' => $recipientEmail, 'sent' => $sent], $user['id'], $sent ? 'success' : 'failed', 'loan', $loanId);
            log_access('POST', 'admin/send-invoice', $sent ? 200 : 400);
            echo json_encode(['success' => $sent, 'message' => $sent ? 'Invoice sent successfully' : 'Failed to send invoice']);
            exit;
        }

        // M-Pesa STK Push - Initiate borrower payment (admin only)
        if ($method === 'POST' && strpos($uri, 'admin/mpesa/payment') !== false) {
            requireRole($user, 'admin');
            require_once __DIR__ . '/utils/mpesa-server.php';

            $d = input();
            $loan_id = $d['loan_id'] ?? 0;
            $phone = $d['phone_number'] ?? $d['phone'] ?? '';

            // Validate loan exists and is active
            $loan = one("SELECT * FROM loans WHERE id = ?", [$loan_id]);
            if (!$loan || $loan['status'] !== 'active') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Loan must be active']);
                log_error("STK payment initiation failed: invalid loan", ['loan_id' => $loan_id, 'status' => $loan['status'] ?? 'missing']);
                exit;
            }

            // Get M-Pesa config
            $config_rows = all("SELECT key_name, key_value FROM settings WHERE key_name LIKE 'mpesa_%'");
            $config = [];
            foreach ($config_rows as $r) {
                $config[$r['key_name']] = $r['key_value'];
            }

            if (!($config['mpesa_consumer_key'] ?? false)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'M-Pesa not configured']);
                log_error("STK payment: M-Pesa not configured", []);
                exit;
            }

            // Normalize phone (0XXXXXXXXX or 254XXXXXXXXX)
            $phone = preg_replace('/^(\+254|254)/', '0', $phone);
            if (!preg_match('/^0[67]\d{8}$/', $phone)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid phone number']);
                exit;
            }

            $amount = intval($loan['total_amount'] - ($d['paid_amount'] ?? 0));
            if ($amount <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid payment amount']);
                exit;
            }

            $checkout_request_id = bin2hex(random_bytes(16));
            $callback_url = $config['mpesa_stk_callback_url'] ?? '';

            $daraja = new MpesaDaraja(
                $config['mpesa_consumer_key'],
                $config['mpesa_consumer_secret'],
                $config['mpesa_environment'] ?? 'sandbox'
            );

            $result = $daraja->initiateStk(
                $phone,
                $amount,
                $checkout_request_id,
                $callback_url,
                $config['mpesa_business_shortcode'],
                $config['mpesa_passkey']
            );

            if (!$result['success']) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => $result['error']]);
                log_error("STK initiation failed", ['loan_id' => $loan_id, 'error' => $result['error']]);
                exit;
            }

            // Record transaction
            q("INSERT INTO mpesa_transactions (loan_id, transaction_type, phone, amount, checkout_request_id, status, request_payload)
               VALUES (?, 'stk_initiated', ?, ?, ?, 'stk_initiated', ?)",
              [$loan_id, $phone, $amount, $checkout_request_id, json_encode($result['data'])]);

            log_access('POST', 'admin/mpesa/payment', 200);
            log_error("STK initiated", ['loan_id' => $loan_id, 'amount' => $amount, 'checkout_id' => substr($checkout_request_id, 0, 8)]);
            echo json_encode(['success' => true, 'checkout_request_id' => $checkout_request_id]);
            exit;
        }

        // M-Pesa B2C Disbursement
        if ($method === 'POST' && strpos($uri, 'admin/mpesa/disburse') !== false) {
            requireRole($user, 'admin', 'releaser');
            require_once __DIR__ . '/utils/mpesa-server.php';

            $d = input();
            $loan_id = $d['loan_id'] ?? 0;
            $phone = $d['phone_number'] ?? $d['phone'] ?? '';

            // Validate loan exists and is released
            $loan = one("SELECT * FROM loans WHERE id = ?", [$loan_id]);
            if (!$loan || $loan['status'] !== 'released') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Loan must be released first']);
                log_error("B2C disbursement failed: invalid loan status", ['loan_id' => $loan_id, 'status' => $loan['status'] ?? 'missing']);
                exit;
            }

            // Get M-Pesa config
            $config_rows = all("SELECT key_name, key_value FROM settings WHERE key_name LIKE 'mpesa_%'");
            $config = [];
            foreach ($config_rows as $r) {
                $config[$r['key_name']] = $r['key_value'];
            }

            if (!($config['mpesa_consumer_key'] ?? false)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'M-Pesa not configured']);
                exit;
            }

            // Normalize phone
            $phone = preg_replace('/^(\+254|254)/', '0', $phone);
            if (!preg_match('/^0[67]\d{8}$/', $phone)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid phone number']);
                exit;
            }

            $amount = intval($loan['principal_amount']);
            $command_id = bin2hex(random_bytes(16));
            $result_url = $config['mpesa_b2c_result_url'] ?? '';

            $daraja = new MpesaDaraja(
                $config['mpesa_consumer_key'],
                $config['mpesa_consumer_secret'],
                $config['mpesa_environment'] ?? 'sandbox'
            );

            $result = $daraja->initiateB2c(
                $phone,
                $amount,
                $command_id,
                $result_url,
                $config['mpesa_business_shortcode'],
                $config['mpesa_initiator_name'] ?? 'LendingSystem',
                $config['mpesa_initiator_password'] ?? ''
            );

            if (!$result['success']) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => $result['error']]);
                log_error("B2C initiation failed", ['loan_id' => $loan_id, 'error' => $result['error']]);
                exit;
            }

            // Record transaction & mark loan as disbursed
            q("INSERT INTO mpesa_transactions (loan_id, transaction_type, phone, amount, command_id, status, request_payload)
               VALUES (?, 'b2c_initiated', ?, ?, ?, 'b2c_initiated', ?)",
              [$loan_id, $phone, $amount, $command_id, json_encode($result['data'])]);

            // Defer 'active' status until B2C result callback confirms disbursement
            q("UPDATE loans SET status='disbursing', disbursed_at=CURRENT_TIMESTAMP WHERE id=?", [$loan_id]);

            log_access('POST', 'admin/mpesa/disburse', 200);
            log_error("B2C initiated", ['loan_id' => $loan_id, 'amount' => $amount, 'command_id' => substr($command_id, 0, 8)]);
            echo json_encode(['success' => true, 'command_id' => $command_id]);
            exit;
        }

        // GET /admin/mpesa/orphaned-payments - Find M-Pesa transactions without repayment records
        if ($method === 'GET' && strpos($uri, 'admin/mpesa/orphaned-payments') !== false) {
            $u = auth();
            requireRole($u, 'admin');

            $orphaned = all("
                SELECT mt.* FROM mpesa_transactions mt
                LEFT JOIN repayments r ON mt.mpesa_reference = r.reference_number
                WHERE mt.status = 'confirmed'
                AND r.id IS NULL
                ORDER BY mt.created_at DESC
            ");

            logSystem('api_request', 'orphaned_payments_fetched', ['count' => count($orphaned)], $u['id']);
            log_access('GET', 'admin/mpesa/orphaned-payments', 200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'orphaned' => $orphaned,
                    'pending_timeout' => [],
                    'total_orphaned' => count($orphaned),
                    'total_pending' => 0
                ]
            ]);
            exit;
        }

        // POST /admin/mpesa/sync-payments - Create repayment records from orphaned M-Pesa transactions
        if ($method === 'POST' && strpos($uri, 'admin/mpesa/sync-payments') !== false) {
            $u = auth();
            requireRole($u, 'admin');
            $d = input();
            $transactionIds = $d['transaction_ids'] ?? [];

            if (empty($transactionIds)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'transaction_ids required']);
                exit;
            }

            $results = [];
            foreach ($transactionIds as $txnId) {
                try {
                    $txn = one("SELECT * FROM mpesa_transactions WHERE id = ? AND status = 'confirmed'", [$txnId]);
                    if (!$txn) {
                        $results[] = ['transaction_id' => $txnId, 'success' => false, 'error' => 'Transaction not found or not confirmed'];
                        continue;
                    }

                    $existing = one("SELECT id FROM repayments WHERE reference_number = ?", [$txn['mpesa_reference']]);
                    if ($existing) {
                        $results[] = ['transaction_id' => $txnId, 'success' => false, 'error' => 'Repayment already exists for this transaction'];
                        continue;
                    }

                    $loanId = null;
                    if ($txn['loan_id']) {
                        $loanId = $txn['loan_id'];
                    } else {
                        $loan = one("SELECT id FROM loans WHERE status = 'active' ORDER BY created_at DESC LIMIT 1");
                        if ($loan) $loanId = $loan['id'];
                    }

                    if ($loanId) {
                        q("INSERT INTO repayments (loan_id, amount, principal_paid, interest_paid, payment_method, reference_number, paid_at, created_at)
                           VALUES (?, ?, ?, 0, 'mpesa', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                          [$loanId, $txn['amount'], $txn['amount'], $txn['mpesa_reference']]);

                        q("UPDATE loans SET updated_at=CURRENT_TIMESTAMP WHERE id=?", [$loanId]);

                        $repaymentId = pdo()->lastInsertId();
                        $results[] = ['transaction_id' => $txnId, 'repayment_id' => $repaymentId, 'success' => true, 'loan_id' => $loanId];
                        logSystem('mpesa_transaction', 'repayment_created_from_orphaned',
                            ['transaction_id' => $txnId, 'amount' => $txn['amount'], 'loan_id' => $loanId], $u['id']);
                    } else {
                        $results[] = ['transaction_id' => $txnId, 'success' => false, 'error' => 'No loan found to link repayment'];
                    }
                } catch (Exception $e) {
                    $results[] = ['transaction_id' => $txnId, 'success' => false, 'error' => $e->getMessage()];
                    logSystem('error', 'sync_payments_exception', ['transaction_id' => $txnId, 'error' => $e->getMessage()], $u['id'], 'failed');
                }
            }

            $successCount = count(array_filter($results, fn($r) => $r['success']));
            $errorCount = count(array_filter($results, fn($r) => !$r['success']));

            logSystem('api_request', 'sync_payments_completed', ['total' => count($transactionIds), 'successful' => $successCount], $u['id']);
            log_access('POST', 'admin/mpesa/sync-payments', 200);
            echo json_encode([
                'success' => true,
                'message' => "Synced payments successfully",
                'data' => [
                    'applied' => $successCount,
                    'created' => $successCount,
                    'skipped' => $errorCount,
                    'errors' => $errorCount
                ]
            ]);
            exit;
        }

        // POST /admin/mpesa/match-repayment - Link an orphaned repayment to a specific loan
        if ($method === 'POST' && strpos($uri, 'admin/mpesa/match-repayment') !== false) {
            $u = auth();
            requireRole($u, 'admin');
            $d = input();
            $repaymentId = $d['repayment_id'] ?? null;
            $loanId = $d['loan_id'] ?? null;

            if (!$repaymentId || !$loanId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'repayment_id and loan_id are required']);
                exit;
            }

            try {
                $repayment = one("SELECT * FROM repayments WHERE id = ?", [$repaymentId]);
                if (!$repayment) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Repayment not found']);
                    exit;
                }

                if ($repayment['loan_id'] && $repayment['loan_id'] != $loanId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Repayment is already linked to another loan']);
                    exit;
                }

                $loan = one("SELECT * FROM loans WHERE id = ?", [$loanId]);
                if (!$loan) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Loan not found']);
                    exit;
                }

                $loanBalance = $loan['total_amount'] - floatval(one("SELECT COALESCE(SUM(amount), 0) total FROM repayments WHERE loan_id = ? AND id != ?", [$loanId, $repaymentId])['total'] ?? 0);
                $warning = null;
                if ($repayment['amount'] > $loanBalance) {
                    $warning = "Repayment amount exceeds remaining loan balance";
                }

                q("UPDATE repayments SET loan_id = ? WHERE id = ?", [$loanId, $repaymentId]);
                q("UPDATE loans SET updated_at=CURRENT_TIMESTAMP WHERE id=?", [$loanId]);

                logSystem('mpesa_transaction', 'repayment_matched_to_loan',
                    ['repayment_id' => $repaymentId, 'loan_id' => $loanId, 'amount' => $repayment['amount']], $u['id']);

                log_access('POST', 'admin/mpesa/match-repayment', 200);
                echo json_encode(['success' => true, 'data' => ['repayment_id' => $repaymentId, 'loan_id' => $loanId, 'warning' => $warning]]);
                exit;
            } catch (Exception $e) {
                logSystem('error', 'match_repayment_exception', ['error' => $e->getMessage()], $u['id'], 'failed');
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                exit;
            }
        }

        // M-Pesa Transaction Status (authenticated)
        if (strpos($uri, 'admin/mpesa/transactions') !== false) {
            $loan_id = $_GET['loan_id'] ?? null;
            $sql = "SELECT * FROM mpesa_transactions WHERE 1=1";
            $params = [];
            if ($loan_id) {
                $sql .= " AND loan_id = ?";
                $params[] = $loan_id;
            }
            $sql .= " ORDER BY created_at DESC LIMIT 100";

            $rows = all($sql, $params);
            log_access('GET', 'admin/mpesa/transactions', 200);
            echo json_encode(['success' => true, 'data' => $rows]);
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

        // Disbursements
        if (strpos($uri, 'admin/disbursements') !== false) {
            $u = auth();
            requireRole($u, 'admin', 'releaser');

            if ($method === 'POST') {
                try {
                    $d = input();
                    $loan_id = $d['loan_id'] ?? null;
                    $amount = $d['amount'] ?? null;
                    $disbursement_method = $d['disbursement_method'] ?? null;
                    $reference_number = $d['reference_number'] ?? null;

                    if (!$loan_id || !$amount || !$disbursement_method) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'loan_id, amount, and disbursement_method are required']);
                        exit;
                    }

                    if ($amount <= 0) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'Amount must be greater than 0']);
                        exit;
                    }

                    // Check if loan exists
                    $loan = one("SELECT id, status FROM loans WHERE id = ?", [$loan_id]);
                    if (!$loan) {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Loan not found']);
                        exit;
                    }

                    // Insert disbursement record
                    run("INSERT INTO disbursements (loan_id, amount, disbursement_method, reference_number, status, created_at, updated_at)
                         VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                        [$loan_id, $amount, $disbursement_method, $reference_number]);

                    // Update loan status if needed
                    if (in_array($loan['status'], ['approved', 'pending'])) {
                        run("UPDATE loans SET status = 'active', disbursed_at = CURRENT_TIMESTAMP WHERE id = ?", [$loan_id]);
                    }

                    $id = pdo()->lastInsertId();

                    log_access('POST', 'admin/disbursements', 200);
                    echo json_encode(['success' => true, 'message' => 'Disbursement recorded successfully',
                        'data' => ['id' => $id, 'loan_id' => $loan_id, 'amount' => $amount, 'disbursement_method' => $disbursement_method]]);
                    exit;
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to record disbursement']);
                    log_error('Disbursement creation failed', ['error' => $e->getMessage()]);
                    exit;
                }
            }

            if ($method === 'DELETE') {
                if (preg_match('#admin/disbursements/(\d+)$#', $uri, $m)) {
                    $id = $m[1];
                    $disburse = one("SELECT * FROM disbursements WHERE id = ?", [$id]);
                    if (!$disburse) {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Disbursement not found']);
                        exit;
                    }

                    run("DELETE FROM disbursements WHERE id = ?", [$id]);
                    log_access('DELETE', 'admin/disbursements/' . $id, 200);
                    echo json_encode(['success' => true, 'message' => 'Disbursement deleted successfully']);
                    exit;
                }
            }

            if ($method === 'GET') {
                $page = intval($_GET['page'] ?? 1);
                $limit = intval($_GET['limit'] ?? 20);
                $off = ($page - 1) * $limit;
                $search = $_GET['search'] ?? null;
                $loan_id = $_GET['loan_id'] ?? null;

                $where = "WHERE 1=1";
                $params = [];

                if ($loan_id) {
                    $where .= " AND d.loan_id = ?";
                    $params[] = $loan_id;
                }

                if ($search) {
                    $where .= " AND (u.name LIKE ? OR u.email LIKE ? OR d.reference_number LIKE ?)";
                    $likeSearch = "%$search%";
                    $params[] = $likeSearch;
                    $params[] = $likeSearch;
                    $params[] = $likeSearch;
                }

                $rows = all("SELECT d.*, u.name borrower_name, u.email borrower_email, l.status loan_status
                             FROM disbursements d
                             JOIN loans l ON d.loan_id = l.id
                             JOIN borrowers b ON l.borrower_id = b.id
                             JOIN users u ON b.user_id = u.id
                             $where
                             ORDER BY d.created_at DESC LIMIT $limit OFFSET $off", $params);

                $countResult = one("SELECT COUNT(*) c FROM disbursements d $where", $params);
                $tot = $countResult['c'] ?? 0;

                log_access('GET', 'admin/disbursements', 200);
                echo json_encode(['success' => true, 'data' => ['disbursements' => $rows,
                    'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot]]]);
                exit;
            }
        }

        // System Logs
        if (strpos($uri, 'admin/logs') !== false) {
            $u = auth();
            requireRole($u, 'admin', 'manager');

            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 20);
            $off = ($page - 1) * $limit;
            $logType = $_GET['log_type'] ?? null;
            $status = $_GET['status'] ?? null;
            $search = $_GET['search'] ?? null;
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;

            $where = "WHERE 1=1";
            $params = [];

            if ($logType) {
                $where .= " AND log_type = ?";
                $params[] = $logType;
            }
            if ($status) {
                $where .= " AND status = ?";
                $params[] = $status;
            }
            if ($search) {
                $where .= " AND (action LIKE ? OR details LIKE ?)";
                $likeSearch = "%$search%";
                $params[] = $likeSearch;
                $params[] = $likeSearch;
            }
            if ($startDate) {
                $where .= " AND DATE(created_at) >= ?";
                $params[] = $startDate;
            }
            if ($endDate) {
                $where .= " AND DATE(created_at) <= ?";
                $params[] = $endDate;
            }

            $rows = all("SELECT sl.*, u.name user_name, u.email user_email
                         FROM system_logs sl
                         LEFT JOIN users u ON sl.user_id = u.id
                         $where
                         ORDER BY sl.created_at DESC LIMIT $limit OFFSET $off", $params);

            $countResult = one("SELECT COUNT(*) c FROM system_logs sl $where", $params);
            $tot = $countResult['c'] ?? 0;

            log_access('GET', 'admin/logs', 200);
            echo json_encode(['success' => true, 'data' => ['logs' => $rows,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot]]]);
            exit;
        }

        // Log Cleanup — delete system_logs older than N days (default 90)
        if ($uri === 'admin/logs/cleanup' && $method === 'POST') {
            requireRole($user, 'admin');
            $days = intval($_POST['days'] ?? 90);
            if ($days < 1) $days = 90;
            $deleted = q("DELETE FROM system_logs WHERE created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)", [$days]);
            logSystem('admin_action', 'logs_cleaned', ['deleted' => $deleted->rowCount(), 'retention_days' => $days], $user['id'], 'success', 'system_logs', null);
            log_access('POST', 'admin/logs/cleanup', 200);
            echo json_encode(['success' => true, 'message' => "Deleted logs older than $days days"]);
            exit;
        }

        // Users
        if (strpos($uri, 'admin/users') !== false) {
            requireRole($user, 'admin');
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

                    logSystem('user_mgmt', 'user_created_by_admin', ['email' => $email, 'role' => $role], $user['id'], 'success', 'user', $userId);
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

        // ==================== ROLES MODULE ====================

        // Roles
        if (strpos($uri, 'admin/roles') !== false) {
            requireRole($user, 'admin');

            // GET /admin/roles - list all roles with their permissions
            if ($method === 'GET' && $uri === 'admin/roles') {
                $roles = all("SELECT id, key_name, name, description, system_role, created_at, updated_at FROM roles ORDER BY name");
                $result = [];
                foreach ($roles as $role) {
                    $perms = all("SELECT permission_key, granted FROM role_permissions WHERE role_id = ?", [$role['id']]);
                    $permMap = [];
                    foreach ($perms as $p) {
                        $permMap[$p['permission_key']] = (bool)$p['granted'];
                    }
                    $role['permissions'] = $permMap;
                    $role['key'] = $role['key_name'];
                    unset($role['key_name']);
                    $result[] = $role;
                }
                log_access('GET', '/admin/roles', 200);
                echo json_encode(['success' => true, 'data' => $result]);
                exit;
            }

            // GET /admin/roles/:key - get single role with permissions
            if ($method === 'GET' && preg_match('#admin/roles/([a-z_]+)$#', $uri, $m)) {
                $roleKey = $m[1];
                $role = one("SELECT id, key_name, name, description, system_role, created_at, updated_at FROM roles WHERE key_name = ?", [$roleKey]);
                if (!$role) {
                    http_response_code(404);
                    log_access('GET', "/admin/roles/$roleKey", 404);
                    echo json_encode(['success' => false, 'error' => 'Role not found']);
                    exit;
                }
                $perms = all("SELECT permission_key, granted FROM role_permissions WHERE role_id = ?", [$role['id']]);
                $permMap = [];
                foreach ($perms as $p) {
                    $permMap[$p['permission_key']] = (bool)$p['granted'];
                }
                $role['permissions'] = $permMap;
                $role['key'] = $role['key_name'];
                unset($role['key_name']);
                log_access('GET', "/admin/roles/$roleKey", 200);
                echo json_encode(['success' => true, 'data' => $role]);
                exit;
            }

            // PUT /admin/roles/:key - update role name/description
            if ($method === 'PUT' && preg_match('#admin/roles/([a-z_]+)$#', $uri, $m)) {
                $roleKey = $m[1];
                $role = one("SELECT id, system_role FROM roles WHERE key_name = ?", [$roleKey]);
                if (!$role) {
                    http_response_code(404);
                    log_access('PUT', "/admin/roles/$roleKey", 404);
                    echo json_encode(['success' => false, 'error' => 'Role not found']);
                    exit;
                }
                $d = input();
                $updates = [];
                $params = [];
                if (isset($d['name'])) { $updates[] = "name = ?"; $params[] = $d['name']; }
                if (isset($d['description'])) { $updates[] = "description = ?"; $params[] = $d['description']; }
                if ($updates) {
                    $updates[] = "updated_at = CURRENT_TIMESTAMP";
                    $params[] = $role['id'];
                    $sql = "UPDATE roles SET " . implode(", ", $updates) . " WHERE id = ?";
                    q($sql, $params);
                    logAudit($user['id'], 'role_updated', 'role', $role['id'], [
                        'role_key' => $roleKey,
                        'name_changed' => isset($d['name']),
                        'description_changed' => isset($d['description']),
                        'new_name' => $d['name'] ?? null,
                        'new_description' => $d['description'] ?? null
                    ]);
                }
                log_access('PUT', "/admin/roles/$roleKey", 200);
                echo json_encode(['success' => true, 'message' => 'Role updated']);
                exit;
            }

            // PUT /admin/roles/:key/permissions - update role permissions
            if ($method === 'PUT' && preg_match('#admin/roles/([a-z_]+)/permissions$#', $uri, $m)) {
                $roleKey = $m[1];
                $role = one("SELECT id FROM roles WHERE key_name = ?", [$roleKey]);
                if (!$role) {
                    http_response_code(404);
                    log_access('PUT', "/admin/roles/$roleKey/permissions", 404);
                    echo json_encode(['success' => false, 'error' => 'Role not found']);
                    exit;
                }
                $d = input();
                if (!isset($d['permissions']) || !is_array($d['permissions'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'permissions array required']);
                    exit;
                }
                // Update/insert each permission
                foreach ($d['permissions'] as $permKey => $granted) {
                    $existing = one("SELECT id FROM role_permissions WHERE role_id = ? AND permission_key = ?", [$role['id'], $permKey]);
                    if ($existing) {
                        q("UPDATE role_permissions SET granted = ?, updated_at = CURRENT_TIMESTAMP WHERE role_id = ? AND permission_key = ?",
                          [$granted ? 1 : 0, $role['id'], $permKey]);
                    } else {
                        q("INSERT INTO role_permissions (role_id, permission_key, granted) VALUES (?, ?, ?)",
                          [$role['id'], $permKey, $granted ? 1 : 0]);
                    }
                }
                logAudit($user['id'], 'role_permissions_updated', 'role', $role['id'], [
                    'role_key' => $roleKey,
                    'permissions_count' => count($d['permissions']),
                    'permission_keys_modified' => array_keys($d['permissions'])
                ]);
                log_access('PUT', "/admin/roles/$roleKey/permissions", 200);
                echo json_encode(['success' => true, 'message' => 'Permissions updated']);
                exit;
            }
        }

        // ==================== INVOICE / QUOTATION MODULE ====================

        // ---- Customers ----
        if (strpos($uri, 'admin/customers') !== false) {
            if ($method === 'PUT' && preg_match('#customers/(\d+)#', $uri, $m)) {
                $d = input();
                q("UPDATE customers SET name=?, email=?, phone=?, address=?, company=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                  [$d['name'], $d['email']??null, $d['phone']??null, $d['address']??null, $d['company']??null, $d['notes']??null, $m[1]]);
                log_access('PUT', 'admin/customers/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            if ($method === 'DELETE' && preg_match('#customers/(\d+)#', $uri, $m)) {
                q("DELETE FROM customers WHERE id=?", [$m[1]]);
                log_access('DELETE', 'admin/customers/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            if ($method === 'POST') {
                $d = input();
                q("INSERT INTO customers (name, email, phone, address, company, notes) VALUES (?,?,?,?,?,?)",
                  [$d['name'], $d['email']??null, $d['phone']??null, $d['address']??null, $d['company']??null, $d['notes']??null]);
                log_access('POST', 'admin/customers', 201);
                echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]);
                exit;
            }
            $search = $_GET['search'] ?? '';
            if ($search) {
                $like = "%$search%";
                $rows = all("SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ? ORDER BY name LIMIT 20", [$like, $like, $like, $like]);
            } else {
                $rows = all("SELECT * FROM customers ORDER BY name");
            }
            log_access('GET', 'admin/customers', 200);
            echo json_encode(['success' => true, 'data' => $rows]);
            exit;
        }

        // ---- Invoice Products ----
        if (strpos($uri, 'admin/invoice-products') !== false) {
            if ($method === 'PUT' && preg_match('#invoice-products/(\d+)#', $uri, $m)) {
                $d = input();
                q("UPDATE invoice_products SET name=?, description=?, unit_price=?, tax_rate=?, unit_type=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                  [$d['name'], $d['description'] ?? null, $d['unit_price'], $d['tax_rate'] ?? 0, $d['unit_type'] ?? 'piece', $d['is_active'] ?? 1, $m[1]]);
                log_access('PUT', 'admin/invoice-products/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            if ($method === 'DELETE' && preg_match('#invoice-products/(\d+)#', $uri, $m)) {
                q("DELETE FROM invoice_products WHERE id=?", [$m[1]]);
                log_access('DELETE', 'admin/invoice-products/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            if ($method === 'POST') {
                $d = input();
                q("INSERT INTO invoice_products (name, description, unit_price, tax_rate, unit_type, is_active) VALUES (?,?,?,?,?,?)",
                  [$d['name'], $d['description'] ?? null, $d['unit_price'], $d['tax_rate'] ?? 0, $d['unit_type'] ?? 'piece', $d['is_active'] ?? 1]);
                log_access('POST', 'admin/invoice-products', 201);
                echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]);
                exit;
            }
            log_access('GET', 'admin/invoice-products', 200);
            echo json_encode(['success' => true, 'data' => all("SELECT * FROM invoice_products ORDER BY name")]);
            exit;
        }

        // ---- Quotations ----
        if (strpos($uri, 'admin/quotations') !== false) {
            // Convert quote to invoice
            if ($method === 'POST' && preg_match('#quotations/(\d+)/convert$#', $uri, $m)) {
                $quote = one("SELECT * FROM quotations WHERE id=?", [$m[1]]);
                if (!$quote) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'Quotation not found']); exit; }
                $items = all("SELECT * FROM quotation_items WHERE quotation_id=?", [$m[1]]);
                $nextNum = one("SELECT COALESCE(MAX(CAST(SUBSTR(invoice_number,5) AS INTEGER)),0)+1 n FROM invoices");
                $invNum = 'INV-' . str_pad($nextNum['n'], 4, '0', STR_PAD_LEFT);
                q("INSERT INTO invoices (invoice_number, quotation_id, customer_id, client_name, client_email, client_phone, client_address, invoice_date, due_date, subtotal, tax_total, discount, grand_total, notes, status, created_by) VALUES (?,?,?,?,?,?,?,CURDATE(),DATE_ADD(CURDATE(),INTERVAL 30 DAY),?,?,?,?,?,'draft',?)",
                  [$invNum, $m[1], $quote['customer_id'], $quote['client_name'], $quote['client_email'], $quote['client_phone'],
                   $quote['client_address'], $quote['subtotal'], $quote['tax_total'], $quote['discount'],
                   $quote['grand_total'], $quote['notes'], $quote['created_by']]);
                $invId = pdo()->lastInsertId();
                foreach ($items as $it) {
                    q("INSERT INTO invoice_items (invoice_id, invoice_product_id, description, quantity, unit_price, tax_rate, amount) VALUES (?,?,?,?,?,?,?)",
                      [$invId, $it['invoice_product_id'], $it['description'], $it['quantity'], $it['unit_price'], $it['tax_rate'], $it['amount']]);
                }
                q("UPDATE quotations SET status='converted', updated_at=CURRENT_TIMESTAMP WHERE id=?", [$m[1]]);
                log_access('POST', 'admin/quotations/' . $m[1] . '/convert', 200);
                echo json_encode(['success' => true, 'data' => ['invoice_id' => $invId, 'invoice_number' => $invNum]]);
                exit;
            }
            // Update quote status
            if ($method === 'POST' && preg_match('#quotations/(\d+)/status$#', $uri, $m)) {
                $d = input();
                q("UPDATE quotations SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$d['status'], $m[1]]);
                log_access('POST', 'admin/quotations/' . $m[1] . '/status', 200);
                echo json_encode(['success' => true]);
                exit;
            }
            // Get single quote with items
            if ($method === 'GET' && preg_match('#quotations/(\d+)$#', $uri, $m)) {
                $quote = one("SELECT q.*, u.name created_by_name, c.name customer_name, c.email customer_email, c.phone customer_phone, c.company customer_company FROM quotations q LEFT JOIN users u ON q.created_by=u.id LEFT JOIN customers c ON q.customer_id=c.id WHERE q.id=?", [$m[1]]);
                if (!$quote) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'Quotation not found']); exit; }
                $quote['items'] = all("SELECT qi.*, ip.name product_name FROM quotation_items qi LEFT JOIN invoice_products ip ON qi.invoice_product_id=ip.id WHERE qi.quotation_id=?", [$m[1]]);
                log_access('GET', 'admin/quotations/' . $m[1], 200);
                echo json_encode(['success' => true, 'data' => $quote]);
                exit;
            }
            // Update quote
            if ($method === 'PUT' && preg_match('#quotations/(\d+)$#', $uri, $m)) {
                $d = input();
                q("UPDATE quotations SET customer_id=?, client_name=?, client_email=?, client_phone=?, client_address=?, quote_date=?, expiry_date=?, subtotal=?, tax_total=?, discount=?, grand_total=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                  [$d['customer_id']??null, $d['client_name'], $d['client_email']??null, $d['client_phone']??null, $d['client_address']??null,
                   $d['quote_date'], $d['expiry_date']??null, $d['subtotal']??0, $d['tax_total']??0,
                   $d['discount']??0, $d['grand_total']??0, $d['notes']??null, $m[1]]);
                // Replace items
                if (isset($d['items']) && is_array($d['items'])) {
                    q("DELETE FROM quotation_items WHERE quotation_id=?", [$m[1]]);
                    foreach ($d['items'] as $it) {
                        q("INSERT INTO quotation_items (quotation_id, invoice_product_id, description, quantity, unit_price, tax_rate, amount) VALUES (?,?,?,?,?,?,?)",
                          [$m[1], $it['invoice_product_id']??null, $it['description'], $it['quantity'], $it['unit_price'], $it['tax_rate']??0, $it['amount']]);
                    }
                }
                log_access('PUT', 'admin/quotations/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            // Delete quote
            if ($method === 'DELETE' && preg_match('#quotations/(\d+)#', $uri, $m)) {
                q("DELETE FROM quotation_items WHERE quotation_id=?", [$m[1]]);
                q("DELETE FROM quotations WHERE id=?", [$m[1]]);
                log_access('DELETE', 'admin/quotations/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            // Create quote
            if ($method === 'POST') {
                $d = input();
                $nextNum = one("SELECT COALESCE(MAX(CAST(SUBSTR(quote_number,5) AS INTEGER)),0)+1 n FROM quotations");
                $qNum = 'QTE-' . str_pad($nextNum['n'], 4, '0', STR_PAD_LEFT);
                $u = auth();
                q("INSERT INTO quotations (quote_number, customer_id, client_name, client_email, client_phone, client_address, quote_date, expiry_date, subtotal, tax_total, discount, grand_total, notes, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)",
                  [$qNum, $d['customer_id']??null, $d['client_name'], $d['client_email']??null, $d['client_phone']??null, $d['client_address']??null,
                   $d['quote_date'], $d['expiry_date']??null, $d['subtotal']??0, $d['tax_total']??0,
                   $d['discount']??0, $d['grand_total']??0, $d['notes']??null, $u['id']]);
                $qId = pdo()->lastInsertId();
                if (isset($d['items']) && is_array($d['items'])) {
                    foreach ($d['items'] as $it) {
                        q("INSERT INTO quotation_items (quotation_id, invoice_product_id, description, quantity, unit_price, tax_rate, amount) VALUES (?,?,?,?,?,?,?)",
                          [$qId, $it['invoice_product_id']??null, $it['description'], $it['quantity'], $it['unit_price'], $it['tax_rate']??0, $it['amount']]);
                    }
                }
                log_access('POST', 'admin/quotations', 201);
                echo json_encode(['success' => true, 'data' => ['id' => $qId, 'quote_number' => $qNum]]);
                exit;
            }
            // List quotes
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 50); $off = ($page - 1) * $limit;
            $rows = all("SELECT q.*, u.name created_by_name, c.name customer_name FROM quotations q LEFT JOIN users u ON q.created_by=u.id LEFT JOIN customers c ON q.customer_id=c.id ORDER BY q.created_at DESC LIMIT $limit OFFSET $off");
            $tot = one("SELECT COUNT(*) c FROM quotations");
            log_access('GET', 'admin/quotations', 200);
            echo json_encode(['success' => true, 'data' => ['quotations' => $rows,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $tot['c']]]]);
            exit;
        }

        // ---- Invoices ----
        if (strpos($uri, 'admin/invoices') !== false) {
            // Update invoice status
            if ($method === 'POST' && preg_match('#invoices/(\d+)/status$#', $uri, $m)) {
                $d = input();
                q("UPDATE invoices SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$d['status'], $m[1]]);
                log_access('POST', 'admin/invoices/' . $m[1] . '/status', 200);
                echo json_encode(['success' => true]);
                exit;
            }
            // Get single invoice with items
            if ($method === 'GET' && preg_match('#invoices/(\d+)$#', $uri, $m)) {
                $inv = one("SELECT i.*, q.quote_number, u.name created_by_name, c.name customer_name, c.email customer_email, c.phone customer_phone, c.company customer_company FROM invoices i LEFT JOIN quotations q ON i.quotation_id=q.id LEFT JOIN users u ON i.created_by=u.id LEFT JOIN customers c ON i.customer_id=c.id WHERE i.id=?", [$m[1]]);
                if (!$inv) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'Invoice not found']); exit; }
                $inv['items'] = all("SELECT ii.*, ip.name product_name FROM invoice_items ii LEFT JOIN invoice_products ip ON ii.invoice_product_id=ip.id WHERE ii.invoice_id=?", [$m[1]]);
                log_access('GET', 'admin/invoices/' . $m[1], 200);
                echo json_encode(['success' => true, 'data' => $inv]);
                exit;
            }
            // Update invoice
            if ($method === 'PUT' && preg_match('#invoices/(\d+)$#', $uri, $m)) {
                $d = input();
                q("UPDATE invoices SET customer_id=?, client_name=?, client_email=?, client_phone=?, client_address=?, invoice_date=?, due_date=?, subtotal=?, tax_total=?, discount=?, grand_total=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                  [$d['customer_id']??null, $d['client_name'], $d['client_email']??null, $d['client_phone']??null, $d['client_address']??null,
                   $d['invoice_date'], $d['due_date']??null, $d['subtotal']??0, $d['tax_total']??0,
                   $d['discount']??0, $d['grand_total']??0, $d['notes']??null, $m[1]]);
                if (isset($d['items']) && is_array($d['items'])) {
                    q("DELETE FROM invoice_items WHERE invoice_id=?", [$m[1]]);
                    foreach ($d['items'] as $it) {
                        q("INSERT INTO invoice_items (invoice_id, invoice_product_id, description, quantity, unit_price, tax_rate, amount) VALUES (?,?,?,?,?,?,?)",
                          [$m[1], $it['invoice_product_id']??null, $it['description'], $it['quantity'], $it['unit_price'], $it['tax_rate']??0, $it['amount']]);
                    }
                }
                log_access('PUT', 'admin/invoices/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            // Delete invoice
            if ($method === 'DELETE' && preg_match('#invoices/(\d+)#', $uri, $m)) {
                q("DELETE FROM invoice_items WHERE invoice_id=?", [$m[1]]);
                q("DELETE FROM invoices WHERE id=?", [$m[1]]);
                log_access('DELETE', 'admin/invoices/' . $m[1], 200);
                echo json_encode(['success' => true]);
                exit;
            }
            // Create invoice
            if ($method === 'POST') {
                $d = input();
                $nextNum = one("SELECT COALESCE(MAX(CAST(SUBSTR(invoice_number,5) AS INTEGER)),0)+1 n FROM invoices");
                $invNum = 'INV-' . str_pad($nextNum['n'], 4, '0', STR_PAD_LEFT);
                $u = auth();
                q("INSERT INTO invoices (invoice_number, quotation_id, customer_id, client_name, client_email, client_phone, client_address, invoice_date, due_date, subtotal, tax_total, discount, grand_total, notes, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)",
                  [$invNum, $d['quotation_id']??null, $d['customer_id']??null, $d['client_name'], $d['client_email']??null, $d['client_phone']??null,
                   $d['client_address']??null, $d['invoice_date'], $d['due_date']??null, $d['subtotal']??0,
                   $d['tax_total']??0, $d['discount']??0, $d['grand_total']??0, $d['notes']??null, $u['id']]);
                $invId = pdo()->lastInsertId();
                if (isset($d['items']) && is_array($d['items'])) {
                    foreach ($d['items'] as $it) {
                        q("INSERT INTO invoice_items (invoice_id, invoice_product_id, description, quantity, unit_price, tax_rate, amount) VALUES (?,?,?,?,?,?,?)",
                          [$invId, $it['invoice_product_id']??null, $it['description'], $it['quantity'], $it['unit_price'], $it['tax_rate']??0, $it['amount']]);
                    }
                }
                log_access('POST', 'admin/invoices', 201);
                echo json_encode(['success' => true, 'data' => ['id' => $invId, 'invoice_number' => $invNum]]);
                exit;
            }
            // List invoices
            $page = intval($_GET['page'] ?? 1); $limit = intval($_GET['limit'] ?? 50); $off = ($page - 1) * $limit;
            $rows = all("SELECT i.*, q.quote_number, u.name created_by_name, c.name customer_name FROM invoices i LEFT JOIN quotations q ON i.quotation_id=q.id LEFT JOIN users u ON i.created_by=u.id LEFT JOIN customers c ON i.customer_id=c.id ORDER BY i.created_at DESC LIMIT $limit OFFSET $off");
            $tot = one("SELECT COUNT(*) c FROM invoices");
            log_access('GET', 'admin/invoices', 200);
            echo json_encode(['success' => true, 'data' => ['invoices' => $rows,
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

    // ====================================================================
    // M-Pesa Callbacks (PUBLIC - no authentication)
    // ====================================================================
    if ($resource === 'mpesa') {
        require_once __DIR__ . '/utils/mpesa-server.php';

        function validateSafaricomSignature($raw, $signature_header, $is_production = false) {
            if (empty($signature_header)) {
                log_error("Safaricom signature validation: missing signature header", []);
                return false;
            }
            return SafaricomSignatureValidator::verify($signature_header, $raw, $is_production);
        }

        // Get M-Pesa environment for signature validation
        $config_rows = all("SELECT key_name, key_value FROM settings WHERE key_name LIKE 'mpesa_%'");
        $mpesa_config = [];
        foreach ($config_rows as $r) {
            $mpesa_config[$r['key_name']] = $r['key_value'];
        }
        $is_production = ($mpesa_config['mpesa_environment'] ?? 'sandbox') === 'production';

        // POST /mpesa/c2b/validate - C2B Validation (customer initiated payment)
        if ($method === 'POST' && strpos($uri, 'mpesa/c2b/validate') !== false) {
            $raw = file_get_contents('php://input');
            if (empty($raw)) {
                http_response_code(400);
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'No payload']);
                log_error("C2B validation: empty payload", []);
                exit;
            }

            // Verify signature (phase 4 security hardening)
            $signature = $_SERVER['HTTP_X_SAFARICOM_SIGNATURE'] ?? '';
            if (!validateSafaricomSignature($raw, $signature, $is_production)) {
                http_response_code(401);
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Signature verification failed']);
                log_error("C2B validation: signature verification failed", ['ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
                exit;
            }

            $parsed = MpesaXmlParser::parseC2bXml($raw);
            if (!$parsed) {
                http_response_code(400);
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Invalid XML']);
                log_error("C2B validation: parse failed", ['raw' => substr($raw, 0, 200)]);
                exit;
            }

            $amount = $parsed['amount'];
            $phone = $parsed['phone'];
            $account_ref = $parsed['account_ref'];

            $validation_ok = true;
            $reason = 'Success';

            if ($amount <= 0) {
                $validation_ok = false;
                $reason = 'Invalid amount';
            }

            $result_code = $validation_ok ? '0' : '1';

            q("INSERT INTO mpesa_transactions (transaction_type, phone, amount, status, validation_result, request_payload)
               VALUES ('c2b_validation', ?, ?, 'validation_result', ?, ?)",
              [$phone, $amount, ($validation_ok ? 'accepted' : 'rejected'), substr($raw, 0, 1000)]);

            log_access('POST', 'mpesa/c2b/validate', 200);
            header('Content-Type: application/json');
            echo json_encode(['ResultCode' => $result_code, 'ResultDesc' => $reason]);
            exit;
        }

        // POST /mpesa/c2b/confirm - C2B Confirmation (customer confirmed & paid)
        if ($method === 'POST' && strpos($uri, 'mpesa/c2b/confirm') !== false) {
            $raw = file_get_contents('php://input');
            if (empty($raw)) {
                http_response_code(400);
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'No payload']);
                exit;
            }

            $signature = $_SERVER['HTTP_X_SAFARICOM_SIGNATURE'] ?? '';
            if (!validateSafaricomSignature($raw, $signature, $is_production)) {
                http_response_code(401);
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Signature verification failed']);
                log_error("C2B confirm: signature verification failed", []);
                exit;
            }

            $parsed = MpesaXmlParser::parseC2bXml($raw);
            if (!$parsed) {
                http_response_code(400);
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Invalid XML']);
                exit;
            }

            $amount = $parsed['amount'];
            $phone = $parsed['phone'];
            $receipt = $parsed['receipt'];

            // Check for duplicate receipt
            $existing = one("SELECT id FROM mpesa_transactions WHERE safaricom_receipt = ?", [$receipt]);
            if ($existing) {
                log_error("C2B confirm: duplicate receipt", ['receipt' => $receipt]);
                log_access('POST', 'mpesa/c2b/confirm', 200);
                echo json_encode(['ResultCode' => '0', 'ResultDesc' => 'Success']);
                exit;
            }

            q("INSERT INTO mpesa_transactions (transaction_type, phone, amount, mpesa_reference, safaricom_receipt, status, request_payload)
               VALUES ('c2b_confirmation', ?, ?, ?, ?, 'confirmed', ?)",
              [$phone, $amount, $receipt, $receipt, substr($raw, 0, 1000)]);

            log_access('POST', 'mpesa/c2b/confirm', 200);
            log_error("C2B confirm: transaction recorded", ['phone' => substr($phone, -4), 'amount' => $amount, 'receipt' => $receipt]);
            echo json_encode(['ResultCode' => '0', 'ResultDesc' => 'Success']);
            exit;
        }

        // POST /mpesa/c2b/timeout - C2B Timeout (customer cancelled or timeout)
        if ($method === 'POST' && strpos($uri, 'mpesa/c2b/timeout') !== false) {
            $raw = file_get_contents('php://input');
            if (!empty($raw)) {
                $signature = $_SERVER['HTTP_X_SAFARICOM_SIGNATURE'] ?? '';
                if (!validateSafaricomSignature($raw, $signature, $is_production)) {
                    log_error("C2B timeout: signature verification failed", []);
                    log_access('POST', 'mpesa/c2b/timeout', 401);
                    echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Invalid signature']);
                    exit;
                }

                $parsed = MpesaXmlParser::parseC2bXml($raw);
                if ($parsed) {
                    q("INSERT INTO mpesa_transactions (transaction_type, phone, amount, status, request_payload)
                       VALUES ('c2b_timeout', ?, ?, 'timeout', ?)",
                      [$parsed['phone'], $parsed['amount'], substr($raw, 0, 1000)]);
                    log_error("C2B timeout: recorded", ['phone' => substr($parsed['phone'], -4)]);
                }
            }
            log_access('POST', 'mpesa/c2b/timeout', 200);
            echo json_encode(['ResultCode' => '0']);
            exit;
        }

        // POST /mpesa/stk/callback - STK Push Callback (borrower payment result)
        if ($method === 'POST' && strpos($uri, 'mpesa/stk/callback') !== false) {
            $raw = file_get_contents('php://input');
            if (empty($raw)) {
                http_response_code(400);
                log_error("STK callback: empty payload", []);
                exit;
            }

            $signature = $_SERVER['HTTP_X_SAFARICOM_SIGNATURE'] ?? '';
            if (!validateSafaricomSignature($raw, $signature, $is_production)) {
                log_error("STK callback: signature verification failed", []);
                header('Content-Type: application/json');
                echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Invalid signature']);
                exit;
            }

            $parsed = MpesaXmlParser::parseStkCallbackXml($raw);
            if (!$parsed) {
                http_response_code(400);
                log_error("STK callback: parse failed", ['raw' => substr($raw, 0, 200)]);
                exit;
            }

            $checkout_request_id = $parsed['checkout_request_id'];
            $result_code = $parsed['result_code'];
            $result_desc = $parsed['result_desc'];

            $txn = one("SELECT id, loan_id FROM mpesa_transactions WHERE checkout_request_id = ?", [$checkout_request_id]);

            if ($result_code === 0) {
                // Success - extract payment details from metadata
                $metadata = $parsed['metadata'] ?? [];
                $receipt = $metadata['MpesaReceiptNumber'] ?? null;
                $amount = isset($metadata['Amount']) ? floatval($metadata['Amount']) : null;

                if ($txn) {
                    q("UPDATE mpesa_transactions SET status='completed', safaricom_receipt=?, response_code=?, response_message=?, response_payload=? WHERE id=?",
                      [$receipt, $result_code, $result_desc, substr($raw, 0, 1000), $txn['id']]);

                    if ($txn['loan_id'] && $amount) {
                        q("INSERT INTO repayments (loan_id, amount, principal_paid, interest_paid, payment_method, reference_number)
                           VALUES (?, ?, ?, 0, 'mpesa', ?)",
                          [$txn['loan_id'], $amount, $amount, $receipt]);
                        q("UPDATE loans SET updated_at=CURRENT_TIMESTAMP WHERE id=?", [$txn['loan_id']]);
                        $loan = one("SELECT borrower_id FROM loans WHERE id = ?", [$txn['loan_id']]);
                        $borrower = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
                        logAudit($borrower['user_id'], 'payment_received', 'repayment', $txn['loan_id'], [
                            'amount' => $amount,
                            'payment_method' => 'mpesa',
                            'reference_number' => $receipt,
                            'principal_paid' => $amount,
                            'interest_paid' => 0,
                            'mpesa_transaction_id' => $receipt
                        ]);
                        $borrowerUser = one("SELECT email, name FROM users WHERE id = ?", [$borrower['user_id']]);
                        if ($borrowerUser) {
                            $subject = "Payment Received - Loan #{$txn['loan_id']}";
                            $body = "<h2>Payment Confirmation</h2><p>Dear {$borrowerUser['name']},</p><p>We have received your payment for Loan #{$txn['loan_id']}.</p>";
                            $body .= "<p><strong>Amount:</strong> " . number_format($amount, 2) . "</p>";
                            $body .= "<p><strong>Reference:</strong> $receipt</p>";
                            $body .= "<p>Thank you for your payment.</p><p>Best regards,<br/>Lending System</p>";
                            sendMail($borrowerUser['email'], $subject, $body, true);
                        }
                        log_error("STK callback success: repayment created", ['loan_id' => $txn['loan_id'], 'amount' => $amount, 'receipt' => $receipt]);
                    }
                } else {
                    q("INSERT INTO mpesa_transactions (transaction_type, checkout_request_id, status, response_code, response_message, safaricom_receipt, amount, request_payload)
                       VALUES ('stk_callback', ?, 'completed', ?, ?, ?, ?, ?)",
                      [$checkout_request_id, $result_code, $result_desc, $receipt, $amount, substr($raw, 0, 1000)]);
                }
            } else {
                // Failed - user cancelled or timeout
                if ($txn) {
                    q("UPDATE mpesa_transactions SET status='failed', response_code=?, response_message=?, response_payload=? WHERE id=?",
                      [$result_code, $result_desc, substr($raw, 0, 1000), $txn['id']]);
                } else {
                    q("INSERT INTO mpesa_transactions (transaction_type, checkout_request_id, status, response_code, response_message, request_payload)
                       VALUES ('stk_callback', ?, 'failed', ?, ?, ?)",
                      [$checkout_request_id, $result_code, $result_desc, substr($raw, 0, 1000)]);
                }
                log_error("STK callback failed", ['checkout_id' => $checkout_request_id, 'code' => $result_code, 'desc' => $result_desc]);
            }

            log_access('POST', 'mpesa/stk/callback', 200);
            header('Content-Type: application/json');
            echo json_encode(['ResultCode' => '0']);
            exit;
        }

        // POST /mpesa/b2c/result - B2C Result (admin disbursement result)
        if ($method === 'POST' && strpos($uri, 'mpesa/b2c/result') !== false) {
            $raw = file_get_contents('php://input');
            if (!empty($raw)) {
                $signature = $_SERVER['HTTP_X_SAFARICOM_SIGNATURE'] ?? '';
                if (!validateSafaricomSignature($raw, $signature, $is_production)) {
                    log_error("B2C result: signature verification failed", []);
                    log_access('POST', 'mpesa/b2c/result', 401);
                    echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Invalid signature']);
                    exit;
                }

                $parsed = MpesaXmlParser::parseB2cResultXml($raw);
                if ($parsed) {
                    $result_code = $parsed['result_code'];
                    $command_id = $parsed['originator_conversation_id'];
                    $transaction_id = $parsed['transaction_id'] ?? null;

                    $txn = one("SELECT id, loan_id FROM mpesa_transactions WHERE command_id = ?", [$command_id]);

                    if ($txn) {
                        $status = ($result_code === 0) ? 'disbursed' : 'failed';
                        q("UPDATE mpesa_transactions SET status=?, response_code=?, response_message=?, response_payload=? WHERE id=?",
                          [$status, $result_code, $parsed['result_desc'], substr($raw, 0, 1000), $txn['id']]);

                        if ($result_code === 0 && $txn['loan_id']) {
                            q("UPDATE loans SET status='active', disbursed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [$txn['loan_id']]);
                        }
                    } else {
                        q("INSERT INTO mpesa_transactions (transaction_type, command_id, status, response_code, response_message, request_payload)
                           VALUES ('b2c_result', ?, ?, ?, ?, ?)",
                          [$command_id, ($result_code === 0 ? 'disbursed' : 'failed'), $result_code, $parsed['result_desc'], substr($raw, 0, 1000)]);
                    }

                    log_error("B2C result: processed", ['command_id' => $command_id, 'code' => $result_code]);
                }
            }
            log_access('POST', 'mpesa/b2c/result', 200);
            echo json_encode(['ResultCode' => '0']);
            exit;
        }

        // POST /mpesa/b2c/timeout - B2C Timeout
        if ($method === 'POST' && strpos($uri, 'mpesa/b2c/timeout') !== false) {
            $raw = file_get_contents('php://input');
            if (!empty($raw)) {
                $signature = $_SERVER['HTTP_X_SAFARICOM_SIGNATURE'] ?? '';
                if (!validateSafaricomSignature($raw, $signature, $is_production)) {
                    log_error("B2C timeout: signature verification failed", []);
                    log_access('POST', 'mpesa/b2c/timeout', 401);
                    echo json_encode(['ResultCode' => '1', 'ResultDesc' => 'Invalid signature']);
                    exit;
                }

                $parsed = MpesaXmlParser::parseB2cResultXml($raw);
                if ($parsed) {
                    $command_id = $parsed['originator_conversation_id'];
                    q("INSERT INTO mpesa_transactions (transaction_type, command_id, status, request_payload)
                       VALUES ('b2c_timeout', ?, 'b2c_timeout', ?)",
                      [$command_id, substr($raw, 0, 1000)]);
                    log_error("B2C timeout: recorded", ['command_id' => $command_id]);
                }
            }
            log_access('POST', 'mpesa/b2c/timeout', 200);
            echo json_encode(['ResultCode' => '0']);
            exit;
        }

        http_response_code(404);
        log_error("Invalid mpesa request", ['method' => $method, 'uri' => $uri]);
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
