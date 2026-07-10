-- Per-user category budget uniqueness for spendWise
-- Run once after db/user_data_isolation_update.sql and db/budget_recurring_update.sql
-- Safe: changes unique index only. Does not delete budget rows.

ALTER TABLE category_budgets
  DROP INDEX unique_category_budget;

ALTER TABLE category_budgets
  ADD UNIQUE KEY unique_category_budget_user (category_id, user_id);
