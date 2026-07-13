/**
 * Browser-side money formatting using the preferred currency injected by the server.
 * window.SwCurrency = { code, base, rateFromBase }
 * formatMoney / formatMoneySigned expect amounts already stored in base currency (USD).
 */
(function (global) {
  "use strict";

  var ZERO_DECIMAL = { JPY: true };

  function getConfig() {
    return global.SwCurrency || { code: "USD", base: "USD", rateFromBase: 1 };
  }

  function fractionDigits(code) {
    return ZERO_DECIMAL[code] ? 0 : 2;
  }

  function roundMoney(amount, code) {
    var digits = fractionDigits(code);
    var factor = Math.pow(10, digits);
    return Math.round((Number(amount) || 0) * factor) / factor;
  }

  function convertFromBase(amountBase) {
    var cfg = getConfig();
    var rate = Number(cfg.rateFromBase);
    if (!Number.isFinite(rate) || rate <= 0) {
      rate = cfg.code === cfg.base ? 1 : NaN;
    }
    if (!Number.isFinite(rate)) {
      return roundMoney(amountBase, cfg.base || "USD");
    }
    return roundMoney((Number(amountBase) || 0) * rate, cfg.code || "USD");
  }

  function formatCurrency(amount, code) {
    var digits = fractionDigits(code);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(Number(amount) || 0);
    } catch (error) {
      return code + " " + (Number(amount) || 0).toFixed(digits);
    }
  }

  function formatMoney(amountBase) {
    var cfg = getConfig();
    var code = cfg.code || "USD";
    return formatCurrency(convertFromBase(amountBase), code);
  }

  function formatMoneySigned(amountBase) {
    var cfg = getConfig();
    var code = cfg.code || "USD";
    var converted = convertFromBase(amountBase);
    var formatted = formatCurrency(Math.abs(converted), code);
    return converted < 0 ? "-" + formatted : formatted;
  }

  function convertToBase(amountPreferred) {
    var cfg = getConfig();
    var rate = Number(cfg.rateFromBase);
    if (!Number.isFinite(rate) || rate <= 0) {
      if ((cfg.code || "USD") === (cfg.base || "USD")) return roundMoney(amountPreferred, "USD");
      throw new Error("Exchange rate unavailable");
    }
    return roundMoney((Number(amountPreferred) || 0) / rate, cfg.base || "USD");
  }

  global.SwCurrencyFormat = {
    formatMoney: formatMoney,
    formatMoneySigned: formatMoneySigned,
    convertFromBase: convertFromBase,
    convertToBase: convertToBase,
  };
})(typeof window !== "undefined" ? window : globalThis);
