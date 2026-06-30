-- Rename legacy category names to the SpendWise standard names.
-- Safe to run on existing databases: expense rows keep working via category_id.
--
-- Standard names:
--   Bills & Utilities, Groceries, Auto & Transport, Education,
--   Entertainment, Other categories, Shopping
--
-- Run in MySQL Workbench or:
--   mysql -u finance_user -p finance_tracker < docs/rename-standard-categories.sql

USE finance_tracker;

-- Core renames (same category_id, new display name)
UPDATE categories SET name = 'Groceries' WHERE name = 'Food';
UPDATE categories SET name = 'Auto & Transport' WHERE name = 'Transport';
UPDATE categories SET name = 'Education' WHERE name = 'School';
UPDATE categories SET name = 'Other categories' WHERE name IN ('Others', 'Other');
UPDATE categories SET name = 'Bills & Utilities' WHERE name IN ('Bills', 'Utilities');

-- Merge optional alias categories into a standard category when both exist
UPDATE expenses e
INNER JOIN categories src ON src.id = e.category_id AND src.name = 'Clothing'
INNER JOIN categories dst ON dst.name = 'Shopping'
SET e.category_id = dst.id;

DELETE FROM categories WHERE name = 'Clothing';

UPDATE expenses e
INNER JOIN categories src ON src.id = e.category_id AND src.name IN ('Business Services', 'Cash & ATM')
INNER JOIN categories dst ON dst.name = 'Other categories'
SET e.category_id = dst.id;

DELETE FROM categories WHERE name IN ('Business Services', 'Cash & ATM');

SELECT id, name, icon, color FROM categories ORDER BY id;
