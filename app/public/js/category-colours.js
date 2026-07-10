(function () {
  "use strict";

  var CATEGORY_COLOUR_GROUPS = [
    {
      name: "Basic colours",
      colours: [
        { name: "Black", hex: "#000000" },
        { name: "White", hex: "#ffffff" },
        { name: "Grey", hex: "#64748b" },
        { name: "Red", hex: "#ef4444" },
        { name: "Orange", hex: "#f97316" },
        { name: "Yellow", hex: "#eab308" },
        { name: "Green", hex: "#22c55e" },
        { name: "Blue", hex: "#3b82f6" },
        { name: "Purple", hex: "#8b5cf6" },
        { name: "Pink", hex: "#ec4899" },
        { name: "Brown", hex: "#92400e" },
        { name: "Teal", hex: "#14b8a6" },
      ],
    },
    {
      name: "Red shades",
      colours: [
        { name: "Light red", hex: "#fca5a5" },
        { name: "Red", hex: "#ef4444" },
        { name: "Dark red", hex: "#b91c1c" },
        { name: "Rose", hex: "#f43f5e" },
        { name: "Coral", hex: "#fb7185" },
        { name: "Salmon", hex: "#fda4af" },
      ],
    },
    {
      name: "Orange & yellow",
      colours: [
        { name: "Peach", hex: "#fdba74" },
        { name: "Orange", hex: "#f97316" },
        { name: "Amber", hex: "#f59e0b" },
        { name: "Gold", hex: "#d97706" },
        { name: "Yellow", hex: "#eab308" },
        { name: "Cream", hex: "#fef3c7" },
      ],
    },
    {
      name: "Green shades",
      colours: [
        { name: "Mint", hex: "#6ee7b7" },
        { name: "Light green", hex: "#86efac" },
        { name: "Green", hex: "#22c55e" },
        { name: "Emerald", hex: "#10b981" },
        { name: "Lime", hex: "#84cc16" },
        { name: "Dark green", hex: "#15803d" },
      ],
    },
    {
      name: "Blue shades",
      colours: [
        { name: "Sky blue", hex: "#38bdf8" },
        { name: "Light blue", hex: "#60a5fa" },
        { name: "Blue", hex: "#3b82f6" },
        { name: "Navy", hex: "#1e3a8a" },
        { name: "Indigo", hex: "#6366f1" },
        { name: "Cyan", hex: "#06b6d4" },
      ],
    },
    {
      name: "Purple & pink",
      colours: [
        { name: "Lavender", hex: "#c4b5fd" },
        { name: "Purple", hex: "#8b5cf6" },
        { name: "Violet", hex: "#7c3aed" },
        { name: "Magenta", hex: "#d946ef" },
        { name: "Pink", hex: "#ec4899" },
        { name: "Hot pink", hex: "#db2777" },
      ],
    },
    {
      name: "Neutral shades",
      colours: [
        { name: "White", hex: "#ffffff" },
        { name: "Light grey", hex: "#e2e8f0" },
        { name: "Grey", hex: "#94a3b8" },
        { name: "Dark grey", hex: "#475569" },
        { name: "Black", hex: "#0f172a" },
        { name: "Beige", hex: "#f5f5dc" },
        { name: "Tan", hex: "#d2b48c" },
        { name: "Brown", hex: "#92400e" },
      ],
    },
  ];

  var DEFAULT_COLOUR = "#22c55e";

  function sanitizeHex(input) {
    var value = String(input || "").trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value.toLowerCase();
    return DEFAULT_COLOUR;
  }

  function isLightColour(hex) {
    var c = sanitizeHex(hex).replace("#", "");
    var r = parseInt(c.substring(0, 2), 16);
    var g = parseInt(c.substring(2, 4), 16);
    var b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  }

  window.SwCategoryColours = {
    groups: CATEGORY_COLOUR_GROUPS,
    defaultColour: DEFAULT_COLOUR,
    sanitizeHex: sanitizeHex,
    isLightColour: isLightColour,
  };
})();
