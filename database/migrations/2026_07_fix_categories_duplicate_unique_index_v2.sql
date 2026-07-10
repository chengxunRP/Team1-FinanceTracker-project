-- Fix category creation duplicate errors across users (v2).
--
-- Root cause:
--   The `categories` table currently has a UNIQUE constraint on `name`
--   (uq_categories_name). This blocks creating the same *custom* category
--   name for different users, even if the UI hides the other user's category.
--
-- This migration replaces the global UNIQUE(name) with a per-user uniqueness rule.
--
-- Uniqueness key rules (matches what the picker considers "visible"):
--   1) Visible default categories (is_custom=0 AND icon != 'default-category'):
--        key = 0  (global shared)
--   2) Hidden default categories (is_custom=0 AND icon = 'default-category'):
--        key = id (so custom categories can reuse the name)
--   3) Legacy rows with user_id IS NULL:
--        key = id (so they won't block other users)
--   4) Custom categories:
--        key = user_id
--
-- Safe to re-run:
--   Uses CREATE/ALTER guards via dynamic SQL (checks metadata).
--
-- Important:
--   This script DROPS only the specific global index `uq_categories_name`.
--   It does not drop any tables or delete data.

SET @db_name := DATABASE();

-- 1) Drop old global unique index if present.
SET @drop_idx_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'categories'
        AND INDEX_NAME = 'uq_categories_name'
    ),
    'ALTER TABLE categories DROP INDEX uq_categories_name',
    'SELECT 1'
  )
);
PREPARE stmt FROM @drop_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Add generated uniqueness key column if missing.
SET @col_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'categories'
        AND COLUMN_NAME = 'user_id_uniqueness_key'
    ),
    'SELECT 1',
    'ALTER TABLE categories
       ADD COLUMN user_id_uniqueness_key INT UNSIGNED
       GENERATED ALWAYS AS (
         CASE
           WHEN is_custom = 0 AND (icon IS NULL OR icon != ''default-category'') THEN 0
           WHEN is_custom = 0 AND icon = ''default-category'' THEN id
           WHEN user_id IS NULL THEN id
           ELSE user_id
         END
       ) STORED'
  )
);
PREPARE stmt FROM @col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Add new per-user unique index on (name, user_id_uniqueness_key) if missing.
SET @idx_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'categories'
        AND INDEX_NAME = 'uq_categories_name_user_id_key'
    ),
    'SELECT 1',
    'ALTER TABLE categories
       ADD UNIQUE KEY uq_categories_name_user_id_key (name, user_id_uniqueness_key)'
  )
);
PREPARE stmt FROM @idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

