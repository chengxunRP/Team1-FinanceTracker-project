-- Fix category creation duplicate errors across users.
-- Problem:
--   The `categories` table currently has a UNIQUE constraint on `name` (uq_categories_name),
--   which blocks creating the same custom category name for different users.
--
-- This migration:
--   1) Removes the global unique index on `name`
--   2) Adds a generated column `user_id_uniqueness_key` to enforce uniqueness per:
--        - default categories (is_custom = 0)  -> key = 0
--        - per-user custom categories           -> key = user_id
--        - legacy rows with user_id IS NULL     -> key = id (so they do not block)
--   3) Adds a new UNIQUE index on (name, user_id_uniqueness_key)
--
-- Safe to re-run:
--   Uses conditional dynamic SQL so it can be executed more than once.

SET @db_name := DATABASE();

-- Drop old global unique index (if present).
SET @drop_sql := (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE categories DROP INDEX uq_categories_name',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'categories'
    AND INDEX_NAME = 'uq_categories_name'
);

PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add generated uniqueness key column (if missing).
SET @col_sql := (
  SELECT IF(
    COUNT(*) > 0,
    'SELECT 1',
    'ALTER TABLE categories
       ADD COLUMN user_id_uniqueness_key INT UNSIGNED
       GENERATED ALWAYS AS (
         CASE
           -- Visible default categories (shared across all users) -> key=0
           WHEN is_custom = 0 AND (icon IS NULL OR icon != ''default-category'') THEN 0
           -- Hidden default categories -> do not block custom category creation -> key=id
           WHEN is_custom = 0 AND icon = ''default-category'' THEN id
           -- Legacy rows with user_id IS NULL -> do not block -> key=id
           WHEN user_id IS NULL THEN id
           ELSE user_id
         END
       ) STORED'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'categories'
    AND COLUMN_NAME = 'user_id_uniqueness_key'
);

PREPARE stmt FROM @col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new unique index (if missing).
SET @idx_sql := (
  SELECT IF(
    COUNT(*) > 0,
    'SELECT 1',
    'ALTER TABLE categories
       ADD UNIQUE KEY uq_categories_name_user_id_key (name, user_id_uniqueness_key)'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'categories'
    AND INDEX_NAME = 'uq_categories_name_user_id_key'
);

PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

