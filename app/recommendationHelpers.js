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

  // Not recommended — worst case first
  if (summary.percentageUsed >= 100) {
    result = "Not recommended";
    resultBadge = "danger";
    reasons.push(
      "You have already used 100% or more of your monthly budget."
    );
  }

  if (exceedsBudget) {
    result = "Not recommended";
    resultBadge = "danger";
    reasons.push(
      `Buying this item will exceed your budget. You would spend $${newTotalSpent}, but your budget is $${summary.monthlyBudget}.`
    );
  }

  if (itemPrice > summary.remainingBudget && result !== "Not recommended") {
    result = "Not recommended";
    resultBadge = "danger";
    reasons.push(
      `Item price ($${itemPrice}) is more than your remaining budget ($${summary.remainingBudget}).`
    );
  }

  // Risky — only if not already not recommended
  if (result === "Safe to buy" && summary.percentageUsed >= 80) {
    result = "Risky";
    resultBadge = "warning";
    reasons.push(
      `You have already used ${summary.percentageUsed}% of your budget (80% warning level).`
    );
  }

  if (result === "Safe to buy" && newPercentageUsed >= 80) {
    result = "Risky";
    resultBadge = "warning";
    reasons.push(
      `This purchase would bring you to ${newPercentageUsed}% of your budget.`
    );
  }

  if (result === "Safe to buy" && categoryPercent >= HIGH_CATEGORY_PERCENT) {
    result = "Risky";
    resultBadge = "warning";
    reasons.push(
      `${item.category} is already high spending ($${categoryTotal}, ${categoryPercent}% of budget).`
    );
  }

  // Safe to buy — add positive reasons
  if (result === "Safe to buy") {
    reasons.push(
      `Item is within your remaining budget. You would have $${newRemainingBudget} left after buying.`
    );
    reasons.push(
      `Current spending: $${summary.totalSpent} of $${summary.monthlyBudget} (${summary.percentageUsed}% used).`
    );
  }

  return {
    itemName: item.itemName,
    itemPrice,
    category: item.category,
    result,
    resultBadge,
    reasons,
    analysis: {
      totalSpent: summary.totalSpent,
      remainingBudget: summary.remainingBudget,
      percentageUsed: summary.percentageUsed,
      newTotalSpent,
      newRemainingBudget,
      newPercentageUsed,
      exceedsBudget,
      categoryTotal,
      categoryPercent,
    },
  };
}

module.exports = {
  validateItemInput,
  getCategoryTotal,
  getSpendingRecommendation,
};
