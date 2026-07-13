const db = require("./config/db");
const budgetStore = require("./budgetStore");
const financeHelpers = require("./financeHelpers");
const { requireUserId } = require("./userScope");

const DEFAULT_GOAL_NAME = "Savings goal";
const MAX_GOAL_NAME_LENGTH = 120;
const MAX_AMOUNT = 99999999.99;

let savingsGoalTableReady = false;

async function ensureSavingsGoalsTable() {
  if (savingsGoalTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      user_id        INT UNSIGNED  NOT NULL,
      goal_name      VARCHAR(120)  NOT NULL DEFAULT 'Savings goal',
      target_amount  DECIMAL(10,2) NOT NULL,
      current_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      goal_month     CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
      created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_savings_goals_user_month (user_id, goal_month),
      INDEX idx_savings_goals_user_id (user_id),
      INDEX idx_savings_goals_goal_month (goal_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [userIdColumn] = await db.query(
    "SHOW COLUMNS FROM savings_goals LIKE 'user_id'"
  );

  if (!userIdColumn.length) {
    await db.query(
      "ALTER TABLE savings_goals ADD COLUMN user_id INT UNSIGNED NULL AFTER id"
    );
    try {
      await db.query("ALTER TABLE savings_goals DROP INDEX uq_savings_goals_month");
    } catch (error) {
      if (error.code !== "ER_CANT_DROP_FIELD_OR_KEY") throw error;
    }
    await db.query(
      "ALTER TABLE savings_goals ADD UNIQUE KEY uq_savings_goals_user_month (user_id, goal_month)"
    );
    await db.query(
      "ALTER TABLE savings_goals ADD INDEX idx_savings_goals_user_id (user_id)"
    );
  }

  savingsGoalTableReady = true;
}

function parseMoneyInput(value) {
  const raw = String(value ?? "").trim();
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return NaN;
  return Number(cleaned);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function getProgressWidthClass(progressPercent) {
  const width = Math.min(Math.max(Number(progressPercent) || 0, 0), 100);
  const step = Math.min(100, Math.round(width / 5) * 5);
  return `progress-bar__fill--w${step}`;
}

function getSavingsStatus(progressPercent, isComplete) {
  const pct = Number(progressPercent) || 0;

  if (isComplete) {
    return {
      label: "Goal reached",
      badge: "success",
      message: "You reached this savings goal.",
    };
  }

  if (pct >= 75) {
    return {
      label: "Almost there",
      badge: "success",
      message: "You are close to your target.",
    };
  }

  if (pct >= 40) {
    return {
      label: "In progress",
      badge: "warning",
      message: "Keep adding to this goal.",
    };
  }

  return {
    label: "Getting started",
    badge: "warning",
    message: "Small updates build momentum.",
  };
}

function mapGoalRow(row) {
  if (!row) return null;

  const targetAmount = Number(row.targetAmount);
  const currentAmount = Number(row.currentAmount);
  const progressPercent =
    targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;
  const cappedProgressPercent = Math.min(Math.max(progressPercent, 0), 100);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const isComplete = currentAmount >= targetAmount;
  const status = getSavingsStatus(progressPercent, isComplete);

  return {
    id: String(row.id),
    goalName: row.goalName || DEFAULT_GOAL_NAME,
    targetAmount,
    currentAmount,
    goalMonth: budgetStore.normalizeBudgetMonth(row.goalMonth),
    progressPercent,
    cappedProgressPercent,
    remainingAmount,
    isComplete,
    statusLabel: status.label,
    statusBadge: status.badge,
    statusMessage: status.message,
    progressWidthClass: getProgressWidthClass(cappedProgressPercent),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

function validateSavingsGoalInput(body) {
  const errors = [];
  const goalNameInput = String(body.goalName || body.goal_name || "").trim();
  const goalName = goalNameInput || DEFAULT_GOAL_NAME;
  let targetAmount = parseMoneyInput(body.targetAmount ?? body.target_amount);
  const currentRaw = body.currentAmount ?? body.current_amount;
  let currentAmount =
    currentRaw === undefined || String(currentRaw).trim() === ""
      ? 0
      : parseMoneyInput(currentRaw);
  const goalMonth = budgetStore.normalizeBudgetMonth(
    body.goalMonth || body.goal_month || budgetStore.getCurrentBudgetMonth()
  );

  // Form amounts are in the user's preferred currency; store USD (base) in the database.
  try {
    const currencyService = require("./currencyService");
    const { getRequestCurrency } = require("./requestUserContext");
    const code = getRequestCurrency() || currencyService.BASE_CURRENCY;
    if (!Number.isNaN(targetAmount)) {
      targetAmount = currencyService.convertToBase(targetAmount, code);
    }
    if (!Number.isNaN(currentAmount)) {
      currentAmount = currencyService.convertToBase(currentAmount, code);
    }
  } catch (error) {
    errors.push("Unable to convert savings amounts right now. Please try again.");
  }

  if (goalName.length > MAX_GOAL_NAME_LENGTH) {
    errors.push(`Goal name must be ${MAX_GOAL_NAME_LENGTH} characters or less.`);
  }

  if (Number.isNaN(targetAmount)) {
    errors.push("Target amount must be a valid number.");
  } else if (targetAmount <= 0) {
    errors.push("Target amount must be greater than zero.");
  } else if (targetAmount > MAX_AMOUNT) {
    errors.push("Target amount is too large.");
  }

  if (Number.isNaN(currentAmount)) {
    errors.push("Current saved amount must be a valid number.");
  } else if (currentAmount < 0) {
    errors.push("Current saved amount cannot be negative.");
  } else if (currentAmount > MAX_AMOUNT) {
    errors.push("Current saved amount is too large.");
  } else if (
    !Number.isNaN(targetAmount) &&
    targetAmount > 0 &&
    !Number.isNaN(currentAmount) &&
    currentAmount > targetAmount
  ) {
    errors.push("Saved amount cannot be greater than the target amount.");
  }

  return {
    valid: errors.length === 0,
    errors,
    values: {
      goalName,
      targetAmount: Number.isNaN(targetAmount) ? 0 : roundMoney(targetAmount),
      currentAmount: Number.isNaN(currentAmount) ? 0 : roundMoney(currentAmount),
      goalMonth,
    },
  };
}

function validateSavingsProgressInput(body, goal) {
  const errors = [];
  let amountToAdd = parseMoneyInput(
    body.amountToAdd ?? body.amount_to_add ?? body.currentAmount ?? body.current_amount
  );

  try {
    const currencyService = require("./currencyService");
    const { getRequestCurrency } = require("./requestUserContext");
    const code = getRequestCurrency() || currencyService.BASE_CURRENCY;
    if (!Number.isNaN(amountToAdd)) {
      amountToAdd = currencyService.convertToBase(amountToAdd, code);
    }
  } catch (error) {
    errors.push("Unable to convert the saved amount right now. Please try again.");
  }

  if (goal && goal.isComplete) {
    errors.push("You have already reached your savings target.");
  }

  if (Number.isNaN(amountToAdd)) {
    errors.push("Add saved amount must be a valid number.");
  } else if (amountToAdd <= 0) {
    errors.push("Add saved amount must be greater than zero.");
  } else if (amountToAdd > MAX_AMOUNT) {
    errors.push("Add saved amount is too large.");
  } else if (
    goal &&
    !Number.isNaN(amountToAdd) &&
    roundMoney(goal.currentAmount + amountToAdd) > goal.targetAmount
  ) {
    const remaining = roundMoney(goal.targetAmount - goal.currentAmount);
    let remainingLabel = remaining.toFixed(2);
    try {
      const currencyService = require("./currencyService");
      const { getRequestCurrency } = require("./requestUserContext");
      const code = getRequestCurrency() || currencyService.BASE_CURRENCY;
      remainingLabel = currencyService.formatFromBase(remaining, code);
    } catch (error) {
      // keep numeric fallback
    }
    errors.push(
      `Add saved amount cannot exceed the remaining target (${remainingLabel}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    amountToAdd: Number.isNaN(amountToAdd) ? 0 : roundMoney(amountToAdd),
  };
}

async function getGoalForMonth(goalMonth) {
  await ensureSavingsGoalsTable();
  const month = budgetStore.normalizeBudgetMonth(goalMonth);
  const userId = requireUserId();

  const [rows] = await db.query(
    `SELECT
      id,
      goal_name AS goalName,
      CAST(target_amount AS DECIMAL(10,2)) AS targetAmount,
      CAST(current_amount AS DECIMAL(10,2)) AS currentAmount,
      goal_month AS goalMonth,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM savings_goals
    WHERE goal_month = ? AND user_id = ?
    LIMIT 1`,
    [month, userId]
  );

  return mapGoalRow(rows[0]);
}

async function getGoalById(id) {
  await ensureSavingsGoalsTable();
  const userId = requireUserId();

  const [rows] = await db.query(
    `SELECT
      id,
      goal_name AS goalName,
      CAST(target_amount AS DECIMAL(10,2)) AS targetAmount,
      CAST(current_amount AS DECIMAL(10,2)) AS currentAmount,
      goal_month AS goalMonth,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM savings_goals
    WHERE id = ? AND user_id = ?
    LIMIT 1`,
    [Number(id), userId]
  );

  return mapGoalRow(rows[0]);
}

async function saveSavingsGoal(values) {
  await ensureSavingsGoalsTable();
  const goalMonth = budgetStore.normalizeBudgetMonth(values.goalMonth);
  const userId = requireUserId();

  await db.query(
    `INSERT INTO savings_goals (
      user_id,
      goal_name,
      target_amount,
      current_amount,
      goal_month
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      goal_name = VALUES(goal_name),
      target_amount = VALUES(target_amount),
      current_amount = VALUES(current_amount)`,
    [
      userId,
      values.goalName || DEFAULT_GOAL_NAME,
      roundMoney(values.targetAmount),
      roundMoney(values.currentAmount),
      goalMonth,
    ]
  );

  return getGoalForMonth(goalMonth);
}

async function updateSavingsGoalProgress(id, currentAmount) {
  await ensureSavingsGoalsTable();
  const userId = requireUserId();

  const [result] = await db.query(
    `UPDATE savings_goals
    SET current_amount = ?
    WHERE id = ? AND user_id = ?`,
    [roundMoney(currentAmount), Number(id), userId]
  );

  if (result.affectedRows === 0) {
    const err = new Error("Savings goal not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  return getGoalById(id);
}

async function addSavingsGoalProgress(id, amountToAdd) {
  const goal = await getGoalById(id);

  if (!goal) {
    const err = new Error("Savings goal not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const remaining = roundMoney(goal.targetAmount - goal.currentAmount);
  const effectiveAdd = Math.min(amountToAdd, remaining);
  const nextAmount = roundMoney(goal.currentAmount + effectiveAdd);

  if (nextAmount > MAX_AMOUNT) {
    const err = new Error("Saved amount is too large.");
    err.code = "AMOUNT_TOO_LARGE";
    throw err;
  }

  return updateSavingsGoalProgress(id, nextAmount);
}

async function deleteSavingsGoal(id) {
  await ensureSavingsGoalsTable();
  const userId = requireUserId();

  const [result] = await db.query(
    "DELETE FROM savings_goals WHERE id = ? AND user_id = ?",
    [Number(id), userId]
  );

  return result.affectedRows > 0;
}

async function getUserMonthlyIncome() {
  const userId = requireUserId();
  const [rows] = await db.query(
    "SELECT monthly_income FROM users WHERE id = ?",
    [userId]
  );

  if (!rows.length || rows[0].monthly_income == null) {
    return 0;
  }

  return Number(rows[0].monthly_income) || 0;
}

/** Profile income minus counted month expenses for the logged-in user. */
async function getEstimatedAvailableToSave(goalMonth) {
  const month = budgetStore.normalizeBudgetMonth(goalMonth);
  const [monthlyIncome, monthExpenses] = await Promise.all([
    getUserMonthlyIncome(),
    financeHelpers.getMonthlyCountedExpenseTotal(month),
  ]);

  const rawEstimate = roundMoney(monthlyIncome - monthExpenses);
  const amount = Math.max(rawEstimate, 0);

  return {
    monthlyIncome,
    monthExpenses,
    rawEstimate,
    amount,
    hasIncome: monthlyIncome > 0,
    isNegative: rawEstimate < 0,
  };
}

async function getSavingsPageData(goalMonth) {
  const month = budgetStore.normalizeBudgetMonth(goalMonth);
  const [goal, estimatedSavings] = await Promise.all([
    getGoalForMonth(month),
    getEstimatedAvailableToSave(month),
  ]);

  return {
    goal,
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
    estimatedSavings,
  };
}

module.exports = {
  ensureSavingsGoalsTable,
  validateSavingsGoalInput,
  validateSavingsProgressInput,
  getGoalForMonth,
  getGoalById,
  getEstimatedAvailableToSave,
  saveSavingsGoal,
  updateSavingsGoalProgress,
  addSavingsGoalProgress,
  deleteSavingsGoal,
  getSavingsPageData,
};
