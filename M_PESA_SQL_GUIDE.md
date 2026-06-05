# M-Pesa Auto-Application Verification & Admin Sync - SQL Reference

## 1. Schema: Repayments Table (Base)

```sql
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
```

## 2. Migration: Add Payment Status Column

```sql
-- Add payment_status column to track reconciliation state
ALTER TABLE repayments ADD COLUMN payment_status VARCHAR(50) DEFAULT 'applied';

-- payment_status values:
-- 'applied' - repayment record exists and is linked to mpesa_transaction
-- 'pending' - mpesa_transaction exists but no linked repayment (orphaned)
-- 'unreconciled' - potential M-Pesa transaction not yet in system
```

## 3. Query: Find Orphaned M-Pesa Transactions (Successful but Not Linked)

Used by: `GET /api/admin/mpesa/orphaned-payments`

```sql
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
WHERE mt.status = 'success' 
  AND mt.repayment_id IS NULL
ORDER BY mt.created_at DESC;
```

## 4. Query: Find Pending M-Pesa Transactions (Timeout Scenarios >24 hours)

Used by: `GET /api/admin/mpesa/orphaned-payments`

```sql
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
ORDER BY mt.created_at DESC;
```

## 5. Query: Find Orphaned M-Pesa Transactions for Specific Loan

Used by: `POST /api/admin/mpesa/sync-payments?loan_id=:id`

```sql
SELECT mt.* 
FROM mpesa_transactions mt
WHERE mt.status = 'success'
  AND mt.repayment_id IS NULL
  AND mt.loan_id = ?
ORDER BY mt.created_at ASC;
```

## 6. Query: Find All Orphaned M-Pesa Transactions Globally

Used by: `POST /api/admin/mpesa/sync-payments` (no loan_id parameter)

```sql
SELECT mt.* 
FROM mpesa_transactions mt
WHERE mt.status = 'success'
  AND mt.repayment_id IS NULL
ORDER BY mt.created_at ASC;
```

## 7. Query: Get Admin Repayments List with Payment Status

Used by: `GET /api/admin/repayments`

```sql
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
  -- Optional filters:
  -- AND r.loan_id = ?
  -- AND (u.name LIKE ? OR r.reference_number LIKE ?)
ORDER BY r.created_at DESC
LIMIT ? OFFSET ?;
```

## 8. Query: Calculate Total Repaid for a Loan

Used in sync logic to allocate principal/interest

```sql
SELECT COALESCE(SUM(amount), 0) as total 
FROM repayments 
WHERE loan_id = ?;
```

## 9. Transaction: Create Repayment from Orphaned M-Pesa

Used by: `POST /api/admin/mpesa/sync-payments`

```sql
-- Step 1: Insert new repayment record
INSERT INTO repayments (
  loan_id, 
  amount, 
  principal_paid, 
  interest_paid,
  payment_method, 
  reference_number, 
  payment_status, 
  paid_at
) VALUES (?, ?, ?, ?, 'mpesa', ?, 'applied', CURRENT_TIMESTAMP);

-- Step 2: Link M-Pesa transaction to new repayment
UPDATE mpesa_transactions 
SET repayment_id = ? 
WHERE id = ?;

-- Step 3: Check if loan is fully repaid and update status
SELECT COALESCE(SUM(amount), 0) as total 
FROM repayments 
WHERE loan_id = ?;

-- If total >= loan.total_amount:
UPDATE loans 
SET status = 'completed' 
WHERE id = ?;
```

## 10. Query: Get Repayments with Payment Status Breakdown

Analytics query for dashboard

```sql
SELECT
  payment_status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  ROUND((COUNT(*) * 100.0) / (SELECT COUNT(*) FROM repayments), 1) as percentage
FROM repayments
GROUP BY payment_status
ORDER BY payment_status;
```

## 11. Query: Find Unreconciled M-Pesa vs Repayments

Detect payments that arrived outside the system

```sql
-- Orphaned M-Pesa: successful payment with no repayment
SELECT 
  'orphaned_mpesa' as type,
  COUNT(*) as count,
  SUM(amount) as total
FROM mpesa_transactions mt
WHERE mt.status = 'success' 
  AND mt.repayment_id IS NULL;

-- Orphaned Repayment: repayment with no M-Pesa link
SELECT 
  'orphaned_repayment' as type,
  COUNT(*) as count,
  SUM(amount) as total
FROM repayments r
WHERE r.payment_method = 'mpesa' 
  AND r.reference_number NOT IN (
    SELECT COALESCE(mpesa_reference, '') FROM mpesa_transactions
  );
```

## 12. Query: Reconciliation Report (Last 30 Days)

```sql
SELECT
  DATE(r.paid_at) as payment_date,
  r.payment_method,
  r.payment_status,
  COUNT(*) as transaction_count,
  SUM(r.amount) as total_amount,
  SUM(r.principal_paid) as principal,
  SUM(r.interest_paid) as interest
FROM repayments r
WHERE r.paid_at >= datetime('now', '-30 days')
GROUP BY DATE(r.paid_at), r.payment_method, r.payment_status
ORDER BY payment_date DESC, payment_method;
```

## 13. Query: Loan Repayment Progress with M-Pesa Status

```sql
SELECT
  l.id as loan_id,
  u.name as borrower_name,
  l.principal_amount,
  l.total_amount,
  COALESCE(SUM(r.amount), 0) as total_repaid,
  (l.total_amount - COALESCE(SUM(r.amount), 0)) as balance_remaining,
  ROUND((COALESCE(SUM(r.amount), 0) * 100.0) / l.total_amount, 1) as repayment_percent,
  COUNT(CASE WHEN r.payment_method = 'mpesa' THEN 1 END) as mpesa_payments,
  COUNT(CASE WHEN r.payment_status = 'pending' THEN 1 END) as pending_reconciliations,
  l.status as loan_status
FROM loans l
JOIN borrowers b ON l.borrower_id = b.id
JOIN users u ON b.user_id = u.id
LEFT JOIN repayments r ON l.id = r.loan_id
GROUP BY l.id, u.name, l.principal_amount, l.total_amount, l.status
ORDER BY balance_remaining DESC;
```

## 14. Cleanup: Mark Old Orphaned Transactions as Failed

Administrative query to archive orphaned payments older than 90 days

```sql
UPDATE mpesa_transactions
SET status = 'orphaned'
WHERE status = 'pending'
  AND created_at < datetime('now', '-90 days');
```

## Key Indexes for Performance

```sql
-- Index for orphaned payment detection
CREATE INDEX IF NOT EXISTS idx_mpesa_status_repayment_id 
ON mpesa_transactions(status, repayment_id, loan_id);

-- Index for repayment lookups by loan
CREATE INDEX IF NOT EXISTS idx_repayments_loan_id 
ON repayments(loan_id);

-- Index for repayment status queries
CREATE INDEX IF NOT EXISTS idx_repayments_payment_status 
ON repayments(payment_status, paid_at);

-- Index for M-Pesa transaction lookups
CREATE INDEX IF NOT EXISTS idx_mpesa_loan_status 
ON mpesa_transactions(loan_id, status, created_at);
```

## Migration Script

Run this to set up the schema with all M-Pesa features:

```sql
-- Step 1: Create/Ensure repayments table exists with base schema
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

-- Step 2: Add payment_status column (if not exists)
-- This is handled with a migration check in the application code

-- Step 3: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_mpesa_status_repayment_id 
ON mpesa_transactions(status, repayment_id, loan_id);

CREATE INDEX IF NOT EXISTS idx_repayments_loan_id 
ON repayments(loan_id);

CREATE INDEX IF NOT EXISTS idx_repayments_payment_status 
ON repayments(payment_status, paid_at);

CREATE INDEX IF NOT EXISTS idx_mpesa_loan_status 
ON mpesa_transactions(loan_id, status, created_at);
```

## Notes

- All timestamps use CURRENT_TIMESTAMP (SQLite)
- Default payment_status is 'applied' for new repayments
- Loan status updates to 'completed' only when total_repaid >= loan.total_amount
- M-Pesa sync is idempotent (safe to run multiple times)
- Orphaned transactions are identified by status='success' AND repayment_id IS NULL
- Pending timeout transactions are status='pending' AND created_at > 24 hours ago
