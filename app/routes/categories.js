const express = require('express');
const router = express.Router();
const store = require('../expenseStore');

const AVAILABLE_ICONS = [
  'food', 'transport', 'school', 'shopping',
  'bills', 'entertainment', 'others', 'health', 'travel',
];

const AVAILABLE_COLORS = [
  { label: 'Blue',   value: '#1976d2' },
  { label: 'Teal',   value: '#00897b' },
  { label: 'Green',  value: '#43a047' },
  { label: 'Orange', value: '#fb8c00' },
  { label: 'Red',    value: '#d32f2f' },
  { label: 'Purple', value: '#7c4dff' },
  { label: 'Pink',   value: '#e91e8c' },
  { label: 'Amber',  value: '#e07b39' },
  { label: 'Slate',  value: '#64748b' },
];

function categoriesWithStats() {
  return store.categories.map(cat => ({
    ...cat,
    count: store.expenses.filter(e => e.categoryId === cat.id).length,
    total: store.expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
  }));
}

// GET /categories
router.get('/', (req, res) => {
  res.render('categories/index', {
    pageTitle: 'Categories',
    activePage: 'categories',
    categories: categoriesWithStats(),
    icons: AVAILABLE_ICONS,
    colors: AVAILABLE_COLORS,
    errors: [],
    formValues: {},
  });
});

// POST /categories
router.post('/', (req, res) => {
  const { name, icon, color } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Category name is required.');
  if (store.categories.find(c => c.name.toLowerCase() === (name || '').trim().toLowerCase())) {
    errors.push('A category with that name already exists.');
  }

  if (errors.length) {
    return res.render('categories/index', {
      pageTitle: 'Categories', activePage: 'categories',
      categories: categoriesWithStats(),
      icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
      errors, formValues: { name, icon, color },
    });
  }

  store.categories.push({
    id: 'cat-' + store.newId(),
    name: name.trim(),
    icon: icon || 'others',
    color: color || '#64748b',
  });

  res.redirect('/categories');
});

// GET /categories/:id/edit
router.get('/:id/edit', (req, res) => {
  const cat = store.categories.find(c => c.id === req.params.id);
  if (!cat) return res.redirect('/categories');

  res.render('categories/edit', {
    pageTitle: 'Edit Category', activePage: 'categories',
    category: cat,
    icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
    errors: [],
  });
});

// POST /categories/:id  (_method=PUT)
router.put('/:id', (req, res) => {
  const idx = store.categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.redirect('/categories');

  const { name, icon, color } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Category name is required.');

  if (errors.length) {
    return res.render('categories/edit', {
      pageTitle: 'Edit Category', activePage: 'categories',
      category: { ...req.body, id: req.params.id },
      icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
      errors,
    });
  }

  store.categories[idx] = {
    ...store.categories[idx],
    name: name.trim(),
    icon: icon || 'others',
    color: color || '#64748b',
  };

  res.redirect('/categories');
});

// POST /categories/:id  (_method=DELETE)
router.delete('/:id', (req, res) => {
  const inUse = store.expenses.some(e => e.categoryId === req.params.id);
  if (!inUse) {
    const idx = store.categories.findIndex(c => c.id === req.params.id);
    if (idx !== -1) store.categories.splice(idx, 1);
  }
  res.redirect('/categories');
});

module.exports = router;
