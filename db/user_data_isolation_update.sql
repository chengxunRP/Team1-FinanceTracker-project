-- Per-user finance data isolation for spendWise
-- Run once after db/users_auth_profile_schema.sql
-- Safe: adds nullable user_id columns only. Does not delete rows.

ALTER TABLE expenses
  ADD COLUMN user_id INT UNSIGNED NULL AFTER category_id,
  ADD INDEX idx_expenses_user_id (user_id);

ALTER TABLE category_budgets
  ADD COLUMN user_id INT UNSIGNED NULL AFTER category_id,
  ADD INDEX idx_category_budgets_user_id (user_id);

ALTER TABLE monthly_budget
  ADD COLUMN user_id INT UNSIGNED NULL AFTER id,
  ADD INDEX idx_monthly_budget_user_id (user_id);

ALTER TABLE categories
  ADD COLUMN user_id INT UNSIGNED NULL AFTER color,
  ADD INDEX idx_categories_user_id (user_id);

ALTER TABLE chat_sessions
  ADD COLUMN user_id INT UNSIGNED NULL AFTER session_id,
  ADD INDEX idx_chat_sessions_user_id (user_id);

-- Skip if table missing (run docs/all-categories-budget-schema.sql first).
ALTER TABLE overall_monthly_budgets
  ADD COLUMN user_id INT UNSIGNED NULL AFTER id,
  ADD INDEX idx_overall_monthly_budgets_user_id (user_id);
