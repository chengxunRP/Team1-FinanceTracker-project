(function () {
  "use strict";

  var INVALID_DATE_ERROR = "Please enter a valid date.";
  var REQUIRED_DATE_ERROR = "Date is required.";
  var COMPLETE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function isCompleteDateValue(value) {
    return COMPLETE_DATE_PATTERN.test(value);
  }

  function initExpenseDateValidation() {
    var dateInput = document.getElementById("date");
    var dateError = document.getElementById("dateError");
    var form = dateInput ? dateInput.closest("form") : null;

    if (!dateInput || !dateError || !form) {
      return;
    }

    dateInput.removeAttribute("max");

    function applyValidStyle() {
      dateInput.classList.remove("expense-date-input--invalid");
      dateInput.style.borderColor = "var(--grey-300)";
      dateError.hidden = true;
      dateError.textContent = "";
    }

    function applyInvalidStyle(message) {
      dateInput.classList.add("expense-date-input--invalid");
      dateInput.style.borderColor = "var(--danger, #dc2626)";
      dateError.textContent = message;
      dateError.hidden = false;
    }

    function validateDate() {
      var value = dateInput.value;

      if (!value) {
        applyInvalidStyle(REQUIRED_DATE_ERROR);
        return false;
      }

      if (!isCompleteDateValue(value)) {
        applyInvalidStyle(INVALID_DATE_ERROR);
        return false;
      }

      applyValidStyle();
      return true;
    }

    dateInput.addEventListener("blur", validateDate);
    dateInput.addEventListener("change", validateDate);

    form.addEventListener("submit", function (event) {
      if (!validateDate()) {
        event.preventDefault();
        dateInput.focus();
      }
    });

    if (isCompleteDateValue(dateInput.value)) {
      applyValidStyle();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExpenseDateValidation);
  } else {
    initExpenseDateValidation();
  }
})();
