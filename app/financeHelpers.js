// Shared MySQL finance calculations — single source of truth for totals across pages.
// Date scope: expense_date >= monthStart AND expense_date < nextMonthStart (year-aware).

const db = require("./config/db");
const budgetStore = require("./budgetStore");
const expenseStore = require("./expenseStore");
const { getStandardCategoryName } = require("./categoryHelpers");
const { buildBudgetSummary } = require("./budgetHelpers");

/** Sum all expenses (all-time). */
async function getAllTimeExpenseTotal() {
  const [rows] = await db.query(
    `SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total FROM expenses`
  );
  return Number(rows[0].total) || 0;
}

/** Sum expenses for a budget month (YYYY-MM) using expense_date range. */
async function getMonthlyExpenseTotal(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = budgetStore.getBudgetMonthDateRange(month);

  const [rows] = await db.query(
    `SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
     FROM expenses
     WHERE expense_date >= ? AND expense_date < ?`,
    [startDate, endExclusive]
  );

  return Number(rows[0].total) || 0;
}

/** Count expenses for a budget month. Pass null/undefined for all-time count. */
async function getExpenseCountForMonth(budgetMonth) {
  if (!budgetMonth) {
    const [rows] = await db.query("SELECT COUNT(*) AS count FROM expenses");
    return Number(rows[0].count) || 0;
  }

  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = budgetStore.getBudgetMonthDateRange(month);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM expenses
     WHERE expense_date >= ? AND expense_date < ?`,
    [startDate, endExclusive]
  );

  return Number(rows[0].count) || 0;
}

/** Category totals keyed by category_id. budgetMonth = selected month; omit for all-time. */
async function getCategoryTotals(budgetMonth) {
  if (budgetMonth) {
    return budgetStore.getSpendingTotalsByCategoryId(
      budgetStore.normalizeBudgetMonth(budgetMonth)
    );
  }

  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
     FROM expenses
     GROUP BY category_id`
  );

  const totals = {};
  rows.forEach((row) => {
    totals[String(row.categoryId)] = Number(row.total);
  });
  return totals;
}

/** Highest spending category for a scope (month or all-time). Uses category_id. */
async function getHighestSpendingCategory(budgetMonth, categories) {
  const totalsById = await getCategoryTotals(budgetMonth || null);
  return pickHighestCategory(totalsById, categories);
}

function pickHighestCategory(totalsById, categories) {
  let highest = { categoryId: null, category: "—", amount: 0 };

  (categories || []).forEach((cat) => {
    const amount = Number(totalsById[String(cat.id)]) || 0;
    const displayName = cat.displayName || getStandardCategoryName(cat.name);
    if (amount > highest.amount) {
      highest = { categoryId: cat.id, category: displayName, amount };
    }
  });

  return highest;
}

function mapSpendingByCategory(totalsById, categories) {
  return (categories || [])
    .map((cat) => ({
      categoryId: cat.id,
      category: cat.displayName || getStandardCategoryName(cat.name),
      amount: Number(totalsById[String(cat.id)]) || 0,
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** Finance snapshot for a month — totals from SQL category_id aggregates. */
function buildFinanceSnapshot(summary, spendingByCategoryId, categories, scope) {
  const spendingByCategory = mapSpendingByCategory(
    spendingByCategoryId,
    categories
  );
  const highest = spendingByCategory[0] || { category: "—", categoryId: null, amount: 0 };

  return {
    scope: scope || "month",
    monthlyBudget: summary.monthlyBudget,
    totalSpent: summary.totalSpent,
    remainingBudget: summary.remainingBudget,
    percentageUsed: summary.percentageUsed,
    highestCategory: highest.category,
    highestCategoryId: highest.categoryId || null,
    highestCategoryAmount: highest.amount,
    spendingByCategory,
  };
}

/** Monthly budget summary + finance snapshot for the selected budget month. */
async function getBudgetSummary(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);

  const [monthlyBudget, monthTotalSpent, monthExpenseCount, categories, spendingByCategoryId] =
    await Promise.all([
      budgetStore.getMonthlyBudget(),
      getMonthlyExpenseTotal(month),
      getExpenseCountForMonth(month),
      expenseStore.getCategories(),
      budgetStore.getSpendingTotalsByCategoryId(month),
    ]);

  const summary = buildBudgetSummary(monthlyBudget, [], monthTotalSpent);
  const financeSnapshot = buildFinanceSnapshot(
    summary,
    spendingByCategoryId,
    categories,
    "month"
  );

  return {
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
    summary,
    financeSnapshot,
    monthExpenseCount,
    spendingByCategoryId,
    categories,
  };
}

/** All-time totals for the Expenses page and cross-page comparisons. */
async function getAllTimeFinanceData(categories) {
  const cats = categories || (await expenseStore.getCategories());
  const [totalSpent, expenseCount, totalsById] = await Promise.all([
    getAllTimeExpenseTotal(),
    getExpenseCountForMonth(null),
    getCategoryTotals(null),
  ]);

  const spendingByCategory = mapSpendingByCategory(totalsById, cats);
  const highest = pickHighestCategory(totalsById, cats);

  return {
    scope: "all-time",
    totalSpent,
    expenseCount,
    highestCategory: highest.category,
    highestCategoryId: highest.categoryId,
    highestCategoryAmount: highest.amount,
    spendingByCategory,
    totalsById,
  };
}

module.exports = {
  getAllTimeExpenseTotal,
  getMonthlyExpenseTotal,
  getExpenseCountForMonth,
  getCategoryTotals,
  getHighestSpendingCategory,
  buildFinanceSnapshot,
  getBudgetSummary,
  getAllTimeFinanceData,
  mapSpendingByCategory,
  pickHighestCategory,
};
