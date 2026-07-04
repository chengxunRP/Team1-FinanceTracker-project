// General category icon paths (app/public/categoryicon/)

const { getStandardCategoryName, isCustomCategory, normalizeIconImagePath } = require("./categoryHelpers");

const ICON_BASE = "/categoryicon";

const CATEGORY_IMAGES_BY_ICON = {
  bills: `${ICON_BASE}/bills.png`,
  transport: `${ICON_BASE}/transport.png`,
  food: `${ICON_BASE}/food.png`,
  school: `${ICON_BASE}/schools.png`,
  shopping: `${ICON_BASE}/shopping.png`,
  entertainment: `${ICON_BASE}/entertainment.png`,
  business_services: `${ICON_BASE}/business_services.png`,
  cash_atm: `${ICON_BASE}/cash&atm.png`,
  cheque: `${ICON_BASE}/cheque.png`,
  clothing: `${ICON_BASE}/clothing.png`,
  eatingout: `${ICON_BASE}/eatingout.png`,
  fees: `${ICON_BASE}/fees.jpg`,
  gifts_donation: `${ICON_BASE}/gifts&donation.png`,
  electronics_software: `${ICON_BASE}/electronics&software.png`,
  pets: `${ICON_BASE}/pets.png`,
  home: `${ICON_BASE}/home.png`,
  loan: `${ICON_BASE}/loan.png`,
  sport_fitness: `${ICON_BASE}/sport&fitness.png`,
  investments: `${ICON_BASE}/investments.png`,
  health: `${ICON_BASE}/health&medical.png`,
  health_medical: `${ICON_BASE}/health&medical.png`,
  kid: `${ICON_BASE}/kid.png`,
  creditcard_payment: `${ICON_BASE}/creditcard_payment.png`,
  insurance: `${ICON_BASE}/insurance.png`,
  travel: `${ICON_BASE}/travel.png`,
  others: "",
};

const CATEGORY_IMAGES_BY_NAME = {
  "Bills & Utilities": CATEGORY_IMAGES_BY_ICON.bills,
  Bills: CATEGORY_IMAGES_BY_ICON.bills,
  Utilities: CATEGORY_IMAGES_BY_ICON.bills,
  Groceries: CATEGORY_IMAGES_BY_ICON.food,
  Food: CATEGORY_IMAGES_BY_ICON.food,
  "Auto & Transport": CATEGORY_IMAGES_BY_ICON.transport,
  Transport: CATEGORY_IMAGES_BY_ICON.transport,
  Education: CATEGORY_IMAGES_BY_ICON.school,
  School: CATEGORY_IMAGES_BY_ICON.school,
  Entertainment: CATEGORY_IMAGES_BY_ICON.entertainment,
  Shopping: CATEGORY_IMAGES_BY_ICON.shopping,
  "Other categories": "",
  Others: "",
  Other: "",
};

function getCategoryImageUrl(name, icon) {
  if (icon && Object.prototype.hasOwnProperty.call(CATEGORY_IMAGES_BY_ICON, icon)) {
    return CATEGORY_IMAGES_BY_ICON[icon];
  }

  const standardName = getStandardCategoryName(name);

  if (standardName && CATEGORY_IMAGES_BY_NAME[standardName]) {
    return CATEGORY_IMAGES_BY_NAME[standardName];
  }

  if (name && CATEGORY_IMAGES_BY_NAME[name]) {
    return CATEGORY_IMAGES_BY_NAME[name];
  }

  return "";
}

function getCategoryIconImage(category) {
  return normalizeIconImagePath(
    category?.iconImage ?? category?.icon_image ?? null
  );
}

function getCategoryVisual(category) {
  const cat = category || {};
  const custom =
    isCustomCategory(cat) || cat.isCustom === true || cat.icon === "default-category";

  if (custom) {
    const src = getCategoryIconImage(cat);
    if (src) {
      return { type: "image", src };
    }
    if (cat.color) {
      return { type: "color", color: cat.color };
    }
    return { type: "default" };
  }

  const src = getCategoryImageUrl(cat.name || cat.displayName, cat.icon);
  if (src) {
    return { type: "generalIcon", src };
  }

  return { type: "default" };
}

module.exports = {
  getCategoryImageUrl,
  getCategoryIconImage,
  getCategoryVisual,
  CATEGORY_IMAGES_BY_NAME,
  CATEGORY_IMAGES_BY_ICON,
};
