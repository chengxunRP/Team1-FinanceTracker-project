-- Recurring category budgets for SpendWise
-- Safe to run on an existing database. Does not delete categories or expenses.

-- Step 1: add recurring budget columns
ALTER TABLE category_budgets
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER budget_limit,
  ADD COLUMN rollover_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;

-- Step 2: keep one budget row per category (latest id wins)
DELETE cb_old
FROM category_budgets cb_old
INNER JOIN category_budgets cb_new
  ON cb_old.category_id = cb_new.category_id
 AND cb_old.id < cb_new.id;

-- Step 3: switch from per-month unique key to one active budget per category
ALTER TABLE category_budgets
  DROP INDEX unique_category_month;

ALTER TABLE category_budgets
  ADD UNIQUE KEY unique_category_budget (category_id);

-- Step 4: mark consolidated rows as active
UPDATE category_budgets SET is_active = 1;

-- budget_month column is kept for compatibility but no longer used for filtering.
-- Spending is always calculated from expenses.expense_date for the viewed month.
