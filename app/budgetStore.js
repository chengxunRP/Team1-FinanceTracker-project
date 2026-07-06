const db = require("./config/db");
const {
  getCategoryBudgetStatus,
  getCategoryStatusMessage,
  isExpenseCountedForBudget,
  isExpenseCountedForAllBudget,
} = require("./budgetHelpers");
const {
  getDisplayCategoryName,
  isBillsCategory,
  isCustomCategory,
  compareCategoriesForSort,
} = require("./categoryHelpers");
const { getCategoryImageUrl } = require("./categoryImageHelpers");
const { requireUserId } = require("./userScope");

const CATEGORY_BUDGET_COUNTED_EXPENSE_WHERE =
  "AND COALESCE(is_excluded_from_budget, 0) = 0";
const ALL_BUDGET_COUNTED_EXPENSE_WHERE =
  "AND COALESCE(is_excluded_from_all_budget, 0) = 0";

function getCurrentBudgetMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatBudgetMonthLabel(budgetMonth) {
  const [year, monthNum] = budgetMonth.split("-").map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    return budgetMonth;
  }
  return `${MONTH_NAMES[monthNum - 1]} ${year}`;
}

function normalizeBudgetMonth(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(String(value))) {
    return getCurrentBudgetMonth();
  }
  const [, monthNum] = String(value).split("-").map(Number);
  if (!monthNum || monthNum < 1 || monthNum > 12) {
    return getCurrentBudgetMonth();
  }
  return String(value);
}

function getBudgetStartMonthFromCreatedAt(createdAt) {
  if (!createdAt) return getCurrentBudgetMonth();
  if (createdAt instanceof Date) {
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, "0");
    return normalizeBudgetMonth(`${year}-${month}`);
  }
  const value = String(createdAt).trim();
  if (/^\d{4}-\d{2}/.test(value)) {
    return normalizeBudgetMonth(value.slice(0, 7));
  }
  return getCurrentBudgetMonth();
}

function getBudgetMonthDateRange(budgetMonth) {
  const [year, month] = budgetMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid budget month: ${budgetMonth}`);
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return { startDate, endExclusive, year, month };
}

function isExpenseInBudgetMonth(expenseDate, budgetMonth) {
  if (!expenseDate || !budgetMonth) return false;
  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);
  const dateStr = String(expenseDate).slice(0, 10);
  return dateStr >= startDate && dateStr < endExclusive;
}

function filterExpensesForMonth(expenses, budgetMonth) {
  return expenses.filter((expense) => isExpenseInBudgetMonth(expense.date, budgetMonth));
}

/** Raw monthly_budget table amount for the logged-in user (0 when unset). */
async function getMonthlyBudgetTableAmount() {
  const userId = requireUserId();
  const [rows] = await db.query(
    "SELECT amount FROM monthly_budget WHERE user_id = ? ORDER BY id ASC LIMIT 1",
    [userId]
  );

  if (!rows.length) {
    return 0;
  }

  return Number(rows[0].amount) || 0;
}

/** @deprecated Prefer financeHelpers.resolvePrimaryMonthlyBudgetAmount for UI totals. */
async function getMonthlyBudget() {
  return getMonthlyBudgetTableAmount();
}

async function setMonthlyBudget(amount) {
  const userId = requireUserId();
  const [rows] = await db.query(
    "SELECT id FROM monthly_budget WHERE user_id = ? ORDER BY id ASC LIMIT 1",
    [userId]
  );

  if (rows.length) {
    await db.query("UPDATE monthly_budget SET amount = ? WHERE id = ? AND user_id = ?", [
      amount,
      rows[0].id,
      userId,
    ]);
    return;
  }

  await db.query("INSERT INTO monthly_budget (amount, user_id) VALUES (?, ?)", [
    amount,
    userId,
  ]);
}

let recurringBudgetSchema = null;

async function usesRecurringBudgetSchema() {
  if (recurringBudgetSchema !== null) return recurringBudgetSchema;
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'category_budgets'
        AND COLUMN_NAME = 'is_active'`
    );
    recurringBudgetSchema = Number(rows[0].cnt) > 0;
  } catch (error) {
    console.warn("Could not detect recurring budget schema:", error.message);
    recurringBudgetSchema = false;
  }
  return recurringBudgetSchema;
}

function mapBudgetRow(row) {
  const startMonth = row.createdAt
    ? getBudgetStartMonthFromCreatedAt(row.createdAt)
    : normalizeBudgetMonth(row.budgetMonth || getCurrentBudgetMonth());

  return {
    id: row.budgetId != null ? Number(row.budgetId) : null,
    categoryId: String(row.categoryId),
    budgetLimit: Number(row.budgetLimit),
    budgetMonth: row.budgetMonth || null,
    rolloverEnabled: Boolean(row.rolloverEnabled),
    isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
    createdAt: row.createdAt || null,
    startMonth,
  };
}

async function getCategoryBudgetsLegacy(budgetMonth) {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(budget_limit AS DECIMAL(10,2)) AS budgetLimit,
      budget_month AS budgetMonth
    FROM category_budgets
    WHERE budget_month = ? AND user_id = ?`,
    [budgetMonth, userId]
  );
  return rows.map((row) =>
    mapBudgetRow({
      categoryId: row.categoryId,
      budgetLimit: row.budgetLimit,
      budgetMonth: row.budgetMonth,
      rolloverEnabled: 0,
      isActive: 1,
    })
  );
}

async function getActiveCategoryBudgets() {
  try {
    const isRecurring = await usesRecurringBudgetSchema();
    if (!isRecurring) {
      return getCategoryBudgetsLegacy(getCurrentBudgetMonth());
    }

    const userId = requireUserId();
    const [rows] = await db.query(
      `SELECT
        id AS budgetId,
        category_id AS categoryId,
        CAST(budget_limit AS DECIMAL(10,2)) AS budgetLimit,
        budget_month AS budgetMonth,
        rollover_enabled AS rolloverEnabled,
        is_active AS isActive,
        created_at AS createdAt
      FROM category_budgets
      WHERE is_active = 1 AND user_id = ?
      ORDER BY category_id ASC`,
      [userId]
    );

    return rows.map((row) => mapBudgetRow(row));
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.error(
        "category_budgets table is missing. Run the CREATE TABLE statement in docs/database.sql:",
        error.message
      );
      return [];
    }
    console.error("Database error loading active category budgets:", error);
    throw error;
  }
}

async function getCategoryBudgets(budgetMonth) {
  const isRecurring = await usesRecurringBudgetSchema();
  if (isRecurring) {
    return getActiveCategoryBudgets();
  }
  return getCategoryBudgetsLegacy(budgetMonth);
}

async function getActiveBudgetForCategory(categoryId) {
  const budgets = await getActiveCategoryBudgets();
  return budgets.find((b) => String(b.categoryId) === String(categoryId)) || null;
}

function getCategoryBudgetStartMonth(budgetEntry) {
  if (!budgetEntry) return getCurrentBudgetMonth();
  if (budgetEntry.startMonth) {
    return normalizeBudgetMonth(budgetEntry.startMonth);
  }
  if (budgetEntry.createdAt) {
    return getBudgetStartMonthFromCreatedAt(budgetEntry.createdAt);
  }
  return normalizeBudgetMonth(budgetEntry.budgetMonth || getCurrentBudgetMonth());
}

function isBudgetActiveForMonth(budgetEntry, targetMonth) {
  const startMonth = getCategoryBudgetStartMonth(budgetEntry);
  return isBudgetActiveForStartMonth(targetMonth, startMonth);
}

let rolloverOverridesSchema = null;

async function usesRolloverOverridesSchema() {
  if (rolloverOverridesSchema !== null) return rolloverOverridesSchema;
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS cnt
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'budget_rollover_overrides'`
    );
    rolloverOverridesSchema = Number(rows[0].cnt) > 0;
  } catch (error) {
    console.warn("Could not detect budget_rollover_overrides table:", error.message);
    rolloverOverridesSchema = false;
  }
  return rolloverOverridesSchema;
}

async function ensureRolloverOverridesTable() {
  if (await usesRolloverOverridesSchema()) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS budget_rollover_overrides (
      id                        INT AUTO_INCREMENT PRIMARY KEY,
      category_budget_id        INT           NOT NULL,
      reset_month               CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
      override_rollover_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_rollover_override_month (category_budget_id, reset_month),
      CONSTRAINT fk_rollover_override_category_budget
        FOREIGN KEY (category_budget_id) REFERENCES category_budgets (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      INDEX idx_rollover_override_reset_month (reset_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  rolloverOverridesSchema = true;
}

/**
 * Rollover into targetMonth = end-of-month balance from the month before target,
 * walking forward from budget start with recursive carry when rollover is ON.
 * rolloverOverrides: { 'YYYY-MM': amount } — incoming rollover for that month only.
 */
function computeRolloverAmount(
  budgetEntry,
  targetMonth,
  monthlySpendingByMonth,
  rolloverOverrides = {}
) {
  if (!budgetEntry || !budgetEntry.rolloverEnabled) return 0;

  const startMonth = getCategoryBudgetStartMonth(budgetEntry);
  const month = normalizeBudgetMonth(targetMonth);

  if (isBudgetMonthAfter(startMonth, month) || startMonth === month) return 0;

  const baseBudget = Number(budgetEntry.budgetLimit);
  let carryBalance = 0;
  let walkMonth = startMonth;

  while (true) {
    const incomingRollover =
      walkMonth === startMonth
        ? 0
        : Object.prototype.hasOwnProperty.call(rolloverOverrides, walkMonth)
          ? Number(rolloverOverrides[walkMonth] || 0)
          : carryBalance;
    const spent = Number(monthlySpendingByMonth[walkMonth] || 0);
    const available = baseBudget + incomingRollover;
    const endBalance = available - spent;

    const nextMonth = addBudgetMonths(walkMonth, 1);
    if (nextMonth === month) {
      if (Object.prototype.hasOwnProperty.call(rolloverOverrides, month)) {
        return Number(rolloverOverrides[month] || 0);
      }
      return endBalance;
    }
    if (isBudgetMonthAfter(nextMonth, month)) return 0;

    carryBalance = endBalance;
    walkMonth = nextMonth;
  }
}

function buildBudgetAmounts(baseBudget, actual, rolloverEnabled, rolloverAmount) {
  const rollover = rolloverEnabled ? Number(rolloverAmount || 0) : 0;
  const availableBudget = Number(baseBudget) + rollover;
  const remaining = availableBudget - Number(actual || 0);
  const usedPct =
    availableBudget > 0 ? Math.round((Number(actual || 0) / availableBudget) * 100) : 0;

  return {
    baseBudget: Number(baseBudget),
    rollover,
    availableBudget,
    actual: Number(actual || 0),
    remaining,
    usedPct,
    overspent: remaining < 0,
  };
}

function getOverallBudgetStartMonth(createdAt) {
  return getBudgetStartMonthFromCreatedAt(createdAt);
}

function isBudgetActiveForStartMonth(budgetMonth, startMonth) {
  const month = normalizeBudgetMonth(budgetMonth);
  const start = normalizeBudgetMonth(startMonth);
  return !isBudgetMonthAfter(start, month);
}

function isOverallBudgetActiveForMonth(budgetMonth, startMonth) {
  return isBudgetActiveForStartMonth(budgetMonth, startMonth);
}

function getBudgetMonthNavigation(selectedMonth, startMonth) {
  const month = normalizeBudgetMonth(selectedMonth);
  const start = normalizeBudgetMonth(startMonth);
  const isInactiveMonth = isBudgetMonthAfter(start, month);

  return {
    isInactiveMonth,
    backMonth: isInactiveMonth ? start : month,
    startMonth: start,
  };
}

function computeOverallRolloverIntoMonth(
  baseBudget,
  startMonth,
  targetMonth,
  monthlySpendingByMonth,
  rolloverOverrides = {}
) {
  const month = normalizeBudgetMonth(targetMonth);
  const normalizedStart = normalizeBudgetMonth(startMonth);

  if (isBudgetMonthAfter(normalizedStart, month) || normalizedStart === month) return 0;

  let carryBalance = 0;
  let walkMonth = normalizedStart;

  while (true) {
    const incomingRollover =
      walkMonth === normalizedStart
        ? 0
        : Object.prototype.hasOwnProperty.call(rolloverOverrides, walkMonth)
          ? Number(rolloverOverrides[walkMonth] || 0)
          : carryBalance;
    const spent = Number(monthlySpendingByMonth[walkMonth] || 0);
    const available = Number(baseBudget) + incomingRollover;
    const endBalance = available - spent;

    const nextMonth = addBudgetMonths(walkMonth, 1);
    if (nextMonth === month) {
      if (Object.prototype.hasOwnProperty.call(rolloverOverrides, month)) {
        return Number(rolloverOverrides[month] || 0);
      }
      return endBalance;
    }
    if (isBudgetMonthAfter(nextMonth, month)) {
      return 0;
    }

    carryBalance = endBalance;
    walkMonth = nextMonth;
  }
}

function calculateOverallBudgetForMonth(
  overallBudget,
  targetMonth,
  monthlySpendingByMonth,
  rolloverOverrides = {}
) {
  const month = normalizeBudgetMonth(targetMonth);
  const startMonth = normalizeBudgetMonth(
    overallBudget.startMonth || getCurrentBudgetMonth()
  );

  if (!isOverallBudgetActiveForMonth(month, startMonth)) {
    return null;
  }

  const baseBudget = Number(overallBudget.budgetAmount);
  const currentMonthSpent = Number(monthlySpendingByMonth[month] || 0);
  const rolloverEnabled = Number(overallBudget.rolloverEnabled) === 1;

  let rolledOverFromLastMonth = 0;
  if (rolloverEnabled && month !== startMonth) {
    rolledOverFromLastMonth = computeOverallRolloverIntoMonth(
      baseBudget,
      startMonth,
      month,
      monthlySpendingByMonth,
      rolloverOverrides
    );
  }

  const availableBudget = rolloverEnabled
    ? baseBudget + rolledOverFromLastMonth
    : baseBudget;
  const leftToSpend = availableBudget - currentMonthSpent;

  return {
    baseBudget,
    currentMonthSpent,
    rolledOverFromLastMonth: rolloverEnabled ? rolledOverFromLastMonth : 0,
    availableBudget,
    leftToSpend,
    isOverspent: leftToSpend < 0,
    rolloverEnabled,
  };
}

function mapOverallBudgetCalculation(calc) {
  const usedPct =
    calc.availableBudget > 0
      ? Math.round((calc.currentMonthSpent / calc.availableBudget) * 100)
      : 0;
  const status = getCategoryBudgetStatus(usedPct);

  return {
    budgeted: calc.baseBudget,
    availableBudget: calc.availableBudget,
    rollover: calc.rolledOverFromLastMonth,
    rolloverEnabled: calc.rolloverEnabled,
    actual: calc.currentMonthSpent,
    remaining: calc.leftToSpend,
    usedPct,
    overspent: calc.isOverspent,
    overspentAmount: calc.isOverspent ? Math.abs(calc.leftToSpend) : 0,
    statusMessage: getCategoryStatusMessage(calc.leftToSpend),
    statusKey: status.key,
    statusBarClass: status.barClass,
    statusBadgeClass: status.badgeClass,
    warningMessage: status.warningMessage,
    showWarning: status.showWarning,
  };
}

async function createCategoryBudget(categoryId, amount, rolloverEnabled = false) {
  const existing = await getActiveBudgetForCategory(categoryId);
  if (existing) {
    const err = new Error(
      "This category already has an active budget. Edit the existing budget instead."
    );
    err.code = "DUPLICATE";
    throw err;
  }

  const isRecurring = await usesRecurringBudgetSchema();
  if (!isRecurring) {
    return setCategoryBudget(categoryId, getCurrentBudgetMonth(), amount);
  }

  try {
    const userId = requireUserId();
    await db.query(
      `INSERT INTO category_budgets (
        category_id,
        budget_limit,
        budget_month,
        is_active,
        rollover_enabled,
        user_id
      ) VALUES (?, ?, ?, 1, ?, ?)`,
      [
        Number(categoryId),
        amount,
        getCurrentBudgetMonth(),
        rolloverEnabled ? 1 : 0,
        userId,
      ]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const dupErr = new Error(
        "This category already has an active budget. Edit the existing budget instead."
      );
      dupErr.code = "DUPLICATE";
      throw dupErr;
    }
    throw error;
  }
}

async function updateCategoryBudget(categoryId, amount, rolloverEnabled) {
  const isRecurring = await usesRecurringBudgetSchema();
  if (!isRecurring) {
    return setCategoryBudget(categoryId, getCurrentBudgetMonth(), amount);
  }

  const existing = await getActiveBudgetForCategory(categoryId);
  if (!existing) {
    const err = new Error("No active budget found for this category.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const rolloverValue =
    rolloverEnabled === undefined ? (existing.rolloverEnabled ? 1 : 0) : rolloverEnabled ? 1 : 0;

  const userId = requireUserId();
  await db.query(
    `UPDATE category_budgets
    SET budget_limit = ?, rollover_enabled = ?, is_active = 1
    WHERE category_id = ? AND is_active = 1 AND user_id = ?`,
    [amount, rolloverValue, Number(categoryId), userId]
  );
}

async function clearRolloverOverridesForCategoryBudget(categoryBudgetId) {
  if (categoryBudgetId == null) return;

  try {
    await ensureRolloverOverridesTable();
    await db.query(
      `DELETE FROM budget_rollover_overrides WHERE category_budget_id = ?`,
      [categoryBudgetId]
    );
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return;
    throw error;
  }
}

async function setCategoryBudgetRollover(categoryId, enabled) {
  const isRecurring = await usesRecurringBudgetSchema();
  if (!isRecurring) {
    const err = new Error("Rollover is not supported on this database schema.");
    err.code = "NOT_SUPPORTED";
    throw err;
  }

  const existing = await getActiveBudgetForCategory(categoryId);
  if (!existing) {
    const err = new Error("No active budget found for this category.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const userId = requireUserId();
  await db.query(
    `UPDATE category_budgets
    SET rollover_enabled = ?
    WHERE category_id = ? AND is_active = 1 AND user_id = ?`,
    [enabled ? 1 : 0, Number(categoryId), userId]
  );

  if (!enabled && existing.id != null) {
    await clearRolloverOverridesForCategoryBudget(existing.id);
  }
}

async function getRolloverOverridesForBudgetIds(categoryBudgetIds) {
  const ids = (categoryBudgetIds || []).filter((id) => id != null);
  if (!ids.length) return {};

  try {
    await ensureRolloverOverridesTable();
  } catch (error) {
    console.warn("Could not ensure budget_rollover_overrides table:", error.message);
    return {};
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await db.query(
    `SELECT
      category_budget_id AS categoryBudgetId,
      reset_month AS resetMonth,
      CAST(override_rollover_amount AS DECIMAL(10,2)) AS overrideAmount
    FROM budget_rollover_overrides
    WHERE category_budget_id IN (${placeholders})`,
    ids
  );

  const map = {};
  rows.forEach((row) => {
    const key = String(row.categoryBudgetId);
    if (!map[key]) map[key] = {};
    map[key][row.resetMonth] = Number(row.overrideAmount);
  });
  return map;
}

async function getRolloverOverridesForBudget(budgetEntry) {
  if (!budgetEntry || budgetEntry.id == null) return {};
  const map = await getRolloverOverridesForBudgetIds([budgetEntry.id]);
  return map[String(budgetEntry.id)] || {};
}

async function resetRolloverForMonth(categoryId, budgetMonth) {
  const isRecurring = await usesRecurringBudgetSchema();
  if (!isRecurring) {
    const err = new Error("Rollover is not supported on this database schema.");
    err.code = "NOT_SUPPORTED";
    throw err;
  }

  const existing = await getActiveBudgetForCategory(categoryId);
  if (!existing) {
    const err = new Error("No active budget found for this category.");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!existing.rolloverEnabled) {
    const err = new Error("Rollover must be enabled to reset rollover for a month.");
    err.code = "ROLLOVER_OFF";
    throw err;
  }

  if (existing.id == null) {
    const err = new Error("Budget record id is missing.");
    err.code = "NOT_FOUND";
    throw err;
  }

  await ensureRolloverOverridesTable();

  const month = normalizeBudgetMonth(budgetMonth);
  await db.query(
    `INSERT INTO budget_rollover_overrides (
      category_budget_id,
      reset_month,
      override_rollover_amount
    ) VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE override_rollover_amount = 0`,
    [existing.id, month]
  );
}

async function undoResetRolloverForMonth(categoryId, budgetMonth) {
  const isRecurring = await usesRecurringBudgetSchema();
  if (!isRecurring) {
    const err = new Error("Rollover is not supported on this database schema.");
    err.code = "NOT_SUPPORTED";
    throw err;
  }

  const existing = await getActiveBudgetForCategory(categoryId);
  if (!existing) {
    const err = new Error("No active budget found for this category.");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!existing.rolloverEnabled) {
    const err = new Error("Rollover must be enabled to undo reset rollover for a month.");
    err.code = "ROLLOVER_OFF";
    throw err;
  }

  if (existing.id == null) {
    const err = new Error("Budget record id is missing.");
    err.code = "NOT_FOUND";
    throw err;
  }

  await ensureRolloverOverridesTable();

  const month = normalizeBudgetMonth(budgetMonth);
  await db.query(
    `DELETE FROM budget_rollover_overrides
    WHERE category_budget_id = ? AND reset_month = ?`,
    [existing.id, month]
  );
}

async function setCategoryBudget(categoryId, budgetMonth, amount) {
  try {
    const isRecurring = await usesRecurringBudgetSchema();
    if (isRecurring) {
      const existing = await getActiveBudgetForCategory(categoryId);
      if (existing) {
        return updateCategoryBudget(categoryId, amount, existing.rolloverEnabled);
      }
      return createCategoryBudget(categoryId, amount, false);
    }

    const userId = requireUserId();
    await db.query(
      `INSERT INTO category_budgets (category_id, budget_limit, budget_month, user_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE budget_limit = VALUES(budget_limit)`,
      [Number(categoryId), amount, budgetMonth, userId]
    );
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.error(
        "Cannot save category budgets: category_budgets table is missing. Run docs/database.sql:",
        error.message
      );
    }
    throw error;
  }
}

async function setCategoryBudgets(budgetMonth, budgetsByCategoryId) {
  for (const [categoryId, amount] of Object.entries(budgetsByCategoryId)) {
    const limit = Number(amount);
    if (Number.isNaN(limit) || limit < 0) {
      throw new Error(`Invalid budget for category ${categoryId}`);
    }
    if (limit === 0) {
      await deactivateCategoryBudget(categoryId, budgetMonth);
      continue;
    }
    await setCategoryBudget(categoryId, budgetMonth, limit);
  }
}

async function getSpendingTotalsByCategoryId(budgetMonth) {
  if (!budgetMonth) return {};

  const userId = requireUserId();
  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);

  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE expense_date >= ? AND expense_date < ?
      AND user_id = ?
      ${CATEGORY_BUDGET_COUNTED_EXPENSE_WHERE}
    GROUP BY category_id`,
    [startDate, endExclusive, userId]
  );

  const totals = {};
  rows.forEach((row) => {
    totals[String(row.categoryId)] = Number(row.total);
  });
  return totals;
}

/** Per-category totals for All Categories Budget (excludes is_excluded_from_all_budget). */
async function getAllBudgetSpendingTotalsByCategoryId(budgetMonth) {
  if (!budgetMonth) return {};

  const userId = requireUserId();
  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);

  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE expense_date >= ? AND expense_date < ?
      AND user_id = ?
      ${ALL_BUDGET_COUNTED_EXPENSE_WHERE}
    GROUP BY category_id`,
    [startDate, endExclusive, userId]
  );

  const totals = {};
  rows.forEach((row) => {
    totals[String(row.categoryId)] = Number(row.total);
  });
  return totals;
}

/** All expense amounts by category — ignores is_excluded_from_budget (for Everything Else). */
async function getActualSpendingTotalsByCategoryId(budgetMonth) {
  if (!budgetMonth) return {};

  const userId = requireUserId();
  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);

  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE expense_date >= ? AND expense_date < ?
      AND user_id = ?
    GROUP BY category_id`,
    [startDate, endExclusive, userId]
  );

  const totals = {};
  rows.forEach((row) => {
    totals[String(row.categoryId)] = Number(row.total);
  });
  return totals;
}

function getCategoryActualSpent(spendingByCategoryId, category) {
  if (!spendingByCategoryId || !category) return 0;
  return spendingByCategoryId[String(category.id)] || 0;
}

async function getCategoryExpensesForMonthFromDb(categoryId, budgetMonth) {
  const userId = requireUserId();
  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.category_id = ?
      AND e.expense_date >= ?
      AND e.expense_date < ?
      AND e.user_id = ?
    ORDER BY e.expense_date DESC, e.id DESC`,
    [Number(categoryId), startDate, endExclusive, userId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath ? String(row.imagePath) : "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: row.category_name,
  }));
}

async function getCategoryExpensesAllFromDb(categoryId) {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.category_id = ? AND e.user_id = ?
    ORDER BY e.expense_date DESC, e.id DESC`,
    [Number(categoryId), userId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath ? String(row.imagePath) : "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: row.category_name,
  }));
}

async function getCategoryMonthlyTotalsFromDb(categoryId) {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      DATE_FORMAT(expense_date, '%Y-%m') AS budgetMonth,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE category_id = ? AND user_id = ?
      ${CATEGORY_BUDGET_COUNTED_EXPENSE_WHERE}
    GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
    ORDER BY budgetMonth ASC`,
    [Number(categoryId), userId]
  );

  const totals = {};
  rows.forEach((row) => {
    totals[row.budgetMonth] = Number(row.total);
  });
  return totals;
}

async function getBudgetRows(budgetMonth, categories, spendingByCategoryId) {
  const budgets = await getActiveCategoryBudgets();
  const month = normalizeBudgetMonth(budgetMonth);
  const rolloverBudgetIds = budgets
    .filter((b) => b.rolloverEnabled && b.id != null)
    .map((b) => b.id);
  const overridesByBudgetId = await getRolloverOverridesForBudgetIds(rolloverBudgetIds);

  const rowPromises = budgets.map(async (budgetEntry) => {
      if (!isBudgetActiveForMonth(budgetEntry, month)) return null;

      const cat = categories.find(
        (c) => String(c.id) === String(budgetEntry.categoryId)
      );
      if (!cat) return null;

      let rollover = 0;
      if (budgetEntry.rolloverEnabled) {
        const startMonth = getCategoryBudgetStartMonth(budgetEntry);
        if (startMonth !== month) {
          const monthlyTotals = await getCategoryMonthlyTotalsFromDb(
            budgetEntry.categoryId
          );
          const rolloverOverrides =
            overridesByBudgetId[String(budgetEntry.id)] || {};
          rollover = computeRolloverAmount(
            budgetEntry,
            month,
            monthlyTotals,
            rolloverOverrides
          );
        }
      }

      const actual = getCategoryActualSpent(spendingByCategoryId, cat);
      const amounts = buildBudgetAmounts(
        budgetEntry.budgetLimit,
        actual,
        budgetEntry.rolloverEnabled,
        rollover
      );
      const status = getCategoryBudgetStatus(amounts.usedPct);

      return {
        categoryId: cat.id,
        name: cat.name,
        displayName: getDisplayCategoryName(cat.name),
        icon: cat.icon,
        iconImage: cat.iconImage || null,
        isCustom: isCustomCategory(cat),
        color: cat.color,
        budgeted: amounts.baseBudget,
        availableBudget: amounts.availableBudget,
        rollover: amounts.rollover,
        rolloverEnabled: budgetEntry.rolloverEnabled,
        actual: amounts.actual,
        remaining: amounts.remaining,
        usedPct: amounts.usedPct,
        overspent: amounts.overspent,
        statusMessage: getCategoryStatusMessage(amounts.remaining),
        statusLabel: status.label,
        statusKey: status.key,
        statusBarClass: status.barClass,
        statusBadgeClass: status.badgeClass,
        statusCardClass: status.cardClass,
        warningMessage: status.warningMessage,
        showWarning: status.showWarning,
      };
    });

  const rows = await Promise.all(rowPromises);
  return rows.filter(Boolean);
}

function getCategorySpendingRows(spendingByCategoryId, categories) {
  const rows = categories
    .map((cat) => ({
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      actual: getCategoryActualSpent(spendingByCategoryId, cat),
      expenseCount: 0,
    }))
    .filter((row) => row.actual > 0)
    .sort((a, b) => b.actual - a.actual);

  const maxActual = rows.length ? Math.max(...rows.map((row) => row.actual)) : 0;

  return rows.map((row) => ({
    ...row,
    relativePct: maxActual > 0 ? Math.round((row.actual / maxActual) * 100) : 0,
  }));
}

async function getCategorySetupRows(budgetMonth, categories) {
  const budgets = await getActiveCategoryBudgets();
  const budgetMap = {};
  budgets.forEach((b) => {
    budgetMap[b.categoryId] = b.budgetLimit;
  });

  return categories.map((cat) => ({
    categoryId: cat.id,
    name: cat.name,
    icon: cat.icon,
    budgeted: budgetMap[cat.id] !== undefined ? budgetMap[cat.id] : "",
  }));
}

async function hasCategoryBudgetsForMonth(budgetMonth) {
  const budgets = await getActiveCategoryBudgets();
  const month = normalizeBudgetMonth(budgetMonth);
  return budgets.some((b) => isBudgetActiveForMonth(b, month));
}

async function hasActiveCategoryBudgets() {
  return hasCategoryBudgetsForMonth();
}

function getEverythingElseData(
  categories,
  budgetedCategoryIds,
  actualSpendingByCategoryId
) {
  const budgetedIds = new Set(budgetedCategoryIds.map(String));

  let totalAmount = 0;
  let categoryCount = 0;

  categories.forEach((cat) => {
    if (budgetedIds.has(String(cat.id))) return;
    const amount = getCategoryActualSpent(actualSpendingByCategoryId, cat);
    if (amount > 0) {
      totalAmount += amount;
      categoryCount += 1;
    }
  });

  return {
    amount: totalAmount,
    categoryCount,
    label: categoryCount === 1 ? "1 other category" : categoryCount + " other categories",
  };
}

function getBudgetTotals(categoryRows) {
  let totalSpent = 0;
  let totalBudgeted = 0;

  categoryRows.forEach((row) => {
    totalSpent += row.actual;
    totalBudgeted +=
      row.availableBudget !== undefined ? row.availableBudget : row.budgeted;
  });

  return { totalSpent, totalBudgeted };
}

async function getAvailableCategoriesForBudget(budgetMonth, categories, spendingByCategoryId) {
  const budgets = await getActiveCategoryBudgets();
  const month = normalizeBudgetMonth(budgetMonth);
  const budgetedIds = new Set(
    budgets
      .filter((b) => isBudgetActiveForMonth(b, month))
      .map((b) => String(b.categoryId))
  );

  return categories
    .map((cat) => {
      const isCustom = isCustomCategory(cat);
      const generalIconUrl = isCustom
        ? null
        : getCategoryImageUrl(cat.name, cat.icon) || null;

      return {
        id: cat.id,
        name: cat.name,
        displayName: getDisplayCategoryName(cat.name),
        icon: cat.icon,
        iconImage: cat.iconImage || null,
        generalIconUrl,
        color: cat.color,
        spentThisMonth: getCategoryActualSpent(spendingByCategoryId, cat),
        hasBudget: budgetedIds.has(String(cat.id)),
        isCustom,
      };
    })
    .sort((a, b) => {
      if (a.hasBudget !== b.hasBudget) return a.hasBudget ? -1 : 1;
      return compareCategoriesForSort(a, b);
    });
}

async function deactivateCategoryBudget(categoryId, budgetMonth) {
  const userId = requireUserId();
  const isRecurring = await usesRecurringBudgetSchema();
  if (isRecurring) {
    await db.query(
      "UPDATE category_budgets SET is_active = 0 WHERE category_id = ? AND is_active = 1 AND user_id = ?",
      [Number(categoryId), userId]
    );
    return;
  }

  await db.query(
    "DELETE FROM category_budgets WHERE category_id = ? AND budget_month = ? AND user_id = ?",
    [Number(categoryId), budgetMonth || getCurrentBudgetMonth(), userId]
  );
}

async function deleteCategoryBudget(categoryId, budgetMonth) {
  return deactivateCategoryBudget(categoryId, budgetMonth);
}

function addBudgetMonths(budgetMonth, delta) {
  const [year, month] = budgetMonth.split("-").map(Number);
  let m = month + delta;
  let y = year;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Latest month shown on detail charts — includes selected month and future expense months. */
function getChartEndMonth(selectedMonth, date = new Date()) {
  let endMonth = getCurrentBudgetMonth(date);

  if (selectedMonth) {
    const normalized = normalizeBudgetMonth(selectedMonth);
    if (isBudgetMonthAfter(normalized, endMonth)) {
      endMonth = normalized;
    }
  }

  return endMonth;
}

function isBudgetMonthAfter(a, b) {
  return String(a).localeCompare(String(b)) > 0;
}

function formatChartAmount(amount) {
  const num = Number(amount) || 0;
  if (num <= 0) return "$0";
  if (num >= 1000) {
    const k = num / 1000;
    const text = k.toFixed(2).replace(/\.?0+$/, "");
    return "-$" + text + "k";
  }
  if (num % 1 === 0) return "-$" + num.toLocaleString();
  return "-$" + num.toFixed(2);
}

function buildYearSpans(slots) {
  const spans = [];
  let currentYear = null;
  let count = 0;

  slots.forEach((slot, index) => {
    if (slot.year !== currentYear) {
      if (currentYear !== null) {
        spans.push({ year: currentYear, span: count });
      }
      currentYear = slot.year;
      count = 1;
    } else {
      count += 1;
    }

    if (index === slots.length - 1) {
      spans.push({ year: currentYear, span: count });
    }
  });

  return spans;
}

async function buildMonthlyChartDataFromDb(categoryId, selectedMonth) {
  const monthlyTotals = await getCategoryMonthlyTotalsFromDb(categoryId);
  return buildMonthlyChartDataFromTotals(monthlyTotals, selectedMonth);
}

async function getAllMonthlyTotalsFromDb() {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      DATE_FORMAT(expense_date, '%Y-%m') AS budgetMonth,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE user_id = ?
      ${ALL_BUDGET_COUNTED_EXPENSE_WHERE}
    GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
    ORDER BY budgetMonth ASC`,
    [userId]
  );

  const totals = {};
  rows.forEach((row) => {
    totals[row.budgetMonth] = Number(row.total);
  });
  return totals;
}

function buildMonthlyChartDataFromTotals(monthlyTotals, selectedMonth) {
  let graphEndMonth = getChartEndMonth(selectedMonth);
  const DEFAULT_MONTHS_BACK = 12;
  let graphStartMonth = addBudgetMonths(graphEndMonth, -DEFAULT_MONTHS_BACK);

  Object.keys(monthlyTotals).forEach((monthKey) => {
    if (isBudgetMonthAfter(monthKey, graphEndMonth)) {
      graphEndMonth = monthKey;
    }
    if (monthKey < graphStartMonth) {
      graphStartMonth = monthKey;
    }
  });

  if (isBudgetMonthAfter(graphStartMonth, graphEndMonth)) {
    graphStartMonth = graphEndMonth;
  }

  const slots = [];
  let current = graphStartMonth;

  while (!isBudgetMonthAfter(current, graphEndMonth)) {
    const [year, month] = current.split("-").map(Number);
    const amount = monthlyTotals[current] || 0;

    slots.push({
      budgetMonth: current,
      label: MONTH_NAMES[month - 1].slice(0, 3).toUpperCase(),
      monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      year,
      amount,
    });

    current = addBudgetMonths(current, 1);
  }

  const maxAmount = Math.max(...slots.map((s) => s.amount), 1);

  return {
    bars: slots.map((slot) => ({
      ...slot,
      relativePct: slot.amount > 0 ? Math.max(Math.round((slot.amount / maxAmount) * 100), 8) : 0,
      formattedAmount: formatChartAmount(slot.amount),
    })),
    yearSpans: buildYearSpans(slots),
  };
}

async function buildOverallMonthlyChartDataFromDb(selectedMonth) {
  const monthlyTotals = await getAllMonthlyTotalsFromDb();
  return buildMonthlyChartDataFromTotals(monthlyTotals, selectedMonth);
}

async function getAllExpensesFromDb() {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.user_id = ?
    ORDER BY e.expense_date DESC, e.id DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath ? String(row.imagePath) : "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: row.category_name,
    categoryDisplayName: getDisplayCategoryName(row.category_name),
  }));
}

async function getAllExpensesForMonthFromDb(budgetMonth) {
  const userId = requireUserId();
  const month = normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = getBudgetMonthDateRange(month);

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.expense_date >= ? AND e.expense_date < ? AND e.user_id = ?
    ORDER BY e.expense_date DESC, e.id DESC`,
    [startDate, endExclusive, userId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath ? String(row.imagePath) : "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: row.category_name,
    categoryDisplayName: getDisplayCategoryName(row.category_name),
  }));
}

async function getUnbudgetedExpensesFromDb(budgetMonth, budgetedCategoryIds) {
  const userId = requireUserId();
  const month = normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = getBudgetMonthDateRange(month);
  const excludedIds = (budgetedCategoryIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  let query = `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color,
      c.icon_image AS category_icon_image,
      c.is_custom AS category_is_custom
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.expense_date >= ? AND e.expense_date < ? AND e.user_id = ?`;
  const params = [startDate, endExclusive, userId];

  if (excludedIds.length) {
    query += ` AND e.category_id NOT IN (${excludedIds.map(() => "?").join(",")})`;
    params.push(...excludedIds);
  }

  query += " ORDER BY e.expense_date DESC, e.id DESC";

  const [rows] = await db.query(query, params);

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath ? String(row.imagePath) : "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    categoryIconImage: row.category_icon_image || null,
    categoryIsCustom: Number(row.category_is_custom) === 1,
    accountLabel: "Cash",
  }));
}

function groupTransactionsByDate(transactions) {
  const groups = [];
  const groupMap = {};

  transactions.forEach((tx) => {
    const dateKey = tx.date ? String(tx.date).slice(0, 10) : "unknown";
    if (!groupMap[dateKey]) {
      const [year, month, day] = dateKey.split("-").map(Number);
      const dateLabel =
        year && month && day
          ? `${MONTH_NAMES[month - 1]} ${day}, ${year}`
          : dateKey;

      groupMap[dateKey] = {
        date: dateKey,
        dateLabel,
        dayTotal: 0,
        transactions: [],
      };
      groups.push(groupMap[dateKey]);
    }

    groupMap[dateKey].dayTotal += Number(tx.amount) || 0;
    groupMap[dateKey].transactions.push(tx);
  });

  return groups;
}

async function getUnbudgetedTransactionMonths() {
  const budgets = await getActiveCategoryBudgets();
  const budgetByCategoryId = {};
  budgets.forEach((budget) => {
    budgetByCategoryId[String(budget.categoryId)] = budget;
  });

  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      DATE_FORMAT(expense_date, '%Y-%m') AS budgetMonth
    FROM expenses
    WHERE user_id = ?
    ORDER BY expense_date ASC`,
    [userId]
  );

  const months = new Set();
  rows.forEach((row) => {
    if (!row.budgetMonth) return;
    const month = normalizeBudgetMonth(row.budgetMonth);
    const budget = budgetByCategoryId[String(row.categoryId)];
    if (!budget || !isBudgetActiveForMonth(budget, month)) {
      months.add(month);
    }
  });

  return Array.from(months).sort();
}

async function getEverythingElseMonthOptions(selectedMonth) {
  const selected = normalizeBudgetMonth(selectedMonth);
  const unbudgetedMonths = await getUnbudgetedTransactionMonths();

  if (!unbudgetedMonths.length) {
    return [
      {
        value: selected,
        label: formatBudgetMonthLabel(selected),
      },
    ];
  }

  let minMonth = unbudgetedMonths[0];
  let maxMonth = unbudgetedMonths[unbudgetedMonths.length - 1];

  if (selected < minMonth) minMonth = selected;
  if (selected > maxMonth) maxMonth = selected;

  const options = [];
  let cursor = minMonth;
  while (cursor <= maxMonth) {
    options.push({
      value: cursor,
      label: formatBudgetMonthLabel(cursor),
    });
    cursor = addBudgetMonths(cursor, 1);
  }

  return options;
}

async function getEverythingElseDetailData(budgetMonth, categories) {
  const month = normalizeBudgetMonth(budgetMonth);
  const budgets = await getActiveCategoryBudgets();
  const budgetedCategoryIds = budgets
    .filter((b) => isBudgetActiveForMonth(b, month))
    .map((b) => b.categoryId);
  const rawTransactions = await getUnbudgetedExpensesFromDb(
    month,
    budgetedCategoryIds
  );

  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[String(cat.id)] = cat;
  });

  const transactions = rawTransactions
    .map((tx) => {
      const cat = categoryMap[String(tx.categoryId)] || {};
      return {
        ...tx,
        categoryDisplayName: getDisplayCategoryName(tx.category || cat.name),
        categoryIcon: tx.categoryIcon || cat.icon,
        categoryIconImage: cat.iconImage || tx.categoryIconImage || null,
        categoryColor: cat.isCustom ? (tx.categoryColor || cat.color) : "",
        categoryIsCustom: Boolean(cat.isCustom),
        accountLabel: tx.accountLabel || "Cash",
      };
    })
    .filter((tx) => isExpenseInBudgetMonth(tx.date, month));

  let totalAmount = 0;
  const unbudgetedCategoryIds = new Set();
  transactions.forEach((tx) => {
    totalAmount += Number(tx.amount) || 0;
    if (tx.categoryId) unbudgetedCategoryIds.add(String(tx.categoryId));
  });

  const categoryCount = unbudgetedCategoryIds.size;

  return {
    budgetMonth: month,
    totalAmount,
    transactionCount: transactions.length,
    transactions,
    dateGroups: groupTransactionsByDate(transactions),
    categoryCount,
    label:
      categoryCount === 1
        ? "1 other category"
        : categoryCount + " other categories",
  };
}

async function getCategoryDetailData(categoryId, budgetMonth, spendingByCategoryId, categories) {
  const category = categories.find((cat) => String(cat.id) === String(categoryId));
  if (!category) return null;

  const budgetEntry = await getActiveBudgetForCategory(categoryId);
  if (!budgetEntry) return null;

  const month = normalizeBudgetMonth(budgetMonth);
  const startMonth = getCategoryBudgetStartMonth(budgetEntry);
  if (!isBudgetActiveForMonth(budgetEntry, month)) {
    return {
      inactive: true,
      startMonth,
      category: {
        id: category.id,
        name: category.name,
        displayName: getDisplayCategoryName(category.name),
        icon: category.icon,
        iconImage: category.iconImage || null,
        color: category.color,
      },
    };
  }

  let rollover = 0;
  let rolloverResetForMonth = false;
  if (budgetEntry.rolloverEnabled) {
    if (startMonth !== month) {
      const monthlyTotals = await getCategoryMonthlyTotalsFromDb(categoryId);
      const rolloverOverrides = await getRolloverOverridesForBudget(budgetEntry);
      rolloverResetForMonth = Object.prototype.hasOwnProperty.call(
        rolloverOverrides,
        month
      );
      rollover = computeRolloverAmount(
        budgetEntry,
        month,
        monthlyTotals,
        rolloverOverrides
      );
    }
  }

  const actual = getCategoryActualSpent(spendingByCategoryId, category);
  const amounts = buildBudgetAmounts(
    budgetEntry.budgetLimit,
    actual,
    budgetEntry.rolloverEnabled,
    rollover
  );
  const status = getCategoryBudgetStatus(amounts.usedPct);

  const [allExpenses, chart] = await Promise.all([
    getCategoryExpensesAllFromDb(categoryId),
    buildMonthlyChartDataFromDb(categoryId, month),
  ]);

  let totalAmount = 0;
  let countedCount = 0;
  let largestTransaction = 0;
  allExpenses.forEach((exp) => {
    if (!isExpenseCountedForBudget(exp)) return;
    const amount = Number(exp.amount) || 0;
    totalAmount += amount;
    countedCount += 1;
    if (amount > largestTransaction) largestTransaction = amount;
  });

  const avgTransaction = countedCount ? totalAmount / countedCount : 0;

  return {
    category: {
      id: category.id,
      name: category.name,
      displayName: getDisplayCategoryName(category.name),
      icon: category.icon,
      iconImage: category.iconImage || null,
      color: category.color,
    },
    startMonth,
    budgeted: amounts.baseBudget,
    availableBudget: amounts.availableBudget,
    rollover: amounts.rollover,
    rolloverEnabled: budgetEntry.rolloverEnabled,
    rolloverResetForMonth,
    actual: amounts.actual,
    remaining: amounts.remaining,
    usedPct: amounts.usedPct,
    overspent: amounts.overspent,
    overspentAmount: amounts.remaining < 0 ? Math.abs(amounts.remaining) : 0,
    statusMessage: getCategoryStatusMessage(amounts.remaining),
    statusKey: status.key,
    statusBarClass: status.barClass,
    statusBadgeClass: status.badgeClass,
    warningMessage: status.warningMessage,
    showWarning: status.showWarning,
    chartData: chart.bars,
    chartYearSpans: chart.yearSpans,
    transactions: allExpenses,
    transactionCount: allExpenses.length,
    totalAmount,
    avgTransaction,
    largestTransaction,
  };
}

async function getActiveOverallMonthlyBudget() {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      id,
      budget_amount AS budgetAmount,
      rollover_enabled AS rolloverEnabled,
      is_active AS isActive,
      deleted_at AS deletedAt,
      created_at AS createdAt
    FROM overall_monthly_budgets
    WHERE is_active = 1 AND deleted_at IS NULL AND user_id = ?
    ORDER BY id ASC
    LIMIT 1`,
    [userId]
  );

  if (!rows.length) return null;

  const row = rows[0];
  const startMonth = getOverallBudgetStartMonth(row.createdAt);
  return {
    id: Number(row.id),
    budgetAmount: Number(row.budgetAmount),
    rolloverEnabled: Number(row.rolloverEnabled) === 1,
    isActive: Boolean(row.isActive),
    deletedAt: row.deletedAt || null,
    startMonth,
  };
}

async function clearOverallRolloverResets(overallBudgetId) {
  if (overallBudgetId == null) return;

  try {
    await db.query(
      `DELETE FROM overall_budget_rollover_resets WHERE overall_budget_id = ?`,
      [overallBudgetId]
    );
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return;
    throw error;
  }
}

async function setOverallMonthlyBudgetRollover(enabled) {
  const existing = await getActiveOverallMonthlyBudget();
  if (!existing) {
    const err = new Error("No active All Categories Budget found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  await db.query(
    `UPDATE overall_monthly_budgets
    SET rollover_enabled = ?
    WHERE id = ? AND is_active = 1 AND deleted_at IS NULL`,
    [enabled ? 1 : 0, existing.id]
  );

  if (!enabled) {
    await clearOverallRolloverResets(existing.id);
  }
}

async function getOverallRolloverResetsForBudget(overallBudgetId) {
  if (overallBudgetId == null) return {};

  try {
    const [rows] = await db.query(
      `SELECT
        reset_month AS resetMonth,
        CAST(override_rollover_amount AS DECIMAL(10,2)) AS overrideAmount
      FROM overall_budget_rollover_resets
      WHERE overall_budget_id = ?`,
      [overallBudgetId]
    );

    const map = {};
    rows.forEach((row) => {
      map[row.resetMonth] = Number(row.overrideAmount);
    });
    return map;
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.warn("overall_budget_rollover_resets table is missing:", error.message);
      return {};
    }
    throw error;
  }
}

async function resetOverallRolloverForMonth(budgetMonth) {
  const existing = await getActiveOverallMonthlyBudget();
  if (!existing) {
    const err = new Error("No active All Categories Budget found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!existing.rolloverEnabled) {
    const err = new Error("Rollover must be enabled to reset rollover for a month.");
    err.code = "ROLLOVER_OFF";
    throw err;
  }

  const month = normalizeBudgetMonth(budgetMonth);
  await db.query(
    `INSERT INTO overall_budget_rollover_resets (
      overall_budget_id,
      reset_month,
      override_rollover_amount
    ) VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE override_rollover_amount = 0`,
    [existing.id, month]
  );
}

async function undoOverallResetRolloverForMonth(budgetMonth) {
  const existing = await getActiveOverallMonthlyBudget();
  if (!existing) {
    const err = new Error("No active All Categories Budget found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!existing.rolloverEnabled) {
    const err = new Error("Rollover must be enabled to undo reset rollover for a month.");
    err.code = "ROLLOVER_OFF";
    throw err;
  }

  const month = normalizeBudgetMonth(budgetMonth);
  try {
    await db.query(
      `DELETE FROM overall_budget_rollover_resets
      WHERE overall_budget_id = ? AND reset_month = ?`,
      [existing.id, month]
    );
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") return;
    throw error;
  }
}

async function saveOverallMonthlyBudget(amount, rolloverEnabled = false) {
  const existing = await getActiveOverallMonthlyBudget();
  const rolloverValue = rolloverEnabled ? 1 : 0;

  if (existing) {
    await db.query(
      `UPDATE overall_monthly_budgets
      SET budget_amount = ?, rollover_enabled = ?, is_active = 1, deleted_at = NULL
      WHERE id = ?`,
      [amount, rolloverValue, existing.id]
    );
    return existing.id;
  }

  const userId = requireUserId();
  const [result] = await db.query(
    `INSERT INTO overall_monthly_budgets (
      budget_amount,
      rollover_enabled,
      is_active,
      deleted_at,
      user_id
    ) VALUES (?, ?, 1, NULL, ?)`,
    [amount, rolloverValue, userId]
  );

  return result.insertId;
}

async function updateOverallMonthlyBudgetAmount(amount) {
  const existing = await getActiveOverallMonthlyBudget();
  if (!existing) {
    const err = new Error("No active All Categories Budget found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  await db.query(
    `UPDATE overall_monthly_budgets
    SET budget_amount = ?, is_active = 1, deleted_at = NULL
    WHERE id = ?`,
    [amount, existing.id]
  );

  return existing.id;
}

async function deactivateOverallMonthlyBudget() {
  const existing = await getActiveOverallMonthlyBudget();
  if (!existing) return;

  await db.query(
    `UPDATE overall_monthly_budgets
    SET is_active = 0, deleted_at = NOW()
    WHERE id = ?`,
    [existing.id]
  );
}

async function getOverallBudgetDetailData(budgetMonth) {
  const active = await getActiveOverallMonthlyBudget();
  if (!active) return null;

  const month = normalizeBudgetMonth(budgetMonth);
  if (!isOverallBudgetActiveForMonth(month, active.startMonth)) {
    return { inactive: true, startMonth: active.startMonth };
  }

  const monthlyTotals = await getAllMonthlyTotalsFromDb();
  const rolloverOverrides = await getOverallRolloverResetsForBudget(active.id);
  const calc = calculateOverallBudgetForMonth(
    active,
    month,
    monthlyTotals,
    rolloverOverrides
  );
  if (!calc) {
    return { inactive: true, startMonth: active.startMonth };
  }
  const amounts = mapOverallBudgetCalculation(calc);

  const [allExpenses, chart] = await Promise.all([
    getAllExpensesFromDb(),
    buildOverallMonthlyChartDataFromDb(month),
  ]);

  let totalAmount = 0;
  let countedCount = 0;
  let largestTransaction = 0;
  allExpenses.forEach((exp) => {
    if (!isExpenseCountedForAllBudget(exp)) return;
    const amount = Number(exp.amount) || 0;
    totalAmount += amount;
    countedCount += 1;
    if (amount > largestTransaction) largestTransaction = amount;
  });

  const avgTransaction = countedCount ? totalAmount / countedCount : 0;

  return {
    category: {
      id: null,
      name: "All Transactions",
      displayName: "All Transactions",
      iconImage: "/categoryicon/all_categories.jpg",
    },
    startMonth: active.startMonth,
    budgeted: amounts.budgeted,
    availableBudget: amounts.availableBudget,
    rollover: amounts.rollover,
    rolloverEnabled: amounts.rolloverEnabled,
    rolloverResetForMonth: Object.prototype.hasOwnProperty.call(
      rolloverOverrides,
      month
    ),
    actual: amounts.actual,
    remaining: amounts.remaining,
    usedPct: amounts.usedPct,
    overspent: amounts.overspent,
    overspentAmount: amounts.overspentAmount,
    statusMessage: amounts.statusMessage,
    statusKey: amounts.statusKey,
    statusBarClass: amounts.statusBarClass,
    statusBadgeClass: amounts.statusBadgeClass,
    warningMessage: amounts.warningMessage,
    showWarning: amounts.showWarning,
    chartData: chart.bars,
    chartYearSpans: chart.yearSpans,
    transactions: allExpenses,
    transactionCount: allExpenses.length,
    totalAmount,
    avgTransaction,
    largestTransaction,
  };
}

async function getTotalMonthSpending(budgetMonth) {
  const userId = requireUserId();
  const month = normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = getBudgetMonthDateRange(month);

  const [rows] = await db.query(
    `SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE expense_date >= ? AND expense_date < ?
      AND user_id = ?
      ${ALL_BUDGET_COUNTED_EXPENSE_WHERE}`,
    [startDate, endExclusive, userId]
  );

  return Number(rows[0].total) || 0;
}

async function getOverallBudgetSectionData(budgetMonth) {
  const active = await getActiveOverallMonthlyBudget();
  if (!active) return null;

  const month = normalizeBudgetMonth(budgetMonth);
  if (!isOverallBudgetActiveForMonth(month, active.startMonth)) {
    return null;
  }

  const monthlyTotals = await getAllMonthlyTotalsFromDb();
  const rolloverOverrides = await getOverallRolloverResetsForBudget(active.id);
  const calc = calculateOverallBudgetForMonth(
    active,
    month,
    monthlyTotals,
    rolloverOverrides
  );
  if (!calc) return null;

  const amounts = mapOverallBudgetCalculation(calc);

  return {
    spent: amounts.actual,
    budgeted: amounts.availableBudget,
    budgetSubtitle: amounts.rolloverEnabled ? "available" : "budgeted",
    card: {
      displayName: "All Transactions",
      iconImage: "/categoryicon/all_categories.jpg",
      actual: amounts.actual,
      availableBudget: amounts.availableBudget,
      baseBudget: amounts.budgeted,
      remaining: amounts.remaining,
      usedPct: amounts.usedPct,
      overspent: amounts.overspent,
      statusMessage: amounts.statusMessage,
      statusKey: amounts.statusKey,
      showWarning: amounts.showWarning,
      warningMessage: amounts.warningMessage,
      rolloverEnabled: amounts.rolloverEnabled,
      rollover: amounts.rollover,
    },
  };
}

module.exports = {
  getCurrentBudgetMonth,
  normalizeBudgetMonth,
  formatBudgetMonthLabel,
  getBudgetMonthDateRange,
  filterExpensesForMonth,
  getMonthlyBudget,
  getMonthlyBudgetTableAmount,
  setMonthlyBudget,
  getCategoryBudgets,
  getActiveCategoryBudgets,
  getActiveBudgetForCategory,
  createCategoryBudget,
  updateCategoryBudget,
  setCategoryBudgetRollover,
  resetRolloverForMonth,
  undoResetRolloverForMonth,
  setCategoryBudget,
  setCategoryBudgets,
  getBudgetRows,
  getCategorySpendingRows,
  getCategorySetupRows,
  hasCategoryBudgetsForMonth,
  hasActiveCategoryBudgets,
  getEverythingElseData,
  getBudgetTotals,
  getAvailableCategoriesForBudget,
  deleteCategoryBudget,
  deactivateCategoryBudget,
  getChartEndMonth,
  buildMonthlyChartDataFromDb,
  getCategoryDetailData,
  getEverythingElseDetailData,
  getEverythingElseMonthOptions,
  getSpendingTotalsByCategoryId,
  getAllBudgetSpendingTotalsByCategoryId,
  getActualSpendingTotalsByCategoryId,
  buildBudgetAmounts,
  isBudgetActiveForMonth,
  computeRolloverAmount,
  getActiveOverallMonthlyBudget,
  setOverallMonthlyBudgetRollover,
  resetOverallRolloverForMonth,
  undoOverallResetRolloverForMonth,
  saveOverallMonthlyBudget,
  updateOverallMonthlyBudgetAmount,
  deactivateOverallMonthlyBudget,
  isOverallBudgetActiveForMonth,
  calculateOverallBudgetForMonth,
  getTotalMonthSpending,
  getOverallBudgetSectionData,
  getOverallBudgetDetailData,
  getBudgetStartMonthFromCreatedAt,
  getBudgetMonthNavigation,
};
