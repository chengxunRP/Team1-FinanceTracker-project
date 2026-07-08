-- Password reset tokens for spendWise forgot-password / reset-password flow.
-- Run once on the finance_tracker database.
--
-- Used by:
--   app/routes/auth.js  (GET/POST /forgot-password, GET/POST /reset-password/:token)
--
-- Security notes:
--   - Only SHA-256 hashes of reset tokens are stored (token_hash), never raw tokens.
--   - Tokens expire (expires_at) and are one-time use (used_at).
--   - Old unused tokens for a user are invalidated when a new reset is requested.
--
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS only (no DROP, no ALTER, no data changes).

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL COMMENT 'Owner of this reset request; matches users.id',
  token_hash CHAR(64) NOT NULL COMMENT 'SHA-256 hex hash of the emailed reset token',
  expires_at DATETIME NOT NULL COMMENT 'Token is invalid after this time',
  used_at DATETIME NULL DEFAULT NULL COMMENT 'Set when password is successfully reset',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_token_hash (token_hash),
  KEY idx_password_reset_tokens_user_id (user_id),
  KEY idx_password_reset_tokens_expires_at (expires_at),
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
