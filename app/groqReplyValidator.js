// Check Groq replies use the user's sample finance data (Feature 8)

const OFF_TOPIC_USER_KEYWORDS = [
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
];

const OFF_TOPIC_REPLY_PHRASES = [
  "as a language model",
  "as an ai language",
  "cannot help with that",
  "outside my area",
  "don't have access to real-time",
  "weather forecast",
  "i'm not able to browse",
];

const GENERIC_ADVICE_STARTS = [
  "you should always save",
  "it's important to budget",
  "consider tracking your expenses",
  "everyone should save",
];

function normalize(text) {
  return (text || "").trim().toLowerCase();
}

function isOffTopicUserQuestion(message) {
  const text = normalize(message);
  return OFF_TOPIC_USER_KEYWORDS.some((word) => text.includes(word));
}

function classifyUserQuestion(message) {
  const text = normalize(message);

  if (isOffTopicUserQuestion(text)) {
    return "off_topic";
  }

  if (text.includes("can i buy") || text.includes("afford a") || text.includes("afford to buy")) {
    return "purchase";
  }

  if (text.includes("spent") || text.includes("spending this month")) {
    return "spent";
  }

  if (text.includes("budget")) {
    return "budget";
  }

  if (
    text.includes("highest category") ||
    text.includes("most on") ||
    text.includes("most spend") ||
    text.includes("category did i spend") ||
    text.includes("top category")
  ) {
    return "category";
  }

  if (text.includes("reduce spending") || text.includes("save money") || text.includes("cut spending")) {
    return "reduce";
  }

  return "general";
}

function replyHasNumber(reply) {
  return /\d/.test(reply);
}

function replyIncludesAmount(reply, amount) {
  const text = normalize(reply);
  const value = String(amount);

  return text.includes(value) || text.includes(`$${value}`);
}

function replyIncludesCategory(reply, categoryName) {
  if (!categoryName || categoryName === "—") {
    return false;
  }

  return normalize(reply).includes(normalize(categoryName));
}

function replyIncludesBudgetLanguage(reply) {
  const text = normalize(reply);

  return (
    text.includes("budget") ||
    text.includes("spent") ||
    text.includes("remaining") ||
    text.includes(" left") ||
    text.includes("left ")
  );
}

function replyIncludesPurchaseVerdict(reply) {
  const text = normalize(reply);

  return (
    text.includes("safe") ||
    text.includes("risky") ||
    text.includes("not recommended") ||
    text.includes("cannot afford") ||
    text.includes("can't afford")
  );
}

function isOffTopicReply(reply) {
  const text = normalize(reply);

  if (text.length < 8) {
    return true;
  }

  return OFF_TOPIC_REPLY_PHRASES.some((phrase) => text.includes(phrase));
}

function isTooGeneric(reply, intent, financeSnapshot) {
  const text = normalize(reply);

  if (GENERIC_ADVICE_STARTS.some((phrase) => text.startsWith(phrase))) {
    return true;
  }

  if (intent === "off_topic") {
    return true;
  }

  if (!replyHasNumber(reply)) {
    if (intent === "category" || intent === "reduce") {
      return !replyIncludesCategory(reply, financeSnapshot.highestCategory);
    }

    return true;
  }

  return false;
}

function isValidGroqReply(userMessage, reply, summary, financeSnapshot) {
  if (!reply || !reply.trim()) {
    return false;
  }

  if (isOffTopicReply(reply)) {
    return false;
  }

  const intent = classifyUserQuestion(userMessage);
  const topCategory = financeSnapshot.highestCategory;
  const topCategoryAmount = financeSnapshot.highestCategoryAmount;

  if (intent === "off_topic") {
    return false;
  }

  if (isTooGeneric(reply, intent, financeSnapshot)) {
    return false;
  }

  switch (intent) {
    case "spent":
      return replyIncludesAmount(reply, summary.totalSpent);

    case "budget":
      return (
        replyIncludesAmount(reply, summary.monthlyBudget) ||
        replyIncludesAmount(reply, summary.remainingBudget) ||
        replyIncludesAmount(reply, summary.percentageUsed)
      );

    case "category":
      return (
        replyIncludesCategory(reply, topCategory) ||
        replyIncludesAmount(reply, topCategoryAmount)
      );

    case "purchase": {
      const priceMatch = normalize(userMessage).match(/\$?\s*(\d+(?:\.\d+)?)/);
      const itemPrice = priceMatch ? Number(priceMatch[1]) : null;
      const hasVerdict = replyIncludesPurchaseVerdict(reply);
      const usesBudgetData =
        replyIncludesAmount(reply, summary.remainingBudget) ||
        replyIncludesAmount(reply, summary.monthlyBudget) ||
        replyIncludesAmount(reply, summary.totalSpent);

      if (itemPrice != null) {
        return hasVerdict && (replyIncludesAmount(reply, itemPrice) || usesBudgetData);
      }

      return hasVerdict && usesBudgetData;
    }

    case "reduce":
      return (
        (replyIncludesCategory(reply, topCategory) || replyIncludesBudgetLanguage(reply)) &&
        (replyIncludesAmount(reply, topCategoryAmount) ||
          replyIncludesAmount(reply, summary.totalSpent) ||
          replyIncludesAmount(reply, summary.remainingBudget))
      );

    case "general":
    default:
      return (
        replyHasNumber(reply) &&
        (replyIncludesBudgetLanguage(reply) || replyIncludesCategory(reply, topCategory))
      );
  }
}

module.exports = {
  isValidGroqReply,
};
