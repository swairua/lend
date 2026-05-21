# Pay Button Inactivity Fix - Implementation Tracker

## Phase 1: Fix API Route & Type Definitions
- [x] **1.1** Add `borrower_phone` to `Loan` interface in types/api.ts
- [x] **1.2** Verify API endpoint is `/admin/mpesa/payment` (already correct)
- [x] **1.3** Verify backend retrieves phone from users table (already correct)

## Phase 2: Verify Phone Validation & Button States
- [x] **2.1** Ensure RepaymentSchedule.tsx properly loads `borrower_phone`
- [x] **2.2** Verify button shows correct state when phone is missing
- [x] **2.3** Verify button shows correct state when phone is present
- [x] **2.4** Test loan status check (button disabled if not 'active')
- [x] **2.5** Fix backend to accept `phone_number` parameter (api.php:1967, 2049)

## Phase 3: Error Handling & User Feedback
- [x] **3.1** Implement error handling for failed payments (pages/RepaymentSchedule.tsx:125-129)
- [x] **3.2** Implement success message with phone number display (pages/RepaymentSchedule.tsx:120-123)
- [x] **3.3** Implement "Sending..." state during API call (pages/RepaymentSchedule.tsx:268-272)
- [x] **3.4** Implement validation for no phone, wrong status checks (pages/RepaymentSchedule.tsx:264-265)

## Phase 4: Manual Testing & Verification
- [ ] **4.1** Login as borrower@lending.com (phone: 254772241745)
- [ ] **4.2** Navigate to `/loans/4/repayment-schedule`
- [ ] **4.3** Verify "Pay" button appears with Smartphone icon (not "Add Phone")
- [ ] **4.4** Verify button is ENABLED
- [ ] **4.5** Verify tooltip text shows loan status requirement (if applicable)
- [ ] **4.6** Click Pay button and observe:
  - Button changes to "Sending..." state
  - Success/error message appears
- [ ] **4.7** Test edge case: borrower without phone (if test user exists)

## Phase 5: Update Documentation
- [ ] **5.1** Update IMPLEMENTATION_STATUS.md to reflect completion
- [ ] **5.2** Document any remaining issues or edge cases

---

## Notes
- Backend already includes `borrower_phone` in response (api.php:920-922)
- Frontend API endpoint already correct (utils/api.ts:543)
- RepaymentSchedule component already has proper validation logic
- Main issue: `borrower_phone` not in Loan interface type definition
