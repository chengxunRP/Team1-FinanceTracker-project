(function () {
  "use strict";

  var pageData = {};
  var selectedMonth = null;
  var graphDidDrag = false;

  function loadPageData() {
    var el = document.getElementById("budgetCategoryData");
    if (!el || !el.textContent) return;
    try {
      pageData = JSON.parse(el.textContent);
    } catch (e) {
      pageData = {};
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

  function computeStats(transactions) {
    var total = 0;
    var largest = 0;
    for (var i = 0; i < transactions.length; i++) {
      var amount = Number(transactions[i].amount) || 0;
      total += amount;
      if (amount > largest) largest = amount;
    }
    return {
      transactionCount: transactions.length,
      totalAmount: total,
      avgTransaction: transactions.length ? total / transactions.length : 0,
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
      titleEl.textContent = "History";
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
    var q = searchInput ? searchInput.value.toLowerCase().trim() : "";
    var items = list.querySelectorAll(".spb-transaction-item");
    var emptyEl = document.getElementById("transactionEmpty");
    var visible = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var month = item.getAttribute("data-budget-month");
      var searchText = item.getAttribute("data-search") || "";
      var monthMatch = !selectedMonth || month === selectedMonth;
      var searchMatch = !q || searchText.indexOf(q) !== -1;
      var show = monthMatch && searchMatch;
      item.hidden = !show;
      if (show) visible += 1;
    }

    if (emptyEl) {
      if (items.length === 0) {
        emptyEl.textContent = "No transactions for this category.";
        emptyEl.hidden = false;
      } else if (visible === 0) {
        if (q) {
          emptyEl.textContent = "No transactions match your search.";
        } else if (selectedMonth) {
          emptyEl.textContent =
            "No transactions in " +
            ((pageData.monthLabels && pageData.monthLabels[selectedMonth]) || selectedMonth) +
            ".";
        } else {
          emptyEl.textContent = "No transactions for this category.";
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
    } else {
      stats = pageData.historyAll || computeStats(pageData.transactions || []);
    }
    updateHistoryHeader(stats);
    updateHistoryMetrics(stats);
    updateChartSelection();
    applyTransactionFilters();
  }

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
    document.body.classList.add("spb-modal-open");
    var input = document.getElementById("editBudgetAmount");
    if (input) input.focus();
  }

  function closeEditModal() {
    var overlay = document.getElementById("editBudgetOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("spb-modal-open");
  }

  function saveEditBudget() {
    var input = document.getElementById("editBudgetAmount");
    var errorEl = document.getElementById("editBudgetError");
    if (!input || !pageData.categoryId) return;

    if (errorEl) errorEl.hidden = true;

    fetch("/budget/categories/" + pageData.categoryId, {
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

  function deleteBudget() {
    if (!pageData.categoryId) return;
    if (!window.confirm("Delete this budget? This cannot be undone.")) return;

    fetch("/budget/categories/" + pageData.categoryId + "?month=" + encodeURIComponent(pageData.budgetMonth), {
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

  loadPageData();

  var editBtn = document.getElementById("editBudgetBtn");
  var settingsBtn = document.getElementById("openEditBudget");
  var deleteBtn = document.getElementById("deleteBudgetBtn");
  var closeEdit = document.getElementById("closeEditBudget");
  var saveEdit = document.getElementById("saveEditBudget");
  var searchInput = document.getElementById("transactionSearch");
  var editOverlay = document.getElementById("editBudgetOverlay");

  if (editBtn) editBtn.addEventListener("click", openEditModal);
  if (settingsBtn) settingsBtn.addEventListener("click", openEditModal);
  if (deleteBtn) deleteBtn.addEventListener("click", deleteBudget);
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

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeEditModal();
  });
})();
