USE finance_tracker;

-- =============================================================================
-- All Categories Budget schema
-- =============================================================================
-- Purpose:
--   Store a top-level "All Categories / All Transactions" budget that tracks
--   total spending across ALL expense categories for a month view.
--
-- Important:
--   - This is NOT a normal expense category.
--   - Do NOT insert "All Categories" / "All Transactions" into categories.
--   - This budget is separate from category_budgets.
--   - Supports rollover enable/disable and per-month reset overrides.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: overall_monthly_budgets
-- One logical active overall budget configuration at a time.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS overall_monthly_budgets (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  budget_amount     DECIMAL(10,2) NOT NULL,
  rollover_enabled  TINYINT(1)    NOT NULL DEFAULT 0,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  deleted_at        DATETIME      NULL DEFAULT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_overall_monthly_budgets_active (is_active),
  INDEX idx_overall_monthly_budgets_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: overall_budget_rollover_resets
-- Per-month incoming rollover overrides for overall budget.
-- reset_month format: YYYY-MM (e.g., 2026-08)
-- override_rollover_amount:
--   - Use 0.00 for "Reset rollover" behavior.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS overall_budget_rollover_resets (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  overall_budget_id         INT           NOT NULL,
  reset_month               CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
  override_rollover_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_overall_rollover_reset_month (overall_budget_id, reset_month),
  INDEX idx_overall_rollover_resets_month (reset_month),

  CONSTRAINT fk_overall_rollover_resets_budget
    FOREIGN KEY (overall_budget_id) REFERENCES overall_monthly_budgets (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Optional manual verification
-- -----------------------------------------------------------------------------
-- SHOW TABLES LIKE 'overall_monthly_budgets';
-- SHOW TABLES LIKE 'overall_budget_rollover_resets';
-- DESCRIBE overall_monthly_budgets;
-- DESCRIBE overall_budget_rollover_resets;
