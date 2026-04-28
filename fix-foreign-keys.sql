-- Fix Critical Foreign Key Mismatch
-- The loans.borrower_id should reference borrowers.id, not users.id

-- First, drop the incorrect constraint
ALTER TABLE `loans` DROP FOREIGN KEY `loans_ibfk_1`;

-- Add the correct constraint
ALTER TABLE `loans` ADD CONSTRAINT `loans_ibfk_1` 
  FOREIGN KEY (`borrower_id`) REFERENCES `borrowers` (`id`);

-- Also verify other constraints are correct:
-- loans.approved_by should reference users.id (CORRECT in schema)
-- messages.sender_id should reference users.id (CORRECT in schema)
-- messages.recipient_id should reference users.id (CORRECT in schema)
-- messages.loan_id should reference loans.id (CORRECT in schema)
-- payments.loan_id should reference loans.id (CORRECT in schema)
-- repayments.loan_id should reference loans.id (CORRECT in schema)
-- repayments.paid_by should reference users.id (CORRECT in schema)
-- audit_logs.user_id should reference users.id (CORRECT in schema)
-- loan_products.category_id should reference loan_categories.id (CORRECT in schema)
-- borrowers.user_id should reference users.id (CORRECT in schema)

-- Note: The loans table doesn't have a foreign key to borrowers.id yet
-- but it DOES have a real constraint on borrower_id as shown above

-- Verify the fix
SHOW CREATE TABLE loans;
