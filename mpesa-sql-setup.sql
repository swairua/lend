-- ==================== M-Pesa Tables ====================

-- M-Pesa Transactions Table
-- NOTE: Schema must match api.php CREATE TABLE for queries to work.
-- Migrate existing rows if columns differ:
--   ALTER TABLE mpesa_transactions ADD COLUMN ... ;
CREATE TABLE IF NOT EXISTS `mpesa_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` int DEFAULT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `mpesa_reference` varchar(100) DEFAULT NULL,
  `safaricom_receipt` varchar(100) DEFAULT NULL,
  `checkout_request_id` varchar(100) DEFAULT NULL,
  `command_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `validation_result` varchar(100) DEFAULT NULL,
  `response_code` varchar(50) DEFAULT NULL,
  `response_message` text,
  `request_payload` text,
  `response_payload` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checkout_request_id` (`checkout_request_id`),
  KEY `idx_mpesa_reference` (`mpesa_reference`),
  KEY `idx_command_id` (`command_id`),
  KEY `fk_mpesa_loan` (`loan_id`),
  CONSTRAINT `fk_mpesa_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- SMS Logs Table
CREATE TABLE IF NOT EXISTS `sms_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `borrower_id` int NOT NULL,
  `loan_id` int DEFAULT NULL,
  `message_type` varchar(50) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `message_text` text NOT NULL,
  `sms_status` varchar(50) DEFAULT 'pending',
  `provider_reference` varchar(100) DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_sms_borrower` (`borrower_id`),
  KEY `fk_sms_loan` (`loan_id`),
  CONSTRAINT `fk_sms_borrower` FOREIGN KEY (`borrower_id`) REFERENCES `borrowers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sms_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Transaction Logs Table
CREATE TABLE IF NOT EXISTS `transaction_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` int DEFAULT NULL,
  `transaction_type` varchar(100) NOT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `details` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_trans_log_loan` (`loan_id`),
  CONSTRAINT `fk_trans_log_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ==================== M-Pesa Configuration Settings ====================
-- Insert M-Pesa default settings (these will be configured via admin UI)

INSERT INTO `settings` (`key_name`, `key_value`, `description`, `updated_at`) 
VALUES 
  ('mpesa_consumer_key', '', 'M-Pesa Daraja API Consumer Key', NOW()),
  ('mpesa_consumer_secret', '', 'M-Pesa Daraja API Consumer Secret', NOW()),
  ('mpesa_business_shortcode', '', 'M-Pesa Business Short Code (e.g., 174379)', NOW()),
  ('mpesa_passkey', '', 'M-Pesa STK Push Passkey from Safaricom', NOW()),
  ('mpesa_environment', 'sandbox', 'M-Pesa Environment: sandbox or production', NOW()),
  ('mpesa_c2b_validation_url', '', 'C2B Validation Endpoint URL', NOW()),
  ('mpesa_c2b_confirmation_url', '', 'C2B Confirmation Endpoint URL', NOW()),
  ('mpesa_c2b_timeout_url', '', 'C2B Timeout Endpoint URL', NOW()),
  ('mpesa_stk_callback_url', '', 'STK Push Callback URL', NOW()),
  ('mpesa_b2c_result_url', '', 'B2C Disbursement Result Endpoint URL', NOW()),
  ('mpesa_b2c_timeout_url', '', 'B2C Disbursement Timeout Endpoint URL', NOW()),
  ('mpesa_initiator_name', 'LendingSystem', 'B2C Initiator Name (from Daraja portal)', NOW()),
  ('mpesa_initiator_password', '', 'B2C Initiator Password (not consumer_secret)', NOW()),
  ('mpesa_enabled', 'false', 'Enable M-Pesa payments', NOW()),
  ('sms_enabled', 'false', 'Enable SMS notifications', NOW()),
  ('sms_provider', 'Africa''s Talking', 'SMS Provider (Africa''s Talking or Twilio)', NOW())
ON DUPLICATE KEY UPDATE `updated_at` = NOW();

-- ==================== Indexes for Performance ====================

-- Index for M-Pesa transaction lookups
CREATE INDEX `idx_mpesa_loan_status` ON `mpesa_transactions` (`loan_id`, `status`);
CREATE INDEX `idx_mpesa_phone_date` ON `mpesa_transactions` (`phone`, `created_at`);

-- Index for SMS logs
CREATE INDEX `idx_sms_borrower_date` ON `sms_logs` (`borrower_id`, `sent_at`);
CREATE INDEX `idx_sms_status` ON `sms_logs` (`sms_status`, `sent_at`);

-- Index for transaction logs
CREATE INDEX `idx_trans_log_type_date` ON `transaction_logs` (`transaction_type`, `created_at`);

-- ==================== Verification Queries ====================
-- Run these to verify the setup:
-- SELECT * FROM mpesa_transactions LIMIT 5;
-- SELECT * FROM sms_logs LIMIT 5;
-- SELECT * FROM transaction_logs LIMIT 5;
-- SELECT key_name, key_value FROM settings WHERE key_name LIKE 'mpesa%';
