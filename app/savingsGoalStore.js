const db = require("./config/db");
const budgetStore = require("./budgetStore");

const DEFAULT_GOAL_NAME = "Savings goal";
const MAX_GOAL_NAME_LENGTH = 120;
const MAX_AMOUNT = 99999999.99;

let savingsGoalTableReady = false;

async function ensureSavingsGoalsTable() {
  if (savingsGoalTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      goal_name      VARCHAR(120)  NOT NULL DEFAULT 'Savings goal',
      target_amount  DECIMAL(10,2) NOT NULL,
      current_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      goal_month     CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
      created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_savings_goals_month (goal_month),
      INDEX idx_savings_goals_goal_month (goal_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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
  const targetAmount = parseMoneyInput(body.targetAmount ?? body.target_amount);
  const currentRaw = body.currentAmount ?? body.current_amount;
  const currentAmount =
    currentRaw === undefined || String(currentRaw).trim() === ""
      ? 0
      : parseMoneyInput(currentRaw);
  const goalMonth = budgetStore.normalizeBudgetMonth(
    body.goalMonth || body.goal_month || budgetStore.getCurrentBudgetMonth()
  );

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

function validateSavingsProgressInput(body) {
  const errors = [];
  const amountToAdd = parseMoneyInput(
    body.amountToAdd ?? body.amount_to_add ?? body.currentAmount ?? body.current_amount
  );

  if (Number.isNaN(amountToAdd)) {
    errors.push("Amount saved must be a valid number.");
  } else if (amountToAdd <= 0) {
    errors.push("Amount saved must be greater than zero.");
  } else if (amountToAdd > MAX_AMOUNT) {
    errors.push("Amount saved is too large.");
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
    WHERE goal_month = ?
    LIMIT 1`,
    [month]
  );

  return mapGoalRow(rows[0]);
}

async function getGoalById(id) {
  await ensureSavingsGoalsTable();

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
    WHERE id = ?
    LIMIT 1`,
    [Number(id)]
  );

  return mapGoalRow(rows[0]);
}

async function saveSavingsGoal(values) {
  await ensureSavingsGoalsTable();
  const goalMonth = budgetStore.normalizeBudgetMonth(values.goalMonth);

  await db.query(
    `INSERT INTO savings_goals (
      goal_name,
      target_amount,
      current_amount,
      goal_month
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      goal_name = VALUES(goal_name),
      target_amount = VALUES(target_amount),
      current_amount = VALUES(current_amount)`,
    [
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

  const [result] = await db.query(
    `UPDATE savings_goals
    SET current_amount = ?
    WHERE id = ?`,
    [roundMoney(currentAmount), Number(id)]
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

  const nextAmount = roundMoney(goal.currentAmount + amountToAdd);

  if (nextAmount > MAX_AMOUNT) {
    const err = new Error("Saved amount is too large.");
    err.code = "AMOUNT_TOO_LARGE";
    throw err;
  }

  return updateSavingsGoalProgress(id, nextAmount);
}

async function deleteSavingsGoal(id) {
  await ensureSavingsGoalsTable();

  const [result] = await db.query("DELETE FROM savings_goals WHERE id = ?", [
    Number(id),
  ]);

  return result.affectedRows > 0;
}

async function getSavingsPageData(goalMonth) {
  const month = budgetStore.normalizeBudgetMonth(goalMonth);
  const goal = await getGoalForMonth(month);

  return {
    goal,
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
  };
}

module.exports = {
  ensureSavingsGoalsTable,
  validateSavingsGoalInput,
  validateSavingsProgressInput,
  getGoalForMonth,
  saveSavingsGoal,
  updateSavingsGoalProgress,
  addSavingsGoalProgress,
  deleteSavingsGoal,
  getSavingsPageData,
};
