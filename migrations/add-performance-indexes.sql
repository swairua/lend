-- Performance indexes for loans and repayments queries
-- Addresses Phase 1b of Backend-Frontend Sync Optimization

-- Index on borrower_id for filtering borrower loans
ALTER TABLE loans ADD INDEX idx_borrower_id (borrower_id);

-- Index on created_at for sorting
ALTER TABLE loans ADD INDEX idx_created_at (created_at);

-- Index on updated_at for SSE stream change detection
ALTER TABLE loans ADD INDEX idx_updated_at (updated_at);

-- Index on loan_id for JOIN performance in repayments
ALTER TABLE repayments ADD INDEX idx_loan_id (loan_id);

-- Composite index for status + created_at (common filter + sort pattern)
ALTER TABLE loans ADD INDEX idx_status_created_at (status, created_at);
