/**
 * Shared preferred-currency helpers for spendWise.
 *
 * Canonical base currency in the database: USD.
 * - Display: convertFromBase(amountUsd, userCurrency) then format.
 * - Input: convertToBase(amountPreferred, userCurrency) before saving.
 * Changing preferred currency only updates users.currency — it does not rewrite
 * expenses, budgets, or savings rows.
 */

const db = require("./config/db");
const { getRequestUserId } = require("./requestUserContext");

const BASE_CURRENCY = "USD";

const SUPPORTED_CURRENCIES = ["USD", "SGD", "MYR", "EUR", "GBP", "JPY", "AUD"];

// Units of each currency per 1 USD (demo rates; replaceable central provider).
// Cached in memory so one page does not trigger many lookups.
const RATES_FROM_USD = {
  USD: 1,
  SGD: 1.35,
  MYR: 4.7,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150,
  AUD: 1.52,
};

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY"]);

const rateCache = {
  loadedAt: Date.now(),
  rates: { ...RATES_FROM_USD },
};

function normalizeCurrencyCode(code) {
  if (!code) return null;
  const value = String(code).trim().toUpperCase();
  return SUPPORTED_CURRENCIES.includes(value) ? value : null;
}

function isSupportedCurrency(code) {
  return Boolean(normalizeCurrencyCode(code));
}

function getCachedRates() {
  return rateCache.rates;
}

/**
 * Replaceable exchange-rate provider.
 * Currently returns the in-memory demo table (relative to USD).
 * A future API client can refresh rateCache.rates here.
 */
function getExchangeRate(fromCurrency, toCurrency) {
  const from = normalizeCurrencyCode(fromCurrency) || BASE_CURRENCY;
  const to = normalizeCurrencyCode(toCurrency) || BASE_CURRENCY;

  if (from === to) return 1;

  const rates = getCachedRates();
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    const err = new Error(
      `Exchange rate unavailable for ${from} → ${to}. Conversion was not applied.`
    );
    err.code = "RATE_UNAVAILABLE";
    throw err;
  }

  // Convert via USD: amount_to = amount_from / rate_from * rate_to
  return toRate / fromRate;
}

function getCurrencyFractionDigits(currencyCode) {
  const code = normalizeCurrencyCode(currencyCode) || BASE_CURRENCY;
  return ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
}

function roundMoney(amount, currencyCode) {
  const digits = getCurrencyFractionDigits(currencyCode);
  const factor = 10 ** digits;
  return Math.round((Number(amount) || 0) * factor) / factor;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
  const from = normalizeCurrencyCode(fromCurrency) || BASE_CURRENCY;
  const to = normalizeCurrencyCode(toCurrency) || BASE_CURRENCY;
  const value = Number(amount) || 0;

  if (from === to) {
    return roundMoney(value, to);
  }

  const rate = getExchangeRate(from, to);
  return roundMoney(value * rate, to);
}

function convertFromBase(amountBase, targetCurrency) {
  return convertCurrency(amountBase, BASE_CURRENCY, targetCurrency);
}

function convertToBase(amountPreferred, sourceCurrency) {
  return convertCurrency(amountPreferred, sourceCurrency, BASE_CURRENCY);
}

function formatCurrency(amount, currencyCode) {
  const code = normalizeCurrencyCode(currencyCode) || BASE_CURRENCY;
  const value = Number(amount) || 0;
  const digits = getCurrencyFractionDigits(code);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch (error) {
    const fixed = value.toFixed(digits);
    return `${code} ${fixed}`;
  }
}

function formatFromBase(amountBase, targetCurrency) {
  const code = normalizeCurrencyCode(targetCurrency) || BASE_CURRENCY;
  const converted = convertFromBase(amountBase, code);
  return formatCurrency(converted, code);
}

function formatFromBaseSigned(amountBase, targetCurrency) {
  const code = normalizeCurrencyCode(targetCurrency) || BASE_CURRENCY;
  const converted = convertFromBase(amountBase, code);
  const absFormatted = formatCurrency(Math.abs(converted), code);
  if (converted < 0) {
    return `-${absFormatted}`;
  }
  return absFormatted;
}

async function getUserCurrency(userId) {
  if (!userId) return BASE_CURRENCY;

  try {
    const [rows] = await db.query(
      "SELECT currency FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (rows.length && rows[0].currency) {
      return normalizeCurrencyCode(rows[0].currency) || BASE_CURRENCY;
    }
  } catch (error) {
    console.error("currencyService.getUserCurrency failed:", error.message || error);
  }

  return BASE_CURRENCY;
}

async function getRequestPreferredCurrency() {
  const userId = getRequestUserId();
  if (!userId) return BASE_CURRENCY;

  const { getRequestCurrency } = require("./requestUserContext");
  const cached = typeof getRequestCurrency === "function" ? getRequestCurrency() : null;
  if (cached && isSupportedCurrency(cached)) {
    return normalizeCurrencyCode(cached);
  }

  return getUserCurrency(userId);
}

function createFormatters(currencyCode) {
  const code = normalizeCurrencyCode(currencyCode) || BASE_CURRENCY;
  let rateFromBase = null;
  try {
    rateFromBase = getExchangeRate(BASE_CURRENCY, code);
  } catch (error) {
    console.error("currencyService rate lookup failed:", error.message || error);
  }

  return {
    currencyCode: code,
    baseCurrency: BASE_CURRENCY,
    rateFromBase,
    formatMoney(amountBase) {
      try {
        return formatFromBase(amountBase, code);
      } catch (error) {
        console.error("currencyService.formatMoney failed:", error.message || error);
        return formatCurrency(Number(amountBase) || 0, BASE_CURRENCY);
      }
    },
    formatMoneySigned(amountBase) {
      try {
        return formatFromBaseSigned(amountBase, code);
      } catch (error) {
        console.error("currencyService.formatMoneySigned failed:", error.message || error);
        return formatFromBaseSigned(amountBase, BASE_CURRENCY);
      }
    },
    convertFromBase(amountBase) {
      try {
        return convertFromBase(amountBase, code);
      } catch (error) {
        console.error("currencyService.convertFromBase failed:", error.message || error);
        return roundMoney(amountBase, BASE_CURRENCY);
      }
    },
    convertToBase(amountPreferred) {
      return convertToBase(amountPreferred, code);
    },
  };
}

module.exports = {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  normalizeCurrencyCode,
  isSupportedCurrency,
  getExchangeRate,
  getCurrencyFractionDigits,
  roundMoney,
  convertCurrency,
  convertFromBase,
  convertToBase,
  formatCurrency,
  formatFromBase,
  formatFromBaseSigned,
  getUserCurrency,
  getRequestPreferredCurrency,
  createFormatters,
};
