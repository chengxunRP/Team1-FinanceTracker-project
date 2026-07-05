-- =============================================================================
-- SpendWise — budget rollover overrides (reset rollover per month)
-- =============================================================================
-- Purpose: Store per-month incoming rollover overrides for active category budgets.
--          Reset rollover sets override_rollover_amount = 0 for the viewed month.
--
-- Usage (manual):
--   mysql -u root -p finance_tracker < db/budget_rollover_overrides_update.sql
--
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
-- Does not drop data or modify existing budgets/expenses.
-- =============================================================================

USE finance_tracker;

CREATE TABLE IF NOT EXISTS budget_rollover_overrides (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  category_budget_id        INT           NOT NULL,
  reset_month               CHAR(7)       NOT NULL COMMENT 'YYYY-MM — month receiving the override',
  override_rollover_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_rollover_override_month (category_budget_id, reset_month),

  CONSTRAINT fk_rollover_override_category_budget
    FOREIGN KEY (category_budget_id) REFERENCES category_budgets (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  INDEX idx_rollover_override_reset_month (reset_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
