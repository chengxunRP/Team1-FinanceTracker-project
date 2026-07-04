// Sidebar "Add Expenses" links to expenses list with modal deep-link.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var links = document.querySelectorAll(".sidebar-link--soon");
    links.forEach(function (link) {
      var span = link.querySelector("span");
      if (span && span.textContent.trim() === "Add Expenses") {
        link.href = "/expenses?openAdd=1";
        link.classList.remove("sidebar-link--soon");
      }
    });
  });
})();
