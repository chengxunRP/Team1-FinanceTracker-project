// Groq API helper for FinBot (Feature 8)
require("./envConfig");

const https = require("https");

const { buildFormatRulesForPrompt } = require("./purchaseCheckHelpers");

const GROQ_API_HOST = "api.groq.com";
const GROQ_API_PATH = "/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function buildFinanceContext(summary, financeSnapshot, expenses, budgetMonthLabel, liveSummary) {
  const expenseLines = expenses
    .map((e) => `- ${e.description} (${e.category}): $${e.amount}`)
    .join("\n");

  const categoryLines = (financeSnapshot.spendingByCategory || [])
    .map((row) => `- ${row.category}: $${row.amount}`)
    .join("\n");

  const monthLabel = budgetMonthLabel || "current month";
  const ls = liveSummary || {};
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
      return `- ${row.displayName || row.name}: ${state} — $${row.actual} of $${row.availableBudget} (${row.usedPct}% used)`;
    })
    .join("\n");

  return [
    `User finance data for ${monthLabel} (use only this data in your answer):`,
    "",
    "Category Budgets (normal category budgets only — do not mix with all-transaction spending):",
    `- Category budget total: $${ls.categoryBudgetTotal != null ? ls.categoryBudgetTotal : 0}`,
    `- Spent in budgeted categories only: $${ls.categoryBudgetSpent != null ? ls.categoryBudgetSpent : 0}`,
    `- Remaining in category budgets: $${ls.categoryBudgetRemaining != null ? ls.categoryBudgetRemaining : 0}`,
    `- Top budgeted category: ${ls.topBudgetedCategoryName || "—"} ($${ls.topBudgetedCategorySpent || 0})`,
    "",
    "All Transactions (overall budget and all counted spending):",
    `- All Transactions budget (available): $${ls.allTransactionsBudget != null ? ls.allTransactionsBudget : summary.monthlyBudget}`,
    `- Total spent across all transactions: $${ls.allTransactionsSpent != null ? ls.allTransactionsSpent : summary.totalSpent}`,
    `- All Transactions remaining: $${ls.allTransactionsRemaining != null ? ls.allTransactionsRemaining : summary.remainingBudget}`,
    `- Everything Else (unbudgeted categories): $${ls.everythingElseTotal || 0}`,
    `- Highest spending category overall: ${financeSnapshot.highestCategory} ($${financeSnapshot.highestCategoryAmount})`,
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

function buildSystemPrompt(summary, financeSnapshot, expenses, budgetMonthLabel, liveSummary) {
  return [
    "You are FinBot, a friendly personal finance assistant.",
    "Use only the finance data below. Do not invent income, savings, or expenses.",
    "When answering about spending, always clarify it is for the current budget month unless asked about all-time totals.",
    "Always use real dollar amounts and category names from the data.",
    "Keep Category Budgets and All Transactions separate — never mix category budget totals with all-transaction spending.",
    "",
    buildFormatRulesForPrompt(),
    "",
    buildFinanceContext(summary, financeSnapshot, expenses, budgetMonthLabel, liveSummary),
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
  liveSummary
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
          liveSummary
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
