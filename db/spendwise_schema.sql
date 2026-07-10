-- spendWise schema excerpt — expenses table (fresh installs).
-- Full app schema: see docs/database.sql and db/init.sql

CREATE TABLE IF NOT EXISTS expenses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  merchant_name VARCHAR(100)  NULL,
  category_id   INT           NOT NULL,
  expense_date  DATE          NOT NULL,
  notes         TEXT          NULL,
  image_path    VARCHAR(255)  NULL,
  is_excluded_from_budget TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_expenses_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  INDEX idx_expenses_category_id (category_id),
  INDEX idx_expenses_expense_date (expense_date),
  INDEX idx_expenses_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
