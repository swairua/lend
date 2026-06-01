# Admin Permissions Matrix

**Generated**: June 1, 2026  
**System**: Wayrus Lending Platform

---

## Permission Keys (22 Total)

All permission keys are stored in `role_permissions` table with binary grant/deny flags:

| # | Permission Key | Description | Functional Area |
|---|---|---|---|
| 1 | Dashboard | View admin dashboard stats | Core |
| 2 | Loan Applications (view) | View pending/submitted loans | Lending |
| 3 | Approve Loans | Approve or reject loan applications | Lending |
| 4 | Release Loans | Release approved loans for disbursement | Lending |
| 5 | Disburse Loans | Disburse released loans to borrowers | Lending |
| 6 | Create Loan | Register pre-existing loans in system | Lending |
| 7 | Loan Categories | Manage loan categories | Configuration |
| 8 | Loan Products | Manage loan products/offerings | Configuration |
| 9 | Borrowers | Manage borrower profiles | People |
| 10 | Repayments | Record/manage loan repayments | Lending |
| 11 | Disbursements | View/manage disbursement records | Lending |
| 12 | Reports | View system reports & analytics | Reporting |
| 13 | Users | Manage system users & admins | Administration |
| 14 | Settings | Manage system settings | Administration |
| 15 | System Logs | View system activity logs | Monitoring |
| 16 | Customers / Invoicing | Manage customers and invoices | Invoicing |
| 17 | Admin Messages | Send/receive admin messages | Communication |
| 18 | My Loans | View own loan portfolio (borrower) | Self-Service |
| 19 | Apply for Loan | Apply for new loans (borrower) | Self-Service |
| 20 | Payments | View & manage payments | Lending |
| 21 | Profile | View/edit own profile (all roles) | Self-Service |
| 22 | Messages | Send/receive personal messages (all roles) | Communication |

---

## Role × Permission Matrix

### Admin
- **Role Key**: `admin`
- **Name**: Admin  
- **Description**: Full system access
- **System Role**: Yes
- **All 22 Permissions**: ✅ ALL GRANTED

| Perm | Granted | Perm | Granted | Perm | Granted |
|------|---------|------|---------|------|---------|
| 1. Dashboard | ✅ | 8. Loan Products | ✅ | 15. System Logs | ✅ |
| 2. Loan Appl (view) | ✅ | 9. Borrowers | ✅ | 16. Customers/Inv | ✅ |
| 3. Approve Loans | ✅ | 10. Repayments | ✅ | 17. Admin Messages | ✅ |
| 4. Release Loans | ✅ | 11. Disbursements | ✅ | 18. My Loans | ✅ |
| 5. Disburse Loans | ✅ | 12. Reports | ✅ | 19. Apply for Loan | ✅ |
| 6. Create Loan | ✅ | 13. Users | ✅ | 20. Payments | ✅ |
| 7. Loan Categories | ✅ | 14. Settings | ✅ | 21. Profile | ✅ |
| | | | | 22. Messages | ✅ |

---

### Releaser
- **Role Key**: `releaser`
- **Name**: Releaser
- **Description**: Can release loans for disbursement
- **System Role**: No
- **Granted Permissions**: 4 of 22

| # | Permission | Granted |
|---|---|---|
| 1 | Dashboard | ✅ |
| 2 | Loan Applications (view) | ✅ |
| 3 | Approve Loans | ❌ |
| 4 | Release Loans | ✅ |
| 5 | Disburse Loans | ❌ |
| 6 | Create Loan | ❌ |
| 7 | Loan Categories | ❌ |
| 8 | Loan Products | ❌ |
| 9 | Borrowers | ❌ |
| 10 | Repayments | ❌ |
| 11 | Disbursements | ❌ |
| 12 | Reports | ✅ |
| 13 | Users | ❌ |
| 14 | Settings | ❌ |
| 15 | System Logs | ❌ |
| 16 | Customers / Invoicing | ❌ |
| 17 | Admin Messages | ❌ |
| 18 | My Loans | ❌ |
| 19 | Apply for Loan | ❌ |
| 20 | Payments | ❌ |
| 21 | Profile | ❌ |
| 22 | Messages | ❌ |

---

### Manager
- **Role Key**: `manager`
- **Name**: Manager
- **Description**: Can manage loans and repayments
- **System Role**: No
- **Granted Permissions**: 7 of 22

| # | Permission | Granted |
|---|---|---|
| 1 | Dashboard | ✅ |
| 2 | Loan Applications (view) | ✅ |
| 3 | Approve Loans | ✅ |
| 4 | Release Loans | ❌ |
| 5 | Disburse Loans | ❌ |
| 6 | Create Loan | ✅ |
| 7 | Loan Categories | ❌ |
| 8 | Loan Products | ❌ |
| 9 | Borrowers | ✅ |
| 10 | Repayments | ✅ |
| 11 | Disbursements | ❌ |
| 12 | Reports | ✅ |
| 13 | Users | ❌ |
| 14 | Settings | ❌ |
| 15 | System Logs | ❌ |
| 16 | Customers / Invoicing | ❌ |
| 17 | Admin Messages | ❌ |
| 18 | My Loans | ❌ |
| 19 | Apply for Loan | ❌ |
| 20 | Payments | ❌ |
| 21 | Profile | ❌ |
| 22 | Messages | ❌ |

---

### Agent
- **Role Key**: `agent`
- **Name**: Agent
- **Description**: Can handle customer interactions
- **System Role**: No
- **Granted Permissions**: 4 of 22

| # | Permission | Granted |
|---|---|---|
| 1 | Dashboard | ✅ |
| 2 | Loan Applications (view) | ❌ |
| 3 | Approve Loans | ❌ |
| 4 | Release Loans | ❌ |
| 5 | Disburse Loans | ❌ |
| 6 | Create Loan | ❌ |
| 7 | Loan Categories | ❌ |
| 8 | Loan Products | ❌ |
| 9 | Borrowers | ✅ |
| 10 | Repayments | ❌ |
| 11 | Disbursements | ❌ |
| 12 | Reports | ❌ |
| 13 | Users | ❌ |
| 14 | Settings | ❌ |
| 15 | System Logs | ❌ |
| 16 | Customers / Invoicing | ❌ |
| 17 | Admin Messages | ❌ |
| 18 | My Loans | ❌ |
| 19 | Apply for Loan | ❌ |
| 20 | Payments | ✅ |
| 21 | Profile | ❌ |
| 22 | Messages | ✅ |

---

### Borrower
- **Role Key**: `borrower`
- **Name**: Borrower
- **Description**: Can apply for and manage loans
- **System Role**: No
- **Granted Permissions**: 6 of 22

| # | Permission | Granted |
|---|---|---|
| 1 | Dashboard | ✅ |
| 2 | Loan Applications (view) | ❌ |
| 3 | Approve Loans | ❌ |
| 4 | Release Loans | ❌ |
| 5 | Disburse Loans | ❌ |
| 6 | Create Loan | ❌ |
| 7 | Loan Categories | ❌ |
| 8 | Loan Products | ❌ |
| 9 | Borrowers | ❌ |
| 10 | Repayments | ❌ |
| 11 | Disbursements | ❌ |
| 12 | Reports | ❌ |
| 13 | Users | ❌ |
| 14 | Settings | ❌ |
| 15 | System Logs | ❌ |
| 16 | Customers / Invoicing | ❌ |
| 17 | Admin Messages | ❌ |
| 18 | My Loans | ✅ |
| 19 | Apply for Loan | ✅ |
| 20 | Payments | ✅ |
| 21 | Profile | ✅ |
| 22 | Messages | ✅ |

---

## Frontend Route Access Matrix

### Admin-Side Routes (Requires 'admin' role)
| Route | Admin | Releaser | Manager | Agent | Status |
|-------|-------|----------|---------|-------|--------|
| /admin/dashboard | ✅ | ✅ | ✅ | ✅ | Shared |
| /admin/loans | ✅ | ✅ | ✅ | ✅ | Shared |
| /admin/borrowers | ✅ | ✅ | ✅ | ✅ | Shared |
| /admin/reports | ✅ | ✅ | ✅ | ❌ | Shared |
| /admin/users | ✅ | ❌ | ❌ | ❌ | Admin-Only |
| /admin/roles | ✅ | ❌ | ❌ | ❌ | Admin-Only |
| /admin/config | ✅ | ❌ | ❌ | ❌ | Admin-Only |

### Borrower-Side Routes (Requires 'borrower' role)
| Route | Borrower | Admin | Status |
|-------|----------|-------|--------|
| /dashboard | ✅ | ❌ | Borrower-Only |
| /loans | ✅ | ❌ | Borrower-Only |
| /apply | ✅ | ❌ | Borrower-Only |
| /payments | ✅ | ❌ | Borrower-Only |
| /profile | ✅ | ❌ | Borrower-Only |
| /messages | ✅ | ❌ | Borrower-Only |

---

## API Endpoint × Permission Mapping

**Note**: Current implementation checks ROLE only, not permission keys. This table shows RECOMMENDED mapping.

| Endpoint | HTTP | Current Auth | Permission to Check | Critical? |
|----------|------|--------------|-------------------|-----------|
| /admin/roles | GET | admin | Settings | No |
| /admin/roles/:key | GET | admin | Settings | No |
| /admin/roles/:key | PUT | admin | Settings | Yes |
| /admin/roles/:key/permissions | PUT | admin | Settings | Yes |
| /admin/loans | GET | admin+ | Loan Appl (view) | No |
| /admin/loans/:id | GET | admin+ | Loan Appl (view) | No |
| /admin/loans | POST | admin+ | Create Loan | No |
| /admin/loans/:id/approve | POST | admin | Approve Loans | Yes |
| /admin/loans/:id/release | POST | admin,releaser | Release Loans | Yes |
| /admin/loans/:id/disburse | POST | admin,releaser | Disburse Loans | Yes |
| /admin/loans/:id/reactivate | POST | **NONE** ← CRITICAL | Approve Loans | Yes |
| /admin/loans/:id/default | POST | **NONE** ← CRITICAL | Approve Loans | Yes |
| /admin/borrowers | GET | admin+ | Borrowers | No |
| /admin/borrowers/:id | PUT | admin+ | Borrowers | No |
| /admin/users | GET | admin | Users | No |
| /admin/users | POST | admin | Users | Yes |
| /admin/users/:id | PUT | admin | Users | Yes |
| /admin/users/:id/toggle | POST | admin | Users | Yes |
| /admin/email-settings | GET | admin | Settings | No |
| /admin/email-settings | POST/PUT | admin | Settings | Yes |
| /admin/mpesa/payment | POST | admin | Payments | Yes |
| /admin/mpesa/disburse | POST | admin,releaser | Disburse Loans | Yes |
| /admin/customers | GET | admin | Customers/Inv | No |
| /admin/customers | POST | admin | Customers/Inv | Yes |
| /admin/customers/:id | PUT | admin | Customers/Inv | Yes |
| /admin/customers/:id | DELETE | admin | Customers/Inv | Yes |

---

## Implementation Gap Analysis

### Permissions Defined But Not Enforced
These permissions exist in the database and UI but endpoints don't check them:

1. **Approve Loans** – Endpoint only checks role='admin'
2. **Release Loans** – Endpoint accepts role='admin' or 'releaser' (not permission-based)
3. **Disburse Loans** – Same as Release
4. **Create Loan** – No endpoint found (POST /admin/loans exists, might not have auth)
5. **Loan Categories** – No dedicated endpoint found
6. **Loan Products** – No dedicated endpoint found
7. **Settings** – Exists for email settings but not role_permissions aware

### Permissions Not Defined But Needed
These actions exist in API but have no corresponding permission key:

1. **Loan Reactivate** – Critical action with NO PERMISSION and NO AUTH CHECK
2. **Loan Default** – Critical action with NO PERMISSION and NO AUTH CHECK
3. **Upload Logo** – Has requireRole but no permission key
4. **View System Logs** – Has permission key but enforcement unclear

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Permission Keys | 22 |
| Total Roles | 5 |
| Total Admin Users | 1 (seeded) |
| API Endpoints Checked | 25+ |
| Endpoints with roleRole checks | 18 |
| Endpoints with NO auth checks | 2 ← **CRITICAL** |
| Permission Matrix Cells (5×22) | 110 |
| Cells where permission is granted | 59 |
| Endpoints actually enforcing permissions | 0 ← **GAP** |

---

## Recommendations

### Short Term (Security)
1. Add `requireRole()` to /admin/loans/:id/reactivate and /default endpoints
2. Fix /admin/roles routing (DONE)

### Medium Term (Design)
1. Create `requirePermission()` helper
2. Replace role-string checks with permission key checks
3. Document permission→endpoint mapping
4. Test that permission matrix actually controls access

### Long Term (Refinement)
1. Implement per-user permission overrides (optional)
2. Add fine-grained permission checks to frontend navigation
3. Add permission-based audit logging
4. Consider role hierarchies (admin supercedes others)
