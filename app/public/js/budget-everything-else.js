(function () {
  "use strict";

  var monthInput = document.getElementById("everythingElseMonth");
  var monthError = document.getElementById("everythingElseMonthError");

  function getCurrentMonthValue() {
    if (!monthInput) return "";
    return monthInput.getAttribute("data-current-month") || monthInput.value || "";
  }

  var MIN_BUDGET_YEAR = 1900;
  var MAX_BUDGET_YEAR = 2100;
  var MONTH_DEBOUNCE_MS = 500;
  var monthDebounceTimer = null;

  function isValidBudgetMonth(value) {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
    var parts = value.split("-");
    var year = Number(parts[0]);
    var monthNum = Number(parts[1]);
    if (!Number.isFinite(year) || !Number.isFinite(monthNum)) return false;
    if (year < MIN_BUDGET_YEAR || year > MAX_BUDGET_YEAR) return false;
    if (monthNum < 1 || monthNum > 12) return false;
    return true;
  }

  function showMonthError() {
    if (!monthError || !monthInput) return;
    monthError.hidden = false;
    monthInput.setAttribute("aria-invalid", "true");
  }

  function hideMonthError() {
    if (!monthError || !monthInput) return;
    monthError.hidden = true;
    monthInput.removeAttribute("aria-invalid");
  }

  if (monthInput) {
    function clearMonthDebounce() {
      if (monthDebounceTimer) {
        clearTimeout(monthDebounceTimer);
        monthDebounceTimer = null;
      }
    }

    function navigateToMonth(month) {
      if (!isValidBudgetMonth(month)) {
        showMonthError();
        monthInput.value = getCurrentMonthValue();
        return;
      }
      hideMonthError();
      if (month === getCurrentMonthValue()) return;
      var returnMonth = monthInput.getAttribute("data-return-month") || "";
      var url =
        "/budget/everything-else?month=" + encodeURIComponent(month);
      if (returnMonth) {
        url += "&returnMonth=" + encodeURIComponent(returnMonth);
      }
      window.location.href = url;
    }

    function scheduleMonthNavigation() {
      clearMonthDebounce();
      monthDebounceTimer = setTimeout(function () {
        monthDebounceTimer = null;
        var value = monthInput.value;

        if (!isValidBudgetMonth(value)) {
          if (/^\d{4}-\d{2}$/.test(value)) {
            showMonthError();
            monthInput.value = getCurrentMonthValue();
          }
          return;
        }

        navigateToMonth(value);
      }, MONTH_DEBOUNCE_MS);
    }

    monthInput.addEventListener("input", function () {
      if (isValidBudgetMonth(monthInput.value)) {
        hideMonthError();
      }
      scheduleMonthNavigation();
    });

    monthInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        clearMonthDebounce();
        navigateToMonth(monthInput.value);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearMonthDebounce();
        monthInput.value = getCurrentMonthValue();
        hideMonthError();
      }
    });
  }

  var searchInput = document.getElementById("everythingElseSearch");
  var filterEmpty = document.getElementById("everythingElseFilterEmpty");
  var groupsWrap = document.getElementById("everythingElseGroups");
  var matchesSearch =
    window.SwTransactionSearch &&
    window.SwTransactionSearch.transactionMatchesSearch;

  if (!searchInput || !groupsWrap || !matchesSearch) return;

  function formatMoneySigned(value) {
    var num = Math.abs(Number(value) || 0);
    return window.SwCurrencyFormat
      ? window.SwCurrencyFormat.formatMoneySigned(-num)
      : ("-$" + num.toFixed(2));
  }

  function setRowVisible(row, visible) {
    row.hidden = !visible;
    if (visible) {
      row.classList.remove("everything-transaction-row--hidden");
    } else {
      row.classList.add("everything-transaction-row--hidden");
    }
  }

  function setGroupVisible(group, visible) {
    group.hidden = !visible;
    if (visible) {
      group.classList.remove("everything-date-group--hidden");
    } else {
      group.classList.add("everything-date-group--hidden");
    }
  }

  function updateGroupTotal(group, query, visibleAmount) {
    var totalEl = group.querySelector(".everything-date-total");
    if (!totalEl) return;

    if (!query) {
      var original = totalEl.getAttribute("data-original-total");
      totalEl.textContent = formatMoneySigned(original || 0);
      return;
    }

    totalEl.textContent = formatMoneySigned(visibleAmount);
  }

  function applySearch() {
    var query = searchInput.value.trim().toLowerCase();
    var groups = groupsWrap.querySelectorAll(".everything-date-group");
    var visibleCount = 0;

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var items = group.querySelectorAll(".everything-transaction-row");
      var groupVisible = 0;
      var groupFilteredTotal = 0;

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var match = matchesSearch(item, query);
        setRowVisible(item, match);
        if (match) {
          groupVisible += 1;
          groupFilteredTotal += Number(item.getAttribute("data-amount")) || 0;
        }
      }

      setGroupVisible(group, groupVisible > 0 || !query);
      updateGroupTotal(group, query, groupFilteredTotal);
      visibleCount += groupVisible;
    }

    if (filterEmpty) {
      filterEmpty.hidden = visibleCount > 0 || !query;
    }
  }

  searchInput.addEventListener("input", applySearch);
  searchInput.addEventListener("search", applySearch);

  function formatEverythingDateLabel(dateStr) {
    var parts = String(dateStr).slice(0, 10).split("-");
    if (parts.length < 3) return dateStr;
    var date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      12,
      0,
      0
    );
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-SG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function ensureEverythingDateGroup(groupsWrap, dateStr) {
    var existing = groupsWrap.querySelector('[data-date-group="' + dateStr + '"]');
    if (existing) return existing;

    var group = document.createElement("div");
    group.className = "everything-date-group";
    group.setAttribute("data-date-group", dateStr);

    var header = document.createElement("header");
    header.className = "everything-date-header";

    var label = document.createElement("span");
    label.className = "everything-date-label";
    label.textContent = formatEverythingDateLabel(dateStr);

    var total = document.createElement("span");
    total.className = "everything-date-total";
    total.setAttribute("data-original-total", "0");
    total.textContent = formatMoneySigned(0);

    header.appendChild(label);
    header.appendChild(total);
    group.appendChild(header);
    groupsWrap.insertBefore(group, groupsWrap.firstChild);
    return group;
  }

  function recalculateEverythingElseTotals() {
    var groupsWrap = document.getElementById("everythingElseGroups");
    if (!groupsWrap) return;

    var monthTotal = 0;
    var groups = groupsWrap.querySelectorAll(".everything-date-group");

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      if (group.hidden) continue;

      var rows = group.querySelectorAll(
        ".everything-transaction-row:not([hidden]):not(.everything-transaction-row--hidden)"
      );
      var groupTotal = 0;

      for (var r = 0; r < rows.length; r++) {
        groupTotal += Number(rows[r].getAttribute("data-amount")) || 0;
      }

      var totalEl = group.querySelector(".everything-date-total");
      if (totalEl) {
        totalEl.setAttribute("data-original-total", String(groupTotal));
        totalEl.textContent = formatMoneySigned(groupTotal);
      }

      monthTotal += groupTotal;
    }

    var monthTotalEl = document.querySelector(".everything-total");
    if (monthTotalEl) {
      monthTotalEl.textContent = "Total: " + formatMoneySigned(monthTotal);
    }
  }

  document.addEventListener("sw-expense-updated", function (event) {
    var detail = event.detail;
    if (!detail || !detail.expense) return;

    var expense = detail.expense;
    var fieldsChanged = detail.fieldsChanged || [];
    var pageMonth = getCurrentMonthValue();

    if (fieldsChanged.indexOf("isExcludedFromBudget") !== -1) {
      return;
    }

    var trigger = document.querySelector(
      '.js-transaction-detail-trigger[data-expense-id="' + expense.id + '"]'
    );
    if (!trigger) return;

    trigger.setAttribute("data-expense-date", expense.date);
    trigger.setAttribute("data-amount", String(expense.amount));

    if (fieldsChanged.indexOf("date") !== -1) {
      var newMonth = String(expense.date || "").slice(0, 7);
      if (pageMonth && newMonth !== pageMonth) {
        trigger.hidden = true;
        trigger.classList.add("everything-transaction-row--hidden");

        var oldGroup = trigger.closest(".everything-date-group");
        if (oldGroup) {
          var visibleRows = oldGroup.querySelectorAll(
            ".everything-transaction-row:not([hidden]):not(.everything-transaction-row--hidden)"
          );
          if (!visibleRows.length) oldGroup.hidden = true;
        }

        recalculateEverythingElseTotals();
        applySearch();
        return;
      }

      var newDate = String(expense.date).slice(0, 10);
      var groupsWrap = document.getElementById("everythingElseGroups");
      if (groupsWrap && newDate) {
        var targetGroup = ensureEverythingDateGroup(groupsWrap, newDate);
        var previousGroup = trigger.closest(".everything-date-group");
        if (targetGroup && previousGroup && targetGroup !== previousGroup) {
          targetGroup.appendChild(trigger);
          var oldRows = previousGroup.querySelectorAll(
            ".everything-transaction-row:not([hidden]):not(.everything-transaction-row--hidden)"
          );
          if (!oldRows.length) previousGroup.hidden = true;
        }
      }
    }

    if (
      fieldsChanged.indexOf("amount") !== -1 ||
      fieldsChanged.indexOf("date") !== -1
    ) {
      recalculateEverythingElseTotals();
    }

    applySearch();
  });

  document.addEventListener("sw-expense-updated", function (event) {
    var detail = event.detail;
    if (!detail || !detail.expense) return;
    if ((detail.fieldsChanged || []).indexOf("category") === -1) return;

    var expense = detail.expense;
    if (expense.hasBudgetForMonth) {
      recalculateEverythingElseTotals();
      return;
    }

    var trigger = document.querySelector(
      '.js-transaction-detail-trigger[data-expense-id="' + expense.id + '"]'
    );
    if (trigger) {
      var categoryEl = trigger.querySelector(".everything-transaction-category");
      if (categoryEl) categoryEl.textContent = expense.categoryName || "";
    }
    recalculateEverythingElseTotals();
  });
})();
