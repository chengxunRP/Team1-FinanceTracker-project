const express = require('express');
const router = express.Router();
const store = require('../expenseStore');
const uploadExpenseImage = require('../middleware/expenseUpload');

function formatSGD(amount) {
  return '$' + Number(amount).toFixed(2);
}

// GET /expenses
router.get('/', (req, res) => {
  const { category = '', sort = 'date-desc', search = '' } = req.query;

  let list = store.getExpensesWithCategory();

  if (category) list = list.filter(e => e.categoryId === category);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(e =>
      e.title.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    if (sort === 'date-desc')   return new Date(b.date) - new Date(a.date);
    if (sort === 'date-asc')    return new Date(a.date) - new Date(b.date);
    if (sort === 'amount-desc') return b.amount - a.amount;
    if (sort === 'amount-asc')  return a.amount - b.amount;
    return 0;
  });

  const total = store.expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = store.categories.map(cat => ({
    ...cat,
    count: store.expenses.filter(e => e.categoryId === cat.id).length,
    total: store.expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
  }));

  res.render('expenses/index', {
    pageTitle: 'Expenses',
    activePage: 'expenses',
    expenses: list,
    categories: store.categories,
    byCategory,
    total,
    formatSGD,
    activeCategory: category,
    sort,
    search,
  });
});

// GET /expenses/new
router.get('/new', (req, res) => {
  res.render('expenses/form', {
    pageTitle: 'Add Expense',
    activePage: 'expenses',
    expense: null,
    categories: store.categories,
    errors: [],
    formAction: '/expenses',
    isEdit: false,
  });
});

// POST /expenses
router.post('/', uploadExpenseImage, (req, res) => {
  const { title, amount, categoryId, date, notes } = req.body;
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim())                          errors.push('Title is required.');
  if (!amount || isNaN(amount) || +amount <= 0)         errors.push('Amount must be a positive number.');
  if (!categoryId)                                      errors.push('Please select a category.');
  if (!date)                                            errors.push('Date is required.');

  if (errors.length) {
    return res.render('expenses/form', {
      pageTitle: 'Add Expense', activePage: 'expenses',
      expense: req.body, categories: store.categories,
      errors, formAction: '/expenses', isEdit: false,
    });
  }

  const expenseImagePath = req.file ? '/uploads/expenses/' + req.file.filename : '';

  store.expenses.unshift({
    id: store.newId(),
    title: title.trim(),
    amount: parseFloat(amount),
    categoryId,
    date,
    notes: (notes || '').trim(),
    imagePath: expenseImagePath,
  });

  res.redirect('/expenses');
});

// GET /expenses/:id
router.get('/:id', (req, res) => {
  const raw = store.expenses.find(e => e.id === req.params.id);
  if (!raw) return res.redirect('/expenses');
  res.render('expenses/show', {
    pageTitle: raw.title,
    activePage: 'expenses',
    expense: { ...raw, category: store.getCategoryById(raw.categoryId) },
    formatSGD,
  });
});

// GET /expenses/:id/edit
router.get('/:id/edit', (req, res) => {
  const raw = store.expenses.find(e => e.id === req.params.id);
  if (!raw) return res.redirect('/expenses');
  res.render('expenses/form', {
    pageTitle: 'Edit Expense', activePage: 'expenses',
    expense: raw, categories: store.categories,
    errors: [], formAction: `/expenses/${raw.id}`, isEdit: true,
  });
});

// POST /expenses/:id  (_method=PUT)
router.put('/:id', uploadExpenseImage, (req, res) => {
  const idx = store.expenses.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.redirect('/expenses');

  const { title, amount, categoryId, date, notes } = req.body;
  const errors = [];

  if (req.uploadError) errors.push(req.uploadError);
  if (!title || !title.trim())                  errors.push('Title is required.');
  if (!amount || isNaN(amount) || +amount <= 0) errors.push('Amount must be a positive number.');
  if (!categoryId)                              errors.push('Please select a category.');
  if (!date)                                    errors.push('Date is required.');

  if (errors.length) {
    return res.render('expenses/form', {
      pageTitle: 'Edit Expense', activePage: 'expenses',
      expense: { ...req.body, id: req.params.id, imagePath: store.expenses[idx].imagePath }, categories: store.categories,
      errors, formAction: `/expenses/${req.params.id}`, isEdit: true,
    });
  }

  const expenseImagePath = req.file
    ? '/uploads/expenses/' + req.file.filename
    : (store.expenses[idx].imagePath || '');

  store.expenses[idx] = {
    ...store.expenses[idx],
    title: title.trim(),
    amount: parseFloat(amount),
    categoryId,
    date,
    notes: (notes || '').trim(),
    imagePath: expenseImagePath,
  };

  res.redirect('/expenses');
});

// POST /expenses/:id  (_method=DELETE)
router.delete('/:id', (req, res) => {
  const idx = store.expenses.findIndex(e => e.id === req.params.id);
  if (idx !== -1) store.expenses.splice(idx, 1);
  res.redirect('/expenses');
});

module.exports = router;
