-- Repair default category flags when is_custom / is_deleted columns exist.
-- Does not delete rows. Does not modify budgets or expenses.

UPDATE categories
SET is_custom = 0, is_deleted = 0
WHERE name IN (
  'Bills & Utilities',
  'Groceries',
  'Auto & Transport',
  'Education',
  'Entertainment',
  'Shopping',
  'Business Services',
  'Cash & ATM',
  'Check',
  'Clothing',
  'Credit card payment',
  'Eating out',
  'Electronics & Software',
  'Fees',
  'Gifts & Donations',
  'Health & Medical',
  'Home',
  'Insurance',
  'Investments',
  'Kids',
  'Loans',
  'Mortgage & Rent',
  'Personal Care',
  'Pets',
  'Sports & Fitness',
  'Taxes',
  'Transfer',
  'Travel'
);
