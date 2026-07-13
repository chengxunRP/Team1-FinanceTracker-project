(function (global) {
  "use strict";

  function buildAmountSearchText(amount) {
    var num = Number(amount);
    if (Number.isNaN(num)) return "";

    var abs = Math.abs(num);
    var fixed2 = abs.toFixed(2);
    var whole = String(Math.round(abs));
    var preferred = window.SwCurrencyFormat
      ? window.SwCurrencyFormat.convertFromBase(abs)
      : abs;
    var preferredText = window.SwCurrencyFormat
      ? window.SwCurrencyFormat.formatMoney(abs)
      : String(preferred);
    var preferredFixed =
      typeof preferred === "number" ? preferred.toFixed(2) : String(preferred);

    return [
      String(num),
      String(abs),
      fixed2,
      whole,
      "-" + fixed2,
      preferredText,
      String(preferred),
      preferredFixed,
      "$" + fixed2,
      "-$" + fixed2,
      "$" + whole,
      "-" + whole,
    ]
      .join(" ")
      .toLowerCase();
  }

  function getTransactionSearchFields(el) {
    return {
      title: el.getAttribute("data-title") || el.getAttribute("data-search-title") || "",
      merchant: el.getAttribute("data-merchant-name") || el.getAttribute("data-search-merchant") || "",
      category: el.getAttribute("data-category") || el.getAttribute("data-search-category") || "",
      notes: el.getAttribute("data-notes") || el.getAttribute("data-search-notes") || "",
      amount: el.getAttribute("data-amount") || el.getAttribute("data-search-amount") || "",
    };
  }

  function categoryMatchesQuery(category, query) {
    if (!query || query.length < 3) return false;

    var categoryWords = category.split(/\s+/);

    return (
      category === query ||
      category.indexOf(query) === 0 ||
      categoryWords.some(function (word) {
        return word.indexOf(query) === 0;
      })
    );
  }

  function amountMatchesQuery(amount, query, normalizedQuery) {
    var amountText = buildAmountSearchText(amount);
    if (!amountText) return false;

    if (amountText.indexOf(query) !== -1) return true;

    var amountNormalized = amountText.replace(/[$,\s]/g, "");
    if (normalizedQuery && amountNormalized.indexOf(normalizedQuery) !== -1) return true;

    return false;
  }

  function transactionMatchesSearch(el, query) {
    if (!query) return true;

    var q = query.trim().toLowerCase();
    if (!q) return true;

    var fields = getTransactionSearchFields(el);
    var title = fields.title.toLowerCase();
    var merchant = fields.merchant.toLowerCase();
    var category = fields.category.toLowerCase();
    var notes = fields.notes.toLowerCase();
    var normalizedQuery = q.replace(/[$,\s]/g, "");

    if (title.indexOf(q) !== -1) return true;
    if (merchant.indexOf(q) !== -1) return true;
    if (notes.indexOf(q) !== -1) return true;
    if (amountMatchesQuery(fields.amount, q, normalizedQuery)) return true;
    if (categoryMatchesQuery(category, q)) return true;

    return false;
  }

  global.SwTransactionSearch = {
    transactionMatchesSearch: transactionMatchesSearch,
    categoryMatchesQuery: categoryMatchesQuery,
    amountMatchesQuery: amountMatchesQuery,
  };
})(window);
