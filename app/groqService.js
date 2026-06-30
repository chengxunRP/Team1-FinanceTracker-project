// Groq API helper for FinBot (Feature 8)
require("./envConfig");

const https = require("https");

const { buildFormatRulesForPrompt } = require("./purchaseCheckHelpers");

const GROQ_API_HOST = "api.groq.com";
const GROQ_API_PATH = "/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function buildFinanceContext(summary, financeSnapshot, expenses, budgetMonthLabel) {
  const expenseLines = expenses
    .map((e) => `- ${e.description} (${e.category}): $${e.amount}`)
    .join("\n");

  const categoryLines = (financeSnapshot.spendingByCategory || [])
    .map((row) => `- ${row.category}: $${row.amount}`)
    .join("\n");

  const monthLabel = budgetMonthLabel || "current month";

  return [
    `User finance data for ${monthLabel} (use only this data in your answer):`,
    `- Monthly budget: $${summary.monthlyBudget}`,
    `- Total spent this month: $${summary.totalSpent}`,
    `- Remaining budget this month: $${summary.remainingBudget}`,
    `- Budget used: ${summary.percentageUsed}%`,
    `- Highest spending category this month: ${financeSnapshot.highestCategory} ($${financeSnapshot.highestCategoryAmount})`,
    "",
    "Spending by category this month:",
    categoryLines || "- No category data",
    "",
    "Expenses this month:",
    expenseLines || "- No expenses",
    "",
    "Note: These totals are for the selected month only, not all-time spending.",
  ].join("\n");
}

function buildSystemPrompt(summary, financeSnapshot, expenses, budgetMonthLabel) {
  return [
    "You are FinBot, a friendly personal finance assistant.",
    "Use only the finance data below. Do not invent income, savings, or expenses.",
    "When answering about spending, always clarify it is for the current budget month unless asked about all-time totals.",
    "Always use real dollar amounts and category names from the data.",
    "",
    buildFormatRulesForPrompt(),
    "",
    buildFinanceContext(summary, financeSnapshot, expenses, budgetMonthLabel),
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

async function getGroqReply(userMessage, summary, financeSnapshot, expenses, budgetMonthLabel) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(summary, financeSnapshot, expenses, budgetMonthLabel),
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
