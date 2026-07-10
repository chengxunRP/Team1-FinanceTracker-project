(function (global) {
  "use strict";

  var DEFAULT_COLOR = "#22c55e";

  function sanitizeColour(value) {
    var colourApi = global.SwCategoryColours;
    if (colourApi && colourApi.sanitizeHex) return colourApi.sanitizeHex(value);
    var v = String(value || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toLowerCase() : DEFAULT_COLOR;
  }

  function isLightCategoryColour(value) {
    var v = String(value || "");
    if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return false;
    var r = parseInt(v.slice(1, 3), 16);
    var g = parseInt(v.slice(3, 5), 16);
    var b = parseInt(v.slice(5, 7), 16);
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
        '<span class="sw-category-icon ' +
        sizeClass +
        ' sw-category-icon--upload">' +
        '<img src="' +
        iconImage +
        '" class="sw-category-icon__img sw-category-icon__img--upload" alt="" loading="lazy"></span>'
      );
    }
    if (cat && !cat.isCustom && cat.generalIconUrl) {
      return (
        '<span class="sw-category-icon ' +
        sizeClass +
        '">' +
        '<img src="' +
        cat.generalIconUrl +
        '" class="sw-category-icon__img" alt="" loading="lazy"></span>'
      );
    }
    var color = cat && cat.isCustom && cat.color ? sanitizeColour(cat.color) : "";
    if (color) {
      var lightClass = isLightCategoryColour(color)
        ? " sw-category-icon--custom-color-light"
        : "";
      return (
        '<span class="sw-category-icon ' +
        sizeClass +
        " sw-category-icon--custom-color" +
        lightClass +
        '" style="--sw-cat-color:' +
        color +
        '">' +
        '<span class="sw-category-icon__fallback" aria-hidden="true"></span></span>'
      );
    }
    return (
      '<span class="sw-category-icon ' +
      sizeClass +
      '">' +
      '<span class="sw-category-icon__fallback" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" width="20" height="20">' +
      '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75"/>' +
      '<path d="M8.5 12h7M12 8.5v7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
      "</svg></span></span>"
    );
  }

  function buildCustomPickListItem(cat, pickSelector, legacyPickClass) {
    var displayName = cat.displayName || cat.name || "";
    var li = document.createElement("li");
    li.className = "spb-category-row";

    var main = document.createElement("div");
    main.className = "spb-category-row__main spb-category-row__main--pick";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "spb-category-item spb-category-item--grow sw-cat-pick-item" +
      (legacyPickClass ? " " + legacyPickClass : "");
    btn.setAttribute("data-category-id", String(cat.id));
    btn.setAttribute("data-category-name", displayName);

    var iconWrap = document.createElement("span");
    iconWrap.innerHTML = renderCategoryIconHtml(
      Object.assign({}, cat, { isCustom: true })
    );
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
    main.appendChild(btn);
    main.appendChild(radioSpan);
    li.appendChild(main);
    return li;
  }

  function appendCustomCategoryToList(customList, cat, pickSelector, legacyPickClass) {
    if (!customList || !cat) return null;

    var enriched = {
      id: cat.id,
      name: cat.name,
      displayName: cat.displayName || cat.name,
      icon: cat.icon || "default-category",
      iconImage: getCategoryIconImage(cat),
      color: cat.color || null,
      isCustom: true,
    };

    var items = customList.querySelectorAll(".spb-category-row");
    var li = buildCustomPickListItem(enriched, pickSelector, legacyPickClass);
    var inserted = false;
    var displayName = enriched.displayName;

    for (var i = 0; i < items.length; i++) {
      var existingName = items[i].querySelector(".spb-category-item__name");
      if (
        existingName &&
        displayName.localeCompare(existingName.textContent, undefined, {
          sensitivity: "base",
        }) < 0
      ) {
        customList.insertBefore(li, items[i]);
        inserted = true;
        break;
      }
    }

    if (!inserted) customList.appendChild(li);
    return li.querySelector(pickSelector.split(",")[0].trim()) || li.querySelector("button");
  }

  function init(config) {
    if (!config || !config.prefix) return null;

    var prefix = config.prefix;
    var pickerStep = document.getElementById(prefix + "CategoryPickerStep");
    var createStep = document.getElementById(prefix + "CreateCategoryStep");
    var pickerHeader = pickerStep
      ? pickerStep.querySelector(".spb-modal__header")
      : null;
    var searchWrap = document.getElementById(prefix + "CategorySearchWrap");
    var pickerBody = pickerStep
      ? pickerStep.querySelector(".spb-modal__body")
      : null;
    var openBtn = document.getElementById(
      prefix === "txn" ? "openTxnCreateCategory" : "openExpenseCreateCategory"
    );
    var nameInput = document.getElementById(prefix + "NewCategoryName");
    var colorInput = document.getElementById(prefix + "NewCategoryColor");
    var iconInput = document.getElementById(prefix + "NewCategoryIcon");
    var colourCircle = document.getElementById(prefix + "NewCategoryColourCircle");
    var errorEl = document.getElementById(prefix + "CreateCategoryError");
    var successEl = document.getElementById(prefix + "CreateCategorySuccess");
    var chooseColourOverlay = document.getElementById(prefix + "ChooseColourOverlay");
    var chooseColourBody = document.getElementById(prefix + "ChooseColourBody");
    var customColourInput = document.getElementById(prefix + "CustomColourInput");
    var colourApi = global.SwCategoryColours;

    if (!createStep || !openBtn || !nameInput) return null;

    function updateColourPreview() {
      if (!colourCircle) return;
      colourCircle.classList.remove(
        "spb-colour-preview--filled",
        "spb-colour-preview--light"
      );
      colourCircle.style.backgroundColor = "";
      colourCircle.innerHTML = "";

      if (iconInput && iconInput.files && iconInput.files[0]) {
        var uploadImg = document.createElement("img");
        uploadImg.src = URL.createObjectURL(iconInput.files[0]);
        uploadImg.alt = "";
        uploadImg.className = "spb-colour-preview__img";
        colourCircle.appendChild(uploadImg);
        colourCircle.classList.add("spb-colour-preview--filled");
        return;
      }

      var color = colorInput && colorInput.value ? sanitizeColour(colorInput.value) : "";
      if (color) {
        colourCircle.style.backgroundColor = color;
        colourCircle.classList.add("spb-colour-preview--filled");
        if (colourApi && colourApi.isLightColour && colourApi.isLightColour(color)) {
          colourCircle.classList.add("spb-colour-preview--light");
        }
        return;
      }

      colourCircle.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" width="36" height="36" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M8.5 12h7M12 8.5v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        "</svg>";
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
      if (iconInput) iconInput.value = "";
      if (colorInput) colorInput.value = colour;
      updateColourPreview();
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

    function openChooseColourModal() {
      buildColourPicker();
      var current = colorInput && colorInput.value ? sanitizeColour(colorInput.value) : "";
      if (customColourInput) customColourInput.value = current || DEFAULT_COLOR;
      highlightColourPickerSelection(current);
      if (chooseColourOverlay) {
        chooseColourOverlay.hidden = false;
        chooseColourOverlay.scrollTop = 0;
      }
    }

    function setCategoryPickerVisible(visible) {
      if (pickerHeader) pickerHeader.hidden = !visible;
      if (searchWrap) searchWrap.hidden = !visible;
      if (pickerBody) pickerBody.hidden = !visible;
    }

    function closeChooseColourModal() {
      if (chooseColourOverlay) chooseColourOverlay.hidden = true;
    }

    function showPickerStep() {
      setCategoryPickerVisible(true);
      if (createStep) createStep.hidden = true;
      if (errorEl) errorEl.hidden = true;
      if (successEl) successEl.hidden = true;
      closeChooseColourModal();
    }

    function showCreateStep() {
      setCategoryPickerVisible(false);
      if (createStep) createStep.hidden = false;
      if (errorEl) errorEl.hidden = true;
      if (successEl) successEl.hidden = true;
      if (nameInput) {
        nameInput.value = "";
        nameInput.focus();
      }
      if (colorInput) colorInput.value = "";
      if (iconInput) iconInput.value = "";
      updateColourPreview();
    }

    function getCreateVisualType() {
      if (iconInput && iconInput.files && iconInput.files[0]) return "image";
      if (colorInput && colorInput.value) return "color";
      return "none";
    }

    function createCategoryFormData(name) {
      var fd = new FormData();
      fd.append("name", name);
      var visualType = getCreateVisualType();
      fd.append("visualType", visualType);
      if (visualType === "color" && colorInput) {
        fd.append("color", sanitizeColour(colorInput.value));
      }
      if (visualType === "image" && iconInput && iconInput.files[0]) {
        fd.append("categoryIcon", iconInput.files[0]);
      }
      return fd;
    }

    function saveCategory() {
      var name = nameInput.value.trim();
      if (errorEl) errorEl.hidden = true;
      if (successEl) successEl.hidden = true;

      if (!name) {
        if (errorEl) {
          errorEl.textContent = "Category name is required.";
          errorEl.hidden = false;
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
            if (successEl) {
              successEl.textContent =
                '"' +
                (result.data.category.displayName || result.data.category.name) +
                '" was created.';
              successEl.hidden = false;
            }
            var category = result.data.category;
            window.setTimeout(function () {
              showPickerStep();
              if (typeof config.onCategoryCreated === "function") {
                config.onCategoryCreated(category);
              }
            }, 400);
            return;
          }
          if (errorEl) {
            errorEl.textContent =
              (result.data.errors && result.data.errors[0]) ||
              "Unable to save category.";
            errorEl.hidden = false;
          }
        })
        .catch(function () {
          if (errorEl) {
            errorEl.textContent = "Unable to save category. Please try again.";
            errorEl.hidden = false;
          }
        });
    }

    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showCreateStep();
    });

    var backBtn = document.getElementById(prefix + "BackFromCreateCategory");
    var closeCreateBtn = document.getElementById(prefix + "CloseCreateCategory");
    var cancelBtn = document.getElementById(prefix + "CancelCreateCategory");
    var saveBtn = document.getElementById(prefix + "SaveCreateCategory");
    var openColourBtn = document.getElementById(prefix + "OpenChooseColourCreate");

    if (backBtn) backBtn.addEventListener("click", showPickerStep);
    if (closeCreateBtn) closeCreateBtn.addEventListener("click", showPickerStep);
    if (cancelBtn) cancelBtn.addEventListener("click", showPickerStep);
    if (saveBtn) saveBtn.addEventListener("click", saveCategory);
    if (openColourBtn) openColourBtn.addEventListener("click", openChooseColourModal);

    if (iconInput) {
      iconInput.addEventListener("change", updateColourPreview);
    }

    if (nameInput) {
      nameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          saveCategory();
        }
      });
    }

    var backColourBtn = document.getElementById(prefix + "BackFromChooseColour");
    var closeColourBtn = document.getElementById(prefix + "CloseChooseColour");
    if (backColourBtn) backColourBtn.addEventListener("click", closeChooseColourModal);
    if (closeColourBtn) closeColourBtn.addEventListener("click", closeChooseColourModal);

    if (chooseColourOverlay) {
      chooseColourOverlay.addEventListener("click", function (e) {
        if (e.target === chooseColourOverlay) closeChooseColourModal();
      });
    }

    if (customColourInput) {
      customColourInput.addEventListener("input", function () {
        applySelectedColour(customColourInput.value);
      });
    }

    return {
      showPickerStep: showPickerStep,
      showCreateStep: showCreateStep,
      closeChooseColourModal: closeChooseColourModal,
      isCreateStepOpen: function () {
        return createStep && !createStep.hidden;
      },
      isColourOpen: function () {
        return chooseColourOverlay && !chooseColourOverlay.hidden;
      },
    };
  }

  global.SwPickerCreateCategory = {
    init: init,
    appendCustomCategoryToList: appendCustomCategoryToList,
    renderCategoryIconHtml: renderCategoryIconHtml,
  };
})(window);
