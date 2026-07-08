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
  validateExpenseAmount,
} = require('../expenseValidationHelpers');
const { isExpenseCountedForBudget } = require('../budgetHelpers');
const { requireLogin, getCurrentUserId } = require('../authHelpers');
const { scheduleBudgetAlertCheck } = require('../budgetAlertEmailService');

router.use(requireLogin);

function wantsJsonRequest(req) {
  return (
    req.xhr ||
    (req.get('Accept') || '').includes('application/json') ||
    (req.get('Content-Type') || '').includes('application/json')
  );
}

function respondLoginRequired(req, res) {
  if (wantsJsonRequest(req)) {
    res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.',
      fieldErrors: {},
    });
    return;
  }
  res.redirect('/login');
}

function buildAddExpenseFieldErrors(body, uploadError) {
  const { title, amount, categoryId, date } = body;
  const errors = [];
  const fieldErrors = {};

  if (uploadError) {
    errors.push(uploadError);
    fieldErrors.receipt = uploadError;
    fieldErrors.expenseImage = uploadError;
  }
  if (!title || !String(title).trim()) {
    const msg = 'Expense title is required.';
    errors.push(msg);
    fieldErrors.title = msg;
  }
  const amountCheck = validateExpenseAmount(amount);
  if (!amountCheck.valid) {
    errors.push(amountCheck.error);
    fieldErrors.amount = amountCheck.error;
  }
  if (!categoryId) {
    const msg = 'Category is missing.';
    errors.push(msg);
    fieldErrors.categoryId = msg;
    fieldErrors.category_id = msg;
  }
  const dateCheck = validateExpenseDate(date);
  if (!dateCheck.valid) {
    errors.push(dateCheck.error);
    fieldErrors.date = dateCheck.error;
    fieldErrors.expense_date = dateCheck.error;
  }

  return {
    errors,
    fieldErrors,
    message: errors[0] || 'Unable to save expense. Please check the form and try again.',
  };
}

function mapExpenseSaveError(error) {
  if (!error) {
    return {
      message: 'Unable to save expense due to a server error.',
      fieldErrors: {},
    };
  }
  if (error.code === 'AUTH_REQUIRED') {
    return {
      message: 'Session expired. Please log in again.',
      fieldErrors: {},
      status: 401,
    };
  }
  if (
    error.code === 'ER_WARN_DATA_OUT_OF_RANGE' &&
    /amount/i.test(String(error.sqlMessage || ''))
  ) {
    const msg = 'Amount is too large. Maximum is $99,999,999.99.';
    return { message: msg, fieldErrors: { amount: msg } };
  }
  return {
    message: 'Unable to save expense due to a server error.',
    fieldErrors: {},
  };
}

function respondAddExpenseFailure(req, res, options = {}) {
  const {
    message,
    fieldErrors = {},
    errors = message ? [message] : [],
    status = 400,
    safeReturnTo = null,
    expenseBody = null,
    expenseImagePath = null,
  } = options;

  if (wantsJsonRequest(req)) {
    return res.status(status).json({
      success: false,
      message: message || errors[0] || 'Unable to save expense. Please check the form and try again.',
      fieldErrors,
      errors,
    });
  }

  if (safeReturnTo) {
    const sep = safeReturnTo.includes('?') ? '&' : '?';
    const errorMsg = encodeURIComponent(
      message || errors[0] || 'Unable to save expense. Please check the form and try again.'
    );
    return res.redirect(`${safeReturnTo}${sep}addExpenseError=1&addExpenseErrorMsg=${errorMsg}`);
  }

  return loadPickerCategoryData()
    .catch(() => ({
      categories: [],
      customCategories: [],
      generalCategories: [],
    }))
    .then((pickerData) => {
      res.status(status).render('expenses/form', {
        pageTitle: 'Add Expense',
        activePage: 'expenses',
        expense: expenseBody || {},
        categories: pickerData.categories,
        customCategories: pickerData.customCategories,
        generalCategories: pickerData.generalCategories,
        errors,
        formAction: '/expenses',
        isEdit: false,
        maxDate: getTodayDateString(),
        imagePath: expenseImagePath || '',
      });
    });
}

function respondAddExpenseSuccess(req, res, redirectUrl, budgetAlertReset) {
  const finalUrl = appendBudgetAlertResetQuery(redirectUrl, budgetAlertReset);
  if (wantsJsonRequest(req)) {
    return res.json({ success: true, redirectUrl: finalUrl });
  }
  return redirectWithBudgetAlertReset(res, redirectUrl, budgetAlertReset);
}

function requireSessionUserId(req, res) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    respondLoginRequired(req, res);
    return null;
  }
  return userId;
}

function handleExpenseAuthError(req, res, error) {
  if (error && error.code === 'AUTH_REQUIRED') {
    respondLoginRequired(req, res);
    return true;
  }
  return false;
}

function triggerBudgetAlerts(req, budgetMonth, affectedCategoryId) {
  const userId = getCurrentUserId(req);
  const month = budgetMonth ? String(budgetMonth).slice(0, 7) : null;
  const route = req.originalUrl || req.path || null;

  console.log('[BudgetEmail] mutation trigger', {
    route,
    userId: userId || null,
    affectedMonth: month,
    affectedCategoryId: affectedCategoryId || null,
  });

  scheduleBudgetAlertCheck(userId, month, {
    route,
    affectedCategoryId: affectedCategoryId || null,
  });
}

function buildBudgetAlertReset(req, categoryId, budgetMonth, options = {}) {
  const month = budgetStore.normalizeBudgetMonth(
    budgetMonth || budgetStore.getCurrentBudgetMonth()
  );
  const meta = {
    affectedUserId: req.session.userId,
    affectedMonth: month,
    affectedCategoryId:
      categoryId != null && categoryId !== '' ? String(categoryId) : null,
  };
  if (
    options.previousCategoryId != null &&
    options.previousCategoryId !== '' &&
    String(options.previousCategoryId) !== String(categoryId)
  ) {
    meta.affectedPreviousCategoryId = String(options.previousCategoryId);
  }
  if (
    options.previousMonth &&
    String(options.previousMonth) !== month &&
    meta.affectedCategoryId
  ) {
    meta.affectedPreviousMonth = budgetStore.normalizeBudgetMonth(
      options.previousMonth
    );
  }
  return meta;
}

function appendBudgetAlertResetQuery(url, meta) {
  if (!meta || !meta.affectedUserId || !meta.affectedMonth) return url;
  if (!meta.affectedCategoryId) return url;
  try {
    const target = new URL(url, 'http://localhost');
    target.searchParams.set('resetBudgetAlertDismiss', 'category');
    target.searchParams.set('userId', String(meta.affectedUserId));
    target.searchParams.set('categoryId', String(meta.affectedCategoryId));
    target.searchParams.set('month', String(meta.affectedMonth));
    if (meta.affectedPreviousCategoryId) {
      target.searchParams.set(
        'previousCategoryId',
        String(meta.affectedPreviousCategoryId)
      );
    }
    if (meta.affectedPreviousMonth) {
      target.searchParams.set(
        'previousMonth',
        String(meta.affectedPreviousMonth)
      );
    }
    return target.pathname + target.search + target.hash;
  } catch (error) {
    const sep = url.includes('?') ? '&' : '?';
    let next =
      url +
      sep +
      'resetBudgetAlertDismiss=category' +
      '&userId=' +
      encodeURIComponent(meta.affectedUserId) +
      '&categoryId=' +
      encodeURIComponent(meta.affectedCategoryId) +
      '&month=' +
      encodeURIComponent(meta.affectedMonth);
    if (meta.affectedPreviousCategoryId) {
      next +=
        '&previousCategoryId=' +
        encodeURIComponent(meta.affectedPreviousCategoryId);
    }
    if (meta.affectedPreviousMonth) {
      next +=
        '&previousMonth=' + encodeURIComponent(meta.affectedPreviousMonth);
    }
    return next;
  }
}

function redirectWithBudgetAlertReset(res, url, meta) {
  res.redirect(appendBudgetAlertResetQuery(url, meta));
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

    const live = await financeHelpers.getPurchaseCheckerFinanceSummary(budgetMonth);
    const summary = live.recommendationSummary;
    const expenses = await store.getExpensesInMonth(live.budgetMonth);

    const item = {
      itemName: itemName || 'Item',
      itemPrice,
      category: category || 'Everything else',
    };

    const recommendation = recommendationHelpers.getSpendingRecommendation(
      summary,
      expenses,
      item,
      financeHelpers.buildPurchaseCheckOptions(live)
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
  const userId = requireSessionUserId(req, res);
  if (!userId) return;

  const { title, amount, categoryId, date, notes } = req.body;
  const merchantName = normalizeMerchantName(req.body.merchant_name);
  const safeReturnTo = getSafeExpenseReturnTo(req.body.returnTo);

  console.log('[AddExpenseDebug] received body', {
    userId,
    amount,
    title: title ? String(title).slice(0, 40) : '',
    category_id: categoryId || '',
    expense_date: date || '',
    hasFile: Boolean(req.file),
    returnUrl: safeReturnTo || req.body.returnTo || '',
  });

  const validation = buildAddExpenseFieldErrors(req.body, req.uploadError);
  if (validation.errors.length) {
    console.log('[AddExpenseDebug] save failed', {
      message: validation.message,
      code: 'VALIDATION',
    });
    return respondAddExpenseFailure(req, res, {
      message: validation.message,
      fieldErrors: validation.fieldErrors,
      errors: validation.errors,
      safeReturnTo,
      expenseBody: req.body,
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
      userId,
    });
    triggerBudgetAlerts(req, String(date).slice(0, 7), categoryId);
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      categoryId,
      String(date).slice(0, 7)
    );
    const redirectUrl = safeReturnTo || '/expenses';
    return respondAddExpenseSuccess(req, res, redirectUrl, budgetAlertReset);
  } catch (error) {
    console.error('[AddExpenseDebug] save failed', {
      message: error && error.message,
      code: error && error.code,
    });
    if (handleExpenseAuthError(req, res, error)) return;
    const mapped = mapExpenseSaveError(error);
    return respondAddExpenseFailure(req, res, {
      message: mapped.message,
      fieldErrors: mapped.fieldErrors,
      errors: [mapped.message],
      status: mapped.status || 500,
      safeReturnTo,
      expenseBody: { ...req.body, imagePath: expenseImagePath || '' },
      expenseImagePath,
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
  const userId = requireSessionUserId(req, res);
  if (!userId) return;

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
      userId,
    });
    triggerBudgetAlerts(req, String(date).slice(0, 7), categoryId);
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      categoryId,
      String(date).slice(0, 7),
      {
        previousCategoryId: existing.categoryId,
        previousMonth: existing.date ? String(existing.date).slice(0, 7) : null,
      }
    );
    redirectWithBudgetAlertReset(res, '/expenses', budgetAlertReset);
  } catch (error) {
    console.error('Database error updating expense:', error);
    if (error && error.code === 'AUTH_REQUIRED') {
      respondLoginRequired(req, res);
      return;
    }
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
    triggerBudgetAlerts(req, String(date).slice(0, 7), existing.categoryId);
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      existing.categoryId,
      String(date).slice(0, 7),
      { previousMonth: String(existing.date).slice(0, 7) }
    );
    res.json({
      success: true,
      expense: expenseToJson(expense),
      budgetAlertReset,
    });
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
    const budgetMonth =
      existing && existing.date
        ? String(existing.date).slice(0, 7)
        : budgetStore.getCurrentBudgetMonth();
    triggerBudgetAlerts(req, budgetMonth, existing.categoryId);
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      existing.categoryId,
      budgetMonth
    );
    res.json({
      success: true,
      expense: expenseToJson(expense),
      budgetAlertReset,
    });
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
    const affectedBudgetMonth =
      expense && (expense.expense_date || expense.date)
        ? String(expense.expense_date || expense.date).slice(0, 7)
        : budgetMonth;
    triggerBudgetAlerts(req, affectedBudgetMonth, categoryId);
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      categoryId,
      affectedBudgetMonth,
      { previousCategoryId: existing.categoryId }
    );

    res.json({
      success: true,
      previous: {
        categoryId: existing.categoryId,
        categoryName: existing.category
          ? existing.category.displayName || existing.category.name
          : '',
      },
      expense: expenseToDetailJson(expense, { hasBudgetForMonth }),
      budgetAlertReset,
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

    const affectedBudgetMonth =
      existing && (existing.expense_date || existing.date)
        ? String(existing.expense_date || existing.date).slice(0, 7)
        : null;
    triggerBudgetAlerts(req, affectedBudgetMonth, existing.categoryId);
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      existing.categoryId,
      affectedBudgetMonth
    );
    res.json({
      success: true,
      isExcludedFromBudget: excluded,
      isExcludedFromAllBudget: excluded,
      budgetAlertReset,
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

    triggerBudgetAlerts(
      req,
      existing && existing.date ? String(existing.date).slice(0, 7) : null,
      existing && existing.categoryId
    );
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      existing.categoryId,
      existing.date ? String(existing.date).slice(0, 7) : null
    );
    res.json({
      success: true,
      id: String(req.params.id),
      budgetAlertReset,
    });
  } catch (error) {
    console.error('Database error deleting expense:', error);
    res.status(500).json({ success: false, error: 'Unable to delete transaction.' });
  }
});

router.post('/:id', uploadExpenseImage, handleExpenseUpdate);

// POST /expenses/:id  (_method=DELETE) — Expenses page form delete
router.delete('/:id', async (req, res) => {
  try {
    const existing = await store.getExpenseById(req.params.id);
    await store.deleteExpense(req.params.id);
    triggerBudgetAlerts(
      req,
      existing && existing.date ? String(existing.date).slice(0, 7) : null,
      existing && existing.categoryId
    );
    const budgetAlertReset = buildBudgetAlertReset(
      req,
      existing && existing.categoryId,
      existing && existing.date ? String(existing.date).slice(0, 7) : null
    );
    redirectWithBudgetAlertReset(res, '/expenses', budgetAlertReset);
  } catch (error) {
    console.error('Database error deleting expense:', error);
    res.status(500).redirect('/expenses');
  }
});

module.exports = router;
