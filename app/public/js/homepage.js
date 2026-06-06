(function () {
  "use strict";

  function initHeroSlider() {
    var slider = document.getElementById("heroSlider");
    if (!slider) {
      return;
    }

    var slides = slider.querySelectorAll(".hero-slide");
    var dots = slider.querySelectorAll(".hero-slider-dot");
    var arrows = slider.querySelectorAll("[data-hero-direction]");
    var slideInterval = 5000;
    var current = 0;
    var timer = null;

    function showSlide(index) {
      var total = slides.length;
      if (!total) {
        return;
      }

      current = (index + total) % total;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("active", i === current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("active", i === current);
      });
    }

    function nextSlide() {
      showSlide(current + 1);
    }

    function prevSlide() {
      showSlide(current - 1);
    }

    function startAutoPlay() {
      stopAutoPlay();
      timer = setInterval(nextSlide, slideInterval);
    }

    function stopAutoPlay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    arrows.forEach(function (arrow) {
      arrow.addEventListener("click", function () {
        if (arrow.getAttribute("data-hero-direction") === "next") {
          nextSlide();
        } else {
          prevSlide();
        }
        startAutoPlay();
      });
    });

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var index = parseInt(dot.getAttribute("data-hero-dot"), 10);
        if (!isNaN(index)) {
          showSlide(index);
          startAutoPlay();
        }
      });
    });

    slider.addEventListener("mouseenter", stopAutoPlay);
    slider.addEventListener("mouseleave", startAutoPlay);

    startAutoPlay();
  }

  function initFeatureCarousel() {
    var featureTrack = document.getElementById("featureCarouselTrack");
    var featurePrevBtn = document.getElementById("featurePrevBtn");
    var featureNextBtn = document.getElementById("featureNextBtn");

    if (!featureTrack) {
      return;
    }

    function getAnimationDurationMs(anim) {
      if (anim && anim.effect && anim.effect.getTiming) {
        var timing = anim.effect.getTiming();
        if (timing && typeof timing.duration === "number") {
          return timing.duration;
        }
      }
      return 35000;
    }

    function nudgeFeatureCarousel(direction) {
      var animations = featureTrack.getAnimations();
      if (!animations.length) {
        return;
      }

      var anim = animations[0];
      var allCards = featureTrack.querySelectorAll(".feature-slide-card");
      var uniqueCount = allCards.length / 2;

      if (!uniqueCount) {
        return;
      }

      var duration = getAnimationDurationMs(anim);
      var stepMs = duration / uniqueCount;
      var nextTime = anim.currentTime + (direction * stepMs);

      if (nextTime < 0) {
        nextTime = duration + nextTime;
      } else if (nextTime >= duration) {
        nextTime = nextTime % duration;
      }

      anim.currentTime = nextTime;
    }

    if (featureNextBtn) {
      featureNextBtn.addEventListener("click", function () {
        nudgeFeatureCarousel(1);
      });
    }

    if (featurePrevBtn) {
      featurePrevBtn.addEventListener("click", function () {
        nudgeFeatureCarousel(-1);
      });
    }
  }

  function init() {
    initHeroSlider();
    initFeatureCarousel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
