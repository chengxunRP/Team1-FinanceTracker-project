(function () {
  "use strict";

  var overlay = document.getElementById("expenseCategoryOverlay");
  var openBtn = document.getElementById("openExpenseCategoryPicker");
  var closeBtn = document.getElementById("closeExpenseCategoryPicker");
  var searchInput = document.getElementById("expenseCategorySearch");
  var categoryIdInput = document.getElementById("categoryId");
  var categoryLabel = document.getElementById("expenseCategoryLabel");
  var categoryIconWrap = document.getElementById("expenseCategoryIconWrap");
  var customList = document.getElementById("expenseCustomCategoryList");
  var generalList = document.getElementById("expenseGeneralCategoryList");
  var yourSection = document.getElementById("expenseYourCategoriesSection");
  var generalSection = document.getElementById("expenseGeneralCategoriesSection");
  var emptyMsg = document.getElementById("expenseCategoryEmpty");
  var addExpenseOverlay = document.getElementById("addExpenseOverlay");
  var hidAddExpenseForCategory = false;

  if (!overlay || !categoryIdInput) return;

  function hideAddExpenseIfOpen() {
    if (!addExpenseOverlay || addExpenseOverlay.hidden) {
      hidAddExpenseForCategory = false;
      return;
    }
    hidAddExpenseForCategory = true;
    addExpenseOverlay.hidden = true;
  }

  function restoreAddExpenseIfNeeded() {
    if (!hidAddExpenseForCategory || !addExpenseOverlay) return;
    addExpenseOverlay.hidden = false;
    hidAddExpenseForCategory = false;
    if (window.SwModalScroll) {
      SwModalScroll.onOpen(addExpenseOverlay);
    }
  }

  function openModal() {
    hideAddExpenseIfOpen();
    overlay.hidden = false;
    if (window.SwModalScroll) {
      SwModalScroll.onOpen(overlay);
    } else {
      overlay.scrollTop = 0;
    }
    if (searchInput) {
      searchInput.value = "";
      filterCategories("");
      searchInput.focus();
    }
    highlightSelected(categoryIdInput.value);
  }

  function closeModal() {
    overlay.hidden = true;
    restoreAddExpenseIfNeeded();
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
    }
  }

  function highlightSelected(categoryId) {
    var items = overlay.querySelectorAll(".expense-cat-pick-item");
    for (var i = 0; i < items.length; i++) {
      var match = String(items[i].getAttribute("data-category-id")) === String(categoryId);
      items[i].classList.toggle("spb-category-item--selected", match);
    }
  }

  function selectCategory(btn) {
    if (!btn) return;
    var id = btn.getAttribute("data-category-id");
    var name = btn.getAttribute("data-category-name");
    categoryIdInput.value = id;
    if (categoryLabel) {
      categoryLabel.textContent = name;
      categoryLabel.classList.remove("expense-txn__category-value--placeholder");
    }
    if (categoryIconWrap) {
      var iconEl = btn.querySelector(".sw-category-icon");
      categoryIconWrap.innerHTML = iconEl ? iconEl.outerHTML : "";
    }
    highlightSelected(id);
    closeModal();
  }

  function filterCategories(query) {
    var q = String(query || "").trim().toLowerCase();
    var visibleCustom = 0;
    var visibleGeneral = 0;

    function filterList(listEl) {
      if (!listEl) return 0;
      var count = 0;
      var items = listEl.querySelectorAll(".expense-cat-pick-item");
      for (var i = 0; i < items.length; i++) {
        var name = (items[i].getAttribute("data-category-name") || "").toLowerCase();
        var show = !q || name.indexOf(q) !== -1;
        var row = items[i].closest("li");
        if (row) row.hidden = !show;
        if (show) count += 1;
      }
      return count;
    }

    visibleCustom = filterList(customList);
    visibleGeneral = filterList(generalList);

    if (yourSection) yourSection.hidden = visibleCustom === 0 && !!q;
    if (generalSection) generalSection.hidden = visibleGeneral === 0 && !!q;
    if (emptyMsg) {
      emptyMsg.hidden = visibleCustom + visibleGeneral > 0;
    }
  }

  function handleListClick(e) {
    var btn = e.target.closest(".expense-cat-pick-item");
    if (!btn) return;
    e.preventDefault();
    selectCategory(btn);
  }

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterCategories(searchInput.value);
    });
  }

  if (customList) customList.addEventListener("click", handleListClick);
  if (generalList) generalList.addEventListener("click", handleListClick);

  var form = categoryIdInput.closest("form");
  if (form) {
    form.addEventListener("submit", function (e) {
      if (!categoryIdInput.value) {
        e.preventDefault();
        openModal();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && !overlay.hidden) closeModal();
  });

  var initialId = categoryIdInput.value;
  if (initialId) {
    var initialBtn = overlay.querySelector(
      '.expense-cat-pick-item[data-category-id="' + initialId + '"]'
    );
    if (initialBtn) {
      var name = initialBtn.getAttribute("data-category-name");
      if (categoryLabel && name) {
        categoryLabel.textContent = name;
        categoryLabel.classList.remove("expense-txn__category-value--placeholder");
      }
      if (categoryIconWrap) {
        var icon = initialBtn.querySelector(".sw-category-icon");
        if (icon) categoryIconWrap.innerHTML = icon.outerHTML;
      }
      highlightSelected(initialId);
    }
  }

  filterCategories("");
})();
