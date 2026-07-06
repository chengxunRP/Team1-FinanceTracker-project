-- Add All Categories Budget exclusion flag to expenses.
-- Safe: does not delete rows, drop tables, or change existing data.
-- Existing is_excluded_from_budget = 1 rows stay category-only exclusions (default 0 here).
--
-- is_excluded_from_all_budget:
--   0 = counted in All Categories Budget
--   1 = excluded from All Categories Budget

ALTER TABLE expenses
  ADD COLUMN is_excluded_from_all_budget TINYINT(1) NOT NULL DEFAULT 0
  AFTER is_excluded_from_budget;
