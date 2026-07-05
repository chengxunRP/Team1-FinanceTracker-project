const db = require("./config/db");
const budgetStore = require("./budgetStore");
const financeHelpers = require("./financeHelpers");

const DEFAULT_GOAL_TITLE = "Monthly savings goal";
const MAX_GOAL_AMOUNT = 1000000;
const MAX_TITLE_LENGTH = 120;

let savingsGoalTableReady = false;

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

async function ensureSavingsGoalTable() {
  if (savingsGoalTableReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      goal_month      CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
      title           VARCHAR(120)  NOT NULL DEFAULT 'Monthly savings goal',
      target_amount   DECIMAL(10,2) NOT NULL,
      created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_savings_goals_month (goal_month),
      INDEX idx_savings_goals_month (goal_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  savingsGoalTableReady = true;
}

function validateSavingsGoalInput(input = {}) {
  const errors = [];
  const goalMonth = budgetStore.normalizeBudgetMonth(input.goalMonth);
  const title = String(input.title || "").trim();
  const targetAmount = Number(input.targetAmount);

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    errors.push("Enter a savings target greater than $0.");
  } else if (targetAmount > MAX_GOAL_AMOUNT) {
    errors.push("Enter a savings target below $1,000,000.");
  }

  if (title.length > MAX_TITLE_LENGTH) {
    errors.push("Keep the goal name under 120 characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
    values: {
      goalMonth,
      title: title || DEFAULT_GOAL_TITLE,
      targetAmount: roundMoney(targetAmount),
    },
  };
}

function mapGoalRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    goalMonth: row.goalMonth,
    title: row.title || DEFAULT_GOAL_TITLE,
    targetAmount: Number(row.targetAmount) || 0,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

async function getGoalForMonth(goalMonth) {
  await ensureSavingsGoalTable();
  const month = budgetStore.normalizeBudgetMonth(goalMonth);

  const [rows] = await db.query(
    `SELECT
      id,
      goal_month AS goalMonth,
      title,
      CAST(target_amount AS DECIMAL(10,2)) AS targetAmount,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM savings_goals
    WHERE goal_month = ?
    LIMIT 1`,
    [month]
  );

  return mapGoalRow(rows[0]);
}

async function saveGoal(input) {
  const validation = validateSavingsGoalInput(input);
  if (!validation.valid) {
    const error = new Error("Invalid savings goal.");
    error.code = "VALIDATION";
    error.errors = validation.errors;
    throw error;
  }

  const { goalMonth, title, targetAmount } = validation.values;
  await ensureSavingsGoalTable();
  await db.query(
    `INSERT INTO savings_goals (goal_month, title, target_amount)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      target_amount = VALUES(target_amount)`,
    [goalMonth, title, targetAmount]
  );

  return getGoalForMonth(goalMonth);
}

async function deleteGoal(goalMonth) {
  await ensureSavingsGoalTable();
  const month = budgetStore.normalizeBudgetMonth(goalMonth);
  await db.query("DELETE FROM savings_goals WHERE goal_month = ?", [month]);
}

function buildProgress(goal, monthlyBudget, totalSpent) {
  const targetAmount = goal ? roundMoney(goal.targetAmount) : 0;
  const savedAmount = roundMoney(Math.max(Number(monthlyBudget) - Number(totalSpent), 0));
  const remainingToGoal = goal
    ? roundMoney(Math.max(targetAmount - savedAmount, 0))
    : 0;
  const rawProgressPct =
    goal && targetAmount > 0 ? Math.round((savedAmount / targetAmount) * 100) : 0;
  const progressPct = Math.min(Math.max(rawProgressPct, 0), 100);
  const achieved = Boolean(goal && targetAmount > 0 && savedAmount >= targetAmount);

  let statusKey = "empty";
  let statusLabel = "No goal set";
  let statusMessage = "Set a target to start tracking this month.";

  if (goal) {
    if (achieved) {
      statusKey = "success";
      statusLabel = "Goal reached";
      statusMessage = "You have reached this savings goal.";
    } else if (progressPct >= 75) {
      statusKey = "near";
      statusLabel = "Almost there";
      statusMessage = "You are close to reaching this savings goal.";
    } else if (progressPct > 0) {
      statusKey = "active";
      statusLabel = "In progress";
      statusMessage = "Keep spending below your monthly budget to close the gap.";
    } else {
      statusKey = "behind";
      statusLabel = "Needs attention";
      statusMessage = "Current spending leaves no savings progress yet.";
    }
  }

  return {
    targetAmount,
    savedAmount,
    remainingToGoal,
    rawProgressPct,
    progressPct,
    achieved,
    statusKey,
    statusLabel,
    statusMessage,
  };
}

async function getSavingsGoalPageData(goalMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    goalMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [goal, monthlyBudget, totalSpent] = await Promise.all([
    getGoalForMonth(month),
    budgetStore.getMonthlyBudget(),
    financeHelpers.getMonthlyExpenseTotal(month),
  ]);

  const progress = buildProgress(goal, monthlyBudget, totalSpent);

  return {
    goal,
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
    monthlyBudget: roundMoney(monthlyBudget),
    totalSpent: roundMoney(totalSpent),
    availableToSave: progress.savedAmount,
    ...progress,
  };
}

module.exports = {
  validateSavingsGoalInput,
  getSavingsGoalPageData,
  getGoalForMonth,
  saveGoal,
  deleteGoal,
};
