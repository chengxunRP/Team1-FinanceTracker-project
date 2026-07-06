const express = require('express');
const router = express.Router();
const store = require('../expenseStore');
const budgetStore = require('../budgetStore');
const financeHelpers = require('../financeHelpers');
const recommendationHelpers = require('../recommendationHelpers');
const uploadExpenseImage = require('../middleware/expenseUpload');
const {
  getTodayDateString,
  validateExpenseDate,
  getSafeExpenseReturnTo,
  normalizeMerchantName,
} = require('../expenseValidationHelpers');
const { isExpenseCountedForBudget } = require('../budgetHelpers');
const { requireLogin } = require('../authHelpers');
const { scheduleBudgetAlertCheck } = require('../budgetAlertEmailService');

router.use(requireLogin);

function triggerBudgetAlerts(req) {
  scheduleBudgetAlertCheck(req.session.userId);
}

function formatSGD(amount) {
  return '$' + Number(amount).toFixed(2);
}

function expenseToJson(expense) {
  return {
    id: expense.id,
    date: expense.date,
    amount: expense.amount,
    merchantName: expense.merchantName || '',
    title: expense.title,
    notes: expense.notes || '',
  };
}

function expenseToDetailJson(expense, extras = {}) {
  const cat = expense.category || {};
  return {
    ...expenseToJson(expense),
    categoryId: expense.categoryId,
    categoryName: cat.displayName || cat.name || '',
    categoryIcon: cat.icon || '',
    categoryIconImage: cat.iconImage || '',
    categoryColor: cat.color || '',
    categoryIsCustom: Boolean(cat.isCustom || Number(cat.is_custom) === 1),
    hasBudgetForMonth: Boolean(extras.hasBudgetForMonth),
  };
}

async function categoryHasBudgetForMonth(categoryId, budgetMonth) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  const budgets = await budgetStore.getCategoryBudgets(month);
  return budgets.some(
    (entry) => String(entry.categoryId) === String(categoryId)
  );
}

function parsePositiveAmount(raw) {
  const cleaned = String(raw ?? '').replace(/[$,\s]/g, '');
  const amount = parseFloat(cleaned);
  if (!cleaned || Number.isNaN(amount) || amount <= 0) {
    return { valid: false, amount: null, error: 'Amount must be a positive number.' };
  }
  return { valid: true, amount, error: null };
}

async function loadPickerCategoryData() {
  const picker = await store.getCategoriesForPicker();
  return {
    categories: picker.all,
    customCategories: picker.customCategories,
    generalCategories: picker.generalCategories,
  };
}

// POST /expenses/purchase-check
// Returns a structured recommendation for a prospective purchase (JSON).
router.post('/purchase-check', async (req, res) => {
  try {
    const itemName = String(req.body.itemName || req.body.name || '').trim();
    const rawPrice = req.body.itemPrice || req.body.price || req.body.amount || '';
    const category = String(req.body.category || req.body.categoryName || '').trim();
    const budgetMonth = String(req.body.budgetMonth || '').slice(0, 7) || budgetStore.getCurrentBudgetMonth();

    const cleaned = String(rawPrice || '').replace(/[$,\s]/g, '');
    const itemPrice = Number(cleaned);
    if (!cleaned || Number.isNaN(itemPrice) || itemPrice < 0) {
      return res.status(400).json({ success: false, error: 'Invalid item price' });
    }

    const live = await financeHelpers.getBudgetSummary(budgetMonth);
    const summary = live.summary;
    const expenses = await store.getExpensesInMonth(live.budgetMonth);

    const item = {
      itemName: itemName || 'Item',
      itemPrice,
      category: category || 'Everything else',
    };

    const recommendation = recommendationHelpers.getSpendingRecommendation(
      summary,
      expenses,
      item
    );

    return res.json({ success: true, recommendation });
  } catch (error) {
    console.error('Purchase check error:', error);
    return res.status(500).json({ success: false, error: 'Unable to compute recommendation' });
  }
});

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
    const [list, categories, pickerData, allTimeFinance, monthFinance] = await Promise.all([
      store.getAllExpenses({ category, sort, search }),
      store.getCategories(),
      loadPickerCategoryData(),
      financeHelpers.getAllTimeFinanceData(),
      financeHelpers.getBudgetSummary(budgetMonth),
    ]);

    const filteredTotal = list.reduce(
      (s, e) => s + (isExpenseCountedForBudget(e) ? Number(e.amount) : 0),
      0
    );
    const total = isFiltered ? filteredTotal : allTimeFinance.totalSpent;

    const byCategory = categories.map((cat) => {
      const fromList = list.filter((e) => e.categoryId === cat.id);
      return {
        ...cat,
        count: isFiltered ? fromList.length : list.filter((e) => e.categoryId === cat.id).length,
        total: isFiltered
          ? fromList.reduce(
              (s, e) => s + (isExpenseCountedForBudget(e) ? Number(e.amount) : 0),
              0
            )
          : Number(allTimeFinance.totalsById[cat.id]) || 0,
      };
    });

    res.render('expenses/index', {
      pageTitle: 'Expenses',
      activePage: 'expenses',
      expenses: list,
      categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
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
      maxDate: getTodayDateString(),
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
      maxDate: getTodayDateString(),
      errors: ['Unable to load expenses right now. Please try again.'],
    });
  }
});

// GET /expenses/new
router.get('/new', async (req, res) => {
  try {
    const pickerData = await loadPickerCategoryData();
    res.render('expenses/form', {
      pageTitle: 'Add Expense',
      activePage: 'expenses',
      expense: null,
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
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
  const merchantName = normalizeMerchantName(req.body.merchant_name);
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim())                          errors.push('Title is required.');
  if (!amount || isNaN(amount) || +amount <= 0)         errors.push('Amount must be a positive number.');
  if (!categoryId)                                      errors.push('Please select a category.');

  const dateCheck = validateExpenseDate(date);
  if (!dateCheck.valid)                                 errors.push(dateCheck.error);

  if (errors.length) {
    const safeReturnTo = getSafeExpenseReturnTo(req.body.returnTo);
    if (safeReturnTo) {
      const sep = safeReturnTo.includes("?") ? "&" : "?";
      return res.redirect(`${safeReturnTo}${sep}addExpenseError=1`);
    }
    const pickerData = await loadPickerCategoryData().catch(() => ({
      categories: [],
      customCategories: [],
      generalCategories: [],
    }));
    return res.render('expenses/form', {
      pageTitle: 'Add Expense', activePage: 'expenses',
      expense: req.body,
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
      errors, formAction: '/expenses', isEdit: false,
      maxDate: getTodayDateString(),
    });
  }

  const expenseImagePath = req.file ? '/uploads/expenses/' + req.file.filename : null;

  try {
    await store.addExpense({
      title: title.trim(),
      merchantName,
      amount: parseFloat(amount),
      categoryId,
      date,
      notes: (notes || '').trim(),
      imagePath: expenseImagePath,
    });
    triggerBudgetAlerts(req);
    const safeReturnTo = getSafeExpenseReturnTo(req.body.returnTo);
    if (safeReturnTo) {
      return res.redirect(safeReturnTo);
    }
    res.redirect('/expenses');
  } catch (error) {
    console.error('Database error creating expense:', error);
    const safeReturnTo = getSafeExpenseReturnTo(req.body.returnTo);
    if (safeReturnTo) {
      const sep = safeReturnTo.includes("?") ? "&" : "?";
      return res.redirect(`${safeReturnTo}${sep}addExpenseError=1`);
    }
    const pickerData = await loadPickerCategoryData().catch(() => ({
      categories: [],
      customCategories: [],
      generalCategories: [],
    }));
    res.status(500).render('expenses/form', {
      pageTitle: 'Add Expense',
      activePage: 'expenses',
      expense: { ...req.body, imagePath: expenseImagePath || '' },
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
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
    const [raw, pickerData] = await Promise.all([
      store.getExpenseById(req.params.id),
      loadPickerCategoryData(),
    ]);

    if (!raw) return res.redirect('/expenses');
    res.render('expenses/form', {
      pageTitle: 'Edit Expense', activePage: 'expenses',
      expense: raw,
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
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
  const merchantName = normalizeMerchantName(req.body.merchant_name);
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim())                  errors.push('Title is required.');
  if (!amount || isNaN(amount) || +amount <= 0) errors.push('Amount must be a positive number.');
  if (!categoryId)                              errors.push('Please select a category.');
  if (!date)                                    errors.push('Date is required.');

  if (errors.length) {
    const pickerData = await loadPickerCategoryData().catch(() => ({
      categories: [],
      customCategories: [],
      generalCategories: [],
    }));
    return res.render('expenses/form', {
      pageTitle: 'Edit Expense', activePage: 'expenses',
      expense: { ...req.body, id: req.params.id, imagePath: existing.imagePath || '' },
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
      errors, formAction: `/expenses/${req.params.id}`, isEdit: true,
    });
  }

  const removeImage =
    req.body.removeImage === '1' ||
    req.body.removeImage === 1 ||
    req.body.removeImage === true;
  const expenseImagePath = req.file
    ? '/uploads/expenses/' + req.file.filename
    : removeImage
      ? null
      : (existing.imagePath || null);

  try {
    await store.updateExpense(req.params.id, {
      title: title.trim(),
      merchantName,
      amount: parseFloat(amount),
      categoryId,
      date,
      notes: (notes || '').trim(),
      imagePath: expenseImagePath,
    });
    triggerBudgetAlerts(req);
    res.redirect('/expenses');
  } catch (error) {
    console.error('Database error updating expense:', error);
    const pickerData = await loadPickerCategoryData().catch(() => ({
      categories: [],
      customCategories: [],
      generalCategories: [],
    }));
    res.status(500).render('expenses/form', {
      pageTitle: 'Edit Expense',
      activePage: 'expenses',
      expense: { ...req.body, id: req.params.id, imagePath: expenseImagePath || '' },
      categories: pickerData.categories,
      customCategories: pickerData.customCategories,
      generalCategories: pickerData.generalCategories,
      errors: ['Unable to update expense right now. Please try again.'],
      formAction: `/expenses/${req.params.id}`,
      isEdit: true,
    });
  }
}

router.put('/:id', uploadExpenseImage, handleExpenseUpdate);

router.post('/:id/update-date', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const date = String(req.body.date || '').trim().slice(0, 10);
    const dateCheck = validateExpenseDate(date);
    if (!dateCheck.valid) {
      return res.status(400).json({ success: false, error: dateCheck.error });
    }

    const saved = await store.updateExpenseDate(req.params.id, date);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const expense = await store.getExpenseById(req.params.id);
    triggerBudgetAlerts(req);
    res.json({ success: true, expense: expenseToJson(expense) });
  } catch (error) {
    console.error('Database error updating expense date:', error);
    res.status(500).json({ success: false, error: 'Unable to save date.' });
  }
});

router.post('/:id/update-amount', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const amountCheck = parsePositiveAmount(req.body.amount);
    if (!amountCheck.valid) {
      return res.status(400).json({ success: false, error: amountCheck.error });
    }

    const saved = await store.updateExpenseAmount(req.params.id, amountCheck.amount);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const expense = await store.getExpenseById(req.params.id);
    triggerBudgetAlerts(req);
    res.json({ success: true, expense: expenseToJson(expense) });
  } catch (error) {
    console.error('Database error updating expense amount:', error);
    res.status(500).json({ success: false, error: 'Unable to save amount.' });
  }
});

router.post('/:id/update-merchant', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const merchantName = normalizeMerchantName(req.body.merchantName ?? req.body.merchant_name);
    const saved = await store.updateExpenseMerchant(req.params.id, merchantName);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const expense = await store.getExpenseById(req.params.id);
    res.json({ success: true, expense: expenseToJson(expense) });
  } catch (error) {
    console.error('Database error updating expense merchant:', error);
    res.status(500).json({ success: false, error: 'Unable to save merchant.' });
  }
});

router.post('/:id/update-title', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required.' });
    }
    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Title must be 255 characters or less.',
      });
    }

    const saved = await store.updateExpenseTitle(req.params.id, title);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const expense = await store.getExpenseById(req.params.id);
    res.json({ success: true, expense: expenseToJson(expense) });
  } catch (error) {
    console.error('Database error updating expense title:', error);
    res.status(500).json({ success: false, error: 'Unable to save title.' });
  }
});

router.post('/:id/update-category', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const categoryId = String(req.body.categoryId || '').trim();
    if (!categoryId || !/^\d+$/.test(categoryId)) {
      return res.status(400).json({ success: false, error: 'Please select a category.' });
    }

    const category = await store.getCategoryById(categoryId);
    if (!category) {
      return res.status(400).json({ success: false, error: 'Category not found.' });
    }

    const budgetMonth = String(req.body.budgetMonth || existing.date || '').slice(0, 7);
    const saved = await store.updateExpenseCategory(req.params.id, categoryId);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const expense = await store.getExpenseById(req.params.id);
    const hasBudgetForMonth = await categoryHasBudgetForMonth(categoryId, budgetMonth);

    res.json({
      success: true,
      previous: {
        categoryId: existing.categoryId,
        categoryName: existing.category
          ? existing.category.displayName || existing.category.name
          : '',
      },
      expense: expenseToDetailJson(expense, { hasBudgetForMonth }),
    });
  } catch (error) {
    console.error('Database error updating expense category:', error);
    res.status(500).json({ success: false, error: 'Unable to save category.' });
  }
});

router.post('/:id/update-excluded-from-budget', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const excluded =
      req.body.excluded === true ||
      req.body.excluded === 1 ||
      req.body.excluded === '1';

    const saved = await store.updateExpenseExcludedFromBudget(req.params.id, excluded);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    triggerBudgetAlerts(req);
    res.json({
      success: true,
      isExcludedFromBudget: excluded,
      isExcludedFromAllBudget: excluded,
    });
  } catch (error) {
    console.error('Database error updating expense exclusion flags:', error);
    if (error && error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        success: false,
        error: 'Database update required. Run db/all_categories_exclusion_update.sql',
      });
    }
    res.status(500).json({ success: false, error: 'Unable to save preference.' });
  }
});

async function handleExpenseNotesUpdate(req, res) {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const notes = String(req.body.notes || '').trim();
    if (notes.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Notes must be 255 characters or less.',
      });
    }

    const saved = await store.updateExpenseNotes(req.params.id, notes);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const expense = await store.getExpenseById(req.params.id);
    res.json({ success: true, notes, expense: expenseToJson(expense) });
  } catch (error) {
    console.error('Database error updating expense notes:', error);
    res.status(500).json({ success: false, error: 'Unable to save notes.' });
  }
}

router.post('/:id/notes', handleExpenseNotesUpdate);
router.post('/:id/update-notes', handleExpenseNotesUpdate);

router.post('/:id/receipt', uploadExpenseImage, async (req, res) => {
  try {
    if (req.uploadError) {
      return res.status(400).json({ success: false, error: req.uploadError });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please choose a PNG or JPG image.',
      });
    }

    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const imagePath = '/uploads/expenses/' + req.file.filename;
    const saved = await store.updateExpenseReceipt(req.params.id, imagePath);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    res.json({ success: true, imagePath });
  } catch (error) {
    console.error('Database error updating expense receipt:', error);
    res.status(500).json({ success: false, error: 'Unable to save receipt.' });
  }
});

router.delete('/:id/receipt', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const saved = await store.updateExpenseReceipt(req.params.id, null);
    if (!saved) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    res.json({ success: true, imagePath: '' });
  } catch (error) {
    console.error('Database error deleting expense receipt:', error);
    res.status(500).json({ success: false, error: 'Unable to delete receipt.' });
  }
});

// POST /expenses/:id/delete — JSON delete for transaction popup (reuses hard delete)
router.post('/:id/delete', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    const deleted = await store.deleteExpense(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    triggerBudgetAlerts(req);
    res.json({ success: true, id: String(req.params.id) });
  } catch (error) {
    console.error('Database error deleting expense:', error);
    res.status(500).json({ success: false, error: 'Unable to delete transaction.' });
  }
});

router.post('/:id', uploadExpenseImage, handleExpenseUpdate);

// POST /expenses/:id  (_method=DELETE) — Expenses page form delete
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
