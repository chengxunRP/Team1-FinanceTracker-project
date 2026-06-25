const db = require("./config/db");
const { getCategoryBudgetStatus } = require("./budgetHelpers");

const DEFAULT_BUDGET = 500;

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

function filterExpensesForMonth(expenses, budgetMonth) {
  const [year, monthNum] = budgetMonth.split("-").map(Number);

  return expenses.filter((expense) => {
    if (!expense.date) return false;
    const d = new Date(`${expense.date}T00:00:00`);
    return d.getFullYear() === year && d.getMonth() + 1 === monthNum;
  });
}

async function getMonthlyBudget() {
  const [rows] = await db.query(
    "SELECT amount FROM monthly_budget ORDER BY id ASC LIMIT 1"
  );

  if (!rows.length) {
    return DEFAULT_BUDGET;
  }

  return Number(rows[0].amount);
}

async function setMonthlyBudget(amount) {
  const [rows] = await db.query(
    "SELECT id FROM monthly_budget ORDER BY id ASC LIMIT 1"
  );

  if (rows.length) {
    await db.query("UPDATE monthly_budget SET amount = ? WHERE id = ?", [
      amount,
      rows[0].id,
    ]);
    return;
  }

  await db.query("INSERT INTO monthly_budget (amount) VALUES (?)", [amount]);
}

async function getCategoryBudgets(budgetMonth) {
  try {
    const [rows] = await db.query(
      `SELECT
        category_id AS categoryId,
        CAST(budget_limit AS DECIMAL(10,2)) AS budgetLimit,
        budget_month AS budgetMonth
      FROM category_budgets
      WHERE budget_month = ?`,
      [budgetMonth]
    );

    return rows.map((row) => ({
      categoryId: String(row.categoryId),
      budgetLimit: Number(row.budgetLimit),
      budgetMonth: row.budgetMonth,
    }));
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.error(
        "category_budgets table is missing. Run the CREATE TABLE statement in docs/database.sql:",
        error.message
      );
      return [];
    }
    console.error("Database error loading category budgets:", error);
    throw error;
  }
}

async function setCategoryBudget(categoryId, budgetMonth, amount) {
  try {
    await db.query(
      `INSERT INTO category_budgets (category_id, budget_limit, budget_month)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE budget_limit = VALUES(budget_limit)`,
      [Number(categoryId), amount, budgetMonth]
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
    await setCategoryBudget(categoryId, budgetMonth, limit);
  }
}

function sumExpensesForMonth(expenses, budgetMonth) {
  const [year, monthNum] = budgetMonth.split("-").map(Number);
  const actualByCategory = {};

  for (const expense of expenses) {
    if (!expense.date) continue;
    const d = new Date(`${expense.date}T00:00:00`);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== monthNum) continue;

    const cat = expense.category || "Others";
    actualByCategory[cat] = (actualByCategory[cat] || 0) + Number(expense.amount);
  }

  return actualByCategory;
}

function countExpensesForMonth(expenses, budgetMonth) {
  const [year, monthNum] = budgetMonth.split("-").map(Number);
  const countByCategory = {};

  for (const expense of expenses) {
    if (!expense.date) continue;
    const d = new Date(`${expense.date}T00:00:00`);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== monthNum) continue;

    const cat = expense.category || "Others";
    countByCategory[cat] = (countByCategory[cat] || 0) + 1;
  }

  return countByCategory;
}

async function getBudgetRows(budgetMonth, expenses, categories) {
  const budgets = await getCategoryBudgets(budgetMonth);
  const budgetMap = {};
  budgets.forEach((b) => {
    budgetMap[b.categoryId] = b.budgetLimit;
  });

  const actualByCategory = sumExpensesForMonth(expenses, budgetMonth);

  return categories
    .filter((cat) => budgetMap[cat.id] !== undefined)
    .map((cat) => {
      const budgeted = budgetMap[cat.id] || 0;
      const actual = actualByCategory[cat.name] || 0;
      const remaining = budgeted - actual;
      const usedPct = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
      const status = getCategoryBudgetStatus(usedPct);

      return {
        categoryId: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        budgeted,
        actual,
        remaining,
        usedPct,
        overspent: budgeted > 0 && actual > budgeted,
        statusLabel: status.label,
        statusKey: status.key,
        statusBarClass: status.barClass,
        statusBadgeClass: status.badgeClass,
        statusCardClass: status.cardClass,
      };
    });
}

function getCategorySpendingRows(expenses, budgetMonth, categories) {
  const actualByCategory = sumExpensesForMonth(expenses, budgetMonth);
  const countByCategory = countExpensesForMonth(expenses, budgetMonth);

  const rows = categories
    .map((cat) => ({
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      actual: actualByCategory[cat.name] || 0,
      expenseCount: countByCategory[cat.name] || 0,
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
  const budgets = await getCategoryBudgets(budgetMonth);
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
  const budgets = await getCategoryBudgets(budgetMonth);
  return budgets.length > 0;
}

module.exports = {
  getCurrentBudgetMonth,
  formatBudgetMonthLabel,
  filterExpensesForMonth,
  getMonthlyBudget,
  setMonthlyBudget,
  getCategoryBudgets,
  setCategoryBudget,
  setCategoryBudgets,
  getBudgetRows,
  getCategorySpendingRows,
  getCategorySetupRows,
  hasCategoryBudgetsForMonth,
};
