// Finance Tracker - Express server with EJS views (Feature 4: Budget + Alerts)
const express = require("express");
const path = require("path");
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

app.get("/recommendation", (req, res) => {
  const { summary } = getBudgetPageData();
  const financeSnapshot = getFinanceSnapshot(summary, sampleExpenses);

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
    const financeSnapshot = getFinanceSnapshot(summary, sampleExpenses);

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
    financeSnapshot: recommendation.financeSnapshot,
    categories,
    errors: [],
    recommendation,
    formValues: { itemName, itemPrice, category },
  });
});

app.listen(PORT, () => {
  console.log(`Finance Tracker running at http://localhost:${PORT}`);
});
