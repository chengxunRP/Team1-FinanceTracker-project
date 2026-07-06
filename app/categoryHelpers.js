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
  return name ? String(name).trim() : "";
}

function normalizeIconImagePath(path) {
  if (!path) return null;
  const value = String(path).trim();
  if (!value) return null;
  if (value.startsWith("/")) return value;
  if (value.startsWith("uploads/")) return `/${value.replace(/^\/+/, "")}`;
  return `/uploads/category-icons/${value.replace(/^\/+/, "")}`;
}

function enrichCategory(category) {
  if (!category) return category;

  const displayName = getDisplayCategoryName(category.name);
  const iconImage = normalizeIconImagePath(
    category.iconImage ?? category.icon_image ?? null
  );
  const isCustom =
    Number(category.is_custom ?? category.isCustom) === 1 ||
    category.icon === "default-category";

  return {
    ...category,
    displayName,
    iconImage,
    icon_image: iconImage,
    isCustom,
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

function isCustomCategory(category) {
  return Number(category?.is_custom) === 1;
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
  normalizeIconImagePath,
  compareCategoriesForSort,
  isBillsCategory,
  isCustomCategory,
  getCategoryDisplayNames,
};
