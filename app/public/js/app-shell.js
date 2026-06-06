(function () {
  "use strict";

  var toggle = document.getElementById("sidebarToggle");
  var backdrop = document.getElementById("sidebarBackdrop");

  function setSidebarOpen(isOpen) {
    document.body.classList.toggle("sidebar-open", isOpen);
    if (toggle) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    if (backdrop) {
      backdrop.hidden = !isOpen;
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setSidebarOpen(!document.body.classList.contains("sidebar-open"));
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setSidebarOpen(false);
    });
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth > 991) {
      setSidebarOpen(false);
    }
  });
})();
