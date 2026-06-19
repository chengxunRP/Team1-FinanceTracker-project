// Finance Tracker - Express server with EJS views (Feature 4: Budget + Alerts)
require("./envConfig").logGroqKeyStatus();

const path = require("path");
const express = require("express");
const {
  validateMonthlyBudget,
  buildBudgetSummary,
} = require("./budgetHelpers");
const {
  validateItemInput,
  getSpendingRecommendation,
  getFinanceSnapshot,
} = require("./recommendationHelpers");
const sampleExpenses = require("./sampleExpenses");
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

const app = express();
const PORT = 3000;

// User sets monthly budget only (stored in memory until database is ready)
let monthlyBudget = 500;

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

function getBudgetPageData() {
  const summary = buildBudgetSummary(monthlyBudget, sampleExpenses);

  return {
    summary,
    expenses: sampleExpenses,
  };
}

function renderOverviewPage(req, res) {
  const { summary, expenses } = getBudgetPageData();
  const financeSnapshot = getFinanceSnapshot(summary, expenses);

  res.render("index", {
    pageTitle: "Overview",
    activePage: "overview",
    summary,
    expenses,
    financeSnapshot,
  });
}

app.get("/", renderOverviewPage);
app.get("/dashboard", renderOverviewPage);

app.get("/home", (req, res) => {
  const { summary } = getBudgetPageData();

  res.render("home", {
    pageTitle: "Home",
    activePage: "landing",
    summary,
  });
});

app.get("/budget", (req, res) => {
  const { summary, expenses } = getBudgetPageData();

  res.render("budget", {
    pageTitle: "Budget",
    activePage: "budget",
    summary,
    expenses,
    errors: [],
  });
});

app.post("/budget", (req, res) => {
  const { monthlyBudget: budgetInput } = req.body;
  const validation = validateMonthlyBudget(budgetInput);
  const { summary, expenses } = getBudgetPageData();

  if (!validation.valid) {
    return res.render("budget", {
      pageTitle: "Budget",
      activePage: "budget",
      summary,
      expenses,
      errors: validation.errors,
      formValues: { monthlyBudget: budgetInput },
    });
  }

  monthlyBudget = validation.budget;

  const updated = getBudgetPageData();

  res.render("budget", {
    pageTitle: "Budget",
    activePage: "budget",
    summary: updated.summary,
    expenses: updated.expenses,
    errors: [],
    successMessage: "Monthly budget updated successfully.",
    formValues: { monthlyBudget: updated.summary.monthlyBudget },
  });
});

function getRecommendationCategories() {
  const categories = [];

  for (let i = 0; i < sampleExpenses.length; i++) {
    const cat = sampleExpenses[i].category;
    if (!categories.includes(cat)) {
      categories.push(cat);
    }
  }

  categories.push("Other");
  return categories;
}

function ensureFinanceSnapshot(summary) {
  const snapshot = getFinanceSnapshot(summary, sampleExpenses) || {};

  if (!Array.isArray(snapshot.spendingByCategory)) {
    const totals = {};

    for (let i = 0; i < sampleExpenses.length; i++) {
      const expense = sampleExpenses[i];
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

app.get("/recommendation", (req, res) => {
  const { summary } = getBudgetPageData();
  const financeSnapshot = ensureFinanceSnapshot(summary);

  res.render("recommendation", {
    pageTitle: "Purchase Checker",
    activePage: "recommendation",
    summary,
    financeSnapshot,
    categories: getRecommendationCategories(),
    errors: [],
  });
});

app.post("/recommendation", (req, res) => {
  const { itemName, itemPrice, category } = req.body;
  const { summary } = getBudgetPageData();
  const validation = validateItemInput(itemName, itemPrice, category);
  const categories = getRecommendationCategories();

  if (!validation.valid) {
    const financeSnapshot = ensureFinanceSnapshot(summary);

    return res.render("recommendation", {
      pageTitle: "Purchase Checker",
      activePage: "recommendation",
      summary,
      financeSnapshot,
      categories,
      errors: validation.errors,
      formValues: { itemName, itemPrice, category },
    });
  }

  const recommendation = getSpendingRecommendation(summary, sampleExpenses, {
    itemName: validation.itemName,
    itemPrice: validation.itemPrice,
    category: validation.category,
  });

  res.render("recommendation", {
    pageTitle: "Purchase Checker",
    activePage: "recommendation",
    summary,
    financeSnapshot: ensureFinanceSnapshot(summary),
    categories,
    errors: [],
    recommendation,
    formValues: { itemName, itemPrice, category },
  });
});

function renderChatbotPage(res, summary, financeSnapshot, messages, groqAiMode, inputText) {
  res.render("chatbot", {
    pageTitle: "FinBot",
    activePage: "chatbot",
    summary,
    financeSnapshot,
    messages,
    suggestedQuestions: SUGGESTED_QUESTIONS,
    inputText: inputText || "",
    groqAiMode: Boolean(groqAiMode),
  });
}

app.get("/chatbot", (req, res) => {
  const { summary } = getBudgetPageData();
  const financeSnapshot = ensureFinanceSnapshot(summary);
  const sessionId = getSessionId(req, res);
  const welcomeText = getWelcomeMessage();
  const messages = getChatHistory(sessionId, welcomeText);

  renderChatbotPage(res, summary, financeSnapshot, messages, false);
});

app.post("/chatbot/clear", (req, res) => {
  const sessionId = getSessionId(req, res);
  clearChatHistory(sessionId, getWelcomeMessage());
  res.redirect("/chatbot");
});

app.post("/chatbot", async (req, res) => {
  const { summary, expenses } = getBudgetPageData();
  const financeSnapshot = ensureFinanceSnapshot(summary);
  const rawMessage = (req.body.message || req.body.question || "").trim();
  const sessionId = getSessionId(req, res);
  const welcomeText = getWelcomeMessage();

  let groqAiMode = false;

  if (rawMessage.length > 0) {
    addChatMessage(sessionId, "user", rawMessage, welcomeText);

    try {
      const reply = await getFinBotReply(
        rawMessage,
        summary,
        financeSnapshot,
        expenses
      );
      addChatMessage(sessionId, "bot", reply.text, welcomeText);
      groqAiMode = reply.usedGroq;
    } catch (error) {
      console.log("Groq API failed, using fallback");
      addChatMessage(
        sessionId,
        "bot",
        buildFinBotReply(rawMessage, summary, financeSnapshot),
        welcomeText
      );
      groqAiMode = false;
    }
  }

  const messages = getChatHistory(sessionId, welcomeText);

  renderChatbotPage(res, summary, financeSnapshot, messages, groqAiMode);
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
