// FinBot rule-based replies (Feature 8)

const { hasGroqApiKey } = require("./envConfig");
const { getGroqReply } = require("./groqService");
const {
  extractItemPrice,
  isPurchaseQuestion,
  buildPurchaseCheckReply,
  isSpendingAdviceQuestion,
  isSavingTipsQuestion,
} = require("./purchaseCheckHelpers");
const recommendationHelpers = require("./recommendationHelpers");
const { roundMoney } = require("./financeSummaryService");

const SUGGESTED_QUESTIONS = [
  "How much have I spent this month?",
  "How much did I spend in budget categories?",
  "What category did I spend the most on?",
  "How much budget do I have left?",
  "Am I close to overspending?",
  "Can I buy a $50 item?",
  "Show my budget summary",
];

const FINANCE_KEYWORDS = [
  "budget",
  "spending",
  "spend",
  "spent",
  "expense",
  "expenses",
  "transaction",
  "transactions",
  "category",
  "categories",
  "saving",
  "savings",
  "income",
  "money",
  "finance",
  "financial",
  "bill",
  "bills",
  "groceries",
  "transport",
  "food",
  "shopping",
  "overspent",
  "overspending",
  "left",
  "remaining",
  "buy",
  "purchase",
  "afford",
  "alert",
  "warning",
  "receipt",
  "report",
  "monthly",
  "month",
  "cash",
  "summary",
  "advice",
  "reduce",
  "spendwise",
  "finbot",
  "everything else",
  "unbudgeted",
  "rollover",
  "overspend",
  "over budget",
];

const OFF_TOPIC_REPLY =
  "Sorry, I'm designed to help with your spending, budgets, expenses, and finance decisions in spendWise. Try asking me something like 'How much have I spent this month?' or 'Can I buy a $50 item?'";

function normalizeMessage(message) {
  return String(message || "").trim().toLowerCase();
}

function isFinanceRelatedMessage(message) {
  const text = normalizeMessage(message);
  if (!text) return false;

  if (
    isPurchaseQuestion(message) ||
    isSpendingAdviceQuestion(message) ||
    isSavingTipsQuestion(message)
  ) {
    return true;
  }

  if (
    /\$\d+/.test(text) &&
    (text.includes("buy") || text.includes("afford") || text.includes("purchase"))
  ) {
    return true;
  }

  return FINANCE_KEYWORDS.some(function (keyword) {
    return text.includes(keyword);
  });
}

function isGreetingMessage(message) {
  const text = normalizeMessage(message).replace(/[!?.]+$/g, "").trim();
  if (!text) return false;

  var exactGreetings = [
    "hi",
    "hello",
    "hey",
    "hiya",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "who are you",
    "what can you do",
    "what do you do",
    "help",
    "help me",
  ];

  if (exactGreetings.indexOf(text) !== -1) return true;

  if (/^(hi|hello|hey)\b/.test(text)) {
    var wordCount = text.split(/\s+/).length;
    if (wordCount <= 5 && !isFinanceRelatedMessage(message)) {
      return true;
    }
  }

  return false;
}

function buildGreetingReply(message) {
  var text = normalizeMessage(message).replace(/[!?.]+$/g, "").trim();

  if (text === "who are you") {
    return "I'm FinBot, your finance assistant in spendWise. I help with spending, budgets, expenses, and purchase decisions.";
  }

  if (text === "what can you do" || text === "what do you do" || text === "help" || text === "help me") {
    return [
      "I can help with:",
      "- How much you've spent this month",
      "- Budget remaining and category spending",
      "- Whether a purchase fits your budget",
      "- Spending and saving advice",
      "",
      "Try: \"How much have I spent this month?\" or \"Can I buy a $50 item?\"",
    ].join("\n");
  }

  return "Hi, I'm FinBot. I can help you with spending, budgets, expenses, and purchase decisions in spendWise.";
}

function buildOffTopicReply() {
  return OFF_TOPIC_REPLY;
}

function money(value) {
  const num = roundMoney(value);
  return num % 1 === 0 ? String(num) : num.toFixed(2);
}

function liveFields(liveSummary, summary) {
  const ls = liveSummary || {};
  const allSpent = ls.allExpensesSpent != null
    ? ls.allExpensesSpent
    : ls.allTransactionsSpent != null
      ? ls.allTransactionsSpent
      : summary.totalSpent;
  const allBudget = ls.allTransactionsBudget != null
    ? ls.allTransactionsBudget
    : 0;
  const allRemaining = ls.allTransactionsRemaining != null
    ? ls.allTransactionsRemaining
    : 0;
  const catBudget = ls.categoryBudgetTotal != null ? ls.categoryBudgetTotal : 0;
  const catSpent = ls.categoryBudgetSpent != null ? ls.categoryBudgetSpent : 0;
  const catRemaining =
    ls.categoryBudgetRemaining != null ? ls.categoryBudgetRemaining : 0;

  return {
    hasCategoryBudgets: Boolean(ls.hasCategoryBudgets),
    hasAllTransactionsBudget: Boolean(ls.hasAllTransactionsBudget),
    hasBudget: Boolean(ls.hasBudget) || Number(summary.monthlyBudget) > 0,
    allSpent: money(allSpent),
    allBudget: money(allBudget),
    allRemaining: money(allRemaining),
    allPct: ls.allTransactionsPctUsed != null
      ? ls.allTransactionsPctUsed
      : summary.percentageUsed,
    catBudget: money(catBudget),
    catSpent: money(catSpent),
    catRemaining: money(catRemaining),
    catPct: ls.categoryBudgetPctUsed || 0,
    everythingElse: money(ls.everythingElseTotal || 0),
    expenseCount: ls.expenseCountThisMonth || 0,
    topBudgetedName: ls.topBudgetedCategoryName || "—",
    topBudgetedSpent: money(ls.topBudgetedCategorySpent || 0),
  };
}

function formatRemainingPhrase(amountStr) {
  const amount = Number(amountStr);
  if (amount < 0) {
    return `$${money(Math.abs(amount))} over`;
  }
  return `$${amountStr} left`;
}

function buildRemainingReply(fields, monthNote) {
  const lines = [`Budget remaining${monthNote}:`];

  if (fields.hasAllTransactionsBudget) {
    lines.push(
      `- All Transactions: ${formatRemainingPhrase(fields.allRemaining)} ($${fields.allSpent} of $${fields.allBudget})`
    );
  }

  if (fields.hasCategoryBudgets) {
    const catPhrase =
      Number(fields.catRemaining) < 0
        ? `you are $${money(Math.abs(Number(fields.catRemaining)))} over`
        : `$${fields.catRemaining} left`;
    lines.push(
      `- Category budgets: ${catPhrase} ($${fields.catSpent} of $${fields.catBudget} budgeted)`
    );
  }

  if (!fields.hasAllTransactionsBudget && !fields.hasCategoryBudgets) {
    return `I could not find a budget for this month yet. You spent $${fields.allSpent} across all transactions${monthNote}.`;
  }

  if (fields.hasAllTransactionsBudget && fields.hasCategoryBudgets) {
    const allLeft =
      Number(fields.allRemaining) < 0
        ? `You are $${money(Math.abs(Number(fields.allRemaining)))} over your All Transactions budget.`
        : `You have $${fields.allRemaining} left in your All Transactions budget.`;
    const catLeft =
      Number(fields.catRemaining) < 0
        ? `For normal category budgets, you are $${money(Math.abs(Number(fields.catRemaining)))} over.`
        : `For normal category budgets, you have $${fields.catRemaining} left.`;
    return `${allLeft} ${catLeft}`;
  }

  return lines.join("\n");
}

function buildBudgetSummaryReply(fields, highestCategory, highestCategoryAmount, monthNote) {
  const lines = [`Budget summary${monthNote}:`, ""];

  if (fields.hasCategoryBudgets) {
    lines.push("Category Budgets:");
    lines.push(`- Budgeted: $${fields.catBudget}`);
    lines.push(`- Spent in budgeted categories: $${fields.catSpent}`);
    lines.push(`- Remaining: $${fields.catRemaining}`);
    lines.push(
      `- Top budgeted category: ${fields.topBudgetedName} ($${fields.topBudgetedSpent})`
    );
    lines.push("");
  }

  lines.push("All Transactions:");
  if (fields.hasAllTransactionsBudget) {
    lines.push(`- Available budget: $${fields.allBudget}`);
  } else {
    lines.push("- Available budget: not set");
  }
  lines.push(`- Total spent: $${fields.allSpent}`);
  if (fields.hasAllTransactionsBudget) {
    lines.push(`- Remaining: $${fields.allRemaining}`);
  }
  lines.push(`- Everything Else: $${fields.everythingElse}`);
  lines.push(
    `- Top category overall: ${highestCategory} ($${money(highestCategoryAmount)})`
  );

  if (!fields.hasCategoryBudgets && !fields.hasAllTransactionsBudget) {
    lines.push("");
    lines.push("I could not find a budget for this month yet.");
  }

  return lines.join("\n");
}

function buildOverspendingReply(fields, monthNote) {
  if (!fields.hasBudget) {
    return `You spent $${fields.allSpent} across all transactions${monthNote}. I could not find a budget for this month yet.`;
  }

  const lines = [];

  if (fields.hasAllTransactionsBudget) {
    if (fields.allPct >= 100) {
      lines.push(
        `Yes — you are over your All Transactions budget${monthNote} ($${fields.allSpent} of $${fields.allBudget}, ${fields.allPct}% used).`
      );
    } else if (fields.allPct >= 80) {
      lines.push(
        `You are close to overspending on All Transactions${monthNote} ($${fields.allSpent} of $${fields.allBudget}, $${fields.allRemaining} left, ${fields.allPct}% used).`
      );
    } else {
      lines.push(
        `You are not close to overspending on All Transactions${monthNote} ($${fields.allSpent} of $${fields.allBudget}, $${fields.allRemaining} left).`
      );
    }
  }

  if (fields.hasCategoryBudgets) {
    if (Number(fields.catRemaining) < 0) {
      lines.push(
        `For normal category budgets, you are $${money(Math.abs(Number(fields.catRemaining)))} over ($${fields.catSpent} of $${fields.catBudget}).`
      );
    } else if (fields.catPct >= 80) {
      lines.push(
        `For normal category budgets, you have $${fields.catRemaining} left ($${fields.catSpent} of $${fields.catBudget}, ${fields.catPct}% used).`
      );
    } else if (!fields.hasAllTransactionsBudget) {
      lines.push(
        `You are not close to overspending on category budgets${monthNote} ($${fields.catSpent} of $${fields.catBudget}, $${fields.catRemaining} left).`
      );
    }
  }

  return lines.join("\n");
}

function isBudgetedCategorySpendQuestion(text) {
  const mentionsSpend = text.includes("spent") || text.includes("spend");
  if (!mentionsSpend) return false;

  return (
    (text.includes("budget") && text.includes("categor")) ||
    text.includes("budgeted categor") ||
    text.includes("in my budgets") ||
    text.includes("in budget categories") ||
    text.includes("category budgets")
  );
}

function buildFinBotReply(message, summary, financeSnapshot, budgetMonthLabel, liveSummary, expenses) {
  const text = (message || "").trim().toLowerCase();
  const highestCategory = financeSnapshot.highestCategory || "—";
  const highestCategoryAmount = financeSnapshot.highestCategoryAmount || 0;
  const monthNote = budgetMonthLabel ? ` (${budgetMonthLabel})` : " this month";
  const fields = liveFields(liveSummary, summary);

  // Purchase checks use All Transactions remaining by default (summary.primary).
  const itemPrice = extractItemPrice(message);
  if (itemPrice != null && isPurchaseQuestion(message)) {
    if (!fields.hasAllTransactionsBudget) {
      const lines = [
        "Overall Budget Not Set.",
        "Create an All Categories Budget on Spending & Budgets to check purchases against your overall monthly spending limit.",
      ];
      if (fields.hasCategoryBudgets) {
        lines.push(
          `You have category budgets totaling $${fields.catBudget}, but that is not the same as an overall monthly budget.`
        );
        lines.push(
          "Select a category with a budget on the Purchase Checker page for a category-specific check."
        );
      }
      return lines.join("\n");
    }
    // Prefer the richer recommendation helper which includes reasons and insight.
    try {
      const item = { itemName: 'Item', itemPrice, category: 'Everything else' };
      const rec = recommendationHelpers.getSpendingRecommendation(
        summary,
        Array.isArray(expenses) ? expenses : [],
        item,
        {
          useAllBudgetCounting: true,
          hasOverallBudget: true,
          categoryBudgetRows: liveSummary.budgetBreakdown || [],
        }
      );
      // Format a readable reply similar to the purchase check helper.
      const lines = [];
      lines.push(`Status: ${rec.result}`);
      lines.push("");
      lines.push("Current situation:");
      lines.push(`- Monthly budget: $${summary.monthlyBudget}`);
      lines.push(`- Current spent: $${summary.totalSpent}`);
      lines.push(`- Current remaining: $${summary.remainingBudget}`);
      lines.push("");
      lines.push("After purchase:");
      lines.push(`- Item price: $${rec.itemPrice}`);
      lines.push(`- New total spent: $${rec.analysis.newTotalSpent}`);
      lines.push(`- Remaining after purchase: $${rec.analysis.newRemainingBudget}`);
      lines.push(`- Budget used after purchase: ${rec.analysis.newPercentageUsed}%`);
      lines.push("");
      lines.push("Advice:");
      if (rec.reasons && rec.reasons.length) {
        lines.push(`- ${rec.reasons.join('\n- ')}`);
      } else {
        lines.push("- Consider whether this purchase is necessary based on your remaining budget.");
      }
      return lines.join("\n");
    } catch (e) {
      return buildPurchaseCheckReply(summary, itemPrice);
    }
  }

  if (isSavingTipsQuestion(message)) {
    return buildBudgetSummaryReply(
      fields,
      highestCategory,
      highestCategoryAmount,
      monthNote
    );
  }

  if (isSpendingAdviceQuestion(message)) {
    return buildBudgetSummaryReply(
      fields,
      highestCategory,
      highestCategoryAmount,
      monthNote
    );
  }

  if (
    text.includes("close to overspending") ||
    text.includes("overspending") ||
    text.includes("over budget") ||
    text.includes("am i over")
  ) {
    return buildOverspendingReply(fields, monthNote);
  }

  if (
    text.includes("left") ||
    text.includes("remaining") ||
    (text.includes("budget") && text.includes("have"))
  ) {
    return buildRemainingReply(fields, monthNote);
  }

  if (isBudgetedCategorySpendQuestion(text)) {
    if (!fields.hasCategoryBudgets) {
      return `You do not have any normal category budgets set${monthNote}. Total spending across all transactions is $${fields.allSpent}.`;
    }
    return `You spent $${fields.catSpent} in categories that have budgets${monthNote}.`;
  }

  if (
    text.includes("summary") ||
    text.includes("overview") ||
    (text.includes("budget") &&
      !text.includes("left") &&
      !text.includes("spent") &&
      !text.includes("spend"))
  ) {
    return buildBudgetSummaryReply(
      fields,
      highestCategory,
      highestCategoryAmount,
      monthNote
    );
  }

  if (
    text.includes("highest category") ||
    text.includes("most on") ||
    text.includes("most spend") ||
    text.includes("category did i spend") ||
    text.includes("top category") ||
    text.includes("top budgeted") ||
    text.includes("risky")
  ) {
    if (!highestCategory || highestCategory === "—" || highestCategoryAmount <= 0) {
      return `I could not find any counted spending categories${monthNote}.`;
    }
    return [
      `Top category${monthNote}:`,
      `${highestCategory} is your highest spending category at $${money(highestCategoryAmount)}.`,
      "",
      "Advice:",
      `- Review your ${highestCategory} purchases first.`,
      "- That is usually the best place to cut spending if you want to save more.",
    ].join("\n");
  }

  if (text.includes("spent") || text.includes("spend") || text.includes("spending")) {
    return `You spent $${fields.allSpent} in total this month across all transactions${monthNote}.`;
  }

  if (text.includes("reduce spending") || text.includes("save")) {
    return buildBudgetSummaryReply(
      fields,
      highestCategory,
      highestCategoryAmount,
      monthNote
    );
  }

  return [
    "I can help with:",
    "- Total spending and spending in budgeted categories",
    "- All Transactions and category budget remaining",
    "- Highest spending category",
    "- Whether you are close to overspending",
    "- Purchase checks (e.g. Can I buy $50?)",
    "- Spending advice and saving tips",
  ].join("\n");
}

function getWelcomeMessage() {
  return "Hi, I'm FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.";
}

async function getFinBotReply(
  message,
  summary,
  financeSnapshot,
  expenses,
  budgetMonthLabel,
  liveSummary
) {
  if (!isFinanceRelatedMessage(message)) {
    if (isGreetingMessage(message)) {
      return { text: buildGreetingReply(message), usedGroq: false };
    }
    return { text: buildOffTopicReply(), usedGroq: false };
  }

  const fallbackReply = buildFinBotReply(
    message,
    summary,
    financeSnapshot,
    budgetMonthLabel,
    liveSummary,
    expenses
  );

  if (!process.env.GROQ_API_KEY || !hasGroqApiKey()) {
    return { text: fallbackReply, usedGroq: false };
  }

  try {
    const aiReply = await getGroqReply(
      message,
      summary,
      financeSnapshot,
      expenses,
      budgetMonthLabel,
      liveSummary
    );

    if (aiReply) {
      return { text: aiReply, usedGroq: true };
    }

    console.log("Groq API failed, using fallback");
    return { text: fallbackReply, usedGroq: false };
  } catch (error) {
    console.log("Groq API failed, using fallback");
    return { text: fallbackReply, usedGroq: false };
  }
}

module.exports = {
  SUGGESTED_QUESTIONS,
  buildFinBotReply,
  getFinBotReply,
  getWelcomeMessage,
  isFinanceRelatedMessage,
  isGreetingMessage,
  buildGreetingReply,
  buildOffTopicReply,
};
