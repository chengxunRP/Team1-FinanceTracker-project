-- Remove legacy demo expense rows from finance_tracker (optional one-time cleanup).
-- Safe to run if you no longer want the original seed expenses in the database.
-- Does not remove expenses you added yourself unless they match these exact titles.

USE finance_tracker;

DELETE FROM expenses
WHERE title IN (
  'Chicken rice at hawker centre',
  'MRT top-up',
  'Textbooks',
  'Netflix subscription',
  'Electricity bill'
);

-- Verify
-- SELECT * FROM expenses ORDER BY id DESC;
