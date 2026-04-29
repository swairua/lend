-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Apr 27, 2026 at 02:49 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lending_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `borrowers`
--

CREATE TABLE `borrowers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `national_id` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `business_type` varchar(100) DEFAULT NULL,
  `monthly_income` decimal(15,2) DEFAULT NULL,
  `credit_score` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `borrowers`
--

INSERT INTO `borrowers` (`id`, `user_id`, `national_id`, `address`, `business_name`, `business_type`, `monthly_income`, `credit_score`, `created_at`, `updated_at`) VALUES
(1, 2, NULL, NULL, NULL, NULL, NULL, 750, '2026-04-25 04:41:29', '2026-04-25 04:41:29');

-- --------------------------------------------------------

--
-- Table structure for table `loans`
--

CREATE TABLE `loans` (
  `id` int(11) NOT NULL,
  `borrower_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `principal_amount` decimal(15,2) NOT NULL,
  `interest_amount` decimal(15,2) NOT NULL,
  `processing_fee` decimal(15,2) DEFAULT 0.00,
  `asset_transfer_fee` decimal(15,2) DEFAULT 0.00,
  `tracking_system_fee` decimal(15,2) DEFAULT 0.00,
  `late_fee_rate` decimal(5,2) DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL,
  `term_months` int(11) NOT NULL,
  `status` enum('pending','approved','rejected','active','completed','defaulted','written_off') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `disbursed_at` timestamp NULL DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `security_details` text DEFAULT NULL,
  `guarantor_details` text DEFAULT NULL,
  `postdated_check_no` varchar(100) DEFAULT NULL,
  `logbook_no` varchar(100) DEFAULT NULL,
  `asset_description` varchar(255) DEFAULT NULL,
  `asset_value` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loans`
--

INSERT INTO `loans` (`id`, `borrower_id`, `product_id`, `principal_amount`, `interest_amount`, `processing_fee`, `asset_transfer_fee`, `tracking_system_fee`, `late_fee_rate`, `total_amount`, `term_months`, `status`, `approved_by`, `approved_at`, `disbursed_at`, `due_date`, `security_details`, `guarantor_details`, `postdated_check_no`, `logbook_no`, `asset_description`, `asset_value`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1343000.00, 261885.00, 53720.00, 7000.00, 25000.00, 2.50, 1690605.00, 12, 'rejected', 1, NULL, NULL, '2027-04-25', 'Vehicle', 'SImon', NULL, '6789', '1990', 2000000.00, '2026-04-25 04:35:20', '2026-04-25 04:51:20'),
(2, 1, 4, 52780.00, 8972.60, 1583.40, 0.00, 0.00, 2.50, 63336.00, 17, 'pending', NULL, NULL, NULL, '2027-09-27', NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-27 00:20:45', '2026-04-27 00:20:45');

-- --------------------------------------------------------

--
-- Table structure for table `loan_categories`
--

CREATE TABLE `loan_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loan_categories`
--

INSERT INTO `loan_categories` (`id`, `name`, `code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Asset Finance', 'ASSET', 'Asset purchase/financing with logbook transfer', 1, '2026-04-24 12:00:24', '2026-04-27 00:45:58'),
(2, 'Micro Finance', 'MICRO', 'Small loans against salary or security', 1, '2026-04-24 12:00:24', '2026-04-27 00:46:01'),
(3, 'LPOS Finance', 'LPOS', 'Loan against point of sale equipment', 1, '2026-04-24 12:00:24', '2026-04-27 00:46:00');

-- --------------------------------------------------------

--
-- Table structure for table `loan_products`
--

CREATE TABLE `loan_products` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `min_amount` decimal(15,2) NOT NULL,
  `max_amount` decimal(15,2) NOT NULL,
  `min_term_months` int(11) NOT NULL,
  `max_term_months` int(11) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `interest_type` enum('flat','reducing') DEFAULT 'flat',
  `processing_fee_percent` decimal(5,2) DEFAULT 0.00,
  `asset_transfer_fee` decimal(15,2) DEFAULT 0.00,
  `tracking_system_fee` decimal(15,2) DEFAULT 0.00,
  `late_fee_percent` decimal(5,2) DEFAULT 0.00,
  `requires_security` tinyint(1) DEFAULT 0,
  `requires_guarantor` tinyint(1) DEFAULT 0,
  `requires_postdated_checks` tinyint(1) DEFAULT 0,
  `min_income` decimal(15,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loan_products`
--

INSERT INTO `loan_products` (`id`, `category_id`, `name`, `description`, `min_amount`, `max_amount`, `min_term_months`, `max_term_months`, `interest_rate`, `interest_type`, `processing_fee_percent`, `asset_transfer_fee`, `tracking_system_fee`, `late_fee_percent`, `requires_security`, `requires_guarantor`, `requires_postdated_checks`, `min_income`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Asset Finance', 'Finance for vehicle/asset purchase with logbook transfer', 50000.00, 5000000.00, 6, 60, 19.50, 'reducing', 4.00, 7000.00, 25000.00, 2.50, 1, 1, 0, 50000.00, 1, '2026-04-24 12:00:25', '2026-04-24 12:00:25'),
(2, 2, 'Micro Loan - Small', 'Quick small loan up to 10k', 5000.00, 10000.00, 1, 2, 15.00, 'flat', 4.00, 0.00, 0.00, 2.50, 1, 0, 1, 10000.00, 1, '2026-04-24 12:00:25', '2026-04-24 12:00:25'),
(3, 2, 'Micro Loan - Medium', 'Quick loan up to 50k', 10001.00, 50000.00, 1, 3, 15.00, 'flat', 4.00, 0.00, 0.00, 2.50, 1, 0, 1, 20000.00, 1, '2026-04-24 12:00:25', '2026-04-24 12:00:25'),
(4, 3, 'LPOS Finance', 'Finance for LPOS equipment', 10000.00, 100000.00, 3, 24, 12.00, 'flat', 3.00, 0.00, 0.00, 2.50, 1, 0, 0, 15000.00, 1, '2026-04-24 12:00:25', '2026-04-24 12:00:25');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `loan_id` int(11) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('system','loan_update','payment','reminder','general','approval','disbursement','rejection') DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `sender_id`, `recipient_id`, `loan_id`, `subject`, `message`, `type`, `is_read`, `created_at`) VALUES
(1, 2, 1, 1, 'New Loan Application', 'A new loan application #1 has been submitted by 2. Amount: KES 1343000, Term: 12 months.', 'loan_update', 1, '2026-04-25 04:35:20'),
(2, 1, 2, 1, 'Loan Rejected', 'Your loan application #1 has been rejected. Please contact support for more information.', 'rejection', 0, '2026-04-25 04:51:20'),
(3, 2, 1, 2, 'New Loan Application', 'A new loan application #2 has been submitted by 2. Amount: KES 52780, Term: 17 months.', 'loan_update', 0, '2026-04-27 00:20:45');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `loan_id` int(11) NOT NULL,
  `type` enum('disbursement','repayment','refund','processing_fee','asset_transfer','tracking_system') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `method` enum('cash','mpesa','bank','cheque','other') DEFAULT 'mpesa',
  `reference` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'completed',
  `processed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `loan_id`, `type`, `amount`, `method`, `reference`, `status`, `processed_at`, `created_at`) VALUES
(1, 1, 'processing_fee', 53720.00, 'bank', NULL, 'pending', '2026-04-25 04:35:20', '2026-04-25 04:35:20'),
(2, 2, 'processing_fee', 1583.40, 'bank', NULL, 'pending', '2026-04-27 00:20:45', '2026-04-27 00:20:45');

-- --------------------------------------------------------

--
-- Table structure for table `repayments`
--

CREATE TABLE `repayments` (
  `id` int(11) NOT NULL,
  `loan_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `principal_paid` decimal(15,2) NOT NULL,
  `interest_paid` decimal(15,2) NOT NULL,
  `penalty_paid` decimal(15,2) DEFAULT 0.00,
  `late_fee_paid` decimal(15,2) DEFAULT 0.00,
  `payment_method` enum('cash','mpesa','bank','cheque','other') DEFAULT 'mpesa',
  `reference_number` varchar(100) DEFAULT NULL,
  `paid_by` int(11) DEFAULT NULL,
  `paid_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `permissions`, `created_at`) VALUES
(1, 'admin', 'Full system access', '[\"*\"]', '2026-04-24 12:00:25'),
(2, 'manager', 'Can approve loans and view reports', '[\"view_loans\",\"approve_loans\",\"disburse_loans\",\"view_repayments\",\"view_borrowers\",\"view_reports\"]', '2026-04-24 12:00:25'),
(3, 'agent', 'Can view loans and create applications', '[\"view_loans\",\"create_loans\",\"view_borrowers\"]', '2026-04-24 12:00:25'),
(4, 'borrower', 'Can apply for loans and view own data', '[\"view_own_loans\",\"create_loan_application\",\"view_own_repayments\"]', '2026-04-24 12:00:25');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `key_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `key_name`, `key_value`, `description`, `updated_at`) VALUES
(1, 'company_name', '', '', '2026-04-27 00:46:19'),
(2, 'company_phone', '', '', '2026-04-27 00:46:19'),
(3, 'company_email', '', '', '2026-04-27 00:46:19'),
(4, 'default_interest_rate', '10', '', '2026-04-27 00:46:19'),
(5, 'default_processing_fee', '4.00', 'Default processing fee %', '2026-04-24 12:00:25'),
(6, 'late_penalty_rate', '2.5', 'Late payment penalty rate per month', '2026-04-24 12:00:25'),
(7, 'currency', 'KES', 'Currency code', '2026-04-24 12:00:25'),
(8, 'asset_transfer_fee', '7000', 'Asset transfer fee', '2026-04-24 12:00:25'),
(9, 'tracking_system_fee', '25000', 'GPS tracking system installation fee', '2026-04-24 12:00:25'),
(13, 'company_address', '', '', '2026-04-27 00:46:19'),
(15, 'late_fee_percentage', '5', '', '2026-04-27 00:46:19'),
(16, 'processing_fee_percentage', '2', '', '2026-04-27 00:46:19'),
(17, 'max_loan_amount', '500000', '', '2026-04-27 00:46:19'),
(18, 'min_loan_amount', '5000', '', '2026-04-27 00:46:19'),
(19, 'default_loan_term', '12', '', '2026-04-27 00:46:19'),
(20, 'allow_online_applications', '1', '', '2026-04-27 00:46:19'),
(21, 'require_id_verification', '1', '', '2026-04-27 00:46:19'),
(22, 'require_income_verification', '1', '', '2026-04-27 00:46:19'),
(23, 'enable_notifications', '1', '', '2026-04-27 00:46:19'),
(24, 'enable_email_notifications', '1', '', '2026-04-27 00:46:19'),
(25, 'enable_sms_notifications', '1', '', '2026-04-27 00:46:19'),
(26, 'maintenance_mode', '0', '', '2026-04-27 00:46:19'),
(27, 'collateral_required', '0', '', '2026-04-27 00:46:19'),
(28, 'guarantor_required', '0', '', '2026-04-27 00:46:23'),
(29, 'auto_approve_threshold', '10000', '', '2026-04-27 00:46:19'),
(30, 'default_currency', 'KES', '', '2026-04-27 00:46:20'),
(31, 'grace_period_days', '7', '', '2026-04-27 00:46:20'),
(32, 'penalty_rate_daily', '0.5', '', '2026-04-27 00:46:20'),
(33, 'max_loan_duration_months', '60', '', '2026-04-27 00:46:20'),
(34, 'min_credit_score', '550', '', '2026-04-27 00:46:20'),
(35, 'require_guarantor_collateral', '0', '', '2026-04-27 00:46:20'),
(36, 'allow_early_repayment', '1', '', '2026-04-27 00:46:20'),
(37, 'early_repayment_penalty', '0', '', '2026-04-27 00:46:20');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `role` enum('admin','borrower','agent','manager') NOT NULL DEFAULT 'borrower',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `name`, `phone`, `role`, `permissions`, `created_at`, `updated_at`, `last_login`, `is_active`) VALUES
(1, 'admin@lending.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', NULL, 'admin', NULL, '2026-04-24 12:00:24', '2026-04-24 12:00:24', NULL, 1),
(2, 'gichukisimon@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Simon Gichuki', '+254722241745', 'borrower', NULL, '2026-04-25 04:21:04', '2026-04-25 04:21:04', NULL, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `borrowers`
--
ALTER TABLE `borrowers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `loans`
--
ALTER TABLE `loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_borrower` (`borrower_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `loan_categories`
--
ALTER TABLE `loan_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `loan_products`
--
ALTER TABLE `loan_products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `idx_recipient` (`recipient_id`),
  ADD KEY `idx_loan` (`loan_id`),
  ADD KEY `idx_read` (`is_read`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_loan` (`loan_id`),
  ADD KEY `idx_type` (`type`);

--
-- Indexes for table `repayments`
--
ALTER TABLE `repayments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `paid_by` (`paid_by`),
  ADD KEY `idx_loan` (`loan_id`),
  ADD KEY `idx_paid` (`paid_at`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key_name` (`key_name`),
  ADD KEY `idx_key` (`key_name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `borrowers`
--
ALTER TABLE `borrowers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `loans`
--
ALTER TABLE `loans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `loan_categories`
--
ALTER TABLE `loan_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `loan_products`
--
ALTER TABLE `loan_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `repayments`
--
ALTER TABLE `repayments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `borrowers`
--
ALTER TABLE `borrowers`
  ADD CONSTRAINT `borrowers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loans`
--
ALTER TABLE `loans`
  ADD CONSTRAINT `loans_ibfk_1` FOREIGN KEY (`borrower_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `loans_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `loan_products` (`id`),
  ADD CONSTRAINT `loans_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `loan_products`
--
ALTER TABLE `loan_products`
  ADD CONSTRAINT `loan_products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `loan_categories` (`id`);

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `repayments`
--
ALTER TABLE `repayments`
  ADD CONSTRAINT `repayments_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `repayments_ibfk_2` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
