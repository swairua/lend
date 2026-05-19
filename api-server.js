/**
 * Local Development API Server for Lending App
 * Handles authentication and proxies to SQLite database
 */

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint for health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Lending App API Server is running' });
});

// Initialize SQLite database
const dbPath = path.join(__dirname, 'lending.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
function initializeSchema() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'borrower',
        permissions TEXT DEFAULT NULL,
        last_login TIMESTAMP DEFAULT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS borrowers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        national_id VARCHAR(50) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        business_name VARCHAR(255) DEFAULT NULL,
        business_type VARCHAR(100) DEFAULT NULL,
        monthly_income DECIMAL(12, 2) DEFAULT NULL,
        credit_score INTEGER DEFAULT 750,
        kra_pin VARCHAR(50) DEFAULT NULL,
        tcc_number VARCHAR(50) DEFAULT NULL,
        client_type VARCHAR(50) DEFAULT NULL,
        is_verified BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS loan_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loan_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        min_amount DECIMAL(12, 2) NOT NULL,
        max_amount DECIMAL(12, 2) NOT NULL,
        min_term_months INTEGER NOT NULL,
        max_term_months INTEGER NOT NULL,
        interest_rate DECIMAL(5, 2) NOT NULL,
        interest_type VARCHAR(50) DEFAULT 'flat',
        processing_fee_percent DECIMAL(5, 2) DEFAULT 0,
        asset_transfer_fee DECIMAL(12, 2) DEFAULT 0,
        tracking_system_fee DECIMAL(12, 2) DEFAULT 0,
        late_fee_percent DECIMAL(5, 2) DEFAULT 0,
        requires_security BOOLEAN DEFAULT 0,
        requires_guarantor BOOLEAN DEFAULT 0,
        requires_postdated_checks BOOLEAN DEFAULT 0,
        min_income DECIMAL(12, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES loan_categories(id)
      );

      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        borrower_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        principal_amount DECIMAL(12, 2) NOT NULL,
        interest_amount DECIMAL(12, 2) DEFAULT 0,
        processing_fee DECIMAL(12, 2) DEFAULT 0,
        asset_transfer_fee DECIMAL(12, 2) DEFAULT 0,
        tracking_system_fee DECIMAL(12, 2) DEFAULT 0,
        late_fee_rate DECIMAL(5, 2) DEFAULT 0,
        total_amount DECIMAL(12, 2) NOT NULL,
        term_months INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        approved_by INTEGER DEFAULT NULL,
        approved_at TIMESTAMP DEFAULT NULL,
        disbursed_at TIMESTAMP DEFAULT NULL,
        due_date DATE DEFAULT NULL,
        security_details TEXT DEFAULT NULL,
        guarantor_details TEXT DEFAULT NULL,
        postdated_check_no VARCHAR(100) DEFAULT NULL,
        logbook_no VARCHAR(100) DEFAULT NULL,
        asset_description TEXT DEFAULT NULL,
        asset_value DECIMAL(12, 2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
        FOREIGN KEY (product_id) REFERENCES loan_products(id)
      );

      CREATE TABLE IF NOT EXISTS repayments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        principal_paid DECIMAL(12, 2) DEFAULT 0,
        interest_paid DECIMAL(12, 2) DEFAULT 0,
        penalty_paid DECIMAL(12, 2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        reference_number VARCHAR(100) DEFAULT NULL,
        paid_by INTEGER DEFAULT NULL,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (paid_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        loan_id INTEGER DEFAULT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'notification',
        is_read BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id),
        FOREIGN KEY (loan_id) REFERENCES loans(id)
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        borrower_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        doc_type VARCHAR(100) NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (borrower_id) REFERENCES borrowers(id)
      );

      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        repayment_id INTEGER DEFAULT NULL,
        phone_number VARCHAR(20) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        mpesa_reference VARCHAR(100) DEFAULT NULL,
        checkout_request_id VARCHAR(100) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        response_code VARCHAR(50) DEFAULT NULL,
        response_message TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (repayment_id) REFERENCES repayments(id)
      );

      CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        borrower_id INTEGER NOT NULL,
        loan_id INTEGER DEFAULT NULL,
        message_type VARCHAR(50) NOT NULL,
        recipient_phone VARCHAR(20) NOT NULL,
        message_text TEXT NOT NULL,
        sms_status VARCHAR(50) DEFAULT 'pending',
        provider_reference VARCHAR(100) DEFAULT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
        FOREIGN KEY (loan_id) REFERENCES loans(id)
      );

      CREATE TABLE IF NOT EXISTS transaction_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER DEFAULT NULL,
        transaction_type VARCHAR(100) NOT NULL,
        transaction_reference VARCHAR(100) DEFAULT NULL,
        amount DECIMAL(12, 2) DEFAULT NULL,
        status VARCHAR(50) NOT NULL,
        details TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(255) NOT NULL UNIQUE,
        value TEXT DEFAULT NULL,
        setting_type VARCHAR(50) DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pdf_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        repayment_id INTEGER DEFAULT NULL,
        file_content BLOB NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (repayment_id) REFERENCES repayments(id)
      );

      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        borrower_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        document_id INTEGER,
        doc_type VARCHAR(100),
        performed_by_user_id INTEGER,
        performed_by_role VARCHAR(50),
        details TEXT,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (borrower_id) REFERENCES borrowers(id)
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        log_type VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        status VARCHAR(50),
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      DROP TABLE IF EXISTS audit_logs;
    `);

    // Seed demo users if they don't exist
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@lending.com');
    if (!adminExists) {
      const hashedPassword = hashPassword('Pass123');
      db.prepare(`
        INSERT INTO users (email, password, name, role, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run('admin@lending.com', hashedPassword, 'Admin User', 'admin');
      console.log('✓ Admin user created: admin@lending.com / Pass123');
    }

    const borrowerExists = db.prepare('SELECT id FROM users WHERE email = ?').get('borrower@lending.com');
    if (!borrowerExists) {
      const hashedPassword = hashPassword('Pass123');
      const result = db.prepare(`
        INSERT INTO users (email, password, name, role, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run('borrower@lending.com', hashedPassword, 'Borrower User', 'borrower');
      
      // Create borrower profile
      db.prepare(`
        INSERT INTO borrowers (user_id, credit_score)
        VALUES (?, 750)
      `).run(result.lastInsertRowid);
      console.log('✓ Borrower user created: borrower@lending.com / Pass123');
    }

    // Migration: Add payment_status column to repayments if it doesn't exist
    try {
      db.prepare('SELECT payment_status FROM repayments LIMIT 1').get();
    } catch (e) {
      if (e.message.includes('no such column')) {
        db.prepare(`
          ALTER TABLE repayments ADD COLUMN payment_status VARCHAR(50) DEFAULT 'applied'
        `).run();
        console.log('✓ Added payment_status column to repayments');
      }
    }

    // Seed categories if they don't exist
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM loan_categories').get().count;
    if (categoryCount === 0) {
      db.prepare(`
        INSERT INTO loan_categories (name, code, description)
        VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
      `).run(
        'Asset Finance', 'ASSET', 'Asset purchase/financing with logbook transfer',
        'Micro Finance', 'MICRO', 'Small loans against salary or security',
        'LPO Finance', 'LPO', 'Advancing against Local Purchase Orders'
      );
      console.log('✓ Loan categories seeded');
    }

    // Seed demo loan products if they don't exist
    const productCount = db.prepare('SELECT COUNT(*) as count FROM loan_products').get().count;
    if (productCount === 0) {
      const assetCategory = db.prepare('SELECT id FROM loan_categories WHERE code = ?').get('ASSET');
      const microCategory = db.prepare('SELECT id FROM loan_categories WHERE code = ?').get('MICRO');

      db.prepare(`
        INSERT INTO loan_products (
          category_id, name, description, min_amount, max_amount,
          min_term_months, max_term_months, interest_rate, interest_type,
          processing_fee_percent, asset_transfer_fee, late_fee_percent
        ) VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        assetCategory?.id, 'Asset-Backed Loans', 'Quick loans with asset security', 50000, 2000000,
        6, 60, 19.5, 'flat', 4, 7000, 2.5,
        microCategory?.id, 'Micro Loans', 'Small personal loans', 5000, 200000,
        3, 12, 25, 'flat', 5, 0, 3
      );
      console.log('✓ Loan products seeded');
    }

    // Demo loans seeding disabled to preserve user data
    // Loans should be created through the application UI

    console.log('✓ Database schema initialized');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

// Password hashing helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'lending-salt').digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authentication token' });
  }

  const token = authHeader.substring(7);
  const tokenRecord = db.prepare('SELECT user_id FROM tokens WHERE token = ?').get(token);
  
  if (!tokenRecord) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenRecord.user_id);
  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' });
  }

  req.user = user;
  next();
}

// System Event Logging Helper
function logSystemEvent(userId, logType, action, entityType, entityId, status = 'success', details = null) {
  try {
    db.prepare(`
      INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      logType,
      action,
      entityType || null,
      entityId || null,
      status,
      details ? JSON.stringify(details) : null
    );
  } catch (error) {
    console.error('System log error:', error.message);
  }
}

// Backward compatibility alias for existing code
function logAudit(userId, action, entityType, entityId, details = null) {
  logSystemEvent(userId, 'loan_action', action, entityType, entityId, 'success', details);
}

// Document Audit Logging Helper
function logDocumentAudit(borrowerId, action, documentId, docType, performedByUserId, performedByRole, status, details = null) {
  try {
    db.prepare(`
      INSERT INTO document_audit_log (borrower_id, action, document_id, doc_type, performed_by_user_id, performed_by_role, status, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(borrowerId, action, documentId || null, docType || null, performedByUserId, performedByRole, status, details || null);
  } catch (error) {
    console.error('Document audit log error:', error.message);
  }
}

// Payment Audit Logging Helper
function logPaymentAudit(userId, action, entityType, entityId, status = 'success', details = null) {
  logSystemEvent(userId, 'payment', action, entityType, entityId, status, details);
}

// User Management Audit Logging Helper
function logUserManagementAudit(userId, action, targetUserId, status = 'success', details = null) {
  logSystemEvent(userId, 'user_mgmt', action, 'user', targetUserId, status, details);
}

// Loan Action Audit Logging Helper (explicit wrapper)
function logLoanAudit(userId, action, loanId, status = 'success', details = null) {
  logSystemEvent(userId, 'loan_action', action, 'loan', loanId, status, details);
}

// SMS Audit Logging Helper
function logSmsAudit(userId, action, borrowerId, status = 'success', details = null) {
  logSystemEvent(userId, 'sms', action, 'sms_log', borrowerId, status, details);
}

// Admin Action Audit Logging Helper
function logAdminActionAudit(userId, action, entityType, entityId, status = 'success', details = null) {
  logSystemEvent(userId, 'admin_action', action, entityType, entityId, status, details);
}

// Routes

// Auth - Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  if (!user.is_active) {
    return res.status(401).json({ success: false, error: 'User account is inactive' });
  }

  // Create token
  const token = 't_' + crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO tokens (user_id, token) VALUES (?, ?)').run(user.id, token);
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  // Get borrower info if applicable
  const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(user.id);

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    borrower_id: borrower?.id || null,
  };

  res.json({
    success: true,
    token,
    user: payload,
    data: { token, user: payload }
  });
});

// Auth - Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone, client_type } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: 'Email, password, and name required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }

  const hashedPassword = hashPassword(password);
  const result = db.prepare(`
    INSERT INTO users (email, password, name, phone, role, is_active)
    VALUES (?, ?, ?, ?, 'borrower', 1)
  `).run(email, hashedPassword, name, phone);

  // Create borrower profile
  db.prepare('INSERT INTO borrowers (user_id, client_type) VALUES (?, ?)').run(result.lastInsertRowid, client_type);

  // Create token
  const token = 't_' + crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO tokens (user_id, token) VALUES (?, ?)').run(result.lastInsertRowid, token);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(user.id);

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    borrower_id: borrower.id,
  };

  res.json({
    success: true,
    token,
    user: payload,
    data: { token, user: payload }
  });
});

// Auth - Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
  const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      phone: req.user.phone,
      role: req.user.role,
      borrower_id: borrower?.id || null,
    }
  });
});

// ===== Borrower Endpoints =====

// Create loan application
app.post('/api/borrower/loans', authenticate, (req, res) => {
  try {
    const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
    if (!borrower) {
      return res.status(403).json({ success: false, error: 'Borrower profile not found' });
    }

    const { product_id, amount, term_months, security_details, guarantor_details, postdated_check_no, logbook_no, asset_description, asset_value } = req.body;
    if (!product_id || !amount || !term_months) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const product = db.prepare('SELECT * FROM loan_products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const interest_rate = product.interest_rate || 10;
    const total_amount = amount + (amount * interest_rate * term_months / 100 / 12);
    const due_date = new Date();
    due_date.setMonth(due_date.getMonth() + term_months);

    const result = db.prepare(`
      INSERT INTO loans (borrower_id, product_id, principal_amount, total_amount, term_months, interest_rate, status, due_date, security_details, guarantor_details, postdated_check_no, logbook_no, asset_description, asset_value)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
    `).run(borrower.id, product_id, amount, total_amount, term_months, interest_rate, due_date.toISOString(), security_details || null, guarantor_details || null, postdated_check_no || null, logbook_no || null, asset_description || null, asset_value || null);

    res.json({
      success: true,
      message: 'Loan application created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ success: false, error: 'Failed to create loan application' });
  }
});

// Get borrower's loans
app.get('/api/borrower/loans', authenticate, (req, res) => {
  try {
    const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
    if (!borrower) {
      return res.json({ success: true, data: { loans: [], pagination: { total: 0 } } });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM loans WHERE borrower_id = ?').get(borrower.id)?.count || 0;
    const loans = db.prepare(`
      SELECT l.*, p.name as product_name
      FROM loans l
      LEFT JOIN loan_products p ON l.product_id = p.id
      WHERE l.borrower_id = ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).all(borrower.id, limit, offset);
    console.log(`[getMyLoans] Borrower ${borrower.id}: Found ${total} total loans, returning ${loans.length} (page ${page}, limit ${limit})`);

    res.json({
      success: true,
      data: {
        loans: loans || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching borrower loans:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loans' });
  }
});

// Get single loan details
app.get('/api/borrower/loans/:id', authenticate, (req, res) => {
  try {
    const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
    if (!borrower) {
      return res.status(403).json({ success: false, error: 'Borrower profile not found' });
    }

    const loanId = parseInt(req.params.id);
    const loan = db.prepare(`
      SELECT l.*, p.name as product_name
      FROM loans l
      LEFT JOIN loan_products p ON l.product_id = p.id
      WHERE l.id = ? AND l.borrower_id = ?
    `).get(loanId, borrower.id);

    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    const repayments = db.prepare('SELECT * FROM repayments WHERE loan_id = ? ORDER BY paid_at DESC').all(loanId);
    const totalPaid = repayments.reduce((sum, r) => sum + (r.amount || 0), 0);

    res.json({
      success: true,
      data: {
        ...loan,
        repayments: repayments || [],
        total_paid: totalPaid,
        balance: loan.total_amount - totalPaid
      }
    });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loan' });
  }
});

// Get borrower dashboard
app.get('/api/borrower/dashboard', authenticate, (req, res) => {
  try {
    const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
    console.log(`[Dashboard] User ${req.user.id} => Borrower ${borrower?.id}`);

    let activeLoanCount = 0;
    let pendingLoanCount = 0;
    let totalBorrowed = 0;
    let totalPaid = 0;
    let recentLoans = [];

    if (borrower) {
      const allLoans = db.prepare('SELECT id, status FROM loans WHERE borrower_id = ?').all(borrower.id);
      console.log(`[Dashboard] Borrower ${borrower.id}: All loans:`, allLoans);
      activeLoanCount = db.prepare('SELECT COUNT(*) as count FROM loans WHERE borrower_id = ? AND status IN ("active", "approved")').get(borrower.id)?.count || 0;
      pendingLoanCount = db.prepare('SELECT COUNT(*) as count FROM loans WHERE borrower_id = ? AND status = "pending"').get(borrower.id)?.count || 0;
      console.log(`[Dashboard] Borrower ${borrower.id}: ${activeLoanCount} active, ${pendingLoanCount} pending`);

      const borrowed = db.prepare('SELECT COALESCE(SUM(principal_amount), 0) as total FROM loans WHERE borrower_id = ?').get(borrower.id);
      totalBorrowed = borrowed?.total || 0;

      const paid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM repayments r JOIN loans l ON r.loan_id = l.id WHERE l.borrower_id = ?').get(borrower.id);
      totalPaid = paid?.total || 0;

      recentLoans = db.prepare(`
        SELECT l.*, p.name as product_name
        FROM loans l
        LEFT JOIN loan_products p ON l.product_id = p.id
        WHERE l.borrower_id = ?
        ORDER BY l.created_at DESC
        LIMIT 5
      `).all(borrower.id) || [];
    }

    res.json({
      success: true,
      data: {
        active_loans: activeLoanCount,
        pending_loans: pendingLoanCount,
        total_borrowed: totalBorrowed,
        total_paid: totalPaid,
        credit_score: 750,
        recent_loans: recentLoans
      }
    });
  } catch (error) {
    console.error('Error fetching borrower dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

// Get borrower repayments
app.get('/api/borrower/repayments', authenticate, (req, res) => {
  try {
    const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);

    let repayments = [];
    if (borrower) {
      repayments = db.prepare(`
        SELECT r.* FROM repayments r
        JOIN loans l ON r.loan_id = l.id
        WHERE l.borrower_id = ?
        ORDER BY r.paid_at DESC
      `).all(borrower.id) || [];
    }

    res.json({
      success: true,
      data: repayments
    });
  } catch (error) {
    console.error('Error fetching repayments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch repayments' });
  }
});

// Admin - Get dashboard stats
app.get('/api/admin/dashboard', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    // Get basic stats
    const totalBorrowers = db.prepare('SELECT COUNT(*) as count FROM borrowers').get().count;
    const totalLoans = db.prepare('SELECT COUNT(*) as count FROM loans').get().count;
    const activeLoans = db.prepare('SELECT COUNT(*) as count FROM loans WHERE status = ?').get('active').count;
    const pendingLoans = db.prepare('SELECT COUNT(*) as count FROM loans WHERE status = ?').get('pending').count;

    const totalDisbursedResult = db.prepare('SELECT COALESCE(SUM(principal_amount), 0) as total FROM loans WHERE status IN (?, ?, ?)').get('active', 'disbursed', 'completed');
    const totalCollected = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM repayments').get().total;

    const defaultLoans = db.prepare('SELECT COUNT(*) as count FROM loans WHERE status = ?').get('defaulted').count;
    const approvedLoans = db.prepare('SELECT COUNT(*) as count FROM loans WHERE status IN (?, ?, ?)').get('approved', 'active', 'disbursed').count;

    const defaultRate = totalLoans > 0 ? ((defaultLoans / totalLoans) * 100) : 0;
    const approvalRate = totalLoans > 0 ? ((approvedLoans / totalLoans) * 100) : 0;

    // Get recent loans with borrower details
    const recentLoans = db.prepare(`
      SELECT
        l.id,
        l.principal_amount,
        l.status,
        u.name as borrower_name,
        lp.name as product_name
      FROM loans l
      JOIN borrowers b ON l.borrower_id = b.id
      JOIN users u ON b.user_id = u.id
      JOIN loan_products lp ON l.product_id = lp.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `).all();

    // Get monthly disbursements for last 6 months
    const monthlyDisbursements = db.prepare(`
      SELECT
        strftime('%Y-%m', l.created_at) as month,
        COUNT(*) as count,
        COALESCE(SUM(l.principal_amount), 0) as total
      FROM loans l
      WHERE l.status IN (?, ?, ?)
      GROUP BY strftime('%Y-%m', l.created_at)
      ORDER BY month DESC
      LIMIT 6
    `).all('active', 'disbursed', 'completed');

    // Get category distribution
    const categoryDistribution = db.prepare(`
      SELECT
        lc.name as category,
        COUNT(l.id) as count,
        ROUND((COUNT(l.id) * 100.0) / (SELECT COUNT(*) FROM loans), 1) as percentage
      FROM loan_categories lc
      LEFT JOIN loan_products lp ON lc.id = lp.category_id
      LEFT JOIN loans l ON lp.id = l.product_id
      GROUP BY lc.id, lc.name
      HAVING count > 0 OR lc.is_active = 1
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      data: {
        total_borrowers: totalBorrowers,
        total_loans: totalLoans,
        active_loans: activeLoans,
        pending_loans: pendingLoans,
        total_disbursed: totalDisbursedResult.total || 0,
        total_collected: totalCollected,
        default_rate: parseFloat(defaultRate.toFixed(1)),
        approval_rate: parseFloat(approvalRate.toFixed(1)),
        changes: {
          borrowers: 5,
          loans: 3,
          active_loans: 2,
          disbursed: 8,
          collected: 12,
        },
        recent_loans: recentLoans,
        monthly_disbursements: monthlyDisbursements.reverse(),
        category_distribution: categoryDistribution,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// File uploads
app.post('/api/uploads', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'File is required' });
  }

  const doc_type = req.body.doc_type || 'general';
  const borrower_id = req.body.borrower_id ? parseInt(String(req.body.borrower_id).trim()) : 0;

  if (!borrower_id || isNaN(borrower_id)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, error: 'Borrower ID is required' });
  }

  // Validate borrower exists before inserting document
  const borrower = db.prepare('SELECT id FROM borrowers WHERE id = ?').get(borrower_id);
  if (!borrower) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, error: 'Borrower not found' });
  }

  const isBorrower = req.user.role === 'borrower';

  // If borrower, check if document type already exists
  if (isBorrower) {
    const existingDoc = db.prepare('SELECT id FROM documents WHERE borrower_id = ? AND doc_type = ?').get(borrower_id, doc_type);
    if (existingDoc) {
      fs.unlink(req.file.path, () => {});
      logDocumentAudit(borrower_id, 'upload_attempt_rejected', null, doc_type, req.user.id, 'borrower', 'rejected', 'Document type already exists');
      return res.status(400).json({ success: false, error: 'Document type already exists for this borrower' });
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO documents (borrower_id, filename, original_name, file_type, doc_type, file_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      borrower_id,
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      doc_type,
      `/uploads/${req.file.filename}`
    );

    const document = db.prepare('SELECT id, filename, original_name as file_name, doc_type, uploaded_at as created_at, file_url FROM documents WHERE id = ?').get(result.lastInsertRowid);

    logDocumentAudit(borrower_id, 'upload', result.lastInsertRowid, doc_type, req.user.id, req.user.role, 'success', null);

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up uploaded file on error
    fs.unlink(req.file.path, () => {});
    logDocumentAudit(borrower_id, 'upload', null, doc_type, req.user.id, req.user.role, 'error', error.message);
    res.status(500).json({ success: false, error: 'Failed to save document info' });
  }
});

// Get uploaded files
app.get('/api/uploads', authenticate, (req, res) => {
  const borrower_id = req.query.borrower_id ? parseInt(req.query.borrower_id) : null;

  try {
    let query = 'SELECT id, filename, original_name as file_name, doc_type, uploaded_at as created_at, file_url FROM documents';
    let params = [];

    if (borrower_id) {
      query += ' WHERE borrower_id = ?';
      params.push(borrower_id);
    }

    query += ' ORDER BY uploaded_at DESC';
    const documents = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

// Get single document by ID
app.get('/api/uploads/:id', authenticate, (req, res) => {
  const doc_id = parseInt(req.params.id);

  try {
    const document = db.prepare('SELECT id, filename, original_name as file_name, doc_type, uploaded_at as created_at, file_url, borrower_id FROM documents WHERE id = ?').get(doc_id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document' });
  }
});

// Delete uploaded file
app.delete('/api/uploads/:id', authenticate, (req, res) => {
  const doc_id = parseInt(req.params.id);

  try {
    const document = db.prepare('SELECT filename, file_url, borrower_id, doc_type FROM documents WHERE id = ?').get(doc_id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Block borrower from deleting documents
    if (req.user.role === 'borrower') {
      logDocumentAudit(document.borrower_id, 'delete_attempt_rejected', doc_id, document.doc_type, req.user.id, 'borrower', 'rejected', 'Borrower attempted to delete document');
      return res.status(403).json({ success: false, error: 'You cannot delete documents. Contact your administrator for assistance.' });
    }

    // Delete the file from disk
    const filePath = path.join(uploadsDir, document.filename);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    // Delete the database record
    db.prepare('DELETE FROM documents WHERE id = ?').run(doc_id);

    logDocumentAudit(document.borrower_id, 'delete', doc_id, document.doc_type, req.user.id, 'admin', 'success', null);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// ========== M-PESA ENDPOINTS ==========

// POST /api/admin/mpesa/test - Test M-Pesa credentials
app.post('/api/admin/mpesa/test', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { consumer_key, consumer_secret, business_shortcode, passkey, environment } = req.body;

  if (!consumer_key || !consumer_secret || !business_shortcode || !passkey) {
    return res.status(400).json({ success: false, error: 'All M-Pesa credentials are required' });
  }

  try {
    // Validate credentials by attempting to get an access token
    const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
    const baseUrl = environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
        },
        signal: controller.signal,
      }
    ).then(response => {
      clearTimeout(timeoutId);
      if (response.ok) {
        res.json({
          success: true,
          message: 'M-Pesa credentials are valid',
          environment: environment
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid M-Pesa credentials. Please check your Consumer Key and Secret.'
        });
      }
    }).catch(error => {
      clearTimeout(timeoutId);
      console.error('M-Pesa test error:', error);

      if (error.name === 'AbortError') {
        res.status(408).json({
          success: false,
          error: 'Connection timeout. M-Pesa API is unreachable. Check your internet connection and try again.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to test credentials: ' + error.message
        });
      }
    });
  } catch (error) {
    console.error('M-Pesa credential test error:', error);
    res.status(500).json({ success: false, error: 'Server error while testing credentials' });
  }
});

// GET /api/admin/mpesa/orphaned-payments - Get orphaned M-Pesa transactions
app.get('/api/admin/mpesa/orphaned-payments', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    // Find orphaned M-Pesa transactions (successful but no linked repayment)
    const orphanedTransactions = db.prepare(`
      SELECT
        mt.*,
        l.borrower_id,
        b.user_id as borrower_user_id,
        u.name as borrower_name,
        u.phone as borrower_phone,
        l.total_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM repayments WHERE loan_id = mt.loan_id) as total_repaid
      FROM mpesa_transactions mt
      JOIN loans l ON mt.loan_id = l.id
      JOIN borrowers b ON l.borrower_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE mt.status = 'success' AND mt.repayment_id IS NULL
      ORDER BY mt.created_at DESC
    `).all();

    // Find pending M-Pesa transactions (timeout scenarios)
    const pendingTransactions = db.prepare(`
      SELECT
        mt.*,
        l.borrower_id,
        b.user_id as borrower_user_id,
        u.name as borrower_name,
        u.phone as borrower_phone,
        l.total_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM repayments WHERE loan_id = mt.loan_id) as total_repaid
      FROM mpesa_transactions mt
      JOIN loans l ON mt.loan_id = l.id
      JOIN borrowers b ON l.borrower_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE mt.status = 'pending'
      AND mt.created_at < datetime('now', '-24 hours')
      ORDER BY mt.created_at DESC
    `).all();

    res.json({
      success: true,
      data: {
        orphaned: orphanedTransactions,
        pending_timeout: pendingTransactions,
        total_orphaned: orphanedTransactions.length,
        total_pending: pendingTransactions.length
      }
    });
  } catch (error) {
    console.error('Error fetching orphaned payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orphaned payments: ' + error.message
    });
  }
});

// POST /api/admin/mpesa/sync-payments - Sync orphaned M-Pesa payments to repayments
app.post('/api/admin/mpesa/sync-payments', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { loan_id } = req.query;

  try {
    const syncReport = {
      applied: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      errorDetails: []
    };

    // Find orphaned M-Pesa transactions (successful but no linked repayment)
    let orphanedTransactions;
    if (loan_id) {
      orphanedTransactions = db.prepare(`
        SELECT mt.* FROM mpesa_transactions mt
        WHERE mt.status = 'success'
        AND mt.repayment_id IS NULL
        AND mt.loan_id = ?
        ORDER BY mt.created_at ASC
      `).all(loan_id);
    } else {
      orphanedTransactions = db.prepare(`
        SELECT mt.* FROM mpesa_transactions mt
        WHERE mt.status = 'success'
        AND mt.repayment_id IS NULL
        ORDER BY mt.created_at ASC
      `).all();
    }

    // Process each orphaned transaction
    for (const transaction of orphanedTransactions) {
      try {
        // Get loan details for principal/interest allocation
        const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(transaction.loan_id);
        if (!loan) {
          syncReport.skipped++;
          continue;
        }

        // Calculate total repaid so far (excluding this transaction)
        const totalRepaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?
        `).get(transaction.loan_id).total;

        // Allocate principal and interest
        let principalPaid = transaction.amount;
        let interestPaid = 0;

        const remainingPrincipal = loan.principal_amount - (totalRepaid - loan.interest_amount);
        if (remainingPrincipal > 0 && remainingPrincipal < principalPaid) {
          principalPaid = remainingPrincipal;
          interestPaid = transaction.amount - principalPaid;
        }

        // Create repayment record
        const repaymentResult = db.prepare(`
          INSERT INTO repayments (
            loan_id, amount, principal_paid, interest_paid,
            payment_method, reference_number, payment_status, paid_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          transaction.loan_id,
          transaction.amount,
          principalPaid,
          interestPaid,
          'mpesa',
          transaction.mpesa_reference,
          'applied'
        );

        // Link repayment to M-Pesa transaction
        db.prepare(`
          UPDATE mpesa_transactions SET repayment_id = ? WHERE id = ?
        `).run(repaymentResult.lastInsertRowid, transaction.id);

        // Check if loan is fully paid
        const newTotalRepaid = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?
        `).get(transaction.loan_id).total;

        if (newTotalRepaid >= loan.total_amount) {
          db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('completed', transaction.loan_id);
        }

        syncReport.created++;
      } catch (error) {
        syncReport.errors++;
        syncReport.errorDetails.push({
          transaction_id: transaction.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Sync completed. Created: ${syncReport.created}, Applied: ${syncReport.applied}, Skipped: ${syncReport.skipped}, Errors: ${syncReport.errors}`,
      data: syncReport
    });
  } catch (error) {
    console.error('M-Pesa sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync payments: ' + error.message
    });
  }
});

// POST /api/mpesa/payment - Initiate STK Push for repayment
app.post('/api/mpesa/payment', authenticate, (req, res) => {
  const { loan_id, amount, phone_number } = req.body;

  if (!loan_id || !amount || !phone_number) {
    return res.status(400).json({ success: false, error: 'loan_id, amount, and phone_number required' });
  }

  try {
    // Validate loan exists and is active
    const loan = db.prepare('SELECT l.*, b.user_id FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.id = ?').get(loan_id);

    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    if (loan.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (loan.status !== 'active' && loan.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Loan is not active or approved' });
    }

    // Create M-Pesa transaction record
    const checkoutRequestId = 'ws_CO_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const mpesaRef = 'MPE_' + Date.now();

    const result = db.prepare(`
      INSERT INTO mpesa_transactions (
        loan_id, phone_number, amount, transaction_type,
        checkout_request_id, mpesa_reference, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(loan_id, phone_number, amount, 'stk_push', checkoutRequestId, mpesaRef, 'pending');

    // Log transaction
    db.prepare(`
      INSERT INTO transaction_logs (
        loan_id, transaction_type, transaction_reference,
        amount, status, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      loan_id,
      'mpesa_stk_push',
      mpesaRef,
      amount,
      'initiated',
      JSON.stringify({ phone: phone_number, request_id: checkoutRequestId })
    );

    logPaymentAudit(req.user.id, 'mpesa_stk_push_initiated', 'mpesa_transaction', result.lastInsertRowid, 'pending', {
      loan_id: loan_id,
      amount: amount,
      phone: phone_number,
      reference: mpesaRef
    });

    // In production: Call M-Pesa API to initiate STK push
    // For now, return success response
    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        checkout_request_id: checkoutRequestId,
        mpesa_reference: mpesaRef,
        phone_number,
        amount,
        status: 'pending',
        message: 'STK push initiated. Please enter your M-Pesa PIN to complete payment.'
      }
    });
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate payment' });
  }
});

// POST /api/mpesa/disburse - B2C disbursement to borrower
app.post('/api/mpesa/disburse', authenticate, (req, res) => {
  const { loan_id, phone_number } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  if (!loan_id || !phone_number) {
    return res.status(400).json({ success: false, error: 'loan_id and phone_number required' });
  }

  try {
    // Validate loan and get disbursement amount
    const loan = db.prepare(`
      SELECT l.* FROM loans l WHERE l.id = ? AND l.status IN (?, ?)
    `).get(loan_id, 'approved', 'pending');

    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found or not ready for disbursement' });
    }

    // Calculate actual disbursement (principal + fees - deductions)
    const disbursementAmount = loan.principal_amount - (loan.processing_fee || 0);

    const mpesaRef = 'DISBURSE_' + Date.now();
    const transactionId = 'B2C_' + Math.random().toString(36).substring(7).toUpperCase();

    // Create transaction record
    const result = db.prepare(`
      INSERT INTO mpesa_transactions (
        loan_id, phone_number, amount, transaction_type,
        mpesa_reference, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(loan_id, phone_number, disbursementAmount, 'b2c_disburse', mpesaRef, 'pending');

    // Update loan status to disbursed
    db.prepare(`
      UPDATE loans SET status = ?, disbursed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run('disbursed', loan_id);

    // Audit log
    logPaymentAudit(req.user.id, 'loan_disbursed', 'loan', loan_id, 'success', {
      amount: disbursementAmount,
      method: 'mpesa_b2c',
      phone: phone_number
    });

    // Log transaction
    db.prepare(`
      INSERT INTO transaction_logs (
        loan_id, transaction_type, transaction_reference,
        amount, status, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      loan_id,
      'mpesa_b2c_disburse',
      mpesaRef,
      disbursementAmount,
      'initiated',
      JSON.stringify({ phone: phone_number, transaction_id: transactionId })
    );

    // In production: Call M-Pesa B2C API
    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        mpesa_reference: mpesaRef,
        transaction_id: transactionId,
        phone_number,
        amount: disbursementAmount,
        status: 'pending',
        message: 'Disbursement initiated. Funds will be sent to borrower shortly.'
      }
    });
  } catch (error) {
    console.error('M-Pesa disburse error:', error);
    res.status(500).json({ success: false, error: 'Failed to process disbursement' });
  }
});

// POST /api/mpesa/callback - Webhook handler for payment notifications
app.post('/api/mpesa/callback', (req, res) => {
  // M-Pesa callback data
  const callbackData = req.body;

  try {
    // For STK Push responses
    if (callbackData.Body && callbackData.Body.stkCallback) {
      const stkCallback = callbackData.Body.stkCallback;
      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;

      // Find transaction by checkout request ID
      const transaction = db.prepare(`
        SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?
      `).get(checkoutRequestId);

      if (transaction) {
        if (resultCode === 0) {
          // Payment successful
          const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
          const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value || '';
          const transactionDate = callbackMetadata.find(item => item.Name === 'TransactionDate')?.Value || '';
          const phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value || '';

          // Update transaction
          db.prepare(`
            UPDATE mpesa_transactions SET
              status = ?, mpesa_reference = ?, response_code = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run('success', mpesaReceiptNumber, resultCode, transaction.id);

          // Create repayment record
          const repaymentResult = db.prepare(`
            INSERT INTO repayments (
              loan_id, amount, principal_paid, interest_paid,
              payment_method, reference_number, payment_status, paid_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            transaction.loan_id,
            transaction.amount,
            transaction.amount,
            0,
            'mpesa',
            mpesaReceiptNumber,
            'applied'
          );

          // Update M-Pesa transaction with repayment link
          db.prepare(`
            UPDATE mpesa_transactions SET repayment_id = ? WHERE id = ?
          `).run(repaymentResult.lastInsertRowid, transaction.id);

          // Log transaction
          db.prepare(`
            INSERT INTO transaction_logs (
              loan_id, transaction_type, transaction_reference,
              amount, status, details
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            transaction.loan_id,
            'mpesa_payment_received',
            mpesaReceiptNumber,
            transaction.amount,
            'completed',
            JSON.stringify({ phone: phoneNumber, date: transactionDate })
          );

          logPaymentAudit(null, 'mpesa_callback_received', 'mpesa_transaction', transaction.id, 'success', {
            reference: mpesaReceiptNumber,
            amount: transaction.amount,
            phone: phoneNumber,
            date: transactionDate,
            loan_id: transaction.loan_id
          });

          // Check if loan is fully paid
          const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(transaction.loan_id);
          const totalRepaid = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?
          `).get(transaction.loan_id).total;

          if (totalRepaid >= loan.total_amount) {
            db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('completed', transaction.loan_id);
          }
        } else {
          // Payment failed
          db.prepare(`
            UPDATE mpesa_transactions SET
              status = ?, response_code = ?, response_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run('failed', resultCode, resultDesc, transaction.id);

          db.prepare(`
            INSERT INTO transaction_logs (
              loan_id, transaction_type, status, details
            ) VALUES (?, ?, ?, ?)
          `).run(
            transaction.loan_id,
            'mpesa_payment_failed',
            'failed',
            JSON.stringify({ code: resultCode, message: resultDesc })
          );

          logPaymentAudit(null, 'mpesa_callback_received', 'mpesa_transaction', transaction.id, 'failed', {
            code: resultCode,
            message: resultDesc,
            loan_id: transaction.loan_id
          });
        }
      }
    }

    // Acknowledge receipt to M-Pesa
    res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.json({
      ResultCode: 1,
      ResultDesc: 'Error processing callback'
    });
  }
});

// ========== SMS ENDPOINTS ==========

// POST /api/sms/send - Send SMS to borrower
app.post('/api/sms/send', authenticate, (req, res) => {
  const { borrower_id, loan_id, message_type, phone_number, custom_message } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  if (!borrower_id || !phone_number || !message_type) {
    return res.status(400).json({ success: false, error: 'borrower_id, phone_number, and message_type required' });
  }

  try {
    // Validate borrower exists
    const borrower = db.prepare('SELECT id FROM borrowers WHERE id = ?').get(borrower_id);
    if (!borrower) {
      return res.status(404).json({ success: false, error: 'Borrower not found' });
    }

    // Generate SMS message based on type
    let messageText = custom_message;
    if (!messageText) {
      const loan = loan_id ? db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id) : null;

      switch (message_type) {
        case 'loan_approved':
          messageText = `Congratulations! Your loan of KES ${loan?.principal_amount || 'X'} has been approved. Check your account for details.`;
          break;
        case 'loan_disbursed':
          messageText = `Your loan has been disbursed. The amount will be sent to your phone shortly. Check your M-Pesa.`;
          break;
        case 'payment_reminder':
          const nextRepayment = loan ? db.prepare(`
            SELECT * FROM repayments WHERE loan_id = ? AND principal_paid > 0 ORDER BY paid_at DESC LIMIT 1
          `).get(loan_id) : null;
          messageText = `Payment reminder: You have an upcoming loan repayment. Please make payment to avoid penalties.`;
          break;
        case 'payment_received':
          messageText = `We have received your payment. Your loan account has been updated.`;
          break;
        case 'default_notice':
          messageText = `Important: Your loan repayment is overdue. Please pay immediately to avoid further penalties.`;
          break;
        default:
          if (!messageText) {
            return res.status(400).json({ success: false, error: 'message_type unknown and no custom message provided' });
          }
      }
    }

    // Create SMS log
    const result = db.prepare(`
      INSERT INTO sms_logs (
        borrower_id, loan_id, message_type, recipient_phone,
        message_text, sms_status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(borrower_id, loan_id || null, message_type, phone_number, messageText, 'pending');

    const smsLogId = result.lastInsertRowid;
    logSmsAudit(req.user.id, 'sms_sent', borrower_id, 'success', {
      sms_log_id: smsLogId,
      message_type: message_type,
      phone_number: phone_number,
      loan_id: loan_id || null,
      message_length: messageText.length
    });

    // In production: Integrate with SMS provider (e.g., Twilio, Africa's Talking)
    // For now, simulate sending and mark as sent
    setTimeout(() => {
      db.prepare(`
        UPDATE sms_logs SET sms_status = ?, provider_reference = ? WHERE id = ?
      `).run('sent', 'SMS_' + Date.now(), smsLogId);
    }, 100);

    res.json({
      success: true,
      data: {
        id: smsLogId,
        phone_number,
        message_type,
        status: 'pending',
        message_length: messageText.length,
        message: 'SMS queued for sending'
      }
    });
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({ success: false, error: 'Failed to send SMS' });
  }
});

// GET /api/sms/logs - Get SMS logs
app.get('/api/sms/logs', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const borrower_id = req.query.borrower_id ? parseInt(req.query.borrower_id) : null;
  const loan_id = req.query.loan_id ? parseInt(req.query.loan_id) : null;

  try {
    let query = `
      SELECT
        id, borrower_id, loan_id, message_type, recipient_phone,
        message_text, sms_status, provider_reference, sent_at
      FROM sms_logs
    `;
    const params = [];

    const conditions = [];
    if (borrower_id) {
      conditions.push('borrower_id = ?');
      params.push(borrower_id);
    }
    if (loan_id) {
      conditions.push('loan_id = ?');
      params.push(loan_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sent_at DESC LIMIT 100';
    const logs = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch SMS logs' });
  }
});

// GET /api/transactions - Get transaction history
app.get('/api/transactions', authenticate, (req, res) => {
  const loan_id = req.query.loan_id ? parseInt(req.query.loan_id) : null;

  try {
    let query = `
      SELECT
        id, loan_id, transaction_type, transaction_reference,
        amount, status, details, created_at
      FROM transaction_logs
    `;
    const params = [];

    if (loan_id) {
      query += ' WHERE loan_id = ?';
      params.push(loan_id);
    }

    // Filter by user if not admin
    if (req.user.role !== 'admin') {
      const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
      if (!borrower) {
        return res.json({ success: true, data: [] });
      }
      const baseQuery = query;
      query = `
        SELECT tl.* FROM transaction_logs tl
        JOIN loans l ON tl.loan_id = l.id
        WHERE l.borrower_id = ?
      `;
      if (loan_id) {
        query += ' AND tl.loan_id = ?';
      }
      params.unshift(borrower.id);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const transactions = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// ========== SETTINGS ENDPOINTS ==========

// GET /api/admin/settings - Retrieve all settings
app.get('/api/admin/settings', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const settings = db.prepare('SELECT key, value, setting_type FROM settings').all();
    const configArray = [];
    const configObj = {};

    settings.forEach(setting => {
      let parsedValue = setting.value;
      if (setting.setting_type === 'json') {
        try {
          parsedValue = JSON.parse(setting.value);
        } catch (e) {
          parsedValue = setting.value;
        }
      } else if (setting.setting_type === 'boolean') {
        parsedValue = setting.value === 'true' || setting.value === '1';
      }
      configObj[setting.key] = parsedValue;
      configArray.push({
        key_name: setting.key,
        key_value: setting.value,
        description: ''
      });
    });

    res.json({ success: true, data: configArray });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// POST /api/admin/settings/bulk - Update multiple settings
app.post('/api/admin/settings/bulk', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  let settingsData = req.body;

  // Handle both formats: array of {key_name, key_value} or object {key: value}
  let settingsArray = [];

  if (Array.isArray(settingsData?.settings)) {
    settingsArray = settingsData.settings;
  } else if (Array.isArray(settingsData)) {
    settingsArray = settingsData;
  } else if (typeof settingsData === 'object' && settingsData !== null) {
    settingsArray = Object.entries(settingsData).map(([key, value]) => ({
      key_name: key,
      key_value: String(value)
    }));
  }

  if (!settingsArray || settingsArray.length === 0) {
    return res.status(400).json({ success: false, error: 'Settings data required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, setting_type, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        setting_type = excluded.setting_type,
        updated_at = CURRENT_TIMESTAMP
    `);

    settingsArray.forEach(setting => {
      const key = setting.key_name || setting.key;
      const value = setting.key_value || setting.value;

      let settingType = 'string';
      let settingValue = String(value);

      if (typeof value === 'boolean') {
        settingType = 'boolean';
        settingValue = value ? '1' : '0';
      } else if (typeof value === 'object' && value !== null) {
        settingType = 'json';
        settingValue = JSON.stringify(value);
      }

      stmt.run(key, settingValue, settingType);
    });

    logAdminActionAudit(req.user.id, 'settings_bulk_updated', 'setting', 0, 'success', {
      count: settingsArray.length,
      keys: settingsArray.map(s => s.key_name || s.key)
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// PUT /api/admin/settings/:key - Update a single setting
app.put('/api/admin/settings/:key', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ success: false, error: 'Value is required' });
  }

  try {
    let settingType = 'string';
    let settingValue = String(value);

    if (typeof value === 'boolean') {
      settingType = 'boolean';
      settingValue = value ? '1' : '0';
    } else if (typeof value === 'object' && value !== null) {
      settingType = 'json';
      settingValue = JSON.stringify(value);
    }

    db.prepare(`
      INSERT INTO settings (key, value, setting_type, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        setting_type = excluded.setting_type,
        updated_at = CURRENT_TIMESTAMP
    `).run(key, settingValue, settingType);

    logAdminActionAudit(req.user.id, 'setting_updated', 'setting', 0, 'success', {
      key: key,
      type: settingType,
      value_preview: settingValue.substring(0, 100)
    });

    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// GET /api/mpesa/transaction/:id - Get M-Pesa transaction status
app.get('/api/mpesa/transaction/:id', authenticate, (req, res) => {
  const { id } = req.params;

  try {
    const transaction = db.prepare(`
      SELECT mt.*, l.borrower_id
      FROM mpesa_transactions mt
      LEFT JOIN loans l ON mt.loan_id = l.id
      WHERE mt.id = ?
    `).get(id);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Check authorization - user should be admin or the borrower for this loan
    if (req.user.role !== 'admin') {
      const borrower = db.prepare('SELECT user_id FROM borrowers WHERE id = ?').get(transaction.borrower_id);
      if (!borrower || req.user.id !== borrower.user_id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    res.json({
      success: true,
      data: {
        id: transaction.id,
        phone_number: transaction.phone_number,
        amount: transaction.amount,
        status: transaction.status,
        transaction_type: transaction.transaction_type,
        mpesa_reference: transaction.mpesa_reference,
        checkout_request_id: transaction.checkout_request_id,
        response_code: transaction.response_code,
        response_message: transaction.response_message,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
});

// Admin Repayments - Record manual payment
app.post('/api/admin/repayments', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { loan_id, amount, payment_method, reference_number } = req.body;

  // Validation
  if (!loan_id || !amount || !payment_method) {
    return res.status(400).json({ success: false, error: 'loan_id, amount, and payment_method are required' });
  }

  if (amount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
  }

  if (['bank', 'cheque'].includes(payment_method) && !reference_number) {
    return res.status(400).json({ success: false, error: 'reference_number is required for bank/cheque payments' });
  }

  try {
    // Get loan details
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    if (!['active', 'approved', 'disbursed'].includes(loan.status)) {
      return res.status(400).json({ success: false, error: 'Loan is not in a valid state for payment' });
    }

    // Get total paid so far
    const repaymentSum = db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM repayments WHERE loan_id = ?').get(loan_id);
    const totalPaid = parseFloat(repaymentSum.total_paid) || 0;
    const outstandingTotal = loan.total_amount - totalPaid;

    if (amount > outstandingTotal) {
      return res.status(400).json({ success: false, error: `Amount exceeds outstanding balance of ${outstandingTotal}` });
    }

    // Calculate interest vs principal allocation
    const interestPaid = db.prepare('SELECT COALESCE(SUM(interest_paid), 0) as total FROM repayments WHERE loan_id = ?').get(loan_id);
    const principalPaid = db.prepare('SELECT COALESCE(SUM(principal_paid), 0) as total FROM repayments WHERE loan_id = ?').get(loan_id);

    const totalInterestOutstanding = loan.interest_amount - (parseFloat(interestPaid.total) || 0);
    let paidInterest = 0;
    let paidPrincipal = 0;

    if (amount >= totalInterestOutstanding) {
      paidInterest = totalInterestOutstanding;
      paidPrincipal = amount - totalInterestOutstanding;
    } else {
      paidInterest = amount;
      paidPrincipal = 0;
    }

    // Insert repayment record
    const stmt = db.prepare(`
      INSERT INTO repayments (
        loan_id, amount, principal_paid, interest_paid, payment_method, reference_number, paid_by, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      loan_id,
      amount,
      paidPrincipal,
      paidInterest,
      payment_method,
      reference_number || null,
      req.user.id
    );

    // Check if loan is now fully paid
    const newTotalPaid = totalPaid + amount;
    let loanCompleted = false;
    if (newTotalPaid >= loan.total_amount) {
      db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('completed', loan_id);
      loanCompleted = true;
    }

    const repaymentId = result.lastInsertRowid;
    logPaymentAudit(req.user.id, 'repayment_recorded', 'repayment', repaymentId, 'success', {
      loan_id: loan_id,
      amount: amount,
      principal_paid: paidPrincipal,
      interest_paid: paidInterest,
      payment_method: payment_method,
      reference: reference_number || null,
      loan_completed: loanCompleted
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        repayment_id: repaymentId,
        loan_id: loan_id,
        amount: amount,
        principal_paid: paidPrincipal,
        interest_paid: paidInterest,
        payment_method: payment_method
      }
    });
  } catch (error) {
    console.error('Error recording repayment:', error);
    res.status(500).json({ success: false, error: 'Failed to record repayment' });
  }
});

// Admin Repayments - Get list
app.get('/api/admin/repayments', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const { loan_id, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT
        r.id,
        r.loan_id,
        r.amount,
        r.principal_paid,
        r.interest_paid,
        r.penalty_paid,
        r.payment_method,
        r.reference_number,
        r.paid_by,
        r.paid_at,
        r.payment_status,
        r.created_at,
        u.name as borrower_name,
        u.email as borrower_email,
        l.principal_amount,
        l.total_amount,
        l.status as loan_status
      FROM repayments r
      JOIN loans l ON r.loan_id = l.id
      JOIN borrowers b ON l.borrower_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (loan_id) {
      query += ' AND r.loan_id = ?';
      params.push(loan_id);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR r.reference_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const repayments = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: repayments
    });
  } catch (error) {
    console.error('Error fetching repayments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch repayments' });
  }
});

// Admin Repayments - Delete repayment
app.delete('/api/admin/repayments/:id', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { id } = req.params;

  try {
    const repayment = db.prepare('SELECT * FROM repayments WHERE id = ?').get(id);
    if (!repayment) {
      return res.status(404).json({ success: false, error: 'Repayment not found' });
    }

    // Delete the repayment
    db.prepare('DELETE FROM repayments WHERE id = ?').run(id);

    // Recalculate loan status - if it was completed but now isn't, revert to active
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(repayment.loan_id);
    const totalRepaidAfterDelete = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?').get(repayment.loan_id);

    if (loan.status === 'completed' && totalRepaidAfterDelete.total < loan.total_amount) {
      db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('active', repayment.loan_id);
    }

    res.json({
      success: true,
      message: 'Repayment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting repayment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete repayment' });
  }
});

// ===== PDF Generation Endpoints =====

// Generate Receipt PDF
app.post('/api/admin/generate-receipt', authenticate, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { loan_id, repayment_id } = req.body;

  if (!loan_id || !repayment_id) {
    return res.status(400).json({ success: false, error: 'loan_id and repayment_id are required' });
  }

  try {
    // Get repayment details
    const repayment = db.prepare('SELECT * FROM repayments WHERE id = ? AND loan_id = ?').get(repayment_id, loan_id);
    if (!repayment) {
      return res.status(404).json({ success: false, error: 'Repayment not found' });
    }

    // Get loan and borrower details
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
    const borrower = db.prepare('SELECT u.name, u.phone FROM borrowers b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(loan.borrower_id);

    if (!borrower) {
      return res.status(404).json({ success: false, error: 'Borrower not found' });
    }

    // Calculate remaining balance
    const paidTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?').get(loan_id);
    const remainingBalance = loan.total_amount - (parseFloat(paidTotal.total) || 0);

    // Prepare receipt data
    const receiptData = {
      loanId: loan_id,
      borrowerName: borrower.name,
      borrowerPhone: borrower.phone,
      repaymentId: repayment_id,
      amount: repayment.amount,
      principalPaid: repayment.principal_paid || 0,
      interestPaid: repayment.interest_paid || 0,
      penaltyPaid: repayment.penalty_paid || 0,
      paymentMethod: repayment.payment_method || 'cash',
      referenceNumber: repayment.reference_number,
      paidAt: repayment.paid_at,
      remainingBalance: remainingBalance
    };

    // Import PDF generator
    const { generateReceiptPDF } = await import('./utils/pdfGenerator.ts');
    const pdfBuffer = await generateReceiptPDF(receiptData);

    // Store PDF in database
    const fileName = `receipt-${loan_id}-${repayment_id}-${Date.now()}.pdf`;
    const stmt = db.prepare(`
      INSERT INTO pdf_documents (loan_id, document_type, repayment_id, file_content, file_name)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(loan_id, 'receipt', repayment_id, pdfBuffer, fileName);

    res.json({
      success: true,
      message: 'Receipt generated successfully',
      data: {
        document_id: result.lastInsertRowid,
        fileName: fileName,
        pdfUrl: `/api/documents/${result.lastInsertRowid}`
      }
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ success: false, error: 'Failed to generate receipt' });
  }
});

// Generate Invoice PDF
app.post('/api/admin/generate-invoice', authenticate, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { loan_id } = req.body;

  if (!loan_id) {
    return res.status(400).json({ success: false, error: 'loan_id is required' });
  }

  try {
    // Get loan details
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    // Get borrower details
    const borrower = db.prepare('SELECT u.name, u.phone, u.email FROM borrowers b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(loan.borrower_id);
    if (!borrower) {
      return res.status(404).json({ success: false, error: 'Borrower not found' });
    }

    // Calculate paid amounts
    const paidAmounts = db.prepare(`
      SELECT
        COALESCE(SUM(principal_paid), 0) as principal_paid,
        COALESCE(SUM(interest_paid), 0) as interest_paid,
        COALESCE(SUM(amount), 0) as total_paid
      FROM repayments WHERE loan_id = ?
    `).get(loan_id);

    const principalPaid = parseFloat(paidAmounts.principal_paid) || 0;
    const interestPaid = parseFloat(paidAmounts.interest_paid) || 0;
    const amountDue = loan.total_amount - parseFloat(paidAmounts.total_paid);

    // Prepare invoice data
    const invoiceData = {
      loanId: loan_id,
      borrowerName: borrower.name,
      borrowerPhone: borrower.phone,
      borrowerEmail: borrower.email,
      principalAmount: loan.principal_amount,
      interestAmount: loan.interest_amount || 0,
      totalAmount: loan.total_amount,
      termMonths: loan.term_months,
      principalPaid: principalPaid,
      interestPaid: interestPaid,
      amountDue: amountDue,
      dueDate: loan.due_date,
      createdAt: new Date().toISOString()
    };

    // Import PDF generator
    const { generateInvoicePDF } = await import('./utils/pdfGenerator.ts');
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Store PDF in database
    const fileName = `invoice-${loan_id}-${Date.now()}.pdf`;
    const stmt = db.prepare(`
      INSERT INTO pdf_documents (loan_id, document_type, file_content, file_name)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(loan_id, 'invoice', pdfBuffer, fileName);

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        document_id: result.lastInsertRowid,
        fileName: fileName,
        pdfUrl: `/api/documents/${result.lastInsertRowid}`
      }
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
});

// Send Receipt via Email
app.post('/api/admin/send-receipt', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { loan_id, repayment_id, recipient_email } = req.body;

  if (!loan_id || !repayment_id || !recipient_email) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Get repayment details
    const repayment = db.prepare('SELECT * FROM repayments WHERE id = ? AND loan_id = ?').get(repayment_id, loan_id);
    if (!repayment) {
      return res.status(404).json({ success: false, error: 'Repayment not found' });
    }

    // Get loan and borrower details
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
    const borrower = db.prepare('SELECT u.name, u.phone FROM borrowers b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(loan.borrower_id);

    // Calculate remaining balance
    const paidTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?').get(loan_id);
    const remainingBalance = loan.total_amount - (parseFloat(paidTotal.total) || 0);

    // Prepare receipt data
    const receiptData = {
      loanId: loan_id,
      borrowerName: borrower.name,
      borrowerPhone: borrower.phone,
      repaymentId: repayment_id,
      amount: repayment.amount,
      principalPaid: repayment.principal_paid || 0,
      interestPaid: repayment.interest_paid || 0,
      penaltyPaid: repayment.penalty_paid || 0,
      paymentMethod: repayment.payment_method || 'cash',
      referenceNumber: repayment.reference_number,
      paidAt: repayment.paid_at,
      remainingBalance: remainingBalance
    };

    // Generate PDF
    const { generateReceiptPDF } = await import('./utils/pdfGenerator.ts');
    const pdfBuffer = await generateReceiptPDF(receiptData);

    // Load email settings
    const settings = db.prepare(`
      SELECT setting_key, setting_value FROM admin_settings
      WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from')
    `).all();

    if (settings.length === 0) {
      return res.status(400).json({ success: false, error: 'Email settings not configured' });
    }

    const config = {};
    settings.forEach(s => {
      config[s.setting_key] = s.setting_value;
    });

    // Import and configure email service
    const emailService = await import('./utils/emailService.ts').then(m => m.default);
    emailService.setConfig({
      host: config.smtp_host,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      from: config.smtp_from
    });

    // Send email with attachment
    const result = await emailService.sendReceipt(recipient_email, borrower.name, loan_id, repayment_id, pdfBuffer, `receipt-${loan_id}-${repayment_id}.pdf`);

    if (result.success) {
      res.json({ success: true, message: 'Receipt sent via email successfully' });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    console.error('Error sending receipt:', error);
    res.status(500).json({ success: false, error: 'Failed to send receipt' });
  }
});

// Send Invoice via Email
app.post('/api/admin/send-invoice', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { loan_id, recipient_email } = req.body;

  if (!loan_id || !recipient_email) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Get loan details
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loan_id);
    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    const borrower = db.prepare('SELECT u.name, u.email FROM borrowers b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(loan.borrower_id);

    // Calculate totals
    const paidTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?').get(loan_id);
    const totalPaid = parseFloat(paidTotal.total) || 0;
    const balance = loan.total_amount - totalPaid;

    // Prepare invoice data
    const invoiceData = {
      loanId: loan_id,
      borrowerName: borrower.name,
      borrowerEmail: borrower.email,
      principalAmount: loan.principal_amount,
      totalAmount: loan.total_amount,
      interestRate: loan.interest_rate,
      durationMonths: loan.duration_months,
      totalPaid: totalPaid,
      balance: balance,
      status: loan.status,
      createdAt: loan.created_at,
      dueDate: loan.due_date
    };

    // Generate PDF
    const { generateInvoicePDF } = await import('./utils/pdfGenerator.ts');
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Load email settings
    const settings = db.prepare(`
      SELECT setting_key, setting_value FROM admin_settings
      WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from')
    `).all();

    if (settings.length === 0) {
      return res.status(400).json({ success: false, error: 'Email settings not configured' });
    }

    const config = {};
    settings.forEach(s => {
      config[s.setting_key] = s.setting_value;
    });

    // Import and configure email service
    const emailService = await import('./utils/emailService.ts').then(m => m.default);
    emailService.setConfig({
      host: config.smtp_host,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      from: config.smtp_from
    });

    // Send email with attachment
    const result = await emailService.sendInvoice(recipient_email, borrower.name, loan_id, pdfBuffer, `invoice-${loan_id}.pdf`);

    if (result.success) {
      res.json({ success: true, message: 'Invoice sent via email successfully' });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to send invoice' });
  }
});

// Download PDF Document
app.get('/api/documents/:id', authenticate, (req, res) => {
  const { id } = req.params;

  try {
    const doc = db.prepare('SELECT * FROM pdf_documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Check authorization: admin or the borrower who owns the loan
    if (req.user.role !== 'admin') {
      const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(doc.loan_id);
      const borrower = db.prepare('SELECT user_id FROM borrowers WHERE id = ?').get(loan.borrower_id);
      if (borrower.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.send(doc.file_content);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ success: false, error: 'Failed to download document' });
  }
});

// Get Admin Email Settings
app.get('/api/admin/email-settings', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const settings = db.prepare(`
      SELECT setting_key, setting_value FROM admin_settings
      WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_from')
    `).all();

    const config = {};
    settings.forEach(s => {
      config[s.setting_key] = s.setting_value;
    });

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting email settings:', error);
    res.status(500).json({ success: false, error: 'Failed to get email settings' });
  }
});

// Update Admin Email Settings
app.post('/api/admin/email-settings', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;

  if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !smtp_from) {
    return res.status(400).json({ success: false, error: 'All SMTP settings are required' });
  }

  try {
    // Use upsert pattern for settings
    const settings = [
      { key: 'smtp_host', value: smtp_host },
      { key: 'smtp_port', value: smtp_port },
      { key: 'smtp_user', value: smtp_user },
      { key: 'smtp_pass', value: smtp_pass },
      { key: 'smtp_from', value: smtp_from }
    ];

    settings.forEach(setting => {
      const exists = db.prepare('SELECT id FROM admin_settings WHERE setting_key = ?').get(setting.key);
      if (exists) {
        db.prepare('UPDATE admin_settings SET setting_value = ? WHERE setting_key = ?').run(setting.value, setting.key);
      } else {
        db.prepare('INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?)').run(setting.key, setting.value);
      }
    });

    res.json({
      success: true,
      message: 'Email settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving email settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save email settings' });
  }
});

// Test Email Configuration
app.post('/api/admin/email-settings/test', authenticate, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    // Get current settings
    const settings = db.prepare(`
      SELECT setting_key, setting_value FROM admin_settings
      WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from')
    `).all();

    if (settings.length === 0) {
      return res.status(400).json({ success: false, error: 'Email settings not configured' });
    }

    const config = {};
    settings.forEach(s => {
      config[s.setting_key] = s.setting_value;
    });

    // Import and configure email service
    const emailService = (await import('./utils/emailService.ts')).default;
    emailService.setConfig({
      host: config.smtp_host,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      from: config.smtp_from
    });

    // Test connection
    const result = await emailService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({ success: false, error: 'Failed to test email configuration' });
  }
});

// ===== Admin Loans Management =====

// Get all loans with pagination and filters
app.get('/api/admin/loans', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*, u.name as borrower_name, u.email as borrower_email, p.name as product_name
      FROM loans l
      JOIN borrowers b ON l.borrower_id = b.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN loan_products p ON l.product_id = p.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.created_at DESC';

    const total = db.prepare(
      query.replace('SELECT l.*,', 'SELECT COUNT(*) as count FROM (SELECT l.id')
    ).get(...params)?.count || 0;

    const loans = db.prepare(query + ` LIMIT ? OFFSET ?`).all(...params, limit, offset);

    res.json({
      success: true,
      data: {
        loans: loans || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loans' });
  }
});

// Get single loan details
app.get('/api/admin/loans/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const loanId = parseInt(req.params.id);
    const loan = db.prepare(`
      SELECT l.*, u.name as borrower_name, u.email as borrower_email, u.phone as borrower_phone, p.name as product_name
      FROM loans l
      JOIN borrowers b ON l.borrower_id = b.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN loan_products p ON l.product_id = p.id
      WHERE l.id = ?
    `).get(loanId);

    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    const repayments = db.prepare('SELECT * FROM repayments WHERE loan_id = ? ORDER BY paid_at DESC').all(loanId);

    res.json({
      success: true,
      data: {
        ...loan,
        repayments: repayments || []
      }
    });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loan' });
  }
});

// Approve or reject loan application
app.post('/api/admin/loans/:id/approve', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const loanId = parseInt(req.params.id);
    const { approve = true, reason } = req.body;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    const newStatus = approve ? 'approved' : 'rejected';
    db.prepare('UPDATE loans SET status = ? WHERE id = ?').run(newStatus, loanId);

    logLoanAudit(req.user.id, `loan_${newStatus}`, loanId, 'success', {
      reason: reason || null,
      principal: loan.principal_amount,
      term: loan.term_months
    });

    res.json({ success: true, message: `Loan ${newStatus} successfully` });
  } catch (error) {
    console.error('Error approving loan:', error);
    res.status(500).json({ success: false, error: 'Failed to process loan approval' });
  }
});

// Disburse loan
app.post('/api/admin/loans/:id/disburse', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const loanId = parseInt(req.params.id);
    const { reference } = req.body;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }

    db.prepare('UPDATE loans SET status = ?, disbursed_at = ? WHERE id = ?')
      .run('active', new Date().toISOString(), loanId);

    logLoanAudit(req.user.id, 'loan_disbursed_manual', loanId, 'success', {
      reference: reference || null,
      principal: loan.principal_amount,
      method: 'bank_transfer'
    });

    res.json({ success: true, message: 'Loan disbursed successfully' });
  } catch (error) {
    console.error('Error disbursing loan:', error);
    res.status(500).json({ success: false, error: 'Failed to disburse loan' });
  }
});

// Mark loan as defaulted
app.post('/api/admin/loans/:id/default', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const loanId = parseInt(req.params.id);
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('defaulted', loanId);
    logLoanAudit(req.user.id, 'loan_defaulted', loanId, 'success', {
      principal: loan.principal_amount
    });
    res.json({ success: true, message: 'Loan marked as defaulted' });
  } catch (error) {
    console.error('Error marking loan as defaulted:', error);
    res.status(500).json({ success: false, error: 'Failed to mark loan as defaulted' });
  }
});

// Reactivate defaulted loan
app.post('/api/admin/loans/:id/reactivate', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const loanId = parseInt(req.params.id);
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('active', loanId);
    logLoanAudit(req.user.id, 'loan_reactivated', loanId, 'success', {
      principal: loan?.principal_amount
    });
    res.json({ success: true, message: 'Loan reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating loan:', error);
    res.status(500).json({ success: false, error: 'Failed to reactivate loan' });
  }
});

// ===== Admin Borrowers Management =====

// Get all borrowers
app.get('/api/admin/borrowers', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const limit = parseInt(req.query.limit) || 100;
    const borrowers = db.prepare(`
      SELECT b.*, u.name, u.email, u.phone, u.created_at,
             COUNT(l.id) as total_loans,
             COALESCE(SUM(l.principal_amount), 0) as total_borrowed
      FROM borrowers b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN loans l ON b.id = l.borrower_id
      GROUP BY b.id
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      data: { borrowers: borrowers || [], pagination: { total: borrowers?.length || 0 } }
    });
  } catch (error) {
    console.error('Error fetching borrowers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch borrowers' });
  }
});

// Get single borrower details
app.get('/api/admin/borrowers/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const borrowerId = parseInt(req.params.id);
    const borrower = db.prepare(`
      SELECT b.*, u.name, u.email, u.phone
      FROM borrowers b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `).get(borrowerId);

    if (!borrower) {
      return res.status(404).json({ success: false, error: 'Borrower not found' });
    }

    const documents = db.prepare('SELECT * FROM uploads WHERE borrower_id = ? ORDER BY created_at DESC').all(borrowerId);

    res.json({
      success: true,
      data: { ...borrower, documents: documents || [] }
    });
  } catch (error) {
    console.error('Error fetching borrower:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch borrower' });
  }
});

// Update borrower KYC
app.put('/api/admin/borrowers/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const borrowerId = parseInt(req.params.id);
    const { national_id, kra_pin, id_type } = req.body;

    const borrower = db.prepare('SELECT * FROM borrowers WHERE id = ?').get(borrowerId);
    if (!borrower) {
      return res.status(404).json({ success: false, error: 'Borrower not found' });
    }

    db.prepare('UPDATE borrowers SET national_id = ?, kra_pin = ?, id_type = ? WHERE id = ?')
      .run(national_id, kra_pin, id_type, borrowerId);

    res.json({ success: true, message: 'Borrower KYC updated successfully' });
  } catch (error) {
    console.error('Error updating borrower:', error);
    res.status(500).json({ success: false, error: 'Failed to update borrower' });
  }
});

// ===== Admin Users Management =====

// Get all users
app.get('/api/admin/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const users = db.prepare('SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ success: true, data: { users: users || [] } });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Create new user
app.post('/api/admin/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, role, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const hashedPassword = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (name, email, phone, password, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, email, phone || null, hashedPassword, role);

    const userId = result.lastInsertRowid;
    logUserManagementAudit(req.user.id, 'user_created', userId, 'success', {
      name,
      email,
      role,
      phone: phone || null
    });

    res.json({ success: true, data: { id: userId } });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/admin/users/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const userId = parseInt(req.params.id);
    const { name, phone, role, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const changes = {};
    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
      changes.name = name;
    }
    if (phone) {
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, userId);
      changes.phone = phone;
    }
    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
      changes.role = role;
    }
    if (password) {
      const hashedPassword = hashPassword(password);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
      changes.password_changed = true;
    }

    logUserManagementAudit(req.user.id, 'user_updated', userId, 'success', changes);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const userId = parseInt(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    logUserManagementAudit(req.user.id, 'user_deleted', userId, 'success', {
      name: user.name,
      email: user.email
    });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Toggle user active status
app.post('/api/admin/users/:id/toggle', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const userId = parseInt(req.params.id);
    const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newStatus = user.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, userId);
    logUserManagementAudit(req.user.id, newStatus ? 'user_activated' : 'user_deactivated', userId, 'success', {
      new_status: newStatus === 1 ? 'active' : 'inactive'
    });
    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error toggling user:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle user' });
  }
});

// ===== Borrower Operations =====

// Create loan application
app.post('/api/loans', authenticate, (req, res) => {
  try {
    const borrower = db.prepare('SELECT id FROM borrowers WHERE user_id = ?').get(req.user.id);
    if (!borrower) {
      return res.status(403).json({ success: false, error: 'Borrower profile not found' });
    }

    const { product_id, principal_amount, duration_months } = req.body;
    if (!product_id || !principal_amount || !duration_months) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const product = db.prepare('SELECT * FROM loan_products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const interest_rate = product.interest_rate || 10;
    const total_amount = principal_amount + (principal_amount * interest_rate * duration_months / 100 / 12);
    const due_date = new Date();
    due_date.setMonth(due_date.getMonth() + duration_months);

    const result = db.prepare(`
      INSERT INTO loans (borrower_id, product_id, principal_amount, total_amount, duration_months, interest_rate, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(borrower.id, product_id, principal_amount, total_amount, duration_months, interest_rate, due_date.toISOString());

    const loanId = result.lastInsertRowid;
    logLoanAudit(req.user.id, 'loan_created', loanId, 'success', {
      product_id: product_id,
      principal: principal_amount,
      duration: duration_months,
      total_amount: total_amount,
      interest_rate: interest_rate
    });

    res.json({
      success: true,
      message: 'Loan application created successfully',
      data: { id: loanId }
    });
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ success: false, error: 'Failed to create loan application' });
  }
});

// Get admin system logs with filtering and pagination
app.get('/api/admin/logs', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const { log_type, status, dateFrom, dateTo, search, offset = 0, limit = 50 } = req.query;
    const offsetNum = parseInt(offset) || 0;
    const limitNum = Math.min(parseInt(limit) || 50, 500); // Cap at 500

    // Build query dynamically
    let query = `
      SELECT
        sl.id,
        sl.user_id,
        sl.log_type,
        sl.action,
        sl.entity_type,
        sl.entity_id,
        sl.status,
        sl.details,
        sl.created_at,
        u.name as user_name,
        u.email as user_email
      FROM system_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by log_type
    if (log_type) {
      query += ` AND sl.log_type = ?`;
      params.push(log_type);
    }

    // Filter by status
    if (status) {
      query += ` AND sl.status = ?`;
      params.push(status);
    }

    // Filter by date range
    if (dateFrom) {
      query += ` AND sl.created_at >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND sl.created_at <= ?`;
      params.push(dateTo);
    }

    // Search in action, entity_type, details, user_name, user_email
    if (search) {
      query += ` AND (
        sl.action LIKE ? OR
        sl.entity_type LIKE ? OR
        sl.details LIKE ? OR
        u.name LIKE ? OR
        u.email LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count for pagination
    const countQuery = query.replace(
      /SELECT.*?FROM/i,
      'SELECT COUNT(*) as total FROM'
    );
    const countStmt = db.prepare(countQuery);
    const { total } = countStmt.all(...params)[0];

    // Add ordering and pagination
    query += ` ORDER BY sl.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const stmt = db.prepare(query);
    const logs = stmt.all(...params);

    // Parse JSON details for each log
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    res.json({
      success: true,
      data: parsedLogs,
      pagination: {
        total,
        offset: offsetNum,
        limit: limitNum,
        hasMore: offsetNum + limitNum < total
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// Catch-all for unimplemented endpoints
app.all('*', (req, res) => {
  res.status(501).json({ success: false, error: 'Endpoint not implemented in dev server' });
});

// Start server
initializeSchema();
app.listen(PORT, () => {
  console.log(`\n✓ Development API Server running on http://localhost:${PORT}`);
  console.log('\n📚 Demo Credentials:');
  console.log('  Admin:    admin@lending.com / Pass123');
  console.log('  Borrower: borrower@lending.com / Pass123\n');
});
