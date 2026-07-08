// Shared purchase-check and reply formatting for FinBot (Feature 8)

function extractItemPrice(message) {
  const text = (message || "").trim();

  const patterns = [
    /can i buy\s*(?:a\s*)?\$?\s*(\d+(?:\.\d+)?)/i,
    /buy\s*(?:a\s*)?\$?\s*(\d+(?:\.\d+)?)\s*(?:item|thing)?/i,
    /afford\s*(?:a\s*)?\$?\s*(\d+(?:\.\d+)?)/i,
    /\$(\d+(?:\.\d+)?)\s*item/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function isPurchaseQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    text.includes("can i buy") ||
    text.includes("afford") ||
    text.includes("buy this") ||
    text.includes("buy a") ||
    text.includes("purchase")
  );
}

function calculatePurchaseImpact(summary, itemPrice) {
  const monthlyBudget = Number(summary.monthlyBudget) || 0;
  const totalSpent = Number(summary.totalSpent) || 0;
  const remainingBudget = Number(summary.remainingBudget) || 0;
  const spendingAfter = totalSpent + itemPrice;
  const remainingAfter = monthlyBudget - spendingAfter;
  const percentAfter =
    monthlyBudget > 0 ? Math.round((spendingAfter / monthlyBudget) * 100) : 100;

  let level = "safe";

  if (monthlyBudget <= 0 || percentAfter >= 100 || itemPrice > remainingBudget) {
    level = "not_recommended";
  } else if (percentAfter >= 80) {
    level = "warning";
  }

  return {
    itemPrice,
    totalSpent,
    monthlyBudget,
    remainingBudget,
    spendingAfter,
    remainingAfter,
    percentAfter,
    level,
  };
}

function getPurchaseStatusLabel(level) {
  if (level === "not_recommended") {
    return "Not recommended";
  }

  if (level === "warning") {
    return "Risky";
  }

  return "Safe";
}

function getPurchaseAdviceText(impact) {
  if (impact.level === "not_recommended") {
    if (impact.itemPrice > impact.remainingBudget) {
      return `This item costs more than your remaining $${impact.remainingBudget}. I would not recommend this purchase.`;
    }

    return `This would push you to ${impact.percentAfter}% of your budget, which is overspending. I would not recommend this purchase.`;
  }

  if (impact.level === "warning") {
    return "You can afford this item, but it will push you past the 80% warning level, so this purchase is risky. Spend carefully.";
  }

  return "You can afford this item and stay below the 80% warning level. This purchase looks safe.";
}

function buildPurchaseCheckReply(summary, itemPrice) {
  const impact = calculatePurchaseImpact(summary, itemPrice);
  const status = getPurchaseStatusLabel(impact.level);
  const advice = getPurchaseAdviceText(impact);

  return [
    `Status: ${status}`,
    "",
    "Current situation:",
    `- Monthly budget: $${impact.monthlyBudget}`,
    `- Current spent: $${impact.totalSpent}`,
    `- Current remaining: $${impact.remainingBudget}`,
    "",
    "After purchase:",
    `- Item price: $${impact.itemPrice}`,
    `- New total spent: $${impact.spendingAfter}`,
    `- Remaining after purchase: $${impact.remainingAfter}`,
    `- Budget used after purchase: ${impact.percentAfter}%`,
    "",
    "Advice:",
    advice,
  ].join("\n");
}

function buildSpendingAdviceReply(summary, financeSnapshot) {
  const category = financeSnapshot.highestCategory;
  const categoryAmount = financeSnapshot.highestCategoryAmount;

  return [
    "Summary:",
    `- You have spent $${summary.totalSpent} out of $${summary.monthlyBudget}.`,
    `- You have $${summary.remainingBudget} remaining.`,
    `- You have used ${summary.percentageUsed}% of your budget.`,
    "",
    "Main insight:",
    `${category} is your highest spending category at $${categoryAmount}.`,
    "",
    "Advice:",
    `- Reduce ${category} spending first because it is your highest category.`,
    "- Avoid large purchases that push you above 80%.",
    "- Keep at least some budget for the rest of the month.",
  ].join("\n");
}

function buildSavingTipsReply(summary, financeSnapshot) {
  const category = financeSnapshot.highestCategory;
  const categoryAmount = financeSnapshot.highestCategoryAmount;

  return [
    "Summary:",
    `- You have spent $${summary.totalSpent} out of $${summary.monthlyBudget}.`,
    `- You have $${summary.remainingBudget} remaining.`,
    `- You have used ${summary.percentageUsed}% of your budget.`,
    "",
    "Main insight:",
    `${category} is your highest spending category at $${categoryAmount}.`,
    "",
    "Advice:",
    `- Reduce ${category} spending first — for example, cut one $${categoryAmount > 40 ? 20 : 10} non-essential ${category} purchase this week.`,
    `- Set a weekly cap on ${category} so you keep your remaining $${summary.remainingBudget}.`,
    "- Avoid purchases that push you above the 80% warning level.",
  ].join("\n");
}

function isSpendingAdviceQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    (text.includes("advice") &&
      (text.includes("spending") ||
        text.includes("budget") ||
        text.includes("current") ||
        text.includes("finance"))) ||
    text.includes("how am i doing") ||
    text.includes("spending advice") ||
    text.includes("give me advice") ||
    text.includes("what should i do")
  );
}

function isSavingTipsQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    text.includes("saving tip") ||
    text.includes("save money") ||
    text.includes("save more") ||
    text.includes("how can i save") ||
    text.includes("reduce spending") ||
    text.includes("cut spending") ||
    (text.includes("save") && (text.includes("more") || text.includes("example")))
  );
}

function isImprovementAdviceQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    text.includes("improvement") ||
    text.includes("improve my") ||
    text.includes("improve spending") ||
    text.includes("improve budget") ||
    text.includes("any improvement") ||
    text.includes("what can i improve") ||
    text.includes("how can i improve") ||
    text.includes("better with my budget") ||
    text.includes("do better")
  );
}

function isCategoryReduceQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    (text.includes("category") || text.includes("categories")) &&
    (text.includes("reduce") ||
      text.includes("cut") ||
      text.includes("control") ||
      text.includes("lower")) ||
    text.includes("what should i reduce") ||
    text.includes("which category") ||
    text.includes("where should i cut")
  );
}

function isBudgetHealthQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    text.includes("budget situation") ||
    text.includes("budget health") ||
    text.includes("how is my budget") ||
    text.includes("am i spending too much") ||
    text.includes("summarize my finance") ||
    text.includes("summarize my budget") ||
    text.includes("explain my dashboard") ||
    (text.includes("budget") && text.includes("right now"))
  );
}

function isBudgetAlertExplanationQuestion(message) {
  const text = (message || "").trim().toLowerCase();

  return (
    text.includes("budget alert") ||
    text.includes("explain my alert") ||
    text.includes("why do i have alert") ||
    text.includes("what are my alerts")
  );
}

function buildFormatRulesForPrompt() {
  return [
    "Reply formatting rules:",
    "- Use short sections with plain text labels and bullet points.",
    "- Do not use markdown tables.",
    "- Do not write one long paragraph.",
    "- Keep answers clear, specific, and beginner-friendly.",
    "",
    "For purchase-check questions use this structure:",
    "Status: Safe / Risky / Not recommended",
    "",
    "Current situation:",
    "- Monthly budget: $X",
    "- Current spent: $X",
    "- Current remaining: $X",
    "",
    "After purchase:",
    "- Item price: $X",
    "- New total spent: $X",
    "- Remaining after purchase: $X",
    "- Budget used after purchase: X%",
    "",
    "Advice:",
    "(one or two short sentences)",
    "",
    "Budget alert rules:",
    "- Below 80% after purchase = Safe",
    "- 80% to 99% after purchase = Risky / warning (do not say safe)",
    "- 100% and above, or price > remaining budget = Not recommended",
    "",
    "For spending advice or saving tips use:",
    "Summary:",
    "- You have spent $X out of $Y.",
    "- You have $Z remaining.",
    "- You have used N% of your budget.",
    "",
    "Main insight:",
    "(highest category with amount)",
    "",
    "Advice:",
    "- (2-3 short bullet tips linked to the user's data)",
  ].join("\n");
}

module.exports = {
  extractItemPrice,
  isPurchaseQuestion,
  calculatePurchaseImpact,
  buildPurchaseCheckReply,
  buildSpendingAdviceReply,
  buildSavingTipsReply,
  isSpendingAdviceQuestion,
  isSavingTipsQuestion,
  isImprovementAdviceQuestion,
  isCategoryReduceQuestion,
  isBudgetHealthQuestion,
  isBudgetAlertExplanationQuestion,
  buildFormatRulesForPrompt,
};
