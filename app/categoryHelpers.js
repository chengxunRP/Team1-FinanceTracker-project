// Shared category names — single source of truth for display and matching.

const STANDARD_CATEGORY_NAMES = [
  "Bills & Utilities",
  "Groceries",
  "Auto & Transport",
  "Education",
  "Entertainment",
  "Other categories",
  "Shopping",
];

const LEGACY_NAME_TO_STANDARD = {
  Bills: "Bills & Utilities",
  Utilities: "Bills & Utilities",
  Food: "Groceries",
  Transport: "Auto & Transport",
  School: "Education",
  Others: "Other categories",
  Other: "Other categories",
  Entertainment: "Entertainment",
  Shopping: "Shopping",
};

const ALIAS_NAME_TO_STANDARD = {
  "Business Services": "Other categories",
  "Cash & ATM": "Other categories",
  Clothing: "Shopping",
};

function getStandardCategoryName(name) {
  if (!name) return "Other categories";
  if (STANDARD_CATEGORY_NAMES.includes(name)) return name;
  if (LEGACY_NAME_TO_STANDARD[name]) return LEGACY_NAME_TO_STANDARD[name];
  if (ALIAS_NAME_TO_STANDARD[name]) return ALIAS_NAME_TO_STANDARD[name];
  return name;
}

function getDisplayCategoryName(name) {
  return getStandardCategoryName(name);
}

function enrichCategory(category) {
  if (!category) return category;

  const displayName = getDisplayCategoryName(category.name);

  return {
    ...category,
    displayName,
  };
}

function enrichCategories(categories) {
  return (categories || []).map(enrichCategory);
}

function compareCategoriesForSort(a, b) {
  const aName = a.displayName || getDisplayCategoryName(a.name);
  const bName = b.displayName || getDisplayCategoryName(b.name);
  const aIndex = STANDARD_CATEGORY_NAMES.indexOf(aName);
  const bIndex = STANDARD_CATEGORY_NAMES.indexOf(bName);

  if (aIndex !== -1 && bIndex !== -1 && aIndex !== bIndex) {
    return aIndex - bIndex;
  }
  if (aIndex !== -1 && bIndex === -1) return -1;
  if (aIndex === -1 && bIndex !== -1) return 1;
  return aName.localeCompare(bName);
}

function isBillsCategory(category) {
  if (!category) return false;
  return (
    getStandardCategoryName(category.name) === "Bills & Utilities" ||
    category.icon === "bills"
  );
}

function getCategoryDisplayNames(categories) {
  return enrichCategories(categories).map((cat) => cat.displayName);
}

module.exports = {
  STANDARD_CATEGORY_NAMES,
  getStandardCategoryName,
  getDisplayCategoryName,
  enrichCategory,
  enrichCategories,
  compareCategoriesForSort,
  isBillsCategory,
  getCategoryDisplayNames,
};
