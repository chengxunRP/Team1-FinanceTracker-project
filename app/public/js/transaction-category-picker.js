(function () {
  "use strict";

  var overlay = document.getElementById("txnCategoryOverlay");
  if (!overlay) return;

  var closeBtn = document.getElementById("closeTxnCategoryPicker");
  var searchInput = document.getElementById("txnCategorySearch");
  var customList = document.getElementById("txnCustomCategoryList");
  var generalList = document.getElementById("txnGeneralCategoryList");
  var currentList = document.getElementById("txnCurrentCategoryList");
  var yourSection = document.getElementById("txnYourCategoriesSection");
  var generalSection = document.getElementById("txnGeneralCategoriesSection");
  var emptyMsg = document.getElementById("txnCategoryEmpty");
  var pickSelector = ".sw-cat-pick-item, .txn-cat-pick-item";
  var pickerConfig = {
    pickSelector: pickSelector,
    listIds: ["txnCustomCategoryList", "txnGeneralCategoryList"],
    currentSectionId: "txnCurrentCategorySection",
    currentListId: "txnCurrentCategoryList",
  };
  var helpers = window.SwCategoryPickerHelpers;
  var saving = false;
  var currentCategoryId = "";
  var currentExpenseId = null;
  var currentBudgetMonth = "";
  var onSavedCallback = null;

  function applyPickerState(categoryId) {
    if (helpers) {
      helpers.applyPickerState(overlay, categoryId, pickerConfig);
    }
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

  function closeModal() {
    overlay.hidden = true;
    if (helpers) {
      helpers.onPickerClose(overlay, pickerConfig);
    }
    saving = false;
    currentExpenseId = null;
    onSavedCallback = null;
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
    }
  }

  function openModal(options) {
    if (!options || !options.expenseId) return;

    currentExpenseId = options.expenseId;
    currentCategoryId = String(options.categoryId || "");
    currentBudgetMonth = String(options.budgetMonth || "");
    onSavedCallback =
      typeof options.onSaved === "function" ? options.onSaved : null;

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
    applyPickerState(currentCategoryId);
  }

  function saveCategory(categoryId) {
    if (!currentExpenseId || saving) return;
    if (String(categoryId) === String(currentCategoryId)) {
      closeModal();
      return;
    }

    saving = true;

    fetch(
      "/expenses/" + encodeURIComponent(currentExpenseId) + "/update-category",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          categoryId: categoryId,
          budgetMonth: currentBudgetMonth,
        }),
      }
    )
      .then(function (response) {
        var contentType = response.headers.get("content-type") || "";
        if (contentType.indexOf("application/json") === -1) {
          if (response.status === 404) {
            throw new Error(
              "Save endpoint not found. Restart the server and try again."
            );
          }
          throw new Error("Unable to save category. Please refresh and try again.");
        }
        return response.json().then(function (data) {
          if (!response.ok || !data.success) {
            throw new Error((data && data.error) || "Unable to save category.");
          }
          return data;
        });
      })
      .then(function (data) {
        if (onSavedCallback) {
          onSavedCallback(data.expense, data.previous);
        }
        closeModal();
      })
      .catch(function (error) {
        window.alert(error.message || "Unable to save category.");
      })
      .finally(function () {
        saving = false;
      });
  }

  function handleListClick(e) {
    var btn = e.target.closest(pickSelector);
    if (!btn || saving) return;
    e.preventDefault();
    var categoryId = btn.getAttribute("data-category-id");
    if (!categoryId) return;
    saveCategory(categoryId);
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterCategories(searchInput.value);
    });
  }

  if (customList) customList.addEventListener("click", handleListClick);
  if (generalList) generalList.addEventListener("click", handleListClick);
  if (currentList) currentList.addEventListener("click", handleListClick);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && !overlay.hidden) {
      e.stopPropagation();
      closeModal();
    }
  });

  if (helpers) {
    helpers.stampPickerOrders(pickerConfig.listIds);
  }

  filterCategories("");

  window.SwTxnCategoryPicker = {
    open: openModal,
    close: closeModal,
  };
})();
