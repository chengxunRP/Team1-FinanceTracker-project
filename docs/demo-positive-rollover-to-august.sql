-- =============================================================================
-- Demo seed: positive rollover from July 2026 → August 2026
-- =============================================================================
-- Purpose:
--   Test that a category budget with rollover ON carries a positive leftover
--   from July into August.
--
-- Expected when opening:
--   /budget/categories/<categoryId>?month=2026-08
--
--   Base budget                 = $10
--   Rolled over from last month = +$3
--   Available budget            = $13
--   Spent this month            = $0
--   Left to spend               = $13
--
-- Math:
--   July budget = $10, July spent = $7 → July leftover = +$3
--   August available = $10 + $3 = $13 (no August expenses seeded)
--
-- Usage (manual — does not run from the app):
--   mysql -u root -p finance_tracker < docs/demo-positive-rollover-to-august.sql
--
-- Safety:
--   • Does NOT delete or truncate existing data
--   • Prefers Groceries or Auto & Transport only when they have NO active budget
--   • Otherwise uses (or creates) custom category "Rollover Demo"
--   • Upserts one budget row per chosen category (unique on category_id)
--   • Inserts the July expense only if the exact demo row is not already present
-- =============================================================================

USE finance_tracker;

-- -----------------------------------------------------------------------------
-- Section 1: Choose demo category
-- -----------------------------------------------------------------------------
-- Prefer an existing standard category without an active budget so we do not
-- overwrite a real user's active budget. Fall back to "Rollover Demo".

SET @category_id = NULL;

SELECT c.id INTO @category_id
FROM categories c
LEFT JOIN category_budgets cb
  ON cb.category_id = c.id
 AND cb.is_active = 1
WHERE c.name IN ('Groceries', 'Auto & Transport')
  AND COALESCE(c.is_deleted, 0) = 0
  AND cb.id IS NULL
ORDER BY FIELD(c.name, 'Groceries', 'Auto & Transport')
LIMIT 1;

-- Create "Rollover Demo" only when no suitable standard category is available.
INSERT INTO categories (name, icon, color, is_custom, is_deleted)
SELECT 'Rollover Demo', 'default-category', '#6b7280', 1, 0
FROM DUAL
WHERE @category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories WHERE name = 'Rollover Demo'
  );

SET @category_id = COALESCE(
  @category_id,
  (SELECT id FROM categories WHERE name = 'Rollover Demo' LIMIT 1)
);

-- -----------------------------------------------------------------------------
-- Section 2: Upsert demo budget (starts July 2026, rollover ON)
-- -----------------------------------------------------------------------------
-- category_budgets columns used by app/budgetStore.js:
--   category_id, budget_limit, budget_month, is_active, rollover_enabled
--
-- One row per category (UNIQUE KEY unique_category_budget). UPDATE if present.

INSERT INTO category_budgets (
  category_id,
  budget_limit,
  budget_month,
  is_active,
  rollover_enabled
)
VALUES (
  @category_id,
  10.00,
  '2026-07',
  1,
  1
)
ON DUPLICATE KEY UPDATE
  budget_limit     = VALUES(budget_limit),
  budget_month     = VALUES(budget_month),
  is_active        = VALUES(is_active),
  rollover_enabled = VALUES(rollover_enabled);

-- -----------------------------------------------------------------------------
-- Section 3: Insert July 2026 expense (no August expense)
-- -----------------------------------------------------------------------------
-- expenses columns: title, amount, category_id, expense_date, notes

INSERT INTO expenses (title, amount, category_id, expense_date, notes)
SELECT
  'July rollover test expense',
  7.00,
  @category_id,
  '2026-07-10',
  'Demo seed for positive rollover Jul→Aug 2026'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM expenses e
  WHERE e.title = 'July rollover test expense'
    AND e.expense_date = '2026-07-10'
    AND e.category_id = @category_id
);

-- -----------------------------------------------------------------------------
-- Section 4: Verification (run after seeding)
-- -----------------------------------------------------------------------------

SELECT
  @category_id AS demo_category_id,
  c.name AS demo_category_name,
  CONCAT(
    '/budget/categories/',
    @category_id,
    '?month=2026-08'
  ) AS august_detail_url
FROM categories c
WHERE c.id = @category_id;

SELECT
  cb.category_id,
  c.name AS category_name,
  cb.budget_limit,
  cb.budget_month,
  cb.is_active,
  cb.rollover_enabled
FROM category_budgets cb
INNER JOIN categories c ON c.id = cb.category_id
WHERE cb.category_id = @category_id;

SELECT
  e.id,
  e.title,
  e.amount,
  e.expense_date,
  e.category_id,
  c.name AS category_name
FROM expenses e
INNER JOIN categories c ON c.id = e.category_id
WHERE e.category_id = @category_id
  AND e.expense_date >= '2026-07-01'
  AND e.expense_date < '2026-08-01'
ORDER BY e.expense_date, e.id;

-- Manual check in the app:
--   August detail page should show +$3 rollover and $13 available with $0 spent.
