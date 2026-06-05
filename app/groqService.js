// Groq API helper for FinBot (Feature 8)
require("./envConfig");

const https = require("https");

const GROQ_API_HOST = "api.groq.com";
const GROQ_API_PATH = "/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function buildFinanceContext(summary, financeSnapshot, expenses) {
  const expenseLines = expenses
    .map((e) => `- ${e.description} (${e.category}): $${e.amount}`)
    .join("\n");

  const categoryLines = (financeSnapshot.spendingByCategory || [])
    .map((row) => `- ${row.category}: $${row.amount}`)
    .join("\n");

  return [
    "User finance data (use only this data in your answer):",
    `- Monthly budget: $${summary.monthlyBudget}`,
    `- Total spent this month: $${summary.totalSpent}`,
    `- Remaining budget: $${summary.remainingBudget}`,
    `- Budget used: ${summary.percentageUsed}%`,
    `- Highest spending category: ${financeSnapshot.highestCategory} ($${financeSnapshot.highestCategoryAmount})`,
    "",
    "Spending by category:",
    categoryLines || "- No category data",
    "",
    "Sample expenses:",
    expenseLines || "- No expenses",
  ].join("\n");
}

function buildSystemPrompt(summary, financeSnapshot, expenses) {
  return [
    "You are FinBot, a friendly personal finance assistant.",
    "Answer in 1-3 short sentences. Be practical and specific.",
    "Base every answer only on the finance data below. Do not invent numbers.",
    "If asked whether they can buy something, compare the price to remaining budget and say Safe, Risky, or Not recommended.",
    "",
    buildFinanceContext(summary, financeSnapshot, expenses),
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

async function getGroqReply(userMessage, summary, financeSnapshot, expenses) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(summary, financeSnapshot, expenses),
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 200,
    temperature: 0.4,
  });

  return postGroqChat(body, apiKey);
}

module.exports = {
  getGroqReply,
};
