const db = require("./config/db");
const {
  getCategoryBudgetStatus,
  getCategoryStatusMessage,
} = require("./budgetHelpers");
const {
  getDisplayCategoryName,
  isBillsCategory,
} = require("./categoryHelpers");

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

async function getSpendingTotalsByCategoryId(budgetMonth) {
  if (!budgetMonth) return {};

  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);

  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE expense_date >= ? AND expense_date < ?
    GROUP BY category_id`,
    [startDate, endExclusive]
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
  const { startDate, endExclusive } = getBudgetMonthDateRange(budgetMonth);

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.category_id = ?
      AND e.expense_date >= ?
      AND e.expense_date < ?
    ORDER BY e.expense_date DESC, e.id DESC`,
    [Number(categoryId), startDate, endExclusive]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    category: row.category_name,
  }));
}

async function getCategoryExpensesAllFromDb(categoryId) {
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.category_id = ?
    ORDER BY e.expense_date DESC, e.id DESC`,
    [Number(categoryId)]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    category: row.category_name,
  }));
}

async function getCategoryMonthlyTotalsFromDb(categoryId) {
  const [rows] = await db.query(
    `SELECT
      DATE_FORMAT(expense_date, '%Y-%m') AS budgetMonth,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
    FROM expenses
    WHERE category_id = ?
    GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
    ORDER BY budgetMonth ASC`,
    [Number(categoryId)]
  );

  const totals = {};
  rows.forEach((row) => {
    totals[row.budgetMonth] = Number(row.total);
  });
  return totals;
}

async function getBudgetRows(budgetMonth, categories, spendingByCategoryId) {
  const budgets = await getCategoryBudgets(budgetMonth);
  const budgetMap = {};
  budgets.forEach((b) => {
    budgetMap[String(b.categoryId)] = b.budgetLimit;
  });

  return categories
    .filter((cat) => budgetMap[String(cat.id)] !== undefined)
    .map((cat) => {
      const budgeted = budgetMap[String(cat.id)] || 0;
      const actual = getCategoryActualSpent(spendingByCategoryId, cat);
      const remaining = budgeted - actual;
      const usedPct = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
      const status = getCategoryBudgetStatus(usedPct);

      return {
        categoryId: cat.id,
        name: cat.name,
        displayName: getDisplayCategoryName(cat.name),
        icon: cat.icon,
        color: cat.color,
        budgeted,
        actual,
        remaining,
        usedPct,
        overspent: budgeted > 0 && actual > budgeted,
        statusMessage: getCategoryStatusMessage(remaining),
        statusLabel: status.label,
        statusKey: status.key,
        statusBarClass: status.barClass,
        statusBadgeClass: status.badgeClass,
        statusCardClass: status.cardClass,
        warningMessage: status.warningMessage,
        showWarning: status.showWarning,
      };
    });
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

function getEverythingElseData(
  categories,
  budgetedCategoryIds,
  spendingByCategoryId
) {
  const budgetedIds = new Set(budgetedCategoryIds.map(String));

  let totalAmount = 0;
  let categoryCount = 0;

  categories.forEach((cat) => {
    if (budgetedIds.has(String(cat.id))) return;
    const amount = getCategoryActualSpent(spendingByCategoryId, cat);
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
    totalBudgeted += row.budgeted;
  });

  return { totalSpent, totalBudgeted };
}

async function getAvailableCategoriesForBudget(budgetMonth, categories, spendingByCategoryId) {
  const budgets = await getCategoryBudgets(budgetMonth);
  const budgetedIds = new Set(budgets.map((b) => String(b.categoryId)));

  return categories
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayName: getDisplayCategoryName(cat.name),
      icon: cat.icon,
      color: cat.color,
      spentThisMonth: getCategoryActualSpent(spendingByCategoryId, cat),
      hasBudget: budgetedIds.has(String(cat.id)),
    }))
    .sort((a, b) => {
      if (a.hasBudget !== b.hasBudget) return a.hasBudget ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
}

async function deleteCategoryBudget(categoryId, budgetMonth) {
  await db.query(
    "DELETE FROM category_budgets WHERE category_id = ? AND budget_month = ?",
    [Number(categoryId), budgetMonth]
  );
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

/** Latest month shown on category detail charts — never beyond today's month. */
function getChartEndMonth(date = new Date()) {
  return getCurrentBudgetMonth(date);
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

async function buildMonthlyChartDataFromDb(categoryId) {
  const monthlyTotals = await getCategoryMonthlyTotalsFromDb(categoryId);
  const graphEndMonth = getChartEndMonth();
  // Default: same month last year through current month (e.g. Jun 2025–Jun 2026).
  const DEFAULT_MONTHS_BACK = 12;
  let graphStartMonth = addBudgetMonths(graphEndMonth, -DEFAULT_MONTHS_BACK);

  Object.keys(monthlyTotals).forEach((monthKey) => {
    if (isBudgetMonthAfter(monthKey, graphEndMonth)) {
      return;
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

async function getUnbudgetedExpensesFromDb(budgetedCategoryIds) {
  const excludedIds = (budgetedCategoryIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  let query = `SELECT
      e.id,
      e.title,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE 1 = 1`;
  const params = [];

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
    amount: Number(row.amount),
    date: row.date,
    notes: row.notes || "",
    category: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
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

async function getEverythingElseDetailData(budgetMonth, categories) {
  const budgets = await getCategoryBudgets(budgetMonth);
  const budgetedCategoryIds = budgets.map((b) => b.categoryId);
  const rawTransactions = await getUnbudgetedExpensesFromDb(budgetedCategoryIds);

  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[String(cat.id)] = cat;
  });

  const transactions = rawTransactions.map((tx) => {
    const cat = categoryMap[String(tx.categoryId)] || {};
    return {
      ...tx,
      categoryDisplayName: getDisplayCategoryName(tx.category || cat.name),
      categoryIcon: tx.categoryIcon || cat.icon,
      categoryColor: tx.categoryColor || cat.color,
      accountLabel: tx.accountLabel || "Cash",
    };
  });

  let totalAmount = 0;
  const unbudgetedCategoryIds = new Set();
  transactions.forEach((tx) => {
    totalAmount += Number(tx.amount) || 0;
    if (tx.categoryId) unbudgetedCategoryIds.add(String(tx.categoryId));
  });

  const categoryCount = unbudgetedCategoryIds.size;

  return {
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

  const budgets = await getCategoryBudgets(budgetMonth);
  const budgetEntry = budgets.find((b) => String(b.categoryId) === String(categoryId));
  if (!budgetEntry) return null;

  const actual = getCategoryActualSpent(spendingByCategoryId, category);
  const budgeted = budgetEntry.budgetLimit;
  const remaining = budgeted - actual;
  const usedPct = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
  const status = getCategoryBudgetStatus(usedPct);

  const [allExpenses, chart] = await Promise.all([
    getCategoryExpensesAllFromDb(categoryId),
    buildMonthlyChartDataFromDb(categoryId),
  ]);

  let totalAmount = 0;
  allExpenses.forEach((exp) => {
    totalAmount += Number(exp.amount) || 0;
  });

  const avgTransaction = allExpenses.length ? totalAmount / allExpenses.length : 0;
  const largestTransaction = allExpenses.length
    ? Math.max(...allExpenses.map((e) => Number(e.amount) || 0))
    : 0;

  return {
    category: {
      id: category.id,
      name: category.name,
      displayName: getDisplayCategoryName(category.name),
      icon: category.icon,
      color: category.color,
    },
    budgeted,
    actual,
    remaining,
    usedPct,
    overspent: remaining < 0,
    overspentAmount: remaining < 0 ? Math.abs(remaining) : 0,
    statusMessage: getCategoryStatusMessage(remaining),
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

module.exports = {
  getCurrentBudgetMonth,
  normalizeBudgetMonth,
  formatBudgetMonthLabel,
  getBudgetMonthDateRange,
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
  getEverythingElseData,
  getBudgetTotals,
  getAvailableCategoriesForBudget,
  deleteCategoryBudget,
  getChartEndMonth,
  buildMonthlyChartDataFromDb,
  getCategoryDetailData,
  getEverythingElseDetailData,
  getSpendingTotalsByCategoryId,
};
