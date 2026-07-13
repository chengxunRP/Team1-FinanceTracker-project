(function () {
  "use strict";

  var overlay = document.getElementById("expenseCategoryOverlay");
  var openBtn = document.getElementById("openExpenseCategoryPicker");
  var closeBtn = document.getElementById("closeExpenseCategoryPicker");
  var searchInput = document.getElementById("expenseCategorySearch");
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
  var createCategoryFlow = null;

  if (!overlay || !openBtn) return;

  function getTargetFields() {
    var form =
      (openBtn && openBtn.closest("form")) ||
      document.getElementById("spcPurchaseForm") ||
      document.getElementById("expenseForm") ||
      document.getElementById("addExpenseForm");

    if (form) {
      return {
        form: form,
        categoryIdInput:
          form.querySelector("#spcCategoryId") ||
          form.querySelector("#categoryId") ||
          form.querySelector('[name="categoryId"]'),
        categoryLabel:
          form.querySelector("#spcCategoryLabel") ||
          form.querySelector("#expenseCategoryLabel"),
        categoryIconWrap:
          form.querySelector("#spcCategoryIconWrap") ||
          form.querySelector("#expenseCategoryIconWrap"),
        categoryNameInput: form.querySelector("#spcCategoryValue"),
      };
    }

    return {
      form: null,
      categoryIdInput:
        document.getElementById("spcCategoryId") ||
        document.getElementById("categoryId"),
      categoryLabel:
        document.getElementById("spcCategoryLabel") ||
        document.getElementById("expenseCategoryLabel"),
      categoryIconWrap:
        document.getElementById("spcCategoryIconWrap") ||
        document.getElementById("expenseCategoryIconWrap"),
      categoryNameInput: document.getElementById("spcCategoryValue"),
    };
  }

  // Prefer server data-* attributes over possibly browser-restored input values.
  function getSelectedCategoryId() {
    var fields = getTargetFields();
    if (fields.form) {
      var fromForm = fields.form.getAttribute("data-selected-category-id");
      if (fromForm) return String(fromForm);
    }
    if (openBtn) {
      var fromBtn = openBtn.getAttribute("data-selected-category-id");
      if (fromBtn) return String(fromBtn);
    }
    if (fields.categoryIdInput && fields.categoryIdInput.value) {
      return String(fields.categoryIdInput.value);
    }
    return "";
  }

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
    applyPickerState(getSelectedCategoryId());
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
    var id = String(btn.getAttribute("data-category-id") || "").trim();
    var name = String(btn.getAttribute("data-category-name") || "").trim();
    if (!id) return;

    var fields = getTargetFields();

    if (fields.categoryIdInput) fields.categoryIdInput.value = id;
    if (fields.categoryNameInput) fields.categoryNameInput.value = name;

    if (fields.categoryLabel) {
      fields.categoryLabel.textContent = name || "Choose category";
      fields.categoryLabel.classList.toggle(
        "expense-txn__category-value--placeholder",
        !name
      );
    }
    if (fields.categoryIconWrap) {
      var iconEl = btn.querySelector(".sw-category-icon");
      fields.categoryIconWrap.innerHTML = iconEl ? iconEl.outerHTML : "";
    }

    if (fields.form) {
      fields.form.setAttribute("data-selected-category-id", id);
      fields.form.setAttribute("data-selected-category-name", name);
    }
    if (openBtn) {
      openBtn.setAttribute("data-selected-category-id", id);
      openBtn.setAttribute("data-selected-category-name", name);
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

  function findPickButton(target) {
    if (!target || !target.closest) return null;
    var btn = target.closest(pickSelector);
    if (btn) return btn;
    var row = target.closest(".spb-category-row, li");
    if (!row) return null;
    return row.querySelector(pickSelector);
  }

  function handleListClick(e) {
    var btn = findPickButton(e.target);
    if (!btn || !overlay.contains(btn)) return;
    e.preventDefault();
    selectCategory(btn);
  }

  if (window.SwPickerCreateCategory) {
    createCategoryFlow = window.SwPickerCreateCategory.init({
      prefix: "expense",
      onCategoryCreated: function (category) {
        var pickBtn = window.SwPickerCreateCategory.appendCustomCategoryToList(
          customList,
          category,
          pickSelector,
          "expense-cat-pick-item"
        );
        if (yourSection) yourSection.hidden = false;
        filterCategories(searchInput ? searchInput.value : "");
        if (pickBtn) selectCategory(pickBtn);
      },
    });
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

  var submitForm = getTargetFields().form;
  if (submitForm) {
    submitForm.addEventListener("submit", function (e) {
      var fields = getTargetFields();
      var selectedId = getSelectedCategoryId();
      var selectedName =
        (fields.form && fields.form.getAttribute("data-selected-category-name")) ||
        (openBtn && openBtn.getAttribute("data-selected-category-name")) ||
        "";
      if (fields.categoryIdInput && selectedId) {
        fields.categoryIdInput.value = selectedId;
      }
      if (fields.categoryNameInput && selectedName) {
        fields.categoryNameInput.value = selectedName;
      }
      if (!fields.categoryIdInput || !fields.categoryIdInput.value) {
        e.preventDefault();
        openModal();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !overlay || overlay.hidden) return;
    if (createCategoryFlow && createCategoryFlow.isColourOpen()) {
      createCategoryFlow.closeChooseColourModal();
      return;
    }
    if (createCategoryFlow && createCategoryFlow.isCreateStepOpen()) {
      createCategoryFlow.showPickerStep();
      return;
    }
    closeModal();
  });

  if (helpers) {
    helpers.stampPickerOrders(pickerConfig.listIds);
  }

  // Sync form card from server data-* (not browser-restored hidden inputs).
  var initialId = getSelectedCategoryId();
  if (initialId) {
    var initialBtn = overlay.querySelector(
      pickSelector + '[data-category-id="' + initialId + '"]'
    );
    var initialFields = getTargetFields();
    var initialName =
      (initialFields.form &&
        initialFields.form.getAttribute("data-selected-category-name")) ||
      (openBtn && openBtn.getAttribute("data-selected-category-name")) ||
      (initialBtn && initialBtn.getAttribute("data-category-name")) ||
      "";
    initialName = String(initialName || "").trim();

    if (initialFields.categoryIdInput) {
      initialFields.categoryIdInput.value = initialId;
    }
    if (initialFields.categoryNameInput && initialName) {
      initialFields.categoryNameInput.value = initialName;
    }
    if (initialFields.categoryLabel && initialName) {
      initialFields.categoryLabel.textContent = initialName;
      initialFields.categoryLabel.classList.remove(
        "expense-txn__category-value--placeholder"
      );
    }
    if (initialFields.categoryIconWrap && initialBtn) {
      var initialIcon = initialBtn.querySelector(".sw-category-icon");
      if (initialIcon) {
        initialFields.categoryIconWrap.innerHTML = initialIcon.outerHTML;
      }
    }
    if (openBtn) {
      openBtn.setAttribute("data-selected-category-id", initialId);
      if (initialName) {
        openBtn.setAttribute("data-selected-category-name", initialName);
      }
    }
  }

  filterCategories("");
})();
