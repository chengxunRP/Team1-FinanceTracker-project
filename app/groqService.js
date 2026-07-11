// Groq API for FinBot — sends system prompt (finance context) + recent chat + user question.
// GROQ_API_KEY is loaded from .env; if missing, chatbotHelpers uses rule-based fallback instead.
require("./envConfig");

const https = require("https");

const { buildFormatRulesForPrompt } = require("./purchaseCheckHelpers");

const GROQ_API_HOST = "api.groq.com";
const GROQ_API_PATH = "/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function buildConversationContext(recentMessages) {
  const list = Array.isArray(recentMessages) ? recentMessages : [];
  if (!list.length) {
    return "Recent chat history:\n- None";
  }

  const recent = list.slice(-20).map((msg) => {
    const role = msg.sender === "user" ? "User" : "FinBot";
    return `- ${role}: ${String(msg.text || "").trim()}`;
  });

  return ["Recent chat history (most recent 20):", ...recent].join("\n");
}

function buildFinanceContext(summary, financeSnapshot, expenses, budgetMonthLabel, liveSummary, userContext) {
  const currency = (userContext && userContext.currency) || "USD";
  const expenseLines = expenses
    .map((e) => `- ${e.description} (${e.category}): ${currency} ${e.amount}`)
    .join("\n");

  const categoryLines = (financeSnapshot.spendingByCategory || [])
    .map((row) => `- ${row.category}: ${currency} ${row.amount}`)
    .join("\n");

  const monthLabel = budgetMonthLabel || "current month";
  const ls = liveSummary || {};
  const savingsGoalSummary =
    (userContext && userContext.savingsGoalSummary) || "No savings goal data available.";
  const stressedLines = (ls.budgetBreakdown || [])
    .filter((row) => {
      const usedPct = Number(row.usedPct) || 0;
      return (
        row.overspent ||
        row.budgetReached ||
        row.statusKey === "reached" ||
        row.statusKey === "overspent" ||
        usedPct >= 80
      );
    })
    .slice(0, 8)
    .map((row) => {
      const state = row.overspent
        ? "exceeded"
        : row.budgetReached || row.statusKey === "reached"
          ? "reached"
          : "warning";
      return `- ${row.displayName || row.name}: ${state} — ${currency} ${row.actual} of ${currency} ${row.availableBudget} (${row.usedPct}% used)`;
    })
    .join("\n");

  return [
    `User finance data for ${monthLabel} (use only this data in your answer):`,
    `- Currency: ${currency}`,
    "",
    "Category Budgets (normal category budgets only — do not mix with all-transaction spending):",
    `- Category budget total: ${currency} ${ls.categoryBudgetTotal != null ? ls.categoryBudgetTotal : 0}`,
    `- Spent in budgeted categories only: ${currency} ${ls.categoryBudgetSpent != null ? ls.categoryBudgetSpent : 0}`,
    `- Remaining in category budgets: ${currency} ${ls.categoryBudgetRemaining != null ? ls.categoryBudgetRemaining : 0}`,
    `- Top budgeted category: ${ls.topBudgetedCategoryName || "—"} (${currency} ${ls.topBudgetedCategorySpent || 0})`,
    "",
    "All Transactions (overall budget and all counted spending):",
    `- All Transactions budget (available): ${currency} ${ls.allTransactionsBudget != null ? ls.allTransactionsBudget : summary.monthlyBudget}`,
    `- Total spent across all transactions: ${currency} ${ls.allTransactionsSpent != null ? ls.allTransactionsSpent : summary.totalSpent}`,
    `- All Transactions remaining: ${currency} ${ls.allTransactionsRemaining != null ? ls.allTransactionsRemaining : summary.remainingBudget}`,
    `- Everything Else (unbudgeted categories): ${currency} ${ls.everythingElseTotal || 0}`,
    `- Highest spending category overall: ${financeSnapshot.highestCategory} (${currency} ${financeSnapshot.highestCategoryAmount})`,
    "",
    "Savings goals:",
    `- ${savingsGoalSummary}`,
    "",
    "Stressed category budgets (warning / reached / exceeded):",
    stressedLines || "- None",
    "",
    "Rules:",
    "- 'How much have I spent this month?' → use All Transactions total spent.",
    "- 'How much did I spend in budget categories?' → use spent in budgeted categories only.",
    "- 'How much budget do I have left?' → mention All Transactions remaining and category budget remaining separately.",
    "- 'Can I buy $X?' → use All Transactions remaining by default.",
    "- Never subtract all-transaction spending from category budget total.",
    "- For improvement/advice questions, name specific stressed categories and amounts from the data above.",
    "- At exactly 100% used, say budget reached — not exceeded. Exceeded only when spent is above budget.",
    "",
    "Spending by category this month:",
    categoryLines || "- No category data",
    "",
    "Expenses this month:",
    expenseLines || "- No expenses",
    "",
    "Note: These totals are for the selected month only, not all-time spending. Don't count transactions are excluded.",
  ].join("\n");
}

// Packs category budgets, All Transactions totals, expenses, and alerts into the Groq system prompt.
function buildSystemPrompt(
  summary,
  financeSnapshot,
  expenses,
  budgetMonthLabel,
  liveSummary,
  recentMessages,
  userContext
) {
  return [
    "You are FinBot, the finance assistant inside spendWise.",
    "You are allowed to answer questions about the logged-in user's finances using the spendWise data provided in the context.",
    "The user has given permission because they are logged in and asking inside their own finance tracker app.",
    "Do not say 'I can't provide information on your personal finances' when the answer can be based on the provided spendWise data.",
    "Give practical, specific, beginner-friendly advice.",
    "Use the user's real budget, spending, category, alert, and savings data when available.",
    "If the user asks a calculation question, calculate it clearly.",
    "If data is missing, say what is missing and still give general guidance.",
    "Use only the finance data below. Do not invent income, savings, or expenses.",
    "When answering about spending, always clarify it is for the current budget month unless asked about all-time totals.",
    "Always use real dollar amounts and category names from the data.",
    "Keep Category Budgets and All Transactions separate — never mix category budget totals with all-transaction spending.",
    "",
    buildConversationContext(recentMessages),
    "",
    buildFormatRulesForPrompt(),
    "",
    buildFinanceContext(summary, financeSnapshot, expenses, budgetMonthLabel, liveSummary, userContext),
  ].join("\n");
}

function postGroqChat(body, apiKey) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: GROQ_API_HOST,
        path: GROQ_API_PATH,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Groq status ${response.statusCode}`));
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const reply = parsed.choices?.[0]?.message?.content?.trim();

            if (!reply) {
              reject(new Error("Groq empty reply"));
              return;
            }

            resolve(reply);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function getGroqReply(
  userMessage,
  summary,
  financeSnapshot,
  expenses,
  budgetMonthLabel,
  liveSummary,
  recentMessages,
  userContext
) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(
          summary,
          financeSnapshot,
          expenses,
          budgetMonthLabel,
          liveSummary,
          recentMessages,
          userContext
        ),
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 350,
    temperature: 0.4,
  });

  return postGroqChat(body, apiKey);
}

module.exports = {
  getGroqReply,
};
