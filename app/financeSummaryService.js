// Live finance summary for FinBot — reuses Spending & Budgets page data only.

const budgetStore = require("./budgetStore");
const expenseStore = require("./expenseStore");
const financeHelpers = require("./financeHelpers");
const { buildBudgetSummary } = require("./budgetHelpers");

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// Convert Budget-page data into a smaller finance summary for FinBot.
// Reuses category budgets, All Categories Budget, spending, remaining amounts,
// alerts and highest category from getBudgetPageData(). FinBot then answers
// using the same latest numbers the user sees on the Budget page.
function buildLiveFinanceSummaryFromBudgetPage(pageData, overallBudgetSection) {
  const month = pageData.budgetMonth;
  const categoryRows = Array.isArray(pageData.categoryRows) ? pageData.categoryRows : [];
  const budgetTotals = pageData.budgetTotals || { totalSpent: 0, totalBudgeted: 0 };
  const everythingElse = pageData.everythingElse || { amount: 0 };
  const categories = pageData.categories || [];
  const spendingByCategoryId = pageData.spendingByCategoryId || {};
  const actualSpendingByCategoryId =
    pageData.actualSpendingByCategoryId || spendingByCategoryId;
  const allExpensesSpent = roundMoney(
    pageData.summary ? pageData.summary.totalSpent : 0
  );

  // --- Section 1: Normal category budgets (same totals as budget page header) ---
  const categoryBudgetTotal = roundMoney(budgetTotals.totalBudgeted || 0);
  const categoryBudgetSpent = roundMoney(budgetTotals.totalSpent || 0);
  const categoryBudgetRemaining = roundMoney(categoryBudgetTotal - categoryBudgetSpent);
  const categoryBudgetPctUsed =
    categoryBudgetTotal > 0
      ? Math.round((categoryBudgetSpent / categoryBudgetTotal) * 100)
      : 0;
  // Match budget.ejs: show section when hasCategoryBudgets is true (even if totals are 0).
  const hasCategoryBudgets = Boolean(pageData.hasCategoryBudgets) && categoryRows.length > 0;

  let topBudgetedCategoryName = "—";
  let topBudgetedCategorySpent = 0;
  categoryRows.forEach((row) => {
    const amount = Number(row.actual) || 0;
    if (amount > topBudgetedCategorySpent) {
      topBudgetedCategorySpent = amount;
      topBudgetedCategoryName = row.displayName || row.name || "—";
    }
  });
  topBudgetedCategorySpent = roundMoney(topBudgetedCategorySpent);

  // --- Section 2: All Transactions (same as All Categories Budget card) ---
  // Prefer overall section spent (budget page source of truth); fall back to month SQL total.
  const hasAllTransactionsBudget =
    overallBudgetSection != null && Number(overallBudgetSection.budgeted) > 0;
  const allTransactionsBudget = hasAllTransactionsBudget
    ? roundMoney(overallBudgetSection.budgeted)
    : 0;
  const allTransactionsSpent = hasAllTransactionsBudget
    ? roundMoney(overallBudgetSection.spent)
    : allExpensesSpent;
  const allTransactionsRemaining = hasAllTransactionsBudget
    ? roundMoney(allTransactionsBudget - allTransactionsSpent)
    : 0;
  const allTransactionsPctUsed =
    allTransactionsBudget > 0
      ? Math.round((allTransactionsSpent / allTransactionsBudget) * 100)
      : 0;
  const everythingElseTotal = roundMoney(everythingElse.amount || 0);

  const financeSnapshotAll = financeHelpers.buildFinanceSnapshot(
    buildBudgetSummary(allTransactionsBudget, [], allExpensesSpent),
    actualSpendingByCategoryId,
    categories,
    "month"
  );

  const pageMonthlyBudget = roundMoney(
    pageData.summary ? pageData.summary.monthlyBudget : 0
  );

  // Purchase checks default to All Transactions budget when present.
  let primaryBudget = 0;
  let primarySpent = allExpensesSpent;
  let primaryRemaining = 0;
  let primaryPct = 0;
  let primarySource = "none";

  if (hasAllTransactionsBudget) {
    primaryBudget = allTransactionsBudget;
    primarySpent = allTransactionsSpent;
    primaryRemaining = allTransactionsRemaining;
    primaryPct = allTransactionsPctUsed;
    primarySource = "overall";
  } else if (hasCategoryBudgets) {
    primaryBudget = categoryBudgetTotal;
    primarySpent = categoryBudgetSpent;
    primaryRemaining = categoryBudgetRemaining;
    primaryPct = categoryBudgetPctUsed;
    primarySource = "category";
  } else if (pageMonthlyBudget > 0) {
    primaryBudget = pageMonthlyBudget;
    primarySpent = allExpensesSpent;
    primaryRemaining = roundMoney(pageMonthlyBudget - allExpensesSpent);
    primaryPct =
      pageMonthlyBudget > 0
        ? Math.round((allExpensesSpent / pageMonthlyBudget) * 100)
        : 0;
    primarySource = "monthly";
  }

  const summary = buildBudgetSummary(primaryBudget, [], primarySpent);
  const financeSnapshot = financeHelpers.buildFinanceSnapshot(
    summary,
    actualSpendingByCategoryId,
    categories,
    "month"
  );

  return {
    month,
    budgetMonthLabel:
      pageData.budgetMonthLabel || budgetStore.formatBudgetMonthLabel(month),

    hasCategoryBudgets,
    categoryBudgetTotal,
    categoryBudgetSpent,
    categoryBudgetRemaining,
    categoryBudgetPctUsed,
    topBudgetedCategoryName,
    topBudgetedCategorySpent,
    budgetBreakdown: categoryRows,

    hasAllTransactionsBudget,
    allTransactionsBudget,
    allTransactionsSpent,
    allTransactionsRemaining,
    allTransactionsPctUsed,
    allExpensesSpent,
    everythingElseTotal,
    expenseCountThisMonth: Number(pageData.monthExpenseCount) || 0,
    topCategoryName: financeSnapshotAll.highestCategory || "—",
    topCategorySpent: roundMoney(financeSnapshotAll.highestCategoryAmount),
    categoryBreakdown: financeSnapshotAll.spendingByCategory || [],

    hasBudget: primarySource !== "none",
    budgetSource: primarySource,
    monthlyBudgetTotal: primaryBudget,
    spentThisMonth: primarySpent,
    remainingThisMonth: primaryRemaining,
    percentageUsed: primaryPct,

    overallBudget: overallBudgetSection,
    categoryBudgetTotals: budgetTotals,
    summary,
    financeSnapshot,
  };
}

// Load the logged-in user's latest expenses and budgets for FinBot.
// Calls the same Budget-page loader, then buildLiveFinanceSummaryFromBudgetPage(),
// so answers stay consistent with Spending & Budgets and avoid fixed sample values.
async function getLiveFinanceSummary(budgetMonth, loadBudgetPageData) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );

  let pageData;
  let overallBudgetSection;

  if (typeof loadBudgetPageData === "function") {
    [pageData, overallBudgetSection] = await Promise.all([
      loadBudgetPageData(month),
      budgetStore.getOverallBudgetSectionData(month),
    ]);
  } else {
    // Standalone fallback: same queries as getBudgetPageData /budget route.
    const [
      categories,
      spendingByCategoryId,
      actualSpendingByCategoryId,
      monthTotalSpent,
      monthExpenseCount,
    ] = await Promise.all([
      expenseStore.getCategories(),
      budgetStore.getSpendingTotalsByCategoryId(month),
      budgetStore.getActualSpendingTotalsByCategoryId(month),
      financeHelpers.getMonthlyExpenseTotal(month),
      financeHelpers.getExpenseCountForMonth(month),
    ]);

    const hasCategoryBudgets = await budgetStore.hasCategoryBudgetsForMonth(month);
    const categoryRows = hasCategoryBudgets
      ? await budgetStore.getBudgetRows(month, categories, spendingByCategoryId)
      : [];
    const monthBudgets = await budgetStore.getCategoryBudgets(month);
    const budgetedCategoryIds = monthBudgets
      .filter((b) => budgetStore.isBudgetActiveForMonth(b, month))
      .map((b) => b.categoryId);
    const everythingElse = budgetStore.getEverythingElseData(
      categories,
      budgetedCategoryIds,
      actualSpendingByCategoryId
    );
    const budgetTotals = budgetStore.getBudgetTotals(categoryRows);
    overallBudgetSection = await budgetStore.getOverallBudgetSectionData(month);
    const primaryBudget = await financeHelpers.resolvePrimaryMonthlyBudgetAmount(month);

    pageData = {
      budgetMonth: month,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
      hasCategoryBudgets,
      categoryRows,
      budgetTotals,
      everythingElse,
      categories,
      spendingByCategoryId,
      actualSpendingByCategoryId,
      monthExpenseCount,
      summary: buildBudgetSummary(primaryBudget, [], monthTotalSpent),
    };
  }

  return buildLiveFinanceSummaryFromBudgetPage(pageData, overallBudgetSection);
}

module.exports = {
  getLiveFinanceSummary,
  buildLiveFinanceSummaryFromBudgetPage,
  roundMoney,
};
