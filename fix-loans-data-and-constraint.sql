-- Step 1: Check which loans have invalid borrower_id
SELECT l.id, l.borrower_id, b.id as valid_borrower_id, b.user_id
FROM loans l
LEFT JOIN borrowers b ON l.borrower_id = b.id
WHERE b.id IS NULL;

-- Step 2: Fix loans with invalid borrower_id
-- For each loan, find the correct borrower_id by matching through users
UPDATE loans l
SET l.borrower_id = (
    SELECT b.id FROM borrowers b 
    WHERE b.user_id = (SELECT user_id FROM borrowers WHERE id = l.borrower_id LIMIT 1)
    LIMIT 1
)
WHERE l.borrower_id NOT IN (SELECT id FROM borrowers);

-- If the above doesn't work, manually fix it:
-- Based on your data: loan #1 has borrower_id=2, but should be 1
UPDATE loans SET borrower_id = 1 WHERE id = 1;

-- Step 3: Verify all loans now have valid borrower_id
SELECT l.id, l.borrower_id, b.id, b.user_id
FROM loans l
LEFT JOIN borrowers b ON l.borrower_id = b.id;

-- Step 4: Drop the old incorrect constraint
ALTER TABLE `loans` DROP FOREIGN KEY `loans_ibfk_1`;

-- Step 5: Add the correct constraint
ALTER TABLE `loans` ADD CONSTRAINT `loans_ibfk_1` 
  FOREIGN KEY (`borrower_id`) REFERENCES `borrowers` (`id`);

-- Step 6: Verify the constraint was added
SHOW CREATE TABLE loans;
