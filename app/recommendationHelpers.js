// Smart Spending Recommendation helpers (Feature 7)

const HIGH_CATEGORY_PERCENT = 20;

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
    if (
      expenses[i].category.toLowerCase() === category.toLowerCase()
    ) {
      total += expenses[i].amount;
    }
  }

  return total;
}

function getFinanceSnapshot(summary, expenses) {
  const categoryTotals = {};

  for (let i = 0; i < expenses.length; i++) {
    const cat = expenses[i].category;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + expenses[i].amount;
  }

  let highestCategory = "—";
  let highestCategoryAmount = 0;

  for (const category in categoryTotals) {
    if (categoryTotals[category] > highestCategoryAmount) {
      highestCategory = category;
      highestCategoryAmount = categoryTotals[category];
    }
  }

  return {
    monthlyBudget: summary.monthlyBudget,
    totalSpent: summary.totalSpent,
    remainingBudget: summary.remainingBudget,
    percentageUsed: summary.percentageUsed,
    highestCategory,
    highestCategoryAmount,
  };
}

function calculateRecommendationScore(result, analysis) {
  if (result === "Not recommended") {
    return analysis.exceedsBudget ? 20 : 30;
  }

  if (result === "Risky") {
    return analysis.newPercentageUsed >= 90 ? 50 : 60;
  }

  return analysis.newPercentageUsed < 50 ? 90 : 85;
}

function getSpendingRecommendation(summary, expenses, item) {
  const itemPrice = item.itemPrice;
  const newTotalSpent = summary.totalSpent + itemPrice;
  const newRemainingBudget = summary.monthlyBudget - newTotalSpent;
  const newPercentageUsed = Math.round(
    (newTotalSpent / summary.monthlyBudget) * 100
  );
  const exceedsBudget = newTotalSpent > summary.monthlyBudget;

  const categoryTotal = getCategoryTotal(expenses, item.category);
  const categoryPercent = Math.round(
    (categoryTotal / summary.monthlyBudget) * 100
  );

  const reasons = [];
  let result = "Safe to buy";
  let resultBadge = "success";

  if (summary.percentageUsed >= 100) {
    result = "Not recommended";
    resultBadge = "danger";
    reasons.push(
      "You have already used more than 100% of your monthly budget."
    );
  }

  if (exceedsBudget) {
    result = "Not recommended";
    resultBadge = "danger";
    reasons.push("This purchase will exceed your monthly budget.");
  }

  if (itemPrice > summary.remainingBudget && result !== "Not recommended") {
    result = "Not recommended";
    resultBadge = "danger";
    reasons.push(
      `Item price ($${itemPrice}) is more than your remaining budget ($${summary.remainingBudget}).`
    );
  }

  if (result === "Safe to buy" && summary.percentageUsed >= 80) {
    result = "Risky";
    resultBadge = "warning";
    reasons.push("You have already used more than 80% of your budget.");
  }

  if (result === "Safe to buy" && newPercentageUsed >= 80) {
    result = "Risky";
    resultBadge = "warning";
    reasons.push(
      `This purchase would bring your budget usage to ${newPercentageUsed}%.`
    );
  }

  if (result === "Safe to buy" && categoryPercent >= HIGH_CATEGORY_PERCENT) {
    result = "Risky";
    resultBadge = "warning";
    reasons.push(
      "This category is already one of your highest spending areas."
    );
  }

  if (result === "Safe to buy") {
    reasons.push("Item fits within your remaining budget.");
    reasons.push(
      `You would have $${newRemainingBudget} left after this purchase.`
    );
  }

  const analysis = {
    totalSpent: summary.totalSpent,
    remainingBudget: summary.remainingBudget,
    percentageUsed: summary.percentageUsed,
    newTotalSpent,
    newRemainingBudget,
    newPercentageUsed,
    exceedsBudget,
    categoryTotal,
    categoryPercent,
  };

  return {
    itemName: item.itemName,
    itemPrice,
    category: item.category,
    result,
    resultBadge,
    score: calculateRecommendationScore(result, analysis),
    reasons,
    analysis,
    financeSnapshot: getFinanceSnapshot(summary, expenses),
  };
}

module.exports = {
  validateItemInput,
  getCategoryTotal,
  getFinanceSnapshot,
  getSpendingRecommendation,
};
