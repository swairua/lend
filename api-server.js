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

// Initialize SQLite database
const dbPath = path.join(__dirname, 'lending.db');
// Remove old database if it exists (for fresh start during development)
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
} catch (e) {
  // Ignore errors
}
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
  const borrower_id = req.body.borrower_id ? parseInt(req.body.borrower_id) : null;

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

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up uploaded file on error
    fs.unlink(req.file.path, () => {});
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

// Delete uploaded file
app.delete('/api/uploads/:id', authenticate, (req, res) => {
  const doc_id = parseInt(req.params.id);

  try {
    const document = db.prepare('SELECT filename, file_url FROM documents WHERE id = ?').get(doc_id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Delete the file from disk
    const filePath = path.join(uploadsDir, document.filename);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    // Delete the database record
    db.prepare('DELETE FROM documents WHERE id = ?').run(doc_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

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
