# Lending App Setup Checklist

## ✅ Database Tables - All Complete

### Core Tables (Already in your database)
- ✅ users
- ✅ borrowers
- ✅ loans
- ✅ loan_categories
- ✅ loan_products
- ✅ repayments
- ✅ documents
- ✅ messages
- ✅ settings
- ✅ tokens
- ✅ audit_logs

### M-Pesa/Payment Tables (Just Added)
- ✅ mpesa_transactions
- ✅ sms_logs
- ✅ transaction_logs
- ✅ admin_settings (for SMTP & M-Pesa config)

### Optional Tables (Already exist but not yet used)
- ✅ pdf_documents (for PDF generation)

---

## 🔧 Required SQL for admin_settings Configuration

Insert these default M-Pesa settings:

```sql
INSERT INTO `admin_settings` (`setting_key`, `setting_value`) VALUES
('mpesa_consumer_key', ''),
('mpesa_consumer_secret', ''),
('mpesa_business_shortcode', ''),
('mpesa_passkey', ''),
('mpesa_environment', 'sandbox'),
('mpesa_c2b_validation_url', ''),
('mpesa_c2b_confirmation_url', ''),
('mpesa_c2b_timeout_url', ''),
('mpesa_stk_callback_url', ''),
('mpesa_b2c_result_url', ''),
('mpesa_b2c_timeout_url', ''),
('mpesa_enabled', 'false'),
('smtp_host', ''),
('smtp_port', ''),
('smtp_user', ''),
('smtp_pass', ''),
('smtp_from', ''),
('sms_enabled', 'false'),
('sms_provider', 'Africa''s Talking')
ON DUPLICATE KEY UPDATE setting_key=setting_key;
```

---

## ⚙️ System Configuration via Admin UI

### M-Pesa Configuration
Navigate to **Admin → Settings → M-Pesa** and configure:

1. **Environment**: sandbox (testing) or production
2. **Consumer Key**: From Safaricom Daraja API
3. **Consumer Secret**: From Safaricom Daraja API
4. **Business Shortcode**: e.g., 174379
5. **Passkey**: From Safaricom for STK Push
6. **Callback URLs**: Configure all webhook endpoints
   - C2B Validation URL
   - C2B Confirmation URL
   - C2B Timeout URL
   - STK Push Callback URL
   - B2C Result URL
   - B2C Timeout URL

### Email Configuration
Navigate to **Admin → Settings → Email** and configure:

1. **SMTP Host**: e.g., smtp.gmail.com
2. **SMTP Port**: 587 (TLS) or 465 (SSL)
3. **Username**: Your email address
4. **Password**: SMTP password or app-specific password
5. **From Address**: e.g., noreply@lendingapp.com

After configuring, click **Test Email Settings** to verify connectivity.

---

## 🚀 Features & Status

### Authentication & Users
- ✅ Admin login
- ✅ Borrower login
- ✅ Borrower registration
- ✅ Secure token storage

### Loan Management
- ✅ Loan application creation
- ✅ Loan approval workflow
- ✅ Loan disbursement
- ✅ Repayment scheduling
- ✅ Loan status tracking

### M-Pesa Payments
- ✅ STK Push (C2B) - Borrowers pay via M-Pesa
- ✅ B2C Disbursement - Disburse loans to borrower M-Pesa
- ✅ Transaction tracking
- ✅ Webhook callback handling
- ⚠️ **Not yet configured** - Need Safaricom API credentials

### SMS Notifications
- ✅ SMS log table created
- ⚠️ **Not yet configured** - Need Africa's Talking or Twilio API credentials

### Admin Dashboard
- ✅ Total loans stats
- ✅ Active loans tracking
- ✅ Quick statistics
- ✅ Loan status distribution
- ✅ Recent activity feed

### Email Notifications
- ✅ Email configuration UI
- ⚠️ **Not yet tested** - Configure SMTP settings

---

## 📋 Quick Start

### 1. Run the M-Pesa Tables SQL (✅ Already done)
The mpesa_transactions, sms_logs, and transaction_logs tables have been created.

### 2. Insert admin_settings defaults (⚠️ TODO)
Run the SQL above to initialize admin_settings table with default keys.

### 3. Configure M-Pesa (⚠️ TODO)
- Get API credentials from Safaricom Daraja Portal
- Enter credentials in **Admin → Settings → M-Pesa**
- Test the connection

### 4. Configure Email (⚠️ TODO)
- Set up SMTP account (Gmail, SendGrid, etc.)
- Enter credentials in **Admin → Settings → Email**
- Test the connection

### 5. Configure SMS (Optional)
- Sign up for Africa's Talking or Twilio
- Enter API credentials in **Admin → Settings**
- Enable SMS notifications

---

## 🔍 Verification

After setup, verify everything works:

1. **Dashboard**: Admin should see real loan data
2. **M-Pesa**: Test payment initiation in sandbox mode
3. **Email**: Send test email from settings
4. **SMS**: Send test SMS (if enabled)
5. **Loans**: Create a test loan and process it

---

## 📝 Notes

- Demo credentials still work: admin@lending.com / Pass123
- No demo loans are auto-seeded anymore (data persists on restart)
- All configuration is stored in database tables (admin_settings)
- M-Pesa defaults to **sandbox** environment for testing
