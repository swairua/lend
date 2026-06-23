-- Fully rewritten lending DB schema (FK corrected)

-- Drop existing objects (safe to re-run)
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS repayments;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS loan_products;
DROP TABLE IF EXISTS loan_categories;
DROP TABLE IF EXISTS borrowers;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  role ENUM('admin','borrower','agent','manager') NOT NULL DEFAULT 'borrower',
  permissions LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Borrowers
CREATE TABLE borrowers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  national_id VARCHAR(50) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  business_name VARCHAR(255) DEFAULT NULL,
  business_type VARCHAR(100) DEFAULT NULL,
  monthly_income DECIMAL(15,2) DEFAULT NULL,
  credit_score INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT borrowers_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Unified System Logs (replaces incomplete audit_logs)
CREATE TABLE system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  log_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT NULL,
  status VARCHAR(50) NULL,
  details LONGTEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_log_type (log_type),
  INDEX idx_created_at (created_at),
  CONSTRAINT system_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loan Categories
CREATE TABLE loan_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loan Products
CREATE TABLE loan_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  min_amount DECIMAL(15,2) NOT NULL,
  max_amount DECIMAL(15,2) NOT NULL,
  min_term_months INT NOT NULL,
  max_term_months INT NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  interest_type ENUM('flat','reducing') DEFAULT 'flat',
  processing_fee_percent DECIMAL(5,2) DEFAULT 0.00,
  asset_transfer_fee DECIMAL(15,2) DEFAULT 0.00,
  tracking_system_fee DECIMAL(15,2) DEFAULT 0.00,
  late_fee_percent DECIMAL(5,2) DEFAULT 0.00,
  requires_security TINYINT(1) DEFAULT 0,
  requires_guarantor TINYINT(1) DEFAULT 0,
  requires_postdated_checks TINYINT(1) DEFAULT 0,
  min_income DECIMAL(15,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_cat FOREIGN KEY (category_id) REFERENCES loan_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loans
CREATE TABLE loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  borrower_id INT NOT NULL,
  product_id INT NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_amount DECIMAL(15,2) NOT NULL,
  processing_fee DECIMAL(15,2) DEFAULT 0.00,
  asset_transfer_fee DECIMAL(15,2) DEFAULT 0.00,
  tracking_system_fee DECIMAL(15,2) DEFAULT 0.00,
  late_fee_rate DECIMAL(5,2) DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL,
  term_months INT NOT NULL,
  status ENUM('pending','approved','rejected','active','completed','defaulted','written_off') DEFAULT 'pending',
  approved_by INT DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  disbursed_at TIMESTAMP NULL DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  security_details TEXT DEFAULT NULL,
  guarantor_details TEXT DEFAULT NULL,
  purpose TEXT DEFAULT NULL,
  postdated_check_no VARCHAR(100) DEFAULT NULL,
  logbook_no VARCHAR(100) DEFAULT NULL,
  asset_description VARCHAR(255) DEFAULT NULL,
  asset_value DECIMAL(15,2) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status (status),
  CONSTRAINT fk_loans_borrower FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE,
  CONSTRAINT fk_loans_product FOREIGN KEY (product_id) REFERENCES loan_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_loans_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  type ENUM('disbursement','repayment','refund','processing_fee','asset_transfer','tracking_system') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  method ENUM('cash','mpesa','bank','cheque','other') DEFAULT 'bank',
  reference VARCHAR(100) DEFAULT NULL,
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_ibfk_1 FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Repayments
CREATE TABLE repayments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  principal_paid DECIMAL(15,2) NOT NULL,
  interest_paid DECIMAL(15,2) NOT NULL,
  penalty_paid DECIMAL(15,2) DEFAULT 0.00,
  late_fee_paid DECIMAL(15,2) DEFAULT 0.00,
  payment_method VARCHAR(20) DEFAULT 'cash',
  reference_number VARCHAR(100) DEFAULT NULL,
  paid_by INT DEFAULT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT repayments_ibfk_1 FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  CONSTRAINT repayments_ibfk_2 FOREIGN KEY (paid_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  loan_id INT DEFAULT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_ibfk_1 FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT messages_ibfk_2 FOREIGN KEY (recipient_id) REFERENCES users(id),
  CONSTRAINT messages_ibfk_3 FOREIGN KEY (loan_id) REFERENCES loans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL,
  key_value TEXT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Roles
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  permissions LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed data
INSERT INTO users (email, password, name, phone, role, permissions, created_at, updated_at, last_login, is_active)
VALUES
  ('admin@lending.com','$2a$10$examplepassword','Admin User', NULL, 'admin', NULL, NOW(), NOW(), NULL, 1),
  ('borrower@example.com','$2a$10$examplepassword','John Doe', NULL, 'borrower', NULL, NOW(), NOW(), NULL, 1);

INSERT INTO borrowers (user_id, national_id, address, business_name, business_type, monthly_income, credit_score, created_at, updated_at)
VALUES
  (2, NULL, NULL, NULL, NULL, NULL, 750, NOW(), NOW());

INSERT INTO loan_categories (name, code, is_active, created_at, updated_at)
VALUES
  ('Asset-Based Lending','ABL',1,NOW(),NOW());

INSERT INTO loan_products (category_id, name, description, min_amount, max_amount, min_term_months, max_term_months, interest_rate, interest_type, processing_fee_percent, asset_transfer_fee, tracking_system_fee, late_fee_percent, requires_security, requires_guarantor, requires_postdated_checks, min_income, is_active, created_at, updated_at)
VALUES
  (1,'Vehicle Loan',NULL,100000,1000000,12,60,12.00,'flat',4.00,7000,25000,2.50,1,0,0,0,1,NOW(),NOW());
