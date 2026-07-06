-- Login / register / profile support for spendWise
-- Run this once on your MySQL database before using /register, /login, or /profile.
--
-- Used by:
--   app/routes/auth.js    (register, login, logout)
--   app/routes/profile.js (profile settings page)
--
-- Column names match the SQL in those route files exactly.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  monthly_income DECIMAL(10, 2) NULL DEFAULT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  default_budget DECIMAL(10, 2) NULL DEFAULT NULL,
  email_alerts_enabled TINYINT(1) NOT NULL DEFAULT 0,
  alert_email VARCHAR(255) NULL DEFAULT NULL,
  budget_alert_warning_month VARCHAR(7) NULL DEFAULT NULL,
  budget_alert_danger_month VARCHAR(7) NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
