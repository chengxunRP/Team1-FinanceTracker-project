// Spending & Budgets page — Add Budget modal posts to /budget/add or /budget/add-overall.
(function () {
  "use strict";

  var pageData = {};
  var selectedCategoryId = null;
  var selectedCategoryName = null;
  var selectedBudgetType = "category";

  var overlay = document.getElementById("addBudgetOverlay");
  var categoryPickerStep = document.getElementById("categoryPickerStep");
  var createCategoryStep = document.getElementById("createCategoryStep");
  var editCategoryStep = document.getElementById("editCategoryStep");
  var amountStep = document.getElementById("amountStep");
  var categorySearch = document.getElementById("categorySearch");
  var categoryList = document.getElementById("categoryList");
  var customCategoryList = document.getElementById("customCategoryList");
  var allCategoriesList = document.getElementById("allCategoriesList");
  var yourCategoriesSection = document.getElementById("yourCategoriesSection");
  var allCategoriesSection = document.getElementById("allCategoriesSection");
  var generalCategoriesSection = document.getElementById("generalCategoriesSection");
  var deleteCategoryOverlay = document.getElementById("deleteCategoryOverlay");
  var deleteCategoryNameEl = document.getElementById("deleteCategoryName");
  var editCategoryNameInput = document.getElementById("editCategoryName");
  var editCategoryError = document.getElementById("editCategoryError");
  var editingCategoryId = null;
  var pendingDeleteCategoryId = null;
  var selectedCategoryNameEl = document.getElementById("selectedCategoryName");
  var budgetAmountInput = document.getElementById("budgetAmountInput");
  var budgetFormError = document.getElementById("budgetFormError");
  var newCategoryNameInput = document.getElementById("newCategoryName");
  var createCategoryError = document.getElementById("createCategoryError");
  var createCategorySuccess = document.getElementById("createCategorySuccess");
  var selectedCategorySpent = 0;
  var addBudgetHeader = document.getElementById("addBudgetHeader");
  var addBudgetSearch = document.getElementById("addBudgetSearch");
  var budgetSpentNote = document.getElementById("budgetSpentNote");
  var saveBudgetBtn = document.getElementById("saveBudgetBtn");
  var currentMonthName = "this month";
  var DEFAULT_COLOR = "#22c55e";
  var colourPickerTarget = null;
  var newCategoryColorInput = document.getElementById("newCategoryColor");
  var newCategoryIconInput = document.getElementById("newCategoryIcon");
  var newCategoryColourCircle = document.getElementById("newCategoryColourCircle");
  var editCategoryColorInput = document.getElementById("editCategoryColor");
  var editCategoryIconInput = document.getElementById("editCategoryIcon");
  var editCategoryColourCircle = document.getElementById("editCategoryColourCircle");
  var chooseColourOverlay = document.getElementById("chooseColourOverlay");
  var chooseColourBody = document.getElementById("chooseColourBody");
  var customColourInput = document.getElementById("customColourInput");
  var colourApi = window.SwCategoryColours;

  function sanitizeColour(value) {
    if (colourApi && colourApi.sanitizeHex) return colourApi.sanitizeHex(value);
    var v = String(value || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toLowerCase() : DEFAULT_COLOR;
  }

  function getSelectedColourForTarget(target) {
    var input = target === "edit" ? editCategoryColorInput : newCategoryColorInput;
    var raw = input ? input.value : "";
    return raw ? sanitizeColour(raw) : "";
  }

  function updateColourCircle(circleEl, color, fileInput, existingImageUrl) {
    if (!circleEl) return;
    circleEl.classList.remove("spb-colour-preview--filled", "spb-colour-preview--light");
    circleEl.style.backgroundColor = "";
    circleEl.innerHTML = "";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      var uploadImg = document.createElement("img");
      uploadImg.src = URL.createObjectURL(fileInput.files[0]);
      uploadImg.alt = "";
      uploadImg.className = "spb-colour-preview__img";
      circleEl.appendChild(uploadImg);
      circleEl.classList.add("spb-colour-preview--filled");
      return;
    }

    if (existingImageUrl) {
      var existingImg = document.createElement("img");
      existingImg.src = existingImageUrl;
      existingImg.alt = "";
      existingImg.className = "spb-colour-preview__img";
      circleEl.appendChild(existingImg);
      circleEl.classList.add("spb-colour-preview--filled");
      return;
    }

    if (color) {
      circleEl.style.backgroundColor = color;
      circleEl.classList.add("spb-colour-preview--filled");
      if (colourApi && colourApi.isLightColour && colourApi.isLightColour(color)) {
        circleEl.classList.add("spb-colour-preview--light");
      }
      return;
    }

    circleEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" width="36" height="36" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8.5 12h7M12 8.5v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      "</svg>";
  }

  function refreshCreateColourPreview() {
    updateColourCircle(
      newCategoryColourCircle,
      getSelectedColourForTarget("create"),
      newCategoryIconInput,
      null
    );
  }

  function refreshEditColourPreview() {
    var selected = (pageData.availableCategories || []).find(function (cat) {
      return String(cat.id) === String(editingCategoryId);
    });
    updateColourCircle(
      editCategoryColourCircle,
      getSelectedColourForTarget("edit"),
      editCategoryIconInput,
      selected && selected.iconImage ? selected.iconImage : null
    );
  }

  function highlightColourPickerSelection(selectedHex) {
    if (!chooseColourBody) return;
    var swatches = chooseColourBody.querySelectorAll(".spb-colour-swatch");
    for (var i = 0; i < swatches.length; i++) {
      var match = swatches[i].getAttribute("data-color") === selectedHex;
      swatches[i].classList.toggle("spb-colour-swatch--selected", match);
      swatches[i].setAttribute("aria-pressed", match ? "true" : "false");
    }
  }

  function applySelectedColour(hex) {
    var colour = sanitizeColour(hex);
    if (colourPickerTarget === "edit") {
      if (editCategoryIconInput) editCategoryIconInput.value = "";
      if (editCategoryColorInput) editCategoryColorInput.value = colour;
      refreshEditColourPreview();
    } else {
      if (newCategoryIconInput) newCategoryIconInput.value = "";
      if (newCategoryColorInput) newCategoryColorInput.value = colour;
      refreshCreateColourPreview();
    }
    if (customColourInput) customColourInput.value = colour;
    highlightColourPickerSelection(colour);
  }

  function buildColourPicker() {
    if (!chooseColourBody || !colourApi) return;
    chooseColourBody.innerHTML = "";
    colourApi.groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "spb-colour-picker__section";

      var heading = document.createElement("h3");
      heading.className = "spb-colour-picker__heading";
      heading.textContent = group.name;
      section.appendChild(heading);

      var grid = document.createElement("div");
      grid.className = "spb-colour-picker__grid";

      group.colours.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "spb-colour-swatch";
        btn.setAttribute("data-color", item.hex);
        btn.setAttribute("aria-label", item.name);
        btn.setAttribute("aria-pressed", "false");
        btn.style.setProperty("--swatch", item.hex);
        if (colourApi.isLightColour(item.hex)) {
          btn.classList.add("spb-colour-swatch--light");
        }
        btn.addEventListener("click", function () {
          applySelectedColour(item.hex);
          closeChooseColourModal();
        });
        grid.appendChild(btn);
      });

      section.appendChild(grid);
      chooseColourBody.appendChild(section);
    });
  }

  function openChooseColourModal(target) {
    colourPickerTarget = target || "create";
    if (!chooseColourOverlay) return;
    buildColourPicker();
    var current = getSelectedColourForTarget(colourPickerTarget) || DEFAULT_COLOR;
    if (customColourInput) customColourInput.value = current;
    highlightColourPickerSelection(getSelectedColourForTarget(colourPickerTarget));
    chooseColourOverlay.scrollTop = 0;
    chooseColourOverlay.hidden = false;
  }

  function closeChooseColourModal() {
    if (chooseColourOverlay) chooseColourOverlay.hidden = true;
    colourPickerTarget = null;
  }

  function isLightCategoryColour(hex) {
    if (colourApi && colourApi.isLightColour) return colourApi.isLightColour(hex);
    var value = String(hex || "").trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return false;
    var r = parseInt(value.slice(1, 3), 16);
    var g = parseInt(value.slice(3, 5), 16);
    var b = parseInt(value.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  }

  function getCategoryIconImage(cat) {
    if (!cat) return null;
    return cat.iconImage || cat.icon_image || null;
  }

  function renderCategoryIconHtml(cat) {
    var sizeClass = "sw-category-icon--sm";
    var iconImage = getCategoryIconImage(cat);
    if (iconImage) {
      return (
        '<span class="sw-category-icon ' + sizeClass + ' sw-category-icon--upload">' +
        '<img src="' + iconImage + '" class="sw-category-icon__img sw-category-icon__img--upload" alt="" loading="lazy"></span>'
      );
    }
    if (cat && !cat.isCustom && cat.generalIconUrl) {
      return (
        '<span class="sw-category-icon ' + sizeClass + '">' +
        '<img src="' + cat.generalIconUrl + '" class="sw-category-icon__img" alt="" loading="lazy"></span>'
      );
    }
    var color = cat && cat.isCustom && cat.color ? sanitizeColour(cat.color) : "";
    if (color) {
      var lightClass = isLightCategoryColour(color) ? " sw-category-icon--custom-color-light" : "";
      return (
        '<span class="sw-category-icon ' + sizeClass + ' sw-category-icon--custom-color' + lightClass + '" style="--sw-cat-color:' + color + '">' +
        '<span class="sw-category-icon__fallback" aria-hidden="true"></span></span>'
      );
    }
    return (
      '<span class="sw-category-icon ' + sizeClass + '">' +
      '<span class="sw-category-icon__fallback" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" width="20" height="20">' +
      '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75"/>' +
      '<path d="M8.5 12h7M12 8.5v7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
      "</svg></span></span>"
    );
  }

  function loadPageData() {
    var el = document.getElementById("budgetPageData");
    if (!el || !el.textContent) return;
    try {
      pageData = JSON.parse(el.textContent);
      currentMonthName = pageData.currentMonthName || currentMonthName;
      if (!pageData.availableCategories) pageData.availableCategories = [];
    } catch (e) {
      pageData = { availableCategories: [] };
    }
  }

  function openModal() {
    if (!overlay) return;
    resetModal();
    overlay.hidden = false;
    if (window.SwModalScroll) {
      SwModalScroll.onOpen(overlay);
    } else {
      overlay.scrollTop = 0;
    }
    if (categorySearch) categorySearch.focus();
  }

  function closeModal() {
    if (!overlay) return;
    overlay.hidden = true;
    if (window.SwModalScroll) {
      SwModalScroll.onClose();
    }
    resetModal();
  }

  function resetModal() {
    selectedCategoryId = null;
    selectedCategoryName = null;
    selectedCategorySpent = 0;
    selectedBudgetType = "category";
    if (addBudgetHeader) addBudgetHeader.hidden = false;
    if (addBudgetSearch) addBudgetSearch.hidden = false;
    if (categoryPickerStep) categoryPickerStep.hidden = false;
    if (createCategoryStep) createCategoryStep.hidden = true;
    if (editCategoryStep) editCategoryStep.hidden = true;
    if (amountStep) amountStep.hidden = true;
    if (categorySearch) categorySearch.value = "";
    if (budgetAmountInput) budgetAmountInput.value = "";
    if (budgetFormError) budgetFormError.hidden = true;
    if (newCategoryNameInput) newCategoryNameInput.value = "";
    if (createCategoryError) createCategoryError.hidden = true;
    if (createCategorySuccess) createCategorySuccess.hidden = true;
    closeChooseColourModal();
    closeAllCategoryMenus();
    closeDeleteCategoryDialog();
    editingCategoryId = null;
    pendingDeleteCategoryId = null;
    closeChooseColourModal();
    filterCategories("");
    clearCategorySelection();
  }

  function showCreateCategoryStep() {
    if (addBudgetHeader) addBudgetHeader.hidden = true;
    if (addBudgetSearch) addBudgetSearch.hidden = true;
    if (categoryPickerStep) categoryPickerStep.hidden = true;
    if (amountStep) amountStep.hidden = true;
    if (createCategoryStep) createCategoryStep.hidden = false;
    if (createCategoryError) createCategoryError.hidden = true;
    if (createCategorySuccess) createCategorySuccess.hidden = true;
    if (newCategoryNameInput) {
      newCategoryNameInput.value = "";
    }
    if (newCategoryColorInput) newCategoryColorInput.value = "";
    if (newCategoryIconInput) newCategoryIconInput.value = "";
    refreshCreateColourPreview();
  }

  function showCategoryPickerStep() {
    if (addBudgetHeader) addBudgetHeader.hidden = false;
    if (addBudgetSearch) addBudgetSearch.hidden = false;
    if (categoryPickerStep) categoryPickerStep.hidden = false;
    if (createCategoryStep) createCategoryStep.hidden = true;
    if (editCategoryStep) editCategoryStep.hidden = true;
    if (amountStep) amountStep.hidden = true;
    if (createCategoryError) createCategoryError.hidden = true;
    if (createCategorySuccess) createCategorySuccess.hidden = true;
    editingCategoryId = null;
    closeChooseColourModal();
    closeAllCategoryMenus();
  }

  function showAmountStep() {
    if (addBudgetHeader) addBudgetHeader.hidden = true;
    if (addBudgetSearch) addBudgetSearch.hidden = true;
    if (categoryPickerStep) categoryPickerStep.hidden = true;
    if (createCategoryStep) createCategoryStep.hidden = true;
    if (editCategoryStep) editCategoryStep.hidden = true;
    if (amountStep) amountStep.hidden = false;
    if (budgetFormError) budgetFormError.hidden = true;
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

  function closeAllCategoryMenus() {
    var menus = document.querySelectorAll(".spb-category-menu");
    for (var i = 0; i < menus.length; i++) {
      menus[i].hidden = true;
    }
    var buttons = document.querySelectorAll(".spb-category-menu-btn");
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute("aria-expanded", "false");
    }
  }

  function closeDeleteCategoryDialog() {
    if (deleteCategoryOverlay) deleteCategoryOverlay.hidden = true;
    pendingDeleteCategoryId = null;
  }

  function openDeleteCategoryDialog(categoryId, categoryName) {
    pendingDeleteCategoryId = categoryId;
    if (deleteCategoryNameEl) deleteCategoryNameEl.textContent = categoryName || "this category";
    if (deleteCategoryOverlay) deleteCategoryOverlay.hidden = false;
  }

  function showEditCategoryStep(categoryId, categoryName) {
    editingCategoryId = categoryId;
    if (addBudgetHeader) addBudgetHeader.hidden = true;
    if (addBudgetSearch) addBudgetSearch.hidden = true;
    if (categoryPickerStep) categoryPickerStep.hidden = true;
    if (createCategoryStep) createCategoryStep.hidden = true;
    if (editCategoryStep) editCategoryStep.hidden = false;
    if (amountStep) amountStep.hidden = true;
    if (editCategoryError) editCategoryError.hidden = true;
    if (editCategoryNameInput) {
      editCategoryNameInput.value = categoryName || "";
      editCategoryNameInput.focus();
    }
    var selected = (pageData.availableCategories || []).find(function (cat) {
      return String(cat.id) === String(categoryId);
    });
    if (editCategoryColorInput) {
      if (selected && selected.iconImage) {
        editCategoryColorInput.value = "";
      } else {
        editCategoryColorInput.value = (selected && selected.color) ? sanitizeColour(selected.color) : "";
      }
    }
    if (editCategoryIconInput) editCategoryIconInput.value = "";
    refreshEditColourPreview();
    closeAllCategoryMenus();
  }

  function clearCategorySelection() {
    var items = document.querySelectorAll(
      "#categoryList .spb-category-item, #customCategoryList .spb-category-item, #allCategoriesList .spb-category-item"
    );
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("spb-category-item--selected");
    }
    var rows = document.querySelectorAll(".spb-category-row");
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.remove("spb-category-row--selected");
    }
  }

  function filterCategories(query) {
    var q = (query || "").toLowerCase().trim();
    var visibleCustom = 0;
    var visibleAll = 0;
    var visibleGeneral = 0;

    if (customCategoryList) {
      var customItems = customCategoryList.querySelectorAll(".spb-category-row");
      for (var i = 0; i < customItems.length; i++) {
        var customRow = customItems[i];
        var customBtn = customRow.querySelector(".spb-category-item");
        var customName = customBtn
          ? (customBtn.getAttribute("data-category-name") || "").toLowerCase()
          : "";
        var customMatch = !q || customName.indexOf(q) !== -1;
        customRow.hidden = !customMatch;
        if (customMatch) visibleCustom += 1;
      }
      customCategoryList.hidden = visibleCustom === 0;
    }

    if (allCategoriesList) {
      var allItems = allCategoriesList.querySelectorAll("li");
      for (var a = 0; a < allItems.length; a++) {
        var allLi = allItems[a];
        var allBtn = allLi.querySelector(".spb-category-item");
        var allName = allBtn
          ? (allBtn.getAttribute("data-category-name") || "").toLowerCase()
          : "";
        var allMatch = !q || allName.indexOf(q) !== -1;
        allLi.hidden = !allMatch;
        if (allMatch) visibleAll += 1;
      }
    }

    if (allCategoriesSection) {
      allCategoriesSection.hidden = visibleAll === 0;
    }

    if (categoryList) {
      var generalItems = categoryList.querySelectorAll("li");
      for (var j = 0; j < generalItems.length; j++) {
        var generalLi = generalItems[j];
        var generalBtn = generalLi.querySelector(".spb-category-item");
        var generalName = generalBtn
          ? (generalBtn.getAttribute("data-category-name") || "").toLowerCase()
          : "";
        var generalMatch = !q || generalName.indexOf(q) !== -1;
        generalLi.hidden = !generalMatch;
        if (generalMatch) visibleGeneral += 1;
      }
    }

    if (generalCategoriesSection) {
      generalCategoriesSection.hidden = visibleGeneral === 0;
    }
  }

  function buildCustomCategoryListItem(cat) {
    var displayName = cat.displayName || cat.name || "";
    var li = document.createElement("li");
    li.className = "spb-category-row" + (cat.hasBudget ? " spb-category-row--budgeted" : "");
    li.setAttribute("data-category-id", String(cat.id));

    var main = document.createElement("div");
    main.className = "spb-category-row__main";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "spb-category-item spb-category-item--grow" +
      (cat.hasBudget ? " spb-category-item--budgeted" : "");
    btn.setAttribute("data-category-id", String(cat.id));
    btn.setAttribute("data-category-name", displayName);
    btn.setAttribute("data-spent", String(cat.spentThisMonth || 0));
    btn.setAttribute("data-has-budget", cat.hasBudget ? "1" : "0");
    if (cat.hasBudget) btn.setAttribute("aria-disabled", "true");

    var iconWrap = document.createElement("span");
    iconWrap.innerHTML = renderCategoryIconHtml(cat);
    var iconEl = iconWrap.firstChild;
    if (iconEl) iconEl.setAttribute("title", displayName);

    var nameSpan = document.createElement("span");
    nameSpan.className = "spb-category-item__name";
    nameSpan.textContent = displayName;

    btn.appendChild(iconEl);
    btn.appendChild(nameSpan);

    var menuWrap = document.createElement("div");
    menuWrap.className = "spb-category-row__menu-wrap";
    menuWrap.innerHTML =
      '<button type="button" class="spb-category-menu-btn" aria-label="Category options" aria-haspopup="true" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="5" r="1.5" fill="currentColor"/>' +
      '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>' +
      "</button>" +
      '<div class="spb-category-menu" hidden role="menu">' +
      '<button type="button" class="spb-category-menu__item" data-action="edit" role="menuitem">' +
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4l10.5-10.5a1.5 1.5 0 00-2.12-2.12L5.88 17.88 4 20z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/></svg>' +
      "Edit</button>" +
      '<button type="button" class="spb-category-menu__item spb-category-menu__item--danger" data-action="delete" role="menuitem">' +
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "Delete</button></div>";

    var radioSpan = document.createElement("span");
    radioSpan.className = "spb-category-item__radio";
    radioSpan.setAttribute("aria-hidden", "true");

    main.appendChild(btn);
    main.appendChild(menuWrap);
    main.appendChild(radioSpan);
    li.appendChild(main);
    return li;
  }

  function buildCategoryListItem(cat) {
    var displayName = cat.displayName || cat.name || "";
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "spb-category-item" + (cat.hasBudget ? " spb-category-item--budgeted" : "");
    btn.setAttribute("data-category-id", String(cat.id));
    btn.setAttribute("data-category-name", displayName);
    btn.setAttribute("data-spent", String(cat.spentThisMonth || 0));
    btn.setAttribute("data-has-budget", cat.hasBudget ? "1" : "0");
    if (cat.hasBudget) btn.setAttribute("aria-disabled", "true");

    var iconWrap = document.createElement("span");
    iconWrap.innerHTML = renderCategoryIconHtml(cat);
    var iconEl = iconWrap.firstChild;
    if (iconEl) iconEl.setAttribute("title", displayName);

    var nameSpan = document.createElement("span");
    nameSpan.className = "spb-category-item__name";
    nameSpan.textContent = displayName;

    var radioSpan = document.createElement("span");
    radioSpan.className = "spb-category-item__radio";
    radioSpan.setAttribute("aria-hidden", "true");

    btn.appendChild(iconEl);
    btn.appendChild(nameSpan);
    btn.appendChild(radioSpan);
    li.appendChild(btn);
    return li;
  }

  function appendCustomCategory(cat) {
    if (!customCategoryList) return;

    var enriched = {
      id: cat.id,
      name: cat.name,
      displayName: cat.displayName || cat.name,
      icon: cat.icon || "default-category",
      iconImage: getCategoryIconImage(cat),
      color: cat.color || null,
      spentThisMonth: 0,
      hasBudget: false,
      isCustom: true,
    };

    pageData.availableCategories = pageData.availableCategories || [];
    pageData.availableCategories.push(enriched);

    var items = customCategoryList.querySelectorAll(".spb-category-row");
    var li = buildCustomCategoryListItem(enriched);
    var inserted = false;

    for (var i = 0; i < items.length; i++) {
      var existingName = items[i].querySelector(".spb-category-item__name");
      if (
        existingName &&
        enriched.displayName.localeCompare(existingName.textContent, undefined, { sensitivity: "base" }) < 0
      ) {
        customCategoryList.insertBefore(li, items[i]);
        inserted = true;
        break;
      }
    }

    if (!inserted) customCategoryList.appendChild(li);
    filterCategories(categorySearch ? categorySearch.value : "");
  }

  function removeCustomCategoryFromList(categoryId) {
    if (!customCategoryList) return;
    var row = customCategoryList.querySelector(
      '.spb-category-row[data-category-id="' + categoryId + '"]'
    );
    if (row) row.remove();
    pageData.availableCategories = (pageData.availableCategories || []).filter(function (cat) {
      return String(cat.id) !== String(categoryId);
    });
    filterCategories(categorySearch ? categorySearch.value : "");
  }

  function updateCustomCategoryInList(category) {
    if (!customCategoryList) return;
    var row = customCategoryList.querySelector(
      '.spb-category-row[data-category-id="' + category.id + '"]'
    );
    if (!row) return;
    var displayName = category.displayName || category.name;
    var btn = row.querySelector(".spb-category-item");
    if (btn) {
      btn.setAttribute("data-category-name", displayName);
      var nameEl = btn.querySelector(".spb-category-item__name");
      if (nameEl) nameEl.textContent = displayName;
    }
    pageData.availableCategories = (pageData.availableCategories || []).map(function (cat) {
      if (String(cat.id) === String(category.id)) {
        return {
          id: category.id,
          name: category.name,
          displayName: displayName,
          icon: category.icon || cat.icon,
          iconImage: getCategoryIconImage(category) || getCategoryIconImage(cat),
          color: category.color || cat.color,
          spentThisMonth: cat.spentThisMonth || 0,
          hasBudget: cat.hasBudget || false,
          isCustom: true,
        };
      }
      return cat;
    });
  }

  function getCreateVisualType() {
    if (newCategoryIconInput && newCategoryIconInput.files && newCategoryIconInput.files[0]) {
      return "image";
    }
    if (newCategoryColorInput && newCategoryColorInput.value) {
      return "color";
    }
    return "none";
  }

  function getEditVisualType() {
    if (editCategoryIconInput && editCategoryIconInput.files && editCategoryIconInput.files[0]) {
      return "image";
    }
    if (editCategoryColorInput && editCategoryColorInput.value) {
      return "color";
    }
    var selected = (pageData.availableCategories || []).find(function (cat) {
      return String(cat.id) === String(editingCategoryId);
    });
    if (selected && selected.iconImage) {
      return "image";
    }
    if (selected && selected.color) {
      return "color";
    }
    return "none";
  }

  function createCategoryFormData(name) {
    var fd = new FormData();
    fd.append("name", name);
    var visualType = getCreateVisualType();
    fd.append("visualType", visualType);
    if (visualType === "color") {
      fd.append("color", sanitizeColour(newCategoryColorInput.value));
    }
    if (visualType === "image" && newCategoryIconInput && newCategoryIconInput.files[0]) {
      fd.append("categoryIcon", newCategoryIconInput.files[0]);
    }
    return fd;
  }

  function editCategoryFormData(name) {
    var fd = new FormData();
    fd.append("name", name);
    var visualType = getEditVisualType();
    fd.append("visualType", visualType);
    if (visualType === "color") {
      fd.append("color", sanitizeColour(editCategoryColorInput.value));
    }
    if (visualType === "image" && editCategoryIconInput && editCategoryIconInput.files[0]) {
      fd.append("categoryIcon", editCategoryIconInput.files[0]);
    }
    return fd;
  }

  function saveEditCategory() {
    if (!editCategoryNameInput || !editingCategoryId) return;
    var name = editCategoryNameInput.value.trim();
    if (editCategoryError) editCategoryError.hidden = true;
    if (!name) {
      if (editCategoryError) {
        editCategoryError.textContent = "Category name is required.";
        editCategoryError.hidden = false;
      }
      return;
    }

    fetch("/categories/api/" + editingCategoryId, {
      method: "PUT",
      body: editCategoryFormData(name),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success && result.data.category) {
          updateCustomCategoryInList(result.data.category);
          editingCategoryId = null;
          showCategoryPickerStep();
          return;
        }
        if (editCategoryError) {
          editCategoryError.textContent =
            (result.data.errors && result.data.errors[0]) || "Unable to update category.";
          editCategoryError.hidden = false;
        }
      })
      .catch(function () {
        if (editCategoryError) {
          editCategoryError.textContent = "Unable to update category. Please try again.";
          editCategoryError.hidden = false;
        }
      });
  }

  function confirmDeleteCategory() {
    if (!pendingDeleteCategoryId) return;
    var categoryId = pendingDeleteCategoryId;
    closeDeleteCategoryDialog();

    fetch("/categories/api/" + categoryId, { method: "DELETE" })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success) {
          removeCustomCategoryFromList(categoryId);
          showCategoryPickerStep();
          return;
        }
        window.alert(
          (result.data.errors && result.data.errors[0]) ||
            "Unable to delete category. Please try again."
        );
      })
      .catch(function () {
        window.alert("Unable to delete category. Please try again.");
      });
  }

  function createCategory() {
    if (!newCategoryNameInput) return;

    var name = newCategoryNameInput.value.trim();
    if (createCategoryError) createCategoryError.hidden = true;
    if (createCategorySuccess) createCategorySuccess.hidden = true;

    if (!name) {
      if (createCategoryError) {
        createCategoryError.textContent = "Category name is required.";
        createCategoryError.hidden = false;
      }
      return;
    }

    fetch("/categories/api", {
      method: "POST",
      body: createCategoryFormData(name),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success && result.data.category) {
          appendCustomCategory(result.data.category);
          if (createCategorySuccess) {
            createCategorySuccess.textContent =
              '"' + (result.data.category.displayName || result.data.category.name) + '" was created.';
            createCategorySuccess.hidden = false;
          }
          window.setTimeout(function () {
            showCategoryPickerStep();
          }, 600);
          return;
        }
        if (createCategoryError) {
          createCategoryError.textContent =
            (result.data.errors && result.data.errors[0]) || "Unable to save category.";
          createCategoryError.hidden = false;
        }
      })
      .catch(function () {
        if (createCategoryError) {
          createCategoryError.textContent = "Unable to save category. Please try again.";
          createCategoryError.hidden = false;
        }
      });
  }

  function selectCategory(btn) {
    if (btn.getAttribute("data-has-budget") === "1") return;

    clearCategorySelection();
    btn.classList.add("spb-category-item--selected");
    var row = btn.closest(".spb-category-row");
    if (row) row.classList.add("spb-category-row--selected");
    selectedBudgetType = "category";
    selectedCategoryId = btn.getAttribute("data-category-id");
    selectedCategoryName = btn.getAttribute("data-category-name");
    selectedCategorySpent = Number(btn.getAttribute("data-spent")) || 0;

    showAmountStep();
  }

  function selectAllCategoriesBudget(btn) {
    if (btn.getAttribute("data-has-budget") === "1") return;

    clearCategorySelection();
    btn.classList.add("spb-category-item--selected");
    selectedBudgetType = "all-categories";
    selectedCategoryId = null;
    selectedCategoryName = "All Transactions";
    selectedCategorySpent = 0;

    showAmountStep();
  }

  function saveBudget() {
    if (!budgetAmountInput) return;

    var amount = budgetAmountInput.value.trim();
    if (budgetFormError) budgetFormError.hidden = true;

    var rolloverToggle = document.getElementById("rolloverToggle");

    if (selectedBudgetType === "all-categories") {
      fetch("/budget/add-overall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          budgetMonth: pageData.budgetMonth,
          monthFromUrl: new URLSearchParams(window.location.search).has("month"),
          rolloverEnabled: rolloverToggle ? rolloverToggle.checked : false,
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
            budgetFormError.textContent =
              (result.data.errors && result.data.errors[0]) || "Unable to save budget.";
            budgetFormError.hidden = false;
          }
        })
        .catch(function () {
          if (budgetFormError) {
            budgetFormError.textContent = "Unable to save budget. Please try again.";
            budgetFormError.hidden = false;
          }
        });
      return;
    }

    if (!selectedCategoryId) return;

    fetch("/budget/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: selectedCategoryId,
        amount: amount,
        budgetMonth: pageData.budgetMonth,
        rolloverEnabled: rolloverToggle ? rolloverToggle.checked : false,
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
  filterCategories("");
  refreshCreateColourPreview();
  refreshEditColourPreview();

  var openChooseColourCreate = document.getElementById("openChooseColourCreate");
  var openChooseColourEdit = document.getElementById("openChooseColourEdit");
  var backFromChooseColour = document.getElementById("backFromChooseColour");
  var closeChooseColour = document.getElementById("closeChooseColour");

  if (openChooseColourCreate) {
    openChooseColourCreate.addEventListener("click", function () {
      openChooseColourModal("create");
    });
  }
  if (openChooseColourEdit) {
    openChooseColourEdit.addEventListener("click", function () {
      openChooseColourModal("edit");
    });
  }
  if (backFromChooseColour) backFromChooseColour.addEventListener("click", closeChooseColourModal);
  if (closeChooseColour) closeChooseColour.addEventListener("click", closeChooseColourModal);
  if (customColourInput) {
    customColourInput.addEventListener("input", function () {
      applySelectedColour(customColourInput.value);
    });
  }
  if (newCategoryIconInput) {
    newCategoryIconInput.addEventListener("change", function () {
      if (newCategoryIconInput.files && newCategoryIconInput.files[0]) {
        if (newCategoryColorInput) newCategoryColorInput.value = "";
      }
      refreshCreateColourPreview();
    });
  }
  if (editCategoryIconInput) {
    editCategoryIconInput.addEventListener("change", function () {
      if (editCategoryIconInput.files && editCategoryIconInput.files[0]) {
        if (editCategoryColorInput) editCategoryColorInput.value = "";
      }
      refreshEditColourPreview();
    });
  }

  var openBtns = document.querySelectorAll(
    "#openAddBudget, #openAddBudgetEmpty, .everything-plus-btn"
  );
  var closeBtn = document.getElementById("closeAddBudget");
  var closeAmountBtn = document.getElementById("closeAddBudgetAmount");
  var backBtn = document.getElementById("backToCategories");
  var openCreateCategoryBtn = document.getElementById("openCreateCategory");
  var backFromCreateCategoryBtn = document.getElementById("backFromCreateCategory");
  var closeCreateCategoryBtn = document.getElementById("closeCreateCategory");
  var cancelCreateCategoryBtn = document.getElementById("cancelCreateCategory");
  var saveCreateCategoryBtn = document.getElementById("saveCreateCategory");
  var cancelEditCategoryBtn = document.getElementById("cancelEditCategory");
  var saveEditCategoryBtn = document.getElementById("saveEditCategory");
  var backFromEditCategoryBtn = document.getElementById("backFromEditCategory");
  var closeEditCategoryBtn = document.getElementById("closeEditCategory");
  var deleteCategoryCancel = document.getElementById("deleteCategoryCancel");
  var deleteCategoryConfirm = document.getElementById("deleteCategoryConfirm");

  for (var b = 0; b < openBtns.length; b++) {
    openBtns[b].addEventListener("click", openModal);
  }
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (closeAmountBtn) closeAmountBtn.addEventListener("click", closeModal);
  if (closeCreateCategoryBtn) closeCreateCategoryBtn.addEventListener("click", closeModal);
  if (openCreateCategoryBtn) openCreateCategoryBtn.addEventListener("click", showCreateCategoryStep);
  if (backFromCreateCategoryBtn) backFromCreateCategoryBtn.addEventListener("click", showCategoryPickerStep);
  if (cancelCreateCategoryBtn) cancelCreateCategoryBtn.addEventListener("click", showCategoryPickerStep);
  if (saveCreateCategoryBtn) saveCreateCategoryBtn.addEventListener("click", createCategory);
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      showCategoryPickerStep();
      clearCategorySelection();
      selectedCategoryId = null;
      selectedCategoryName = null;
      selectedCategorySpent = 0;
      selectedBudgetType = "category";
    });
  }

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (deleteCategoryOverlay && !deleteCategoryOverlay.hidden) return;
      if (chooseColourOverlay && !chooseColourOverlay.hidden) return;
      if (e.target === overlay) closeModal();
    });
  }

  if (deleteCategoryOverlay) {
    deleteCategoryOverlay.addEventListener("click", function (e) {
      if (e.target === deleteCategoryOverlay) closeDeleteCategoryDialog();
    });
  }

  if (categorySearch) {
    categorySearch.addEventListener("input", function () {
      filterCategories(categorySearch.value);
    });
  }

  function handleCategoryListClick(e) {
    if (e.target.closest(".spb-category-menu-btn") || e.target.closest(".spb-category-menu")) {
      return;
    }

    var btn = e.target.closest(".spb-category-item");
    if (!btn) {
      var row = e.target.closest(".spb-category-row");
      if (row && !e.target.closest(".spb-category-row__menu-wrap")) {
        btn = row.querySelector(".spb-category-item");
      }
    }
    if (!btn) return;
    if (btn.getAttribute("data-budget-type") === "all-categories") {
      if (btn.getAttribute("data-has-budget") === "1") return;
      selectAllCategoriesBudget(btn);
      return;
    }
    selectCategory(btn);
  }

  function handleCustomCategoryMenuClick(e) {
    var menuBtn = e.target.closest(".spb-category-menu-btn");
    if (menuBtn) {
      e.preventDefault();
      e.stopPropagation();
      var wrap = menuBtn.closest(".spb-category-row__menu-wrap");
      var menu = wrap ? wrap.querySelector(".spb-category-menu") : null;
      var isOpen = menu && !menu.hidden;
      closeAllCategoryMenus();
      if (menu && !isOpen) {
        menu.hidden = false;
        menuBtn.setAttribute("aria-expanded", "true");
      }
      return;
    }

    var actionBtn = e.target.closest(".spb-category-menu__item");
    if (!actionBtn) return;
    e.preventDefault();
    e.stopPropagation();

    var row = actionBtn.closest(".spb-category-row");
    var categoryBtn = row ? row.querySelector(".spb-category-item") : null;
    if (!categoryBtn) return;

    var categoryId = categoryBtn.getAttribute("data-category-id");
    var categoryName = categoryBtn.getAttribute("data-category-name");
    var action = actionBtn.getAttribute("data-action");
    closeAllCategoryMenus();

    if (action === "edit") {
      showEditCategoryStep(categoryId, categoryName);
      return;
    }
    if (action === "delete") {
      openDeleteCategoryDialog(categoryId, categoryName);
    }
  }

  if (categoryList) categoryList.addEventListener("click", handleCategoryListClick);
  if (allCategoriesList) allCategoriesList.addEventListener("click", handleCategoryListClick);
  if (customCategoryList) {
    customCategoryList.addEventListener("click", handleCategoryListClick);
    customCategoryList.addEventListener("click", handleCustomCategoryMenuClick);
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".spb-category-row__menu-wrap")) {
      closeAllCategoryMenus();
    }
  });

  if (cancelEditCategoryBtn) cancelEditCategoryBtn.addEventListener("click", showCategoryPickerStep);
  if (backFromEditCategoryBtn) backFromEditCategoryBtn.addEventListener("click", showCategoryPickerStep);
  if (closeEditCategoryBtn) closeEditCategoryBtn.addEventListener("click", closeModal);
  if (saveEditCategoryBtn) saveEditCategoryBtn.addEventListener("click", saveEditCategory);
  if (deleteCategoryCancel) deleteCategoryCancel.addEventListener("click", closeDeleteCategoryDialog);
  if (deleteCategoryConfirm) deleteCategoryConfirm.addEventListener("click", confirmDeleteCategory);

  if (saveBudgetBtn) saveBudgetBtn.addEventListener("click", saveBudget);

  if (budgetAmountInput) {
    budgetAmountInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") saveBudget();
    });
  }

  if (newCategoryNameInput) {
    newCategoryNameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") createCategory();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (deleteCategoryOverlay && !deleteCategoryOverlay.hidden) {
        closeDeleteCategoryDialog();
        return;
      }
      if (chooseColourOverlay && !chooseColourOverlay.hidden) {
        closeChooseColourModal();
        return;
      }
      if (createCategoryStep && !createCategoryStep.hidden) {
        showCategoryPickerStep();
        return;
      }
      if (overlay && !overlay.hidden) closeModal();
    }
  });
})();
