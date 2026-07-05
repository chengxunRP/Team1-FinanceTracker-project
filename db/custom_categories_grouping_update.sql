-- Custom category grouping and soft delete for SpendWise
-- Safe to run on an existing database.

ALTER TABLE categories
  ADD COLUMN is_custom TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at DATETIME NULL;

-- Existing categories are treated as general/default categories.
UPDATE categories SET is_custom = 0, is_deleted = 0;

-- User-created categories use the default custom icon key or other non-legacy icons.
UPDATE categories SET is_custom = 1
WHERE icon = 'default-category'
   OR icon NOT IN (
     'food', 'transport', 'school', 'shopping', 'bills',
     'entertainment', 'others', 'health', 'travel'
   );
