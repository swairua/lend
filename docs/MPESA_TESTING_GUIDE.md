# M-Pesa Integration Testing Guide

## Overview
This guide covers testing the complete M-Pesa Daraja integration from Phase 1 (settings) through Phase 6 (production deployment).

## Phase 1: Settings Configuration Testing

### 1.1 URL Registration Ready
**Objective:** Verify all 6 callback URLs are configurable and copyable.

**Steps:**
1. Log in as admin
2. Go to Admin Settings → M-Pesa tab
3. Verify you can see all 6 separate URL fields:
   - C2B Validation URL (auto-defaults to `/api/mpesa/c2b/validate`)
   - C2B Confirmation URL (auto-defaults to `/api/mpesa/c2b/confirm`)
   - C2B Timeout URL (auto-defaults to `/api/mpesa/c2b/timeout`)
   - STK Callback URL (auto-defaults to `/api/mpesa/stk/callback`)
   - B2C Result URL (auto-defaults to `/api/mpesa/b2c/result`)
   - B2C Timeout URL (auto-defaults to `/api/mpesa/b2c/timeout`)
4. Click copy button on each URL
5. Verify URLs copy correctly to clipboard

**Expected Result:** All 6 URLs appear, default to correct endpoints, and copy buttons work.

### 1.2 Settings Validation
**Objective:** Verify M-Pesa settings require all fields when enabled.

**Steps:**
1. Enable M-Pesa toggle
2. Try to save with incomplete settings
3. Verify validation error appears

**Expected Result:** Error message: "All required fields must be filled when M-Pesa is enabled"

---

## Phase 2: C2B Callback Handler Testing

### 2.1 C2B Validation Endpoint
**Objective:** Verify validation endpoint accepts and responds correctly to Safaricom payloads.

**Test Setup:**
- Have the production backend running
- Use tools like `curl` or Postman to simulate Safaricom requests

**Test Request:**
```bash
curl -X POST https://yoursite.com/api/mpesa/c2b/validate \
  -H "Content-Type: application/xml" \
  -H "X-Safaricom-Signature: (will skip signature validation in sandbox)" \
  -d '<?xml version="1.0"?>
<trans_amount>500</trans_amount>
<msisdn>254712345678</msisdn>
<bill_ref_number>LOAN001</bill_ref_number>'
```

**Expected Response:**
```json
{"ResultCode":"0","ResultDesc":"Success"}
```

**Database Verification:**
- Check `mpesa_transactions` table for new entry with type='c2b_validation'
- Verify status='validation_result' and validation_result='accepted'

### 2.2 C2B Confirmation Endpoint
**Objective:** Verify confirmation endpoint records payments and prevents duplicates.

**Test Request 1 (First payment):**
```bash
curl -X POST https://yoursite.com/api/mpesa/c2b/confirm \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<TransID>MPESA001</TransID>
<TransRef>1</TransRef>
<TransAmount>500</TransAmount>
<MSISDN>254712345678</MSISDN>
<BillRefNumber>LOAN001</BillRefNumber>'
```

**Expected Response:**
```json
{"ResultCode":"0","ResultDesc":"Success"}
```

**Test Request 2 (Duplicate with same receipt):**
- Send same request again
- Should still return success but NOT create duplicate in database

**Database Verification:**
- Check `mpesa_transactions` table
- Verify only ONE entry exists with safaricom_receipt='MPESA001'
- Verify status='confirmed'

### 2.3 C2B Timeout Endpoint
**Objective:** Verify timeout endpoint logs cancellations.

**Test Request:**
```bash
curl -X POST https://yoursite.com/api/mpesa/c2b/timeout \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<TransID>TIMEOUT001</TransID>
<MSISDN>254712345678</MSISDN>'
```

**Database Verification:**
- Check `mpesa_transactions` table for entry with status='timeout'

---

## Phase 3: STK Push & B2C Testing

### 3.1 STK Push Initiation
**Objective:** Verify STK Push API call and callback handling.

**Prerequisites:**
- M-Pesa credentials configured in Admin Settings
- Loan with status='active' exists (ID=1 for testing)

**Test Steps:**
1. Call STK initiation endpoint:
```bash
curl -X POST https://yoursite.com/api/admin/mpesa/payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id": 1,
    "phone": "0712345678",
    "paid_amount": 0
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "checkout_request_id": "abc123def456..."
}
```

**Database Verification:**
- Check `mpesa_transactions` with checkout_request_id
- Verify status='stk_initiated'
- Verify transaction_type='stk_initiated'

### 3.2 STK Callback Success Scenario
**Objective:** Verify STK callback creates repayment on success.

**Simulate Safaricom Callback (after user enters M-Pesa PIN):**
```bash
curl -X POST https://yoursite.com/api/mpesa/stk/callback \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<Body>
  <stkCallback>
    <MerchantRequestID>16813-1590-100001</MerchantRequestID>
    <CheckoutRequestID>abc123def456</CheckoutRequestID>
    <ResultCode>0</ResultCode>
    <ResultDesc>The service request has been processed successfully.</ResultDesc>
    <CallbackMetadata>
      <Item>
        <Name>Amount</Name>
        <Value>1000</Value>
      </Item>
      <Item>
        <Name>MpesaReceiptNumber</Name>
        <Value>LIZ61H6QQ41</Value>
      </Item>
    </CallbackMetadata>
  </stkCallback>
</Body>'
```

**Database Verification:**
- `mpesa_transactions`: status='completed', safaricom_receipt='LIZ61H6QQ41'
- `repayments`: New entry created with payment_method='mpesa', amount=1000

### 3.3 STK Callback Failure Scenario
**Objective:** Verify STK callback logs failures (user cancelled).

**Simulate Failure Callback (ResultCode != 0):**
```bash
curl -X POST https://yoursite.com/api/mpesa/stk/callback \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<Body>
  <stkCallback>
    <MerchantRequestID>16813-1590-100001</MerchantRequestID>
    <CheckoutRequestID>abc123def456</CheckoutRequestID>
    <ResultCode>1032</ResultCode>
    <ResultDesc>Request cancelled by user</ResultDesc>
  </stkCallback>
</Body>'
```

**Database Verification:**
- `mpesa_transactions`: status='failed', response_code=1032
- `repayments`: NO new entry created

### 3.4 B2C Disbursement Initiation
**Objective:** Verify B2C disbursement API call.

**Prerequisites:**
- Loan with status='approved' exists (ID=2 for testing)

**Test Request:**
```bash
curl -X POST https://yoursite.com/api/admin/mpesa/disburse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id": 2,
    "phone": "0712345678"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "command_id": "xyz789abc..."
}
```

**Database Verification:**
- `mpesa_transactions`: command_id set, status='b2c_initiated'
- `loans`: status changed to 'active' (loan marked as disbursed)

### 3.5 B2C Result Callback Success
**Objective:** Verify B2C result callback marks disbursement complete.

**Simulate Safaricom B2C Result Callback:**
```bash
curl -X POST https://yoursite.com/api/mpesa/b2c/result \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<Result>
  <ResultType>0</ResultType>
  <ResultCode>0</ResultCode>
  <ResultDesc>The service request has been processed successfully.</ResultDesc>
  <OriginatorConversationID>xyz789abc</OriginatorConversationID>
  <ConversationID>3453453453</ConversationID>
  <TransactionID>LIZ61H6QQ42</TransactionID>
</Result>'
```

**Database Verification:**
- `mpesa_transactions`: status='disbursed', safaricom_receipt='LIZ61H6QQ42'
- `loans`: remains status='active'

### 3.6 B2C Result Callback Failure
**Objective:** Verify B2C failure is logged.

**Simulate Failure (ResultCode != 0):**
```bash
curl -X POST https://yoursite.com/api/mpesa/b2c/result \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?>
<Result>
  <ResultCode>1027</ResultCode>
  <ResultDesc>Unable to process your request. Please try again later.</ResultDesc>
  <OriginatorConversationID>xyz789abc</OriginatorConversationID>
</Result>'
```

**Database Verification:**
- `mpesa_transactions`: status='failed', response_code=1027

---

## Phase 4: Security Testing

### 4.1 Signature Verification
**Objective:** Verify unsigned requests are rejected.

**Test Invalid Signature:**
```bash
curl -X POST https://yoursite.com/api/mpesa/c2b/validate \
  -H "Content-Type: application/xml" \
  -H "X-Safaricom-Signature: INVALID_SIGNATURE_HERE" \
  -d '<xml>...</xml>'
```

**Expected Result:** HTTP 401, signature verification failed logged

**Test Missing Signature:**
```bash
curl -X POST https://yoursite.com/api/mpesa/c2b/validate \
  -H "Content-Type: application/xml" \
  -d '<xml>...</xml>'
```

**Expected Result:** HTTP 401, signature verification failed

### 4.2 XML Validation
**Objective:** Verify malformed XML is rejected.

**Test Malformed XML:**
```bash
curl -X POST https://yoursite.com/api/mpesa/c2b/validate \
  -H "Content-Type: application/xml" \
  -d '<xml>BROKEN'
```

**Expected Result:** HTTP 400, "Invalid XML" response

---

## Phase 5: Frontend UI Testing

### 5.1 Borrower Payment UI
**Objective:** Verify "Pay with M-Pesa" button appears and works.

**Test Steps:**
1. Log in as borrower with active loan
2. Go to loan repayment section
3. Verify MpesaPaymentUI component appears
4. Verify "Send M-Pesa Prompt" button is visible
5. Enter phone number and click button
6. Verify:
   - Button shows "Sending prompt..." (loading state)
   - Safaricom API call is made
   - Success message appears with "STK prompt sent"
   - "Prompt sent" state appears on button

**Expected Behavior:**
- STK prompt should appear on borrower's phone
- Borrower enters M-Pesa PIN
- Payment is processed
- UI shows "Payment successful!"

### 5.2 Admin Disbursement UI
**Objective:** Verify "Disburse via M-Pesa" button appears and works.

**Test Steps:**
1. Log in as admin
2. Go to Loans → Find approved loan
3. Verify MpesaDisbursementUI component appears
4. Click "Disburse now"
5. Confirm the action in popup
6. Verify:
   - Button shows "Processing..." (loading state)
   - B2C API call is made
   - Success message appears
   - Loan status changes to 'active'

### 5.3 Payment Status Polling
**Objective:** Verify UI polls for transaction status updates.

**Test Steps:**
1. Initiate STK payment
2. Wait 5+ seconds without completing on phone
3. Verify no error appears (silent polling)
4. Complete payment on phone
5. Verify success message appears within 30 seconds (6 polls × 5 sec)

---

## Phase 6: Production Deployment Checklist

### Pre-Production Validation

- [ ] All M-Pesa settings are configured with production credentials
- [ ] Consumer Key/Secret verified with Safaricom
- [ ] Business Shortcode has STK Push and B2C APIs enabled
- [ ] All 6 callback URLs registered in Safaricom Daraja console
- [ ] Callback URLs are HTTPS (not HTTP)
- [ ] Callback URLs are publicly accessible (not localhost)
- [ ] Signature verification is enabled in code
- [ ] mpesa_environment set to 'production' (NOT 'sandbox')

### Integration Testing (before launch)

- [ ] Send test C2B payment via M-Pesa paybill
- [ ] Verify validation → confirmation → repayment creation flow
- [ ] Test STK Push with real borrower phone
- [ ] Verify callback signature validation passes
- [ ] Test B2C disbursement to admin phone
- [ ] Verify all M-Pesa transactions logged in `mpesa_transactions` table
- [ ] Check error logs for any signature or parsing failures
- [ ] Test with edge cases: invalid phone, zero amount, duplicate receipt

### Post-Deployment Monitoring

**Daily:**
- [ ] Check `mpesa_transactions` table for failed transactions
- [ ] Review error logs for signature or parsing failures
- [ ] Verify repayments are created correctly

**Weekly:**
- [ ] Reconcile M-Pesa transactions against bank statements
- [ ] Test a manual STK/B2C transaction
- [ ] Review admin dashboard for disbursement trends

**Monthly:**
- [ ] Review M-Pesa transaction audit trail
- [ ] Verify Safaricom API limits not exceeded
- [ ] Check for any uncaught exceptions in logs

### Troubleshooting Guide

#### "Signature verification failed"
- Verify `X-Safaricom-Signature` header is being sent
- Ensure using correct public key for environment (sandbox vs production)
- Check Safaricom IP whitelist settings

#### "STK not appearing on phone"
- Verify phone number format (should be 0712345678 or 254712345678)
- Ensure business shortcode has STK API enabled
- Check consumer key/secret are valid (test in Safaricom sandbox first)

#### "B2C disbursement fails with code 1027"
- Verify recipient phone is registered with M-Pesa
- Check business account has sufficient float
- Ensure B2C API is enabled for business shortcode

#### "Duplicate repayment created"
- Verify M-Pesa receipt uniqueness constraint on `mpesa_transactions`
- Check database for orphaned entries (transaction_type='stk_callback' without loan_id)

---

## Sample Test Data

### Sandbox Testing Phone Numbers (Safaricom Daraja)
- `254712345678` - Standard test number
- `254720000001` - Special test for B2C
- `254708374149` - Registered M-Pesa account in sandbox

### Test Loan Data
```sql
INSERT INTO loans (borrower_id, product_id, principal_amount, total_amount, status, created_at) 
VALUES (1, 1, 50000, 55000, 'active', NOW());

INSERT INTO loans (borrower_id, product_id, principal_amount, total_amount, status, created_at) 
VALUES (1, 1, 100000, 110000, 'approved', NOW());
```

### Sample Safaricom Credentials (Sandbox)
- **Consumer Key:** (from Safaricom portal)
- **Consumer Secret:** (from Safaricom portal)
- **Business Shortcode:** 174379 (sandbox paybill)
- **Passkey:** bfb279f9aa9bdbcf158e97dd1a2c2f2f (sandbox STK passkey)
- **Environment:** sandbox

---

## Success Metrics

**Phase 1:** All 6 URLs configurable and copyable ✓  
**Phase 2:** C2B validation/confirmation/timeout endpoints respond correctly ✓  
**Phase 3:** STK and B2C API calls processed, callbacks handled ✓  
**Phase 4:** Signature verification working for all payloads ✓  
**Phase 5:** Borrower and admin UIs fully functional ✓  
**Phase 6:** Production URLs registered, transactions flow end-to-end ✓

---

## Support & Logs

**Error Log Location:** `/logs/api-errors.log`  
**Access Log Location:** `/logs/api-access.log`  
**M-Pesa Transactions:** `mysql> SELECT * FROM mpesa_transactions WHERE created_at > NOW() - INTERVAL 1 DAY;`

For issues, check logs for:
- "Signature verification failed"
- "Parse failed"
- "STK initiation failed"
- "B2C initiation failed"
- Any CURL errors from Daraja API
