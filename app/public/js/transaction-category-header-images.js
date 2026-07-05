(function () {
  "use strict";

  var HEADER_BASE = "/category_images";

  var BY_NAME = {
    "Auto & Transport": HEADER_BASE + "/Auto&Transport.avif",
    "Bills & Utilities": HEADER_BASE + "/Bills & Utilities.jpg",
    "Business Services": HEADER_BASE + "/buisness_services.webp",
    "Cash & ATM": HEADER_BASE + "/cash & atm.png",
    Cheque: HEADER_BASE + "/cheque.jpg",
    Clothing: HEADER_BASE + "/clothing.jpg",
    "Credit Card": HEADER_BASE + "/credit_card.jpg",
    "Eating Out": HEADER_BASE + "/eatingout.jpg",
    Education: HEADER_BASE + "/education.jpg",
    "Electronics & Software": HEADER_BASE + "/electronics&software.jpg",
    Entertainment: HEADER_BASE + "/entertainment.jpg",
    Fees: HEADER_BASE + "/fees.jpg",
    "Gifts & Donation": HEADER_BASE + "/gitfs&donation.jpg",
    Groceries: HEADER_BASE + "/groceries.jpg",
    "Health & Medical": HEADER_BASE + "/health&medical.jpg",
    Home: HEADER_BASE + "/home.jpg",
    Insurance: HEADER_BASE + "/insurance.jpg",
    Investment: HEADER_BASE + "/investment.webp",
    Kids: HEADER_BASE + "/kids.webp",
    Loan: HEADER_BASE + "/loan.png",
    Pets: HEADER_BASE + "/pets.jpg",
    Shopping: HEADER_BASE + "/shopping.jpg",
    "Sport & Fitness": HEADER_BASE + "/sport&fitness.jpg",
    Travel: HEADER_BASE + "/travel.jpg",
    Transport: HEADER_BASE + "/Auto&Transport.avif",
    Bills: HEADER_BASE + "/Bills & Utilities.jpg",
    Utilities: HEADER_BASE + "/Bills & Utilities.jpg",
    Food: HEADER_BASE + "/groceries.jpg",
    School: HEADER_BASE + "/education.jpg",
    Health: HEADER_BASE + "/health&medical.jpg",
  };

  var BY_ICON = {
    bills: BY_NAME["Bills & Utilities"],
    transport: BY_NAME["Auto & Transport"],
    food: BY_NAME.Groceries,
    school: BY_NAME.Education,
    shopping: BY_NAME.Shopping,
    entertainment: BY_NAME.Entertainment,
    business_services: BY_NAME["Business Services"],
    cash_atm: BY_NAME["Cash & ATM"],
    cheque: BY_NAME.Cheque,
    clothing: BY_NAME.Clothing,
    eatingout: BY_NAME["Eating Out"],
    fees: BY_NAME.Fees,
    gifts_donation: BY_NAME["Gifts & Donation"],
    electronics_software: BY_NAME["Electronics & Software"],
    pets: BY_NAME.Pets,
    home: BY_NAME.Home,
    loan: BY_NAME.Loan,
    sport_fitness: BY_NAME["Sport & Fitness"],
    investments: BY_NAME.Investment,
    health: BY_NAME["Health & Medical"],
    health_medical: BY_NAME["Health & Medical"],
    kid: BY_NAME.Kids,
    creditcard_payment: BY_NAME["Credit Card"],
    insurance: BY_NAME.Insurance,
    travel: BY_NAME.Travel,
  };

  var ICON_BASE = "/categoryicon";

  var FIELD_ICON_BY_ICON = {
    bills: ICON_BASE + "/bills.png",
    transport: ICON_BASE + "/transport.png",
    food: ICON_BASE + "/food.png",
    school: ICON_BASE + "/schools.png",
    shopping: ICON_BASE + "/shopping.png",
    entertainment: ICON_BASE + "/entertainment.png",
    business_services: ICON_BASE + "/business_services.png",
    cash_atm: ICON_BASE + "/cash&atm.png",
    cheque: ICON_BASE + "/cheque.png",
    clothing: ICON_BASE + "/clothing.png",
    eatingout: ICON_BASE + "/eatingout.png",
    fees: ICON_BASE + "/fees.jpg",
    gifts_donation: ICON_BASE + "/gifts&donation.png",
    electronics_software: ICON_BASE + "/electronics&software.png",
    pets: ICON_BASE + "/pets.png",
    home: ICON_BASE + "/home.png",
    loan: ICON_BASE + "/loan.png",
    sport_fitness: ICON_BASE + "/sport&fitness.png",
    investments: ICON_BASE + "/investments.png",
    health: ICON_BASE + "/health&medical.png",
    health_medical: ICON_BASE + "/health&medical.png",
    kid: ICON_BASE + "/kid.png",
    creditcard_payment: ICON_BASE + "/creditcard_payment.png",
    insurance: ICON_BASE + "/insurance.png",
    travel: ICON_BASE + "/travel.png",
  };

  var FIELD_ICON_BY_NAME = {
    "Bills & Utilities": FIELD_ICON_BY_ICON.bills,
    Bills: FIELD_ICON_BY_ICON.bills,
    Utilities: FIELD_ICON_BY_ICON.bills,
    Groceries: FIELD_ICON_BY_ICON.food,
    Food: FIELD_ICON_BY_ICON.food,
    "Auto & Transport": FIELD_ICON_BY_ICON.transport,
    Transport: FIELD_ICON_BY_ICON.transport,
    Education: FIELD_ICON_BY_ICON.school,
    School: FIELD_ICON_BY_ICON.school,
    Entertainment: FIELD_ICON_BY_ICON.entertainment,
    Shopping: FIELD_ICON_BY_ICON.shopping,
    "Business Services": FIELD_ICON_BY_ICON.business_services,
    "Cash & ATM": FIELD_ICON_BY_ICON.cash_atm,
    Cheque: FIELD_ICON_BY_ICON.cheque,
    Clothing: FIELD_ICON_BY_ICON.clothing,
    "Eating Out": FIELD_ICON_BY_ICON.eatingout,
    Fees: FIELD_ICON_BY_ICON.fees,
    "Gifts & Donation": FIELD_ICON_BY_ICON.gifts_donation,
    "Electronics & Software": FIELD_ICON_BY_ICON.electronics_software,
    Pets: FIELD_ICON_BY_ICON.pets,
    Home: FIELD_ICON_BY_ICON.home,
    Loan: FIELD_ICON_BY_ICON.loan,
    "Sport & Fitness": FIELD_ICON_BY_ICON.sport_fitness,
    Investment: FIELD_ICON_BY_ICON.investments,
    "Health & Medical": FIELD_ICON_BY_ICON.health_medical,
    Kids: FIELD_ICON_BY_ICON.kid,
    "Credit Card": FIELD_ICON_BY_ICON.creditcard_payment,
    Insurance: FIELD_ICON_BY_ICON.insurance,
    Travel: FIELD_ICON_BY_ICON.travel,
  };

  function resolveHeaderImage(categoryName, categoryIcon, iconImage, isCustom) {
    if (isCustom && iconImage) {
      return iconImage;
    }

    if (categoryName && BY_NAME[categoryName]) {
      return BY_NAME[categoryName];
    }

    if (categoryIcon && BY_ICON[categoryIcon]) {
      return BY_ICON[categoryIcon];
    }

    return "";
  }

  function resolveCategoryFieldIcon(categoryName, categoryIcon, iconImage, isCustom) {
    if (isCustom && iconImage) {
      return iconImage;
    }

    if (categoryName && FIELD_ICON_BY_NAME[categoryName]) {
      return FIELD_ICON_BY_NAME[categoryName];
    }

    if (categoryIcon && FIELD_ICON_BY_ICON[categoryIcon]) {
      return FIELD_ICON_BY_ICON[categoryIcon];
    }

    return "";
  }

  window.SwTransactionHeaderImages = {
    byName: BY_NAME,
    byIcon: BY_ICON,
    resolveHeaderImage: resolveHeaderImage,
    resolveCategoryFieldIcon: resolveCategoryFieldIcon,
  };
})();
