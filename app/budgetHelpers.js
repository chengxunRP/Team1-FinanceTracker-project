// Shared budget math used by Spending & Budgets, in-app alerts, emails, and Purchase Checker.
// "Don't count" expenses are skipped via is_excluded_from_budget / is_excluded_from_all_budget flags.

function isExpenseCountedForBudget(expense) {
  if (!expense) return true;
  return !expense.isExcludedFromBudget;
}

function isExpenseCountedForAllBudget(expense) {
  if (!expense) return true;
  return !expense.isExcludedFromAllBudget;
}

function calculateTotalSpent(expenses, options = {}) {
  const isCounted =
    options.allBudget === true
      ? isExpenseCountedForAllBudget
      : isExpenseCountedForBudget;
  let total = 0;

  for (let i = 0; i < expenses.length; i++) {
    if (isCounted(expenses[i])) {
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

function toBudgetCents(value) {
  return Math.round((Number(value) || 0) * 100);
}

// Decide whether a budget is safe, warning, reached or exceeded.
// Receives spent and budget amounts, converts both to cents to avoid decimal
// comparison errors, then returns: below 80% = safe, 80% to below 100% = warning,
// exactly 100% = reached, above budget = exceeded. The returned state is used by
// in-app alert banners, email alerts and status labels on the Budget pages.
function getBudgetUsageState(spent, budget) {
  const spentCents = toBudgetCents(spent);
  const budgetCents = toBudgetCents(budget);

  if (budgetCents <= 0) {
    return {
      state: "safe",
      usedPct: 0,
      spentCents,
      budgetCents,
    };
  }

  const usedPct = Math.round((spentCents / budgetCents) * 100);

  if (spentCents > budgetCents) {
    return { state: "exceeded", usedPct, spentCents, budgetCents };
  }
  if (spentCents === budgetCents) {
    return { state: "reached", usedPct, spentCents, budgetCents };
  }
  if (usedPct >= 80) {
    return { state: "warning", usedPct, spentCents, budgetCents };
  }
  return { state: "safe", usedPct, spentCents, budgetCents };
}

function getStatus(percentageUsed, totalSpent, monthlyBudget) {
  if (totalSpent !== undefined && monthlyBudget !== undefined) {
    const usage = getBudgetUsageState(totalSpent, monthlyBudget);
    if (usage.state === "exceeded") {
      return {
        label: "Overspending",
        badge: "danger",
        type: "overspending",
        message: "You have exceeded your budget. Review your expenses.",
        progressClass: "progress-bar__fill--danger",
      };
    }
    if (usage.state === "reached") {
      return {
        label: "Budget reached",
        badge: "danger",
        type: "reached",
        message: "You have used all of your budget.",
        progressClass: "progress-bar__fill--danger",
      };
    }
    if (usage.state === "warning") {
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

  const pct = Number(percentageUsed) || 0;
  if (pct > 100) {
    return {
      label: "Overspending",
      badge: "danger",
      type: "overspending",
      message: "You have exceeded your budget. Review your expenses.",
      progressClass: "progress-bar__fill--danger",
    };
  }
  if (pct === 100) {
    return {
      label: "Budget reached",
      badge: "danger",
      type: "reached",
      message: "You have used all of your budget.",
      progressClass: "progress-bar__fill--danger",
    };
  }

  if (pct >= 80) {
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

function getCategoryBudgetStatus(spent, budget) {
  const usage = getBudgetUsageState(spent, budget);

  if (usage.state === "exceeded") {
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

  if (usage.state === "reached") {
    return {
      label: "Budget reached",
      key: "reached",
      barClass: "budget-progress--overspent",
      badgeClass: "budget-badge--overspent",
      cardClass: "budget-cat-card--overspent",
      warningMessage: null,
      showWarning: true,
    };
  }

  if (usage.state === "warning") {
    return {
      label: "Warning",
      key: "warning",
      barClass: "budget-progress--near-limit",
      badgeClass: "budget-badge--near-limit",
      cardClass: "budget-cat-card--near-limit",
      warningMessage: "You've used " + usage.usedPct + "% of this category budget.",
      showWarning: true,
    };
  }

  if (usage.usedPct >= 70) {
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

function getMonthlyHealthStatus(percentageUsed, totalSpent, monthlyBudget) {
  if (totalSpent !== undefined && monthlyBudget !== undefined) {
    const usage = getBudgetUsageState(totalSpent, monthlyBudget);
    if (usage.state === "exceeded") {
      return { label: "Over budget", key: "danger", helper: "Spending has exceeded your limit" };
    }
    if (usage.state === "reached") {
      return { label: "Budget reached", key: "danger", helper: "You have used all of your budget" };
    }
    if (usage.state === "warning") {
      return { label: "Watch spending", key: "warning", helper: "Approaching your monthly limit" };
    }
    return { label: "On track", key: "safe", helper: "Spending is within your budget" };
  }

  const pct = Number(percentageUsed) || 0;

  if (pct > 100) {
    return { label: "Over budget", key: "danger", helper: "Spending has exceeded your limit" };
  }
  if (pct === 100) {
    return { label: "Budget reached", key: "danger", helper: "You have used all of your budget" };
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
  const status = getStatus(percentageUsed, totalSpent, monthlyBudget);

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

function getCategoryStatusMessage(remaining, spent, budget) {
  const currencyService = require("./currencyService");
  const { getRequestCurrency } = require("./requestUserContext");
  const code = getRequestCurrency() || currencyService.BASE_CURRENCY;

  function formatStatusMoney(value) {
    try {
      return currencyService.formatFromBase(value, code);
    } catch (error) {
      return currencyService.formatFromBase(value, currencyService.BASE_CURRENCY);
    }
  }

  if (spent !== undefined && spent !== null && budget !== undefined && budget !== null) {
    const usage = getBudgetUsageState(spent, budget);
    if (usage.state === "exceeded") {
      const overspent = (usage.spentCents - usage.budgetCents) / 100;
      return formatStatusMoney(overspent) + " overspent";
    }

    const left = Math.max((usage.budgetCents - usage.spentCents) / 100, 0);
    return formatStatusMoney(left) + " left to spend";
  }

  const num = Number(remaining) || 0;

  if (num < 0) {
    return formatStatusMoney(Math.abs(num)) + " overspent";
  }

  return formatStatusMoney(num) + " left to spend";
}

const {
  getDisplayCategoryName,
  isBillsCategory,
} = require("./categoryHelpers");

module.exports = {
  isExpenseCountedForBudget,
  isExpenseCountedForAllBudget,
  calculateTotalSpent,
  validateMonthlyBudget,
  validateCategoryBudgetAmount,
  calculatePercentageUsed,
  calculateRemainingBudget,
  toBudgetCents,
  getBudgetUsageState,
  getStatus,
  getCategoryBudgetStatus,
  getMonthlyHealthStatus,
  getCategoryStatusMessage,
  getDisplayCategoryName,
  isBillsCategory,
  buildBudgetSummary,
};
