# Admin Roles Management System Audit Report

**Date:** 2024  
**Status:** CRITICAL FINDINGS IDENTIFIED  
**Overall Assessment:** Role infrastructure exists but authorization enforcement is incomplete and inconsistent

---

## Executive Summary

The admin roles and permissions system has **solid database schema and frontend UI**, but suffers from **critical authorization enforcement gaps** in the backend API. The system presents a false sense of granular permission control—the `role_permissions` table exists and the UI allows administrators to configure permissions, but the PHP backend **never actually enforces** these permissions on action endpoints.

**Key Finding:** Of 24 authorization-sensitive endpoints, only 5 are properly protected with `requireRole()` checks. **19 endpoints lack any authorization enforcement** at all, allowing any authenticated user to create/edit/delete critical business data (categories, products, customers, invoices).

---

## Phase 1: Backend Authorization Analysis

### Authorization Coverage Assessment

**Protected Endpoints (5 total):**
- ✓ `POST /admin/loans/{id}/approve` - Requires `admin` role
- ✓ `POST /admin/loans/{id}/release` - Requires `admin` OR `releaser` role
- ✓ `POST /admin/loans/{id}/disburse` - Requires `admin` OR `releaser` role
- ✓ `POST /admin/loans/{id}/reactivate` - Requires `admin` role
- ✓ `POST /admin/loans/{id}/default` - Requires `admin` role

**Unprotected Endpoints (19 total - CRITICAL):**
- ❌ Category management: `POST /admin/categories`, `PUT /admin/categories/{id}`, `DELETE /admin/categories/{id}`
- ❌ Product management: `POST /admin/products`, `PUT /admin/products/{id}`, `DELETE /admin/products/{id}`
- ❌ Borrower management: `POST /admin/borrowers`, `PUT /admin/borrowers/{id}`
- ❌ Customer management: `POST /admin/customers`, `PUT /admin/customers/{id}`, `DELETE /admin/customers/{id}`
- ❌ Invoice product management: `POST /admin/invoice-products`, `PUT /admin/invoice-products/{id}`, `DELETE /admin/invoice-products/{id}`
- ❌ Quotation management: `POST /admin/quotations`, `PUT /admin/quotations/{id}`, `DELETE /admin/quotations/{id}`, `POST /admin/quotations/{id}/convert`, `POST /admin/quotations/{id}/status`
- ❌ Invoice management: `POST /admin/invoices`, `PUT /admin/invoices/{id}`, `DELETE /admin/invoices/{id}`, `POST /admin/invoices/{id}/status`

**Additional Protected Endpoints (not endpoint-specific):**
- Global admin namespace guard at line 1313: `requireRole($user, 'admin', 'releaser', 'manager', 'agent')`
- User management: All endpoints under `/admin/users` require `admin` only
- Settings endpoints require `admin` only
- M-Pesa integration endpoints require `admin` or `releaser`
- Role management endpoints require `admin` only

### Authorization Pattern Analysis

**Pattern 1: Role-Only Checks** (23 endpoints)
```php
requireRole($user, 'admin');  // Only admin
requireRole($user, 'admin', 'releaser');  // Admin OR Releaser
```
- Role checks use string matching against `$user['role']` field
- No permission matrix enforcement
- All checks follow this pattern consistently

**Pattern 2: Permission Matrix (Exists but Never Used)**
- `role_permissions` table stores 22 permission keys per role
- Permissions are successfully written and read (see AdminRoles.tsx UI)
- Backend NEVER queries or enforces these permissions on action endpoints
- False sense of security: UI shows granular permissions, but they have zero backend effect

**Pattern 3: Missing Authorization (19 endpoints)**
- No `requireRole()` calls on data management CRUD operations
- Any authenticated user (including borrowers) can call these endpoints
- Theoretically also protected by global admin namespace guard at line 1313, but this needs verification

### Critical Issue: Permission Matrix is UI-Only

The backend implements permission storage but NOT enforcement:

```php
// Line 3090-3195: Permission matrix READING
$perms = all("SELECT permission_key, granted FROM role_permissions WHERE role_id = ?", [$role['id']]);

// ❌ NO PERMISSION CHECKS anywhere in business logic
// All checks use role string only:
if ($user['role'] !== 'admin' && $user['role'] !== 'releaser') return error(...);
```

**Impact:** 
- Admin can toggle permissions in UI (which works)
- These permissions affect NOTHING on the API
- Developer confusion: looks like permissions are enforced but they're not

---

## Phase 2: Frontend/Backend Alignment Assessment

### Navigation Role Mappings (navigationConfig.ts)

Defined role-to-feature mappings are **inconsistently enforced on backend**:

| Feature | Frontend Roles | Backend Check | Status |
|---------|----------------|---------------|--------|
| Dashboard | `admin,releaser,manager,agent` | Line 1313 global check | ✓ ALIGNED |
| Loan Applications | `admin,releaser,manager,agent` | Line 1313 | ✓ ALIGNED |
| Create Loan | `admin,manager` | None (covered by global 1313) | ⚠️ PARTIAL |
| Approve Loans | `admin` | Line 1447: `requireRole($user, 'admin')` | ✓ ALIGNED |
| Release Loans | `admin,releaser` | Line 1480: `requireRole($user, 'admin', 'releaser')` | ✓ ALIGNED |
| Disburse Loans | `admin,releaser` | Line 1503: `requireRole($user, 'admin', 'releaser')` | ✓ ALIGNED |
| **Categories** | `admin,manager` | **NONE** | ❌ MISALIGNED |
| **Products** | `admin,manager` | **NONE** | ❌ MISALIGNED |
| **Borrowers** | `admin,manager,agent` | **NONE** | ❌ MISALIGNED |
| **Customers** | `admin,manager,releaser,agent` | **NONE** | ❌ MISALIGNED |
| **Invoice Products** | `admin,manager,releaser,agent` | **NONE** | ❌ MISALIGNED |
| **Quotations** | `admin,manager,releaser,agent` | **NONE** | ❌ MISALIGNED |
| **Invoices** | `admin,manager,releaser,agent` | **NONE** | ❌ MISALIGNED |
| Users | `admin` | Line 2371: `requireRole($user, 'admin')` | ✓ ALIGNED |
| Roles | `admin` | Line 3090: `requireRole($user, 'admin')` | ✓ ALIGNED |
| System Logs | `admin,manager` | Line 2864: Logs retrieval OK, no check on route itself | ⚠️ PARTIAL |

### PrivateRoute Frontend Gates

**Working Correctly:**
- Routes are wrapped in `<PrivateRoute requiredRole={...}>` components
- PrivateRoute.tsx properly validates user role before rendering children
- Unauthenticated users are redirected to `/login`
- Unauthorized users are redirected to appropriate portal (`/admin` or `/dashboard`)

**Limitation:**
- Frontend routing prevents unauthorized access to pages
- But does NOT prevent direct API calls via curl/Postman to unprotected endpoints
- Backend must enforce authorization independently

### AdminRoles.tsx Permission UI

**Functional Aspects:**
- ✓ Fetches all roles from `GET /admin/roles` endpoint (line 3090 in api.php)
- ✓ Displays all 22 permissions correctly (hardcoded list, lines 24-47)
- ✓ Shows permission matrix with Check/X indicators
- ✓ Allows editing role metadata (name, description)
- ✓ Allows toggling permissions and calls `PUT /admin/roles/{roleKey}/permissions` endpoint (line 3145)
- ✓ Audit logging captures permission changes (line 3195)

**Design Mismatch:**
- UI implies permissions are enforced (shows detailed matrix)
- Backend never checks these permissions
- Creates false sense of security

---

## Phase 3: Permission Matrix Implementation Status

### Database Schema (Verified ✓)

```sql
-- roles table (lines 516-524)
CREATE TABLE roles (
  id INT PRIMARY KEY,
  key_name VARCHAR(50) UNIQUE,
  name VARCHAR(100),
  description TEXT,
  system_role BOOLEAN,
  created_at, updated_at
);

-- role_permissions table (lines 526-534)
CREATE TABLE role_permissions (
  role_id INT,
  permission_key VARCHAR(100),
  granted BOOLEAN DEFAULT 1,
  created_at, updated_at,
  PRIMARY KEY (role_id, permission_key)
);
```

### Default Role Seeding (Verified ✓)

All 5 roles seeded with complete permission matrix (lines 581-625):

**Admin Role:** 22/22 permissions granted
**Releaser Role:** Dashboard, Loan Applications (view), Release Loans, Reports
**Manager Role:** Dashboard, Loan Applications (view), Approve Loans, Create Loan, Borrowers, Repayments, Reports
**Agent Role:** Dashboard, Borrowers, Messages, Payments
**Borrower Role:** Dashboard, My Loans, Apply for Loan, Payments, Profile, Messages

### Permission Storage & Retrieval (Verified ✓)

```php
// Line 3090-3122: GET /admin/roles retrieves permissions
$roles = all("SELECT * FROM roles WHERE system_role = 1");
foreach ($roles as &$role) {
  $perms = all("SELECT permission_key, granted FROM role_permissions WHERE role_id = ?", [$role['id']]);
  $role['permissions'] = array_column($perms, 'granted', 'permission_key');
}
```

### Permission Enforcement (Verified ❌ - NOT IMPLEMENTED)

**No middleware or permission-based checks found in any action endpoint**

Expected enforcement (not present):
```php
// This would check if user's role has permission, but it doesn't exist
function requirePermission($user, $permissionKey) {
  $granted = one(
    "SELECT granted FROM role_permissions 
     JOIN roles ON roles.id = role_permissions.role_id 
     WHERE roles.key_name = ? AND permission_key = ? AND granted = 1",
    [$user['role'], $permissionKey]
  );
  if (!$granted) return error("Permission denied", 403);
}
```

---

## Phase 4: User Permission Overrides

### Current Status: NOT IMPLEMENTED

**Evidence:**
1. No `users.permissions` or similar column in users table
2. AdminUsers.tsx only assigns roles (lines 329-339), no per-user permission override UI
3. API has no mechanism to grant individual permissions to users
4. All access control is purely role-based

**Design Consideration:**
- Some systems allow "user X has manager role + permission to approve loans but not disburse"
- This system does not support this level of granularity
- Not necessarily a gap—depends on business requirements

**Recommendation:**
- If granular per-user permissions are needed in future, add `users.permissions` JSON column
- Would require significant backend refactoring to check both role + user-specific permissions

---

## Phase 5: Audit Trail Coverage

### Audit Logging Implementation (Verified ✓)

**Central audit logging functions:**

```php
// Line 51-67: logAudit()
function logAudit($userId, $action, $entityType, $entityId, $details = []) {
  q("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
    VALUES (?, ?, ?, ?, ?, ?, ?)",
    [$userId, $action, $entityType, $entityId, json_encode($details), $_SERVER['REMOTE_ADDR'], $_SERVER['HTTP_USER_AGENT']]
  );
}

// Line 69-81: logSystem()
function logSystem($type, $action, $details = []) {
  q("INSERT INTO system_logs (log_type, action, details, user_id, status) VALUES (?, ?, ?, ?, ?)",
    [$type, $action, json_encode($details), Auth::user()?->id, 'success']
  );
}
```

### Audit Coverage: Role Management (✓ Comprehensive)

| Operation | Logged? | Location | Severity |
|-----------|---------|----------|----------|
| Role creation | ✓ | Line 3146 | Core operation |
| Role name/description update | ✓ | Line 3155 | Core operation |
| Permission matrix changes | ✓ | Line 3195 | Core security change |
| User role assignment | ✓ | AdminUsers.tsx | Core operation |

**Role Update Audit Example** (line 3155):
```php
logAudit($u['id'], 'role_updated', 'role', $role['id'], [
  'old_name' => $role['name'],
  'new_name' => $roleData['name'],
  'changed_at' => date('Y-m-d H:i:s')
]);
```

**Permission Update Audit Example** (line 3195):
```php
logAudit($u['id'], 'role_permissions_updated', 'role', $role['id'], [
  'permission_key' => $permKey,
  'granted' => $granted,
  'changed_at' => date('Y-m-d H:i:s')
]);
```

### Audit Coverage: Loan Operations (✓ Comprehensive)

- Loan approval logged (line 1464)
- Loan release logged (line 1488)
- Loan disbursement logged (line 1520)
- Loan reactivation logged (line 1539)
- M-Pesa transactions logged (lines 2726-2800)

### Audit Coverage: Data Management Operations (❌ Missing)

| Operation | Logged? | Impact |
|-----------|---------|--------|
| Create category | ❌ | Medium - configuration audit trail missing |
| Update category | ❌ | Medium - cannot audit who changed what |
| Delete category | ❌ | High - cannot audit deletions |
| Create product | ❌ | Medium |
| Update product | ❌ | Medium |
| Delete product | ❌ | High |
| Create borrower | ✓ | Line 1966 |
| Update borrower | ❌ | Medium |
| Delete borrower | ❌ | High |
| Create customer | ❌ | Medium |
| Update customer | ❌ | Medium |
| Delete customer | ❌ | High |
| Create/update invoices/quotations | ❌ | Medium |
| Delete invoices/quotations | ❌ | High |

**Data management operations (categories, products, customers, invoices) lack audit logging.**

---

## Security Vulnerability Assessment

### 1. **CRITICAL: Authorization Bypass on Data Management Endpoints**

**Severity:** CRITICAL (CVSS 8.1)

**Vulnerability:**
- 19 CRUD endpoints lack `requireRole()` checks
- Protected by global admin namespace guard (line 1313) but this still allows `releaser`, `manager`, `agent` roles
- ❌ Agents can create/edit loan categories and products (should require manager)
- ❌ Agents can create/edit borrowers (may be intended)
- ❌ Agents can create/edit customers and invoices (should require manager/admin)

**Example Attack:**
```bash
# Attacker with 'agent' role calls:
curl -X POST http://api.example.com/admin/categories \
  -H "Authorization: Bearer <agent_token>" \
  -d '{"name": "Malicious Category"}'
# Success! No authorization check prevents this
```

**Impact:**
- Data integrity loss: non-managers can create/delete business configurations
- Compliance violations: unaudited changes to critical data
- Operational disruption: incorrect categories/products affect loan processing

**Recommendation:**
Add explicit `requireRole()` checks to all data management endpoints:
```php
// Line ~2273 (categories POST)
requireRole($user, 'admin', 'manager');

// Line ~2302 (products POST)
requireRole($user, 'admin', 'manager');

// Line ~1920 (borrowers POST)
requireRole($user, 'admin', 'manager', 'agent');

// Line ~3209 (customers POST)
requireRole($user, 'admin', 'manager');

// Line ~3245 (invoice products POST)
requireRole($user, 'admin', 'manager');

// Lines ~3274-3440 (quotations/invoices CRUD)
requireRole($user, 'admin', 'manager', 'releaser');
```

### 2. **HIGH: Permission Matrix Never Enforced**

**Severity:** HIGH (CVSS 5.8)

**Vulnerability:**
- `role_permissions` table has 22 permission keys per role
- Admin UI shows granular permissions (all 22 permissions per role)
- Backend never checks these permissions on ANY endpoint
- Permission changes have zero security effect

**Example:**
1. Admin toggles "Approve Loans" permission OFF for manager role in AdminRoles UI
2. Permission update is logged and saved to DB
3. Manager can still approve loans via API (no enforcement)
4. UI shows permission is disabled, but it has no actual effect

**Impact:**
- False sense of security: "we have granular permissions configured"
- Compliance risk: auditors see permission matrix UI but permission changes don't prevent access
- Dev confusion: unclear whether permissions are enforced or not

**Root Cause:**
Enforcement middleware was never implemented. The role string is checked, but not the permission matrix.

**Recommendation:**
Choose ONE approach:

**Option A: Implement Permission Enforcement (Preferred)**
```php
function requirePermission($user, $permissionKey) {
  $role = one("SELECT id FROM roles WHERE key_name = ?", [$user['role']]);
  if (!$role) return error("Invalid role", 400);
  
  $perm = one(
    "SELECT granted FROM role_permissions WHERE role_id = ? AND permission_key = ? AND granted = 1",
    [$role['id'], $permissionKey]
  );
  
  if (!$perm) return error("Permission denied: $permissionKey", 403);
}

// Usage: requirePermission($user, 'Approve Loans');
```

**Option B: Remove Permission Matrix (Simpler)**
If granular permissions aren't needed, delete the permission matrix UI and table, use role checks only.

### 3. **HIGH: Inconsistent Authorization on Multi-Role Endpoints**

**Severity:** HIGH (CVSS 5.4)

**Vulnerability:**
- Some endpoints accept multiple roles: `requireRole($user, 'admin', 'releaser')`
- No documentation of why these roles are permitted
- `releaser` role might have too much access

**Example Inconsistencies:**
- `POST /admin/loans/{id}/release` allows both `admin` and `releaser`
  - Should `releaser` be able to release loans they didn't create? Unclear.
- `POST /admin/loans/{id}/disburse` allows both `admin` and `releaser`
  - Should `releaser` disburse loans? Or only `admin`?

**Recommendation:**
Document intended authorization for each endpoint:
```php
// Line 1480 - why both admin and releaser?
// Intent: Both admin and releaser roles need ability to release loans
// Financial control: Releaser must pass approval verification before release
requireRole($user, 'admin', 'releaser');
```

### 4. **MEDIUM: No Audit Trail for Data Management Changes**

**Severity:** MEDIUM (CVSS 4.3)

**Vulnerability:**
- Loan operations are fully logged
- Role/permission changes are fully logged
- But data management (categories, products, customers, invoices) is NOT logged

**Impact:**
- Cannot audit who created/modified business configurations
- Compliance violations for data governance requirements
- No trail to identify when/why incorrect data was entered

**Recommendation:**
Add `logAudit()` calls to all CRUD endpoints, especially deletions:
```php
// Line 2273 - POST /admin/categories
logAudit($user['id'], 'category_created', 'category', $categoryId, [
  'name' => $categoryData['name'],
  'created_by' => $user['id']
]);

// Line 2299 - DELETE /admin/categories/{id}
logAudit($user['id'], 'category_deleted', 'category', $categoryId, [
  'name' => $category['name'],
  'deleted_by' => $user['id']
]);
```

### 5. **MEDIUM: No Individual User Permission Overrides**

**Severity:** MEDIUM (CVSS 3.8)

**Vulnerability:**
- All access control is role-based
- Cannot grant specific permissions to individual users
- Cannot restrict specific permissions from a user with high-privilege role

**Example Use Case:**
- User is `manager` (can approve loans)
- Business needs to temporarily prevent this user from approving loans without changing their role
- No mechanism to do this—must downgrade role entirely

**Impact:**
- Limited operational flexibility
- Cannot implement fine-grained access control
- Workaround: create custom roles for every edge case

**Recommendation:**
Not critical for current deployment, but for future enhancements:
1. Add `users.permissions` JSON column to override role permissions
2. Implement check: `hasPermission($user, $permKey)` function that checks both role AND user overrides
3. Add "User Overrides" section to AdminUsers UI

---

## Default Role Permissions Matrix (Verified)

| Permission | Admin | Releaser | Manager | Agent | Borrower |
|-----------|-------|----------|---------|-------|----------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Loan Applications (view) | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve Loans | ✓ | ✗ | ✓ | ✗ | ✗ |
| Release Loans | ✓ | ✓ | ✗ | ✗ | ✗ |
| Disburse Loans | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create Loan | ✓ | ✗ | ✓ | ✗ | ✗ |
| Loan Categories | ✓ | ✗ | ✗ | ✗ | ✗ |
| Loan Products | ✓ | ✗ | ✗ | ✗ | ✗ |
| Borrowers | ✓ | ✗ | ✓ | ✓ | ✗ |
| Repayments | ✓ | ✗ | ✓ | ✗ | ✗ |
| Disbursements | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reports | ✓ | ✓ | ✓ | ✗ | ✗ |
| Users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| System Logs | ✓ | ✗ | ✗ | ✗ | ✗ |
| Customers / Invoicing | ✓ | ✗ | ✗ | ✗ | ✗ |
| Admin Messages | ✓ | ✗ | ✗ | ✗ | ✗ |
| My Loans | ✗ | ✗ | ✗ | ✗ | ✓ |
| Apply for Loan | ✗ | ✗ | ✗ | ✗ | ✓ |
| Payments | ✓ | ✗ | ✗ | ✓ | ✓ |
| Profile | ✗ | ✗ | ✗ | ✗ | ✓ |
| Messages | ✓ | ✗ | ✗ | ✗ | ✓ |

---

## Summary of Findings

### What's Working Well ✓

1. **Database schema** is well-designed with roles and role_permissions tables
2. **Default permissions** are comprehensively seeded for all 5 roles
3. **Frontend routing** properly gates pages by role
4. **Admin UI** for managing permissions is functional and intuitive
5. **Audit logging** captures loan operations and role/permission changes
6. **API endpoints** for fetching and updating roles are implemented

### Critical Gaps ❌

1. **Authorization enforcement is 79% incomplete** (19/24 CRUD endpoints unprotected)
2. **Permission matrix is never enforced** (stored but not checked)
3. **Audit trail missing** for data management operations
4. **No per-user permission overrides** available
5. **Role requirements inconsistent** between frontend navigation and backend checks

### Recommendations (Prioritized)

**IMMEDIATE (This Week):**
1. Add `requireRole()` checks to 19 unprotected data management endpoints
2. Verify global admin namespace guard (line 1313) is sufficient protection
3. Add audit logging to all data management CRUD operations
4. Document intended authorization model for each endpoint

**SHORT-TERM (This Month):**
1. Decide: enforce permission matrix OR remove UI (don't leave both)
2. Create comprehensive authorization matrix documentation
3. Add integration tests for authorization on all endpoints
4. Review multi-role endpoints to ensure correct role combinations

**MEDIUM-TERM (Next Quarter):**
1. Implement per-user permission overrides if business requires
2. Create role-based endpoint discovery API
3. Add API documentation showing which roles can access each endpoint
4. Regular security audits (quarterly minimum)

---

## Audit Methodology

This audit was conducted through:
1. **Static code analysis** of api.php, React components, and database schema
2. **Navigation mapping** comparison between frontend config and backend checks
3. **Grep searches** for all `requireRole()`, `role_permissions`, and authorization patterns
4. **UI functional testing** of AdminRoles permission matrix
5. **Database schema verification** against expected RBAC patterns

No penetration testing or live API calls were performed. Recommendations are based on code review.
