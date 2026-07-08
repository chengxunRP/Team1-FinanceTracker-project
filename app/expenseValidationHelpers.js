// Expense date validation — future dates allowed for planned expenses.

const FUTURE_DATE_HINT = "Future dates are allowed for planned expenses.";

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidExpenseDateString(dateStr) {
  const normalized = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;

  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function isExpenseDateInFuture(dateStr, today = new Date()) {
  if (!dateStr) {
    return false;
  }

  const normalized = String(dateStr).slice(0, 10);
  return normalized > getTodayDateString(today);
}

function validateExpenseDate(dateStr) {
  if (!dateStr || !String(dateStr).trim()) {
    return { valid: false, error: "Date is required." };
  }

  if (!isValidExpenseDateString(dateStr)) {
    return { valid: false, error: "Please enter a valid date." };
  }

  return { valid: true, error: null };
}

/** Default expense date when adding from a budget category detail page. */
function getDefaultExpenseDateForBudgetMonth(budgetMonth, today = new Date()) {
  const todayStr = getTodayDateString(today);
  const monthKey = String(budgetMonth || "").slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return todayStr;
  }

  if (todayStr.slice(0, 7) === monthKey) {
    return todayStr;
  }

  return `${monthKey}-01`;
}

function getSafeExpenseReturnTo(value) {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.trim().split("#")[0];
  if (!cleaned.startsWith("/") || cleaned.startsWith("//") || cleaned.includes("://")) {
    return null;
  }

  const questionIndex = cleaned.indexOf("?");
  const path = questionIndex === -1 ? cleaned : cleaned.slice(0, questionIndex);
  const queryString = questionIndex === -1 ? "" : cleaned.slice(questionIndex + 1);

  const allowed =
    path === "/expenses" ||
    path === "/budget/all-categories" ||
    path === "/budget/everything-else" ||
    /^\/budget\/categories\/\d+$/.test(path);

  if (!allowed) return null;

  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [key, val] of params.entries()) {
      if (!["month", "returnMonth"].includes(key)) return null;
      if (!/^\d{4}-\d{2}$/.test(String(val))) return null;
    }
  }

  return cleaned;
}

function normalizeMerchantName(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}

/** Matches expenses.amount DECIMAL(10,2) column limit. */
const MAX_EXPENSE_AMOUNT = 99999999.99;

function validateExpenseAmount(amount) {
  if (amount === undefined || amount === null || String(amount).trim() === "") {
    return { valid: false, error: "Amount must be greater than 0." };
  }
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, error: "Amount must be greater than 0." };
  }
  if (parsed > MAX_EXPENSE_AMOUNT) {
    return {
      valid: false,
      error: "Amount is too large. Maximum is $99,999,999.99.",
    };
  }
  return { valid: true, error: null };
}

module.exports = {
  FUTURE_DATE_HINT,
  getTodayDateString,
  isValidExpenseDateString,
  isExpenseDateInFuture,
  validateExpenseDate,
  getDefaultExpenseDateForBudgetMonth,
  getSafeExpenseReturnTo,
  normalizeMerchantName,
  MAX_EXPENSE_AMOUNT,
  validateExpenseAmount,
};
