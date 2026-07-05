-- Mark non-core categories as custom (is_custom = 1).
-- Only the six core general categories stay is_custom = 0.
-- Safe: does not delete rows or change budgets/expenses.

UPDATE categories
SET is_custom = 1
WHERE name NOT IN (
  'Bills & Utilities',
  'Groceries',
  'Auto & Transport',
  'Education',
  'Entertainment',
  'Shopping',
  'Bills',
  'Food',
  'Transport',
  'School'
);
