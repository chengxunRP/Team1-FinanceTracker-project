// In-app budget alerts — same rows and thresholds as Spending & Budgets (no extra DB tables).
const budgetStore = require("./budgetStore");
const expenseStore = require("./expenseStore");
const { getBudgetUsageState } = require("./budgetHelpers");

const CATEGORY_ALERT_VISIBLE_LIMIT = 3;

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "$0";
  if (num % 1 === 0) return "$" + num.toLocaleString();
  return "$" + num.toFixed(2);
}

function buildAlertPresentation(name, spent, budget, scope) {
  const usage = getBudgetUsageState(spent, budget);
  if (usage.state !== "warning" && usage.state !== "reached" && usage.state !== "exceeded") {
    return null;
  }

  const isOverall = scope === "overall";
  const label = isOverall ? "All Categories Budget" : name;
  let level;
  let title;
  let message;

  if (usage.state === "exceeded") {
    level = "danger";
    title = isOverall ? "All Categories Budget exceeded" : `${name} budget exceeded`;
    message = isOverall
      ? "You have exceeded your All Categories Budget."
      : `You have exceeded your ${name} budget.`;
  } else if (usage.state === "reached") {
    level = "danger";
    title = isOverall ? "All Categories Budget reached" : `${name} budget reached`;
    message = isOverall
      ? "You have used all of your All Categories Budget."
      : `You have used all of your ${name} budget.`;
  } else {
    level = "warning";
    title = isOverall ? "All Categories Budget warning" : `${name} budget warning`;
    message = isOverall
      ? `You have used ${usage.usedPct}% of your All Categories Budget.`
      : `You have used ${usage.usedPct}% of your ${name} budget.`;
  }

  return {
    level,
    usageState: usage.state,
    usedPct: usage.usedPct,
    title,
    message,
    label,
  };
}

function buildOverallNotification(overallBudgetSection, budgetMonth) {
  if (!overallBudgetSection || !overallBudgetSection.card) return null;

  const card = overallBudgetSection.card;
  const spent = Number(card.actual) || 0;
  const budget = Number(card.availableBudget) || 0;
  const presentation = buildAlertPresentation(
    "All Categories Budget",
    spent,
    budget,
    "overall"
  );
  if (!presentation) return null;

  return {
    alertId: `overall-budget-${presentation.level}-${budgetMonth}`,
    level: presentation.level,
    usageState: presentation.usageState,
    scope: "overall",
    name: "All Categories Budget",
    spent,
    budget,
    usedPct: presentation.usedPct,
    title: presentation.title,
    message: presentation.message,
    detail: `${formatMoney(spent)} spent of ${formatMoney(budget)} (${presentation.usedPct}% used)`,
  };
}

function buildCategoryNotifications(categoryRows, budgetMonth) {
  if (!Array.isArray(categoryRows)) return [];

  const alerts = [];

  categoryRows.forEach((row) => {
    const name = row.displayName || row.name;
    const spent = Number(row.actual) || 0;
    const budget = Number(row.availableBudget) || 0;
    const presentation = buildAlertPresentation(name, spent, budget, "category");
    if (!presentation) return;

    alerts.push({
      alertId: `category-budget-${row.categoryId}-${presentation.level}-${budgetMonth}`,
      categoryId: row.categoryId,
      level: presentation.level,
      usageState: presentation.usageState,
      scope: "category",
      name,
      spent,
      budget,
      usedPct: presentation.usedPct,
      title: presentation.title,
      message: presentation.message,
      detail: `${formatMoney(spent)} spent of ${formatMoney(budget)} (${presentation.usedPct}% used)`,
    });
  });

  return alerts;
}

function sortCategoryAlerts(categoryAlerts) {
  const levelOrder = { danger: 0, warning: 1 };
  return [...categoryAlerts].sort((a, b) => {
    const byLevel = levelOrder[a.level] - levelOrder[b.level];
    if (byLevel !== 0) return byLevel;
    return b.usedPct - a.usedPct;
  });
}

function buildNotificationDisplay(overallAlert, categoryAlerts) {
  const sortedCategoryAlerts = sortCategoryAlerts(categoryAlerts);
  const visibleCategoryAlerts = sortedCategoryAlerts.slice(
    0,
    CATEGORY_ALERT_VISIBLE_LIMIT
  );
  const hiddenCategoryAlerts = sortedCategoryAlerts.slice(
    CATEGORY_ALERT_VISIBLE_LIMIT
  );

  const flatAlerts = [];
  if (overallAlert) flatAlerts.push(overallAlert);
  flatAlerts.push(...sortedCategoryAlerts);

  return {
    overallAlert,
    categoryAlerts: sortedCategoryAlerts,
    visibleCategoryAlerts,
    hiddenCategoryAlerts,
    hiddenCategoryCount: hiddenCategoryAlerts.length,
    visibleCategoryLimit: CATEGORY_ALERT_VISIBLE_LIMIT,
    alerts: flatAlerts,
    hasAlerts: flatAlerts.length > 0,
  };
}

function buildBudgetNotifications(categoryRows, overallBudgetSection, budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  const overallAlert = buildOverallNotification(overallBudgetSection, month);
  const categoryAlerts = buildCategoryNotifications(categoryRows, month);
  return buildNotificationDisplay(overallAlert, categoryAlerts);
}

async function getBudgetNotifications(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  const [categories, spendingByCategoryId, overallBudgetSection, hasCategoryBudgets] =
    await Promise.all([
      expenseStore.getCategories(),
      budgetStore.getSpendingTotalsByCategoryId(month),
      budgetStore.getOverallBudgetSectionData(month),
      budgetStore.hasCategoryBudgetsForMonth(month),
    ]);

  const categoryRows = hasCategoryBudgets
    ? await budgetStore.getBudgetRows(month, categories, spendingByCategoryId)
    : [];

  return buildBudgetNotifications(categoryRows, overallBudgetSection, month);
}

module.exports = {
  buildBudgetNotifications,
  getBudgetNotifications,
  formatBudgetNotificationMoney: formatMoney,
  CATEGORY_ALERT_VISIBLE_LIMIT,
  sortCategoryAlerts,
  buildNotificationDisplay,
  buildAlertPresentation,
};
