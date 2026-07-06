-- Savings Goal table for spendWise
-- Run once on the finance_tracker database after db/users_auth_profile_schema.sql
--
-- Used by:
--   app/savingsGoalStore.js
--   app/routes/savingsGoals.js
--
-- One savings goal per logged-in user per month (user_id + goal_month).

USE finance_tracker;

CREATE TABLE IF NOT EXISTS savings_goals (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  goal_name      VARCHAR(120) NOT NULL DEFAULT 'Savings goal',
  target_amount  DECIMAL(10, 2) NOT NULL,
  current_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  goal_month     CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_savings_goals_user_month (user_id, goal_month),
  INDEX idx_savings_goals_user_id (user_id),
  INDEX idx_savings_goals_goal_month (goal_month),

  CONSTRAINT fk_savings_goals_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
