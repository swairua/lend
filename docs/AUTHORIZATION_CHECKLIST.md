# Authorization Enforcement Checklist

**Purpose:** Prioritized implementation guide to complete authorization enforcement across all admin endpoints

**Current Status:** 19/55 endpoints properly secured (35%)

---

## Quick Reference: Priority Levels

| Priority | Severity | Deadline | Action |
|----------|----------|----------|--------|
| **P0** | CRITICAL | This week | Data integrity risk, authorization bypass |
| **P1** | HIGH | Next sprint | Multi-role configuration, audit trail gaps |
| **P2** | MEDIUM | This month | Edge cases, consistency improvements |
| **P3** | LOW | Next quarter | Nice-to-have enhancements |

---

## Phase 1: CRITICAL - Authorization Bypass Fix (P0)

**Goal:** Protect 26 unprotected endpoints  
**Effort:** 1-2 hours  
**Risk if not done:** Anyone (including borrowers) can CRUD categories, products, customers, invoices

### P0.1: Loan Configuration Endpoints

```
[ ] POST /admin/categories
    Current: NO CHECK
    Location: api.php ~line 2273
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Only admin & manager should create categories
    
[ ] PUT /admin/categories/{id}
    Current: NO CHECK
    Location: api.php ~line 2280
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Consistency with POST
    
[ ] DELETE /admin/categories/{id}
    Current: NO CHECK
    Location: api.php ~line 2299
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Deletion is sensitive operation
    
[ ] POST /admin/products
    Current: NO CHECK
    Location: api.php ~line 2302
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Product config should be manager-level
    
[ ] PUT /admin/products/{id}
    Current: NO CHECK
    Location: api.php ~line 2330
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Consistency with POST
    
[ ] DELETE /admin/products/{id}
    Current: NO CHECK
    Location: api.php ~line 2360
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Deletion is sensitive
```

### P0.2: Borrower Management Endpoints

```
[ ] POST /admin/borrowers
    Current: NO CHECK (global admin guard only, too permissive)
    Location: api.php ~line 1920
    Current behavior: agent can create borrowers (probably unintended)
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Only manager/admin should create borrower profiles
    
[ ] PUT /admin/borrowers/{id}
    Current: NO CHECK
    Location: api.php ~line 1950
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Agent can edit borrower data (profile updates OK, but not programmatic)
```

### P0.3: Customer & Invoicing Endpoints (18 total)

```
[ ] POST /admin/customers
    Current: NO CHECK
    Location: api.php ~line 3209
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Business customer creation
    
[ ] PUT /admin/customers/{id}
    Current: NO CHECK
    Location: api.php ~line 3220
    Proposed: requireRole($user, 'admin', 'manager');
    
[ ] DELETE /admin/customers/{id}
    Current: NO CHECK
    Location: api.php ~line 3235
    Proposed: requireRole($user, 'admin', 'manager');
    
[ ] POST /admin/invoice-products
    Current: NO CHECK
    Location: api.php ~line 3245
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Invoice product management
    
[ ] PUT /admin/invoice-products/{id}
    Current: NO CHECK
    Location: api.php ~line 3255
    Proposed: requireRole($user, 'admin', 'manager');
    
[ ] DELETE /admin/invoice-products/{id}
    Current: NO CHECK
    Location: api.php ~line 3270
    Proposed: requireRole($user, 'admin', 'manager');
    
[ ] POST /admin/quotations
    Current: NO CHECK
    Location: api.php ~line 3274
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    Reasoning: All office staff should create quotations
    
[ ] PUT /admin/quotations/{id}
    Current: NO CHECK
    Location: api.php ~line 3290
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    
[ ] DELETE /admin/quotations/{id}
    Current: NO CHECK
    Location: api.php ~line 3300
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Only manager can delete quotations
    
[ ] POST /admin/quotations/{id}/convert
    Current: NO CHECK
    Location: api.php ~line 3310
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    Reasoning: Convert quotation → invoice
    
[ ] POST /admin/quotations/{id}/status
    Current: NO CHECK
    Location: api.php ~line 3320
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    
[ ] POST /admin/invoices
    Current: NO CHECK
    Location: api.php ~line 3330
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    Reasoning: Office staff can create invoices
    
[ ] PUT /admin/invoices/{id}
    Current: NO CHECK
    Location: api.php ~line 3350
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    
[ ] DELETE /admin/invoices/{id}
    Current: NO CHECK
    Location: api.php ~line 3370
    Proposed: requireRole($user, 'admin', 'manager');
    Reasoning: Only manager can delete
    
[ ] POST /admin/invoices/{id}/status
    Current: NO CHECK
    Location: api.php ~line 3380
    Proposed: requireRole($user, 'admin', 'manager', 'releaser');
    Reasoning: Status updates (paid, sent, etc.)
```

**Implementation Pattern:**
```php
// Add at beginning of endpoint handler
requireRole($user, 'admin', 'manager');

// Example complete endpoint (POST /admin/categories):
if ($method === 'POST' && $path === '/admin/categories') {
    requireRole($user, 'admin', 'manager');
    
    $categoryData = json_decode(file_get_contents('php://input'), true);
    // ... rest of implementation
}
```

---

## Phase 2: HIGH - Audit Logging (P1)

**Goal:** Add audit trail to all data modification operations  
**Effort:** 2-3 hours  
**Risk if not done:** Cannot audit who created/modified business configs

### P1.1: Data Management Audit Logging

Add `logAudit()` calls to all CRUD endpoints currently missing logging:

```
[ ] POST /admin/categories
    Add after creation:
    logAudit($user['id'], 'category_created', 'category', $categoryId, [
        'name' => $categoryData['name'],
        'description' => $categoryData['description'] ?? null
    ]);
    
[ ] PUT /admin/categories/{id}
    Add after update:
    logAudit($user['id'], 'category_updated', 'category', $id, [
        'old_values' => $oldCategory,
        'new_values' => $categoryData
    ]);
    
[ ] DELETE /admin/categories/{id}
    Add before deletion (important: log before deleting):
    logAudit($user['id'], 'category_deleted', 'category', $id, [
        'name' => $category['name'],
        'reason' => 'User initiated deletion'
    ]);

[ ] POST /admin/products
    logAudit($user['id'], 'product_created', 'product', $productId, [...]);

[ ] PUT /admin/products/{id}
    logAudit($user['id'], 'product_updated', 'product', $id, [...]);

[ ] DELETE /admin/products/{id}
    logAudit($user['id'], 'product_deleted', 'product', $id, [...]);

[ ] POST /admin/borrowers
    Already logged at line 1966 ✓

[ ] PUT /admin/borrowers/{id}
    logAudit($user['id'], 'borrower_updated', 'borrower', $id, [...]);

[ ] POST /admin/customers
    logAudit($user['id'], 'customer_created', 'customer', $customerId, [...]);

[ ] PUT /admin/customers/{id}
    logAudit($user['id'], 'customer_updated', 'customer', $id, [...]);

[ ] DELETE /admin/customers/{id}
    logAudit($user['id'], 'customer_deleted', 'customer', $id, [...]);

[ ] POST /admin/invoice-products
    logAudit($user['id'], 'invoice_product_created', 'invoice_product', $productId, [...]);

[ ] PUT /admin/invoice-products/{id}
    logAudit($user['id'], 'invoice_product_updated', 'invoice_product', $id, [...]);

[ ] DELETE /admin/invoice-products/{id}
    logAudit($user['id'], 'invoice_product_deleted', 'invoice_product', $id, [...]);

[ ] POST /admin/quotations
    logAudit($user['id'], 'quotation_created', 'quotation', $quotationId, [...]);

[ ] PUT /admin/quotations/{id}
    logAudit($user['id'], 'quotation_updated', 'quotation', $id, [...]);

[ ] DELETE /admin/quotations/{id}
    logAudit($user['id'], 'quotation_deleted', 'quotation', $id, [...]);

[ ] POST /admin/invoices
    logAudit($user['id'], 'invoice_created', 'invoice', $invoiceId, [...]);

[ ] PUT /admin/invoices/{id}
    logAudit($user['id'], 'invoice_updated', 'invoice', $id, [...]);

[ ] DELETE /admin/invoices/{id}
    logAudit($user['id'], 'invoice_deleted', 'invoice', $id, [...]);
```

### P1.2: Verify Loan Operation Logging

```
[ ] Verify POST /admin/loans/{id}/approve logs (expected: line 1464)
    Current status: ✓ Already implemented
    
[ ] Verify POST /admin/loans/{id}/release logs (expected: line 1488)
    Current status: ✓ Already implemented
    
[ ] Verify POST /admin/loans/{id}/disburse logs (expected: line 1520)
    Current status: ✓ Already implemented
```

---

## Phase 3: HIGH - Permission Matrix Decision (P1)

**Goal:** Decide between enforcement vs. removal  
**Effort:** Decision + 2-4 hours implementation  
**Current State:** UI shows permissions, backend ignores them (dangerous)

### P1.3: Option A - Implement Permission Enforcement

```
[ ] Create requirePermission() function
    Location: api.php ~line 790 (after requireRole)
    
    function requirePermission($user, $permissionKey) {
      $role = one("SELECT id FROM roles WHERE key_name = ?", [$user['role']]);
      if (!$role) return error("Invalid role", 400);
      
      $perm = one(
        "SELECT granted FROM role_permissions 
         WHERE role_id = ? AND permission_key = ? AND granted = 1",
        [$role['id'], $permissionKey]
      );
      
      if (!$perm) return error("Permission denied: {$permissionKey}", 403);
    }

[ ] Create getPermissions() utility function
    Purpose: Cache user permissions for efficiency
    
    function getPermissions($user) {
      $role = one("SELECT id FROM roles WHERE key_name = ?", [$user['role']]);
      return all(
        "SELECT permission_key FROM role_permissions 
         WHERE role_id = ? AND granted = 1",
        [$role['id']]
      );
    }

[ ] Use requirePermission() in action endpoints
    Example:
    if ($method === 'POST' && $path === '/admin/loans/{id}/approve') {
        requirePermission($user, 'Approve Loans');
        // ... rest
    }

[ ] Replace requireRole() with requirePermission() where appropriate
    Assessment: 
    - Approve Loans → use requirePermission()
    - Release Loans → use requirePermission()
    - Create Loan → use requirePermission()
    - etc.
    
[ ] Add permission enforcement tests
    Test each endpoint to verify permission checks work correctly
```

**Pros:**
- Granular access control
- Matches admin UI
- Can implement per-user overrides later

**Cons:**
- Significant refactoring (replace 20+ requireRole calls)
- Database queries on every permission check (cache needed)
- Requires thorough testing

### P1.4: Option B - Remove Permission Matrix UI (Simpler)

```
[ ] Delete allPermissions array from AdminRoles.tsx
    Location: pages/AdminRoles.tsx lines 24-47
    
[ ] Delete permission matrix table from AdminRoles.tsx
    Location: pages/AdminRoles.tsx ~lines 145-190
    
[ ] Delete AdminRoles permission edit dialog
    Location: pages/AdminRoles.tsx ~lines 195-240
    
[ ] Keep role name/description editing
    Location: pages/AdminRoles.tsx ~lines 78-115 (keep this)
    
[ ] Remove updateRolePermissions() from API
    Location: utils/api.ts ~line 635
    
[ ] Remove PUT /admin/roles/{roleKey}/permissions endpoint
    Location: api.php ~line 3145
    
[ ] Drop role_permissions table from database (optional)
    Or keep table for future use, just don't expose in UI
```

**Pros:**
- Simple implementation (2-3 hours)
- No confusion about enforcement
- Roles still control access effectively

**Cons:**
- Cannot grant granular permissions (but current system doesn't need this)
- Removes flexibility if business requirements change

**Recommendation:** Option A if granular permissions are valuable; Option B if they're unnecessary overhead.

---

## Phase 4: HIGH - Multi-Role Endpoint Review (P1)

**Goal:** Document and verify intent of endpoints with multiple allowed roles  
**Effort:** 1-2 hours research + discussion  
**Current State:** Some patterns unclear

### P1.5: Review Multi-Role Endpoints

```
[ ] POST /admin/loans/{id}/approve
    Current roles: admin only
    Question: Should manager also approve? Check business process
    Current: ✓ Correct (only admin approves)
    
[ ] POST /admin/loans/{id}/release
    Current roles: admin, releaser
    Question: Why does releaser get this? Check workflow
    Expected: Yes, releaser is responsible for release step
    Current: ✓ Correct
    
[ ] POST /admin/loans/{id}/disburse
    Current roles: admin, releaser
    Question: Why does releaser disburse? Or is this M-Pesa only?
    Action: Verify if releaser should handle disbursements
    
[ ] POST /admin/mpesa/disburse
    Current roles: admin, releaser
    Question: Intentional that releaser can trigger disbursement?
    Action: Verify business process
    
[ ] POST /admin/loans/{id}/reactivate
    Current roles: admin only
    Question: Should manager reactivate loans?
    Action: Confirm this is admin-only decision
    
[ ] POST /admin/loans/{id}/default
    Current roles: admin only
    Question: Should manager mark loans as defaulted?
    Action: Confirm this is admin-only decision
```

### P1.6: Document Role Intent

Create a comment in api.php documenting the authorization model:

```php
/**
 * AUTHORIZATION MODEL
 * 
 * Admin: Full system access, all operations
 * Releaser: Can release & disburse loans, view reports (financial operations)
 * Manager: Can create/approve loans, manage borrowers & categories (operations)
 * Agent: Can view borrowers, access messages & payments (customer support)
 * Borrower: Self-service loan access (external users)
 * 
 * Key decisions:
 * - Approval (manager) → Release (releaser) → Disburse (releaser) workflow
 * - Releaser cannot approve loans (separation of duties)
 * - Agent cannot create/modify loan data (read-only customer support)
 * - Borrower cannot access admin area (separate portal)
 */
```

---

## Phase 5: MEDIUM - Edge Cases & Consistency (P2)

### P2.1: View-Only Endpoints without Data Modification

```
[ ] GET /admin/loans
    Current: Global admin check
    Assessment: Correct, reads only
    
[ ] GET /admin/categories
    Current: Global admin check
    Assessment: Correct, reads only
    
[ ] GET /admin/borrowers
    Current: Global admin check
    Assessment: Should agent see this? Check business process
    Current: ✓ Allowed for agent (correct for customer support)
    
[ ] GET /admin/repayments
    Current: Global admin check
    Assessment: Should agent see repayments? Probably yes
    Current: ✓ Allowed (correct)
```

### P2.2: Status Update Endpoints

```
[ ] POST /admin/loans/{id}/reactivate
    Current: admin only
    Assessment: Is "reactivate" a rare operation? Keep admin-only
    Status: ✓ Correct
    
[ ] POST /admin/quotations/{id}/status
    Current: NO CHECK (would use requireRole after P0)
    Proposed after P0: requireRole($user, 'admin', 'manager', 'releaser');
    Assessment: Status changes (draft→sent→etc) should be available to office staff
    Status: ✓ Correct pattern
    
[ ] POST /admin/invoices/{id}/status
    Current: NO CHECK
    Proposed after P0: requireRole($user, 'admin', 'manager', 'releaser');
    Assessment: Consistent with quotation status
    Status: ✓ Correct pattern
```

---

## Phase 6: MEDIUM - Documentation & Testing (P2)

### P2.3: Update Documentation

```
[ ] Update PERMISSIONS_MATRIX.md after implementing P0 & P1
    Sections to update:
    - "Enforcement Status by Mechanism" (should show 100% after P0)
    - "Critical Gaps" (should be empty after P0)
    - Any permission matrix decisions from P1.3
    
[ ] Create endpoint authorization reference
    Purpose: API docs showing which roles can call each endpoint
    Format: 
    ```
    # Authorization Reference
    
    ## Loan Approval
    POST /admin/loans/{id}/approve
    Required roles: admin
    Requires permission: Approve Loans
    ```
    
[ ] Add inline documentation to api.php
    Add comments above multi-role endpoints explaining why those roles
```

### P2.4: Testing & Verification

```
[ ] Create authorization test suite
    Tool: PHPUnit or similar
    Coverage:
    - Each protected endpoint returns 403 for unauthorized users
    - Each protected endpoint returns 200 for authorized users
    - Permission matrix enforced (if Option A chosen)
    - All audit logs created for CRUD operations
    
[ ] Test each role on every endpoint
    Create test matrix:
    ```
    |             | admin | releaser | manager | agent | borrower |
    |-------------|-------|----------|---------|-------|----------|
    | POST /cats  |  ✓    |    ❌    |   ✓     |  ❌   |   ❌     |
    | PUT /cats   |  ✓    |    ❌    |   ✓     |  ❌   |   ❌     |
    | DELETE /cats|  ✓    |    ❌    |   ✓     |  ❌   |   ❌     |
    ```
    
[ ] Test audit logging
    Verify logAudit() called on:
    - Create operations
    - Update operations  
    - Delete operations (especially important)
    
[ ] Verify no regressions
    Ensure existing loans can still be:
    - Created
    - Approved
    - Released
    - Disbursed
```

---

## Phase 7: LOW - Future Enhancements (P3)

### P3.1: Per-User Permission Overrides

```
[ ] Design user permission override system
    Schema: ALTER TABLE users ADD COLUMN permissions JSON;
    
    Example:
    {
      "can_approve_loans": true,
      "can_release_loans": false
    }
    
[ ] Create hasPermission() function
    function hasPermission($user, $permissionKey) {
      // Check role permissions first
      // Then check user overrides
      // User overrides take precedence
    }
    
[ ] Add UI to AdminUsers for permission overrides
    Show checkboxes for individual permission grants
    
[ ] Implement permission override checks
    Replace requirePermission() calls with hasPermission()
```

### P3.2: Role-Based Endpoint Discovery

```
[ ] Create API endpoint: GET /api/user/accessible-endpoints
    Returns list of endpoints user can access based on role/permissions
    
[ ] Use in frontend for dynamic menu
    Show/hide menu items based on actual permissions
    
[ ] Cache endpoint list
    Refresh on login and role change
```

### P3.3: Permission Audit Report

```
[ ] Create admin endpoint: GET /admin/reports/permissions
    Shows:
    - User role and permissions
    - Permission changes over time
    - Audit trail of who granted/revoked permissions
    
[ ] Add to reporting dashboard
```

---

## Implementation Order (Recommended)

### Week 1 (P0 - Critical)
```
Day 1-2: Add requireRole() to 26 unprotected endpoints
Day 2-3: Test authorization on all endpoints
Day 3: Deploy to production
```

### Week 2 (P1 - High Priority)
```
Day 1: Add audit logging to all CRUD operations
Day 1-2: Make decision on permission matrix (Option A or B)
Day 2-3: Implement chosen option
Day 3: Testing & QA
```

### Week 3 (P2 - Consistency)
```
Day 1: Review multi-role endpoints with team
Day 2: Document authorization model
Day 2-3: Create automated test suite
```

### Month 2+ (P3 - Enhancement)
```
- Implement per-user overrides if business needs
- Add endpoint discovery API
- Build permission audit reports
```

---

## Verification Checklist

Use this to verify completion of each phase:

### ✓ Phase 1 (P0) Complete When:
- [ ] All 26 endpoints have requireRole() checks
- [ ] No authorization bypasses exist
- [ ] Unauthorized users get 403 errors
- [ ] Authorized users can still access endpoints

### ✓ Phase 2 (P1) Complete When:
- [ ] All data CRUD operations logged
- [ ] Loan operations still logged (no regression)
- [ ] Permission matrix decision made (enforce or remove)
- [ ] Chosen permission approach implemented

### ✓ Phase 3 (P1) Complete When:
- [ ] Multi-role endpoints documented
- [ ] Authorization model documented in code
- [ ] No unclear role requirements remain

### ✓ Phase 4 (P2) Complete When:
- [ ] Test suite for authorization created
- [ ] All endpoints tested with all roles
- [ ] No regressions in existing workflows
- [ ] Audit logging verified

### ✓ Phase 5 (P3) Complete When:
- [ ] Per-user overrides implemented (if chosen)
- [ ] Endpoint discovery API available
- [ ] Permission reports in admin panel

---

## Rollback Plan

If issues occur after deployment:

1. **Authorization too strict:** Adjust requireRole() calls, redeploy
2. **Audit logging breaks:** Disable logAudit() call, investigate schema issues
3. **Permission matrix conflicts:** Revert to Option B (remove UI) immediately

All changes are database migrations and code changes—easily reversible.

---

## Quick Reference: Code Snippets

### Add Authorization Check
```php
// At beginning of endpoint handler
requireRole($user, 'admin', 'manager');
```

### Add Audit Log (Create)
```php
logAudit($user['id'], 'category_created', 'category', $id, [
    'name' => $data['name']
]);
```

### Add Audit Log (Update)
```php
logAudit($user['id'], 'category_updated', 'category', $id, [
    'old' => $oldData,
    'new' => $newData
]);
```

### Add Audit Log (Delete)
```php
// Log BEFORE deletion (important)
logAudit($user['id'], 'category_deleted', 'category', $id, [
    'name' => $data['name']
]);
q("DELETE FROM categories WHERE id = ?", [$id]);
```

---

## Questions to Discuss with Team

1. Should agents be able to see/create borrowers? (Current: yes)
2. Should agents be able to modify borrower data? (Current: no checks)
3. What is the releaser role's actual responsibility? (Release + Disburse?)
4. Do we need granular permissions or is role-based sufficient? (Decide on P1.3)
5. Are there any compliance requirements for audit logging?
6. Should deleted items be soft-deleted instead of hard-deleted for audit trail?
