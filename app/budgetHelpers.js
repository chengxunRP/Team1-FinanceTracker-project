// Budget calculation and validation helpers (Feature 4)

function calculateTotalSpent(expenses) {
  let total = 0;

  for (let i = 0; i < expenses.length; i++) {
    total += expenses[i].amount;
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

function buildBudgetSummary(monthlyBudget, expenses) {
  const totalSpent = calculateTotalSpent(expenses);
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

module.exports = {
  calculateTotalSpent,
  validateMonthlyBudget,
  calculatePercentageUsed,
  calculateRemainingBudget,
  getStatus,
  buildBudgetSummary,
};
