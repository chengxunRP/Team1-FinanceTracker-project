(function () {
  "use strict";

  var FUTURE_DATE_ERROR = "The date cannot be later than today.";

  function getTodayLocalDateString() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function initExpenseDateValidation() {
    var dateInput = document.getElementById("date");
    var dateError = document.getElementById("dateError");
    var form = dateInput ? dateInput.closest("form") : null;

    if (!dateInput || !dateError || !form) {
      return;
    }

    function applyValidStyle() {
      dateInput.classList.remove("expense-date-input--invalid");
      dateInput.style.borderColor = "var(--grey-300)";
      dateError.hidden = true;
      dateError.textContent = "";
    }

    function applyInvalidStyle() {
      dateInput.classList.add("expense-date-input--invalid");
      dateInput.style.borderColor = "var(--danger, #dc2626)";
      dateError.textContent = FUTURE_DATE_ERROR;
      dateError.hidden = false;
    }

    function validateDate() {
      var today = getTodayLocalDateString();
      dateInput.max = today;

      var value = dateInput.value;
      if (value && value > today) {
        applyInvalidStyle();
        return false;
      }

      applyValidStyle();
      return true;
    }

    dateInput.max = getTodayLocalDateString();
    dateInput.addEventListener("change", validateDate);
    dateInput.addEventListener("input", validateDate);

    form.addEventListener("submit", function (event) {
      if (!validateDate()) {
        event.preventDefault();
        dateInput.focus();
      }
    });

    validateDate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExpenseDateValidation);
  } else {
    initExpenseDateValidation();
  }
})();
