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
  validateItemInput,
  getSpendingRecommendation,
  getFinanceSnapshot,
} = require("./recommendationHelpers");
const {
  SUGGESTED_QUESTIONS,
  buildFinBotReply,
  getFinBotReply,
  getWelcomeMessage,
} = require("./chatbotHelpers");
const { getSessionId } = require("./sessionCookie");
const {
  getChatHistory,
  addChatMessage,
  clearChatHistory,
} = require("./chatHistory");
const budgetStore = require("./budgetStore");
const expenseStore = require("./expenseStore");
const { getCategoryDisplayNames } = require("./categoryHelpers");
const financeHelpers = require("./financeHelpers");
const { getCategoryImageUrl } = require("./categoryImageHelpers");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- expense-nav script middleware ---
app.use(function(req, res, next) {
  var _render = res.render.bind(res);
  res.render = function(view, locals, cb) {
    if (typeof locals === 'function') { cb = locals; locals = {}; }
    locals = locals || {};
    locals.getCategoryImageUrl = getCategoryImageUrl;
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

async function getBudgetPageData(budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  let monthlyBudget;
  let expenses;
  let categories;
  let spendingByCategoryId;
  let monthTotalSpent;
  let monthExpenseCount;

  try {
    [
      monthlyBudget,
      expenses,
      categories,
      spendingByCategoryId,
      monthTotalSpent,
      monthExpenseCount,
    ] = await Promise.all([
      budgetStore.getMonthlyBudget(),
      expenseStore.getExpensesForAnalytics(),
      expenseStore.getCategories(),
      budgetStore.getSpendingTotalsByCategoryId(month),
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
  const budgetedCategoryIds = monthBudgets.map((b) => b.categoryId);
  const everythingElse = budgetStore.getEverythingElseData(
    categories,
    budgetedCategoryIds,
    spendingByCategoryId
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

app.get("/", renderOverviewPage);
app.get("/dashboard", renderOverviewPage);

app.get("/home", async (req, res) => {
  try {
    const { summary } = await getBudgetPageData();
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

app.get("/budget", async (req, res) => {
  try {
    const selectedMonth = budgetStore.normalizeBudgetMonth(
      req.query.month || budgetStore.getCurrentBudgetMonth()
    );
    const pageData = await getBudgetPageData(selectedMonth);
    const successMessage =
      req.query.saved === "1" ? "Budgets saved successfully." : "";
    res.render("budget", {
      pageTitle: "Spending & Budgets",
      activePage: "budget",
      ...pageData,
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
  const { categoryId, amount } = req.body;
  const validation = validateCategoryBudgetAmount(amount);

  if (!categoryId) {
    return res.status(400).json({ errors: ["Please select a category."] });
  }

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    await budgetStore.setCategoryBudget(categoryId, budgetMonth, validation.budget);
    res.json({ success: true, redirect: `/budget?month=${encodeURIComponent(budgetMonth)}&saved=1` });
  } catch (error) {
    console.error("Database error adding category budget:", error);
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

  try {
    const categories = await expenseStore.getCategories();

    const detail = await budgetStore.getEverythingElseDetailData(
      budgetMonth,
      categories
    );

    res.render("budget-everything-else", {
      pageTitle: "Everything else",
      activePage: "budget",
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      detail,
    });
  } catch (error) {
    console.error("Database error loading everything else detail:", error);
    res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
  }
});

app.get("/budget/categories/:id", async (req, res) => {
  const budgetMonth = budgetStore.normalizeBudgetMonth(
    req.query.month || budgetStore.getCurrentBudgetMonth()
  );
  const categoryId = req.params.id;

  try {
    const [categories, spendingByCategoryId] = await Promise.all([
      expenseStore.getCategories(),
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

    res.render("budget-category", {
      pageTitle: detail.category.displayName,
      activePage: "budget",
      budgetMonth,
      budgetMonthLabel: budgetStore.formatBudgetMonthLabel(budgetMonth),
      detail,
      successMessage: req.query.saved === "1" ? "Budget updated successfully." : "",
    });
  } catch (error) {
    console.error("Database error loading category budget detail:", error);
    res.redirect(`/budget?month=${encodeURIComponent(budgetMonth)}`);
  }
});

app.post("/budget/categories/:id", async (req, res) => {
  const budgetMonth = req.body.budgetMonth || budgetStore.getCurrentBudgetMonth();
  const categoryId = req.params.id;
  const { amount } = req.body;
  const validation = validateCategoryBudgetAmount(amount);

  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    await budgetStore.setCategoryBudget(categoryId, budgetMonth, validation.budget);
    res.json({
      success: true,
      redirect: `/budget/categories/${categoryId}?month=${encodeURIComponent(budgetMonth)}&saved=1`,
    });
  } catch (error) {
    console.error("Database error updating category budget:", error);
    res.status(500).json({ errors: ["Unable to update budget. Please try again."] });
  }
});

async function getRecommendationCategories() {
  const categories = await expenseStore.getCategories();
  return getCategoryDisplayNames(categories);
}

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

app.get("/recommendation", async (req, res) => {
  try {
    const { summary, financeSnapshot, budgetMonthLabel } = await getBudgetPageData();
    const categories = await getRecommendationCategories();

    res.render("recommendation", {
      pageTitle: "Purchase Checker",
      activePage: "recommendation",
      summary,
      financeSnapshot,
      budgetMonthLabel,
      categories,
      errors: [],
    });
  } catch (error) {
    console.error("Database error loading purchase checker:", error);
    renderDbError(res, "recommendation", {
      pageTitle: "Purchase Checker",
      activePage: "recommendation",
      summary: buildBudgetSummary(0, []),
      financeSnapshot: ensureFinanceSnapshot(buildBudgetSummary(0, []), []),
      categories: [],
    });
  }
});

app.post("/recommendation", async (req, res) => {
  const { itemName, itemPrice, category } = req.body;

  try {
    const pageData = await getBudgetPageData();
    const { summary, expensesInMonth, financeSnapshot, budgetMonthLabel } = pageData;
    const validation = validateItemInput(itemName, itemPrice, category);
    const categories = await getRecommendationCategories();

    if (!validation.valid) {
      return res.render("recommendation", {
        pageTitle: "Purchase Checker",
        activePage: "recommendation",
        summary,
        financeSnapshot,
        budgetMonthLabel,
        categories,
        errors: validation.errors,
        formValues: { itemName, itemPrice, category },
      });
    }

    const recommendation = getSpendingRecommendation(summary, expensesInMonth, {
      itemName: validation.itemName,
      itemPrice: validation.itemPrice,
      category: validation.category,
    });

    res.render("recommendation", {
      pageTitle: "Purchase Checker",
      activePage: "recommendation",
      summary,
      financeSnapshot,
      budgetMonthLabel,
      categories,
      errors: [],
      recommendation,
      formValues: { itemName, itemPrice, category },
    });
  } catch (error) {
    console.error("Database error processing purchase checker:", error);
    res.status(500).render("recommendation", {
      pageTitle: "Purchase Checker",
      activePage: "recommendation",
      summary: buildBudgetSummary(0, []),
      financeSnapshot: ensureFinanceSnapshot(buildBudgetSummary(0, []), []),
      categories: [],
      errors: ["Unable to process recommendation right now. Please try again."],
      formValues: { itemName, itemPrice, category },
    });
  }
});

function renderChatbotPage(
  res,
  summary,
  financeSnapshot,
  messages,
  groqAiMode,
  inputText,
  budgetMonthLabel,
  monthExpenseCount
) {
  res.render("chatbot", {
    pageTitle: "FinBot",
    activePage: "chatbot",
    summary,
    financeSnapshot,
    budgetMonthLabel: budgetMonthLabel || "",
    monthExpenseCount: monthExpenseCount || 0,
    messages,
    suggestedQuestions: SUGGESTED_QUESTIONS,
    inputText: inputText || "",
    groqAiMode: Boolean(groqAiMode),
  });
}

app.get("/chatbot", async (req, res) => {
  try {
    const pageData = await getBudgetPageData();
    const { summary, financeSnapshot, budgetMonthLabel, monthExpenseCount } = pageData;
    const sessionId = getSessionId(req, res);
    const welcomeText = getWelcomeMessage();
    const messages = await getChatHistory(sessionId, welcomeText);

    renderChatbotPage(
      res,
      summary,
      financeSnapshot,
      messages,
      false,
      "",
      budgetMonthLabel,
      monthExpenseCount
    );
  } catch (error) {
    console.error("Database error loading chatbot:", error);
    const emptySummary = buildBudgetSummary(0, []);
    res.status(500).render("chatbot", {
      pageTitle: "FinBot",
      activePage: "chatbot",
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
  const rawMessage = (req.body.message || req.body.question || "").trim();

  try {
    const pageData = await getBudgetPageData();
    const {
      summary,
      financeSnapshot,
      expensesInMonth,
      budgetMonthLabel,
      monthExpenseCount,
    } = pageData;
    const sessionId = getSessionId(req, res);
    const welcomeText = getWelcomeMessage();

    let groqAiMode = false;

    if (rawMessage.length > 0) {
      await addChatMessage(sessionId, "user", rawMessage, welcomeText);

      try {
        const reply = await getFinBotReply(
          rawMessage,
          summary,
          financeSnapshot,
          expensesInMonth,
          budgetMonthLabel
        );
        await addChatMessage(sessionId, "bot", reply.text, welcomeText);
        groqAiMode = reply.usedGroq;
      } catch (error) {
        console.log("Groq API failed, using fallback");
        await addChatMessage(
          sessionId,
          "bot",
          buildFinBotReply(rawMessage, summary, financeSnapshot, budgetMonthLabel),
          welcomeText
        );
        groqAiMode = false;
      }
    }

    const messages = await getChatHistory(sessionId, welcomeText);
    renderChatbotPage(
      res,
      summary,
      financeSnapshot,
      messages,
      groqAiMode,
      rawMessage,
      budgetMonthLabel,
      monthExpenseCount
    );
  } catch (error) {
    console.error("Database error processing chatbot message:", error);
    const emptySummary = buildBudgetSummary(0, []);
    res.status(500).render("chatbot", {
      pageTitle: "FinBot",
      activePage: "chatbot",
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
app.use('/expenses',   expenseRoutes);
app.use('/categories', categoryRoutes);
// --- End Expense CRUD routes ---

app.listen(PORT, () => {
  console.log(`spendWise running at http://localhost:${PORT}`);
});
