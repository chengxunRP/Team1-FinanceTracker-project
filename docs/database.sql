-- =============================================================================
-- SpendWise Finance Tracker — MySQL schema
-- =============================================================================
-- Purpose: Database schema for future MySQL integration.
-- Status:  Schema only — the Express app does NOT connect to MySQL yet.
--
-- Based on:
--   - app/expenseStore.js      (expense CRUD categories + expenses)
--   - app/routes/expenses.js   (title, amount, categoryId, date, notes, imagePath)
--   - app/routes/categories.js (name, icon, color)
--   - app/app.js               (monthlyBudget in memory)
--   - app/chatHistory.js       (FinBot session messages in memory)
--
-- Note: app/sampleExpenses.js uses a separate legacy shape
--       (description, category name, amount) for budget/dashboard pages.
--       Those rows are NOT seeded here because they do not match the expense
--       CRUD model. Unifying both data sources can be a later migration step.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS finance_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE finance_tracker;

-- -----------------------------------------------------------------------------
-- Table: categories
-- Expense categories used by /expenses and /categories.
-- Matches expenseStore.js: id, name, icon, color.
-- Expenses reference categories via category_id (same as categoryId in code).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  icon          VARCHAR(50)   NOT NULL DEFAULT 'others',
  color         VARCHAR(20)   NOT NULL DEFAULT '#64748b',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: expenses
-- User expense records from the Add/Edit Expense feature.
-- Matches app/routes/expenses.js fields:
--   title, amount, categoryId -> category_id, date, notes, imagePath -> image_path
-- image_path stores the public URL path only (e.g. /uploads/expenses/file.png),
-- not the binary file content.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  category_id   INT           NOT NULL,
  expense_date  DATE          NOT NULL,
  notes         TEXT          NULL,
  image_path    VARCHAR(255)  NULL,
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

-- -----------------------------------------------------------------------------
-- Table: monthly_budget
-- Stores the monthly spending limit used by budget, dashboard, overview,
-- purchase checker, and FinBot (currently a single in-memory value in app.js).
-- A single active row is enough for the current app design.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_budget (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  amount        DECIMAL(10,2) NOT NULL,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: chat_sessions
-- FinBot chat sessions (currently in-memory in app/chatHistory.js).
-- session_id matches the finbotSession cookie UUID from app/sessionCookie.js.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  session_id    VARCHAR(36)   NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_chat_sessions_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: chat_messages
-- Individual FinBot messages per session.
-- Matches chatHistory.js message shape: sender ('user' | 'bot'), text.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  session_id    INT           NOT NULL,
  sender        ENUM('user', 'bot') NOT NULL,
  message_text  TEXT          NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  INDEX idx_chat_messages_session_id (session_id),
  INDEX idx_chat_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Seed data — categories (from app/expenseStore.js)
-- =============================================================================
INSERT INTO categories (id, name, icon, color) VALUES
  (1, 'Food',          'food',          '#e07b39'),
  (2, 'Transport',     'transport',     '#1976d2'),
  (3, 'School',        'school',        '#7c4dff'),
  (4, 'Shopping',      'shopping',      '#e91e8c'),
  (5, 'Bills',         'bills',         '#fb8c00'),
  (6, 'Entertainment', 'entertainment', '#43a047'),
  (7, 'Others',        'others',        '#64748b')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  icon = VALUES(icon),
  color = VALUES(color);

-- =============================================================================
-- Seed data — expenses (from app/expenseStore.js sample records)
-- Original in-memory IDs were generated strings; DB uses INT AUTO_INCREMENT.
-- No image_path in seed data because the original samples had no uploads.
-- =============================================================================
INSERT INTO expenses (id, title, amount, category_id, expense_date, notes, image_path) VALUES
  (1, 'Chicken rice at hawker centre',  4.50,  1, '2025-05-28', 'Lunch at Toa Payoh',     NULL),
  (2, 'MRT top-up',                    20.00, 2, '2025-05-27', '',                       NULL),
  (3, 'Textbooks',                     65.00, 3, '2025-05-25', 'Semester 2 materials',   NULL),
  (4, 'Netflix subscription',          15.98, 6, '2025-05-20', 'Monthly plan',           NULL),
  (5, 'Electricity bill',              87.30, 5, '2025-05-15', 'May bill',               NULL)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  amount = VALUES(amount),
  category_id = VALUES(category_id),
  expense_date = VALUES(expense_date),
  notes = VALUES(notes),
  image_path = VALUES(image_path);

-- =============================================================================
-- Seed data — default monthly budget (from app/app.js default: 500)
-- =============================================================================
INSERT INTO monthly_budget (id, amount) VALUES (1, 500.00)
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- =============================================================================
-- Tables intentionally NOT included
-- =============================================================================
-- users                 — no login / user account logic in the project yet
-- purchase_recommendations — purchase checker computes results per request;
--                            nothing is persisted today
-- sample_expenses       — legacy budget/dashboard dataset in sampleExpenses.js
--                         uses description + category name, not expense CRUD fields

-- =============================================================================
-- Optional destructive reset (commented out for safety)
-- =============================================================================
-- DROP TABLE IF EXISTS chat_messages;
-- DROP TABLE IF EXISTS chat_sessions;
-- DROP TABLE IF EXISTS expenses;
-- DROP TABLE IF EXISTS categories;
-- DROP TABLE IF EXISTS monthly_budget;

-- =============================================================================
-- Test queries (run manually after creating the schema)
-- =============================================================================
-- SELECT * FROM categories ORDER BY id;
-- SELECT * FROM expenses ORDER BY expense_date DESC;
-- SELECT e.id, e.title, e.amount, e.expense_date, e.image_path, c.name AS category_name
-- FROM expenses e
-- JOIN categories c ON c.id = e.category_id
-- ORDER BY e.expense_date DESC;
-- SELECT * FROM monthly_budget;
-- SELECT cs.session_id, cm.sender, cm.message_text, cm.created_at
-- FROM chat_messages cm
-- JOIN chat_sessions cs ON cs.id = cm.session_id
-- ORDER BY cm.created_at;
