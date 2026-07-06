// Finance Tracker - Express server with EJS views (Feature 4: Budget + Alerts)
require("./envConfig").logGroqKeyStatus();

const path = require("path");
const express = require("express");
const {
  validateMonthlyBudget,
  validateCategoryBudgetAmount,
  buildBudgetSummary,
  getMonthlyHealthStatus,
} = require("./budgetHelpers");
const {
  getFinanceSnapshot,
  validateItemInput,
  getSpendingRecommendation,
} = require("./recommendationHelpers");
const {
  SUGGESTED_QUESTIONS,
  buildFinBotReply,
  getFinBotReply,
  getWelcomeMessage,
} = require("./chatbotHelpers");
const { getLiveFinanceSummary } = require("./financeSummaryService");
const { getSessionId } = require("./sessionCookie");
const {
  getChatHistory,
  addChatMessage,
  clearChatHistory,
} = require("./chatHistory");
const budgetStore = require("./budgetStore");
const expenseStore = require("./expenseStore");
const financeHelpers = require("./financeHelpers");
const { getCategoryImageUrl, getCategoryVisual } = require("./categoryImageHelpers");
const {
  getTodayDateString,
  getDefaultExpenseDateForBudgetMonth,
} = require("./expenseValidationHelpers");
const {
  getIconMarkup,
  isValidCustomIconKey,
  LEGACY_STANDARD_ICONS,
  getIconLibraryForClient,
} = require("./customCategoryIcons");

function getCustomCategoryIconMarkup(icon, size) {
  if (
    !icon ||
    icon === "default-category" ||
    !isValidCustomIconKey(icon) ||
    LEGACY_STANDARD_ICONS.includes(icon)
  ) {
    return "";
  }
  return getIconMarkup(icon, size || "md");
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/js/custom-category-icon-data.js", function (req, res) {
  res.type("application/javascript");
  res.send(
    "window.__SW_ICON_LIBRARY__=" +
      JSON.stringify(getIconLibraryForClient()) +
      ";"
  );
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const session = require("express-session");
app.use(session({
  secret: "spendwise-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
}));

const { userContextMiddleware } = require("./requestUserContext");
const { requireLogin, getCurrentUserId } = require("./authHelpers");
app.use(userContextMiddleware);

// --- expense-nav script middleware ---
app.use(function(req, res, next) {
  var _render = res.render.bind(res);
  res.render = function(view, locals, cb) {
    if (typeof locals === 'function') { cb = locals; locals = {}; }
    locals = locals || {};
    locals.getCategoryImageUrl = getCategoryImageUrl;
    locals.getCategoryVisual = getCategoryVisual;
    locals.getCustomCategoryIconMarkup = getCustomCategoryIconMarkup;
    locals.currentUser = (req.session && req.session.userId) ? { id: req.session.userId, name: req.session.userName } : null;
    var _cb = cb || function(err, str) {
      if (err) return next(err);
      res.send(str);
    };
    _render(view, locals, function(err, str) {
      if (err) return next(err);
      str = str.replace('</body>', '<script src="/js/expense-nav.js"></script></body>');
      _cb(null, str);
    });
  };
  next();
});
// --- End expense-nav script middleware ---

app.use("/budget", requireLogin);
app.use("/chatbot", requireLogin);
app.use("/savings-goals", requireLogin);

async function getBudgetPageData(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  let monthlyBudget;
  let expenses;
  let categories;
  let spendingByCategoryId;
  let actualSpendingByCategoryId;
  let monthTotalSpent;
  let monthExpenseCount;

  try {
    [
      monthlyBudget,
      expenses,
      categories,
      spendingByCategoryId,
      actualSpendingByCategoryId,
      monthTotalSpent,
      monthExpenseCount,
    ] = await Promise.all([
      budgetStore.getMonthlyBudget(),
      expenseStore.getExpensesForAnalytics(),
      expenseStore.getCategories(),
      budgetStore.getSpendingTotalsByCategoryId(month),
      budgetStore.getActualSpendingTotalsByCategoryId(month),
      financeHelpers.getMonthlyExpenseTotal(month),
      financeHelpers.getExpenseCountForMonth(month),
    ]);
  } catch (error) {
    console.error("Failed to load budget page data from MySQL:", error);
    throw error;
  }

  if (!categories.length) {
    console.warn(
      "Budget page: no categories returned from MySQL (SELECT id, name, icon, color FROM categories)."
    );
  }

  // Month-scoped list for detail views; summary totals use SQL aggregates as source of truth.
  const expensesInMonth = await expenseStore.getExpensesInMonth(month);
  const summary = buildBudgetSummary(monthlyBudget, expensesInMonth, monthTotalSpent);
  const financeSnapshot = financeHelpers.buildFinanceSnapshot(
    summary,
    spendingByCategoryId,
    categories,
    "month"
  );
  const hasCategoryBudgets = await budgetStore.hasCategoryBudgetsForMonth(month);
  const categoryRows = hasCategoryBudgets
    ? await budgetStore.getBudgetRows(month, categories, spendingByCategoryId)
    : [];
  const categorySpending = budgetStore.getCategorySpendingRows(spendingByCategoryId, categories);
  const categorySetupRows = await budgetStore.getCategorySetupRows(month, categories);
  const monthBudgets = await budgetStore.getCategoryBudgets(month);
  const budgetedCategoryIds = monthBudgets
    .filter((b) => budgetStore.isBudgetActiveForMonth(b, month))
    .map((b) => b.categoryId);
  const everythingElse = budgetStore.getEverythingElseData(
    categories,
    budgetedCategoryIds,
    actualSpendingByCategoryId
  );
  const budgetTotals = budgetStore.getBudgetTotals(categoryRows);
  const availableCategories = await budgetStore.getAvailableCategoriesForBudget(
    month,
    categories,
    spendingByCategoryId
  );

  return {
    summary,
    financeSnapshot,
    expenses,
    expensesInMonth,
    monthExpenseCount,
    categoryRows,
    hasCategoryBudgets,
    categorySpending,
    categorySetupRows,
    budgetMonth: month,
    budgetMonthLabel: budgetStore.formatBudgetMonthLabel(month),
    healthStatus: getMonthlyHealthStatus(summary.percentageUsed),
    everythingElse,
    budgetTotals,
    availableCategories,
    categories,
    spendingByCategoryId,
  };
}

function renderDbError(res, view, locals) {
  return res.status(500).render(view, {
    ...locals,
    errors: ["Unable to load data right now. Please try again."],
  });
}

async function renderOverviewPage(req, res) {
  try {
    const budgetMonth = budgetStore.normalizeBudgetMonth(req.query.month || undefined);
    const pageData = await getBudgetPageData(budgetMonth);
    const {
      summary,
      expenses,
      financeSnapshot,
      categoryRows,
      budgetMonth: month,
      monthExpenseCount,
      budgetMonthLabel,
    } = pageData;

    res.render("index", {
      pageTitle: "Overview",
      activePage: "overview",
      summary,
      expenses,
      financeSnapshot,
      categoryRows,
      budgetMonth: month,
      budgetMonthLabel,
      monthExpenseCount,
    });
  } catch (error) {
    console.error("Database error loading overview/dashboard:", error);
    renderDbError(res, "index", {
      pageTitle: "Overview",
      activePage: "overview",
      summary: buildBudgetSummary(0, []),
      expenses: [],
      financeSnapshot: getFinanceSnapshot(buildBudgetSummary(0, []), []),
      categoryRows: [],
      budgetMonth: budgetStore.getCurrentBudgetMonth(),
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(
        budgetStore.getCurrentBudgetMonth()
      ),
      monthExpenseCount: 0,
    });
  }
}

app.get("/", requireLogin, renderOverviewPage);
app.get("/dashboard", requireLogin, renderOverviewPage);

app.get("/home", async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    let summary = buildBudgetSummary(0, [], 0);
    if (currentUserId) {
      const pageData = await getBudgetPageData();
      summary = pageData.summary;
    }
    res.render("home", {
      pageTitle: "Home",
      activePage: "landing",
      summary,
    });
  } catch (error) {
    console.error("Database error loading home:", error);
    res.status(500).render("home", {
      pageTitle: "Home",
      activePage: "landing",
      summary: buildBudgetSummary(0, []),
    });
  }
});

async function loadPurchaseCheckerData() {
  const live = await financeHelpers.getBudgetSummary();
  const expenses = await expenseStore.getExpensesInMonth(live.budgetMonth);
  const categories = await expenseStore.getCategories();
  const categoryNames = categories
    .map((cat) => cat.displayName || cat.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    summary: live.summary,
    financeSnapshot: getFinanceSnapshot(live.summary, expenses),
    expenses,
    categories: categoryNames,
    budgetMonthLabel: live.budgetMonthLabel,
  };
}

function renderRecommendationPage(res, locals) {
  res.render("recommendation", {
    pageTitle: "Purchase Checker",
    activePage: "recommendation",
    errors: [],
    formValues: {},
    recommendation: null,
    ...locals,
  });
}

app.get("/recommendation", requireLogin, async (req, res) => {
  try {
    const data = await loadPurchaseCheckerData();
    renderRecommendationPage(res, data);
  } catch (error) {
    console.error("Failed to load purchase checker:", error);
    const emptySummary = buildBudgetSummary(0, [], 0);
    renderRecommendationPage(res, {
      summary: emptySummary,
      financeSnapshot: getFinanceSnapshot(emptySummary, []),
      categories: [],
      budgetMonthLabel: "",
      errors: ["Unable to load your budget data. Please try again."],
    });
  }
});

app.post("/recommendation", requireLogin, async (req, res) => {
  const { itemName, itemPrice, category } = req.body;

  try {
    const data = await loadPurchaseCheckerData();
    const validation = validateItemInput(itemName, itemPrice, category);

    if (!validation.valid) {
      return renderRecommendationPage(res, {
        ...data,
        errors: validation.errors,
        formValues: { itemName, itemPrice, category },
      });
    }

    const recommendation = getSpendingRecommendation(data.summary, data.expenses, {
      itemName: validation.itemName,
      itemPrice: validation.itemPrice,
      category: validation.category,
    });

    renderRecommendationPage(res, {
      ...data,
      recommendation,
      formValues: { itemName, itemPrice, category },
    });
  } catch (error) {
    console.error("Purchase checker error:", error);
    const emptySummary = buildBudgetSummary(0, [], 0);
    renderRecommendationPage(res, {
      summary: emptySummary,
      financeSnapshot: getFinanceSnapshot(emptySummary, []),
      categories: [],
      budgetMonthLabel: "",
      errors: ["Unable to check this purchase. Please try again."],
      formValues: { itemName, itemPrice, category },
    });
  }
});

app.get("/budget", async (req, res) => {
  const currentUserId = getCurrentUserId(req);
  console.log("Current user:", req.session);
  console.log("Current user id:", currentUserId);
  try {
    const selectedMonth = budgetStore.normalizeBudgetMonth(
      req.query.month || budgetStore.getCurrentBudgetMonth()
    );
    const [pageData, overallBudgetSection] = await Promise.all([
      getBudgetPageData(selectedMonth),
      budgetStore.getOverallBudgetSectionData(selectedMonth),
    ]);
    const successMessage =
      req.query.saved === "1" ? "Budgets saved successfully." : "";
    res.render("budget", {
      pageTitle: "Spending & Budgets",
      activePage: "budget",
      ...pageData,
      overallBudgetSection,
      errors: [],
      successMessage,
    });
  } catch (error) {
    console.error("Database error loading budget page:", error);
    renderDbError(res, "budget", {
      pageTitle: "Spending & Budgets",
      activePage: "budget",
      summary: buildBudgetSummary(0, []),
      expenses: [],
      categoryRows: [],
      hasCategoryBudgets: false,
      categorySpending: [],
      categorySetupRows: [],
      monthExpenseCount: 0,
      overallBudgetSection: null,
      budgetMonth: budgetStore.getCurrentBudgetMonth(),
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(
        budgetStore.getCurrentBudgetMonth()
      ),
    });
  }
});

app.post("/budget", async (req, res) => {
  const { monthlyBudget: budgetInput } = req.body;
  const validation = validateMonthlyBudget(budgetInput);
  const budgetMonth = req.body.budgetMonth || budgetStore.getCurrentBudgetMonth();

  try {
    const current = await getBudgetPageData(budgetMonth);

    if (!validation.valid) {
      return res.render("budget", {
        pageTitle: "Budget",
        activePage: "budget",
        ...current,
        budgetMonth,
        errors: validation.errors,
        formValues: { monthlyBudget: budgetInput },
      });
    }

    await budgetStore.setMonthlyBudget(validation.budget);
    const updated = await getBudgetPageData(budgetMonth);

    res.render("budget", {
      pageTitle: "Budget",
      activePage: "budget",
      ...updated,
      budgetMonth,
      errors: [],
      successMessage: "Monthly budget updated successfully.",
      formValues: { monthlyBudget: updated.summary.monthlyBudget },
    });
  } catch (error) {
    console.error("Database error updating budget:", error);
    res.status(500).render("budget", {
      pageTitle: "Budget",
      activePage: "budget",
      summary: buildBudgetSummary(0, []),
      expenses: [],
      categoryRows: [],
      hasCategoryBudgets: false,
      categorySpending: [],
      categorySetupRows: [],
      monthExpenseCount: 0,
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      errors: ["Unable to update budget right now. Please try again."],
      formValues: { monthlyBudget: budgetInput },
    });
  }
});

app.post("/budget/categories", async (req, res) => {
  const budgetMonth = req.body.budgetMonth || budgetStore.getCurrentBudgetMonth();

  try {
    let categories;
    try {
      categories = await expenseStore.getCategories();
    } catch (categoryError) {
      console.error("Database error loading categories for category budget save:", categoryError);
      throw categoryError;
    }

    const budgetsByCategoryId = {};

    categories.forEach((cat) => {
      const key = `categoryBudget_${cat.id}`;
      if (req.body[key] !== undefined) {
        budgetsByCategoryId[cat.id] = req.body[key] === "" ? 0 : req.body[key];
      }
    });

    await budgetStore.setCategoryBudgets(budgetMonth, budgetsByCategoryId);
    const updated = await getBudgetPageData(budgetMonth);

    res.render("budget", {
      pageTitle: "Budget",
      activePage: "budget",
      ...updated,
      budgetMonth,
      errors: [],
      successMessage: "Category budgets updated successfully.",
      formValues: { monthlyBudget: updated.summary.monthlyBudget },
    });
  } catch (error) {
    console.error("Database error updating category budgets:", error);
    const current = await getBudgetPageData(budgetMonth).catch(() => ({
      summary: buildBudgetSummary(0, []),
      expenses: [],
      categoryRows: [],
      hasCategoryBudgets: false,
      categorySpending: [],
      categorySetupRows: [],
      monthExpenseCount: 0,
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
    }));

    res.status(500).render("budget", {
      pageTitle: "Budget",
      activePage: "budget",
      ...current,
      budgetMonth,
      errors: ["Unable to save category budgets. Please check your values and try again."],
      formValues: { monthlyBudget: current.summary.monthlyBudget },
    });
  }
});

app.get("/budget/setup", async (req, res) => {
  try {
    const budgetMonth = req.query.month || budgetStore.getCurrentBudgetMonth();
    const pageData = await getBudgetPageData(budgetMonth);
    res.render("budget-setup", {
      pageTitle: "Budget Setup",
      activePage: "budget",
      ...pageData,
      budgetMonth,
      errors: [],
      successMessage: "",
      formValues: { monthlyBudget: pageData.summary.monthlyBudget },
    });
  } catch (error) {
    console.error("Database error loading budget setup page:", error);
    const budgetMonth = budgetStore.getCurrentBudgetMonth();
    res.status(500).render("budget-setup", {
      pageTitle: "Budget Setup",
      activePage: "budget",
      summary: buildBudgetSummary(0, []),
      expenses: [],
      categoryRows: [],
      hasCategoryBudgets: false,
      categorySpending: [],
      categorySetupRows: [],
      monthExpenseCount: 0,
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      healthStatus: getMonthlyHealthStatus(0),
      errors: ["Unable to load budget setup right now. Please try again."],
      successMessage: "",
      formValues: {},
    });
  }
});

app.post("/budget/setup", async (req, res) => {
  const budgetMonth = req.body.budgetMonth || budgetStore.getCurrentBudgetMonth();
  const { monthlyBudget: budgetInput } = req.body;
  const validation = validateMonthlyBudget(budgetInput);

  try {
    const pageData = await getBudgetPageData(budgetMonth);

    if (!validation.valid) {
      return res.render("budget-setup", {
        pageTitle: "Budget Setup",
        activePage: "budget",
        ...pageData,
        budgetMonth,
        errors: validation.errors,
        successMessage: "",
        formValues: { monthlyBudget: budgetInput },
      });
    }

    await budgetStore.setMonthlyBudget(validation.budget);

    let categories;
    try {
      categories = await expenseStore.getCategories();
    } catch (categoryError) {
      console.error("Database error loading categories for budget setup save:", categoryError);
      throw categoryError;
    }

    const budgetsByCategoryId = {};
    categories.forEach((cat) => {
      const key = `categoryBudget_${cat.id}`;
      if (req.body[key] !== undefined && req.body[key] !== "") {
        budgetsByCategoryId[cat.id] = req.body[key];
      }
    });

    if (Object.keys(budgetsByCategoryId).length > 0) {
      await budgetStore.setCategoryBudgets(budgetMonth, budgetsByCategoryId);
    }

    res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}&saved=1`);
  } catch (error) {
    console.error("Database error saving budget setup:", error);
    const pageData = await getBudgetPageData(budgetMonth).catch(() => ({
      summary: buildBudgetSummary(0, []),
      expenses: [],
      categoryRows: [],
      hasCategoryBudgets: false,
      categorySpending: [],
      categorySetupRows: [],
      monthExpenseCount: 0,
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      healthStatus: getMonthlyHealthStatus(0),
    }));

    res.status(500).render("budget-setup", {
      pageTitle: "Budget Setup",
      activePage: "budget",
      ...pageData,
      budgetMonth,
      errors: ["Unable to save budgets right now. Please check your values and try again."],
      successMessage: "",
      formValues: { monthlyBudget: budgetInput },
    });
  }
});

app.post("/budget/add", async (req, res) => {
  const budgetMonth = req.body.budgetMonth || budgetStore.getCurrentBudgetMonth();
  const { categoryId, amount, rolloverEnabled } = req.body;
  const validation = validateCategoryBudgetAmount(amount);

  if (!categoryId) {
    return res.status(400).json({ errors: ["Please select a category."] });
  }

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    const categories = await expenseStore.getCategories();
    const category = categories.find((cat) => String(cat.id) === String(categoryId));
    if (!category) {
      return res.status(400).json({ errors: ["Category not found."] });
    }

    const existing = await budgetStore.getActiveBudgetForCategory(categoryId);
    if (existing) {
      return res.status(400).json({
        errors: [
          "This category already has an active budget. Edit the existing budget instead.",
        ],
      });
    }

    await budgetStore.createCategoryBudget(
      categoryId,
      validation.budget,
      Boolean(rolloverEnabled)
    );
    res.json({
      success: true,
      redirect: `/budget?month=${encodeURIComponent(budgetMonth)}&saved=1`,
    });
  } catch (error) {
    console.error("Database error adding category budget:", error);
    if (error.code === "DUPLICATE") {
      return res.status(400).json({ errors: [error.message] });
    }
    res.status(500).json({ errors: ["Unable to save budget. Please try again."] });
  }
});

app.post("/budget/add-overall", async (req, res) => {
  const { amount, rolloverEnabled, monthFromUrl } = req.body;
  const validation = validateCategoryBudgetAmount(amount);

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    await budgetStore.saveOverallMonthlyBudget(
      validation.budget,
      Boolean(rolloverEnabled)
    );

    const redirect = monthFromUrl
      ? `/budget?month=${encodeURIComponent(
          budgetStore.normalizeBudgetMonth(req.body.budgetMonth)
        )}`
      : "/budget";

    res.json({ success: true, redirect });
  } catch (error) {
    console.error("Database error saving overall monthly budget:", error);
    res.status(500).json({ errors: ["Unable to save budget. Please try again."] });
  }
});

app.delete("/budget/categories/:id", async (req, res) => {
  const budgetMonth = req.query.month || budgetStore.getCurrentBudgetMonth();
  const categoryId = req.params.id;

  try {
    await budgetStore.deleteCategoryBudget(categoryId, budgetMonth);
    res.json({ success: true, redirect: `/budget?month=${encodeURIComponent(budgetMonth)}&saved=1` });
  } catch (error) {
    console.error("Database error deleting category budget:", error);
    res.status(500).json({ errors: ["Unable to delete budget. Please try again."] });
  }
});

app.get("/budget/everything-else", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const returnMonth = req.query.returnMonth
    ? budgetStore.normalizeBudgetMonth(req.query.returnMonth)
    : null;

  try {
    const [categories, spendingByCategoryId, pickerData] = await Promise.all([
      expenseStore.getCategories(),
      budgetStore.getSpendingTotalsByCategoryId(budgetMonth),
      expenseStore.getCategoriesForPicker(),
    ]);

    const [detail, availableCategories, activeOverallBudget, monthOptions] =
      await Promise.all([
      budgetStore.getEverythingElseDetailData(budgetMonth, categories),
      budgetStore.getAvailableCategoriesForBudget(
        budgetMonth,
        categories,
        spendingByCategoryId
      ),
      budgetStore.getActiveOverallMonthlyBudget(),
      budgetStore.getEverythingElseMonthOptions(budgetMonth),
    ]);

    res.render("budget-everything-else", {
      pageTitle: "Everything else",
      activePage: "budget",
      budgetMonth,
      returnMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      monthOptions,
      detail,
      availableCategories,
      categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
      hasOverallBudget: Boolean(activeOverallBudget),
    });
  } catch (error) {
    console.error("Database error loading everything else detail:", error);
    const backUrl = returnMonth
      ? `/budget?month=${encodeURIComponent(returnMonth)}`
      : "/budget";
    res.redirect(backUrl);
  }
});

app.get("/budget/all-categories", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.query.month || budgetStore.getCurrentBudgetMonth()
  );

  try {
    const [detail, pickerData, overallBudget] = await Promise.all([
      budgetStore.getOverallBudgetDetailData(budgetMonth),
      expenseStore.getCategoriesForPicker(),
      budgetStore.getActiveOverallMonthlyBudget(),
    ]);

    if (!detail) {
      return res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
    }

    if (detail.inactive) {
      const nav = budgetStore.getBudgetMonthNavigation(budgetMonth, detail.startMonth);
      return res.render("budget-all-categories", {
        pageTitle: "All Transactions",
        activePage: "budget",
        budgetMonth,
        budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
        budgetInactive: true,
        budgetStartMonth: detail.startMonth,
        budgetStartMonthLabel: budgetStore.formatBudgetMonthLabel(detail.startMonth),
        backMonth: nav.backMonth,
        detail: null,
        categories: pickerData.categories,
        customCategories: pickerData.customCategories,
        generalCategories: pickerData.generalCategories,
        maxDate: getTodayDateString(),
        defaultExpenseDate: getDefaultExpenseDateForBudgetMonth(budgetMonth),
        expenseReturnTo: `/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`,
      });
    }

    const nav = budgetStore.getBudgetMonthNavigation(budgetMonth, detail.startMonth);

    res.render("budget-all-categories", {
      pageTitle: "All Transactions",
      activePage: "budget",
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      backMonth: nav.backMonth,
      overallBudget,
      detail,
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
      maxDate: getTodayDateString(),
      defaultExpenseDate: getDefaultExpenseDateForBudgetMonth(budgetMonth),
      expenseReturnTo: `/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`,
      addExpenseError: req.query.addExpenseError === "1",
      successMessage: req.query.saved === "1" ? "Budget updated successfully." : "",
    });
  } catch (error) {
    console.error("Database error loading all categories budget detail:", error);
    res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
  }
});

app.post("/budget/all-categories", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  const { amount } = req.body;
  const validation = validateCategoryBudgetAmount(amount);

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    await budgetStore.updateOverallMonthlyBudgetAmount(validation.budget);
    res.json({
      success: true,
      redirect: `/budget/all-categories?month=${encodeURIComponent(budgetMonth)}&saved=1`,
    });
  } catch (error) {
    console.error("Database error updating all categories budget:", error);
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ errors: [error.message] });
    }
    res.status(500).json({ errors: ["Unable to update budget. Please try again."] });
  }
});

app.delete("/budget/all-categories", async (req, res) => {
  const monthParam = req.query.month;
  const budgetMonth = monthParam
    ? budgetStore.normalizeBudgetMonth(monthParam)
    : null;

  try {
    await budgetStore.deactivateOverallMonthlyBudget();
    const redirect = budgetMonth
      ? `/budget?month=${encodeURIComponent(budgetMonth)}`
      : "/budget";
    res.json({ success: true, redirect });
  } catch (error) {
    console.error("Database error deleting all categories budget:", error);
    res.status(500).json({ errors: ["Unable to delete budget. Please try again."] });
  }
});

app.post("/budget/all-categories/enable-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );

  try {
    await budgetStore.setOverallMonthlyBudgetRollover(true);
    res.redirect(`/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`);
  } catch (error) {
    console.error("Database error enabling all categories budget rollover:", error);
    if (error.code === "NOT_FOUND") {
      return res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
    }
    res.status(500).send("Unable to enable rollover. Please try again.");
  }
});

app.post("/budget/all-categories/disable-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );

  try {
    await budgetStore.setOverallMonthlyBudgetRollover(false);
    res.redirect(`/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`);
  } catch (error) {
    console.error("Database error disabling all categories budget rollover:", error);
    if (error.code === "NOT_FOUND") {
      return res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
    }
    res.status(500).send("Unable to disable rollover. Please try again.");
  }
});

app.post("/budget/all-categories/reset-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );

  try {
    await budgetStore.resetOverallRolloverForMonth(budgetMonth);
    res.redirect(`/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`);
  } catch (error) {
    console.error("Database error resetting all categories budget rollover:", error);
    if (error.code === "NOT_FOUND" || error.code === "ROLLOVER_OFF") {
      return res.redirect(`/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`);
    }
    res.status(500).send("Unable to reset rollover. Please try again.");
  }
});

app.post("/budget/all-categories/undo-reset-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );

  try {
    await budgetStore.undoOverallResetRolloverForMonth(budgetMonth);
    res.redirect(`/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`);
  } catch (error) {
    console.error("Database error undoing all categories budget rollover reset:", error);
    if (error.code === "NOT_FOUND" || error.code === "ROLLOVER_OFF") {
      return res.redirect(`/budget/all-categories?month=${encodeURIComponent(budgetMonth)}`);
    }
    res.status(500).send("Unable to undo reset rollover. Please try again.");
  }
});

app.get("/budget/categories/:id", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const categoryId = req.params.id;

  try {
    const [categories, pickerData, spendingByCategoryId] = await Promise.all([
      expenseStore.getCategories(),
      expenseStore.getCategoriesForPicker(),
      budgetStore.getSpendingTotalsByCategoryId(budgetMonth),
    ]);

    const detail = await budgetStore.getCategoryDetailData(
      categoryId,
      budgetMonth,
      spendingByCategoryId,
      categories
    );

    if (!detail) {
      return res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
    }

    if (detail.inactive) {
      const nav = budgetStore.getBudgetMonthNavigation(budgetMonth, detail.startMonth);
      return res.render("budget-category", {
        pageTitle: detail.category.displayName,
        activePage: "budget",
        budgetMonth,
        budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
        budgetInactive: true,
        budgetStartMonth: detail.startMonth,
        budgetStartMonthLabel: budgetStore.formatBudgetMonthLabel(detail.startMonth),
        backMonth: nav.backMonth,
        detail: { category: detail.category },
        categories,
        customCategories: pickerData.customCategories,
        generalCategories: pickerData.generalCategories,
        maxDate: getTodayDateString(),
        defaultExpenseDate: getDefaultExpenseDateForBudgetMonth(budgetMonth),
        expenseReturnTo: `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`,
      });
    }

    const nav = budgetStore.getBudgetMonthNavigation(budgetMonth, detail.startMonth);

    res.render("budget-category", {
      pageTitle: detail.category.displayName,
      activePage: "budget",
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      backMonth: nav.backMonth,
      detail,
      categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
      maxDate: getTodayDateString(),
      defaultExpenseDate: getDefaultExpenseDateForBudgetMonth(budgetMonth),
      expenseReturnTo: `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`,
      addExpenseError: req.query.addExpenseError === "1",
      successMessage: req.query.saved === "1" ? "Budget updated successfully." : "",
    });
  } catch (error) {
    console.error("Database error loading category budget detail:", error);
    res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
  }
});

app.post("/budget/categories/:id/enable-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const categoryId = req.params.id;

  try {
    await budgetStore.setCategoryBudgetRollover(categoryId, true);
    res.redirect(
      `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`
    );
  } catch (error) {
    console.error("Database error enabling category budget rollover:", error);
    if (error.code === "NOT_FOUND") {
      return res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
    }
    res.status(500).send("Unable to enable rollover. Please try again.");
  }
});

app.post("/budget/categories/:id/disable-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const categoryId = req.params.id;

  try {
    await budgetStore.setCategoryBudgetRollover(categoryId, false);
    res.redirect(
      `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`
    );
  } catch (error) {
    console.error("Database error disabling category budget rollover:", error);
    if (error.code === "NOT_FOUND") {
      return res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
    }
    res.status(500).send("Unable to disable rollover. Please try again.");
  }
});

app.post("/budget/categories/:id/reset-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const categoryId = req.params.id;

  try {
    await budgetStore.resetRolloverForMonth(categoryId, budgetMonth);
    res.redirect(
      `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`
    );
  } catch (error) {
    console.error("Database error resetting category budget rollover:", error);
    if (error.code === "NOT_FOUND" || error.code === "ROLLOVER_OFF") {
      return res.redirect(
        `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`
      );
    }
    res.status(500).send("Unable to reset rollover. Please try again.");
  }
});

app.post("/budget/categories/:id/undo-reset-rollover", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.body.budgetMonth || req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const categoryId = req.params.id;

  try {
    await budgetStore.undoResetRolloverForMonth(categoryId, budgetMonth);
    res.redirect(
      `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`
    );
  } catch (error) {
    console.error("Database error undoing category budget rollover reset:", error);
    if (error.code === "NOT_FOUND" || error.code === "ROLLOVER_OFF") {
      return res.redirect(
        `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}`
      );
    }
    res.status(500).send("Unable to undo reset rollover. Please try again.");
  }
});

app.post("/budget/categories/:id", async (req, res) => {
  const budgetMonth = req.body.budgetMonth || budgetStore.getCurrentBudgetMonth();
  const categoryId = req.params.id;
  const { amount, rolloverEnabled } = req.body;
  const validation = validateCategoryBudgetAmount(amount);

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    await budgetStore.updateCategoryBudget(
      categoryId,
      validation.budget,
      rolloverEnabled === undefined ? undefined : Boolean(rolloverEnabled)
    );
    res.json({
      success: true,
      redirect: `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}&saved=1`,
    });
  } catch (error) {
    console.error("Database error updating category budget:", error);
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ errors: [error.message] });
    }
    res.status(500).json({ errors: ["Unable to update budget. Please try again."] });
  }
});

function ensureFinanceSnapshot(summary, financeSnapshotOrExpenses, categories, spendingByCategoryId) {
  if (
    financeSnapshotOrExpenses &&
    typeof financeSnapshotOrExpenses === "object" &&
    Array.isArray(financeSnapshotOrExpenses.spendingByCategory)
  ) {
    return financeSnapshotOrExpenses;
  }

  const expenses = Array.isArray(financeSnapshotOrExpenses)
    ? financeSnapshotOrExpenses
    : [];

  if (categories && spendingByCategoryId) {
    return financeHelpers.buildFinanceSnapshot(
      summary,
      spendingByCategoryId,
      categories,
      "month"
    );
  }

  const snapshot = getFinanceSnapshot(summary, expenses) || {};

  if (!Array.isArray(snapshot.spendingByCategory)) {
    const totals = {};

    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i];
      if (expense.isExcludedFromBudget) continue;
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    }

    snapshot.spendingByCategory = Object.keys(totals)
      .map((category) => ({
        category,
        amount: totals[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  snapshot.monthlyBudget = snapshot.monthlyBudget ?? summary.monthlyBudget;
  snapshot.totalSpent = snapshot.totalSpent ?? summary.totalSpent;
  snapshot.remainingBudget = snapshot.remainingBudget ?? summary.remainingBudget;
  snapshot.percentageUsed = snapshot.percentageUsed ?? summary.percentageUsed;

  if (snapshot.spendingByCategory.length > 0) {
    snapshot.highestCategory = snapshot.highestCategory ?? snapshot.spendingByCategory[0].category;
    snapshot.highestCategoryAmount =
      snapshot.highestCategoryAmount ?? snapshot.spendingByCategory[0].amount;
  } else {
    snapshot.highestCategory = snapshot.highestCategory ?? "-";
    snapshot.highestCategoryAmount = snapshot.highestCategoryAmount ?? 0;
  }

  return snapshot;
}

function renderChatbotPage(res, liveSummary, messages, groqAiMode, inputText) {
  res.render("chatbot", {
    pageTitle: "FinBot",
    activePage: "chatbot",
    liveSummary,
    summary: liveSummary.summary,
    financeSnapshot: liveSummary.financeSnapshot,
    budgetMonthLabel: liveSummary.budgetMonthLabel || "",
    monthExpenseCount: liveSummary.expenseCountThisMonth || 0,
    messages,
    suggestedQuestions: SUGGESTED_QUESTIONS,
    inputText: inputText || "",
    groqAiMode: Boolean(groqAiMode),
  });
}

/** Same MySQL load as GET /budget, mapped for FinBot snapshot + answers. */
async function loadFinBotLiveSummary(budgetMonth) {
  return getLiveFinanceSummary(budgetMonth, getBudgetPageData);
}

app.get("/chatbot", async (req, res) => {
  try {
    const liveSummary = await loadFinBotLiveSummary();
    const sessionId = getSessionId(req, res);
    const welcomeText = getWelcomeMessage();
    const messages = await getChatHistory(sessionId, welcomeText);

    renderChatbotPage(res, liveSummary, messages, false, "");
  } catch (error) {
    console.error("Database error loading chatbot:", error);
    const emptySummary = buildBudgetSummary(0, []);
    res.status(500).render("chatbot", {
      pageTitle: "FinBot",
      activePage: "chatbot",
      liveSummary: {
        hasBudget: false,
        hasCategoryBudgets: false,
        hasAllTransactionsBudget: false,
        categoryBudgetTotal: 0,
        categoryBudgetSpent: 0,
        categoryBudgetRemaining: 0,
        categoryBudgetPctUsed: 0,
        topBudgetedCategoryName: "—",
        topBudgetedCategorySpent: 0,
        allTransactionsBudget: 0,
        allTransactionsSpent: 0,
        allTransactionsRemaining: 0,
        allTransactionsPctUsed: 0,
        monthlyBudgetTotal: 0,
        spentThisMonth: 0,
        remainingThisMonth: 0,
        expenseCountThisMonth: 0,
        topCategoryName: "—",
        topCategorySpent: 0,
        everythingElseTotal: 0,
      },
      summary: emptySummary,
      financeSnapshot: financeHelpers.buildFinanceSnapshot(emptySummary, {}, [], "month"),
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(
        budgetStore.getCurrentBudgetMonth()
      ),
      monthExpenseCount: 0,
      messages: [{ sender: "bot", text: getWelcomeMessage() }],
      suggestedQuestions: SUGGESTED_QUESTIONS,
      inputText: "",
      groqAiMode: false,
    });
  }
});

app.post("/chatbot/clear", async (req, res) => {
  try {
    const sessionId = getSessionId(req, res);
    await clearChatHistory(sessionId, getWelcomeMessage());
    res.redirect("/chatbot");
  } catch (error) {
    console.error("Database error clearing chat history:", error);
    res.status(500).redirect("/chatbot");
  }
});

app.post("/chatbot", async (req, res) => {
  const wantsJson =
    req.is("application/json") ||
    String(req.get("Accept") || "").includes("application/json");
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const rawMessage = String(body.message || body.question || "").trim();

  if (wantsJson && !rawMessage) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Always reload latest MySQL totals for every question (same source as /budget).
    const liveSummary = await loadFinBotLiveSummary();
    const {
      summary,
      financeSnapshot,
      budgetMonthLabel,
    } = liveSummary;
    const expensesInMonth = await expenseStore.getExpensesInMonth(liveSummary.month);
    const sessionId = getSessionId(req, res);
    const welcomeText = getWelcomeMessage();

    let groqAiMode = false;
    let replyText = "";

    if (rawMessage.length > 0) {
      await addChatMessage(sessionId, "user", rawMessage, welcomeText);

      try {
        const reply = await getFinBotReply(
          rawMessage,
          summary,
          financeSnapshot,
          expensesInMonth,
          budgetMonthLabel,
          liveSummary
        );
        replyText = reply.text;
        await addChatMessage(sessionId, "bot", replyText, welcomeText);
        groqAiMode = reply.usedGroq;
      } catch (error) {
        console.log("Groq API failed, using fallback");
        replyText = buildFinBotReply(
          rawMessage,
          summary,
          financeSnapshot,
          budgetMonthLabel,
          liveSummary,
          expensesInMonth
        );
        await addChatMessage(sessionId, "bot", replyText, welcomeText);
        groqAiMode = false;
      }
    }

    if (wantsJson) {
      return res.json({ reply: replyText, usedGroq: groqAiMode });
    }

    const messages = await getChatHistory(sessionId, welcomeText);
    renderChatbotPage(res, liveSummary, messages, groqAiMode, rawMessage);
  } catch (error) {
    console.error("FinBot message error:", error);
    if (wantsJson) {
      return res.status(500).json({ error: "Failed to process message" });
    }
    const emptySummary = buildBudgetSummary(0, []);
    res.status(500).render("chatbot", {
      pageTitle: "FinBot",
      activePage: "chatbot",
      liveSummary: {
        hasBudget: false,
        hasCategoryBudgets: false,
        hasAllTransactionsBudget: false,
        categoryBudgetTotal: 0,
        categoryBudgetSpent: 0,
        categoryBudgetRemaining: 0,
        categoryBudgetPctUsed: 0,
        topBudgetedCategoryName: "—",
        topBudgetedCategorySpent: 0,
        allTransactionsBudget: 0,
        allTransactionsSpent: 0,
        allTransactionsRemaining: 0,
        allTransactionsPctUsed: 0,
        monthlyBudgetTotal: 0,
        spentThisMonth: 0,
        remainingThisMonth: 0,
        expenseCountThisMonth: 0,
        topCategoryName: "—",
        topCategorySpent: 0,
        everythingElseTotal: 0,
      },
      summary: emptySummary,
      financeSnapshot: financeHelpers.buildFinanceSnapshot(emptySummary, {}, [], "month"),
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(
        budgetStore.getCurrentBudgetMonth()
      ),
      monthExpenseCount: 0,
      messages: [{ sender: "bot", text: "Sorry, something went wrong. Please try again." }],
      suggestedQuestions: SUGGESTED_QUESTIONS,
      inputText: rawMessage,
      groqAiMode: false,
    });
  }
});

// --- Expense CRUD routes (integrated) ---
// Method-override: allows PUT/DELETE from HTML forms via _method field
app.use((req, res, next) => {
  if (req.body && req.body._method) {
    req.method = req.body._method.toUpperCase();
    delete req.body._method;
  }
  next();
});
const expenseRoutes  = require('./routes/expenses');
const categoryRoutes = require('./routes/categories');
const savingsGoalRoutes = require('./routes/savingsGoals');
app.use('/expenses',   expenseRoutes);
app.use('/categories', categoryRoutes);
app.use('/savings-goals', savingsGoalRoutes);
app.get('/savings-goal', (req, res) => res.redirect('/savings-goals'));

const authRoutes = require('./routes/auth');
app.use('/', authRoutes);
const profileRoutes = require('./routes/profile');
app.use('/profile', profileRoutes);
// --- End Expense CRUD routes ---

const server = app.listen(PORT);

server.on("listening", () => {
  console.log(`spendWise running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error("Close the other terminal running node/nodemon, or run:");
    console.error("netstat -ano | findstr :3000");
    console.error("taskkill /PID <PID> /F");
  } else {
    console.error(err);
  }
  process.exit(1);
});
