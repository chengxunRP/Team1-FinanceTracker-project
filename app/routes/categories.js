const express = require('express');
const router = express.Router();
const store = require('../expenseStore');
const db = require('../config/db');
const { requireLogin } = require('../authHelpers');
const { requireUserId } = require('../userScope');
const uploadCategoryIcon = require('../middleware/categoryIconUpload');

router.use(requireLogin);

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

async function categoriesWithStats() {
  const userId = requireUserId();
  const [rows] = await db.query(
    `SELECT
      c.id,
      c.name,
      c.icon,
      c.color,
      COUNT(e.id) AS count,
      COALESCE(SUM(e.amount), 0) AS total
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = ?
    WHERE (c.is_custom = 0 OR (c.is_custom = 1 AND c.user_id = ?))
      AND (c.is_deleted IS NULL OR c.is_deleted = 0)
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY c.name ASC`,
    [userId, userId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    icon: row.icon,
    color: row.color,
    count: Number(row.count),
    total: Number(row.total),
  }));
}

// POST /categories/api — create custom category for budget modal
router.post('/api', uploadCategoryIcon, async (req, res) => {
  try {
    if (req.uploadError) {
      return res.status(400).json({ success: false, errors: [req.uploadError] });
    }
    const iconImagePath = req.file ? '/uploads/category-icons/' + req.file.filename : null;
    const visualType = String(req.body.visualType || 'none').toLowerCase();
    const category = await store.createCategory(req.body.name, {
      visualType: iconImagePath && visualType !== 'color' ? 'image' : visualType,
      color: req.body.color,
      iconImagePath,
    });
    res.json({ success: true, category });
  } catch (error) {
    console.error('Database error creating category via API:', error);
    const message = error.message || 'Unable to save category right now. Please try again.';
    const status = error.code === 'VALIDATION' || error.code === 'DUPLICATE' ? 400 : 500;
    res.status(status).json({ success: false, errors: [message] });
  }
});

// PUT /categories/api/:id — update custom category
router.put('/api/:id', uploadCategoryIcon, async (req, res) => {
  try {
    if (req.uploadError) {
      return res.status(400).json({ success: false, errors: [req.uploadError] });
    }
    const payload = {
      name: req.body.name,
      visualType: req.body.visualType,
      color: req.body.color,
    };
    if (req.file) {
      payload.iconImagePath = '/uploads/category-icons/' + req.file.filename;
    }
    const category = await store.updateCustomCategory(req.params.id, payload);
    res.json({ success: true, category });
  } catch (error) {
    console.error('Database error updating category via API:', error);
    const message = error.message || 'Unable to update category right now. Please try again.';
    const status =
      error.code === 'VALIDATION' ||
      error.code === 'DUPLICATE' ||
      error.code === 'NOT_ALLOWED'
        ? 400
        : error.code === 'NOT_FOUND'
          ? 404
          : 500;
    res.status(status).json({ success: false, errors: [message] });
  }
});

// DELETE /categories/api/:id — JSON delete custom category
router.delete('/api/:id', async (req, res) => {
  try {
    const result = await store.deleteCustomCategory(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Database error deleting category via API:', error);
    const message = error.message || 'Unable to delete category right now. Please try again.';
    const status =
      error.code === 'NOT_ALLOWED'
        ? 400
        : error.code === 'NOT_FOUND'
          ? 404
          : 500;
    res.status(status).json({ success: false, errors: [message] });
  }
});

// GET /categories
router.get('/', async (req, res) => {
  try {
    res.render('categories/index', {
      pageTitle: 'Categories',
      activePage: 'categories',
      categories: await categoriesWithStats(),
      icons: AVAILABLE_ICONS,
      colors: AVAILABLE_COLORS,
      errors: [],
      formValues: {},
    });
  } catch (error) {
    console.error('Database error loading categories:', error);
    res.status(500).render('categories/index', {
      pageTitle: 'Categories',
      activePage: 'categories',
      categories: [],
      icons: AVAILABLE_ICONS,
      colors: AVAILABLE_COLORS,
      errors: ['Unable to load categories right now. Please try again.'],
      formValues: {},
    });
  }
});

// POST /categories
router.post('/', async (req, res) => {
  const { name, icon, color } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Category name is required.');
  try {
    const categories = await store.getCategories();
    if (categories.find(c => c.name.toLowerCase() === (name || '').trim().toLowerCase())) {
      errors.push('A category with that name already exists.');
    }

    if (errors.length) {
      return res.render('categories/index', {
        pageTitle: 'Categories', activePage: 'categories',
        categories: await categoriesWithStats(),
        icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
        errors, formValues: { name, icon, color },
      });
    }

    await db.query(
      'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
      [name.trim(), icon || 'others', color || '#64748b']
    );

    res.redirect('/categories');
  } catch (error) {
    console.error('Database error creating category:', error);
    res.status(500).render('categories/index', {
      pageTitle: 'Categories', activePage: 'categories',
      categories: await categoriesWithStats().catch(() => []),
      icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
      errors: ['Unable to save category right now. Please try again.'],
      formValues: { name, icon, color },
    });
  }
});

// GET /categories/:id/edit
router.get('/:id/edit', async (req, res) => {
  try {
    const categories = await store.getCategories();
    const cat = categories.find(c => c.id === req.params.id);
    if (!cat) return res.redirect('/categories');

    res.render('categories/edit', {
      pageTitle: 'Edit Category', activePage: 'categories',
      category: cat,
      icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
      errors: [],
    });
  } catch (error) {
    console.error('Database error loading category edit page:', error);
    res.status(500).redirect('/categories');
  }
});

// POST /categories/:id  (_method=PUT)
router.put('/:id', async (req, res) => {
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

  try {
    await db.query(
      `UPDATE categories
      SET name = ?, icon = ?, color = ?
      WHERE id = ?`,
      [name.trim(), icon || 'others', color || '#64748b', Number(req.params.id)]
    );
    res.redirect('/categories');
  } catch (error) {
    console.error('Database error updating category:', error);
    res.status(500).render('categories/edit', {
      pageTitle: 'Edit Category', activePage: 'categories',
      category: { ...req.body, id: req.params.id },
      icons: AVAILABLE_ICONS, colors: AVAILABLE_COLORS,
      errors: ['Unable to update category right now. Please try again.'],
    });
  }
});

// POST /categories/:id  (_method=DELETE)
router.delete('/:id', async (req, res) => {
  try {
    const userId = requireUserId();
    const [rows] = await db.query(
      'SELECT COUNT(*) AS count FROM expenses WHERE category_id = ? AND user_id = ?',
      [Number(req.params.id), userId]
    );
    const inUse = Number(rows[0].count) > 0;
    if (!inUse) {
      await db.query('DELETE FROM categories WHERE id = ?', [Number(req.params.id)]);
    }
    res.redirect('/categories');
  } catch (error) {
    console.error('Database error deleting category:', error);
    res.status(500).redirect('/categories');
  }
});

module.exports = router;
