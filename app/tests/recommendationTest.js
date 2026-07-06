const rec = require('../recommendationHelpers');

function makeSummary(monthlyBudget, totalSpent){
  const remaining = monthlyBudget - totalSpent;
  const pct = monthlyBudget > 0 ? Math.round((totalSpent / monthlyBudget) * 100) : 100;
  return { monthlyBudget, totalSpent, remainingBudget: remaining, percentageUsed: pct };
}

function makeExpense(category, amount){
  return { category, amount, isExcludedFromBudget: false };
}

const tests = [];

// Safe case
tests.push(function(){
  const summary = makeSummary(1000, 200);
  const expenses = [ makeExpense('Food', 200) ];
  const item = { itemName: 'Cheap', itemPrice: 50, category: 'Food' };
  const out = rec.getSpendingRecommendation(summary, expenses, item);
  if(out.result !== 'Safe to buy') throw new Error('Expected Safe to buy, got ' + out.result);
});

// Risky case (pushes to >80%)
tests.push(function(){
  const summary = makeSummary(1000, 750);
  const expenses = [ makeExpense('Food', 750) ];
  const item = { itemName: 'Moderate', itemPrice: 100, category: 'Food' };
  const out = rec.getSpendingRecommendation(summary, expenses, item);
  if(out.result !== 'Risky') throw new Error('Expected Risky, got ' + out.result);
});

// Not recommended (exceeds remaining)
tests.push(function(){
  const summary = makeSummary(1000, 950);
  const expenses = [ makeExpense('Food', 950) ];
  const item = { itemName: 'Expensive', itemPrice: 100, category: 'Food' };
  const out = rec.getSpendingRecommendation(summary, expenses, item);
  if(out.result !== 'Not recommended') throw new Error('Expected Not recommended, got ' + out.result);
});

// Boundary case (exactly 80% should be Risky)
tests.push(function(){
  const summary = makeSummary(1000, 700);
  const expenses = [ makeExpense('Food', 700) ];
  const item = { itemName: 'Boundary', itemPrice: 100, category: 'Food' };
  const out = rec.getSpendingRecommendation(summary, expenses, item);
  if(out.analysis.newPercentageUsed !== 80) {
    throw new Error('Expected 80% after purchase, got ' + out.analysis.newPercentageUsed + '%');
  }
  if(out.result !== 'Risky') throw new Error('Expected Risky at 80%, got ' + out.result);
});

// No budget set (monthly budget = 0) should be Not recommended
tests.push(function(){
  const summary = makeSummary(0, 0);
  const expenses = [];
  const item = { itemName: 'NoBudget', itemPrice: 10, category: 'Food' };
  const out = rec.getSpendingRecommendation(summary, expenses, item);
  if(out.result !== 'Not recommended') throw new Error('Expected Not recommended with no budget, got ' + out.result);
});

// Input validation should reject empty/invalid values
tests.push(function(){
  const input = rec.validateItemInput('', -5, '');
  if(input.valid) throw new Error('Expected invalid input');
  if(!Array.isArray(input.errors) || input.errors.length < 3) {
    throw new Error('Expected multiple validation errors, got ' + JSON.stringify(input.errors));
  }
});

// Category budget can block purchase even when overall budget is fine
tests.push(function(){
  const summary = makeSummary(1000, 200);
  const expenses = [];
  const categoryRows = [{
    displayName: 'Groceries',
    name: 'groceries',
    availableBudget: 100,
    actual: 85,
    remaining: 15,
    budgeted: 100,
  }];
  const item = { itemName: 'Bulk', itemPrice: 50, category: 'Groceries' };
  const out = rec.getSpendingRecommendation(summary, expenses, item, {
    hasOverallBudget: true,
    useAllBudgetCounting: true,
    categoryBudgetRows: categoryRows,
  });
  if (out.result === 'Safe to buy') {
    throw new Error('Expected Risky or Not recommended when category budget is too low');
  }
  if (!out.analysis.categoryWouldOverspend) {
    throw new Error('Expected categoryWouldOverspend flag');
  }
});

// Without All Categories Budget, category total must not become Monthly Budget
tests.push(function(){
  const summary = makeSummary(0, 0);
  const expenses = [];
  const categoryRows = [{
    displayName: 'Education',
    name: 'education',
    availableBudget: 89,
    actual: 10,
    remaining: 79,
    budgeted: 89,
  }];
  const item = { itemName: 'Book', itemPrice: 50, category: 'Education' };
  const out = rec.getSpendingRecommendation(summary, expenses, item, {
    hasOverallBudget: false,
    useAllBudgetCounting: false,
    categoryBudgetRows: categoryRows,
  });
  if (out.budgetMode !== 'category-only') {
    throw new Error('Expected category-only mode, got ' + out.budgetMode);
  }
  if (out.analysis.remainingBudget !== 79) {
    throw new Error('Expected category remaining 79, got ' + out.analysis.remainingBudget);
  }
});

let failed = 0;
for(let i=0;i<tests.length;i++){
  try{
    tests[i]();
    console.log('Test', i+1, 'PASSED');
  }catch(e){
    failed++;
    console.error('Test', i+1, 'FAILED:', e.message);
  }
}
if(failed>0){
  console.error(failed, 'tests failed');
  process.exit(1);
}
console.log('All tests passed');
process.exit(0);
