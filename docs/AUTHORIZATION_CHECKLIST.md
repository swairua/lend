# Authorization Enforcement Checklist

**Generated**: June 1, 2026  
**Purpose**: Track which endpoints enforce role/permission checks and which need fixes

---

## Overview

This checklist identifies all admin action endpoints and their current authorization status. Endpoints marked with 🔴 CRITICAL or 🟠 HIGH need immediate fixes.

---

## Critical Issues (Fix ASAP)

### 🔴 CRITICAL: Missing Authorization (P0)

#### POST /admin/loans/:id/reactivate
- **Current Authorization**: NONE (no requireRole call)
- **Recommended**: `requireRole($user, 'admin');` or better: check "Approve Loans" permission
- **Line**: 1535
- **Action Taken**: Reactivates rejected/completed loan back to pending
- **Severity**: CRITICAL
- **Why**: Any authenticated user can reactivate loan statuses, breaking workflow

```php
// CURRENT (BROKEN):
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/reactivate$#', $uri, $m)) {
    // NO AUTHORIZATION CHECK
    q("UPDATE loans SET status='pending', ...");
}

// FIX:
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/reactivate$#', $uri, $m)) {
    requireRole($user, 'admin');
    q("UPDATE loans SET status='pending', ...");
}
```

---

#### POST /admin/loans/:id/default
- **Current Authorization**: NONE (no requireRole call)
- **Recommended**: `requireRole($user, 'admin');` or better: check "Approve Loans" permission
- **Line**: 1541
- **Action Taken**: Marks loan as defaulted
- **Severity**: CRITICAL
- **Why**: Any user can mark loans as defaulted, affecting repayment records and statistics

```php
// CURRENT (BROKEN):
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/default$#', $uri, $m)) {
    // NO AUTHORIZATION CHECK
    q("UPDATE loans SET status='defaulted', ...");
}

// FIX:
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/default$#', $uri, $m)) {
    requireRole($user, 'admin');
    q("UPDATE loans SET status='defaulted', ...");
}
```

---

## High Priority Issues (P1)

### 🟠 HIGH: Inconsistent Permission Enforcement

All of these endpoints use `requireRole()` but DON'T check the `role_permissions` table:

#### POST /admin/loans/:id/approve
- **Line**: 1446-1447
- **Current Authorization**: `requireRole($user, 'admin')`
- **Problem**: Ignores "Approve Loans" permission in database
- **Recommended Fix**: 
  ```php
  requirePermission($user, 'Approve Loans');
  // Or until requirePermission exists:
  requireRole($user, 'admin');  // OK for now
  ```
- **Status**: Low risk for now (only admin), but inconsistent with permission matrix
- **Priority**: Medium – Implement when permission enforcement is built

---

#### POST /admin/loans/:id/release
- **Line**: 1479-1480
- **Current Authorization**: `requireRole($user, 'admin', 'releaser')`
- **Problem**: Both 'admin' and 'releaser' roles allowed, but doesn't check "Release Loans" permission
- **Recommended Fix**: 
  ```php
  requirePermission($user, 'Release Loans');
  // Until then, current check is reasonable:
  requireRole($user, 'admin', 'releaser');
  ```
- **Status**: Acceptable – 'releaser' role explicitly means "can release loans"
- **Priority**: Low – Current design makes sense, but permission matrix should be enforced

---

#### POST /admin/loans/:id/disburse
- **Line**: 1502-1503
- **Current Authorization**: `requireRole($user, 'admin', 'releaser')`
- **Problem**: Allows both 'admin' and 'releaser', but permission matrix grants this only to 'admin' by default
- **Note**: Current code contradicts default permissions (releaser doesn't have "Disburse Loans" in seed data)
- **Recommended Fix**: 
  ```php
  // Option 1: Match current role check with seed data
  requireRole($user, 'admin');
  
  // Option 2: Match seed data by changing role check
  requireRole($user, 'admin', 'releaser');  // Keep current
  // But update seed data to grant "Disburse Loans" to releaser
  ```
- **Status**: Inconsistency between code and seed data
- **Priority**: Medium – Decide if releaser should disburse loans, then align code and seed

---

#### POST /admin/users (Create User)
- **Line**: 2989
- **Current Authorization**: `requireRole($user, 'admin')`
- **Problem**: No check for "Users" permission
- **Recommended Fix**: Check "Users" permission when implemented
- **Priority**: Medium – Permission matrix has "Users" key but not enforced

---

#### PUT /admin/users/:id (Update User)
- **Line**: TBD
- **Current Authorization**: `requireRole($user, 'admin')`
- **Problem**: No check for "Users" permission
- **Priority**: Medium

---

#### POST /admin/mpesa/payment
- **Line**: 2462-2463
- **Current Authorization**: `requireRole($user, 'admin')`
- **Problem**: No check for "Payments" permission
- **Priority**: Medium

---

#### POST /admin/mpesa/disburse
- **Line**: 2545-2546
- **Current Authorization**: `requireRole($user, 'admin', 'releaser')`
- **Problem**: Should check "Disburse Loans" permission
- **Priority**: Medium

---

#### PUT /admin/roles/:key (Update Role)
- **Line**: 3106-3127
- **Current Authorization**: `requireRole($user, 'admin')`
- **Problem**: 
  1. No check for "Settings" permission
  2. **Missing Audit Log**: No `logAudit()` call when role is updated
- **Recommended Fix**:
  ```php
  requirePermission($user, 'Settings');
  // ... existing code ...
  logAudit($user['id'], 'role_updated', 'role', $roleId, [
      'role_key' => $roleKey,
      'old_name' => $oldRole['name'],
      'new_name' => $d['name'] ?? null,
      'old_description' => $oldRole['description'],
      'new_description' => $d['description'] ?? null
  ]);
  ```
- **Priority**: High – Missing audit trail is concerning

---

#### PUT /admin/roles/:key/permissions (Update Permissions)
- **Line**: 3132-3161
- **Current Authorization**: `requireRole($user, 'admin')`
- **Problem**: 
  1. No check for "Settings" permission
  2. **Missing Audit Log**: No `logAudit()` call when permissions are updated
  3. No record of which permissions changed (just: "permissions updated")
- **Recommended Fix**:
  ```php
  requirePermission($user, 'Settings');
  // ... existing code ...
  // Before foreach: Store old permissions
  $oldPerms = all("SELECT permission_key, granted FROM role_permissions WHERE role_id = ?", [$roleId]);
  $oldPermsMap = [];
  foreach ($oldPerms as $p) {
      $oldPermsMap[$p['permission_key']] = (bool)$p['granted'];
  }
  
  // After forEach: Log the differences
  logAudit($user['id'], 'permissions_updated', 'role', $roleId, [
      'role_key' => $roleKey,
      'changes' => array_diff_assoc($d['permissions'], $oldPermsMap)
  ]);
  ```
- **Priority**: High – Missing audit trail is critical for compliance

---

## Complete Endpoint Checklist

### Loan Management
- [ ] **POST /admin/loans/:id/approve** – Has auth (admin only) | Missing: Audit log
- [ ] **POST /admin/loans/:id/release** – Has auth (admin, releaser) | Missing: Permission check
- [ ] **POST /admin/loans/:id/disburse** – Has auth (admin, releaser) | Missing: Permission check
- [ ] **POST /admin/loans/:id/reactivate** – ❌ **MISSING AUTH** | Priority: P0
- [ ] **POST /admin/loans/:id/default** – ❌ **MISSING AUTH** | Priority: P0
- [ ] **POST /admin/loans** (Create) – Has auth (admin+) | Needs: Permission check
- [ ] **GET /admin/loans** – Has auth (admin+) | Status: OK
- [ ] **GET /admin/loans/:id** – Has auth (admin+) | Status: OK

### Borrower Management
- [ ] **GET /admin/borrowers** – Has auth (admin+) | Status: OK
- [ ] **PUT /admin/borrowers/:id** – Has auth (admin) | Missing: Permission check

### User Management
- [ ] **GET /admin/users** – Has auth (admin) | Status: OK
- [ ] **POST /admin/users** (Create) – Has auth (admin) | Missing: Audit log, Permission check
- [ ] **PUT /admin/users/:id** – Has auth (admin) | Missing: Audit log, Permission check
- [ ] **POST /admin/users/:id/toggle** – Has auth (admin) | Missing: Audit log, Permission check

### Role Management
- [ ] **GET /admin/roles** – Has auth (admin) | Status: OK
- [ ] **GET /admin/roles/:key** – Has auth (admin) | Status: OK
- [ ] **PUT /admin/roles/:key** – Has auth (admin) | Missing: **Audit log**, Permission check
- [ ] **PUT /admin/roles/:key/permissions** – Has auth (admin) | Missing: **Audit log**, Permission check

### Settings & Configuration
- [ ] **GET /admin/email-settings** – Has auth (admin) | Status: OK
- [ ] **POST /admin/email-settings** – Has auth (admin) | Missing: Audit log, Permission check
- [ ] **PUT /admin/email-settings** – Has auth (admin) | Missing: Audit log, Permission check
- [ ] **POST /admin/upload-logo** – Has auth (admin) | Missing: Audit log

### Payment Integration
- [ ] **POST /admin/mpesa/payment** – Has auth (admin) | Missing: Permission check
- [ ] **POST /admin/mpesa/disburse** – Has auth (admin, releaser) | Missing: Permission check
- [ ] **POST /admin/mpesa/sync-payments** – Has auth (admin) | Missing: Permission check
- [ ] **POST /admin/mpesa/match-repayment** – Has auth (admin) | Missing: Permission check

---

## Migration Plan

### Phase 1: Emergency (Immediate)
1. Add `requireRole($user, 'admin')` to `/admin/loans/:id/reactivate`
2. Add `requireRole($user, 'admin')` to `/admin/loans/:id/default`
3. Test that endpoints now reject unauthenticated/non-admin requests

### Phase 2: Audit Trail (Within 1 week)
1. Add `logAudit()` call after role name/description update (line 3125)
2. Add `logAudit()` call after permission update (line 3159)
3. Create helper function to log permission changes with diffs
4. Test that audit_logs table records all role/permission changes

### Phase 3: Permission Enforcement (Optional, future)
1. Create `requirePermission($user, $permissionKey)` helper function
2. Create permission_key → endpoint mapping document
3. Refactor critical endpoints to check permissions instead of roles
4. Add permission-based frontend navigation guards
5. Test permission matrix controls actual access

### Phase 4: Polish (Nice to have)
1. Implement per-user permission overrides (or remove column)
2. Add permission sync tests
3. Add compliance reports for permission audit

---

## Testing Strategy

### Test 1: Unauthorized Access (Phase 1)
```bash
# Should fail (403 or 401) before fix
curl -X POST http://localhost/api/admin/loans/1/reactivate \
  -H "Authorization: Bearer token_for_non_admin_user"

# Should fail (403 or 401) before fix
curl -X POST http://localhost/api/admin/loans/1/default \
  -H "Authorization: Bearer token_for_non_admin_user"
```

### Test 2: Audit Logging (Phase 2)
```sql
-- Check that role update creates audit log
SELECT * FROM audit_logs 
WHERE action = 'role_updated' 
ORDER BY created_at DESC LIMIT 1;

-- Check that permission change creates audit log
SELECT * FROM audit_logs 
WHERE action = 'permissions_updated' 
ORDER BY created_at DESC LIMIT 1;
```

### Test 3: Permission Enforcement (Phase 3)
```bash
# Deny "Release Loans" permission to releaser role
curl -X PUT http://localhost/api/admin/roles/releaser/permissions \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json" \
  -d '{"permissions": {"Release Loans": false}}'

# Should now fail for releaser
curl -X POST http://localhost/api/admin/loans/1/release \
  -H "Authorization: Bearer token_for_releaser_user"

# Should still work for admin
curl -X POST http://localhost/api/admin/loans/1/release \
  -H "Authorization: Bearer token_for_admin_user"
```

---

## Files to Modify

| File | Lines | Change | Priority |
|------|-------|--------|----------|
| api.php | 1535 | Add `requireRole()` to /reactivate | P0 |
| api.php | 1541 | Add `requireRole()` to /default | P0 |
| api.php | 3125 | Add `logAudit()` after role update | P1 |
| api.php | 3159 | Add `logAudit()` after permission update | P1 |
| api.php | ~788 | Create `requirePermission()` helper | P2 |
| api.php | Throughout | Replace `requireRole()` with `requirePermission()` | P2 |
| docs/ | NEW | Create permission_key → endpoint mapping | P2 |

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Total Endpoints | 20+ | Scanned |
| Endpoints with Authorization | 18 | OK |
| Endpoints without Authorization | 2 | 🔴 CRITICAL |
| Endpoints with Audit Logging | ~15 | Action-only |
| Endpoints with Permission Checks | 0 | 🟠 HIGH (Design Gap) |
| Tests Available | 0 | Missing |

### Key Metrics
- **Security Gap**: 2 unauthenticated endpoints (CRITICAL)
- **Design Gap**: 0 of 22 permissions actually enforced (HIGH)
- **Audit Gap**: 0 role/permission changes logged (MEDIUM)

---

## References
- [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) – Full permission × role × endpoint matrix
- [AUDIT_ADMIN_ROLES.md](./AUDIT_ADMIN_ROLES.md) – Detailed audit report and findings
- api.php – Implementation source code
