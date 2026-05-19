# Unified Logging System - Phase 3 Implementation

## Summary

Phase 3 has been successfully completed. All remaining critical endpoints have been instrumented with specialized logging helpers for SMS, admin settings, loan operations, and M-Pesa callbacks.

## New Logging Helper Functions

### 1. logSmsAudit()
**Location**: `api-server.js:475-477`

```javascript
function logSmsAudit(userId, action, borrowerId, status = 'success', details = null) {
  logSystemEvent(userId, 'sms', action, 'sms_log', borrowerId, status, details);
}
```

**Purpose**: Log SMS operations
**Parameters**:
- `userId`: Admin sending SMS
- `action`: SMS action (e.g., 'sms_sent')
- `borrowerId`: Borrower receiving the SMS
- `status`: Result ('success', 'failed', 'pending')
- `details`: SMS specifics (message_type, phone, loan_id, message_length, etc.)

---

### 2. logAdminActionAudit()
**Location**: `api-server.js:480-482`

```javascript
function logAdminActionAudit(userId, action, entityType, entityId, status = 'success', details = null) {
  logSystemEvent(userId, 'admin_action', action, entityType, entityId, status, details);
}
```

**Purpose**: Log administrative system configuration changes
**Parameters**:
- `userId`: Admin making the change
- `action`: Action (e.g., 'setting_updated', 'settings_bulk_updated')
- `entityType`: Type of entity (e.g., 'setting')
- `entityId`: Entity ID (0 for bulk operations)
- `status`: Result ('success', 'failed', 'pending')
- `details`: Setting specifics (key, value_preview, count, etc.)

---

## Instrumented Endpoints (Phase 3)

### Loan Operations

#### 1. POST /api/loans
**Location**: `api-server.js:3064-3072`
- **Action**: `loan_created`
- **Log Type**: `loan_action`
- **Status**: `success`
- **Captures**: product_id, principal, duration, total_amount, interest_rate
- **User**: Borrower (loan applicant)

#### 2. POST /api/admin/loans/:id/reactivate
**Location**: `api-server.js:2788-2792`
- **Action**: `loan_reactivated`
- **Log Type**: `loan_action`
- **Status**: `success`
- **Captures**: principal amount
- **User**: Admin

---

### SMS Operations

#### 1. POST /api/sms/send
**Location**: `api-server.js:1594-1602`
- **Action**: `sms_sent`
- **Log Type**: `sms`
- **Status**: `success` (queued for sending)
- **Captures**: sms_log_id, message_type, phone_number, loan_id, message_length
- **User**: Admin
- **Message Types**: loan_approved, loan_disbursed, payment_reminder, payment_received, default_notice

---

### Admin Settings Operations

#### 1. POST /api/admin/settings/bulk
**Location**: `api-server.js:1814-1818`
- **Action**: `settings_bulk_updated`
- **Log Type**: `admin_action`
- **Status**: `success`
- **Captures**: count of settings, array of setting keys
- **User**: Admin

#### 2. PUT /api/admin/settings/:key
**Location**: `api-server.js:1860-1865`
- **Action**: `setting_updated`
- **Log Type**: `admin_action`
- **Status**: `success`
- **Captures**: key, type (string/boolean/json), value_preview (first 100 chars)
- **User**: Admin

---

### M-Pesa Callback Operations

#### 1. POST /api/mpesa/callback
**Location**: `api-server.js:1486-1491, 1508-1514`
- **Action**: `mpesa_callback_received`
- **Log Type**: `payment`
- **Status**: `success` or `failed` (depends on M-Pesa result code)
- **Captures**: 
  - Success: reference, amount, phone, date, loan_id
  - Failed: code, message, loan_id
- **User**: None (system/webhook, userId=null)
- **Context**: Triggered by M-Pesa payment confirmation webhook

---

## Event Type Summary (All Phases)

| log_type | Description | Count | Actions |
|----------|-------------|-------|---------|
| `payment` | Payment operations | 6 | mpesa_stk_push_initiated, loan_disbursed, repayment_recorded, mpesa_callback_received (success/failed) |
| `loan_action` | Loan lifecycle | 6 | loan_created, loan_approved, loan_rejected, loan_disbursed_manual, loan_reactivated, loan_defaulted |
| `user_mgmt` | User administration | 5 | user_created, user_updated, user_deleted, user_activated, user_deactivated |
| `sms` | SMS operations | 1 | sms_sent |
| `admin_action` | System configuration | 2 | settings_bulk_updated, setting_updated |
| `document` | Document operations | 3 | upload, upload_attempt_rejected, error (separate table) |

**Total Action Types Logged**: 23

---

## Example Log Entries

### Loan Creation by Borrower
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  2,
  'loan_action',
  'loan_created',
  'loan',
  43,
  'success',
  '{"product_id":1,"principal":100000,"duration":12,"total_amount":112000,"interest_rate":12}'
);
```

### SMS Sent
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  1,
  'sms',
  'sms_sent',
  'sms_log',
  5,
  'success',
  '{"sms_log_id":5,"message_type":"loan_approved","phone_number":"+254712345678","loan_id":43,"message_length":89}'
);
```

### Admin Setting Updated
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  1,
  'admin_action',
  'setting_updated',
  'setting',
  0,
  'success',
  '{"key":"interest_rate_default","type":"string","value_preview":"15.5"}'
);
```

### M-Pesa Callback (Success)
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  NULL,
  'payment',
  'mpesa_callback_received',
  'mpesa_transaction',
  12,
  'success',
  '{"reference":"LYH61H00X123","amount":50000,"phone":"254712345678","date":"20240115120530","loan_id":43}'
);
```

### M-Pesa Callback (Failed)
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  NULL,
  'payment',
  'mpesa_callback_received',
  'mpesa_transaction',
  13,
  'failed',
  '{"code":"1032","message":"Request cancelled by user","loan_id":44}'
);
```

---

## Files Modified

- **api-server.js**
  - Added 2 new logging helper functions: `logSmsAudit()`, `logAdminActionAudit()` (lines 475-482)
  - Instrumented 6 additional endpoints with logging calls:
    - Loan creation (line 3064)
    - Loan reactivation (line 2788)
    - SMS sending (line 1594)
    - Bulk settings update (line 1814)
    - Single setting update (line 1860)
    - M-Pesa callback success & failure (lines 1486, 1508)

---

## Instrumentation Summary

**Total Endpoints Instrumented Across All Phases**: 18

### By Type:
- **Payment Operations**: 5 endpoints
  - M-Pesa STK push, M-Pesa disburse, M-Pesa callback (success), M-Pesa callback (failed), Repayment recording

- **Loan Management**: 6 endpoints
  - Create, Approve, Reject, Disburse (manual), Reactivate, Default

- **User Management**: 4 endpoints
  - Create, Update, Delete, Toggle status

- **SMS Operations**: 1 endpoint
  - Send SMS

- **Admin Settings**: 2 endpoints
  - Bulk update, Single update

- **Document Operations**: 2 endpoints
  - Upload (success/rejection/error)

---

## Logging Coverage Map

```
Lending System Operations
├── Loan Lifecycle
│   ├── ✅ Creation (loan_created)
│   ├── ✅ Approval (loan_approved)
│   ├── ✅ Rejection (loan_rejected)
│   ├── ✅ Disbursement - M-Pesa (loan_disbursed)
│   ├── ✅ Disbursement - Manual (loan_disbursed_manual)
│   ├── ✅ Reactivation (loan_reactivated)
│   └── ✅ Default/Write-off (loan_defaulted)
│
├── Payment Processing
│   ├── ✅ STK Push Initiation (mpesa_stk_push_initiated)
│   ├── ✅ M-Pesa Callback - Success (mpesa_callback_received)
│   ├── ✅ M-Pesa Callback - Failure (mpesa_callback_received)
│   └── ✅ Manual Repayment (repayment_recorded)
│
├── User Management
│   ├── ✅ User Creation (user_created)
│   ├── ✅ User Updates (user_updated)
│   ├── ✅ User Deletion (user_deleted)
│   ├── ✅ User Activation (user_activated)
│   └── ✅ User Deactivation (user_deactivated)
│
├── Communication
│   └── ✅ SMS Sending (sms_sent)
│       ├── Loan Approved
│       ├── Loan Disbursed
│       ├── Payment Reminder
│       ├── Payment Received
│       └── Default Notice
│
└── System Administration
    ├── ✅ Bulk Settings Update (settings_bulk_updated)
    └── ✅ Single Setting Update (setting_updated)
```

---

## Unlogged Operations (For Future Enhancement)

Future endpoints that could benefit from logging:

1. **Borrower Profile Operations**
   - Create borrower profile
   - Update borrower info (KYC updates)
   - Verify borrower identity

2. **Document Management**
   - Document deletion (currently logged)
   - Document verification/approval

3. **Reconciliation & Reports**
   - M-Pesa balance sync
   - Payment reconciliation
   - Report generation

4. **System Maintenance**
   - Database backups
   - Bulk data migrations
   - System restarts

5. **Notifications**
   - Email sending (future feature)
   - Push notifications (future feature)

---

## Database Query Examples

### Query All Events for a User
```sql
SELECT 
  id, log_type, action, entity_type, entity_id, status, 
  created_at, details
FROM system_logs
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 100;
```

### Query Payment Events
```sql
SELECT 
  u.name, u.email, sl.action, sl.status, sl.details, sl.created_at
FROM system_logs sl
LEFT JOIN users u ON sl.user_id = u.id
WHERE sl.log_type = 'payment'
AND sl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY sl.created_at DESC;
```

### Query Failed Operations
```sql
SELECT 
  log_type, action, entity_type, COUNT(*) as count
FROM system_logs
WHERE status = 'failed'
GROUP BY log_type, action
ORDER BY count DESC;
```

### Query User Management Audit Trail
```sql
SELECT 
  u.name, sl.action, sl.details, sl.created_at
FROM system_logs sl
LEFT JOIN users u ON sl.user_id = u.id
WHERE sl.log_type = 'user_mgmt'
ORDER BY sl.created_at DESC;
```

---

## Next Steps (Phase 4)

**Phase 4: Backend Read Endpoint Implementation**

Create `GET /api/admin/logs` endpoint with full support for:

1. **Query Parameters**
   - `log_type` - Filter by event category (payment, loan_action, user_mgmt, sms, admin_action)
   - `action` - Filter by specific action (e.g., 'loan_created')
   - `status` - Filter by result (success, failed, pending)
   - `user_id` - Filter by performer
   - `entity_type` - Filter by affected entity type
   - `entity_id` - Filter by specific entity
   - `dateFrom` - Start date for time range
   - `dateTo` - End date for time range
   - `search` - Free-text search in details JSON
   - `offset` - Pagination (default 0)
   - `limit` - Page size (default 50, max 500)
   - `sort` - Sort field (created_at, user_id, action)
   - `order` - Sort direction (ASC, DESC)

2. **Response Format**
   ```json
   {
     "success": true,
     "total": 245,
     "data": [
       {
         "id": 1,
         "user_id": 1,
         "user_name": "Admin User",
         "user_email": "admin@lending.com",
         "log_type": "payment",
         "action": "loan_disbursed",
         "entity_type": "loan",
         "entity_id": 42,
         "status": "success",
         "details": {...},
         "created_at": "2024-01-15T10:30:00Z"
       }
     ]
   }
   ```

3. **Performance Optimization**
   - Use indexes on created_at, log_type, user_id
   - Support pagination to avoid large result sets
   - Cache frequently queried filters

---

## Phase 5: Frontend UI Implementation

Complete `pages/AdminSystemLogs.tsx` with:

1. **Filters**
   - Log Type dropdown
   - Status dropdown
   - User selector
   - Date range picker
   - Free-text search

2. **Table Display**
   - User info (name, email)
   - Event type and action
   - Affected entity
   - Status badge
   - Timestamp
   - Details (expandable JSON view)

3. **Features**
   - Pagination controls
   - Sort by column
   - CSV export
   - Real-time updates (optional)

4. **User Experience**
   - Responsive design
   - Accessibility compliance
   - Search result highlighting
   - Bulk operations (export multiple records)

---

## Implementation Statistics

**Completion Summary**:
- ✅ Phase 1: Schema & Core Functions (1/5)
- ✅ Phase 2: Payment, Loan, User Logging (2/5)
- ✅ Phase 3: SMS, Settings, Callback Logging (3/5)
- ⏳ Phase 4: Backend Read API (4/5)
- ⏳ Phase 5: Frontend UI (5/5)

**Logging Coverage**: 18 endpoints instrumented with 23 action types across 5 log categories
