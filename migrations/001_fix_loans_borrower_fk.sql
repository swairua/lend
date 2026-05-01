-- Migration: Safely fix loans.borrower_id FK to reference borrowers(id)
-- Drops the existing FK if present and re-adds the correct constraint.
DELIMITER $$
DROP PROCEDURE IF EXISTS fix_fk_loans_borrower;
$$
CREATE PROCEDURE fix_fk_loans_borrower()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loans' AND COLUMN_NAME = 'borrower_id') > 0 THEN
    -- Try to drop existing constraint by name if present (MySQL stores it as foreign key constraint names)
    SET @drop = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loans' AND COLUMN_NAME = 'borrower_id');
    IF @drop IS NOT NULL THEN SET @sql = CONCAT('ALTER TABLE loans DROP FOREIGN KEY ', @drop); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt; END IF;
  END IF;

  SET @add = 'ALTER TABLE loans ADD CONSTRAINT loans_ibfk_1 FOREIGN KEY (borrower_id) REFERENCES borrowers(id) ON DELETE CASCADE';
  PREPARE stmt2 FROM @add; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
END$$
DELIMITER ;
CALL fix_fk_loans_borrower();
DROP PROCEDURE IF EXISTS fix_fk_loans_borrower;
