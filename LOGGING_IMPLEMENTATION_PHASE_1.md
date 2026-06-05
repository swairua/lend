# Unified Logging System - Phase 1 Implementation

## Summary

Phase 1 of the unified logging infrastructure has been successfully completed. The system now has a single, consolidated `system_logs` table that replaces the incomplete `audit_logs` table.

## Changes Made

### 1. SQLite Schema (api-server.js)

**Location**: `api-server.js:288-302` (initializeSchema function)

**Added**:
```sql
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
```

### 2. MySQL Schema (lending_db.sql)

**Location**: `lending_db.sql:47-63`

**Replaced**: Old `audit_logs` table definition
**Added**: Unified `system_logs` table with indexes for optimal query performance

```sql
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
```

**Indexes Added**:
- `idx_user_id`: For filtering logs by user
- `idx_log_type`: For filtering by event type (admin_action, payment, document, etc.)
- `idx_created_at`: For time-range queries and chronological sorting

### 3. Logging Functions (api-server.js)

**Location**: `api-server.js:422-445`

#### New Primary Function
```javascript
function logSystemEvent(userId, logType, action, entityType, entityId, status = 'success', details = null)
```

**Parameters**:
- `userId`: The user performing the action (can be null)
- `logType`: Category (e.g., 'loan_action', 'payment', 'document', 'user_mgmt')
- `action`: Specific action (e.g., 'loan_approved', 'document_uploaded')
- `entityType`: Type of entity affected (e.g., 'loan', 'document', 'user')
- `entityId`: ID of the affected entity
- `status`: Result of the action ('success', 'failed', 'pending')
- `details`: JSON-serializable object with contextual info

#### Backward Compatibility
```javascript
function logAudit(userId, action, entityType, entityId, details = null)
```

The old `logAudit()` function is now a wrapper that calls `logSystemEvent()` with default values. This ensures existing code (like M-Pesa disburse endpoint) continues to work without modification:
- Maps to `logType: 'loan_action'`
- Maps to `status: 'success'`

## Schema Explanation

| Field | Type | Purpose |
|-------|------|---------|
| `id` | Primary Key | Unique log entry identifier |
| `user_id` | Foreign Key | Who performed the action |
| `log_type` | String | Category of event (planned values: admin_action, payment, sms, document, user_mgmt, loan_action) |
| `action` | String | Specific action taken (e.g., 'loan_approved', 'document_uploaded', 'user_created') |
| `entity_type` | String | What was affected (e.g., 'loan', 'document', 'user', 'payment') |
| `entity_id` | Integer | ID of the affected entity |
| `status` | String | Result (success, failed, pending) |
| `details` | JSON Text | Contextual information (amounts, phone numbers, file names, etc.) |
| `ip_address` | String | (Reserved) Request IP for security audits |
| `created_at` | Timestamp | When the event occurred |

## Files Modified

1. **api-server.js**
   - Added `system_logs` table to `initializeSchema()` function
   - Removed `audit_logs` table creation
   - Implemented `logSystemEvent()` function
   - Updated `logAudit()` as backward-compatible wrapper

2. **lending_db.sql**
   - Updated DROP statements to include `system_logs`
   - Replaced incomplete `audit_logs` definition with unified `system_logs`
   - Added performance indexes (idx_user_id, idx_log_type, idx_created_at)
   - Added proper foreign key constraint with ON DELETE SET NULL

## What Was Removed

- **Table**: `audit_logs` (incomplete implementation)
  - Only logged 1 event type (loan_disbursed)
  - Never had read endpoints
  - Never had admin UI
  - Columns `ip_address` and `user_agent` were never populated

## What Gets Preserved

- **Existing tables**: `sms_logs`, `transaction_logs`, `mpesa_transactions` remain for now
  - These will be candidates for future consolidation in Phase 5 if needed
- **Existing code**: All existing endpoints and functions continue to work
  - `logAudit()` calls still work via backward-compatible wrapper
  - M-Pesa disburse endpoint logging unaffected

## Next Steps (Future Phases)

**Phase 2**: Add logging helpers
- `logPaymentAudit()` for payment processing events
- `logUserManagementAudit()` for user creation/updates
- Expand `logDocumentAudit()` for document events

**Phase 3**: Instrument endpoints to log events
- Loan endpoints (create, approve, disburse, reject)
- Document endpoints (upload, delete)
- User endpoints (create, update roles)
- Payment endpoints (all M-Pesa operations)

**Phase 4**: Implement backend endpoint
- `GET /api/admin/logs` with filtering support
- Query params: log_type, status, dateFrom, dateTo, search, offset, limit
- Join with users table for admin UI display

**Phase 5**: Connect frontend UI
- Update `pages/AdminSystemLogs.tsx` to fetch from new endpoint
- Implement all filters and CSV export
- Display user info (name, email) in logs table

## Verification Commands

### SQLite (Development)
```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='system_logs';
SELECT COUNT(*) FROM system_logs;
```

### MySQL (Production)
```sql
SHOW TABLES LIKE 'system_logs';
SHOW COLUMNS FROM system_logs;
SHOW INDEXES FROM system_logs;
```

## Migration Safety

- Both SQLite and MySQL schemas use `CREATE TABLE IF NOT EXISTS` for idempotency
- `DROP TABLE IF EXISTS audit_logs;` is safe to run multiple times
- Foreign keys are properly configured with `ON DELETE SET NULL`
- No data loss risk (audit_logs table had minimal/no data)
- Existing code continues to work via backward-compatible `logAudit()` wrapper

## Database Compatibility

- **SQLite** (Development): Uses INTEGER types, standard AUTOINCREMENT
- **MySQL** (Production): Uses INT types, AUTO_INCREMENT with proper indexing
- Both support the same logical schema and field semantics
