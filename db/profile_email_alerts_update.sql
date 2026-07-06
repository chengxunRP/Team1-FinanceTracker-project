-- Profile email alert settings (per user)
-- Run once before using Email Budget Notifications on /profile.

ALTER TABLE users
  ADD COLUMN email_alerts_enabled TINYINT(1) NOT NULL DEFAULT 0
  AFTER default_budget;

ALTER TABLE users
  ADD COLUMN alert_email VARCHAR(255) NULL DEFAULT NULL
  AFTER email_alerts_enabled;

ALTER TABLE users
  ADD COLUMN budget_alert_warning_month VARCHAR(7) NULL DEFAULT NULL
  AFTER alert_email;

ALTER TABLE users
  ADD COLUMN budget_alert_danger_month VARCHAR(7) NULL DEFAULT NULL
  AFTER budget_alert_warning_month;
