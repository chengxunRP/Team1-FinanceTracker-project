(function () {
  "use strict";

  var DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var CATEGORY_COLORS = {
    Groceries: "green",
    Food: "green",
    Dining: "green",
    "Auto & Transport": "orange",
    Transport: "orange",
    Shopping: "purple",
    "Bills & Utilities": "blue",
    Utilities: "blue",
    Bills: "blue",
    Entertainment: "pink",
    Education: "purple",
    School: "purple",
    "Other categories": "blue",
    Others: "blue",
    Other: "blue"
  };

  var CATEGORY_IMAGE_URLS = {
    Groceries: "/categoryimages/food.png",
    Food: "/categoryimages/food.png",
    Dining: "/categoryimages/food.png",
    "Auto & Transport": "/categoryimages/transport.png",
    Transport: "/categoryimages/transport.png",
    Shopping: "/categoryimages/shopping.png",
    "Bills & Utilities": "/categoryimages/bills.png",
    Utilities: "/categoryimages/bills.png",
    Bills: "/categoryimages/bills.png",
    Entertainment: "/categoryimages/entertainment.png",
    Education: "/categoryimages/schools.png",
    School: "/categoryimages/schools.png",
    "Other categories": "",
    Others: "",
    Other: ""
  };

  var CATEGORY_INITIALS = {
    Groceries: "G",
    Food: "G",
    Dining: "D",
    "Auto & Transport": "T",
    Transport: "T",
    Shopping: "S",
    "Bills & Utilities": "B",
    Utilities: "U",
    Bills: "B",
    Entertainment: "E",
    Education: "E",
    School: "E",
    "Other categories": "O",
    Others: "O",
    Other: "O"
  };

  var monthlyBudget = 500;
  var allExpenses = [];
  var categoryBudgets = [];
  var serverBudgetMonth = "";
  var monthSlots = [];
  var hasDates = false;
  var currentMonthIndex = 0;

  function loadDashData() {
    var el = document.getElementById("dashData");
    if (!el || !el.textContent) {
      return false;
    }

    try {
      var data = JSON.parse(el.textContent);
      monthlyBudget = Number(data.monthlyBudget) || 0;
      allExpenses = Array.isArray(data.expenses) ? data.expenses : [];
      categoryBudgets = Array.isArray(data.categoryBudgets) ? data.categoryBudgets : [];
      serverBudgetMonth = data.budgetMonth || "";
      return true;
    } catch (error) {
      return false;
    }
  }

  function money(value) {
    return "$" + value;
  }

  function sumAmounts(expenses) {
    var total = 0;

    for (var i = 0; i < expenses.length; i++) {
      total += Number(expenses[i].amount) || 0;
    }

    return total;
  }

  function getExpenseDate(expense) {
    if (!expense) {
      return null;
    }

    var raw = expense.date || expense.expenseDate || expense.createdAt;

    if (!raw) {
      return null;
    }

    var parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  function detectHasDates(expenses) {
    for (var i = 0; i < expenses.length; i++) {
      if (getExpenseDate(expenses[i])) {
        return true;
      }
    }

    return false;
  }

  function monthLabel(year, month) {
    return MONTH_NAMES[month] + " " + year;
  }

  function buildMonthSlots(expenses, useDates) {
    if (!useDates) {
      var now = new Date();
      var slots = [];

      for (var i = 2; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        slots.push({
          year: d.getFullYear(),
          month: d.getMonth(),
          label: monthLabel(d.getFullYear(), d.getMonth())
        });
      }

      return slots;
    }

    var minDate = null;
    var maxDate = null;

    for (var j = 0; j < expenses.length; j++) {
      var date = getExpenseDate(expenses[j]);

      if (!date) {
        continue;
      }

      if (!minDate || date < minDate) {
        minDate = date;
      }

      if (!maxDate || date > maxDate) {
        maxDate = date;
      }
    }

    if (!minDate || !maxDate) {
      return buildMonthSlots(expenses, false);
    }

    var start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    var end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    var datedSlots = [];

    while (start <= end) {
      datedSlots.push({
        year: start.getFullYear(),
        month: start.getMonth(),
        label: monthLabel(start.getFullYear(), start.getMonth())
      });
      start = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }

    return datedSlots;
  }

  function filterExpensesForSlot(expenses, slot) {
    if (!hasDates) {
      return expenses.slice();
    }

    var filtered = [];

    for (var i = 0; i < expenses.length; i++) {
      var date = getExpenseDate(expenses[i]);

      if (date && date.getFullYear() === slot.year && date.getMonth() === slot.month) {
        filtered.push(expenses[i]);
      }
    }

    return filtered;
  }

  function getSpendingByCategory(expenses) {
    var totals = {};

    for (var i = 0; i < expenses.length; i++) {
      var cat = expenses[i].category || "Other";
      totals[cat] = (totals[cat] || 0) + (Number(expenses[i].amount) || 0);
    }

    var list = [];

    for (var category in totals) {
      list.push({ category: category, amount: totals[category] });
    }

    list.sort(function (a, b) {
      return b.amount - a.amount;
    });

    return list;
  }

  function getHighestCategory(expenses) {
    var list = getSpendingByCategory(expenses);

    if (list.length === 0) {
      return { category: "—", amount: 0 };
    }

    return list[0];
  }

  function calcUsedPct(spent, budget) {
    if (!budget || budget <= 0) {
      return 0;
    }

    return Math.round((spent / budget) * 100);
  }

  function statusForPct(pct) {
    if (pct >= 100) {
      return { badge: "danger", label: "Overspending" };
    }

    if (pct >= 80) {
      return { badge: "warning", label: "Warning" };
    }

    return { badge: "success", label: "Safe" };
  }

  function budgetBarClass(pct) {
    if (pct >= 100) {
      return "dash-budget-fill--danger";
    }

    if (pct >= 80) {
      return "dash-budget-fill--warning";
    }

    return "dash-budget-fill--safe";
  }

  function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || "blue";
  }

  function renderCategoryIcon(category, sizeClass) {
    var url = CATEGORY_IMAGE_URLS[category];
    sizeClass = sizeClass || "sm";

    if (url) {
      return '<span class="sw-category-icon sw-category-icon--' + sizeClass + '"><img src="' + url + '" alt="" class="sw-category-icon__img"></span>';
    }

    var initial = CATEGORY_INITIALS[category] || category.charAt(0).toUpperCase() || "?";
    return '<span class="dash-txn-icon dash-txn-icon--' + getCategoryColor(category) + '" aria-hidden="true">' + initial + "</span>";
  }

  function formatExpenseDate(expense) {
    var date = getExpenseDate(expense);

    if (!date) {
      return "No date";
    }

    return MONTH_SHORT[date.getMonth()] + " " + date.getDate();
  }

  function getExpenseSource(expense) {
    return expense.source || expense.paymentMethod || expense.payment || "Expense";
  }

  function buildBudgetRows(expenses) {
    var limits = {};
    var i;

    for (i = 0; i < categoryBudgets.length; i++) {
      var budgetName = categoryBudgets[i].displayName || categoryBudgets[i].name;
      limits[budgetName] = Number(categoryBudgets[i].budgeted) || 0;
    }

    var rows = getSpendingByCategory(expenses);

    return rows.map(function (row) {
      var limit = limits[row.category];
      if (!limit || limit <= 0) {
        limit = monthlyBudget;
      }

      return {
        name: row.category,
        spent: row.amount,
        limit: limit
      };
    });
  }

  function buildTransactions(expenses) {
    var sorted = expenses.slice();

    sorted.sort(function (a, b) {
      var dateA = getExpenseDate(a);
      var dateB = getExpenseDate(b);

      if (dateA && dateB) {
        return dateB - dateA;
      }

      if (dateA) {
        return -1;
      }

      if (dateB) {
        return 1;
      }

      return 0;
    });

    return sorted.map(function (expense) {
      return {
        id: expense.id || null,
        category: expense.category || "Other",
        description: expense.description || expense.name || expense.category || "Expense",
        source: getExpenseSource(expense),
        date: formatExpenseDate(expense),
        amount: Number(expense.amount) || 0,
        color: getCategoryColor(expense.category)
      };
    });
  }

  function buildWeekChart(expenses, slot) {
    var amounts = [0, 0, 0, 0, 0, 0, 0];

    if (hasDates) {
      var end = new Date(slot.year, slot.month + 1, 0);

      for (var d = 6; d >= 0; d--) {
        var day = new Date(end);
        day.setDate(end.getDate() - d);
        var dayIndex = (day.getDay() + 6) % 7;

        for (var i = 0; i < expenses.length; i++) {
          var expenseDate = getExpenseDate(expenses[i]);

          if (
            expenseDate &&
            expenseDate.getFullYear() === day.getFullYear() &&
            expenseDate.getMonth() === day.getMonth() &&
            expenseDate.getDate() === day.getDate()
          ) {
            amounts[dayIndex] += Number(expenses[i].amount) || 0;
          }
        }
      }
    } else {
      for (var j = 0; j < expenses.length; j++) {
        amounts[j % 7] += Number(expenses[j].amount) || 0;
      }
    }

    var week = [];

    for (var k = 0; k < 7; k++) {
      week.push({ day: DAY_LABELS[k], amount: amounts[k] });
    }

    return week;
  }

  function buildTrendChart(selectedIndex) {
    var trend = [];
    var startIndex = Math.max(0, selectedIndex - 5);

    for (var i = startIndex; i <= selectedIndex; i++) {
      var slot = monthSlots[i];
      var monthExpenses = filterExpensesForSlot(allExpenses, slot);
      var amount = sumAmounts(monthExpenses);

      if (!hasDates && i === selectedIndex) {
        amount = sumAmounts(allExpenses);
      } else if (!hasDates) {
        amount = 0;
      }

      trend.push({
        month: MONTH_SHORT[slot.month],
        amount: amount
      });
    }

    return trend;
  }

  function buildViewData(index) {
    var slot = monthSlots[index];
    var thisExpenses = filterExpensesForSlot(allExpenses, slot);
    var prevExpenses = index > 0 ? filterExpensesForSlot(allExpenses, monthSlots[index - 1]) : [];

    var thisSpent = sumAmounts(thisExpenses);
    var prevSpent = sumAmounts(prevExpenses);
    var thisUsedPct = calcUsedPct(thisSpent, monthlyBudget);
    var prevUsedPct = calcUsedPct(prevSpent, monthlyBudget);
    var highest = getHighestCategory(thisExpenses);
    var trend = buildTrendChart(index);
    var week = buildWeekChart(thisExpenses, slot);

    return {
      label: slot.label,
      budget: monthlyBudget,
      spent: thisSpent,
      remaining: monthlyBudget - thisSpent,
      usedPct: thisUsedPct,
      expenseCount: thisExpenses.length,
      highestCategory: highest.category,
      highestCategoryAmount: highest.amount,
      prevSpent: prevSpent,
      prevRemaining: monthlyBudget - prevSpent,
      prevUsedPct: prevUsedPct,
      trend: trend,
      week: week,
      budgets: buildBudgetRows(thisExpenses),
      transactions: buildTransactions(thisExpenses)
    };
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  function renderTrendChart(trend) {
    var svg = document.getElementById("dashTrendSvg");
    if (!svg || trend.length === 0) {
      return;
    }

    var maxAmount = 0;

    for (var i = 0; i < trend.length; i++) {
      if (trend[i].amount > maxAmount) {
        maxAmount = trend[i].amount;
      }
    }

    if (maxAmount === 0) {
      maxAmount = monthlyBudget || 1;
    }

    var step = trend.length > 1 ? 400 / (trend.length - 1) : 0;
    var pts = [];

    for (var j = 0; j < trend.length; j++) {
      pts.push({
        x: 20 + (j * step),
        y: 110 - Math.round((trend[j].amount / maxAmount) * 86),
        month: trend[j].month
      });
    }

    var markup = "";

    // Horizontal grid lines
    var gridRows = [28, 50, 72, 94];
    for (var g = 0; g < gridRows.length; g++) {
      markup += '<line x1="20" y1="' + gridRows[g] + '" x2="420" y2="' + gridRows[g] + '" class="dash-chart-grid"/>';
    }

    // Axes
    markup += '<line x1="20" y1="110" x2="420" y2="110" class="dash-chart-axis"/>';
    markup += '<line x1="20" y1="14" x2="20" y2="110" class="dash-chart-axis"/>';

    // Area fill below the line
    if (pts.length > 1) {
      var areaPts = pts.map(function(p) { return p.x + "," + p.y; });
      areaPts.push(pts[pts.length - 1].x + ",110");
      areaPts.push("20,110");
      markup += '<polygon points="' + areaPts.join(" ") + '" class="dash-chart-area"/>';
    }

    // Line
    markup += '<polyline points="' + pts.map(function(p) { return p.x + "," + p.y; }).join(" ") + '" class="dash-chart-line"/>';

    // Dots and labels
    for (var k = 0; k < pts.length; k++) {
      markup += '<circle cx="' + pts[k].x + '" cy="' + pts[k].y + '" r="4.5" class="dash-chart-dot"/>';
      markup += '<text x="' + pts[k].x + '" y="126" class="dash-chart-label" text-anchor="middle">' + pts[k].month + "</text>";
    }

    svg.innerHTML = markup;
  }

  function renderBarChart(week) {
    var chart = document.getElementById("dashBarChart");
    if (!chart) {
      return;
    }

    var maxAmount = 0;

    for (var i = 0; i < week.length; i++) {
      if (week[i].amount > maxAmount) {
        maxAmount = week[i].amount;
      }
    }

    if (maxAmount === 0) {
      maxAmount = 1;
    }

    var html = "";

    for (var j = 0; j < week.length; j++) {
      var h = week[j].amount > 0 ? Math.max(3, Math.round((week[j].amount / maxAmount) * 100)) : 0;
      var amtLabel = week[j].amount > 0 ? money(week[j].amount) : "";
      html += '<div class="dash-bar-col">';
      html += '<div class="dash-bar-track"><div class="dash-bar-fill" style="height:' + h + '%;"></div></div>';
      html += '<span class="dash-bar-label">' + week[j].day + "</span>";
      html += '<span class="dash-bar-amt">' + amtLabel + "</span>";
      html += "</div>";
    }

    chart.innerHTML = html;
  }

  function renderBudgets(budgets) {
    var list = document.getElementById("dashBudgetList");
    if (!list) {
      return;
    }

    if (budgets.length === 0) {
      list.innerHTML = '<p class="dash-empty-note">No expenses in this period.</p>';
      return;
    }

    var html = "";

    for (var i = 0; i < budgets.length; i++) {
      var row = budgets[i];
      var pct = monthlyBudget > 0 ? Math.round((row.spent / monthlyBudget) * 100) : 0;
      var barPct = Math.min(100, pct);
      var pctClass = pct >= 100 ? "danger" : pct >= 80 ? "warning" : "safe";
      html += '<div class="dash-budget-row">';
      html += '<div class="dash-budget-meta"><span class="dash-budget-name">' + renderCategoryIcon(row.name, "sm") + row.name + "</span>";
      html += '<span class="dash-budget-amt">' + money(row.spent) + " / " + money(row.limit) + "</span></div>";
      html += '<div class="dash-budget-track"><div class="dash-budget-fill ' + budgetBarClass(pct) + '" style="width:' + barPct + '%;"></div></div>';
      html += '<span class="dash-budget-pct dash-budget-pct--' + pctClass + '">' + pct + "%</span>";
      html += "</div>";
    }

    list.innerHTML = html;
  }

  function renderTransactions(transactions) {
    var list = document.getElementById("dashTxnList");
    if (!list) {
      return;
    }

    if (transactions.length === 0) {
      list.innerHTML = '<li class="dash-txn-item dash-txn-item--empty">No transactions in this period.</li>';
      return;
    }

    var html = "";

    for (var i = 0; i < transactions.length; i++) {
      var row = transactions[i];
      html += '<li class="dash-txn-item">';
      html += renderCategoryIcon(row.category, "sm");
      html += '<div class="dash-txn-main">';
      html += '<span class="dash-txn-cat">' + row.description + "</span>";
      html += '<span class="dash-txn-meta">' + row.category + " · " + row.date + "</span>";
      html += "</div>";
      html += '<div class="dash-txn-side">';
      html += '<span class="dash-txn-amt dash-val-red">-' + money(row.amount) + "</span>";
      if (row.id) {
        html += '<button type="button" class="dash-txn-detail-btn" data-expense-id="' + row.id + '">View details</button>';
      } else {
        html += '<button type="button" class="dash-txn-detail-btn">View details</button>';
      }
      html += "</div>";
      html += "</li>";
    }

    list.innerHTML = html;
  }

  function renderDashboard(index) {
    var data = buildViewData(index);
    if (!data) {
      return;
    }

    var status = statusForPct(data.usedPct);
    var pill = document.getElementById("dashUsedPill");
    var expenseLabel = data.expenseCount === 1 ? "1 expense" : data.expenseCount + " expenses";

    setText("dashMonthLabel", data.label);
    setText("dashStatBudget", money(data.budget));
    setText("dashStatSpent", money(data.spent));
    setText("dashStatExpenseCount", expenseLabel);
    setText("dashStatRemaining", money(data.remaining));
    setText("dashStatUsed", data.usedPct + "%");
    setText("dashStatTopCategory", data.highestCategory);
    setText("dashStatTopAmount", money(data.highestCategoryAmount) + " spent");

    if (pill) {
      pill.textContent = status.label;
      pill.className = "pill pill--" + status.badge;
    }

    var donutThis = document.getElementById("dashDonutThis");
    var donutLast = document.getElementById("dashDonutLast");

    if (donutThis) {
      donutThis.style.setProperty("--used", data.usedPct);
    }

    if (donutLast) {
      donutLast.style.setProperty("--used", data.prevUsedPct);
    }

    setText("dashThisUsedPct", data.usedPct + "%");
    setText("dashThisSpent", money(data.spent));
    setText("dashThisRemaining", money(data.remaining));
    setText("dashThisBudget", money(data.budget));

    setText("dashLastUsedPct", data.prevUsedPct + "%");
    setText("dashLastSpent", money(data.prevSpent));
    setText("dashLastRemaining", money(data.prevRemaining));
    setText("dashLastBudget", money(data.budget));

    setText("dashTopName", data.highestCategory);
    setText("dashTopSpent", money(data.highestCategoryAmount) + " spent");

    setText("dashCashIncome", money(data.budget));
    setText("dashCashExpenses", money(data.spent));
    setText("dashCashRemaining", money(data.remaining));

    renderTrendChart(data.trend);
    renderBarChart(data.week);
    renderBudgets(data.budgets);
    renderTransactions(data.transactions);
  }

  function initMonthNav() {
    var prevBtn = document.getElementById("dashMonthPrev");
    var nextBtn = document.getElementById("dashMonthNext");

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (currentMonthIndex > 0) {
          currentMonthIndex -= 1;
          renderDashboard(currentMonthIndex);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (currentMonthIndex < monthSlots.length - 1) {
          currentMonthIndex += 1;
          renderDashboard(currentMonthIndex);
        }
      });
    }
  }

  function initClickableCards() {
    var cards = document.querySelectorAll("[data-dash-link]");

    cards.forEach(function (card) {
      function goToLink(event) {
        if (event.target.closest(".dash-card-menu")) {
          return;
        }

        var href = card.getAttribute("data-dash-link");
        if (href) {
          window.location.href = href;
        }
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
    if (!list) {
      return;
    }

    list.addEventListener("click", function (event) {
      var btn = event.target.closest(".dash-txn-detail-btn");
      if (btn) {
        event.preventDefault();
        var expenseId = btn.getAttribute("data-expense-id");
        if (expenseId) {
          window.location.href = "/expenses/" + expenseId + "/edit";
        }
      }
    });
  }

  function findMonthIndexForBudgetMonth(budgetMonth) {
    if (!budgetMonth || monthSlots.length === 0) {
      return -1;
    }

    var parts = String(budgetMonth).split("-");
    if (parts.length !== 2) {
      return -1;
    }

    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;

    if (Number.isNaN(year) || Number.isNaN(month)) {
      return -1;
    }

    for (var i = 0; i < monthSlots.length; i++) {
      if (monthSlots[i].year === year && monthSlots[i].month === month) {
        return i;
      }
    }

    return -1;
  }

  function initCardMenus() {
    var menus = document.querySelectorAll(".dash-card-menu");

    menus.forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        window.alert("More options coming soon.");
      });
    });
  }

  function initFabButtons() {
    var removeBtn = document.getElementById("dashFabRemove");

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        window.location.href = "/expenses";
      });
    }
  }

  function init() {
    var page = document.getElementById("dashPage");
    if (!page || !loadDashData()) {
      return;
    }

    hasDates = detectHasDates(allExpenses);
    monthSlots = buildMonthSlots(allExpenses, hasDates);
    currentMonthIndex = monthSlots.length - 1;

    var serverMonthIndex = findMonthIndexForBudgetMonth(serverBudgetMonth);
    if (serverMonthIndex >= 0) {
      currentMonthIndex = serverMonthIndex;
    }

    renderDashboard(currentMonthIndex);
    initMonthNav();
    initClickableCards();
    initTransactionDetails();
    initCardMenus();
    initFabButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
