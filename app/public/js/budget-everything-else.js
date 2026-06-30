(function () {
  "use strict";

  var searchInput = document.getElementById("everythingElseSearch");
  var filterEmpty = document.getElementById("everythingElseFilterEmpty");
  var groupsWrap = document.getElementById("everythingElseGroups");

  if (!searchInput || !groupsWrap) return;

  function applySearch() {
    var query = searchInput.value.trim().toLowerCase();
    var groups = groupsWrap.querySelectorAll(".everything-date-group");
    var visibleCount = 0;

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var items = group.querySelectorAll(".everything-transaction-row");
      var groupVisible = 0;

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var haystack = item.getAttribute("data-search") || "";
        var match = !query || haystack.indexOf(query) !== -1;
        item.hidden = !match;
        if (match) groupVisible += 1;
      }

      group.hidden = groupVisible === 0;
      visibleCount += groupVisible;
    }

    if (filterEmpty) {
      filterEmpty.hidden = visibleCount > 0;
    }
  }

  searchInput.addEventListener("input", applySearch);
})();
