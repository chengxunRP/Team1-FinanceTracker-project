// FinBot rule-based replies (Feature 8)

const { hasGroqApiKey } = require("./envConfig");
const { getGroqReply } = require("./groqService");
const {
  extractItemPrice,
  isPurchaseQuestion,
  buildPurchaseCheckReply,
  buildSpendingAdviceReply,
  buildSavingTipsReply,
  isSpendingAdviceQuestion,
  isSavingTipsQuestion,
} = require("./purchaseCheckHelpers");

const SUGGESTED_QUESTIONS = [
  "How much have I spent this month?",
  "What category did I spend the most on?",
  "Can I buy a $50 item?",
  "How can I reduce my spending?",
];

function buildFinBotReply(message, summary, financeSnapshot) {
  const text = (message || "").trim().toLowerCase();
  const highestCategory = financeSnapshot.highestCategory;
  const highestCategoryAmount = financeSnapshot.highestCategoryAmount;

  const itemPrice = extractItemPrice(message);
  if (itemPrice != null && isPurchaseQuestion(message)) {
    return buildPurchaseCheckReply(summary, itemPrice);
  }

  if (isSavingTipsQuestion(message)) {
    return buildSavingTipsReply(summary, financeSnapshot);
  }

  if (isSpendingAdviceQuestion(message)) {
    return buildSpendingAdviceReply(summary, financeSnapshot);
  }

  if (text.includes("spent")) {
    return [
      "Summary:",
      `- You have spent $${summary.totalSpent} out of $${summary.monthlyBudget}.`,
      `- You have $${summary.remainingBudget} remaining.`,
      `- You have used ${summary.percentageUsed}% of your budget.`,
    ].join("\n");
  }

  if (text.includes("budget")) {
    return [
      "Summary:",
      `- Monthly budget: $${summary.monthlyBudget}`,
      `- Current spent: $${summary.totalSpent}`,
      `- Current remaining: $${summary.remainingBudget}`,
      `- Budget used: ${summary.percentageUsed}%`,
    ].join("\n");
  }

  if (
    text.includes("highest category") ||
    text.includes("most on") ||
    text.includes("most spend") ||
    text.includes("category did i spend")
  ) {
    return [
      "Main insight:",
      `${highestCategory} is your highest spending category at $${highestCategoryAmount}.`,
      "",
      "Advice:",
      `- Review your ${highestCategory} purchases first.`,
      "- This is the best place to cut spending if you want to save more.",
    ].join("\n");
  }

  if (text.includes("reduce spending") || text.includes("save")) {
    return buildSavingTipsReply(summary, financeSnapshot);
  }

  return [
    "I can help with:",
    "- Spending totals and budget",
    "- Highest spending category",
    "- Purchase checks (e.g. Can I buy $50?)",
    "- Spending advice and saving tips",
  ].join("\n");
}

function getWelcomeMessage() {
  return "Hey! I am FinBot, your finance assistant. Ask about spending, your budget, or whether a purchase fits your plan.";
}

async function getFinBotReply(message, summary, financeSnapshot, expenses) {
  const fallbackReply = buildFinBotReply(message, summary, financeSnapshot);

  if (!process.env.GROQ_API_KEY || !hasGroqApiKey()) {
    return { text: fallbackReply, usedGroq: false };
  }

  try {
    const aiReply = await getGroqReply(message, summary, financeSnapshot, expenses);

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
};
