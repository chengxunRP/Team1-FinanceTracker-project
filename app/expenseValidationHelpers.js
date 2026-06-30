// Expense date validation — expense_date cannot be later than today.

const FUTURE_DATE_ERROR = "The date cannot be later than today.";

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isExpenseDateInFuture(dateStr, today = new Date()) {
  if (!dateStr) {
    return false;
  }

  const normalized = String(dateStr).slice(0, 10);
  return normalized > getTodayDateString(today);
}

function validateExpenseDate(dateStr, today = new Date()) {
  if (!dateStr || !String(dateStr).trim()) {
    return { valid: false, error: "Date is required." };
  }

  if (isExpenseDateInFuture(dateStr, today)) {
    return { valid: false, error: FUTURE_DATE_ERROR };
  }

  return { valid: true, error: null };
}

module.exports = {
  FUTURE_DATE_ERROR,
  getTodayDateString,
  isExpenseDateInFuture,
  validateExpenseDate,
};
