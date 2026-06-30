// Category image paths for display (app/public/categoryimages/)

const { getStandardCategoryName } = require("./categoryHelpers");

const CATEGORY_IMAGES_BY_NAME = {
  "Bills & Utilities": "/categoryimages/bills.png",
  Bills: "/categoryimages/bills.png",
  Utilities: "/categoryimages/bills.png",
  Groceries: "/categoryimages/food.png",
  Food: "/categoryimages/food.png",
  "Auto & Transport": "/categoryimages/transport.png",
  Transport: "/categoryimages/transport.png",
  Education: "/categoryimages/schools.png",
  School: "/categoryimages/schools.png",
  Entertainment: "/categoryimages/entertainment.png",
  Shopping: "/categoryimages/shopping.png",
  "Other categories": "",
  Others: "",
  Other: "",
};

const CATEGORY_IMAGES_BY_ICON = {
  bills: "/categoryimages/bills.png",
  entertainment: "/categoryimages/entertainment.png",
  food: "/categoryimages/food.png",
  school: "/categoryimages/schools.png",
  shopping: "/categoryimages/shopping.png",
  transport: "/categoryimages/transport.png",
  others: "",
};

function getCategoryImageUrl(name, icon) {
  const standardName = getStandardCategoryName(name);

  if (standardName && CATEGORY_IMAGES_BY_NAME[standardName]) {
    return CATEGORY_IMAGES_BY_NAME[standardName];
  }

  if (name && CATEGORY_IMAGES_BY_NAME[name]) {
    return CATEGORY_IMAGES_BY_NAME[name];
  }

  if (icon && CATEGORY_IMAGES_BY_ICON[icon]) {
    return CATEGORY_IMAGES_BY_ICON[icon];
  }

  return "";
}

module.exports = {
  getCategoryImageUrl,
  CATEGORY_IMAGES_BY_NAME,
  CATEGORY_IMAGES_BY_ICON,
};
