# Permissions Matrix Documentation

**Purpose:** Complete mapping of role permissions across the system (UI, API, database)

---

## 1. Permission Keys & Definitions

All 22 permission keys as defined in AdminRoles.tsx and `role_permissions` table:

| # | Permission Key | Category | Purpose | Currently Enforced? |
|---|---|---|---|---|
| 1 | Dashboard | Access | View main dashboard | ✓ (via role check) |
| 2 | Loan Applications (view) | Loans | View submitted loan applications | ✓ (via role check) |
| 3 | Approve Loans | Loans | Approve pending loan applications | ✓ (via requireRole) |
| 4 | Release Loans | Loans | Release approved loans for disbursement | ✓ (via requireRole) |
| 5 | Disburse Loans | Loans | Disburse funds to borrower | ✓ (via requireRole) |
| 6 | Create Loan | Loans | Create loan applications manually | ⚠️ (no check, blocked by nav) |
| 7 | Loan Categories | Config | Manage loan categories | ❌ (no check) |
| 8 | Loan Products | Config | Manage loan products | ❌ (no check) |
| 9 | Borrowers | Users | View/manage borrower profiles | ❌ (no check) |
| 10 | Repayments | Loans | View/manage loan repayments | ⚠️ (nav only) |
| 11 | Disbursements | Loans | View loan disbursement records | ⚠️ (nav only) |
| 12 | Reports | Analytics | View loan/business reports | ⚠️ (nav only) |
| 13 | Users | Admin | Manage user accounts & roles | ✓ (via requireRole) |
| 14 | Settings | Admin | Configure system settings | ✓ (via requireRole) |
| 15 | System Logs | Admin | View system audit logs | ⚠️ (nav only) |
| 16 | Customers / Invoicing | Billing | Manage customers and invoices | ❌ (no check) |
| 17 | Admin Messages | Communication | Send system messages | ⚠️ (nav only) |
| 18 | My Loans | Access | Borrower: view own loans | ✓ (borrower-specific) |
| 19 | Apply for Loan | Access | Borrower: submit loan applications | ✓ (borrower-specific) |
| 20 | Payments | Access | View payment history | ✓ (via role check) |
| 21 | Profile | Access | View/edit user profile | ✓ (borrower-specific) |
| 22 | Messages | Communication | View/send messages | ✓ (via role check) |

**Legend:**
- ✓ = Enforced (backend checks)
- ⚠️ = Partially enforced (nav gate or role check)
- ❌ = Not enforced (UI only)

---

## 2. Role Permission Matrix (Database Schema)

### 2.1 Admin Role

**Description:** Full system access  
**Can perform:** All operations  
**Permission count:** 22/22

```
✓ Dashboard
✓ Loan Applications (view)
✓ Approve Loans
✓ Release Loans
✓ Disburse Loans
✓ Create Loan
✓ Loan Categories
✓ Loan Products
✓ Borrowers
✓ Repayments
✓ Disbursements
✓ Reports
✓ Users
✓ Settings
✓ System Logs
✓ Customers / Invoicing
✓ Admin Messages
✗ My Loans
✗ Apply for Loan
✓ Payments
✗ Profile
✓ Messages
```

### 2.2 Releaser Role

**Description:** Approve and release loans for disbursement  
**Intended use:** Senior loan officer responsible for loan release workflow  
**Permission count:** 4/22

```
✓ Dashboard
✓ Loan Applications (view)
✗ Approve Loans
✓ Release Loans
✓ Disburse Loans
✗ Create Loan
✗ Loan Categories
✗ Loan Products
✗ Borrowers
✗ Repayments
✓ Disbursements
✓ Reports
✗ Users
✗ Settings
✗ System Logs
✗ Customers / Invoicing
✗ Admin Messages
✗ My Loans
✗ Apply for Loan
✗ Payments
✗ Profile
✗ Messages
```

### 2.3 Manager Role

**Description:** Full loan management and operational oversight  
**Intended use:** Operations manager overseeing loan portfolio  
**Permission count:** 7/22

```
✓ Dashboard
✓ Loan Applications (view)
✓ Approve Loans
✗ Release Loans
✗ Disburse Loans
✓ Create Loan
✗ Loan Categories
✗ Loan Products
✓ Borrowers
✓ Repayments
✗ Disbursements
✓ Reports
✗ Users
✗ Settings
✗ System Logs
✗ Customers / Invoicing
✓ Admin Messages
✗ My Loans
✗ Apply for Loan
✗ Payments
✗ Profile
✗ Messages
```

### 2.4 Agent Role

**Description:** Customer-facing loan officer  
**Intended use:** Front-line staff interacting with borrowers  
**Permission count:** 4/22

```
✓ Dashboard
✗ Loan Applications (view)
✗ Approve Loans
✗ Release Loans
✗ Disburse Loans
✗ Create Loan
✗ Loan Categories
✗ Loan Products
✓ Borrowers
✗ Repayments
✗ Disbursements
✗ Reports
✗ Users
✗ Settings
✗ System Logs
✗ Customers / Invoicing
✗ Admin Messages
✗ My Loans
✗ Apply for Loan
✓ Payments
✗ Profile
✓ Messages
```

### 2.5 Borrower Role

**Description:** Loan applicant with self-service access  
**Intended use:** External customer applying for and managing loans  
**Permission count:** 6/22

```
✓ Dashboard
✗ Loan Applications (view)
✗ Approve Loans
✗ Release Loans
✗ Disburse Loans
✗ Create Loan
✗ Loan Categories
✗ Loan Products
✗ Borrowers
✗ Repayments
✗ Disbursements
✗ Reports
✗ Users
✗ Settings
✗ System Logs
✗ Customers / Invoicing
✗ Admin Messages
✓ My Loans
✓ Apply for Loan
✓ Payments
✓ Profile
✓ Messages
```

---

## 3. API Endpoint Authorization Matrix

### 3.1 Dashboard & Navigation

| Endpoint | GET | POST | PUT | DELETE | Current Check | Required Roles |
|----------|-----|------|-----|--------|---------------|----------------|
| `/admin` | ✓ | - | - | - | `requireRole($user, 'admin','releaser','manager','agent')` | admin, releaser, manager, agent |
| `/dashboard` | ✓ | - | - | - | Auth check only | Any authenticated |

### 3.2 Loan Management

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/loans` | ✓ | - | - | - | Global admin check | ✓ Enforced |
| `GET /admin/loans/{id}` | ✓ | - | - | - | Global admin check | ✓ Enforced |
| `POST /admin/loans/{id}/approve` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `POST /admin/loans/{id}/release` | - | ✓ | - | - | `requireRole($user, 'admin', 'releaser')` | ✓ Enforced |
| `POST /admin/loans/{id}/disburse` | - | ✓ | - | - | `requireRole($user, 'admin', 'releaser')` | ✓ Enforced |
| `POST /admin/loans/{id}/reactivate` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `POST /admin/loans/{id}/default` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |

### 3.3 Loan Configuration (Categories & Products)

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/categories` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/categories` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/categories/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `DELETE /admin/categories/{id}` | - | - | - | ✓ | **NONE** | ❌ Missing |
| `GET /admin/products` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/products` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/products/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `DELETE /admin/products/{id}` | - | - | - | ✓ | **NONE** | ❌ Missing |

**Status:** Categories and products can be created/edited/deleted by any admin-namespace user (admin, releaser, manager, agent) due to global guard at line 1313, but no granular role check exists. Should add `requireRole($user, 'admin', 'manager')` to POST/PUT/DELETE.

### 3.4 Borrower Management

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/borrowers` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/borrowers` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/borrowers/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `GET /admin/borrowers/{id}` | ✓ | - | - | - | Global admin check | ⚠️ Partial |

**Status:** Borrowers can be created/edited by anyone with admin role (including agents). Intended behavior unclear—agents should probably NOT create borrowers. Add `requireRole($user, 'admin', 'manager')` to POST/PUT.

### 3.5 Customer & Invoicing Management

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/customers` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/customers` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/customers/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `DELETE /admin/customers/{id}` | - | - | - | ✓ | **NONE** | ❌ Missing |
| `GET /admin/invoice-products` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/invoice-products` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/invoice-products/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `DELETE /admin/invoice-products/{id}` | - | - | - | ✓ | **NONE** | ❌ Missing |
| `GET /admin/quotations` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/quotations` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/quotations/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `DELETE /admin/quotations/{id}` | - | - | - | ✓ | **NONE** | ❌ Missing |
| `POST /admin/quotations/{id}/convert` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `POST /admin/quotations/{id}/status` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `GET /admin/invoices` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/invoices` | - | ✓ | - | - | **NONE** | ❌ Missing |
| `PUT /admin/invoices/{id}` | - | - | ✓ | - | **NONE** | ❌ Missing |
| `DELETE /admin/invoices/{id}` | - | - | - | ✓ | **NONE** | ❌ Missing |
| `POST /admin/invoices/{id}/status` | - | ✓ | - | - | **NONE** | ❌ Missing |

**Status:** All 18 customer/invoicing endpoints lack specific authorization. Global admin check allows admin, releaser, manager, agent. Should be restricted to `requireRole($user, 'admin', 'manager')`.

### 3.6 Financial Operations

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/repayments` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `POST /admin/mpesa/payment` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `POST /admin/mpesa/disburse` | - | ✓ | - | - | `requireRole($user, 'admin', 'releaser')` | ✓ Enforced |
| `GET /admin/disbursements` | ✓ | - | - | - | Global admin check | ⚠️ Partial |

### 3.7 Admin Management

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/users` | ✓ | - | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `POST /admin/users` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `PUT /admin/users/{id}` | - | - | ✓ | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `DELETE /admin/users/{id}` | - | - | - | ✓ | `requireRole($user, 'admin')` | ✓ Enforced |
| `GET /admin/roles` | ✓ | - | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `PUT /admin/roles/{roleKey}` | - | - | ✓ | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `PUT /admin/roles/{roleKey}/permissions` | - | - | ✓ | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `GET /admin/settings` | ✓ | - | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `PUT /admin/settings` | - | - | ✓ | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `POST /admin/email-settings` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |
| `POST /admin/upload-logo` | - | ✓ | - | - | `requireRole($user, 'admin')` | ✓ Enforced |

**Status:** All admin management endpoints properly protected with explicit role checks. ✓ Compliant.

### 3.8 Logging & Reporting

| Endpoint | GET | POST | PUT | DELETE | Current Check | Enforcement |
|----------|-----|------|-----|--------|---------------|-------------|
| `GET /admin/logs` | ✓ | - | - | - | Global admin check | ⚠️ Partial |
| `GET /admin/reports` | ✓ | - | - | - | Global admin check | ⚠️ Partial |

---

## 4. Frontend Navigation Access Control

Mapped from `navigationConfig.ts`:

### 4.1 Borrower Portal

| Page | Route | Roles | Backend Enforcement |
|------|-------|-------|-------------------|
| Dashboard | `/dashboard` | borrower | ✓ Auth check |
| My Loans | `/loans` | borrower | ✓ Auth check |
| Apply for Loan | `/apply` | borrower | ✓ Auth check |
| Payments | `/payments` | borrower | ✓ Auth check |
| Profile | `/profile` | borrower | ✓ Auth check |
| Messages | `/messages` | borrower | ✓ Auth check |

### 4.2 Admin Portal - Common

| Page | Route | Roles | Backend Enforcement |
|------|-------|-------|-------------------|
| Dashboard | `/admin` | admin, releaser, manager, agent | ✓ Global check (line 1313) |
| Loan Applications | `/admin/loans` | admin, releaser, manager, agent | ✓ Global check |
| Reports | `/admin/reports` | admin, manager | ⚠️ Global check only |
| System Logs | `/admin/logs` | admin, manager | ⚠️ Global check only |
| Admin Messages | `/admin/messages` | admin, manager | ⚠️ Global check only |

### 4.3 Admin Portal - Loan Management

| Page | Route | Roles | Backend Enforcement |
|------|-------|-------|-------------------|
| Create Loan | `/admin/loans/create` | admin, manager | ⚠️ Route restricted, no API check |
| Borrowers | `/admin/borrowers` | admin, manager, agent | ❌ No API check |
| Categories | `/admin/categories` | admin, manager | ❌ No API check |
| Products | `/admin/products` | admin, manager | ❌ No API check |
| Repayments | `/admin/repayments` | admin, manager | ⚠️ Global check only |
| Disbursements | `/admin/disbursements` | admin, releaser | ⚠️ Global check only |

### 4.4 Admin Portal - Financial & Invoicing

| Page | Route | Roles | Backend Enforcement |
|------|-------|-------|-------------------|
| Customers | `/admin/customers` | admin, manager, releaser, agent | ❌ No API check |
| Invoice Products | `/admin/invoice-products` | admin, manager, releaser, agent | ❌ No API check |
| Quotations | `/admin/quotations` | admin, manager, releaser, agent | ❌ No API check |
| Invoices | `/admin/invoices` | admin, manager, releaser, agent | ❌ No API check |

### 4.5 Admin Portal - System Management

| Page | Route | Roles | Backend Enforcement |
|------|-------|-------|-------------------|
| Users | `/admin/users` | admin | ✓ Explicit check |
| Roles | `/admin/roles` | admin | ✓ Explicit check |
| Settings | `/admin/config` | admin | ✓ Explicit check |

---

## 5. Permission Enforcement Completeness Analysis

### 5.1 Summary by Category

| Category | Total Endpoints | Fully Enforced | Partially Enforced | Missing Enforcement | % Complete |
|----------|---|---|---|---|---|
| Dashboard & Navigation | 2 | 2 | 0 | 0 | 100% |
| Loan Management | 7 | 5 | 2 | 0 | 71% |
| Configuration (Categories, Products) | 8 | 0 | 2 | 6 | 25% |
| Borrower Management | 4 | 0 | 2 | 2 | 50% |
| Customer & Invoicing (18 endpoints) | 18 | 0 | 0 | 18 | 0% |
| Financial Operations | 4 | 2 | 2 | 0 | 50% |
| Admin Management | 10 | 10 | 0 | 0 | 100% |
| Logging & Reporting | 2 | 0 | 2 | 0 | 0% |
| **TOTAL** | **55** | **19** | **10** | **26** | **55%** |

### 5.2 Enforcement Status by Mechanism

| Mechanism | Endpoints | Status |
|-----------|-----------|--------|
| Explicit `requireRole()` check | 13 | ✓ Secure |
| Global admin namespace guard (line 1313) | 34 | ⚠️ Overly permissive |
| Frontend route guard only (no API check) | 5 | ❌ Bypass-able |
| No authorization (unauthenticated) | 3 | ✓ OK (webhooks) |
| **MISSING CHECK** | **26** | **❌ CRITICAL** |

### 5.3 Critical Gaps

**26 endpoints with missing authorization checks:**

```
❌ CATEGORY CRUD (3):
  POST /admin/categories
  PUT /admin/categories/{id}
  DELETE /admin/categories/{id}

❌ PRODUCT CRUD (3):
  POST /admin/products
  PUT /admin/products/{id}
  DELETE /admin/products/{id}

❌ BORROWER CRUD (2):
  POST /admin/borrowers
  PUT /admin/borrowers/{id}

❌ CUSTOMER CRUD (3):
  POST /admin/customers
  PUT /admin/customers/{id}
  DELETE /admin/customers/{id}

❌ INVOICE PRODUCT CRUD (3):
  POST /admin/invoice-products
  PUT /admin/invoice-products/{id}
  DELETE /admin/invoice-products/{id}

❌ QUOTATION CRUD (5):
  POST /admin/quotations
  PUT /admin/quotations/{id}
  DELETE /admin/quotations/{id}
  POST /admin/quotations/{id}/convert
  POST /admin/quotations/{id}/status

❌ INVOICE CRUD (5):
  POST /admin/invoices
  PUT /admin/invoices/{id}
  DELETE /admin/invoices/{id}
  POST /admin/invoices/{id}/status
```

---

## 6. Recommended Role-Permission Mapping

Based on business logic and navigation configuration:

### 6.1 Agent Role - Recommended Expansion

**Current:** 4/22 permissions  
**Proposed:** 5/22 permissions

```diff
  Dashboard
- Loan Applications (view)     // Probably should have this
  Approve Loans
  Release Loans
  Disburse Loans
  Create Loan
  Loan Categories
  Loan Products
  Borrowers
  Repayments
  Disbursements
  Reports
  Users
  Settings
  System Logs
  Customers / Invoicing
  Admin Messages
  My Loans
  Apply for Loan
+ Payments                    // For collection operations
  Profile
  Messages
```

### 6.2 Releaser Role - Review Needed

**Current:** 4/22 permissions  
**Questions:**
- Should releaser have "Loan Applications (view)"? → Probably YES
- Should releaser have "Approve Loans"? → Probably NO (approval is manager's role)
- Can releaser edit loan details? → Unclear

### 6.3 Manager Role - Complete & Aligned

**Current:** 7/22 permissions  
**Assessment:** Well-balanced, appears intentional ✓

---

## 7. Audit Recommendations

1. **Decide on permission matrix strategy:**
   - Enforce all 22 permissions on backend (significant work)
   - Or: Remove permission matrix UI, use role-based only (simpler)
   - Current state (UI but no enforcement) is worst option

2. **Add authorization to 26 missing endpoints**
3. **Review and document intent for multi-role endpoints**
4. **Add audit logging to all data modification endpoints**
5. **Consider per-user permission overrides** (future enhancement)
