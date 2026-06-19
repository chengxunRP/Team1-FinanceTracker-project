// Rewire the "Add Expenses" sidebar link to the expenses route.
// This file only targets that specific link by its text content.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('.sidebar-link--soon');
    links.forEach(function (link) {
      var span = link.querySelector('span');
      if (span && span.textContent.trim() === 'Add Expenses') {
        link.href = '/expenses';
        link.classList.remove('sidebar-link--soon');
      }
    });
  });
})();
