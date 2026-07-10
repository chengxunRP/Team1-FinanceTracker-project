-- Per-user savings goal isolation
-- Run once after savings_goals table exists.

ALTER TABLE savings_goals
  ADD COLUMN user_id INT UNSIGNED NULL AFTER id;

ALTER TABLE savings_goals
  DROP INDEX uq_savings_goals_month;

ALTER TABLE savings_goals
  ADD UNIQUE KEY uq_savings_goals_user_month (user_id, goal_month),
  ADD INDEX idx_savings_goals_user_id (user_id);
