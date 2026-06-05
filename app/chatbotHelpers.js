// FinBot rule-based replies (Feature 8)

const { hasGroqApiKey } = require("./envConfig");
const { getGroqReply } = require("./groqService");

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

  if (text.includes("spent")) {
    return `You have spent $${summary.totalSpent} this month so far.`;
  }

  if (text.includes("budget")) {
    return `Your monthly budget is $${summary.monthlyBudget}. You currently have $${summary.remainingBudget} remaining (${summary.percentageUsed}% used).`;
  }

  if (
    text.includes("highest category") ||
    text.includes("most on") ||
    text.includes("most spend") ||
    text.includes("category did i spend")
  ) {
    return `Your highest spending category is ${highestCategory} at $${highestCategoryAmount}.`;
  }

  const buyMatch = text.match(/can i buy\s*(?:a\s*)?\$?\s*(\d+(?:\.\d+)?)/i);
  if (buyMatch) {
    const itemPrice = Number(buyMatch[1]);
    const remaining = summary.remainingBudget;
    const afterPurchase = remaining - itemPrice;
    const afterPercent = Math.round(
      ((summary.totalSpent + itemPrice) / summary.monthlyBudget) * 100
    );

    if (itemPrice > remaining || afterPercent >= 100) {
      return `Not recommended. A $${itemPrice} purchase would leave you with $${afterPurchase} and push usage to ${afterPercent}%.`;
    }

    if (afterPercent >= 80 || afterPurchase < summary.monthlyBudget * 0.15) {
      return `Risky. You could buy it, but only $${afterPurchase} would remain and your budget would be ${afterPercent}% used.`;
    }

    return `Safe to buy. After $${itemPrice}, you would still have $${afterPurchase} left (${afterPercent}% used).`;
  }

  if (text.includes("reduce spending") || text.includes("save")) {
    return `Focus on ${highestCategory} first — it is your top category at $${highestCategoryAmount}. Try a weekly spending cap and cut one non-essential purchase there.`;
  }

  return "I can help with spending totals, budget, top categories, purchase checks (e.g. “Can I buy $50?”), and saving tips.";
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
