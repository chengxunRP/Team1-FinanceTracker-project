// Category image paths for display (app/public/categoryimages/)

const CATEGORY_IMAGES_BY_NAME = {
  Bills: "/categoryimages/bills.png",
  Utilities: "/categoryimages/bills.png",
  Entertainment: "/categoryimages/entertainment.png",
  Food: "/categoryimages/food.png",
  School: "/categoryimages/schools.png",
  Shopping: "/categoryimages/shopping.png",
  Transport: "/categoryimages/transport.png",
};

const CATEGORY_IMAGES_BY_ICON = {
  bills: "/categoryimages/bills.png",
  entertainment: "/categoryimages/entertainment.png",
  food: "/categoryimages/food.png",
  school: "/categoryimages/schools.png",
  shopping: "/categoryimages/shopping.png",
  transport: "/categoryimages/transport.png",
};

function getCategoryImageUrl(name, icon) {
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
