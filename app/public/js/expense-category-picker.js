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
  var currentList = document.getElementById("expenseCurrentCategoryList");
  var yourSection = document.getElementById("expenseYourCategoriesSection");
  var generalSection = document.getElementById("expenseGeneralCategoriesSection");
  var emptyMsg = document.getElementById("expenseCategoryEmpty");
  var addExpenseOverlay = document.getElementById("addExpenseOverlay");
  var hidAddExpenseForCategory = false;
  var pickSelector = ".sw-cat-pick-item, .expense-cat-pick-item";
  var pickerConfig = {
    pickSelector: pickSelector,
    listIds: ["expenseCustomCategoryList", "expenseGeneralCategoryList"],
    currentSectionId: "expenseCurrentCategorySection",
    currentListId: "expenseCurrentCategoryList",
  };
  var helpers = window.SwCategoryPickerHelpers;

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

  function applyPickerState(categoryId) {
    if (helpers) {
      helpers.applyPickerState(overlay, categoryId, pickerConfig);
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
    applyPickerState(categoryIdInput.value);
  }

  function closeModal() {
    overlay.hidden = true;
    if (helpers) {
      helpers.onPickerClose(overlay, pickerConfig);
    }
    restoreAddExpenseIfNeeded();
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
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
    var spcCategoryInput = document.getElementById("spcCategoryValue");
    if (spcCategoryInput) {
      spcCategoryInput.value = name;
    }
    applyPickerState(id);
    closeModal();
    document.dispatchEvent(
      new CustomEvent("sw:category-selected", {
        detail: { categoryId: id, categoryName: name },
      })
    );
  }

  function filterCategories(query) {
    var q = String(query || "").trim().toLowerCase();
    var visibleCustom = 0;
    var visibleGeneral = 0;

    function filterList(listEl) {
      if (!listEl) return 0;
      var count = 0;
      var items = listEl.querySelectorAll(pickSelector);
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

    if (helpers) {
      helpers.filterPinnedCurrent(query, pickerConfig);
    }

    if (yourSection) yourSection.hidden = visibleCustom === 0 && !!q;
    if (generalSection) generalSection.hidden = visibleGeneral === 0 && !!q;
    if (emptyMsg) {
      var pinnedVisible =
        helpers &&
        document.getElementById(pickerConfig.currentSectionId) &&
        !document.getElementById(pickerConfig.currentSectionId).hidden;
      emptyMsg.hidden = visibleCustom + visibleGeneral > 0 || pinnedVisible;
    }
  }

  function handleListClick(e) {
    var btn = e.target.closest(pickSelector);
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
  if (currentList) currentList.addEventListener("click", handleListClick);

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

  if (helpers) {
    helpers.stampPickerOrders(pickerConfig.listIds);
  }

  var initialId = categoryIdInput.value;
  if (initialId) {
    var initialBtn = overlay.querySelector(
      pickSelector + '[data-category-id="' + initialId + '"]'
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
      var spcCategoryInput = document.getElementById("spcCategoryValue");
      if (spcCategoryInput && name) {
        spcCategoryInput.value = name;
      }
    }
  }

  filterCategories("");
})();
