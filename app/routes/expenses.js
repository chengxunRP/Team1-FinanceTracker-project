const express = require('express');
const router = express.Router();
const store = require('../expenseStore');
const budgetStore = require('../budgetStore');
const financeHelpers = require('../financeHelpers');
const uploadExpenseImage = require('../middleware/expenseUpload');
const {
  getTodayDateString,
  validateExpenseDate,
} = require('../expenseValidationHelpers');

function formatSGD(amount) {
  return '$' + Number(amount).toFixed(2);
}

function renderExpenseDbError(res, message) {
  return res.status(500).render('expenses/form', {
    pageTitle: 'Expense Error',
    activePage: 'expenses',
    expense: null,
    categories: [],
    errors: [message],
    formAction: '/expenses',
    isEdit: false,
    maxDate: getTodayDateString(),
  });
}

// GET /expenses
router.get('/', async (req, res) => {
  const { category = '', sort = 'date-desc', search = '' } = req.query;
  const budgetMonth = budgetStore.getCurrentBudgetMonth();
  const budgetMonthLabel = budgetStore.formatBudgetMonthLabel(budgetMonth);
  const isFiltered = !!(category || search);

  try {
    const [list, categories, allTimeFinance, monthFinance] = await Promise.all([
      store.getAllExpenses({ category, sort, search }),
      store.getCategories(),
      financeHelpers.getAllTimeFinanceData(),
      financeHelpers.getBudgetSummary(budgetMonth),
    ]);

    const filteredTotal = list.reduce((s, e) => s + Number(e.amount), 0);
    const total = isFiltered ? filteredTotal : allTimeFinance.totalSpent;

    const byCategory = categories.map((cat) => {
      const fromList = list.filter((e) => e.categoryId === cat.id);
      return {
        ...cat,
        count: isFiltered ? fromList.length : list.filter((e) => e.categoryId === cat.id).length,
        total: isFiltered
          ? fromList.reduce((s, e) => s + Number(e.amount), 0)
          : Number(allTimeFinance.totalsById[cat.id]) || 0,
      };
    });

    res.render('expenses/index', {
      pageTitle: 'Expenses',
      activePage: 'expenses',
      expenses: list,
      categories,
      byCategory,
      total,
      formatSGD,
      activeCategory: category,
      sort,
      search,
      hasAnyExpenses: allTimeFinance.expenseCount > 0,
      isFiltered,
      allTimeFinance,
      monthFinance,
      budgetMonthLabel,
    });
  } catch (error) {
    console.error('Database error loading expenses:', error);
    res.status(500).render('expenses/index', {
      pageTitle: 'Expenses',
      activePage: 'expenses',
      expenses: [],
      categories: [],
      byCategory: [],
      total: 0,
      formatSGD,
      activeCategory: category,
      sort,
      search,
      hasAnyExpenses: false,
      isFiltered,
      allTimeFinance: {
        scope: 'all-time',
        totalSpent: 0,
        expenseCount: 0,
        highestCategory: 'None',
        highestCategoryAmount: 0,
        totalsById: {},
      },
      monthFinance: {
        budgetMonthLabel,
        summary: { totalSpent: 0 },
        monthExpenseCount: 0,
      },
      budgetMonthLabel,
      errors: ['Unable to load expenses right now. Please try again.'],
    });
  }
});

// GET /expenses/new
router.get('/new', async (req, res) => {
  try {
    const categories = await store.getCategories();
    res.render('expenses/form', {
      pageTitle: 'Add Expense',
      activePage: 'expenses',
      expense: null,
      categories,
      errors: [],
      formAction: '/expenses',
      isEdit: false,
      maxDate: getTodayDateString(),
    });
  } catch (error) {
    console.error('Database error loading add expense page:', error);
    renderExpenseDbError(res, 'Unable to load expense form right now. Please try again.');
  }
});

// POST /expenses
router.post('/', uploadExpenseImage, async (req, res) => {
  const { title, amount, categoryId, date, notes } = req.body;
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim())                          errors.push('Title is required.');
  if (!amount || isNaN(amount) || +amount <= 0)         errors.push('Amount must be a positive number.');
  if (!categoryId)                                      errors.push('Please select a category.');

  const dateCheck = validateExpenseDate(date);
  if (!dateCheck.valid)                                 errors.push(dateCheck.error);

  if (errors.length) {
    const categories = await store.getCategories().catch(() => []);
    return res.render('expenses/form', {
      pageTitle: 'Add Expense', activePage: 'expenses',
      expense: req.body, categories,
      errors, formAction: '/expenses', isEdit: false,
      maxDate: getTodayDateString(),
    });
  }

  const expenseImagePath = req.file ? '/uploads/expenses/' + req.file.filename : null;

  try {
    await store.addExpense({
      title: title.trim(),
      amount: parseFloat(amount),
      categoryId,
      date,
      notes: (notes || '').trim(),
      imagePath: expenseImagePath,
    });
    res.redirect('/expenses');
  } catch (error) {
    console.error('Database error creating expense:', error);
    const categories = await store.getCategories().catch(() => []);
    res.status(500).render('expenses/form', {
      pageTitle: 'Add Expense',
      activePage: 'expenses',
      expense: { ...req.body, imagePath: expenseImagePath || '' },
      categories,
      errors: ['Unable to save expense right now. Please try again.'],
      formAction: '/expenses',
      isEdit: false,
      maxDate: getTodayDateString(),
    });
  }
});

// GET /expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const raw = await store.getExpenseById(req.params.id);
    if (!raw) return res.redirect('/expenses');
    res.render('expenses/show', {
      pageTitle: raw.title,
      activePage: 'expenses',
      expense: raw,
      formatSGD,
    });
  } catch (error) {
    console.error('Database error loading expense detail:', error);
    res.status(500).redirect('/expenses');
  }
});

// GET /expenses/:id/edit
router.get('/:id/edit', async (req, res) => {
  try {
    const [raw, categories] = await Promise.all([
      store.getExpenseById(req.params.id),
      store.getCategories(),
    ]);

    if (!raw) return res.redirect('/expenses');
    res.render('expenses/form', {
      pageTitle: 'Edit Expense', activePage: 'expenses',
      expense: raw, categories,
      errors: [], formAction: `/expenses/${raw.id}`, isEdit: true,
    });
  } catch (error) {
    console.error('Database error loading edit expense page:', error);
    res.status(500).redirect('/expenses');
  }
});

// PUT/POST /expenses/:id  (POST used by multipart edit forms; _method=PUT fails before multer parses body)
async function handleExpenseUpdate(req, res) {
  const existing = await store.getExpenseById(req.params.id).catch((error) => {
    console.error('Database error loading expense for update:', error);
    return null;
  });
  if (!existing) return res.redirect('/expenses');

  const { title, amount, categoryId, date, notes } = req.body;
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim())                  errors.push('Title is required.');
  if (!amount || isNaN(amount) || +amount <= 0) errors.push('Amount must be a positive number.');
  if (!categoryId)                              errors.push('Please select a category.');
  if (!date)                                    errors.push('Date is required.');

  if (errors.length) {
    const categories = await store.getCategories().catch(() => []);
    return res.render('expenses/form', {
      pageTitle: 'Edit Expense', activePage: 'expenses',
      expense: { ...req.body, id: req.params.id, imagePath: existing.imagePath || '' }, categories,
      errors, formAction: `/expenses/${req.params.id}`, isEdit: true,
    });
  }

  const expenseImagePath = req.file
    ? '/uploads/expenses/' + req.file.filename
    : (existing.imagePath || null);

  try {
    await store.updateExpense(req.params.id, {
      title: title.trim(),
      amount: parseFloat(amount),
      categoryId,
      date,
      notes: (notes || '').trim(),
      imagePath: expenseImagePath,
    });
    res.redirect('/expenses');
  } catch (error) {
    console.error('Database error updating expense:', error);
    const categories = await store.getCategories().catch(() => []);
    res.status(500).render('expenses/form', {
      pageTitle: 'Edit Expense',
      activePage: 'expenses',
      expense: { ...req.body, id: req.params.id, imagePath: expenseImagePath || '' },
      categories,
      errors: ['Unable to update expense right now. Please try again.'],
      formAction: `/expenses/${req.params.id}`,
      isEdit: true,
    });
  }
}

router.put('/:id', uploadExpenseImage, handleExpenseUpdate);
router.post('/:id', uploadExpenseImage, handleExpenseUpdate);

// POST /expenses/:id  (_method=DELETE)
router.delete('/:id', async (req, res) => {
  try {
    await store.deleteExpense(req.params.id);
    res.redirect('/expenses');
  } catch (error) {
    console.error('Database error deleting expense:', error);
    res.status(500).redirect('/expenses');
  }
});

module.exports = router;
