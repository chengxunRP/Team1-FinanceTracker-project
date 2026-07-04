// Budget calculation and validation helpers (Feature 4)

function isExpenseCountedForBudget(expense) {
  if (!expense) return true;
  return !expense.isExcludedFromBudget;
}

function calculateTotalSpent(expenses) {
  let total = 0;

  for (let i = 0; i < expenses.length; i++) {
    if (isExpenseCountedForBudget(expenses[i])) {
      total += expenses[i].amount;
    }
  }

  return total;
}

function validateMonthlyBudget(monthlyBudget) {
  const errors = [];
  const budget = Number(monthlyBudget);

  if (monthlyBudget === "" || Number.isNaN(budget)) {
    errors.push("Monthly budget must be a valid number.");
  } else if (budget <= 0) {
    errors.push("Budget must be greater than zero.");
  }

  return {
    errors,
    budget,
    valid: errors.length === 0,
  };
}

function calculatePercentageUsed(totalSpent, monthlyBudget) {
  return Math.round((totalSpent / monthlyBudget) * 100);
}

function calculateRemainingBudget(monthlyBudget, totalSpent) {
  return monthlyBudget - totalSpent;
}

function getStatus(percentageUsed) {
  if (percentageUsed >= 100) {
    return {
      label: "Overspending",
      badge: "danger",
      type: "overspending",
      message:
        "You have reached or exceeded your budget. Review your expenses.",
      progressClass: "progress-bar__fill--danger",
    };
  }

  if (percentageUsed >= 80) {
    return {
      label: "Warning",
      badge: "warning",
      type: "warning",
      message:
        "You have used 80% or more of your budget. Consider slowing down spending.",
      progressClass: "progress-bar__fill--warning",
    };
  }

  return {
    label: "Safe",
    badge: "success",
    type: "safe",
    message: null,
    progressClass: "",
  };
}

function getCategoryBudgetStatus(usedPct) {
  const pct = Number(usedPct) || 0;

  if (pct >= 100) {
    return {
      label: "Overspent",
      key: "overspent",
      barClass: "budget-progress--overspent",
      badgeClass: "budget-badge--overspent",
      cardClass: "budget-cat-card--overspent",
      warningMessage: null,
      showWarning: true,
    };
  }

  if (pct >= 80) {
    return {
      label: "Warning",
      key: "warning",
      barClass: "budget-progress--near-limit",
      badgeClass: "budget-badge--near-limit",
      cardClass: "budget-cat-card--near-limit",
      warningMessage: "You've used " + pct + "% of this category budget.",
      showWarning: true,
    };
  }

  if (pct >= 70) {
    return {
      label: "Watch",
      key: "watch",
      barClass: "budget-progress--watch",
      badgeClass: "budget-badge--watch",
      cardClass: "budget-cat-card--watch",
      warningMessage: null,
      showWarning: false,
    };
  }

  return {
    label: "Safe",
    key: "safe",
    barClass: "budget-progress--safe",
    badgeClass: "budget-badge--safe",
    cardClass: "budget-cat-card--safe",
    warningMessage: null,
    showWarning: false,
  };
}

function getMonthlyHealthStatus(percentageUsed) {
  const pct = Number(percentageUsed) || 0;

  if (pct >= 100) {
    return { label: "Over budget", key: "danger", helper: "Spending has exceeded your limit" };
  }
  if (pct >= 80) {
    return { label: "Watch spending", key: "warning", helper: "Approaching your monthly limit" };
  }
  return { label: "On track", key: "safe", helper: "Spending is within your budget" };
}

function buildBudgetSummary(monthlyBudget, expenses, totalSpentOverride) {
  const totalSpent =
    totalSpentOverride !== undefined && totalSpentOverride !== null
      ? Number(totalSpentOverride) || 0
      : calculateTotalSpent(expenses);
  const percentageUsed = calculatePercentageUsed(totalSpent, monthlyBudget);
  const remainingBudget = calculateRemainingBudget(monthlyBudget, totalSpent);
  const status = getStatus(percentageUsed);

  const progressWidth = Math.min(percentageUsed, 100);
  const progressWidthStep = Math.min(100, Math.round(progressWidth / 5) * 5);

  return {
    monthlyBudget,
    totalSpent,
    remainingBudget,
    percentageUsed,
    statusLabel: status.label,
    statusBadge: status.badge,
    alert: {
      type: status.type,
      message: status.message,
    },
    progressClass: status.progressClass,
    progressWidth,
    progressWidthClass: `progress-bar__fill--w${progressWidthStep}`,
  };
}

function validateCategoryBudgetAmount(amount) {
  const errors = [];
  const budget = Number(amount);

  if (amount === "" || Number.isNaN(budget)) {
    errors.push("Budget amount must be a valid number.");
  } else if (budget <= 0) {
    errors.push("Budget amount must be greater than zero.");
  }

  return {
    errors,
    budget,
    valid: errors.length === 0,
  };
}

function getCategoryStatusMessage(remaining) {
  const num = Number(remaining) || 0;

  if (num < 0) {
    const overspent = Math.abs(num);
    const text = overspent % 1 === 0 ? "$" + overspent.toLocaleString() : "$" + overspent.toFixed(2);
    return text + " overspent";
  }

  const leftText = num % 1 === 0 ? "$" + num.toLocaleString() : "$" + num.toFixed(2);
  return leftText + " left to spend";
}

const {
  getDisplayCategoryName,
  isBillsCategory,
} = require("./categoryHelpers");

module.exports = {
  isExpenseCountedForBudget,
  calculateTotalSpent,
  validateMonthlyBudget,
  validateCategoryBudgetAmount,
  calculatePercentageUsed,
  calculateRemainingBudget,
  getStatus,
  getCategoryBudgetStatus,
  getMonthlyHealthStatus,
  getCategoryStatusMessage,
  getDisplayCategoryName,
  isBillsCategory,
  buildBudgetSummary,
};
