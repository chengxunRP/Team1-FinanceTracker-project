// Purchase Checker (Smart Purchase Checker) — compares a hypothetical item against real budgets.
// Does not save the item to MySQL; only reads the logged-in user's expenses and budget rows.
const { getStandardCategoryName } = require("./categoryHelpers");
const { buildBudgetSummary } = require("./budgetHelpers");

const WARNING_PERCENT = 80;
const HIGH_CATEGORY_PERCENT = 20;
const LARGE_SHARE_OF_REMAINING = 0.5;
const LITTLE_LEFT_PERCENT = 15;

function categoryNamesMatch(expenseCategory, selectedCategory) {
  return (
    getStandardCategoryName(expenseCategory) ===
    getStandardCategoryName(selectedCategory)
  );
}

function validateItemInput(itemName, itemPrice, category) {
  const errors = [];
  const price = Number(itemPrice);

  if (!itemName || itemName.trim() === "") {
    errors.push("Item name is required.");
  }

  if (itemPrice === "" || Number.isNaN(price)) {
    errors.push("Item price must be a valid number.");
  } else if (price < 0) {
    errors.push("Item price cannot be negative.");
  }

  if (!category || category.trim() === "") {
    errors.push("Category is required.");
  }

  return {
    errors,
    itemName: itemName ? itemName.trim() : "",
    itemPrice: price,
    category: category ? category.trim() : "",
    valid: errors.length === 0,
  };
}

// Respects "Don't count": category budgets skip is_excluded_from_budget;
// All Categories checks skip is_excluded_from_all_budget.
function isExpenseCountedForPurchaseCheck(expense, useAllBudgetCounting) {
  if (!expense) return false;
  if (useAllBudgetCounting) {
    return !expense.isExcludedFromAllBudget;
  }
  return !expense.isExcludedFromBudget;
}

function findCategoryBudgetRow(categoryBudgetRows, categoryName) {
  if (!Array.isArray(categoryBudgetRows) || !categoryName) return null;
  return (
    categoryBudgetRows.find((row) =>
      categoryNamesMatch(row.displayName || row.name, categoryName)
    ) || null
  );
}

function getCategoryTotal(expenses, category, options) {
  const useAllBudgetCounting = Boolean(options && options.useAllBudgetCounting);
  const forCategoryBudget = Boolean(options && options.forCategoryBudget);
  let total = 0;

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const counted = forCategoryBudget
      ? !expense.isExcludedFromBudget
      : isExpenseCountedForPurchaseCheck(expense, useAllBudgetCounting);
    if (!counted) continue;
    if (categoryNamesMatch(expense.category, category)) {
      total += expense.amount;
    }
  }

  return total;
}

function getSpendingByCategory(expenses, options) {
  const useAllBudgetCounting = Boolean(options && options.useAllBudgetCounting);
  const totals = {};

  for (let i = 0; i < expenses.length; i++) {
    if (!isExpenseCountedForPurchaseCheck(expenses[i], useAllBudgetCounting)) {
      continue;
    }
    const cat = expenses[i].category;
    totals[cat] = (totals[cat] || 0) + expenses[i].amount;
  }

  const list = [];

  for (const category in totals) {
    list.push({ category, amount: totals[category] });
  }

  list.sort(function (a, b) {
    return b.amount - a.amount;
  });

  return list;
}

function getFinanceSnapshot(summary, expenses, options) {
  const spendingByCategory = getSpendingByCategory(expenses, options);
  const highest = spendingByCategory[0] || {
    category: "—",
    amount: 0,
  };

  return {
    monthlyBudget: summary.monthlyBudget,
    totalSpent: summary.totalSpent,
    remainingBudget: summary.remainingBudget,
    percentageUsed: summary.percentageUsed,
    highestCategory: highest.category,
    highestCategoryAmount: highest.amount,
    spendingByCategory,
  };
}

function clampScore(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getScoreBandForResult(result) {
  if (result === "Safe to buy") {
    return { min: 70, max: 100 };
  }
  if (result === "Risky") {
    return { min: 40, max: 69 };
  }
  return { min: 0, max: 39 };
}

function resolveMonthlyBudgetFromAnalysis(analysis) {
  const newPct = Number(analysis.newPercentageUsed) || 0;
  const newTotalSpent = Number(analysis.newTotalSpent) || 0;
  if (newPct > 0 && newTotalSpent > 0) {
    return (newTotalSpent / newPct) * 100;
  }

  const totalSpent = Number(analysis.totalSpent) || 0;
  const remainingBefore = Number(analysis.remainingBudget);
  if (Number.isFinite(remainingBefore)) {
    return Math.max(0, totalSpent + remainingBefore);
  }
  return Math.max(0, totalSpent);
}

/**
 * Dynamic purchase score from financial impact (not a fixed label lookup).
 * Starts at 100, applies penalties from the analysis object, then clamps into
 * the band for the final result label (Safe 70–100, Risky 40–69, Not recommended 0–39).
 */
function calculateRecommendationScore(result, analysis) {
  const a = analysis || {};
  let score = 100;

  const newPct = Math.max(0, Number(a.newPercentageUsed) || 0);
  const remainingAfter = Number(a.newRemainingBudget);
  const remainingBefore = Number(a.remainingBudget);
  const totalSpent = Number(a.totalSpent) || 0;
  const newTotalSpent = Number(a.newTotalSpent) || 0;
  const monthlyBudget = resolveMonthlyBudgetFromAnalysis(a);
  const itemPrice = Math.max(0, newTotalSpent - totalSpent);
  const sharePct = Number(a.shareOfRemainingPercent);

  // 1. Higher overall budget usage after purchase → lower score
  score -= Math.min(40, newPct * 0.32);
  if (newPct > 100) {
    score -= Math.min(28, (newPct - 100) * 0.35);
  }

  // 2. Low or negative remaining budget after purchase
  if (Number.isFinite(remainingAfter)) {
    if (remainingAfter < 0) {
      const overspend = Math.abs(remainingAfter);
      const overspendRatio = monthlyBudget > 0 ? overspend / monthlyBudget : 1;
      score -= 10 + Math.min(32, overspendRatio * 50);
    } else if (monthlyBudget > 0) {
      const remainPct = (remainingAfter / monthlyBudget) * 100;
      if (remainPct < LITTLE_LEFT_PERCENT) {
        score -= (LITTLE_LEFT_PERCENT - remainPct) * 0.75;
      }
    } else if (remainingAfter === 0) {
      score -= 6;
    }
  }

  // 3. Item price vs remaining budget before purchase
  if (Number.isFinite(sharePct) && sharePct > 0) {
    score -= Math.min(18, sharePct * 0.14);
  } else if (a.itemExceedsRemaining) {
    score -= 14;
    if (Number.isFinite(remainingBefore) && remainingBefore > 0 && itemPrice > remainingBefore) {
      score -= Math.min(12, ((itemPrice - remainingBefore) / remainingBefore) * 10);
    } else if (!Number.isFinite(remainingBefore) || remainingBefore <= 0) {
      score -= 8;
    }
  }

  // 4–5. Category budget exceeded (and how far)
  if (a.categoryExceedsAfterPurchase || a.categoryWouldOverspend) {
    score -= 8;
    const categoryBudget = Number(a.categoryBudget) || 0;
    const newCategoryRemaining = Number(a.newCategoryRemaining);
    if (
      categoryBudget > 0 &&
      Number.isFinite(newCategoryRemaining) &&
      newCategoryRemaining < 0
    ) {
      const categoryOverRatio = Math.abs(newCategoryRemaining) / categoryBudget;
      score -= Math.min(20, categoryOverRatio * 34);
    }
  }

  // 6. Already overspending before this purchase
  if (a.alreadyOverspending) {
    score -= 12;
  }

  // 7. Purchase leaves very little remaining
  if (a.leavesLittleRemaining) {
    score -= 6;
  }

  if (a.isHighSpendCategory) {
    score -= 2;
  }

  score = Math.round(clampScore(score, 0, 100));

  const band = getScoreBandForResult(result);
  return Math.round(clampScore(score, band.min, band.max));
}

function buildReasons(result, analysis, financeSnapshot, item) {
  const reasons = [];
  const currencyService = require("./currencyService");
  const { getRequestCurrency } = require("./requestUserContext");
  const code = getRequestCurrency() || currencyService.BASE_CURRENCY;
  const money = (amountBase) => {
    try {
      return currencyService.formatFromBase(amountBase, code);
    } catch (error) {
      return currencyService.formatFromBase(amountBase, currencyService.BASE_CURRENCY);
    }
  };

  if (result === "Not recommended") {
    if (analysis.alreadyOverspending) {
      reasons.push("You are already overspending your monthly budget.");
    }
    if (analysis.itemExceedsRemaining) {
      reasons.push(
        `This item (${money(item.itemPrice)}) costs more than your remaining budget (${money(analysis.remainingBudget)}).`
      );
    }
    if (analysis.exceedsBudget) {
      reasons.push("This purchase would push your spending above 100% of your budget.");
    }
    if (analysis.categoryWouldOverspend) {
      reasons.push(
        `This purchase would exceed your ${item.category} category budget (only ${money(analysis.categoryRemaining)} left in that category).`
      );
    }
  }

  if (result === "Risky") {
    if (analysis.alreadyAtWarning) {
      reasons.push("You have already used more than 80% of your budget.");
    }
    if (analysis.pushesToWarning) {
      reasons.push(
        `After this purchase, you would be at ${analysis.newPercentageUsed}% of your budget.`
      );
    }
    if (analysis.usesLargeShareOfRemaining) {
      reasons.push(
        `This item uses a large share of your remaining budget (${analysis.shareOfRemainingPercent}%).`
      );
    }
    if (analysis.categoryWouldOverspend && !analysis.itemExceedsRemaining) {
      reasons.push(
        `Your overall budget can afford this, but ${item.category} only has ${money(analysis.categoryRemaining)} left in its category budget.`
      );
    }
    if (analysis.isHighSpendCategory) {
      reasons.push(
        `${item.category} is already one of your highest spending categories.`
      );
    }
    if (analysis.leavesLittleRemaining) {
      reasons.push(
        `This purchase will leave you with only ${money(analysis.newRemainingBudget)}.`
      );
    }
  }

  if (result === "Safe to buy") {
    reasons.push("This item fits within your remaining budget.");
    reasons.push(
      `After buying, you would still have ${money(analysis.newRemainingBudget)} left (${analysis.newPercentageUsed}% used).`
    );
    if (!analysis.isHighSpendCategory) {
      reasons.push(`${item.category} is not heavily overspent in your spending habits.`);
    }
    reasons.push("Budget usage after purchase stays below the 80% warning level.");
  }

  return reasons.slice(0, 4);
}

function buildSpendingInsight(itemCategory, financeSnapshot) {
  const itemCategoryData = financeSnapshot.spendingByCategory.find(
    function (row) {
      return categoryNamesMatch(row.category, itemCategory);
    }
  );

  const itemCategoryAmount = itemCategoryData ? itemCategoryData.amount : 0;
  const itemCategoryPercent = Math.round(
    (itemCategoryAmount / financeSnapshot.monthlyBudget) * 100
  );

  const isHighestCategory = categoryNamesMatch(
    itemCategory,
    financeSnapshot.highestCategory
  );

  const isHighSpendCategory = itemCategoryPercent >= HIGH_CATEGORY_PERCENT;

  let warningMessage = null;

  if (isHighestCategory) {
    warningMessage =
      "You are buying in your highest spending category. Consider whether this purchase is necessary.";
  } else if (isHighSpendCategory) {
    warningMessage =
      "You already spend a lot in this category. This purchase adds more pressure to that area.";
  }

  return {
    highestCategory: financeSnapshot.highestCategory,
    highestCategoryAmount: financeSnapshot.highestCategoryAmount,
    itemCategory,
    itemCategoryAmount,
    itemCategoryPercent,
    isHighestCategory,
    isHighSpendCategory,
    warningMessage,
  };
}

function buildCategoryBudgetSummary(categoryRow) {
  const budget =
    Number(categoryRow.availableBudget ?? categoryRow.budgeted) || 0;
  const spent = Number(categoryRow.actual) || 0;
  return buildBudgetSummary(budget, [], spent);
}

// Main Purchase Checker decision: safe / risky / not recommended.
// budgetMode "overall" = All Categories Budget exists; "category-only" = check selected category only;
// "none" = no usable budget (no fake totals from summing categories).
function getSpendingRecommendation(summary, expenses, item, options) {
  const purchaseOptions = options || {};
  const hasOverallBudget =
    purchaseOptions.hasOverallBudget !== undefined
      ? Boolean(purchaseOptions.hasOverallBudget)
      : Number(summary.monthlyBudget) > 0;
  const useAllBudgetCounting = Boolean(purchaseOptions.useAllBudgetCounting);
  const categoryBudgetRows = purchaseOptions.categoryBudgetRows || [];
  const categoryRow = findCategoryBudgetRow(categoryBudgetRows, item.category);

  let budgetMode = "none";
  let budgetNote = null;
  let effectiveSummary = summary;

  if (hasOverallBudget) {
    budgetMode = "overall";
    effectiveSummary = summary;
  } else if (categoryRow) {
    budgetMode = "category-only";
    effectiveSummary = buildCategoryBudgetSummary(categoryRow);
    budgetNote =
      "Overall budget is not set yet, but you can still check this purchase against your selected category budget.";
  } else {
    budgetMode = "none";
    effectiveSummary = buildBudgetSummary(0, [], 0);
    budgetNote =
      "This category does not have a budget yet, so only general purchase advice can be shown.";
  }

  if (budgetMode === "none") {
    return {
      itemName: item.itemName,
      itemPrice: item.itemPrice,
      category: item.category,
      result: "Not recommended",
      resultBadge: "warning",
      score: 30,
      budgetMode,
      budgetNote,
      reasons: [
        budgetNote,
        "Create an All Categories Budget to check purchases against your overall monthly spending limit.",
      ],
      analysis: {
        totalSpent: 0,
        remainingBudget: 0,
        percentageUsed: 0,
        newTotalSpent: item.itemPrice,
        newRemainingBudget: 0,
        newPercentageUsed: 0,
        categoryBudget: 0,
        categorySpent: 0,
        categoryRemaining: null,
      },
      spendingInsight: {
        highestCategory: "—",
        highestCategoryAmount: 0,
        itemCategory: item.category,
        itemCategoryAmount: 0,
        itemCategoryPercent: 0,
        isHighestCategory: false,
        isHighSpendCategory: false,
        warningMessage: budgetNote,
      },
      financeSnapshot: getFinanceSnapshot(effectiveSummary, expenses, {
        useAllBudgetCounting: false,
      }),
    };
  }

  const financeSnapshot = getFinanceSnapshot(effectiveSummary, expenses, {
    useAllBudgetCounting,
  });
  const itemPrice = item.itemPrice;
  const monthlyBudget = Number(effectiveSummary.monthlyBudget) || 0;

  const newTotalSpent = effectiveSummary.totalSpent + itemPrice;
  const newRemainingBudget = effectiveSummary.monthlyBudget - newTotalSpent;
  const newPercentageUsed =
    monthlyBudget > 0
      ? Math.round((newTotalSpent / monthlyBudget) * 100)
      : 100;

  const categoryTotal = getCategoryTotal(expenses, item.category, {
    useAllBudgetCounting,
  });
  const categoryPercent =
    monthlyBudget > 0
      ? Math.round((categoryTotal / monthlyBudget) * 100)
      : 0;

  const categoryBudget = categoryRow
    ? Number(categoryRow.availableBudget ?? categoryRow.budgeted) || 0
    : 0;
  const categorySpent = categoryRow ? Number(categoryRow.actual) || 0 : 0;
  const categoryRemaining = categoryRow
    ? Number(categoryRow.remaining) || 0
    : null;
  const newCategorySpent = categorySpent + itemPrice;
  const newCategoryRemaining =
    categoryRow != null ? categoryBudget - newCategorySpent : null;
  const categoryWouldOverspend =
    budgetMode === "overall" &&
    categoryRow != null &&
    itemPrice > Math.max(categoryRemaining, 0);
  const categoryExceedsAfterPurchase =
    budgetMode === "overall" &&
    categoryRow != null &&
    newCategorySpent > categoryBudget;

  const alreadyOverspending = effectiveSummary.percentageUsed >= 100;
  const itemExceedsRemaining = itemPrice > effectiveSummary.remainingBudget;
  const exceedsBudget =
    monthlyBudget > 0 && newTotalSpent > monthlyBudget;
  const alreadyAtWarning = effectiveSummary.percentageUsed >= WARNING_PERCENT;
  const pushesToWarning = newPercentageUsed >= WARNING_PERCENT;
  const usesLargeShareOfRemaining =
    effectiveSummary.remainingBudget > 0 &&
    itemPrice / effectiveSummary.remainingBudget >= LARGE_SHARE_OF_REMAINING;
  const shareOfRemainingPercent =
    effectiveSummary.remainingBudget > 0
      ? Math.round((itemPrice / effectiveSummary.remainingBudget) * 100)
      : 100;
  const isHighSpendCategory =
    categoryPercent >= HIGH_CATEGORY_PERCENT ||
    categoryNamesMatch(item.category, financeSnapshot.highestCategory);
  const leavesLittleRemaining =
    monthlyBudget > 0 &&
    newRemainingBudget >= 0 &&
    (newRemainingBudget / monthlyBudget) * 100 < LITTLE_LEFT_PERCENT;

  const analysisFlags = {
    alreadyOverspending,
    itemExceedsRemaining,
    exceedsBudget,
    alreadyAtWarning,
    pushesToWarning,
    usesLargeShareOfRemaining,
    shareOfRemainingPercent,
    isHighSpendCategory,
    leavesLittleRemaining,
    categoryTotal,
    categoryPercent,
    categoryBudget,
    categorySpent,
    categoryRemaining,
    newCategorySpent,
    newCategoryRemaining,
    categoryWouldOverspend,
    categoryExceedsAfterPurchase,
    totalSpent: effectiveSummary.totalSpent,
    remainingBudget: effectiveSummary.remainingBudget,
    percentageUsed: effectiveSummary.percentageUsed,
    newTotalSpent,
    newRemainingBudget,
    newPercentageUsed,
  };

  let result = "Safe to buy";
  let resultBadge = "success";

  if (
    monthlyBudget <= 0 ||
    alreadyOverspending ||
    itemExceedsRemaining ||
    exceedsBudget ||
    categoryExceedsAfterPurchase
  ) {
    result = "Not recommended";
    resultBadge = "danger";
  } else if (
    alreadyAtWarning ||
    pushesToWarning ||
    usesLargeShareOfRemaining ||
    leavesLittleRemaining ||
    categoryWouldOverspend
  ) {
    result = "Risky";
    resultBadge = "warning";
  } else {
    result = "Safe to buy";
    resultBadge = "success";
  }

  const analysis = analysisFlags;
  const spendingInsight = buildSpendingInsight(item.category, financeSnapshot);
  const reasons = buildReasons(result, analysis, financeSnapshot, item);
  if (budgetNote) {
    reasons.unshift(budgetNote);
  }
  if (
    budgetMode === "overall" &&
    categoryWouldOverspend &&
    !analysis.itemExceedsRemaining
  ) {
    reasons.unshift(
      `You have enough overall budget, but this purchase exceeds your ${item.category} category budget.`
    );
  }

  return {
    itemName: item.itemName,
    itemPrice,
    category: item.category,
    result,
    resultBadge,
    score: calculateRecommendationScore(result, analysis),
    budgetMode,
    budgetNote,
    reasons: reasons.slice(0, 5),
    analysis,
    spendingInsight,
    financeSnapshot,
  };
}

module.exports = {
  validateItemInput,
  isExpenseCountedForPurchaseCheck,
  findCategoryBudgetRow,
  getCategoryTotal,
  getSpendingByCategory,
  getFinanceSnapshot,
  getSpendingRecommendation,
};
