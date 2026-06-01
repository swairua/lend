# Admin Roles Management Audit Report

**Date**: June 1, 2026  
**Auditor**: Security/Code Review  
**Status**: CRITICAL FINDINGS IDENTIFIED

---

## Executive Summary

The admin roles and permissions system is **mostly well-designed** with complete backend schema and seeding, but has **CRITICAL SECURITY GAPS**:

1. **🔴 CRITICAL**: Two loan action endpoints (`/admin/loans/:id/reactivate`, `/admin/loans/:id/default`) **have NO authorization checks** at all
2. **🟠 HIGH**: Permission enforcement is inconsistent—most endpoints check role string only, ignoring the `role_permissions` table
3. **🟡 MEDIUM**: Frontend/backend alignment issue was routing bug (now fixed) where `/admin/roles` endpoint returned 404
4. **🟡 MEDIUM**: User-level permission overrides column (`users.permissions`) appears unused
5. **🟢 LOW**: Audit trail exists but role/permission changes don't consistently trigger logs

---

## Current Implementation

### Backend (api.php)

#### Role/Permission Schema (WORKING)
- **Table: `roles`** – Stores 5 seeded roles with key_name, name, description, system_role flag
  - admin, releaser, manager, agent, borrower
- **Table: `role_permissions`** – Maps each role to 22 permission keys (granted: 1/0)
- **Table: `audit_logs`** and **`system_logs`** – For audit trail (exists but underutilized)

#### Seeded Default Permissions (CORRECT)
All 22 permission keys properly seeded with role-specific defaults:
- **Admin**: All 22 permissions
- **Releaser**: Dashboard, Loan Applications (view), Release Loans, Reports
- **Manager**: Dashboard, Loan Applications (view), Approve Loans, Create Loan, Borrowers, Repayments, Reports
- **Agent**: Dashboard, Borrowers, Messages, Payments
- **Borrower**: Dashboard, My Loans, Apply for Loan, Payments, Profile, Messages

#### API Endpoints (MOSTLY WORKING)
- ✅ `GET /admin/roles` – List all roles with permissions (NOW FIXED: routing)
- ✅ `GET /admin/roles/:roleKey` – Get single role
- ✅ `PUT /admin/roles/:roleKey` – Update role name/description
- ✅ `PUT /admin/roles/:roleKey/permissions` – Update permission matrix

**Fix Applied**: Removed leading slashes in URI pattern matching (lines 3063, 3083, 3106, 3132)

### Frontend (React/TypeScript)

#### Admin Roles Page (COMPLETE)
- Displays all 22 permissions in matrix format
- Allows admin to edit role name, description, and permissions
- System roles marked read-only
- Uses `adminApi.getRoles()`, `updateRole()`, `updateRolePermissions()`

#### Navigation & RBAC Gates (ROLE-BASED)
- `navigationConfig.ts`: Maps roles to routes (no fine-grained permissions)
- `PrivateRoute.tsx`: Enforces role membership but not individual permissions
- Admin users page allows role assignment (borrower, admin, releaser, manager, agent)

---

## Security Findings

### 🔴 CRITICAL: Missing Authorization Checks

**Endpoints with NO `requireRole()` calls:**

```
POST /admin/loans/:id/reactivate  (Line 1535)
POST /admin/loans/:id/default     (Line 1541)
```

**Impact**: Any authenticated user can:
- Reactivate rejected/completed/defaulted loans
- Mark any loan as defaulted
- This bypasses the admin-only loan workflow

**Severity**: CRITICAL – Loan status tampering, potential fraud
**Fix**: Add `requireRole($user, 'admin', 'manager')` before each endpoint

---

### 🟠 HIGH: Inconsistent Permission Enforcement

**Current Pattern**: Most admin endpoints check role string (`requireRole($user, 'admin')`), NOT the `role_permissions` table.

**Endpoints Checked**:
- ✅ Loan Approve (admin only) – should check "Approve Loans" permission
- ✅ Loan Release (admin, releaser) – should check "Release Loans" permission  
- ✅ Loan Disburse (admin, releaser) – should check "Disburse Loans" permission
- ✅ M-Pesa Payments (admin) – should check "Payments" permission
- ✅ M-Pesa Disburse (admin, releaser) – should check "Disburse Loans" permission
- ✅ User Management (admin) – should check "Users" permission
- ✅ Role Management (admin) – should check "Settings" permission
- ✅ Borrower Management (admin) – should check "Borrowers" permission
- ✅ Email Settings (admin) – should check "Settings" permission
- ❓ Loan Reactivate/Default (NO CHECK) – should check role + permission

**Current Behavior**: 
- Backend stores permission matrix (22 keys per role)
- UI shows permission matrix and allows editing
- Backend ignores the matrix and just checks role string
- Granting/denying permission in UI has NO actual effect on endpoint access

**Root Cause**: The system was designed for future granular control but not implemented

**Fix Approach**:
1. Create helper: `requirePermission($user, $permissionKey)` 
2. Map permission keys to endpoints (create AUTHORIZATION_CHECKLIST.md)
3. Replace `requireRole()` calls with `requirePermission()` calls where applicable

---

### 🟡 MEDIUM: User-Level Permission Overrides (UNUSED)

**Column**: `users.permissions` (JSON field)

**Current Status**: 
- Column exists in schema
- Never read or written in api.php
- Frontend (AdminUsers.tsx) doesn't expose override UI
- Not documented

**Recommendation**: 
- Either implement and document the feature
- Or remove the column and deprecate the concept

---

### 🟡 MEDIUM: Incomplete Audit Logging for Role Changes

**Audit Log Calls Found**:
- ✅ `logAudit()` called for loan actions (approve, release, disburse)
- ❌ NO audit log when role is created
- ❌ NO audit log when role name/description is updated
- ❌ NO audit log when permissions are changed

**Impact**: Cannot trace who changed permissions and when

**Fix**: Add audit logging to:
- Line 3125: After role update
- Line 3159: After permission update

---

## Frontend/Backend Alignment

### ✅ WORKING
- All 22 permission keys in frontend match backend
- Role creation/deletion not exposed in UI (good)
- Admin can view and edit permission matrix
- Role dropdown in user creation includes all 5 roles

### ⚠️ ISSUES
- Frontend shows permission matrix but changes have NO backend effect (permissions ignored)
- No fine-grained permission gates in frontend navigation (only role-based)
- User permission override column not exposed anywhere

---

## Authorization Pattern Summary

### Endpoints by Auth Level

**Admin Only** (require 'admin'):
- POST /admin/loans/:id/approve
- POST /admin/upload-logo
- Email settings
- M-Pesa payment endpoints
- User management
- Role management

**Admin + Releaser** (require 'admin' OR 'releaser'):
- POST /admin/loans/:id/release
- POST /admin/loans/:id/disburse
- POST /admin/mpesa/disburse

**Admin + Manager** (require 'admin' OR 'manager'):
- GET /admin/reports (line 2934)

**Broad Access** (admin, releaser, manager, agent):
- GET /admin/dashboard
- GET /admin/loans

**UNPROTECTED** (NO requireRole):
- POST /admin/loans/:id/reactivate ← **CRITICAL**
- POST /admin/loans/:id/default ← **CRITICAL**

---

## Recommendations (Prioritized)

### P0: CRITICAL (Security Risk)
1. **Add authorization to unprotected endpoints** (Lines 1535, 1541)
   - Add `requireRole($user, 'admin');` before each
   - Or better: require 'admin' + 'Approve Loans' permission check

2. **Fix routing for /admin/roles** (DONE)
   - Already fixed in code

### P1: HIGH (Design Gap)
1. **Implement permission-based authorization**
   - Create `requirePermission($user, $permissionKey)` helper
   - Map all 22 permissions to their endpoints
   - Replace `requireRole()` with permission checks where granular control is needed
   - This makes the permission matrix actually matter

2. **Document User Permission Overrides**
   - Either implement UI + backend logic for per-user overrides
   - Or remove the `users.permissions` column (currently dead code)

### P2: MEDIUM (Auditability)
1. **Add audit logging to role/permission changes**
   - Call `logAudit()` when roles are updated
   - Call `logAudit()` when permissions are changed
   - Trace who modified what and when

2. **Test permission matrix enforcement**
   - Write tests verifying that denying a permission actually blocks endpoint access
   - Currently: no way to test this without changing code

### P3: LOW (Polish)
1. **Frontend: Show permission grant/deny feedback**
   - Confirm that saving permissions actually took effect
   - Optionally refresh from backend after save

2. **Frontend: Add permission-based navigation gates**
   - Currently only role-based
   - Could show/hide menu items based on individual permission keys

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| api.php | 1535-1546 | Add `requireRole()` to `/reactivate` and `/default` endpoints |
| api.php | 3125, 3159 | Add `logAudit()` calls after role/permission updates |
| api.php | 788+ | Create `requirePermission()` helper and permission→endpoint mapping |
| docs/ | NEW | Create AUTHORIZATION_CHECKLIST.md with full mapping |
| docs/ | NEW | Create PERMISSIONS_MATRIX.md with complete reference table |

---

## Testing Checklist

- [ ] `GET /admin/roles` returns all 5 roles with 22 permissions each
- [ ] `PUT /admin/roles/admin` updates name/description correctly
- [ ] `PUT /admin/roles/admin/permissions` updates permission bits correctly
- [ ] Denying "Release Loans" permission to releaser blocks POST /admin/loans/:id/release
- [ ] User with "admin" role but denied "Approve Loans" cannot POST /admin/loans/:id/approve
- [ ] POST /admin/loans/:id/reactivate requires authorization (currently doesn't)
- [ ] POST /admin/loans/:id/default requires authorization (currently doesn't)
- [ ] Role/permission changes appear in audit_logs table
- [ ] Unauthorized access attempts are logged in api-errors.log

---

## Glossary

- **Permission Key**: A string like "Release Loans" that describes a capability
- **Role**: A collection of permission keys (e.g., "Releaser" has "Release Loans" permission)
- **requireRole()**: PHP function that checks if user's role is in a list (role string only)
- **requirePermission()**: (Proposed) PHP function to check role_permissions table
- **Audit Log**: Record of who did what action (INSERT only, never deleted)
