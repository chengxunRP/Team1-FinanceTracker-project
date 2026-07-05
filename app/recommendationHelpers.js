// Smart Spending Recommendation helpers (Feature 7)

const { getStandardCategoryName } = require("./categoryHelpers");

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

function getCategoryTotal(expenses, category) {
  let total = 0;

  for (let i = 0; i < expenses.length; i++) {
    if (!expenses[i].isExcludedFromBudget &&
        categoryNamesMatch(expenses[i].category, category)) {
      total += expenses[i].amount;
    }
  }

  return total;
}

function getSpendingByCategory(expenses) {
  const totals = {};

  for (let i = 0; i < expenses.length; i++) {
    if (expenses[i].isExcludedFromBudget) continue;
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

function getFinanceSnapshot(summary, expenses) {
  const spendingByCategory = getSpendingByCategory(expenses);
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

function calculateRecommendationScore(result, analysis) {
  if (result === "Not recommended") {
    if (analysis.alreadyOverspending) {
      return 20;
    }
    return 30;
  }

  if (result === "Risky") {
    if (analysis.newPercentageUsed >= 90 || analysis.leavesLittleRemaining) {
      return 50;
    }
    return 60;
  }

  if (analysis.newPercentageUsed < 50) {
    return 90;
  }

  return 85;
}

function buildReasons(result, analysis, financeSnapshot, item) {
  const reasons = [];

  if (result === "Not recommended") {
    if (analysis.alreadyOverspending) {
      reasons.push("You are already overspending your monthly budget.");
    }
    if (analysis.itemExceedsRemaining) {
      reasons.push(
        `This item ($${item.itemPrice}) costs more than your remaining budget ($${analysis.remainingBudget}).`
      );
    }
    if (analysis.exceedsBudget) {
      reasons.push("This purchase would push your spending above 100% of your budget.");
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
    if (analysis.isHighSpendCategory) {
      reasons.push(
        `${item.category} is already one of your highest spending categories.`
      );
    }
    if (analysis.leavesLittleRemaining) {
      reasons.push(
        `This purchase will leave you with only $${analysis.newRemainingBudget}.`
      );
    }
  }

  if (result === "Safe to buy") {
    reasons.push("This item fits within your remaining budget.");
    reasons.push(
      `After buying, you would still have $${analysis.newRemainingBudget} left (${analysis.newPercentageUsed}% used).`
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

function getSpendingRecommendation(summary, expenses, item) {
  const financeSnapshot = getFinanceSnapshot(summary, expenses);
  const itemPrice = item.itemPrice;

  const newTotalSpent = summary.totalSpent + itemPrice;
  const newRemainingBudget = summary.monthlyBudget - newTotalSpent;
  const newPercentageUsed = Math.round(
    (newTotalSpent / summary.monthlyBudget) * 100
  );

  const categoryTotal = getCategoryTotal(expenses, item.category);
  const categoryPercent = Math.round(
    (categoryTotal / summary.monthlyBudget) * 100
  );

  const alreadyOverspending = summary.percentageUsed >= 100;
  const itemExceedsRemaining = itemPrice > summary.remainingBudget;
  const exceedsBudget = newTotalSpent > summary.monthlyBudget;
  const alreadyAtWarning = summary.percentageUsed >= WARNING_PERCENT;
  const pushesToWarning = newPercentageUsed >= WARNING_PERCENT;
  const usesLargeShareOfRemaining =
    summary.remainingBudget > 0 &&
    itemPrice / summary.remainingBudget >= LARGE_SHARE_OF_REMAINING;
  const shareOfRemainingPercent =
    summary.remainingBudget > 0
      ? Math.round((itemPrice / summary.remainingBudget) * 100)
      : 100;
  const isHighSpendCategory =
    categoryPercent >= HIGH_CATEGORY_PERCENT ||
    categoryNamesMatch(item.category, financeSnapshot.highestCategory);
  const leavesLittleRemaining =
    newRemainingBudget >= 0 &&
    (newRemainingBudget / summary.monthlyBudget) * 100 < LITTLE_LEFT_PERCENT;

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
    totalSpent: summary.totalSpent,
    remainingBudget: summary.remainingBudget,
    percentageUsed: summary.percentageUsed,
    newTotalSpent,
    newRemainingBudget,
    newPercentageUsed,
  };

  let result = "Safe to buy";
  let resultBadge = "success";

  if (alreadyOverspending || itemExceedsRemaining || exceedsBudget) {
    result = "Not recommended";
    resultBadge = "danger";
  } else if (
    alreadyAtWarning ||
    pushesToWarning ||
    usesLargeShareOfRemaining ||
    leavesLittleRemaining
  ) {
    result = "Risky";
    resultBadge = "warning";
  } else {
    result = "Safe to buy";
    resultBadge = "success";
  }

  const analysis = analysisFlags;
  const spendingInsight = buildSpendingInsight(item.category, financeSnapshot);

  return {
    itemName: item.itemName,
    itemPrice,
    category: item.category,
    result,
    resultBadge,
    score: calculateRecommendationScore(result, analysis),
    reasons: buildReasons(result, analysis, financeSnapshot, item),
    analysis,
    spendingInsight,
    financeSnapshot,
  };
}

module.exports = {
  validateItemInput,
  getCategoryTotal,
  getSpendingByCategory,
  getFinanceSnapshot,
  getSpendingRecommendation,
};
