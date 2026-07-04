"use strict";

const DEFAULT_CUSTOM_ICON_KEY = "default-category";

const LEGACY_STANDARD_ICONS = [
  "food",
  "transport",
  "school",
  "shopping",
  "bills",
  "entertainment",
  "others",
  "health",
  "travel",
];

const CUSTOM_CATEGORY_ICON_GROUPS = [
  {
    group: "Auto & Transport",
    icons: [
      { key: "tow-truck", label: "Tow Truck" },
      { key: "car", label: "Car" },
      { key: "bicycle", label: "Bicycle" },
      { key: "boat", label: "Boat" },
      { key: "bus", label: "Bus" },
      { key: "helicopter", label: "Helicopter" },
      { key: "train", label: "Train" },
      { key: "taxi", label: "Taxi" },
      { key: "scooter", label: "Scooter" },
      { key: "sailboat", label: "Sailboat" },
      { key: "fuel", label: "Fuel" },
      { key: "parking", label: "Parking" },
      { key: "bus-front", label: "Bus Front" },
      { key: "taxi-car", label: "Taxi Car" },
      { key: "motorcycle", label: "Motorcycle" },
      { key: "truck", label: "Truck" },
    ],
  },
  {
    group: "Bills & Utilities",
    icons: [
      { key: "heater", label: "Heater" },
      { key: "vacuum", label: "Vacuum" },
      { key: "plug-home", label: "Plug Home" },
      { key: "fire", label: "Fire" },
      { key: "telephone", label: "Telephone" },
      { key: "tools", label: "Tools" },
      { key: "wifi", label: "Wi-Fi" },
      { key: "phone", label: "Phone" },
      { key: "security-camera", label: "Security Camera" },
      { key: "crossed-tools", label: "Crossed Tools" },
      { key: "water-tap", label: "Water Tap" },
    ],
  },
  {
    group: "Clothing",
    icons: [
      { key: "dress", label: "Dress" },
      { key: "bra", label: "Bra" },
      { key: "shirt", label: "Shirt" },
      { key: "belt", label: "Belt" },
      { key: "onesie", label: "Onesie" },
      { key: "boot", label: "Boot" },
      { key: "hanger", label: "Hanger" },
      { key: "t-shirt", label: "T-Shirt" },
      { key: "sock", label: "Sock" },
      { key: "high-heel", label: "High Heel" },
    ],
  },
  {
    group: "Eating out",
    icons: [
      { key: "cocktail", label: "Cocktail" },
      { key: "beer", label: "Beer" },
      { key: "coffee", label: "Coffee" },
      { key: "dining-table", label: "Dining Table" },
      { key: "serving-tray", label: "Serving Tray" },
      { key: "ice-cream", label: "Ice Cream" },
      { key: "pizza", label: "Pizza" },
      { key: "chopsticks", label: "Chopsticks" },
      { key: "wine", label: "Wine" },
      { key: "burger", label: "Burger" },
      { key: "fries", label: "Fries" },
      { key: "hot-drink", label: "Hot Drink" },
    ],
  },
  {
    group: "Entertainment",
    icons: [
      { key: "ticket", label: "Ticket" },
      { key: "theatre-masks", label: "Theatre Masks" },
      { key: "camera", label: "Camera" },
      { key: "headphones", label: "Headphones" },
      { key: "paint-palette", label: "Paint Palette" },
      { key: "laptop", label: "Laptop" },
      { key: "film", label: "Film" },
      { key: "music-note", label: "Music Note" },
      { key: "playing-cards", label: "Playing Cards" },
      { key: "target", label: "Target" },
      { key: "game-controller", label: "Game Controller" },
    ],
  },
  {
    group: "Family",
    icons: [
      { key: "baby-bottle", label: "Baby Bottle" },
      { key: "alphabet-blocks", label: "Alphabet Blocks" },
      { key: "stroller", label: "Stroller" },
      { key: "family-photo", label: "Family Photo" },
      { key: "balloon", label: "Balloon" },
      { key: "family-frame", label: "Family Frame" },
      { key: "heart-family", label: "Heart Family" },
      { key: "gender-symbols", label: "Gender Symbols" },
      { key: "ring", label: "Ring" },
      { key: "family-group", label: "Family Group" },
    ],
  },
  {
    group: "Groceries",
    icons: [
      { key: "basket", label: "Basket" },
      { key: "bread", label: "Bread" },
      { key: "steak", label: "Steak" },
      { key: "bell-pepper", label: "Bell Pepper" },
      { key: "water-bottle", label: "Water Bottle" },
      { key: "wine-bottle", label: "Wine Bottle" },
      { key: "candy", label: "Candy" },
      { key: "milk", label: "Milk" },
      { key: "carrot", label: "Carrot" },
    ],
  },
  {
    group: "Health & Medical",
    icons: [
      { key: "heart-hand", label: "Heart Hand" },
      { key: "medical-cross", label: "Medical Cross" },
      { key: "pill", label: "Pill" },
      { key: "blood-pressure", label: "Blood Pressure" },
      { key: "stethoscope", label: "Stethoscope" },
      { key: "lungs", label: "Lungs" },
      { key: "thermometer", label: "Thermometer" },
      { key: "pills", label: "Pills" },
      { key: "mask", label: "Mask" },
      { key: "first-aid", label: "First Aid" },
      { key: "caduceus", label: "Caduceus" },
      { key: "bandage", label: "Bandage" },
    ],
  },
  {
    group: "Home",
    icons: [
      { key: "keys", label: "Keys" },
      { key: "sofa", label: "Sofa" },
      { key: "towel", label: "Towel" },
      { key: "scale", label: "Scale" },
      { key: "vacuum-home", label: "Vacuum Home" },
      { key: "trash", label: "Trash" },
      { key: "toilet-paper", label: "Toilet Paper" },
      { key: "tree", label: "Tree" },
      { key: "door", label: "Door" },
      { key: "armchair", label: "Armchair" },
      { key: "rug", label: "Rug" },
      { key: "paint-brush", label: "Paint Brush" },
      { key: "radiator", label: "Radiator" },
      { key: "bathtub", label: "Bathtub" },
      { key: "washing-machine", label: "Washing Machine" },
      { key: "plant", label: "Plant" },
      { key: "monitor", label: "Monitor" },
    ],
  },
  {
    group: "Insurance",
    icons: [
      { key: "car-insurance", label: "Car Insurance" },
      { key: "home-insurance", label: "Home Insurance" },
      { key: "briefcase-insurance", label: "Briefcase Insurance" },
      { key: "travel-insurance", label: "Travel Insurance" },
      { key: "steering-insurance", label: "Steering Insurance" },
      { key: "dental-insurance", label: "Dental Insurance" },
      { key: "heart-insurance", label: "Heart Insurance" },
      { key: "person-insurance", label: "Person Insurance" },
      { key: "phone-insurance", label: "Phone Insurance" },
      { key: "motorcycle-insurance", label: "Motorcycle Insurance" },
      { key: "helmet-insurance", label: "Helmet Insurance" },
      { key: "document-insurance", label: "Document Insurance" },
    ],
  },
  {
    group: "Personal care",
    icons: [
      { key: "scissors", label: "Scissors" },
      { key: "nail-polish", label: "Nail Polish" },
      { key: "sauna-bucket", label: "Sauna Bucket" },
      { key: "makeup-brush", label: "Makeup Brush" },
      { key: "face-towel", label: "Face Towel" },
      { key: "lips", label: "Lips" },
      { key: "eyelashes", label: "Eyelashes" },
      { key: "eyebrow", label: "Eyebrow" },
      { key: "cosmetics-bottle", label: "Cosmetics Bottle" },
      { key: "leaf-bag", label: "Leaf Bag" },
      { key: "lotus", label: "Lotus" },
    ],
  },
  {
    group: "Pets",
    icons: [
      { key: "cat", label: "Cat" },
      { key: "pet-bowl", label: "Pet Bowl" },
      { key: "hamster", label: "Hamster" },
      { key: "ball-bone", label: "Ball Bone" },
      { key: "rabbit", label: "Rabbit" },
      { key: "bird", label: "Bird" },
      { key: "cage", label: "Cage" },
      { key: "bone", label: "Bone" },
      { key: "dog", label: "Dog" },
      { key: "veterinary", label: "Veterinary" },
    ],
  },
  {
    group: "Shopping",
    icons: [
      { key: "cash", label: "Cash" },
      { key: "gift-card", label: "Gift Card" },
      { key: "credit-card", label: "Credit Card" },
      { key: "discount", label: "Discount" },
      { key: "percent-tag", label: "Percent Tag" },
      { key: "hand-truck", label: "Hand Truck" },
      { key: "shop", label: "Shop" },
      { key: "black-friday", label: "Black Friday" },
      { key: "sale-tag", label: "Sale Tag" },
      { key: "box", label: "Box" },
    ],
  },
  {
    group: "Sport & Fitness",
    icons: [
      { key: "cap", label: "Cap" },
      { key: "tennis-ball", label: "Tennis Ball" },
      { key: "fitness-body", label: "Fitness Body" },
      { key: "boxing-gloves", label: "Boxing Gloves" },
      { key: "swimming-pool", label: "Swimming Pool" },
      { key: "football", label: "Football" },
      { key: "soccer-ball", label: "Soccer Ball" },
      { key: "bowling", label: "Bowling" },
      { key: "baseball-bat", label: "Baseball Bat" },
      { key: "ice-skate", label: "Ice Skate" },
      { key: "ping-pong", label: "Ping Pong" },
      { key: "treadmill", label: "Treadmill" },
      { key: "muscle", label: "Muscle" },
      { key: "jump-rope", label: "Jump Rope" },
      { key: "dumbbell", label: "Dumbbell" },
      { key: "skateboard", label: "Skateboard" },
      { key: "basketball", label: "Basketball" },
    ],
  },
  {
    group: "Other",
    icons: [
      { key: "megaphone", label: "Megaphone" },
      { key: "plane", label: "Plane" },
      { key: "dove", label: "Dove" },
      { key: "bitcoin", label: "Bitcoin" },
      { key: "server", label: "Server" },
      { key: "school-books", label: "School Books" },
      { key: "om", label: "Om" },
      { key: "flask", label: "Flask" },
      { key: "cross", label: "Cross" },
      { key: "cloud", label: "Cloud" },
      { key: "compass", label: "Compass" },
      { key: "cash-other", label: "Cash Other" },
      { key: "smiley", label: "Smiley" },
      { key: "pencil-ruler", label: "Pencil Ruler" },
      { key: "glasses", label: "Glasses" },
      { key: "door-hanger", label: "Door Hanger" },
      { key: "moon-star", label: "Moon Star" },
      { key: "scales", label: "Scales" },
      { key: "lightning", label: "Lightning" },
      { key: "moustache", label: "Moustache" },
      { key: "newspaper", label: "Newspaper" },
      { key: "paperclip", label: "Paperclip" },
      { key: "layers", label: "Layers" },
      { key: "safe", label: "Safe" },
      { key: "star-symbol", label: "Star Symbol" },
      { key: "graduation-cap", label: "Graduation Cap" },
      { key: "sun", label: "Sun" },
      { key: "island", label: "Island" },
    ],
  },
];

const ALL_CUSTOM_ICON_KEYS = CUSTOM_CATEGORY_ICON_GROUPS.flatMap((group) =>
  group.icons.map((icon) => icon.key)
);

const SVG_STROKE = 'stroke="currentColor" stroke-width="1.75" fill="none"';

function keyHash(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function lineFromHash(hash, row) {
  const y = 5 + row * 5;
  const x1 = 4 + ((hash >> (row * 3)) % 5);
  const x2 = 20 - ((hash >> (row * 4 + 5)) % 5);
  return `<path d="M${x1} ${y}L${x2} ${y}" ${SVG_STROKE}/>`;
}

function makeCustomIconPaths(key) {
  const hash = keyHash(key);
  const shape = hash % 4;

  if (shape === 0) {
    const cx = 8 + (hash % 9);
    const cy = 8 + ((hash >> 3) % 9);
    const r = 2 + ((hash >> 6) % 4);
    return [
      `<rect x="4" y="4" width="16" height="16" rx="3" ${SVG_STROKE}/>`,
      `<circle cx="${cx}" cy="${cy}" r="${r}" ${SVG_STROKE}/>`,
      lineFromHash(hash, 1),
    ].join("");
  }

  if (shape === 1) {
    const x = 6 + (hash % 5);
    const y = 6 + ((hash >> 2) % 5);
    return [
      `<path d="M4 18L12 4L20 18Z" ${SVG_STROKE}/>`,
      `<rect x="${x}" y="${y}" width="8" height="8" rx="2" ${SVG_STROKE}/>`,
      lineFromHash(hash, 0),
    ].join("");
  }

  if (shape === 2) {
    const radius = 5 + (hash % 3);
    const small = 2 + ((hash >> 2) % 3);
    return [
      `<circle cx="12" cy="12" r="${radius}" ${SVG_STROKE}/>`,
      `<circle cx="12" cy="12" r="${small}" ${SVG_STROKE}/>`,
      lineFromHash(hash, 2),
    ].join("");
  }

  const x1 = 5 + (hash % 5);
  const y1 = 6 + ((hash >> 3) % 6);
  const x2 = 19 - ((hash >> 6) % 5);
  const y2 = 18 - ((hash >> 9) % 6);
  return [
    `<path d="M4 6H20V18H4Z" ${SVG_STROKE}/>`,
    `<path d="M${x1} ${y1}L${x2} ${y2}" ${SVG_STROKE}/>`,
    `<path d="M${x1} ${y2}L${x2} ${y1}" ${SVG_STROKE}/>`,
  ].join("");
}

const CUSTOM_ICON_SVGS = {
  [DEFAULT_CUSTOM_ICON_KEY]: [
    `<circle cx="12" cy="12" r="8" ${SVG_STROKE}/>`,
    `<path d="M12 8V16M8 12H16" ${SVG_STROKE}/>`,
  ].join(""),
};

for (const key of ALL_CUSTOM_ICON_KEYS) {
  CUSTOM_ICON_SVGS[key] = makeCustomIconPaths(key);
}

const ICON_SIZE_TO_PX = {
  sm: 16,
  md: 20,
  lg: 24,
};

function getAllCustomIconKeys() {
  return Object.keys(CUSTOM_ICON_SVGS);
}

function isValidCustomIconKey(key) {
  return typeof key === "string" && Object.hasOwn(CUSTOM_ICON_SVGS, key);
}

function isCustomCategoryIconKey(icon) {
  if (!isValidCustomIconKey(icon)) return false;
  if (!LEGACY_STANDARD_ICONS.includes(icon)) return true;
  return isValidCustomIconKey(icon);
}

function getIconPaths(key) {
  return CUSTOM_ICON_SVGS[key] || CUSTOM_ICON_SVGS[DEFAULT_CUSTOM_ICON_KEY];
}

function getIconMarkup(iconKey, size = "md") {
  const resolvedKey = isValidCustomIconKey(iconKey)
    ? iconKey
    : DEFAULT_CUSTOM_ICON_KEY;
  const resolvedSize = Object.hasOwn(ICON_SIZE_TO_PX, size) ? size : "md";
  const sizePx = ICON_SIZE_TO_PX[resolvedSize];
  const paths = getIconPaths(resolvedKey);

  return (
    `<span class="sw-custom-category-icon sw-custom-category-icon--${resolvedSize}" data-icon-key="${resolvedKey}" aria-hidden="true">` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sizePx}" height="${sizePx}" role="img" focusable="false">` +
    paths +
    "</svg></span>"
  );
}

function getIconLibraryForClient() {
  return {
    defaultKey: DEFAULT_CUSTOM_ICON_KEY,
    groups: CUSTOM_CATEGORY_ICON_GROUPS.map((group) => ({
      group: group.group,
      icons: group.icons.map((icon) => ({ key: icon.key, label: icon.label })),
    })),
    svgs: { ...CUSTOM_ICON_SVGS },
  };
}

module.exports = {
  DEFAULT_CUSTOM_ICON_KEY,
  LEGACY_STANDARD_ICONS,
  CUSTOM_CATEGORY_ICON_GROUPS,
  CUSTOM_ICON_SVGS,
  getAllCustomIconKeys,
  isValidCustomIconKey,
  isCustomCategoryIconKey,
  getIconPaths,
  getIconMarkup,
  getIconLibraryForClient,
};
