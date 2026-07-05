const express = require('express');
const router = express.Router();
const db = require('../config/db');
const financeHelpers = require('../financeHelpers');
const { requireLogin } = require('../authHelpers');

router.use(requireLogin);

const CURRENCIES = ['USD', 'SGD', 'MYR', 'EUR', 'GBP', 'JPY', 'AUD'];
const USER_FIELDS =
  'id, name, email, monthly_income, currency, default_budget, email_alerts_enabled';

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseEmailAlertsEnabled(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'on' ||
    value === 'true'
  );
}

async function buildSummary() {
  const monthSummary = await financeHelpers.getCategoryBudgetTotalsSummary();

  return {
    budgetMonth: monthSummary.budgetMonth,
    budget: monthSummary.budget,
    spent: monthSummary.spent,
    remaining: monthSummary.remaining,
    percentUsed: monthSummary.percentUsed,
  };
}

function buildRenderUser(row, income) {
  return {
    ...row,
    income: income != null ? Number(income) : 0,
  };
}

// GET /profile — show the current user's summary + settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.redirect('/login');
    }

    const user = rows[0];
    const summary = await buildSummary();
    summary.income = user.monthly_income != null ? Number(user.monthly_income) : 0;

    res.render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user,
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
  const emailAlertsEnabled = parseEmailAlertsEnabled(req.body.emailAlertsEnabled);
  const errors = [];

  if (!name || !name.trim()) errors.push('Name is required.');
  if (monthlyIncome !== '' && monthlyIncome != null && isNaN(Number(monthlyIncome))) {
    errors.push('Monthly income must be a number.');
  }
  if (defaultBudget !== '' && defaultBudget != null && isNaN(Number(defaultBudget))) {
    errors.push('Default budget must be a number.');
  }

  const parsedMonthlyIncome = parseOptionalNumber(monthlyIncome);
  const parsedDefaultBudget = parseOptionalNumber(defaultBudget);

  try {
    if (errors.length) {
      const [rows] = await db.query(
        `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
        [req.session.userId]
      );
      const draftUser = {
        ...rows[0],
        name,
        monthly_income: parsedMonthlyIncome,
        currency,
        default_budget: parsedDefaultBudget,
        email_alerts_enabled: emailAlertsEnabled ? 1 : 0,
      };
      const summary = await buildSummary();
      summary.income = parsedMonthlyIncome != null ? Number(parsedMonthlyIncome) : 0;
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
       SET name = ?, monthly_income = ?, currency = ?, default_budget = ?, email_alerts_enabled = ?
       WHERE id = ?`,
      [
        name.trim(),
        parsedMonthlyIncome,
        currency || 'USD',
        parsedDefaultBudget,
        emailAlertsEnabled ? 1 : 0,
        req.session.userId,
      ]
    );

    req.session.userName = name.trim();

    const [rows] = await db.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
      [req.session.userId]
    );

    const user = rows[0];
    const summary = await buildSummary();
    summary.income = user.monthly_income != null ? Number(user.monthly_income) : 0;

    res.render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user,
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
      user: {
        id: req.session.userId,
        name,
        monthly_income: parsedMonthlyIncome,
        currency,
        default_budget: parsedDefaultBudget,
        email_alerts_enabled: emailAlertsEnabled ? 1 : 0,
      },
      currencies: CURRENCIES,
      summary: { budgetMonth: '', income: 0, budget: 0, spent: 0, remaining: 0, percentUsed: 0 },
      errors: ['Unable to save changes right now. Please try again.'],
      success: false,
    });
  }
});

module.exports = router;
