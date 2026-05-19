# Unified Logging System - Phase 2 Implementation

## Summary

Phase 2 has been successfully completed. Specialized logging helper functions have been created and integrated across critical user-facing endpoints to capture loan actions, payments, and user management events.

## New Logging Helper Functions

### 1. logPaymentAudit()
**Location**: `api-server.js:460-462`

```javascript
function logPaymentAudit(userId, action, entityType, entityId, status = 'success', details = null) {
  logSystemEvent(userId, 'payment', action, entityType, entityId, status, details);
}
```

**Purpose**: Log all payment-related events
**Parameters**:
- `userId`: Admin/user performing the action
- `action`: Payment action (e.g., 'mpesa_stk_push_initiated', 'loan_disbursed', 'repayment_recorded')
- `entityType`: Type of entity (e.g., 'mpesa_transaction', 'loan', 'repayment')
- `entityId`: ID of the entity
- `status`: Result ('success', 'failed', 'pending')
- `details`: Contextual data (amount, method, phone, etc.)

**Logged Events**:
- ✅ M-Pesa STK push initiated
- ✅ Loan disbursement (both M-Pesa and manual bank transfer)
- ✅ Manual repayment recording

---

### 2. logUserManagementAudit()
**Location**: `api-server.js:465-467`

```javascript
function logUserManagementAudit(userId, action, targetUserId, status = 'success', details = null) {
  logSystemEvent(userId, 'user_mgmt', action, 'user', targetUserId, status, details);
}
```

**Purpose**: Log all user lifecycle events
**Parameters**:
- `userId`: Admin performing the action
- `action`: User action (e.g., 'user_created', 'user_updated', 'user_deleted', 'user_activated', 'user_deactivated')
- `targetUserId`: ID of the user being acted upon
- `status`: Result ('success', 'failed', 'pending')
- `details`: Changes made (name, email, role, password_changed flag, etc.)

**Logged Events**:
- ✅ User creation (with name, email, role, phone)
- ✅ User updates (tracks which fields changed)
- ✅ User deletion (captures name and email before deletion)
- ✅ User activation (from inactive status)
- ✅ User deactivation (from active status)

---

### 3. logLoanAudit()
**Location**: `api-server.js:470-472`

```javascript
function logLoanAudit(userId, action, loanId, status = 'success', details = null) {
  logSystemEvent(userId, 'loan_action', action, 'loan', loanId, status, details);
}
```

**Purpose**: Log loan lifecycle events with clear semantics
**Parameters**:
- `userId`: Admin/approver performing the action
- `action`: Loan action (e.g., 'loan_approved', 'loan_rejected', 'loan_disbursed_manual', 'loan_defaulted')
- `loanId`: ID of the loan
- `status`: Result ('success', 'failed', 'pending')
- `details`: Loan specifics (principal, term, reason, etc.)

**Logged Events**:
- ✅ Loan approval (with reason, principal, term)
- ✅ Loan rejection (with reason, principal, term)
- ✅ Loan disbursement via manual bank transfer (with reference, principal, method)
- ✅ Loan default/write-off (with principal amount)

---

### 4. logDocumentAudit() (Pre-existing, already in use)
**Location**: `api-server.js:448-457`

Captures document upload/delete events with borrower context. Already being called at:
- Document upload success (status: 'success')
- Document upload rejection (duplicate doc_type)
- Document upload error (with error message)

---

## Instrumented Endpoints

### Payment Events

#### 1. POST /api/mpesa/payment
**Location**: `api-server.js:1286-1291`
- **Action**: `mpesa_stk_push_initiated`
- **Log Type**: `payment`
- **Status**: `pending` (awaiting user confirmation)
- **Captures**: loan_id, amount, phone, reference

#### 2. POST /api/mpesa/disburse
**Location**: `api-server.js:1355-1360`
- **Action**: `loan_disbursed`
- **Log Type**: `payment`
- **Status**: `success`
- **Captures**: amount, method (mpesa_b2c), phone

#### 3. POST /api/admin/repayments
**Location**: `api-server.js:1959-1974`
- **Action**: `repayment_recorded`
- **Log Type**: `payment`
- **Status**: `success`
- **Captures**: loan_id, amount, principal_paid, interest_paid, payment_method, reference, loan_completed flag

---

### Loan Management Events

#### 1. POST /api/admin/loans/:id/approve
**Location**: `api-server.js:2670-2675`
- **Action**: `loan_approved` or `loan_rejected` (dynamic)
- **Log Type**: `loan_action`
- **Status**: `success`
- **Captures**: reason, principal, term_months

#### 2. POST /api/admin/loans/:id/disburse
**Location**: `api-server.js:2701-2706`
- **Action**: `loan_disbursed_manual`
- **Log Type**: `loan_action`
- **Status**: `success`
- **Captures**: reference, principal, method (bank_transfer)

#### 3. POST /api/admin/loans/:id/default
**Location**: `api-server.js:2724-2729`
- **Action**: `loan_defaulted`
- **Log Type**: `loan_action`
- **Status**: `success`
- **Captures**: principal amount

---

### User Management Events

#### 1. POST /api/admin/users
**Location**: `api-server.js:2879-2885`
- **Action**: `user_created`
- **Log Type**: `user_mgmt`
- **Status**: `success`
- **Captures**: name, email, role, phone

#### 2. PUT /api/admin/users/:id
**Location**: `api-server.js:2927`
- **Action**: `user_updated`
- **Log Type**: `user_mgmt`
- **Status**: `success`
- **Captures**: Changed fields only (name, phone, role, password_changed flag)

#### 3. DELETE /api/admin/users/:id
**Location**: `api-server.js:2949-2952`
- **Action**: `user_deleted`
- **Log Type**: `user_mgmt`
- **Status**: `success`
- **Captures**: name, email of deleted user

#### 4. POST /api/admin/users/:id/toggle
**Location**: `api-server.js:2975-2979`
- **Action**: `user_activated` or `user_deactivated` (dynamic)
- **Log Type**: `user_mgmt`
- **Status**: `success`
- **Captures**: new_status (active/inactive)

---

### Document Events (Already Implemented in Phase 1)

#### POST /api/uploads
**Location**: `api-server.js:911, 891, 921`
- **Action**: `upload`, `upload_attempt_rejected`, or error handler
- **Log Type**: N/A (uses separate document_audit_log table)
- **Captures**: document_id, doc_type, borrower_id, performer info

---

## Event Type Reference

### log_type Values in system_logs

| log_type | Description | Actions |
|----------|-------------|---------|
| `payment` | Payment processing | mpesa_stk_push_initiated, loan_disbursed, repayment_recorded |
| `loan_action` | Loan lifecycle | loan_approved, loan_rejected, loan_disbursed_manual, loan_defaulted |
| `user_mgmt` | User administration | user_created, user_updated, user_deleted, user_activated, user_deactivated |
| `document` | (Reserved for future) | Document operations (separate table currently) |
| `admin_action` | (Reserved for future) | System configuration, settings changes |
| `sms` | (Reserved for future) | SMS sending operations |

---

## Example Log Entries

### Loan Disbursement via M-Pesa
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  1,
  'payment',
  'loan_disbursed',
  'loan',
  42,
  'success',
  '{"amount":50000,"method":"mpesa_b2c","phone":"+254712345678"}'
);
```

### User Creation
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  1,
  'user_mgmt',
  'user_created',
  'user',
  105,
  'success',
  '{"name":"John Agent","email":"agent@lending.com","role":"agent","phone":"+254700000000"}'
);
```

### Loan Approval
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  1,
  'loan_action',
  'loan_approved',
  'loan',
  42,
  'success',
  '{"reason":null,"principal":50000,"term":12}'
);
```

### Repayment Recording
```sql
INSERT INTO system_logs (user_id, log_type, action, entity_type, entity_id, status, details)
VALUES (
  1,
  'payment',
  'repayment_recorded',
  'repayment',
  8,
  'success',
  '{"loan_id":42,"amount":5500,"principal_paid":5000,"interest_paid":500,"payment_method":"mpesa","reference":"MPESA_REF123","loan_completed":false}'
);
```

---

## Files Modified

- **api-server.js**
  - Added 3 new logging helper functions (lines 460-472)
  - Instrumented 12 endpoints with logging calls
  - Backward-compatible wrapper `logAudit()` still works (lines 442-444)

---

## Backward Compatibility

✅ Existing code using `logAudit()` continues to work:
- Old calls like `logAudit(userId, 'loan_disbursed', 'loan', loanId, details)` 
- Automatically routes to `logSystemEvent()` with log_type='loan_action' and status='success'
- No breaking changes to existing functionality

---

## Logging Statistics

**Total Endpoints Instrumented**: 12
- Payment: 3
- Loan Management: 3
- User Management: 4
- Document: 1 (pre-existing)
- Document error handler: 1

**Log Types Generated**: 3 (payment, loan_action, user_mgmt)

**Actions Captured**: 15+
- Payment: 3 actions
- Loan: 4 actions
- User Management: 5 actions
- Document: 3 actions

---

## Next Steps (Phase 3)

**Phase 3: Remaining Endpoint Instrumentation**

Additional endpoints to instrument:
1. **Loan Creation**: `POST /api/loans` - log loan_created
2. **Loan Reactivation**: `POST /api/admin/loans/:id/reactivate` - log loan_reactivated
3. **M-Pesa Callback**: `POST /api/mpesa/callback` - log mpesa_callback_received
4. **SMS Operations**: `POST /api/sms/send` - log sms_sent (separate log_type: 'sms')
5. **Settings Management**: `POST /api/admin/settings/*` - log setting_updated (separate log_type: 'admin_action')

**Phase 4: Backend Read Endpoint**
- Create `GET /api/admin/logs` endpoint
- Support filtering by: log_type, status, user_id, dateFrom, dateTo, search
- Join with users table for admin UI display
- Pagination support

**Phase 5: Frontend UI**
- Complete `pages/AdminSystemLogs.tsx` integration
- Display logs with user info
- Implement filtering and search
- CSV export functionality
