(function () {
  "use strict";

  var pageData = {};
  var selectedMonth = null;
  var graphDidDrag = false;
  var isOverallBudget = false;

  function loadPageData() {
    var el = document.getElementById("budgetCategoryData");
    if (!el || !el.textContent) return;
    try {
      pageData = JSON.parse(el.textContent);
      isOverallBudget = pageData.budgetType === "overall";
    } catch (e) {
      pageData = {};
      isOverallBudget = false;
    }
  }

  function formatMoney(value) {
    var num = Number(value);
    if (Number.isNaN(num)) return "$0";
    if (num % 1 === 0) return "$" + num.toLocaleString();
    return "$" + num.toFixed(2);
  }

  function formatMoneySigned(value) {
    var num = Number(value);
    if (Number.isNaN(num)) return "-$0.00";
    return "-$" + Math.abs(num).toFixed(2);
  }

  function isTxExcluded(tx) {
    return tx && tx.isExcludedFromBudget === true;
  }

  function computeStats(transactions) {
    var total = 0;
    var largest = 0;
    for (var i = 0; i < transactions.length; i++) {
      var amount = Number(transactions[i].amount) || 0;
      if (!isTxExcluded(transactions[i])) {
        total += amount;
        if (amount > largest) largest = amount;
      }
    }
    return {
      transactionCount: transactions.length,
      totalAmount: total,
      avgTransaction: (function () {
        var counted = 0;
        for (var j = 0; j < transactions.length; j++) {
          if (!isTxExcluded(transactions[j])) counted += 1;
        }
        return counted ? total / counted : 0;
      })(),
      largestTransaction: largest,
    };
  }

  function getTransactionsForScope() {
    var all = pageData.transactions || [];
    if (!selectedMonth) return all;
    return all.filter(function (tx) {
      return tx.budgetMonth === selectedMonth;
    });
  }

  function updateHistoryHeader(stats) {
    var titleEl = document.getElementById("historyTitle");
    var subtitleEl = document.getElementById("historySubtitle");
    if (!titleEl || !subtitleEl) return;

    if (selectedMonth) {
      titleEl.textContent = (pageData.monthLabels && pageData.monthLabels[selectedMonth]) || selectedMonth;
    } else {
      titleEl.textContent = isOverallBudget ? "All transactions" : "History";
    }

    var count = stats.transactionCount;
    subtitleEl.textContent =
      "You've spent " +
      formatMoney(stats.totalAmount) +
      " in " +
      count +
      " transaction" +
      (count === 1 ? "" : "s") +
      ".";
  }

  function updateHistoryMetrics(stats) {
    var countEl = document.getElementById("historyMetricCount");
    var avgEl = document.getElementById("historyMetricAvg");
    var largestEl = document.getElementById("historyMetricLargest");
    var totalEl = document.getElementById("historyMetricTotal");

    if (countEl) countEl.textContent = String(stats.transactionCount);
    if (avgEl) avgEl.textContent = formatMoneySigned(stats.avgTransaction);
    if (largestEl) largestEl.textContent = formatMoneySigned(stats.largestTransaction);
    if (totalEl) totalEl.textContent = formatMoneySigned(stats.totalAmount);
  }

  function updateChartSelection() {
    var cols = document.querySelectorAll(".spb-bar-chart__col--clickable");
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      var month = col.getAttribute("data-budget-month");
      var isSelected = selectedMonth && month === selectedMonth;
      col.classList.toggle("spb-bar-chart__col--selected", !!isSelected);
      col.setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
  }

  function applyTransactionFilters() {
    var list = document.getElementById("transactionList");
    if (!list) return;

    var searchInput = document.getElementById("transactionSearch");
    var q = searchInput ? searchInput.value : "";
    var matchesSearch =
      window.SwTransactionSearch &&
      window.SwTransactionSearch.transactionMatchesSearch;
    var items = list.querySelectorAll(".spb-transaction-item");
    var emptyEl = document.getElementById("transactionEmpty");
    var visible = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var month = item.getAttribute("data-budget-month");
      var monthMatch = !selectedMonth || month === selectedMonth;
      var searchMatch = matchesSearch ? matchesSearch(item, q) : true;
      var show = monthMatch && searchMatch;
      item.hidden = !show;
      if (show) visible += 1;
    }

    if (emptyEl) {
      var emptyCategoryText = isOverallBudget
        ? "No transactions yet."
        : "No transactions for this category.";
      if (items.length === 0) {
        emptyEl.textContent = emptyCategoryText;
        emptyEl.hidden = false;
      } else if (visible === 0) {
        if (q && q.trim()) {
          emptyEl.textContent = "No transactions match your search.";
        } else if (selectedMonth) {
          if (isOverallBudget) {
            emptyEl.textContent = "No transactions for this month.";
          } else {
            emptyEl.textContent =
              "No transactions in " +
              ((pageData.monthLabels && pageData.monthLabels[selectedMonth]) || selectedMonth) +
              ".";
          }
        } else {
          emptyEl.textContent = emptyCategoryText;
        }
        emptyEl.hidden = false;
      } else {
        emptyEl.hidden = true;
      }
    }
  }

  function refreshHistoryView() {
    var stats;
    if (selectedMonth) {
      stats = computeStats(getTransactionsForScope());
    } else if (pageData.transactions && pageData.transactions.length) {
      stats = computeStats(pageData.transactions);
    } else {
      stats = pageData.historyAll || computeStats(pageData.transactions || []);
    }
    updateHistoryHeader(stats);
    updateHistoryMetrics(stats);
    updateChartSelection();
    applyTransactionFilters();
  }

  function formatChartMoney(value) {
    var num = Number(value);
    if (Number.isNaN(num) || num <= 0) return "$0";
    if (num % 1 === 0) return "$" + num.toLocaleString();
    return "$" + num.toFixed(2);
  }

  function getMonthTotalsFromTransactions() {
    var totals = {};
    var txs = pageData.transactions || [];
    for (var i = 0; i < txs.length; i++) {
      var tx = txs[i];
      if (isTxExcluded(tx)) continue;
      var month = tx.budgetMonth;
      if (!month) continue;
      totals[month] = (totals[month] || 0) + (Number(tx.amount) || 0);
    }
    return totals;
  }

  function updateChartBarsFromTransactions() {
    var monthTotals = getMonthTotalsFromTransactions();
    var cols = document.querySelectorAll(".spb-bar-chart__col--clickable");
    if (!cols.length) return;

    var maxAmount = 0;
    for (var monthKey in monthTotals) {
      if (monthTotals[monthKey] > maxAmount) maxAmount = monthTotals[monthKey];
    }

    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];
      var budgetMonth = col.getAttribute("data-budget-month");
      var amount = monthTotals[budgetMonth] || 0;
      var valueEl = col.querySelector(".spb-bar-chart__value");
      var barWrap = col.querySelector(".spb-bar-chart__bar-wrap");
      var activeBar = col.querySelector(".spb-bar-chart__bar--active");
      var zeroBar = col.querySelector(".spb-bar-chart__bar--zero");

      if (valueEl) {
        valueEl.textContent = formatChartMoney(amount);
        valueEl.classList.toggle("spb-bar-chart__value--zero", amount <= 0);
      }

      if (barWrap) {
        if (amount > 0) {
          if (zeroBar) zeroBar.remove();
          var bar = activeBar;
          if (!bar) {
            bar = document.createElement("div");
            bar.className = "spb-bar-chart__bar spb-bar-chart__bar--active";
            barWrap.appendChild(bar);
          }
          var pct = maxAmount > 0 ? Math.max(4, (amount / maxAmount) * 100) : 0;
          bar.style.height = pct + "%";
        } else {
          if (activeBar) activeBar.remove();
          if (!zeroBar) {
            var zero = document.createElement("div");
            zero.className = "spb-bar-chart__bar spb-bar-chart__bar--zero";
            barWrap.appendChild(zero);
          }
        }
      }
    }
  }

  function applyExpenseUpdateToPageData(detail) {
    if (!detail || !detail.expense) return;
    var expense = detail.expense;
    var previous = detail.previous || {};
    var txs = pageData.transactions || [];
    var txIndex = -1;

    for (var i = 0; i < txs.length; i++) {
      if (String(txs[i].id) === String(expense.id)) {
        txIndex = i;
        break;
      }
    }

    if (txIndex === -1) return;

    txs[txIndex].amount = Number(expense.amount) || 0;
    txs[txIndex].budgetMonth = String(expense.date || "").slice(0, 7);

    if (pageData.chartData && previous.date) {
      var oldMonth = String(previous.date).slice(0, 7);
      var newMonth = String(expense.date || "").slice(0, 7);
      var oldAmount = Number(previous.amount) || 0;
      var newAmount = Number(expense.amount) || 0;

      for (var c = 0; c < pageData.chartData.length; c++) {
        var bar = pageData.chartData[c];
        if (bar.budgetMonth === oldMonth) {
          bar.amount = Math.max(0, (Number(bar.amount) || 0) - oldAmount);
        }
        if (bar.budgetMonth === newMonth) {
          bar.amount = (Number(bar.amount) || 0) + newAmount;
        }
      }
    } else if (pageData.chartData) {
      var monthKey = String(expense.date || "").slice(0, 7);
      for (var j = 0; j < pageData.chartData.length; j++) {
        if (pageData.chartData[j].budgetMonth === monthKey) {
          pageData.chartData[j].amount = getMonthTotalsFromTransactions()[monthKey] || 0;
          break;
        }
      }
    }
  }

  document.addEventListener("sw-expense-updated", function (event) {
    var detail = event.detail;
    if (!detail || !detail.expense) return;

    var fieldsChanged = detail.fieldsChanged || [];
    var amountOrDateChanged =
      fieldsChanged.indexOf("amount") !== -1 ||
      fieldsChanged.indexOf("date") !== -1;
    var exclusionChanged =
      fieldsChanged.indexOf("isExcludedFromBudget") !== -1;

    // Amount, date, and Don't count affect budget summary cards — reload so
    // spent/remaining/charts stay consistent with server-side totals.
    if (amountOrDateChanged || exclusionChanged) {
      window.location.reload();
      return;
    }

    if (fieldsChanged.indexOf("category") !== -1) {
      var expense = detail.expense;
      var txId = String(expense.id);
      var isOverall = pageData.budgetType === "overall";

      if (!isOverall && String(pageData.categoryId) !== String(expense.categoryId)) {
        window.location.reload();
        return;
      }

      if (isOverall) {
        var trigger = document.querySelector(
          '.js-transaction-detail-trigger[data-expense-id="' + txId + '"]'
        );
        if (trigger) {
          var tagEl = trigger.querySelector(".spb-transaction-item__tag");
          if (tagEl) tagEl.textContent = expense.categoryName || "CASH";
        }
      }
    }
  });

  function toggleGraphMonth(budgetMonth) {
    if (!budgetMonth) return;
    if (selectedMonth === budgetMonth) {
      selectedMonth = null;
    } else {
      selectedMonth = budgetMonth;
    }
    refreshHistoryView();
  }

  function bindGraphMonthClicks() {
    var cols = document.querySelectorAll(".spb-bar-chart__col--clickable");
    for (var i = 0; i < cols.length; i++) {
      (function (col) {
        col.addEventListener("click", function () {
          if (graphDidDrag) return;
          toggleGraphMonth(col.getAttribute("data-budget-month"));
        });
        col.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleGraphMonth(col.getAttribute("data-budget-month"));
          }
        });
      })(cols[i]);
    }
  }

  function getMonthSlotMetrics() {
    var section = document.querySelector(".spb-page--detail .spb-chart-section");
    var styles = section ? window.getComputedStyle(section) : null;
    var slotWidth = styles
      ? parseFloat(styles.getPropertyValue("--spb-chart-month-width")) || 72
      : 72;
    var gap = styles
      ? parseFloat(styles.getPropertyValue("--spb-chart-month-gap")) || 14
      : 14;
    return { slotWidth: slotWidth, gap: gap };
  }

  function getGraphAvailableWidth(scroll) {
    var section = document.querySelector(".spb-page--detail .spb-chart-section");
    if (section && section.clientWidth > 0) {
      var styles = window.getComputedStyle(section);
      var paddingLeft = parseFloat(styles.paddingLeft) || 0;
      var paddingRight = parseFloat(styles.paddingRight) || 0;
      return Math.max(0, section.clientWidth - paddingLeft - paddingRight);
    }
    return scroll ? scroll.clientWidth : 0;
  }

  function updateChartLayout() {
    var scroll = document.getElementById("categoryGraphScroll");
    var inner = scroll ? scroll.querySelector(".spb-bar-chart-scroll__inner") : null;
    var chart = inner ? inner.querySelector(".spb-bar-chart") : null;
    var years = inner ? inner.querySelector(".spb-bar-chart__years") : null;
    if (!scroll || !inner || !chart) return;

    var monthCount = chart.querySelectorAll(".spb-bar-chart__col").length;
    if (!monthCount) return;

    var metrics = getMonthSlotMetrics();
    var slotWidth = metrics.slotWidth;
    var gap = metrics.gap;
    var availableWidth = getGraphAvailableWidth(scroll);

    if (availableWidth <= 0) {
      return;
    }

    var requiredWidth = monthCount * slotWidth;
    var contentWidth =
      monthCount * slotWidth + Math.max(0, monthCount - 1) * gap;
    var shouldScroll = requiredWidth > availableWidth;
    var yearGroups = years ? years.querySelectorAll(".spb-bar-chart__year-group") : [];

    scroll.classList.toggle("is-scrollable", shouldScroll);
    inner.classList.toggle("is-scrollable", shouldScroll);
    chart.classList.toggle("is-scrollable", shouldScroll);
    if (years) years.classList.toggle("is-scrollable", shouldScroll);

    chart.style.width = "";
    chart.style.maxWidth = "";
    inner.style.width = "";
    inner.style.minWidth = "";
    inner.style.maxWidth = "";

    if (shouldScroll) {
      inner.style.width = contentWidth + "px";
      inner.style.minWidth = contentWidth + "px";
      chart.style.width = contentWidth + "px";

      if (years) {
        years.style.width = contentWidth + "px";
        for (var i = 0; i < yearGroups.length; i++) {
          var span = Number(yearGroups[i].getAttribute("data-year-span")) || 1;
          var groupWidth = span * slotWidth + Math.max(0, span - 1) * gap;
          yearGroups[i].style.flex = "0 0 " + groupWidth + "px";
          yearGroups[i].style.width = groupWidth + "px";
          yearGroups[i].style.minWidth = groupWidth + "px";
        }
      }

      window.requestAnimationFrame(scrollChartToEnd);
    } else {
      inner.style.width = "100%";
      inner.style.maxWidth = "100%";
      chart.style.width = "100%";
      chart.style.maxWidth = "100%";

      if (years) {
        years.style.width = "100%";
        for (var j = 0; j < yearGroups.length; j++) {
          var spanWeight = yearGroups[j].getAttribute("data-year-span") || "1";
          yearGroups[j].style.flex = spanWeight;
          yearGroups[j].style.width = "";
          yearGroups[j].style.minWidth = "";
        }
      }

      scroll.scrollLeft = 0;
    }
  }

  function scrollChartToEnd() {
    var scroll = document.getElementById("categoryGraphScroll");
    if (!scroll) return;
    scroll.scrollLeft = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
  }

  function bindGraphDragScroll() {
    var graphScroll = document.getElementById("categoryGraphScroll");
    if (!graphScroll) return;

    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;
    var moved = false;

    function endDrag() {
      isDown = false;
      graphScroll.classList.remove("dragging");
      if (moved) {
        graphDidDrag = true;
        window.setTimeout(function () {
          graphDidDrag = false;
        }, 0);
      }
      moved = false;
    }

    graphScroll.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      if (!graphScroll.classList.contains("is-scrollable")) return;
      isDown = true;
      moved = false;
      graphScroll.classList.add("dragging");
      startX = e.pageX - graphScroll.offsetLeft;
      scrollLeft = graphScroll.scrollLeft;
    });

    graphScroll.addEventListener("mouseleave", endDrag);
    graphScroll.addEventListener("mouseup", endDrag);

    graphScroll.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - graphScroll.offsetLeft;
      var walk = (x - startX) * 1.2;
      if (Math.abs(walk) > 3) moved = true;
      graphScroll.scrollLeft = scrollLeft - walk;
    });

    graphScroll.addEventListener(
      "wheel",
      function (e) {
        if (!graphScroll.classList.contains("is-scrollable")) return;
        if (graphScroll.scrollWidth <= graphScroll.clientWidth) return;
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        graphScroll.scrollLeft += e.deltaY;
        e.preventDefault();
      },
      { passive: false }
    );

    var touchStartX = 0;
    var touchScrollLeft = 0;

    graphScroll.addEventListener(
      "touchstart",
      function (e) {
        if (!graphScroll.classList.contains("is-scrollable")) return;
        if (!e.touches.length) return;
        touchStartX = e.touches[0].pageX;
        touchScrollLeft = graphScroll.scrollLeft;
        moved = false;
      },
      { passive: true }
    );

    graphScroll.addEventListener(
      "touchmove",
      function (e) {
        if (!graphScroll.classList.contains("is-scrollable")) return;
        if (!e.touches.length) return;
        var walk = touchStartX - e.touches[0].pageX;
        if (Math.abs(walk) > 3) moved = true;
        graphScroll.scrollLeft = touchScrollLeft + walk;
      },
      { passive: true }
    );

    graphScroll.addEventListener("touchend", function () {
      if (moved) {
        graphDidDrag = true;
        window.setTimeout(function () {
          graphDidDrag = false;
        }, 0);
      }
      moved = false;
    });
  }

  function initCategoryGraph() {
    var section = document.querySelector(".spb-page--detail .spb-chart-section");

    function runLayout() {
      updateChartLayout();
    }

    runLayout();
    window.requestAnimationFrame(function () {
      runLayout();
      window.requestAnimationFrame(runLayout);
    });

    window.addEventListener("resize", runLayout);

    if (section && typeof ResizeObserver !== "undefined") {
      var observer = new ResizeObserver(function () {
        runLayout();
      });
      observer.observe(section);
    }
  }

  function openEditModal() {
    var overlay = document.getElementById("editBudgetOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    if (window.SwModalScroll) {
      SwModalScroll.onOpen(overlay);
    } else {
      overlay.scrollTop = 0;
    }
    var input = document.getElementById("editBudgetAmount");
    if (input) input.focus();
  }

  function closeEditModal() {
    var overlay = document.getElementById("editBudgetOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
    }
  }

  function saveEditBudget() {
    var input = document.getElementById("editBudgetAmount");
    var errorEl = document.getElementById("editBudgetError");
    if (!input) return;
    if (!isOverallBudget && !pageData.categoryId) return;

    if (errorEl) errorEl.hidden = true;

    var editUrl = isOverallBudget
      ? "/budget/all-categories"
      : "/budget/categories/" + pageData.categoryId;

    fetch(editUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: input.value.trim(),
        budgetMonth: pageData.budgetMonth,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success) {
          window.location.href = result.data.redirect || window.location.pathname;
          return;
        }
        if (errorEl) {
          errorEl.textContent = (result.data.errors && result.data.errors[0]) || "Unable to update budget.";
          errorEl.hidden = false;
        }
      })
      .catch(function () {
        if (errorEl) {
          errorEl.textContent = "Unable to update budget. Please try again.";
          errorEl.hidden = false;
        }
      });
  }

  function performDeleteBudget() {
    var deleteUrl = isOverallBudget
      ? "/budget/all-categories?month=" + encodeURIComponent(pageData.budgetMonth)
      : "/budget/categories/" + pageData.categoryId + "?month=" + encodeURIComponent(pageData.budgetMonth);

    fetch(deleteUrl, {
      method: "DELETE",
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success) {
          window.location.href = result.data.redirect || "/budget";
        }
      });
  }

  function deleteBudget() {
    if (!isOverallBudget && !pageData.categoryId) return;

    if (window.SwConfirm && typeof window.SwConfirm.ask === "function") {
      window.SwConfirm.ask({
        title: "Are you sure?",
        message: "This cannot be undone.",
        actionText: "Delete",
        type: "danger",
      }).then(function (confirmed) {
        if (confirmed) performDeleteBudget();
      });
      return;
    }

    performDeleteBudget();
  }

  loadPageData();

  var editBtn = document.getElementById("editBudgetBtn");
  var settingsBtn = document.getElementById("openBudgetSettings");
  var settingsMenu = document.getElementById("budgetSettingsMenu");
  var deleteBtn = document.getElementById("deleteBudgetBtn");
  var closeEdit = document.getElementById("closeEditBudget");
  var saveEdit = document.getElementById("saveEditBudget");
  var searchInput = document.getElementById("transactionSearch");
  var editOverlay = document.getElementById("editBudgetOverlay");

  if (editBtn) editBtn.addEventListener("click", openEditModal);
  if (deleteBtn) deleteBtn.addEventListener("click", deleteBudget);

  function closeSettingsMenu() {
    if (!settingsMenu || !settingsBtn) return;
    settingsMenu.hidden = true;
    settingsBtn.setAttribute("aria-expanded", "false");
  }

  function toggleSettingsMenu() {
    if (!settingsMenu || !settingsBtn) return;
    var willOpen = settingsMenu.hidden;
    settingsMenu.hidden = !willOpen;
    settingsBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleSettingsMenu();
    });
  }

  if (settingsMenu) {
    settingsMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  var addTransactionBtn = document.getElementById("openAddTransaction");
  if (addTransactionBtn) {
    addTransactionBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeSettingsMenu();
      if (typeof window.openAddExpenseModal === "function") {
        window.openAddExpenseModal();
      }
    });
  }

  document.addEventListener("click", function () {
    closeSettingsMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSettingsMenu();
      closeEditModal();
    }
  });

  if (closeEdit) closeEdit.addEventListener("click", closeEditModal);
  if (saveEdit) saveEdit.addEventListener("click", saveEditBudget);

  if (editOverlay) {
    editOverlay.addEventListener("click", function (e) {
      if (e.target === editOverlay) closeEditModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      applyTransactionFilters();
    });
  }

  bindGraphMonthClicks();
  bindGraphDragScroll();
  initCategoryGraph();
  refreshHistoryView();
})();
