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

const app = express();
const PORT = 3000;

// User sets monthly budget only (stored in memory until database is ready)
let monthlyBudget = 500;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function getBudgetPageData() {
  const summary = buildBudgetSummary(monthlyBudget, sampleExpenses);

  return {
    summary,
    expenses: sampleExpenses,
  };
}

app.get("/", (req, res) => {
  const { summary } = getBudgetPageData();

  res.render("index", {
    pageTitle: "Home",
    activePage: "home",
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
    snapshot.highestCategory = snapshot.highestCategory ?? "—";
    snapshot.highestCategoryAmount = snapshot.highestCategoryAmount ?? 0;
  }

  return snapshot;
}

app.get("/recommendation", (req, res) => {
  const { summary } = getBudgetPageData();
  const financeSnapshot = ensureFinanceSnapshot(summary);

  res.render("recommendation", {
    pageTitle: "Recommendations",
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
      pageTitle: "Recommendations",
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
    pageTitle: "Recommendations",
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

  renderChatbotPage(
    res,
    summary,
    financeSnapshot,
    [{ role: "assistant", text: getWelcomeMessage() }],
    false
  );
});

app.post("/chatbot", async (req, res) => {
  const { summary, expenses } = getBudgetPageData();
  const financeSnapshot = ensureFinanceSnapshot(summary);
  const rawMessage = (req.body.message || req.body.question || "").trim();

  const messages = [{ role: "assistant", text: getWelcomeMessage() }];

  let groqAiMode = false;

  if (rawMessage.length > 0) {
    messages.push({ role: "user", text: rawMessage });

    try {
      const reply = await getFinBotReply(
        rawMessage,
        summary,
        financeSnapshot,
        expenses
      );
      messages.push({ role: "assistant", text: reply.text });
      groqAiMode = reply.usedGroq;
    } catch (error) {
      console.log("Groq API failed, using fallback");
      messages.push({
        role: "assistant",
        text: buildFinBotReply(rawMessage, summary, financeSnapshot),
      });
      groqAiMode = false;
    }
  }

  renderChatbotPage(res, summary, financeSnapshot, messages, groqAiMode);
});

app.listen(PORT, () => {
  console.log(`Finance Tracker running at http://localhost:${PORT}`);
});
