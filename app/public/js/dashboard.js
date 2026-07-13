(function () {
  "use strict";

  var MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  var payload = {
    selectedMonth: "",
    monthOrder: [],
    months: {},
    categoryMeta: {},
  };
  var currentMonthKey = "";
  var currentMonthIndex = 0;

  function loadDashData() {
    var el = document.getElementById("dashData");
    if (!el || !el.textContent) return false;

    try {
      var data = JSON.parse(el.textContent);
      payload.selectedMonth = data.selectedMonth || "";
      payload.monthOrder = Array.isArray(data.monthOrder) ? data.monthOrder : [];
      payload.months = data.months && typeof data.months === "object" ? data.months : {};
      payload.categoryMeta =
        data.categoryMeta && typeof data.categoryMeta === "object"
          ? data.categoryMeta
          : {};
      return payload.monthOrder.length > 0;
    } catch (error) {
      return false;
    }
  }

  function money(value) {
    return window.SwCurrencyFormat
      ? window.SwCurrencyFormat.formatMoney(value)
      : ("$" + Number(value || 0).toFixed(2));
  }

  /** Convert a base-currency amount to preferred currency for chart series (numbers only). */
  function toPreferred(value) {
    return window.SwCurrencyFormat
      ? window.SwCurrencyFormat.convertFromBase(value)
      : Number(value || 0);
  }

  function calcUsedPct(spent, budget) {
    if (!budget || budget <= 0) return 0;
    return Math.round((spent / budget) * 100);
  }

  function statusForPct(pct) {
    if (pct >= 100) return { badge: "danger", label: "Overspending" };
    if (pct >= 80) return { badge: "warning", label: "Warning" };
    return { badge: "success", label: "Safe" };
  }

  function budgetBarClass(pct) {
    if (pct >= 100) return "dash-budget-fill--danger";
    if (pct >= 80) return "dash-budget-fill--warning";
    return "dash-budget-fill--safe";
  }

  function getCategoryColor(category) {
    var colors = {
      Groceries: "green",
      "Auto & Transport": "orange",
      Shopping: "purple",
      "Bills & Utilities": "blue",
      Entertainment: "pink",
      Education: "purple",
      "Cash & ATM": "blue",
      "Other categories": "blue",
    };
    return colors[category] || "blue";
  }

  function renderCategoryVisual(meta, categoryName, sizeClass) {
    sizeClass = sizeClass || "sm";
    var name = categoryName || "Other";

    if (meta && meta.iconImage) {
      return (
        '<span class="sw-category-icon sw-category-icon--' +
        sizeClass +
        '"><img src="' +
        meta.iconImage +
        '" alt="" class="sw-category-icon__img"></span>'
      );
    }

    if (meta && meta.generalIconUrl) {
      return (
        '<span class="sw-category-icon sw-category-icon--' +
        sizeClass +
        '"><img src="' +
        meta.generalIconUrl +
        '" alt="" class="sw-category-icon__img"></span>'
      );
    }

    var initial = name.charAt(0).toUpperCase() || "?";
    return (
      '<span class="dash-txn-icon dash-txn-icon--' +
      getCategoryColor(name) +
      '" aria-hidden="true">' +
      initial +
      "</span>"
    );
  }

  function renderCategoryIconForTxn(txn, sizeClass) {
    var meta =
      payload.categoryMeta[String(txn.categoryId)] ||
      payload.categoryMeta[txn.category] ||
      {
        iconImage: txn.iconImage,
        generalIconUrl: txn.generalIconUrl,
        color: txn.color,
        isCustom: txn.isCustom,
      };
    return renderCategoryVisual(meta, txn.category, sizeClass);
  }

  function formatTxnDate(dateStr) {
    if (!dateStr) return "No date";
    var parts = String(dateStr).split("-");
    if (parts.length < 3) return dateStr;
    return MONTH_SHORT[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10);
  }

  function buildTrend(monthKey) {
    var index = payload.monthOrder.indexOf(monthKey);
    if (index < 0) return [];

    var start = Math.max(0, index - 5);
    var trend = [];

    for (var i = start; i <= index; i++) {
      var key = payload.monthOrder[i];
      var monthData = payload.months[key];
      if (!monthData) continue;
      var parts = key.split("-");
      trend.push({
        month: MONTH_SHORT[parseInt(parts[1], 10) - 1],
        amount: toPreferred(Number(monthData.summary.totalSpent) || 0),
      });
    }

    return trend;
  }

  function getPreviousMonthData(monthKey) {
    var index = payload.monthOrder.indexOf(monthKey);
    if (index <= 0) return null;
    return payload.months[payload.monthOrder[index - 1]] || null;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function renderTrendChart(trend, budgetHint) {
    var svg = document.getElementById("dashTrendSvg");
    if (!svg || trend.length === 0) return;

    var maxAmount = 0;
    for (var i = 0; i < trend.length; i++) {
      if (trend[i].amount > maxAmount) maxAmount = trend[i].amount;
    }
    if (maxAmount === 0) maxAmount = budgetHint || 1;

    var step = trend.length > 1 ? 400 / (trend.length - 1) : 0;
    var pts = [];

    for (var j = 0; j < trend.length; j++) {
      pts.push({
        x: 20 + j * step,
        y: 110 - Math.round((trend[j].amount / maxAmount) * 86),
        month: trend[j].month,
      });
    }

    var markup = "";
    var gridRows = [28, 50, 72, 94];
    for (var g = 0; g < gridRows.length; g++) {
      markup +=
        '<line x1="20" y1="' +
        gridRows[g] +
        '" x2="420" y2="' +
        gridRows[g] +
        '" class="dash-chart-grid"/>';
    }
    markup += '<line x1="20" y1="110" x2="420" y2="110" class="dash-chart-axis"/>';
    markup += '<line x1="20" y1="14" x2="20" y2="110" class="dash-chart-axis"/>';

    if (pts.length > 1) {
      var areaPts = pts.map(function (p) {
        return p.x + "," + p.y;
      });
      areaPts.push(pts[pts.length - 1].x + ",110");
      areaPts.push("20,110");
      markup += '<polygon points="' + areaPts.join(" ") + '" class="dash-chart-area"/>';
    }

    markup +=
      '<polyline points="' +
      pts
        .map(function (p) {
          return p.x + "," + p.y;
        })
        .join(" ") +
      '" class="dash-chart-line"/>';

    for (var k = 0; k < pts.length; k++) {
      markup +=
        '<circle cx="' +
        pts[k].x +
        '" cy="' +
        pts[k].y +
        '" r="4.5" class="dash-chart-dot"/>';
      markup +=
        '<text x="' +
        pts[k].x +
        '" y="126" class="dash-chart-label" text-anchor="middle">' +
        pts[k].month +
        "</text>";
    }

    svg.innerHTML = markup;
  }

  function renderBarChart(week) {
    var chart = document.getElementById("dashBarChart");
    if (!chart) return;

    var preferredWeek = [];
    for (var w = 0; w < week.length; w++) {
      preferredWeek.push({
        day: week[w].day,
        dateLabel: week[w].dateLabel,
        amountBase: Number(week[w].amount) || 0,
        amount: toPreferred(week[w].amount),
      });
    }

    var maxAmount = 0;
    for (var i = 0; i < preferredWeek.length; i++) {
      if (preferredWeek[i].amount > maxAmount) maxAmount = preferredWeek[i].amount;
    }
    if (maxAmount === 0) maxAmount = 1;

    var html = "";
    for (var j = 0; j < preferredWeek.length; j++) {
      var h =
        preferredWeek[j].amount > 0
          ? Math.max(12, Math.round((preferredWeek[j].amount / maxAmount) * 100))
          : 0;
      var amtLabel =
        preferredWeek[j].amountBase > 0 ? money(preferredWeek[j].amountBase) : "";
      html += '<div class="dash-bar-col">';
      html += '<div class="dash-bar-track"><div class="dash-bar-fill" style="height:' + h + '%;"></div></div>';
      html += '<span class="dash-bar-label">' + (preferredWeek[j].dateLabel || preferredWeek[j].day) + "</span>";
      html += '<span class="dash-bar-amt">' + amtLabel + "</span>";
      html += "</div>";
    }

    chart.innerHTML = html;
  }

  function renderBudgets(categoryProgress) {
    var list = document.getElementById("dashBudgetList");
    if (!list) return;

    if (!categoryProgress || categoryProgress.length === 0) {
      list.innerHTML =
        '<p class="dash-empty-note">No category budgets set for this month.</p>';
      return;
    }

    var html = "";
    for (var i = 0; i < categoryProgress.length; i++) {
      var row = categoryProgress[i];
      var pct = Number(row.usedPct) || 0;
      var barPct = Math.min(100, Math.max(0, pct));
      var pctClass = pct >= 100 ? "danger" : pct >= 80 ? "warning" : "safe";
      var meta =
        payload.categoryMeta[String(row.categoryId)] ||
        payload.categoryMeta[row.name] ||
        {
          iconImage: row.iconImage,
          generalIconUrl: null,
          color: row.color,
          isCustom: row.isCustom,
        };

      html += '<div class="dash-budget-row">';
      html +=
        '<div class="dash-budget-meta"><span class="dash-budget-name">' +
        renderCategoryVisual(meta, row.name, "sm") +
        row.name +
        "</span>";
      html +=
        '<span class="dash-budget-amt">' +
        money(row.spent) +
        " / " +
        money(row.limit) +
        "</span></div>";
      html +=
        '<div class="dash-budget-track"><div class="dash-budget-fill ' +
        budgetBarClass(pct) +
        '" style="width:' +
        barPct +
        '%;"></div></div>';
      html +=
        '<span class="dash-budget-pct dash-budget-pct--' +
        pctClass +
        '">' +
        pct +
        "%</span>";
      html += "</div>";
    }

    list.innerHTML = html;
  }

  function renderTransactions(transactions) {
    var list = document.getElementById("dashTxnList");
    if (!list) return;

    if (!transactions || transactions.length === 0) {
      list.innerHTML =
        '<li class="dash-txn-item dash-txn-item--empty">No transactions in this period.</li>';
      return;
    }

    var html = "";
    for (var i = 0; i < transactions.length; i++) {
      var row = transactions[i];
      html += '<li class="dash-txn-item">';
      html += renderCategoryIconForTxn(row, "sm");
      html += '<div class="dash-txn-main">';
      html += '<span class="dash-txn-cat">' + row.description + "</span>";
      html +=
        '<span class="dash-txn-meta">' +
        row.category +
        " · " +
        formatTxnDate(row.date) +
        "</span>";
      html += "</div>";
      html += '<div class="dash-txn-side">';
      html += '<span class="dash-txn-amt dash-val-red">-' + money(row.amount) + "</span>";
      if (row.id) {
        html +=
          '<button type="button" class="dash-txn-detail-btn" data-expense-id="' +
          row.id +
          '">View details</button>';
      } else {
        html += '<button type="button" class="dash-txn-detail-btn">View details</button>';
      }
      html += "</div>";
      html += "</li>";
    }

    list.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderBudgetAlerts(notifications, monthKey) {
    var container = document.getElementById("dashBudgetAlerts");
    if (!container) return;

    if (
      window.SpendWiseBudgetNotifications &&
      typeof window.SpendWiseBudgetNotifications.render === "function"
    ) {
      window.SpendWiseBudgetNotifications.render(container, notifications, {
        showEmpty: true,
        month: monthKey || "",
        userId: container.getAttribute("data-user-id") || "guest",
      });
      if (typeof window.initBudgetNotificationDismiss === "function") {
        window.initBudgetNotificationDismiss(container);
      }
      return;
    }

    var alerts =
      notifications && notifications.alerts ? notifications.alerts : notifications;
    if (!alerts || !alerts.length) {
      container.innerHTML =
        '<p class="budget-notifications__empty">No budget alerts right now.</p>';
      return;
    }

    var html = "";
    for (var i = 0; i < alerts.length; i++) {
      var alert = alerts[i];
      var levelClass = alert.level === "danger" ? "danger" : "warning";
      var icon = alert.level === "danger" ? "!" : "%";
      html +=
        '<div class="budget-alert-banner budget-alert-banner--' +
        levelClass +
        '" role="alert">';
      html +=
        '<span class="budget-alert-banner__icon" aria-hidden="true">' +
        icon +
        "</span>";
      html += "<div>";
      html += "<strong>" + escapeHtml(alert.title) + "</strong>";
      html +=
        "<p>" +
        escapeHtml(alert.message) +
        " " +
        escapeHtml(alert.detail) +
        "</p>";
      html += "</div></div>";
    }

    container.innerHTML = html;
    if (typeof window.initBudgetNotificationDismiss === "function") {
      window.initBudgetNotificationDismiss(container);
    }
  }

  function renderDashboard(monthKey) {
    var monthData = payload.months[monthKey];
    if (!monthData) return;

    var summary = monthData.summary;
    var usedPct = Number(summary.percentageUsed) || 0;
    var status = statusForPct(usedPct);
    var pill = document.getElementById("dashUsedPill");
    var expenseLabel =
      monthData.expenseCount === 1
        ? "1 expense"
        : monthData.expenseCount + " expenses";

    setText("dashMonthLabel", monthData.label);
    setText("dashStatBudget", money(summary.monthlyBudget));
    setText("dashStatSpent", money(summary.totalSpent));
    setText("dashStatExpenseCount", expenseLabel + " · " + monthData.label);
    setText("dashStatRemaining", money(summary.remainingBudget));
    setText("dashStatUsed", usedPct + "%");
    setText("dashStatTopCategory", monthData.topCategory.name);
    setText(
      "dashStatTopAmount",
      money(monthData.topCategory.amount) + " spent"
    );

    if (pill) {
      pill.textContent = status.label;
      pill.className = "pill pill--" + status.badge;
    }

    var donutThis = document.getElementById("dashDonutThis");
    if (donutThis) donutThis.style.setProperty("--used", usedPct);

    setText("dashThisUsedPct", usedPct + "%");
    setText("dashThisBudget", money(summary.monthlyBudget));
    setText("dashThisSpent", money(summary.totalSpent));
    setText("dashThisRemaining", money(summary.remainingBudget));

    var prevData = getPreviousMonthData(monthKey);
    var donutLast = document.getElementById("dashDonutLast");

    if (prevData && prevData.hasOverallBudget) {
      var prevSummary = prevData.summary;
      var prevUsedPct = Number(prevSummary.percentageUsed) || 0;
      if (donutLast) donutLast.style.setProperty("--used", Math.min(100, prevUsedPct));
      setText("dashLastUsedPct", prevUsedPct + "%");
      setText("dashLastBudget", money(prevSummary.monthlyBudget));
      setText("dashLastSpent", money(prevSummary.totalSpent));
      setText("dashLastRemaining", money(prevSummary.remainingBudget));
    } else if (prevData) {
      if (donutLast) donutLast.style.setProperty("--used", 0);
      setText("dashLastUsedPct", "—");
      setText("dashLastBudget", "Not set");
      setText("dashLastSpent", money(prevData.periodSpent || 0));
      setText("dashLastRemaining", "N/A");
    } else {
      if (donutLast) donutLast.style.setProperty("--used", 0);
      setText("dashLastUsedPct", "—");
      setText("dashLastBudget", "Not set");
      setText("dashLastSpent", money(0));
      setText("dashLastRemaining", "N/A");
    }

    setText("dashTopName", monthData.topCategory.name);
    setText(
      "dashTopSpent",
      money(monthData.topCategory.amount) + " spent"
    );

    setText("dashCashIncome", money(summary.monthlyBudget));
    setText("dashCashExpenses", money(summary.totalSpent));
    setText("dashCashRemaining", money(summary.remainingBudget));

    renderTrendChart(buildTrend(monthKey), summary.monthlyBudget);
    renderBarChart(monthData.last7Days || []);
    renderBudgets(monthData.categoryProgress || []);
    renderTransactions(monthData.transactions || []);
    renderBudgetAlerts(monthData.budgetAlerts || [], monthKey);
  }

  function initMonthNav() {
    var prevBtn = document.getElementById("dashMonthPrev");
    var nextBtn = document.getElementById("dashMonthNext");

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (currentMonthIndex > 0) {
          currentMonthIndex -= 1;
          currentMonthKey = payload.monthOrder[currentMonthIndex];
          renderDashboard(currentMonthKey);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (currentMonthIndex < payload.monthOrder.length - 1) {
          currentMonthIndex += 1;
          currentMonthKey = payload.monthOrder[currentMonthIndex];
          renderDashboard(currentMonthKey);
        }
      });
    }
  }

  function initClickableCards() {
    document.querySelectorAll("[data-dash-link]").forEach(function (card) {
      function goToLink(event) {
        if (event.target.closest(".dash-card-menu")) return;
        var href = card.getAttribute("data-dash-link");
        if (href) window.location.href = href;
      }

      card.addEventListener("click", goToLink);
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToLink(event);
        }
      });
    });
  }

  function initTransactionDetails() {
    var list = document.getElementById("dashTxnList");
    if (!list) return;

    list.addEventListener("click", function (event) {
      var btn = event.target.closest(".dash-txn-detail-btn");
      if (!btn) return;
      event.preventDefault();
      var expenseId = btn.getAttribute("data-expense-id");
      if (expenseId) {
        window.location.href = "/expenses/" + expenseId + "/edit";
      }
    });
  }

  function closeAllCardMenus(except) {
    document.querySelectorAll(".dash-card-menu-dropdown").forEach(function (menu) {
      if (menu === except) return;
      menu.hidden = true;
      var btn = menu.previousElementSibling;
      if (btn) btn.classList.remove("is-open");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function initCardMenus() {
    document.querySelectorAll(".dash-card-menu-wrap").forEach(function (wrap) {
      var btn = wrap.querySelector(".dash-card-menu");
      var menu = wrap.querySelector(".dash-card-menu-dropdown");
      if (!btn || !menu) return;

      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        var isOpen = !menu.hidden;
        closeAllCardMenus();
        menu.hidden = isOpen;
        btn.classList.toggle("is-open", !isOpen);
        btn.setAttribute("aria-expanded", String(!isOpen));
      });

      menu.addEventListener("click", function (event) {
        var item = event.target.closest(".dash-card-menu-item");
        if (!item) return;
        event.stopPropagation();
        closeAllCardMenus();

        var action = item.getAttribute("data-action");
        if (action === "navigate") {
          var href = item.getAttribute("data-href");
          if (href) window.location.href = href;
        } else if (action === "refresh") {
          renderDashboard(currentMonthKey);
        }
      });
    });

    document.addEventListener("click", function () {
      closeAllCardMenus();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAllCardMenus();
    });
  }

  function init() {
    var page = document.getElementById("dashPage");
    if (!page || !loadDashData()) return;

    currentMonthKey = payload.selectedMonth || payload.monthOrder[payload.monthOrder.length - 1];
    currentMonthIndex = payload.monthOrder.indexOf(currentMonthKey);
    if (currentMonthIndex < 0) {
      currentMonthIndex = payload.monthOrder.length - 1;
      currentMonthKey = payload.monthOrder[currentMonthIndex];
    }

    renderDashboard(currentMonthKey);
    initMonthNav();
    initClickableCards();
    initTransactionDetails();
    initCardMenus();
  }

  document.addEventListener("sw-expense-updated", function (event) {
    var detail = event.detail;
    if (!detail || !detail.expense) return;
    if (!document.getElementById("dashPage")) return;
    window.location.reload();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
