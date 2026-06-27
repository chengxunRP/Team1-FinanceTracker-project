const db = require("./config/db");

async function getCategories() {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        name,
        icon,
        color
      FROM categories
      ORDER BY name ASC`
    );

    return rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      icon: row.icon,
      color: row.color,
    }));
  } catch (error) {
    console.error("Database error loading categories from MySQL:", error);
    throw error;
  }
}

async function getExpenseCount() {
  const [rows] = await db.query("SELECT COUNT(*) AS count FROM expenses");
  return Number(rows[0].count) || 0;
}

async function getAllExpenses(filters = {}) {
  const sortMap = {
    "date-desc": "e.expense_date DESC",
    "date-asc": "e.expense_date ASC",
    "amount-desc": "e.amount DESC",
    "amount-asc": "e.amount ASC",
  };

  const where = [];
  const params = [];

  if (filters.category) {
    where.push("e.category_id = ?");
    params.push(Number(filters.category));
  }

  if (filters.search) {
    where.push("(LOWER(e.title) LIKE ? OR LOWER(COALESCE(e.notes, '')) LIKE ?)");
    const q = `%${String(filters.search).toLowerCase()}%`;
    params.push(q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy = sortMap[filters.sort] || sortMap["date-desc"];

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      c.id AS category_id,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    ${whereSql}
    ORDER BY ${orderBy}`,
    params
  );

  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    amount: Number(row.amount),
    categoryId: String(row.categoryId),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath || "",
    category: {
      id: String(row.category_id),
      name: row.category_name,
      icon: row.category_icon,
      color: row.category_color,
    },
  }));
}

async function getExpenseById(id) {
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      c.id AS category_id,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.id = ?
    LIMIT 1`,
    [Number(id)]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: String(row.id),
    title: row.title,
    amount: Number(row.amount),
    categoryId: String(row.categoryId),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath || "",
    category: {
      id: String(row.category_id),
      name: row.category_name,
      icon: row.category_icon,
      color: row.category_color,
    },
  };
}

async function addExpense(expense) {
  const [result] = await db.query(
    `INSERT INTO expenses (
      title,
      amount,
      category_id,
      expense_date,
      notes,
      image_path
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      expense.title,
      expense.amount,
      Number(expense.categoryId),
      expense.date,
      expense.notes || "",
      expense.imagePath || null,
    ]
  );

  return String(result.insertId);
}

async function updateExpense(id, expense) {
  const [result] = await db.query(
    `UPDATE expenses
    SET
      title = ?,
      amount = ?,
      category_id = ?,
      expense_date = ?,
      notes = ?,
      image_path = ?
    WHERE id = ?`,
    [
      expense.title,
      expense.amount,
      Number(expense.categoryId),
      expense.date,
      expense.notes || "",
      expense.imagePath || null,
      Number(id),
    ]
  );

  return result.affectedRows > 0;
}

async function deleteExpense(id) {
  const [result] = await db.query("DELETE FROM expenses WHERE id = ?", [Number(id)]);
  return result.affectedRows > 0;
}

function toLegacyExpense(expense) {
  return {
    description: expense.title,
    category: expense.category ? expense.category.name : "Others",
    amount: expense.amount,
    date: expense.date,
  };
}

async function getExpensesForAnalytics() {
  const expenses = await getAllExpenses();
  return expenses.map(toLegacyExpense);
}

module.exports = {
  getCategories,
  getExpenseCount,
  getAllExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpensesForAnalytics,
};
