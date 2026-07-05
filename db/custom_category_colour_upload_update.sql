-- Additive migration for custom category icon images.
-- Safe to run only when icon_image does not exist yet.
-- Does not delete or modify existing category or budget rows.

-- Check first: SHOW COLUMNS FROM categories LIKE 'icon_image';

ALTER TABLE categories
  ADD COLUMN icon_image VARCHAR(255) NULL;
