-- Add Don't count flag to expenses (Phase 4).
-- Safe: does not delete or modify existing expense rows.

ALTER TABLE expenses
  ADD COLUMN is_excluded_from_budget TINYINT(1) NOT NULL DEFAULT 0
  AFTER image_path;
