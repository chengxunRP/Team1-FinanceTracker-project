const rec = require('../recommendationHelpers');

function makeSummary(monthlyBudget, totalSpent){
  const remaining = monthlyBudget - totalSpent;
  const pct = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 100;
  return { monthlyBudget, totalSpent, remainingBudget: remaining, percentageUsed: pct };
}

const summary = makeSummary(500, 380);
const expenses = [
  { category: 'Food', amount: 200, isExcludedFromBudget: false },
  { category: 'Transport', amount: 180, isExcludedFromBudget: false },
];
const item = { itemName: 'New Jacket', itemPrice: 80, category: 'Shopping' };

const recommendation = rec.getSpendingRecommendation(summary, expenses, item);
console.log(JSON.stringify(recommendation, null, 2));
