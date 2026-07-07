-- Per-alert email duplicate guard for budget notifications.
-- Run once before using improved email alert deduplication.
--
-- Replaces broad users.budget_alert_warning_month / budget_alert_danger_month
-- guards with one row per user + month + alert_key + severity.

CREATE TABLE IF NOT EXISTS budget_email_alert_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  budget_month VARCHAR(7) NOT NULL,
  alert_key VARCHAR(64) NOT NULL,
  severity ENUM('warning', 'danger') NOT NULL,
  alert_name VARCHAR(255) NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget_email_alert_logs_user_month_key_severity (
    user_id,
    budget_month,
    alert_key,
    severity
  ),
  KEY idx_budget_email_alert_logs_user_month (user_id, budget_month),
  CONSTRAINT fk_budget_email_alert_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
