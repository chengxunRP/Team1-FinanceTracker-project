const express = require('express');
const router = express.Router();
const db = require('../config/db');
const financeHelpers = require('../financeHelpers');
const { requireLogin } = require('../authHelpers');
const currencyService = require('../currencyService');

router.use(requireLogin);

const CURRENCIES = currencyService.SUPPORTED_CURRENCIES;
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

function applyPreferredCurrencyLocals(res, preferredCurrency) {
  const formatters = currencyService.createFormatters(preferredCurrency);
  const { setRequestCurrency } = require('../requestUserContext');
  setRequestCurrency(formatters.currencyCode);
  res.locals.preferredCurrency = formatters.currencyCode;
  res.locals.baseCurrency = formatters.baseCurrency;
  res.locals.currencyRateFromBase = formatters.rateFromBase;
  res.locals.formatMoney = formatters.formatMoney;
  res.locals.formatMoneySigned = formatters.formatMoneySigned;
  res.locals.convertFromBase = formatters.convertFromBase;
  res.locals.convertToBase = formatters.convertToBase;
  res.locals.currencyConfig = {
    code: formatters.currencyCode,
    base: formatters.baseCurrency,
    rateFromBase: formatters.rateFromBase,
  };
  return formatters;
}

async function buildSummary(preferredCurrency) {
  const monthFinance = await financeHelpers.getDisplayMonthFinanceSummary();
  const formatters = currencyService.createFormatters(preferredCurrency);

  return {
    budgetMonth: monthFinance.budgetMonth,
    budget: monthFinance.summary.monthlyBudget,
    spent: monthFinance.summary.totalSpent,
    remaining: monthFinance.summary.remainingBudget,
    percentUsed: monthFinance.summary.percentageUsed,
    budgetDisplay: formatters.convertFromBase(monthFinance.summary.monthlyBudget),
    spentDisplay: formatters.convertFromBase(monthFinance.summary.totalSpent),
    remainingDisplay: formatters.convertFromBase(monthFinance.summary.remainingBudget),
  };
}

async function loadProfileUser(userId) {
  const [rows] = await db.query(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [userId]);
  return rows[0] || null;
}

function renderProfilePage(res, { user, preferredCurrency, errors, success }) {
  applyPreferredCurrencyLocals(res, preferredCurrency);
  return buildSummary(preferredCurrency).then((summary) => {
    const formatters = currencyService.createFormatters(preferredCurrency);
    const incomeBase = user.monthly_income != null ? Number(user.monthly_income) : 0;
    summary.income = incomeBase;
    summary.incomeDisplay = formatters.convertFromBase(incomeBase);
    const defaultBudgetBase =
      user.default_budget != null ? Number(user.default_budget) : null;

    res.render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user: {
        ...user,
        default_budget_display:
          defaultBudgetBase != null ? formatters.convertFromBase(defaultBudgetBase) : '',
        monthly_income_display: formatters.convertFromBase(incomeBase),
      },
      currencies: CURRENCIES,
      summary,
      errors: errors || [],
      success: Boolean(success),
    });
  });
}

// GET /profile — show the current user's summary + settings
router.get('/', async (req, res) => {
  try {
    const user = await loadProfileUser(req.session.userId);
    if (!user) {
      return res.redirect('/login');
    }

    const preferredCurrency =
      currencyService.normalizeCurrencyCode(user.currency) || currencyService.BASE_CURRENCY;
    const success =
      req.query.saved === '1' ||
      req.query.saved === 'true' ||
      req.query.success === '1';

    await renderProfilePage(res, {
      user,
      preferredCurrency,
      errors: [],
      success,
    });
  } catch (error) {
    console.error('Database error loading profile:', error);
    res.status(500).send('Unable to load profile right now.');
  }
});

// POST /profile — update settings, then redirect so GET loads the new currency formatters
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

  const preferredCurrency = currencyService.normalizeCurrencyCode(currency);
  if (!preferredCurrency) {
    errors.push('Please choose a supported preferred currency.');
  }

  const parsedMonthlyIncomePreferred = parseOptionalNumber(monthlyIncome);
  const parsedDefaultBudgetPreferred = parseOptionalNumber(defaultBudget);

  try {
    const existing = await loadProfileUser(req.session.userId);
    if (!existing) {
      return res.redirect('/login');
    }

    // Form money fields were displayed in the currency saved before this request.
    // Convert with that currency so changing only the dropdown does not rewrite base amounts.
    const previousCurrency =
      currencyService.normalizeCurrencyCode(existing.currency) || currencyService.BASE_CURRENCY;

    let parsedMonthlyIncome = null;
    let parsedDefaultBudget = null;
    try {
      if (parsedMonthlyIncomePreferred != null) {
        parsedMonthlyIncome = currencyService.convertToBase(
          parsedMonthlyIncomePreferred,
          previousCurrency
        );
      }
      if (parsedDefaultBudgetPreferred != null) {
        parsedDefaultBudget = currencyService.convertToBase(
          parsedDefaultBudgetPreferred,
          previousCurrency
        );
      }
    } catch (error) {
      errors.push('Unable to convert money into the base currency right now.');
    }

    if (errors.length) {
      const draftCurrency = preferredCurrency || previousCurrency;
      const draftUser = {
        ...existing,
        name,
        monthly_income: parsedMonthlyIncome,
        monthly_income_display:
          parsedMonthlyIncomePreferred != null ? parsedMonthlyIncomePreferred : '',
        currency: draftCurrency,
        default_budget: parsedDefaultBudget,
        default_budget_display:
          parsedDefaultBudgetPreferred != null ? parsedDefaultBudgetPreferred : '',
        email_alerts_enabled: emailAlertsEnabled ? 1 : 0,
      };
      return renderProfilePage(res, {
        user: draftUser,
        preferredCurrency: draftCurrency,
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
        preferredCurrency,
        parsedDefaultBudget,
        emailAlertsEnabled ? 1 : 0,
        req.session.userId,
      ]
    );

    req.session.userName = name.trim();

    // Post/Redirect/Get: next GET runs preferredCurrencyMiddleware against the updated row.
    return res.redirect('/profile?saved=1');
  } catch (error) {
    console.error('Database error updating profile:', error);
    res.status(500).render('auth/profile', {
      pageTitle: 'Profile Settings',
      activePage: 'profile',
      user: {
        id: req.session.userId,
        name,
        monthly_income: null,
        monthly_income_display:
          parsedMonthlyIncomePreferred != null ? parsedMonthlyIncomePreferred : '',
        currency: preferredCurrency || 'USD',
        default_budget: null,
        default_budget_display:
          parsedDefaultBudgetPreferred != null ? parsedDefaultBudgetPreferred : '',
        email_alerts_enabled: emailAlertsEnabled ? 1 : 0,
      },
      currencies: CURRENCIES,
      summary: {
        budgetMonth: '',
        income: 0,
        incomeDisplay: 0,
        budget: 0,
        budgetDisplay: 0,
        spent: 0,
        spentDisplay: 0,
        remaining: 0,
        remainingDisplay: 0,
        percentUsed: 0,
      },
      errors: ['Unable to save changes right now. Please try again.'],
      success: false,
    });
  }
});

module.exports = router;
