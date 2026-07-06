const db = require("./config/db");
const { requireUserId, expenseUserClause, accessibleCategoryClause, ownedCustomCategoryClause, generalCategoryClause } = require("./userScope");
const {
  enrichCategory,
  enrichCategories,
  compareCategoriesForSort,
  getDisplayCategoryName,
  isCustomCategory,
  STANDARD_CATEGORY_NAMES,
} = require("./categoryHelpers");
const { getCategoryImageUrl } = require("./categoryImageHelpers");

const DEFAULT_CUSTOM_CATEGORY_COLOR = "#22c55e";
const { DEFAULT_CUSTOM_ICON_KEY } = require("./customCategoryIcons");

let categoryColumnsCache = null;

async function getCategoryColumns() {
  if (categoryColumnsCache) return categoryColumnsCache;
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'categories'
        AND COLUMN_NAME IN ('is_custom', 'is_deleted', 'deleted_at', 'icon_image', 'user_id')`
    );
    const names = new Set(rows.map((r) => r.COLUMN_NAME));
    categoryColumnsCache = {
      hasIsCustom: names.has("is_custom"),
      hasIsDeleted: names.has("is_deleted"),
      hasDeletedAt: names.has("deleted_at"),
      hasIconImage: names.has("icon_image"),
      hasUserId: names.has("user_id"),
    };
  } catch (error) {
    categoryColumnsCache = {
      hasIsCustom: false,
      hasIsDeleted: false,
      hasDeletedAt: false,
      hasIconImage: false,
      hasUserId: false,
    };
  }
  return categoryColumnsCache;
}

function sanitizeHexColor(input) {
  const value = String(input || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value
    : DEFAULT_CUSTOM_CATEGORY_COLOR;
}

function parseHexColor(input) {
  const value = String(input || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : null;
}

function resolveCategoryVisual(options = {}) {
  const visualType = String(options.visualType || "none").toLowerCase();
  const iconImagePath = options.iconImagePath || null;

  if (visualType === "image" && iconImagePath) {
    return {
      color: DEFAULT_CUSTOM_CATEGORY_COLOR,
      iconImage: iconImagePath,
    };
  }
  if (visualType === "color") {
    return {
      color: parseHexColor(options.color) || DEFAULT_CUSTOM_CATEGORY_COLOR,
      iconImage: null,
    };
  }
  return {
    color: null,
    iconImage: null,
  };
}

const DUPLICATE_CATEGORY_MESSAGE = "Category name already exists.";

function buildJoinedCategorySelect(columns, alias) {
  const a = alias || "c";
  let sql = `${a}.id AS category_id, ${a}.name AS category_name, ${a}.icon AS category_icon, ${a}.color AS category_color`;
  if (columns.hasIconImage) sql += `, ${a}.icon_image AS category_icon_image`;
  if (columns.hasIsCustom) sql += `, ${a}.is_custom AS category_is_custom`;
  if (columns.hasIsDeleted) sql += `, ${a}.is_deleted AS category_is_deleted`;
  return sql;
}

function mapCategoryRow(row) {
  return enrichCategory({
    id: String(row.id),
    name: row.name,
    icon: row.icon,
    color: row.color,
    icon_image: row.icon_image ?? row.category_icon_image ?? null,
    is_custom: row.is_custom ?? row.category_is_custom,
    is_deleted: row.is_deleted ?? row.category_is_deleted,
  });
}

function mapJoinedCategoryRow(row) {
  return enrichCategory({
    id: String(row.category_id),
    name: row.category_name,
    icon: row.category_icon,
    color: row.category_color,
    icon_image: row.category_icon_image ?? null,
    is_custom: row.category_is_custom,
    is_deleted: row.category_is_deleted,
  });
}

async function getCategoryById(categoryId) {
  const columns = await getCategoryColumns();
  let query = "SELECT id, name, icon, color";
  if (columns.hasIsCustom) query += ", is_custom";
  if (columns.hasIsDeleted) query += ", is_deleted";
  if (columns.hasIconImage) query += ", icon_image";
  query += " FROM categories WHERE id = ?";
  const params = [Number(categoryId)];
  if (columns.hasUserId && columns.hasIsCustom) {
    const accessible = accessibleCategoryClause();
    query += ` AND ${accessible.clause}`;
    params.push(...accessible.params);
  } else if (columns.hasUserId) {
    query += " AND user_id = ?";
    params.push(requireUserId());
  }
  if (columns.hasIsDeleted) {
    query += " AND (is_deleted IS NULL OR is_deleted = 0)";
  }
  query += " LIMIT 1";

  const [rows] = await db.query(query, params);
  if (!rows.length) return null;
  return mapCategoryRow(rows[0]);
}

async function getCategoryByIdIncludingDeleted(categoryId) {
  const columns = await getCategoryColumns();
  let query = "SELECT id, name, icon, color";
  if (columns.hasIsCustom) query += ", is_custom";
  if (columns.hasIsDeleted) query += ", is_deleted";
  if (columns.hasIconImage) query += ", icon_image";
  query += " FROM categories WHERE id = ?";
  const params = [Number(categoryId)];
  if (columns.hasUserId && columns.hasIsCustom) {
    const accessible = accessibleCategoryClause();
    query += ` AND ${accessible.clause}`;
    params.push(...accessible.params);
  } else if (columns.hasUserId) {
    query += " AND user_id = ?";
    params.push(requireUserId());
  }
  query += " LIMIT 1";

  const [rows] = await db.query(query, params);
  if (!rows.length) return null;
  return mapCategoryRow(rows[0]);
}

async function findCategoryByNameIncludingDeleted(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;

  const columns = await getCategoryColumns();
  let query = "SELECT id, name, icon, color";
  if (columns.hasIsCustom) query += ", is_custom";
  if (columns.hasIsDeleted) query += ", is_deleted";
  if (columns.hasIconImage) query += ", icon_image";
  query += " FROM categories WHERE LOWER(name) = LOWER(?)";
  const params = [trimmed];
  if (columns.hasUserId && columns.hasIsCustom) {
    const accessible = accessibleCategoryClause();
    query += ` AND ${accessible.clause}`;
    params.push(...accessible.params);
  } else if (columns.hasUserId) {
    query += " AND user_id = ?";
    params.push(requireUserId());
  }
  query += " LIMIT 1";

  const [rows] = await db.query(query, params);
  if (!rows.length) return null;
  return mapCategoryRow(rows[0]);
}

async function categoryHasExpensesOrBudgets(categoryId) {
  const userId = requireUserId();
  const [expenseRows] = await db.query(
    "SELECT COUNT(*) AS count FROM expenses WHERE category_id = ? AND user_id = ?",
    [Number(categoryId), userId]
  );
  const expenseCount = Number(expenseRows[0].count) || 0;
  if (expenseCount > 0) return true;

  const [budgetRows] = await db.query(
    "SELECT COUNT(*) AS count FROM category_budgets WHERE category_id = ? AND user_id = ?",
    [Number(categoryId), userId]
  );
  return Number(budgetRows[0].count) > 0;
}

async function restoreSoftDeletedCategory(categoryId, trimmedName, visual) {
  const columns = await getCategoryColumns();
  const icon = DEFAULT_CUSTOM_ICON_KEY;
  const params = [trimmedName, icon, visual.color];
  let sql = "UPDATE categories SET name = ?, icon = ?, color = ?";

  if (columns.hasIconImage) {
    sql += ", icon_image = ?";
    params.push(visual.iconImage);
  }
  if (columns.hasIsDeleted) {
    sql += ", is_deleted = 0";
  }
  if (columns.hasDeletedAt) {
    sql += ", deleted_at = NULL";
  }
  sql += " WHERE id = ?";
  params.push(Number(categoryId));
  if (columns.hasUserId) {
    sql += " AND user_id = ?";
    params.push(requireUserId());
  }

  await db.query(sql, params);
}

async function categoryNameExists(name, excludeId) {
  const trimmed = String(name || "").trim();
  let query =
    "SELECT id, name, is_custom FROM categories WHERE LOWER(name) = LOWER(?)";
  const params = [trimmed];
  const columns = await getCategoryColumns();
  if (columns.hasUserId && columns.hasIsCustom) {
    const accessible = accessibleCategoryClause();
    query += ` AND ${accessible.clause}`;
    params.push(...accessible.params);
  } else if (columns.hasUserId) {
    query += " AND user_id = ?";
    params.push(requireUserId());
  }
  if (columns.hasIsDeleted) {
    query += " AND (is_deleted IS NULL OR is_deleted = 0)";
  }
  const [rows] = await db.query(query, params);
  return rows.find((row) => String(row.id) !== String(excludeId || ""));
}

async function insertCategoryRow(trimmed, visual) {
  const icon = DEFAULT_CUSTOM_ICON_KEY;
  const { color, iconImage } = visual;
  const columns = await getCategoryColumns();
  const userId = columns.hasUserId ? requireUserId() : null;
  let result;

  if (columns.hasIsCustom && columns.hasIsDeleted && columns.hasIconImage) {
    const cols = columns.hasUserId
      ? "name, icon, color, icon_image, is_custom, is_deleted, user_id"
      : "name, icon, color, icon_image, is_custom, is_deleted";
    const vals = columns.hasUserId
      ? "?, ?, ?, ?, 1, 0, ?"
      : "?, ?, ?, ?, 1, 0";
    const params = columns.hasUserId
      ? [trimmed, icon, color, iconImage, userId]
      : [trimmed, icon, color, iconImage];
    [result] = await db.query(
      `INSERT INTO categories (${cols}) VALUES (${vals})`,
      params
    );
  } else if (columns.hasIsCustom && columns.hasIsDeleted) {
    const cols = columns.hasUserId
      ? "name, icon, color, is_custom, is_deleted, user_id"
      : "name, icon, color, is_custom, is_deleted";
    const vals = columns.hasUserId ? "?, ?, ?, 1, 0, ?" : "?, ?, ?, 1, 0";
    const params = columns.hasUserId
      ? [trimmed, icon, color, userId]
      : [trimmed, icon, color];
    [result] = await db.query(
      `INSERT INTO categories (${cols}) VALUES (${vals})`,
      params
    );
  } else if (columns.hasIconImage) {
    if (columns.hasIsCustom && columns.hasUserId) {
      [result] = await db.query(
        "INSERT INTO categories (name, icon, color, icon_image, is_custom, user_id) VALUES (?, ?, ?, ?, 1, ?)",
        [trimmed, icon, color, iconImage, userId]
      );
    } else if (columns.hasUserId) {
      [result] = await db.query(
        "INSERT INTO categories (name, icon, color, icon_image, user_id) VALUES (?, ?, ?, ?, ?)",
        [trimmed, icon, color, iconImage, userId]
      );
    } else {
      [result] = await db.query(
        "INSERT INTO categories (name, icon, color, icon_image) VALUES (?, ?, ?, ?)",
        [trimmed, icon, color, iconImage]
      );
    }
  } else if (columns.hasIsCustom && columns.hasUserId) {
    [result] = await db.query(
      "INSERT INTO categories (name, icon, color, is_custom, user_id) VALUES (?, ?, ?, 1, ?)",
      [trimmed, icon, color, userId]
    );
  } else if (columns.hasUserId) {
    [result] = await db.query(
      "INSERT INTO categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)",
      [trimmed, icon, color, userId]
    );
  } else {
    [result] = await db.query(
      "INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)",
      [trimmed, icon, color]
    );
  }

  return mapCategoryRow({
    id: result.insertId,
    name: trimmed,
    icon,
    color,
    icon_image: iconImage,
    is_custom: 1,
    is_deleted: 0,
  });
}

async function createCategory(name, options = {}) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    const err = new Error("Category name is required.");
    err.code = "VALIDATION";
    throw err;
  }

  const visual = resolveCategoryVisual(options);

  const duplicate = await categoryNameExists(trimmed);
  if (duplicate) {
    const err = new Error(DUPLICATE_CATEGORY_MESSAGE);
    err.code = "DUPLICATE";
    throw err;
  }

  const columns = await getCategoryColumns();
  const existingAny = await findCategoryByNameIncludingDeleted(trimmed);
  if (existingAny && columns.hasIsDeleted && existingAny.is_deleted) {
    const inUse = await categoryHasExpensesOrBudgets(existingAny.id);
    if (!inUse) {
      const deleteParams = [Number(existingAny.id)];
      let deleteSql = "DELETE FROM categories WHERE id = ?";
      if (columns.hasUserId) {
        deleteSql += " AND user_id = ?";
        deleteParams.push(requireUserId());
      }
      await db.query(deleteSql, deleteParams);
    } else {
      await restoreSoftDeletedCategory(existingAny.id, trimmed, visual);
      return getCategoryById(existingAny.id);
    }
  }

  try {
    return await insertCategoryRow(trimmed, visual);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const err = new Error(DUPLICATE_CATEGORY_MESSAGE);
      err.code = "DUPLICATE";
      throw err;
    }
    throw error;
  }
}

async function updateCustomCategory(categoryId, payload = {}) {
  const trimmed = String(payload.name || "").trim();
  if (!trimmed) {
    const err = new Error("Category name is required.");
    err.code = "VALIDATION";
    throw err;
  }

  const category = await getCategoryById(categoryId);
  if (!category) {
    const err = new Error("Category not found.");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!isCustomCategory(category)) {
    const err = new Error("Only custom categories can be edited.");
    err.code = "NOT_ALLOWED";
    throw err;
  }

  const duplicate = await categoryNameExists(trimmed, categoryId);
  if (duplicate) {
    const err = new Error(DUPLICATE_CATEGORY_MESSAGE);
    err.code = "DUPLICATE";
    throw err;
  }

  if (STANDARD_CATEGORY_NAMES.includes(trimmed)) {
    const err = new Error("That name is reserved for a general category.");
    err.code = "NOT_ALLOWED";
    throw err;
  }

  const columns = await getCategoryColumns();
  const visualType = String(payload.visualType || "").toLowerCase();
  let visual;

  if (visualType === "image") {
    visual = {
      color: DEFAULT_CUSTOM_CATEGORY_COLOR,
      iconImage: payload.iconImagePath || category.iconImage || null,
    };
  } else if (visualType === "color") {
    visual = {
      color: parseHexColor(payload.color) || DEFAULT_CUSTOM_CATEGORY_COLOR,
      iconImage: null,
    };
  } else if (visualType === "none") {
    visual = { color: null, iconImage: null };
  } else if (category.iconImage) {
    visual = {
      color: DEFAULT_CUSTOM_CATEGORY_COLOR,
      iconImage: category.iconImage,
    };
  } else {
    visual = {
      color: category.color || null,
      iconImage: null,
    };
  }

  const { color, iconImage } = visual;

  try {
    const userId = columns.hasUserId ? requireUserId() : null;
    if (columns.hasIconImage) {
      let sql = "UPDATE categories SET name = ?, color = ?, icon_image = ? WHERE id = ?";
      const params = [trimmed, color, iconImage, Number(categoryId)];
      if (columns.hasUserId) {
        sql += " AND user_id = ?";
        params.push(userId);
      }
      await db.query(sql, params);
    } else {
      let sql = "UPDATE categories SET name = ?, color = ? WHERE id = ?";
      const params = [trimmed, color, Number(categoryId)];
      if (columns.hasUserId) {
        sql += " AND user_id = ?";
        params.push(userId);
      }
      await db.query(sql, params);
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const err = new Error(DUPLICATE_CATEGORY_MESSAGE);
      err.code = "DUPLICATE";
      throw err;
    }
    throw error;
  }

  return mapCategoryRow({
    ...category,
    name: trimmed,
    color,
    icon_image: iconImage,
  });
}

async function deleteCustomCategory(categoryId) {
  const category = await getCategoryByIdIncludingDeleted(categoryId);
  if (!category) {
    const err = new Error("Category not found.");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!isCustomCategory(category)) {
    const err = new Error("Only custom categories can be deleted.");
    err.code = "NOT_ALLOWED";
    throw err;
  }

  const userId = requireUserId();
  const [expenseRows] = await db.query(
    "SELECT COUNT(*) AS count FROM expenses WHERE category_id = ? AND user_id = ?",
    [Number(categoryId), userId]
  );
  const expenseCount = Number(expenseRows[0].count) || 0;

  const [budgetRows] = await db.query(
    "SELECT COUNT(*) AS count FROM category_budgets WHERE category_id = ? AND user_id = ?",
    [Number(categoryId), userId]
  );
  const hasBudget = Number(budgetRows[0].count) > 0;

  if (expenseCount === 0 && !hasBudget) {
    const columns = await getCategoryColumns();
    let sql = "DELETE FROM categories WHERE id = ?";
    const params = [Number(categoryId)];
    if (columns.hasUserId) {
      sql += " AND user_id = ?";
      params.push(userId);
    }
    if (columns.hasIsCustom) {
      sql += " AND is_custom = 1";
    }
    const [result] = await db.query(sql, params);
    if (result.affectedRows === 0 && columns.hasIsCustom) {
      let fallbackSql = "DELETE FROM categories WHERE id = ?";
      const fallbackParams = [Number(categoryId)];
      if (columns.hasUserId) {
        fallbackSql += " AND user_id = ?";
        fallbackParams.push(userId);
      }
      await db.query(fallbackSql, fallbackParams);
    }
    return { deleted: true, softDeleted: false };
  }

  const columns = await getCategoryColumns();
  if (columns.hasIsDeleted) {
    let sql = "UPDATE categories SET is_deleted = 1";
    if (columns.hasDeletedAt) sql += ", deleted_at = NOW()";
    sql += " WHERE id = ?";
    const softParams = [Number(categoryId)];
    if (columns.hasUserId) {
      sql += " AND user_id = ?";
      softParams.push(userId);
    }
    if (columns.hasIsCustom) sql += " AND is_custom = 1";
    await db.query(sql, softParams);
    return { deleted: true, softDeleted: true };
  }

  return { deleted: false, softDeleted: false };
}

async function getCategories() {
  try {
    const columns = await getCategoryColumns();
    let query = `SELECT id, name, icon, color`;
    if (columns.hasIsCustom) query += `, is_custom`;
    if (columns.hasIsDeleted) query += `, is_deleted`;
    if (columns.hasIconImage) query += `, icon_image`;
    query += ` FROM categories`;
    const params = [];
    const where = [];
    if (columns.hasIsCustom && columns.hasUserId) {
      const accessible = accessibleCategoryClause();
      where.push(accessible.clause);
      params.push(...accessible.params);
    } else if (columns.hasUserId) {
      where.push("(user_id IS NULL OR user_id = ?)");
      params.push(requireUserId());
    }
    if (columns.hasIsDeleted) {
      where.push(`(is_deleted IS NULL OR is_deleted = 0)`);
    }
    if (where.length) {
      query += ` WHERE ${where.join(" AND ")}`;
    }
    query += ` ORDER BY name ASC`;

    const [rows] = await db.query(query, params);

    return enrichCategories(rows.map((row) => mapCategoryRow(row))).sort(
      compareCategoriesForSort
    );
  } catch (error) {
    console.error("Database error loading categories from MySQL:", error);
    throw error;
  }
}

function toPickerCategory(cat, isCustom) {
  const enriched = enrichCategory(cat);
  return {
    id: enriched.id,
    name: enriched.name,
    displayName: enriched.name,
    icon: enriched.icon,
    iconImage: enriched.iconImage || null,
    color: enriched.color,
    isCustom,
    is_custom: isCustom ? 1 : 0,
    generalIconUrl: isCustom
      ? null
      : getCategoryImageUrl(enriched.name, enriched.icon) || null,
  };
}

async function queryPickerCategories(isCustom) {
  const columns = await getCategoryColumns();
  let query = `SELECT id, name, icon, color`;
  if (columns.hasIsCustom) query += `, is_custom`;
  if (columns.hasIsDeleted) query += `, is_deleted`;
  if (columns.hasIconImage) query += `, icon_image`;
  query += ` FROM categories WHERE `;
  const params = [];

  if (columns.hasIsCustom) {
    query += `is_custom = ${isCustom ? 1 : 0}`;
    if (isCustom && columns.hasUserId) {
      query += ` AND user_id = ?`;
      params.push(requireUserId());
    }
  } else {
    query += isCustom
      ? `icon = '${DEFAULT_CUSTOM_ICON_KEY}'`
      : `(icon IS NULL OR icon != '${DEFAULT_CUSTOM_ICON_KEY}')`;
    if (isCustom && columns.hasUserId) {
      query += ` AND user_id = ?`;
      params.push(requireUserId());
    }
  }

  if (columns.hasIsDeleted) {
    query += ` AND (is_deleted IS NULL OR is_deleted = 0)`;
  }
  query += ` ORDER BY name ASC`;

  const [rows] = await db.query(query, params);
  return rows.map((row) => mapCategoryRow(row));
}

async function getCategoriesForPicker() {
  const [customRows, generalRows] = await Promise.all([
    queryPickerCategories(true),
    queryPickerCategories(false),
  ]);

  const customIds = new Set(customRows.map((cat) => String(cat.id)));
  const generalFiltered = generalRows.filter(
    (cat) => !customIds.has(String(cat.id))
  );

  const customCategories = customRows
    .map((cat) => toPickerCategory(cat, true))
    .sort(compareCategoriesForSort);
  const generalCategories = generalFiltered
    .map((cat) => toPickerCategory(cat, false))
    .sort(compareCategoriesForSort);

  return {
    customCategories,
    generalCategories,
    all: [...customCategories, ...generalCategories],
  };
}

async function getExpenseCount() {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS count FROM expenses WHERE user_id = ?",
    [requireUserId()]
  );
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

  const userFilter = expenseUserClause("e");
  where.push(userFilter.clause);
  params.push(...userFilter.params);

  if (filters.category) {
    where.push("e.category_id = ?");
    params.push(Number(filters.category));
  }

  if (filters.search) {
    where.push(
      "(LOWER(e.title) LIKE ? OR LOWER(COALESCE(e.merchant_name, '')) LIKE ? OR LOWER(COALESCE(e.notes, '')) LIKE ?)"
    );
    const q = `%${String(filters.search).toLowerCase()}%`;
    params.push(q, q, q);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const orderBy = sortMap[filters.sort] || sortMap["date-desc"];
  const columns = await getCategoryColumns();
  const categorySelect = buildJoinedCategorySelect(columns, "c");

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      ${categorySelect}
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    ${whereSql}
    ORDER BY ${orderBy}`,
    params
  );

  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    categoryId: String(row.categoryId),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath || "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: mapJoinedCategoryRow(row),
  }));
}

async function getExpenseById(id) {
  const columns = await getCategoryColumns();
  const categorySelect = buildJoinedCategorySelect(columns, "c");
  const userFilter = expenseUserClause("e");

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      e.image_path AS imagePath,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      ${categorySelect}
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.id = ? AND ${userFilter.clause}
    LIMIT 1`,
    [Number(id), ...userFilter.params]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: String(row.id),
    title: row.title,
    merchantName: row.merchantName || "",
    amount: Number(row.amount),
    categoryId: String(row.categoryId),
    date: row.date,
    notes: row.notes || "",
    imagePath: row.imagePath || "",
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
    category: mapJoinedCategoryRow(row),
  };
}

async function addExpense(expense) {
  const [result] = await db.query(
    `INSERT INTO expenses (
      title,
      amount,
      merchant_name,
      category_id,
      user_id,
      expense_date,
      notes,
      image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.title,
      expense.amount,
      expense.merchantName || null,
      Number(expense.categoryId),
      requireUserId(),
      expense.date,
      expense.notes || "",
      expense.imagePath || null,
    ]
  );

  return String(result.insertId);
}

async function updateExpense(id, expense) {
  const userId = requireUserId();
  const [result] = await db.query(
    `UPDATE expenses
    SET
      title = ?,
      amount = ?,
      merchant_name = ?,
      category_id = ?,
      expense_date = ?,
      notes = ?,
      image_path = ?
    WHERE id = ? AND user_id = ?`,
    [
      expense.title,
      expense.amount,
      expense.merchantName || null,
      Number(expense.categoryId),
      expense.date,
      expense.notes || "",
      expense.imagePath || null,
      Number(id),
      userId,
    ]
  );

  return result.affectedRows > 0;
}

async function updateExpenseNotes(id, notes) {
  const [result] = await db.query(
    `UPDATE expenses SET notes = ? WHERE id = ? AND user_id = ?`,
    [notes || "", Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseDate(id, date) {
  const [result] = await db.query(
    `UPDATE expenses SET expense_date = ? WHERE id = ? AND user_id = ?`,
    [date, Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseAmount(id, amount) {
  const [result] = await db.query(
    `UPDATE expenses SET amount = ? WHERE id = ? AND user_id = ?`,
    [amount, Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseMerchant(id, merchantName) {
  const [result] = await db.query(
    `UPDATE expenses SET merchant_name = ? WHERE id = ? AND user_id = ?`,
    [merchantName, Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseTitle(id, title) {
  const [result] = await db.query(
    `UPDATE expenses SET title = ? WHERE id = ? AND user_id = ?`,
    [title, Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseCategory(id, categoryId) {
  const [result] = await db.query(
    `UPDATE expenses SET category_id = ? WHERE id = ? AND user_id = ?`,
    [Number(categoryId), Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseExcludedFromBudget(id, excluded) {
  const val = excluded ? 1 : 0;
  const [result] = await db.query(
    `UPDATE expenses
     SET is_excluded_from_budget = ?, is_excluded_from_all_budget = ?
     WHERE id = ? AND user_id = ?`,
    [val, val, Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function updateExpenseReceipt(id, imagePath) {
  const [result] = await db.query(
    `UPDATE expenses SET image_path = ? WHERE id = ? AND user_id = ?`,
    [imagePath, Number(id), requireUserId()]
  );

  return result.affectedRows > 0;
}

async function deleteExpense(id) {
  const [result] = await db.query(
    "DELETE FROM expenses WHERE id = ? AND user_id = ?",
    [Number(id), requireUserId()]
  );
  return result.affectedRows > 0;
}

function toLegacyExpense(expense) {
  const displayName = expense.category
    ? expense.category.displayName || getDisplayCategoryName(expense.category.name)
    : "Other categories";

  return {
    id: expense.id,
    categoryId: expense.categoryId,
    description: expense.title,
    notes: expense.notes || "",
    category: displayName,
    amount: expense.amount,
    date: expense.date,
    isExcludedFromBudget: Boolean(expense.isExcludedFromBudget),
    isExcludedFromAllBudget: Boolean(expense.isExcludedFromAllBudget),
  };
}

async function getExpensesForAnalytics() {
  const expenses = await getAllExpenses();
  return expenses.map(toLegacyExpense);
}

/** Expenses for one budget month — SQL date range (expense_date >= start AND < next month start). */
async function getExpensesInMonth(budgetMonth) {
  const budgetStore = require("./budgetStore");
  const month = budgetStore.normalizeBudgetMonth(budgetMonth);
  const { startDate, endExclusive } = budgetStore.getBudgetMonthDateRange(month);

  const userFilter = expenseUserClause("e");
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.title,
      e.merchant_name AS merchantName,
      CAST(e.amount AS DECIMAL(10,2)) AS amount,
      e.category_id AS categoryId,
      DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS date,
      COALESCE(e.notes, '') AS notes,
      COALESCE(e.is_excluded_from_budget, 0) AS isExcludedFromBudget,
      COALESCE(e.is_excluded_from_all_budget, 0) AS isExcludedFromAllBudget,
      c.name AS category_name
    FROM expenses e
    INNER JOIN categories c ON c.id = e.category_id
    WHERE e.expense_date >= ? AND e.expense_date < ? AND ${userFilter.clause}
    ORDER BY e.expense_date DESC, e.id DESC`,
    [startDate, endExclusive, ...userFilter.params]
  );

  return rows.map((row) => ({
    id: String(row.id),
    categoryId: String(row.categoryId),
    description: row.title,
    merchantName: row.merchantName || "",
    notes: row.notes || "",
    category: getDisplayCategoryName(row.category_name),
    amount: Number(row.amount),
    date: row.date,
    isExcludedFromBudget: Number(row.isExcludedFromBudget) === 1,
    isExcludedFromAllBudget: Number(row.isExcludedFromAllBudget) === 1,
  }));
}

module.exports = {
  getCategories,
  getCategoriesForPicker,
  getCategoryById,
  createCategory,
  updateCustomCategory,
  deleteCustomCategory,
  getExpenseCount,
  getAllExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  updateExpenseDate,
  updateExpenseAmount,
  updateExpenseMerchant,
  updateExpenseTitle,
  updateExpenseCategory,
  updateExpenseExcludedFromBudget,
  updateExpenseNotes,
  updateExpenseReceipt,
  deleteExpense,
  getExpensesForAnalytics,
  getExpensesInMonth,
};
