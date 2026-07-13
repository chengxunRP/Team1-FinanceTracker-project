// FinBot Finance Chatbot — rule-based answers when Groq is off; Groq AI when GROQ_API_KEY is in .env.
// All replies use the logged-in user's MySQL finance data (same source as Spending & Budgets).
const { hasGroqApiKey } = require("./envConfig");
const { getGroqReply } = require("./groqService");
const {
  extractItemPrice,
  isPurchaseQuestion,
  buildPurchaseCheckReply,
  isSpendingAdviceQuestion,
  isSavingTipsQuestion,
  isImprovementAdviceQuestion,
  isCategoryReduceQuestion,
  isBudgetHealthQuestion,
  isBudgetAlertExplanationQuestion,
} = require("./purchaseCheckHelpers");
const recommendationHelpers = require("./recommendationHelpers");
const currencyService = require("./currencyService");
const { getRequestCurrency } = require("./requestUserContext");

const SUGGESTED_QUESTIONS = [
  "How much have I spent this month?",
  "Is there any improvement I can do?",
  "What category should I reduce?",
  "How much budget do I have left?",
  "How can I save more?",
  "Can I buy a $50 item?",
  "Show my budget summary",
];

const CLEARLY_OFF_TOPIC_KEYWORDS = [
  "weather",
  "football",
  "soccer",
  "joke",
  "recipe",
  "movie",
  "song",
  "capital of",
  "who is",
  "tell me a story",
  "play a game",
  "write a poem",
  "translate this",
  "write code",
  "homework answer",
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
  "save",
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
  "improve",
  "improvement",
  "suggest",
  "recommend",
  "control",
  "problem",
  "situation",
  "dashboard",
  "spendwise",
  "finbot",
  "everything else",
  "unbudgeted",
  "rollover",
  "overspend",
  "over budget",
  "exceeded",
  "reached",
  "goal",
  "tips",
  "tip",
];

const OFF_TOPIC_REPLY =
  "I focus on spendWise finance help — spending, budgets, expenses, savings, and purchase decisions. Try asking \"Is there any improvement I can do?\" or \"How much budget do I have left?\"";

function normalizeMessage(message) {
  return String(message || "").trim().toLowerCase();
}

// Detect clearly unrelated questions (weather, jokes, sports, etc.).
// Those are redirected back to finance topics. Normal finance follow-up
// questions are still allowed through to Groq or the built-in fallback.
function isClearlyOffTopicMessage(message) {
  const text = normalizeMessage(message);
  return CLEARLY_OFF_TOPIC_KEYWORDS.some(function (keyword) {
    return text.includes(keyword);
  });
}

function isFinanceCoachingQuestion(message) {
  const text = normalizeMessage(message);
  return (
    isImprovementAdviceQuestion(message) ||
    isCategoryReduceQuestion(message) ||
    isBudgetHealthQuestion(message) ||
    isBudgetAlertExplanationQuestion(message) ||
    isSpendingAdviceQuestion(message) ||
    isSavingTipsQuestion(message) ||
    text.includes("what should i") ||
    text.includes("what can i do") ||
    text.includes("how can i") ||
    text.includes("how do i") ||
    text.includes("am i spending") ||
    text.includes("biggest problem") ||
    text.includes("give me advice") ||
    text.includes("summarize my") ||
    text.includes("explain my")
  );
}

function isFinanceRelatedMessage(message) {
  const text = normalizeMessage(message);
  if (!text) return false;
  if (isClearlyOffTopicMessage(message)) return false;

  if (isFinanceCoachingQuestion(message) || isPurchaseQuestion(message)) {
    return true;
  }

  if (
    /\$\d+/.test(text) &&
    (text.includes("buy") || text.includes("afford") || text.includes("purchase"))
  ) {
    return true;
  }

  if (FINANCE_KEYWORDS.some(function (keyword) {
    return text.includes(keyword);
  })) {
    return true;
  }

  if (
    text.includes("?") &&
    (text.includes("how ") ||
      text.includes("what ") ||
      text.includes("should ") ||
      text.includes("can i") ||
      text.includes("am i"))
  ) {
    return true;
  }

  return false;
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
      "- Spending and budget summaries",
      "- Improvement advice based on your data",
      "- Which category to reduce",
      "- Whether a purchase fits your budget",
      "- Budget alerts and saving tips",
      "",
      'Try: "Is there any improvement I can do?" or "Can I buy a $50 item?"',
    ].join("\n");
  }

  return "Hi, I'm FinBot. I can help you with spending, budgets, expenses, and purchase decisions in spendWise.";
}

function buildOffTopicReply() {
  return OFF_TOPIC_REPLY;
}

function getBudgetStressCategories(categoryRows) {
  return (categoryRows || [])
    .filter(function (row) {
      const usedPct = Number(row.usedPct) || 0;
      return (
        row.overspent ||
        row.budgetReached ||
        row.statusKey === "reached" ||
        row.statusKey === "overspent" ||
        usedPct >= 80
      );
    })
    .sort(function (a, b) {
      return (Number(b.usedPct) || 0) - (Number(a.usedPct) || 0);
    });
}

function formatCategoryStress(row) {
  const name = row.displayName || row.name;
  if (row.overspent) {
    return `${name} (exceeded: ${money(row.actual)} of ${money(row.availableBudget)})`;
  }
  if (row.budgetReached || row.statusKey === "reached") {
    return `${name} (reached: 100% used)`;
  }
  return `${name} (${row.usedPct}% used)`;
}

function buildImprovementAdviceReply(fields, liveSummary, financeSnapshot, monthNote) {
  const stressed = getBudgetStressCategories(liveSummary.budgetBreakdown);
  const lines = [`Yes. Based on your current budget${monthNote}, here is what I suggest:`, ""];

  if (fields.hasAllTransactionsBudget) {
    if (fields.allRemainingNum < 0) {
      lines.push(
        `- Your All Categories Budget is overspent by ${money(Math.abs(fields.allRemainingNum))} (${fields.allSpent} of ${fields.allBudget}).`
      );
    } else if (Number(fields.allPct) >= 100) {
      lines.push(
        `- Your All Categories Budget is fully used (${fields.allSpent} of ${fields.allBudget}, 100% used).`
      );
    } else if (Number(fields.allPct) >= 80) {
      lines.push(
        `- Your All Categories Budget is at ${fields.allPct}% (${fields.allSpent} of ${fields.allBudget}, ${fields.allRemaining} left).`
      );
    }
  }

  if (stressed.length) {
    lines.push(
      `- Focus on these categories first: ${stressed
        .slice(0, 4)
        .map(formatCategoryStress)
        .join("; ")}.`
    );
  } else if (financeSnapshot.highestCategory && financeSnapshot.highestCategory !== "—") {
    lines.push(
      `- Your highest spending category is ${financeSnapshot.highestCategory} (${money(financeSnapshot.highestCategoryAmount)}). Review that area first.`
    );
  } else {
    lines.push(`- You spent ${fields.allSpent} across all transactions${monthNote}.`);
  }

  lines.push("", "Advice:");
  lines.push("- Pause non-essential spending until stressed categories are back under control.");
  if (stressed.length) {
    const top = stressed[0];
    lines.push(
      `- Lower spending in ${top.displayName || top.name} first — it is your most pressured budget category.`
    );
  }
  lines.push("- Use Don't Count only for transactions that should not affect your budget totals.");
  if (fields.hasAllTransactionsBudget && fields.allRemainingNum > 0) {
    lines.push(`- Protect your remaining ${fields.allRemaining} in All Categories Budget.`);
  } else if (fields.hasCategoryBudgets && fields.catRemainingNum > 0) {
    lines.push(`- Protect your remaining ${fields.catRemaining} across category budgets.`);
  }

  return lines.join("\n");
}

function buildCategoryReduceReply(liveSummary, monthNote) {
  const stressed = getBudgetStressCategories(liveSummary.budgetBreakdown);
  if (stressed.length) {
    const top = stressed[0];
    const name = top.displayName || top.name;
    const lines = [
      `Start with ${name}${monthNote}.`,
      top.overspent
        ? `It is over budget at ${money(top.actual)} of ${money(top.availableBudget)} (${top.usedPct}% used).`
        : top.budgetReached || top.statusKey === "reached"
          ? `It has reached 100% of its budget (${money(top.actual)} of ${money(top.availableBudget)}).`
          : `It is at ${top.usedPct}% of its budget (${money(top.actual)} of ${money(top.availableBudget)}).`,
      "",
      "Advice:",
      `- Cut one non-essential ${name} purchase this week.`,
    ];
    if (stressed.length > 1) {
      lines.push(
        `- Also watch ${stressed[1].displayName || stressed[1].name} (${stressed[1].usedPct}% used).`
      );
    }
    return lines.join("\n");
  }

  const topName = liveSummary.topCategoryName || "—";
  const topSpent = money(liveSummary.topCategorySpent || 0);
  if (topName !== "—" && Number(liveSummary.topCategorySpent) > 0) {
    return [
      `No category budget is over its limit${monthNote}, but your highest spending category is ${topName} (${topSpent}).`,
      "",
      "Advice:",
      `- Review ${topName} purchases first if you want to reduce spending.`,
      "- Set a weekly spending cap for that category.",
    ].join("\n");
  }

  return `I could not find a stressed category budget${monthNote}. Try setting category budgets on Spending & Budgets first.`;
}

function buildSavingAdviceReply(fields, liveSummary, financeSnapshot, monthNote) {
  const lines = [`Here is how you can save more${monthNote}:`, ""];

  if (fields.hasAllTransactionsBudget) {
    lines.push(
      `- All Categories Budget remaining: ${fields.allRemaining} (${fields.allSpent} spent of ${fields.allBudget}).`
    );
  }
  if (fields.hasCategoryBudgets) {
    lines.push(
      `- Category budgets remaining: ${fields.catRemaining} (${fields.catSpent} spent of ${fields.catBudget}).`
    );
  }

  const stressed = getBudgetStressCategories(liveSummary.budgetBreakdown);
  if (stressed.length) {
    lines.push(`- Cut back in ${stressed[0].displayName || stressed[0].name} first.`);
  } else if (financeSnapshot.highestCategory && financeSnapshot.highestCategory !== "—") {
    lines.push(`- Your largest spending category is ${financeSnapshot.highestCategory} (${money(financeSnapshot.highestCategoryAmount)}).`);
  }

  lines.push(
    "- Delay non-essential purchases until next month.",
    "- Use Don't Count only when a transaction should not affect budget totals."
  );

  return lines.join("\n");
}

function buildBudgetHealthReply(fields, monthNote) {
  const lines = [`Budget health check${monthNote}:`, ""];

  if (fields.hasAllTransactionsBudget) {
    const allStatus =
      fields.allRemainingNum < 0
        ? "over budget"
        : Number(fields.allPct) >= 100
          ? "fully used"
          : Number(fields.allPct) >= 80
            ? "in warning zone"
            : "on track";
    lines.push(
      `- All Categories Budget: ${allStatus} (${fields.allSpent} of ${fields.allBudget}, ${fields.allRemaining} left).`
    );
  }

  if (fields.hasCategoryBudgets) {
    const catStatus =
      fields.catRemainingNum < 0
        ? "over budget"
        : Number(fields.catPct) >= 100
          ? "fully used"
          : Number(fields.catPct) >= 80
            ? "in warning zone"
            : "on track";
    lines.push(
      `- Category budgets: ${catStatus} (${fields.catSpent} of ${fields.catBudget}, ${fields.catRemaining} left).`
    );
  }

  if (!fields.hasAllTransactionsBudget && !fields.hasCategoryBudgets) {
    lines.push(`- No budgets are set yet. You spent ${fields.allSpent} across all transactions.`);
  }

  return lines.join("\n");
}

function buildBudgetAlertExplanationReply(liveSummary, monthNote) {
  const stressed = getBudgetStressCategories(liveSummary.budgetBreakdown);
  const lines = [`Budget alerts${monthNote} appear when a category or All Categories Budget hits 80% (warning), 100% (reached), or goes over budget (exceeded).`, ""];

  if (!stressed.length && !(liveSummary.hasAllTransactionsBudget && Number(liveSummary.allTransactionsPctUsed) >= 80)) {
    lines.push("You do not have active budget alerts right now.");
    return lines.join("\n");
  }

  if (liveSummary.hasAllTransactionsBudget && Number(liveSummary.allTransactionsPctUsed) >= 80) {
    lines.push(
      `- All Categories Budget: ${liveSummary.allTransactionsPctUsed}% used (${money(liveSummary.allTransactionsSpent)} of ${money(liveSummary.allTransactionsBudget)}).`
    );
  }

  stressed.slice(0, 5).forEach(function (row) {
    const state = row.overspent
      ? "exceeded"
      : row.budgetReached || row.statusKey === "reached"
        ? "reached"
        : "warning";
    lines.push(
      `- ${row.displayName || row.name}: ${state} (${row.usedPct}% used, ${money(row.actual)} of ${money(row.availableBudget)}).`
    );
  });

  lines.push("", "Review Spending & Budgets to adjust spending or budgets.");
  return lines.join("\n");
}

function money(value) {
  const code = getRequestCurrency() || currencyService.BASE_CURRENCY;
  try {
    return currencyService.formatFromBase(value, code);
  } catch (error) {
    return currencyService.formatFromBase(value, currencyService.BASE_CURRENCY);
  }
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
    allRemainingNum: Number(allRemaining) || 0,
    allPct: ls.allTransactionsPctUsed != null
      ? ls.allTransactionsPctUsed
      : summary.percentageUsed,
    catBudget: money(catBudget),
    catSpent: money(catSpent),
    catRemaining: money(catRemaining),
    catRemainingNum: Number(catRemaining) || 0,
    catPct: ls.categoryBudgetPctUsed || 0,
    everythingElse: money(ls.everythingElseTotal || 0),
    expenseCount: ls.expenseCountThisMonth || 0,
    topBudgetedName: ls.topBudgetedCategoryName || "—",
    topBudgetedSpent: money(ls.topBudgetedCategorySpent || 0),
  };
}

function formatRemainingPhrase(amount) {
  const num = Number(amount);
  if (num < 0) {
    return `${money(Math.abs(num))} over`;
  }
  return `${money(num)} left`;
}

function buildRemainingReply(fields, monthNote) {
  const lines = [`Budget remaining${monthNote}:`];

  if (fields.hasAllTransactionsBudget) {
    lines.push(
      `- All Transactions: ${formatRemainingPhrase(fields.allRemainingNum)} (${fields.allSpent} of ${fields.allBudget})`
    );
  }

  if (fields.hasCategoryBudgets) {
    const catPhrase =
      fields.catRemainingNum < 0
        ? `you are ${money(Math.abs(fields.catRemainingNum))} over`
        : `${fields.catRemaining} left`;
    lines.push(
      `- Category budgets: ${catPhrase} (${fields.catSpent} of ${fields.catBudget} budgeted)`
    );
  }

  if (!fields.hasAllTransactionsBudget && !fields.hasCategoryBudgets) {
    return `I could not find a budget for this month yet. You spent ${fields.allSpent} across all transactions${monthNote}.`;
  }

  if (fields.hasAllTransactionsBudget && fields.hasCategoryBudgets) {
    const allLeft =
      fields.allRemainingNum < 0
        ? `You are ${money(Math.abs(fields.allRemainingNum))} over your All Transactions budget.`
        : `You have ${fields.allRemaining} left in your All Transactions budget.`;
    const catLeft =
      fields.catRemainingNum < 0
        ? `For normal category budgets, you are ${money(Math.abs(fields.catRemainingNum))} over.`
        : `For normal category budgets, you have ${fields.catRemaining} left.`;
    return `${allLeft} ${catLeft}`;
  }

  return lines.join("\n");
}

function buildBudgetSummaryReply(fields, highestCategory, highestCategoryAmount, monthNote) {
  const lines = [`Budget summary${monthNote}:`, ""];

  if (fields.hasCategoryBudgets) {
    lines.push("Category Budgets:");
    lines.push(`- Budgeted: ${fields.catBudget}`);
    lines.push(`- Spent in budgeted categories: ${fields.catSpent}`);
    lines.push(`- Remaining: ${fields.catRemaining}`);
    lines.push(
      `- Top budgeted category: ${fields.topBudgetedName} (${fields.topBudgetedSpent})`
    );
    lines.push("");
  }

  lines.push("All Transactions:");
  if (fields.hasAllTransactionsBudget) {
    lines.push(`- Available budget: ${fields.allBudget}`);
  } else {
    lines.push("- Available budget: not set");
  }
  lines.push(`- Total spent: ${fields.allSpent}`);
  if (fields.hasAllTransactionsBudget) {
    lines.push(`- Remaining: ${fields.allRemaining}`);
  }
  lines.push(`- Everything Else: ${fields.everythingElse}`);
  lines.push(
    `- Top category overall: ${highestCategory} (${money(highestCategoryAmount)})`
  );

  if (!fields.hasCategoryBudgets && !fields.hasAllTransactionsBudget) {
    lines.push("");
    lines.push("I could not find a budget for this month yet.");
  }

  return lines.join("\n");
}

function buildOverspendingReply(fields, monthNote) {
  if (!fields.hasBudget) {
    return `You spent ${fields.allSpent} across all transactions${monthNote}. I could not find a budget for this month yet.`;
  }

  const lines = [];

  if (fields.hasAllTransactionsBudget) {
    if (fields.allPct >= 100) {
      lines.push(
        `Yes — you are over your All Transactions budget${monthNote} (${fields.allSpent} of ${fields.allBudget}, ${fields.allPct}% used).`
      );
    } else if (fields.allPct >= 80) {
      lines.push(
        `You are close to overspending on All Transactions${monthNote} (${fields.allSpent} of ${fields.allBudget}, ${fields.allRemaining} left, ${fields.allPct}% used).`
      );
    } else {
      lines.push(
        `You are not close to overspending on All Transactions${monthNote} (${fields.allSpent} of ${fields.allBudget}, ${fields.allRemaining} left).`
      );
    }
  }

  if (fields.hasCategoryBudgets) {
    if (fields.catRemainingNum < 0) {
      lines.push(
        `For normal category budgets, you are ${money(Math.abs(fields.catRemainingNum))} over (${fields.catSpent} of ${fields.catBudget}).`
      );
    } else if (fields.catPct >= 80) {
      lines.push(
        `For normal category budgets, you have ${fields.catRemaining} left (${fields.catSpent} of ${fields.catBudget}, ${fields.catPct}% used).`
      );
    } else if (!fields.hasAllTransactionsBudget) {
      lines.push(
        `You are not close to overspending on category budgets${monthNote} (${fields.catSpent} of ${fields.catBudget}, ${fields.catRemaining} left).`
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

// Built-in (rule-based) FinBot replies when Groq is unavailable or fails.
// Reads the supplied finance summary and can answer about spending, remaining
// budget, highest category, overspending and simple purchase questions without
// calling the Groq API.
function buildFinBotReply(message, summary, financeSnapshot, budgetMonthLabel, liveSummary, expenses) {
  const text = (message || "").trim().toLowerCase();
  const highestCategory = financeSnapshot.highestCategory || "—";
  const highestCategoryAmount = financeSnapshot.highestCategoryAmount || 0;
  const monthNote = budgetMonthLabel ? ` (${budgetMonthLabel})` : " this month";
  const fields = liveFields(liveSummary, summary);

  const spendSaveMatch = text.match(
    /spend\s*\$?\s*(\d+(?:\.\d+)?)\b[\s\S]*save\s*\$?\s*(\d+(?:\.\d+)?)\b[\s\S]*(left|have left|how much)/i
  );
  if (spendSaveMatch) {
    const spendAmount = Number(spendSaveMatch[1]);
    const saveAmount = Number(spendSaveMatch[2]);
    const hasRemainingBase = fields.hasAllTransactionsBudget;
    const currentRemaining = Number(summary.remainingBudget) || 0;
    const afterSpend = currentRemaining - spendAmount;

    if (hasRemainingBase) {
      return [
        `If your current remaining budget is ${money(currentRemaining)}${monthNote}, spending ${money(spendAmount)} would leave ${money(afterSpend)} for this month.`,
        `Saving ${money(saveAmount)} next month does not increase this month's remaining budget, but it does improve next month's savings by ${money(saveAmount)}.`,
      ].join("\n\n");
    }

    return [
      `I can calculate this with an assumption: if you currently have $X remaining${monthNote}, then after spending ${money(spendAmount)} you would have X - ${money(spendAmount)} left.`,
      `Saving ${money(saveAmount)} next month helps next month's savings, not this month's remaining budget.`,
      "To give an exact number, set an All Categories Budget so I can read your current remaining amount.",
    ].join("\n\n");
  }

  // Purchase checks use All Transactions remaining by default (summary.primary).
  // Prices typed in chat are in the user's preferred currency; convert to base USD first.
  const itemPricePreferred = extractItemPrice(message);
  let itemPrice = itemPricePreferred;
  if (itemPricePreferred != null) {
    try {
      const code = getRequestCurrency() || currencyService.BASE_CURRENCY;
      itemPrice = currencyService.convertToBase(itemPricePreferred, code);
    } catch (error) {
      itemPrice = itemPricePreferred;
    }
  }
  if (itemPrice != null && isPurchaseQuestion(message)) {
    if (!fields.hasAllTransactionsBudget) {
      const lines = [
        "Overall Budget Not Set.",
        "Create an All Categories Budget on Spending & Budgets to check purchases against your overall monthly spending limit.",
      ];
      if (fields.hasCategoryBudgets) {
        lines.push(
          `You have category budgets totaling ${fields.catBudget}, but that is not the same as an overall monthly budget.`
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
      lines.push(`- Monthly budget: ${money(summary.monthlyBudget)}`);
      lines.push(`- Current spent: ${money(summary.totalSpent)}`);
      lines.push(`- Current remaining: ${money(summary.remainingBudget)}`);
      lines.push("");
      lines.push("After purchase:");
      lines.push(`- Item price: ${money(rec.itemPrice)}`);
      lines.push(`- New total spent: ${money(rec.analysis.newTotalSpent)}`);
      lines.push(`- Remaining after purchase: ${money(rec.analysis.newRemainingBudget)}`);
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

  if (isImprovementAdviceQuestion(message)) {
    return buildImprovementAdviceReply(fields, liveSummary, financeSnapshot, monthNote);
  }

  if (isCategoryReduceQuestion(message)) {
    return buildCategoryReduceReply(liveSummary, monthNote);
  }

  if (isBudgetHealthQuestion(message)) {
    return buildBudgetHealthReply(fields, monthNote);
  }

  if (isBudgetAlertExplanationQuestion(message)) {
    return buildBudgetAlertExplanationReply(liveSummary, monthNote);
  }

  if (isSavingTipsQuestion(message)) {
    return buildSavingAdviceReply(fields, liveSummary, financeSnapshot, monthNote);
  }

  if (isSpendingAdviceQuestion(message)) {
    return buildImprovementAdviceReply(fields, liveSummary, financeSnapshot, monthNote);
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
      return `You do not have any normal category budgets set${monthNote}. Total spending across all transactions is ${fields.allSpent}.`;
    }
    return `You spent ${fields.catSpent} in categories that have budgets${monthNote}.`;
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
      `${highestCategory} is your highest spending category at ${money(highestCategoryAmount)}.`,
      "",
      "Advice:",
      `- Review your ${highestCategory} purchases first.`,
      "- That is usually the best place to cut spending if you want to save more.",
    ].join("\n");
  }

  if (text.includes("spent") || text.includes("spend") || text.includes("spending")) {
    return `You spent ${fields.allSpent} in total this month across all transactions${monthNote}.`;
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
    "I can help with that. Based on your spendWise data, try asking:",
    '- "Is there any improvement I can do?"',
    '- "What category should I reduce?"',
    '- "How much budget do I have left?"',
    '- "Can I buy a $50 item?"',
    "",
    `You spent ${fields.allSpent} across all transactions${monthNote}.`,
  ].join("\n");
}

function getWelcomeMessage() {
  return "Hi, I'm FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.";
}

// Choose how to answer a FinBot question for the logged-in user.
// Checks greetings and clearly off-topic messages first. If a Groq API key exists,
// finance data and recent chat history are passed to Groq. If Groq fails or is
// missing, buildFinBotReply() provides a usable built-in answer instead.
async function getFinBotReply(
  message,
  summary,
  financeSnapshot,
  expenses,
  budgetMonthLabel,
  liveSummary,
  recentMessages
) {
  if (isGreetingMessage(message)) {
    return { text: buildGreetingReply(message), usedGroq: false };
  }

  if (isClearlyOffTopicMessage(message)) {
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
      liveSummary,
      recentMessages
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
