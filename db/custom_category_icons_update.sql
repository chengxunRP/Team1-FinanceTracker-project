-- Custom category icons use the existing `categories.icon` column (VARCHAR 50).
-- Icon keys are stored as kebab-case strings (e.g. game-controller, tow-truck).
-- No schema change required for new SpendWise custom category icon picker.
--
-- If your database was created before the icon column existed, run:
-- ALTER TABLE categories
--   ADD COLUMN icon VARCHAR(50) NOT NULL DEFAULT 'others' AFTER name;

SELECT id, name, icon, color FROM categories ORDER BY id;
