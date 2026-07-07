// Shared MySQL finance calculations — single source of truth for totals across pages.
// Date scope: expense_date >= monthStart AND expense_date < nextMonthStart (year-aware).

const db = require("./config/db");
const { requireUserId } = require("./userScope");
const budgetStore = require("./budgetStore");
const expenseStore = require("./expenseStore");
const { getStandardCategoryName } = require("./categoryHelpers");
const { buildBudgetSummary } = require("./budgetHelpers");
const { getCategoryImageUrl } = require("./categoryImageHelpers");
const { buildBudgetNotifications } = require("./budgetNotificationService");

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Sum all expenses (all-time) for the logged-in user only. */
async function getAllTimeExpenseTotal() {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
     FROM expenses WHERE user_id = ?`,
    [userId]
  );
  return Number(rows[0].total) || 0;
}

/** Sum expenses for a budget month (YYYY-MM) using expense_date range. */
async function getMonthlyExpenseTotal(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = budgetStore.getBudgetMonthDateRange(month);
  const userId = requireUserId();

  const [rows] = await db.query(
    `SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
     FROM expenses
     WHERE expense_date >= ? AND expense_date < ?
       AND user_id = ?`,
    [startDate, endExclusive, userId]
  );

  return Number(rows[0].total) || 0;
}

/** Sum expenses for a month that count toward budget (excludes Don't count). */
async function getMonthlyCountedExpenseTotal(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = budgetStore.getBudgetMonthDateRange(month);
  const userId = requireUserId();

  const [rows] = await db.query(
    `SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
     FROM expenses
     WHERE expense_date >= ? AND expense_date < ?
       AND user_id = ?
       AND COALESCE(is_excluded_from_budget, 0) = 0
       AND COALESCE(is_excluded_from_all_budget, 0) = 0`,
    [startDate, endExclusive, userId]
  );

  return Number(rows[0].total) || 0;
}

/** Count expenses for a budget month. Pass null/undefined for all-time count. */
async function getExpenseCountForMonth(budgetMonth) {
  const userId = requireUserId();

  if (!budgetMonth) {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS count FROM expenses WHERE user_id = ?",
      [userId]
    );
    return Number(rows[0].count) || 0;
  }

  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = budgetStore.getBudgetMonthDateRange(month);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM expenses
     WHERE expense_date >= ? AND expense_date < ?
       AND user_id = ?`,
    [startDate, endExclusive, userId]
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

  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      category_id AS categoryId,
      CAST(COALESCE(SUM(amount), 0) AS DECIMAL(10,2)) AS total
     FROM expenses
     WHERE user_id = ?
     GROUP BY category_id`,
    [userId]
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

/** Current-month category budget totals — same source as Spending & Budgets (budgetTotals). */
async function getCategoryBudgetTotalsSummary(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [categories, spendingByCategoryId] = await Promise.all([
    expenseStore.getCategories(),
    budgetStore.getSpendingTotalsByCategoryId(month),
  ]);

  const hasCategoryBudgets = await budgetStore.hasCategoryBudgetsForMonth(month);
  const categoryRows = hasCategoryBudgets
    ? await budgetStore.getBudgetRows(month, categories, spendingByCategoryId)
    : [];
  const budgetTotals = budgetStore.getBudgetTotals(categoryRows);

  const budget = Number(budgetTotals.totalBudgeted) || 0;
  const spent = Number(budgetTotals.totalSpent) || 0;

  return {
    budgetMonth: month,
    budget,
    spent,
    remaining: budget - spent,
    percentUsed: budget > 0 ? Math.round((spent / budget) * 100) : 0,
  };
}

/** Logged-in user's profile default_budget (0 when unset). */
async function getUserDefaultBudgetAmount() {
  const userId = requireUserId();
  const [rows] = await db.query(
    "SELECT default_budget FROM users WHERE id = ?",
    [userId]
  );

  if (!rows.length || rows[0].default_budget == null) {
    return 0;
  }

  return Number(rows[0].default_budget) || 0;
}

/**
 * Primary monthly budget for dashboard/profile/purchase-checker display.
 * Priority: All Categories Budget → category budget totals → profile default → monthly_budget row → 0.
 */
async function resolvePrimaryMonthlyBudgetAmount(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [overallSection, categorySummary, profileDefault, tableAmount] =
    await Promise.all([
      budgetStore.getOverallBudgetSectionData(month),
      getCategoryBudgetTotalsSummary(month),
      getUserDefaultBudgetAmount(),
      budgetStore.getMonthlyBudgetTableAmount(),
    ]);

  if (overallSection && Number(overallSection.budgeted) > 0) {
    return Number(overallSection.budgeted);
  }
  if (categorySummary.budget > 0) {
    return categorySummary.budget;
  }
  if (profileDefault > 0) {
    return profileDefault;
  }
  if (tableAmount > 0) {
    return tableAmount;
  }
  return 0;
}

/** Display summary: all real expenses in month; top category from all transactions. */
async function getDisplayMonthFinanceSummary(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [
    primaryBudget,
    monthTotalSpent,
    monthExpenseCount,
    categories,
    actualSpendingByCategoryId,
  ] = await Promise.all([
    resolvePrimaryMonthlyBudgetAmount(month),
    getMonthlyExpenseTotal(month),
    getExpenseCountForMonth(month),
    expenseStore.getCategories(),
    budgetStore.getActualSpendingTotalsByCategoryId(month),
  ]);

  const summary = buildBudgetSummary(primaryBudget, [], monthTotalSpent);
  const financeSnapshot = buildFinanceSnapshot(
    summary,
    actualSpendingByCategoryId,
    categories,
    "month"
  );

  return {
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
    summary,
    financeSnapshot,
    monthExpenseCount,
    categories,
    actualSpendingByCategoryId,
  };
}

/**
 * Budget math for purchase checks / FinBot purchase answers.
 * Uses budget-counted spent when All Categories or category budgets exist; otherwise all expenses.
 */
async function getRecommendationBudgetSummary(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [primaryBudget, overallSection, categorySummary, monthTotalSpent] =
    await Promise.all([
      resolvePrimaryMonthlyBudgetAmount(month),
      budgetStore.getOverallBudgetSectionData(month),
      getCategoryBudgetTotalsSummary(month),
      getMonthlyExpenseTotal(month),
    ]);

  let budgetSpent = monthTotalSpent;
  if (overallSection && Number(overallSection.budgeted) > 0) {
    budgetSpent = Number(overallSection.spent) || 0;
  } else if (categorySummary.budget > 0) {
    budgetSpent = categorySummary.spent;
  }

  return buildBudgetSummary(primaryBudget, [], budgetSpent);
}

/**
 * Purchase Checker + purchase-check API — overall budget from All Categories Budget only.
 * Category budgets are separate checks, not summed as Monthly Budget.
 */
async function getPurchaseCheckerFinanceSummary(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [
    categories,
    monthExpenseCount,
    overallSection,
    categorySummary,
  ] = await Promise.all([
    expenseStore.getCategories(),
    getExpenseCountForMonth(month),
    budgetStore.getOverallBudgetSectionData(month),
    getCategoryBudgetTotalsSummary(month),
  ]);

  const hasOverallBudget =
    overallSection != null && Number(overallSection.budgeted) > 0;
  const categoryBudgetTotal = Number(categorySummary.budget) || 0;

  let overallSummary;
  let financeSnapshot;

  if (hasOverallBudget) {
    const budgeted = Number(overallSection.budgeted) || 0;
    const spent = Number(overallSection.spent) || 0;
    overallSummary = buildBudgetSummary(budgeted, [], spent);
    const spendingByCategoryId =
      await budgetStore.getAllBudgetSpendingTotalsByCategoryId(month);
    financeSnapshot = buildFinanceSnapshot(
      overallSummary,
      spendingByCategoryId,
      categories,
      "month"
    );
  } else {
    overallSummary = buildBudgetSummary(0, [], 0);
    financeSnapshot = {
      scope: "month",
      monthlyBudget: 0,
      totalSpent: 0,
      remainingBudget: 0,
      percentageUsed: 0,
      highestCategory: "—",
      highestCategoryId: null,
      highestCategoryAmount: 0,
      spendingByCategory: [],
    };
  }

  const categorySpendingById =
    await budgetStore.getSpendingTotalsByCategoryId(month);
  const hasCategoryBudgets = await budgetStore.hasCategoryBudgetsForMonth(month);
  const categoryRows = hasCategoryBudgets
    ? await budgetStore.getBudgetRows(month, categories, categorySpendingById)
    : [];

  return {
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
    summary: overallSummary,
    financeSnapshot,
    recommendationSummary: overallSummary,
    monthExpenseCount,
    categories,
    categoryRows,
    hasOverallBudget,
    categoryBudgetTotal,
    overallSection,
  };
}

function buildPurchaseCheckOptions(purchaseData) {
  if (!purchaseData) {
    return {
      useAllBudgetCounting: false,
      hasOverallBudget: false,
      categoryBudgetRows: [],
      categoryBudgetTotal: 0,
    };
  }
  return {
    useAllBudgetCounting: Boolean(purchaseData.hasOverallBudget),
    hasOverallBudget: Boolean(purchaseData.hasOverallBudget),
    categoryBudgetRows: Array.isArray(purchaseData.categoryRows)
      ? purchaseData.categoryRows
      : [],
    categoryBudgetTotal: Number(purchaseData.categoryBudgetTotal) || 0,
  };
}

/** Monthly budget summary + finance snapshot for the selected budget month. */
async function getBudgetSummary(budgetMonth) {
  const display = await getDisplayMonthFinanceSummary(budgetMonth);
  const spendingByCategoryId = await budgetStore.getSpendingTotalsByCategoryId(
    display.budgetMonth
  );
  const recommendationSummary = await getRecommendationBudgetSummary(
    display.budgetMonth
  );

  return {
    ...display,
    spendingByCategoryId,
    recommendationSummary,
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

function getAdjacentBudgetMonth(budgetMonth, deltaMonths) {
  const normalized = budgetStore.normalizeBudgetMonth(budgetMonth);
  const parts = normalized.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const date = new Date(year, month - 1 + (Number(deltaMonths) || 0), 1);
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0")
  );
}

function buildCategoryMetaMap(categories) {
  const map = {};
  (categories || []).forEach((cat) => {
    const displayName = cat.displayName || getStandardCategoryName(cat.name);
    const meta = {
      categoryId: cat.id,
      icon: cat.icon,
      iconImage: cat.iconImage || null,
      generalIconUrl: cat.isCustom
        ? null
        : getCategoryImageUrl(cat.name, cat.icon) || null,
      color: cat.color || null,
      isCustom: Boolean(cat.isCustom),
    };
    map[displayName] = meta;
    map[String(cat.id)] = meta;
  });
  return map;
}

function enrichExpenseForDashboard(expense, categoryMeta) {
  const meta =
    categoryMeta[String(expense.categoryId)] ||
    categoryMeta[expense.category] ||
    {};
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    category: expense.category,
    description: expense.description || expense.title || expense.category,
    amount: Number(expense.amount) || 0,
    date: expense.date || "",
    iconImage: meta.iconImage || null,
    generalIconUrl: meta.generalIconUrl || null,
    color: meta.color || null,
    isCustom: Boolean(meta.isCustom),
    isExcludedFromBudget: Boolean(expense.isExcludedFromBudget),
    isExcludedFromAllBudget: Boolean(expense.isExcludedFromAllBudget),
  };
}

function buildLast7DaysRolling(expenses, budgetMonth) {
  const normalized = budgetStore.normalizeBudgetMonth(budgetMonth);
  const parts = normalized.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;

  const end = isCurrentMonth ? new Date(now) : new Date(year, month, 0);
  end.setHours(0, 0, 0, 0);

  const rows = [];

  for (let d = 6; d >= 0; d--) {
    const day = new Date(end);
    day.setDate(end.getDate() - d);
    day.setHours(0, 0, 0, 0);
    let amount = 0;

    (expenses || []).forEach((expense) => {
      if (!expense.date || expense.isExcludedFromAllBudget) return;
      const dateParts = String(expense.date).split("-");
      if (dateParts.length < 3) return;
      const expenseDate = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10)
      );
      expenseDate.setHours(0, 0, 0, 0);
      if (expenseDate.getTime() === day.getTime()) {
        amount += Number(expense.amount) || 0;
      }
    });

    rows.push({
      day: DAY_LABELS[(day.getDay() + 6) % 7],
      dateLabel: MONTH_SHORT[day.getMonth()] + " " + day.getDate(),
      amount,
    });
  }

  return rows;
}

/** Month summary aligned with Spending & Budgets / All Categories Budget rules. */
async function buildMonthDashboardSummary(budgetMonth, categories) {
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const cats = categories || (await expenseStore.getCategories());

  const [
    overallSection,
    categorySummary,
    primaryBudget,
    monthExpenseCount,
    hasCategoryBudgets,
    expensesInMonth,
    periodSpentNoOverall,
  ] = await Promise.all([
    budgetStore.getOverallBudgetSectionData(month),
    getCategoryBudgetTotalsSummary(month),
    resolvePrimaryMonthlyBudgetAmount(month),
    getExpenseCountForMonth(month),
    budgetStore.hasCategoryBudgetsForMonth(month),
    expenseStore.getExpensesInMonth(month),
    getMonthlyCountedExpenseTotal(month),
  ]);

  const hasOverallBudget =
    overallSection != null && Number(overallSection.budgeted) > 0;

  let monthlyBudget = 0;
  let totalSpent = 0;
  let spendingByCategoryId;

  if (hasOverallBudget) {
    monthlyBudget = Number(overallSection.budgeted) || 0;
    totalSpent = Number(overallSection.spent) || 0;
    spendingByCategoryId =
      await budgetStore.getAllBudgetSpendingTotalsByCategoryId(month);
  } else if (categorySummary.budget > 0) {
    monthlyBudget = categorySummary.budget;
    totalSpent = categorySummary.spent;
    spendingByCategoryId =
      await budgetStore.getSpendingTotalsByCategoryId(month);
  } else if (primaryBudget > 0) {
    monthlyBudget = primaryBudget;
    totalSpent = await getMonthlyCountedExpenseTotal(month);
    spendingByCategoryId =
      await budgetStore.getAllBudgetSpendingTotalsByCategoryId(month);
  } else {
    monthlyBudget = 0;
    totalSpent = await getMonthlyExpenseTotal(month);
    spendingByCategoryId =
      await budgetStore.getActualSpendingTotalsByCategoryId(month);
  }

  const summary = buildBudgetSummary(monthlyBudget, [], totalSpent);
  const financeSnapshot = buildFinanceSnapshot(
    summary,
    spendingByCategoryId,
    cats,
    "month"
  );

  const categorySpendingById =
    await budgetStore.getSpendingTotalsByCategoryId(month);
  const categoryRows = hasCategoryBudgets
    ? await budgetStore.getBudgetRows(month, cats, categorySpendingById)
    : [];

  const categoryProgress = categoryRows.map((row) => ({
    categoryId: row.categoryId,
    name: row.displayName || row.name,
    spent: row.actual,
    limit: row.availableBudget ?? row.budgeted,
    usedPct: row.usedPct,
    icon: row.icon,
    iconImage: row.iconImage,
    color: row.color,
    isCustom: row.isCustom,
  }));

  const budgetNotifications = buildBudgetNotifications(
    categoryRows,
    overallSection,
    month
  );

  return {
    budgetMonth: month,
    label: budgetStore.formatBudgetMonthLabel(month),
    summary,
    financeSnapshot,
    monthExpenseCount,
    hasOverallBudget,
    periodSpentNoOverall,
    categoryProgress,
    expensesInMonth,
    budgetNotifications,
  };
}

function serializeDashboardMonth(data, categoryMeta) {
  return {
    label: data.label,
    summary: {
      monthlyBudget: data.summary.monthlyBudget,
      totalSpent: data.summary.totalSpent,
      remainingBudget: data.summary.remainingBudget,
      percentageUsed: data.summary.percentageUsed,
      statusLabel: data.summary.statusLabel,
      statusBadge: data.summary.statusBadge,
    },
    topCategory: {
      name: data.financeSnapshot.highestCategory,
      amount: data.financeSnapshot.highestCategoryAmount,
    },
    categoryProgress: data.categoryProgress,
    expenseCount: data.monthExpenseCount,
    hasOverallBudget: data.hasOverallBudget,
    periodSpent: data.hasOverallBudget
      ? data.summary.totalSpent
      : data.periodSpentNoOverall,
    last7Days: buildLast7DaysRolling(data.expensesInMonth, data.budgetMonth),
    transactions: (data.expensesInMonth || []).map((expense) =>
      enrichExpenseForDashboard(expense, categoryMeta)
    ),
    budgetAlerts: data.budgetNotifications || { alerts: [], hasAlerts: false },
  };
}

/** Dashboard client payload — accurate per-month summaries for charts and cards. */
async function buildDashboardClientPayload(budgetMonth) {
  const selectedMonth = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  const categories = await expenseStore.getCategories();
  const categoryMeta = buildCategoryMetaMap(categories);

  const monthKeys = [];
  let cursor = selectedMonth;
  for (let i = 0; i < 12; i++) {
    monthKeys.unshift(cursor);
    cursor = getAdjacentBudgetMonth(cursor, -1);
  }

  const monthSummaries = await Promise.all(
    monthKeys.map((monthKey) =>
      buildMonthDashboardSummary(monthKey, categories)
    )
  );

  const months = {};
  monthKeys.forEach((monthKey, index) => {
    months[monthKey] = serializeDashboardMonth(
      monthSummaries[index],
      categoryMeta
    );
  });

  return {
    selectedMonth,
    monthOrder: monthKeys,
    months,
    categoryMeta,
  };
}

module.exports = {
  getAllTimeExpenseTotal,
  getMonthlyExpenseTotal,
  getMonthlyCountedExpenseTotal,
  getExpenseCountForMonth,
  getCategoryTotals,
  getHighestSpendingCategory,
  buildFinanceSnapshot,
  getCategoryBudgetTotalsSummary,
  getUserDefaultBudgetAmount,
  resolvePrimaryMonthlyBudgetAmount,
  getDisplayMonthFinanceSummary,
  getRecommendationBudgetSummary,
  getPurchaseCheckerFinanceSummary,
  buildPurchaseCheckOptions,
  getBudgetSummary,
  getAllTimeFinanceData,
  mapSpendingByCategory,
  pickHighestCategory,
  getAdjacentBudgetMonth,
  buildMonthDashboardSummary,
  buildDashboardClientPayload,
};
