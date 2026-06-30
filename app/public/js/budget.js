(function () {
  "use strict";

  var pageData = {};
  var selectedCategoryId = null;
  var selectedCategoryName = null;
  var pendingBillsCategory = null;

  var overlay = document.getElementById("addBudgetOverlay");
  var billsOverlay = document.getElementById("billsWarningOverlay");
  var categoryPickerStep = document.getElementById("categoryPickerStep");
  var amountStep = document.getElementById("amountStep");
  var categorySearch = document.getElementById("categorySearch");
  var categoryList = document.getElementById("categoryList");
  var selectedCategoryNameEl = document.getElementById("selectedCategoryName");
  var budgetAmountInput = document.getElementById("budgetAmountInput");
  var budgetFormError = document.getElementById("budgetFormError");
  var selectedCategorySpent = 0;
  var addBudgetHeader = document.getElementById("addBudgetHeader");
  var addBudgetSearch = document.getElementById("addBudgetSearch");
  var budgetSpentNote = document.getElementById("budgetSpentNote");
  var saveBudgetBtn = document.getElementById("saveBudgetBtn");
  var currentMonthName = "this month";

  function loadPageData() {
    var el = document.getElementById("budgetPageData");
    if (!el || !el.textContent) return;
    try {
      pageData = JSON.parse(el.textContent);
      currentMonthName = pageData.currentMonthName || currentMonthName;
    } catch (e) {
      pageData = {};
    }
  }

  function openModal() {
    if (!overlay) return;
    resetModal();
    overlay.hidden = false;
    document.body.classList.add("spb-modal-open");
    if (categorySearch) categorySearch.focus();
  }

  function closeModal() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("spb-modal-open");
    resetModal();
  }

  function resetModal() {
    selectedCategoryId = null;
    selectedCategoryName = null;
    selectedCategorySpent = 0;
    pendingBillsCategory = null;
    if (addBudgetHeader) addBudgetHeader.hidden = false;
    if (addBudgetSearch) addBudgetSearch.hidden = false;
    if (categoryPickerStep) categoryPickerStep.hidden = false;
    if (amountStep) amountStep.hidden = true;
    if (categorySearch) categorySearch.value = "";
    if (budgetAmountInput) budgetAmountInput.value = "";
    if (budgetFormError) budgetFormError.hidden = true;
    filterCategories("");
    clearCategorySelection();
  }

  function showAmountStep() {
    if (addBudgetHeader) addBudgetHeader.hidden = true;
    if (addBudgetSearch) addBudgetSearch.hidden = true;
    if (categoryPickerStep) categoryPickerStep.hidden = true;
    if (amountStep) amountStep.hidden = false;
    if (selectedCategoryNameEl) selectedCategoryNameEl.textContent = selectedCategoryName || "Category";
    if (budgetSpentNote) {
      var spentText = selectedCategorySpent % 1 === 0
        ? "$" + selectedCategorySpent.toLocaleString() + ".00"
        : "$" + selectedCategorySpent.toFixed(2);
      budgetSpentNote.textContent =
        "You've spent " + spentText + " so far in " + currentMonthName +
        ". Your budget will start over at the beginning of every month.";
    }
    if (budgetAmountInput) {
      budgetAmountInput.value = "";
      budgetAmountInput.focus();
    }
  }

  function clearCategorySelection() {
    if (!categoryList) return;
    var items = categoryList.querySelectorAll(".spb-category-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("spb-category-item--selected");
    }
  }

  function filterCategories(query) {
    if (!categoryList) return;
    var q = (query || "").toLowerCase().trim();
    var items = categoryList.querySelectorAll(".spb-category-item");
    for (var i = 0; i < items.length; i++) {
      var name = (items[i].getAttribute("data-category-name") || "").toLowerCase();
      var li = items[i].closest("li");
      if (li) li.hidden = q && name.indexOf(q) === -1;
    }
  }

  function selectCategory(btn) {
    if (btn.getAttribute("data-has-budget") === "1") return;

    clearCategorySelection();
    btn.classList.add("spb-category-item--selected");
    selectedCategoryId = btn.getAttribute("data-category-id");
    selectedCategoryName = btn.getAttribute("data-category-name");
    selectedCategorySpent = Number(btn.getAttribute("data-spent")) || 0;

    if (btn.getAttribute("data-is-bills") === "1") {
      pendingBillsCategory = { id: selectedCategoryId, name: selectedCategoryName };
      if (billsOverlay) {
        billsOverlay.hidden = false;
      }
      return;
    }

    showAmountStep();
  }

  function saveBudget() {
    if (!selectedCategoryId || !budgetAmountInput) return;

    var amount = budgetAmountInput.value.trim();
    if (budgetFormError) budgetFormError.hidden = true;

    fetch("/budget/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: selectedCategoryId,
        amount: amount,
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
          window.location.href = result.data.redirect || "/budget";
          return;
        }
        if (budgetFormError) {
          budgetFormError.textContent = (result.data.errors && result.data.errors[0]) || "Unable to save budget.";
          budgetFormError.hidden = false;
        }
      })
      .catch(function () {
        if (budgetFormError) {
          budgetFormError.textContent = "Unable to save budget. Please try again.";
          budgetFormError.hidden = false;
        }
      });
  }

  loadPageData();

  var openBtn = document.getElementById("openAddBudget");
  var openEmptyBtn = document.getElementById("openAddBudgetEmpty");
  var closeBtn = document.getElementById("closeAddBudget");
  var closeAmountBtn = document.getElementById("closeAddBudgetAmount");
  var backBtn = document.getElementById("backToCategories");
  var billsCancel = document.getElementById("billsWarningCancel");
  var billsProceed = document.getElementById("billsWarningProceed");

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (openEmptyBtn) openEmptyBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (closeAmountBtn) closeAmountBtn.addEventListener("click", closeModal);
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      if (addBudgetHeader) addBudgetHeader.hidden = false;
    if (addBudgetSearch) addBudgetSearch.hidden = false;
      if (categoryPickerStep) categoryPickerStep.hidden = false;
      if (amountStep) amountStep.hidden = true;
      clearCategorySelection();
      selectedCategoryId = null;
      selectedCategoryName = null;
      selectedCategorySpent = 0;
    });
  }

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  if (categorySearch) {
    categorySearch.addEventListener("input", function () {
      filterCategories(categorySearch.value);
    });
  }

  if (categoryList) {
    categoryList.addEventListener("click", function (e) {
      var btn = e.target.closest(".spb-category-item");
      if (btn) selectCategory(btn);
    });
  }

  if (billsCancel) {
    billsCancel.addEventListener("click", function () {
      if (billsOverlay) billsOverlay.hidden = true;
      clearCategorySelection();
      selectedCategoryId = null;
      selectedCategoryName = null;
      pendingBillsCategory = null;
    });
  }

  if (billsProceed) {
    billsProceed.addEventListener("click", function () {
      if (billsOverlay) billsOverlay.hidden = true;
      if (pendingBillsCategory) {
        selectedCategoryId = pendingBillsCategory.id;
        selectedCategoryName = pendingBillsCategory.name;
        showAmountStep();
      }
      pendingBillsCategory = null;
    });
  }

  if (saveBudgetBtn) saveBudgetBtn.addEventListener("click", saveBudget);

  if (budgetAmountInput) {
    budgetAmountInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") saveBudget();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (billsOverlay && !billsOverlay.hidden) {
        billsOverlay.hidden = true;
        clearCategorySelection();
        return;
      }
      if (overlay && !overlay.hidden) closeModal();
    }
  });
})();
