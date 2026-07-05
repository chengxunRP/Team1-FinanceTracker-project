const { getRequestUserId } = require("./requestUserContext");

function requireUserId() {
  const userId = getRequestUserId();
  if (!userId) {
    const err = new Error("Login required");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  return userId;
}

/** Strict owner filter for expenses, budgets, chat — never includes user_id NULL. */
function ownedUserClause(column, alias) {
  const col = alias ? `${alias}.${column}` : column;
  return { clause: `${col} = ?`, params: [requireUserId()] };
}

function expenseUserClause(alias) {
  return ownedUserClause("user_id", alias || "e");
}

/** Shared default/general categories only (is_custom = 0). */
function generalCategoryClause(alias) {
  const p = alias ? `${alias}.` : "";
  return { clause: `${p}is_custom = 0`, params: [] };
}

/** Current user's custom categories only — hides legacy custom rows with user_id NULL. */
function ownedCustomCategoryClause(alias) {
  const p = alias ? `${alias}.` : "";
  return {
    clause: `${p}is_custom = 1 AND ${p}user_id = ?`,
    params: [requireUserId()],
  };
}

/** General categories + this user's custom categories (for lists and lookups). */
function accessibleCategoryClause(alias) {
  const p = alias ? `${alias}.` : "";
  const userId = requireUserId();
  return {
    clause: `(${p}is_custom = 0 OR (${p}is_custom = 1 AND ${p}user_id = ?))`,
    params: [userId],
  };
}

module.exports = {
  requireUserId,
  ownedUserClause,
  expenseUserClause,
  generalCategoryClause,
  ownedCustomCategoryClause,
  accessibleCategoryClause,
};
