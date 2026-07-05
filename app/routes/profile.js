const express = require('express');
const router = express.Router();
const db = require('../config/db');
const financeHelpers = require('../financeHelpers');
const budgetStore = require('../budgetStore');

const CURRENCIES = ['USD', 'SGD', 'MYR', 'EUR', 'GBP', 'JPY', 'AUD'];

async function buildSummary(user) {
  const budgetMonth = budgetStore.getCurrentBudgetMonth();
  const spent = await financeHelpers.getMonthlyExpenseTotal(budgetMonth);
  const budget = user.default_budget != null ? Number(user.default_budget) : 0;
  const remaining = budget - spent;
  const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  return {
    budgetMonth,
    income: user.monthly_income != null ? Number(user.monthly_income) : 0,
    budget,
    spent,
    remaining,
    percentUsed,
  };
}

// GET /profile — show the current user's summary + settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, monthly_income, currency, default_budget FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.redirect('/login');
    }

    const summary = await buildSummary(rows[0]);

    res.render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user: rows[0],
      currencies: CURRENCIES,
      summary,
      errors: [],
      success: false,
    });
  } catch (error) {
    console.error('Database error loading profile:', error);
    res.status(500).send('Unable to load profile right now.');
  }
});

// POST /profile — update settings
router.post('/', async (req, res) => {
  const { name, monthlyIncome, currency, defaultBudget } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Name is required.');
  if (monthlyIncome && isNaN(Number(monthlyIncome))) errors.push('Monthly income must be a number.');
  if (defaultBudget && isNaN(Number(defaultBudget))) errors.push('Default budget must be a number.');

  try {
    if (errors.length) {
      const [rows] = await db.query(
        'SELECT id, name, email, monthly_income, currency, default_budget FROM users WHERE id = ?',
        [req.session.userId]
      );
      const draftUser = { ...rows[0], name, monthly_income: monthlyIncome, currency, default_budget: defaultBudget };
      const summary = await buildSummary(draftUser);
      return res.render('auth/profile', {
        pageTitle: 'Profile Settings',
        activePage: 'profile',
        user: draftUser,
        currencies: CURRENCIES,
        summary,
        errors,
        success: false,
      });
    }

    await db.query(
      `UPDATE users
       SET name = ?, monthly_income = ?, currency = ?, default_budget = ?
       WHERE id = ?`,
      [
        name.trim(),
        monthlyIncome ? Number(monthlyIncome) : null,
        currency || 'USD',
        defaultBudget ? Number(defaultBudget) : null,
        req.session.userId,
      ]
    );

    req.session.userName = name.trim();

    const [rows] = await db.query(
      'SELECT id, name, email, monthly_income, currency, default_budget FROM users WHERE id = ?',
      [req.session.userId]
    );

    const summary = await buildSummary(rows[0]);

    res.render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user: rows[0],
      currencies: CURRENCIES,
      summary,
      errors: [],
      success: true,
    });
  } catch (error) {
    console.error('Database error updating profile:', error);
    res.status(500).render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user: { id: req.session.userId, name, monthly_income: monthlyIncome, currency, default_budget: defaultBudget },
      currencies: CURRENCIES,
      summary: { budgetMonth: '', income: 0, budget: 0, spent: 0, remaining: 0, percentUsed: 0 },
      errors: ['Unable to save changes right now. Please try again.'],
      success: false,
    });
  }
});

module.exports = router;