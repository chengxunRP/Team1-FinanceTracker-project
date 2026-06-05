/**
 * CraveMatch Home page — hero slider + feature carousel
 *
 * Requirements:
 * - #heroSlider with .hero-slide, .hero-slider-dot, [data-hero-direction]
 * - #featureCarouselTrack with CSS animation featureAutoScroll
 * - Cards duplicated twice (.feature-slide-card)
 * - #featurePrevBtn, #featureNextBtn
 *
 * Usage: <script src="/js/homepage-copy-script.js"></script>
 */

(function () {
  'use strict';

  /* ----- Hero slider ----- */

  function initHeroSlider() {
    var slider = document.getElementById('heroSlider');
    if (!slider) return;

    var slides = slider.querySelectorAll('.hero-slide');
    var dots = slider.querySelectorAll('.hero-slider-dot');
    var arrows = slider.querySelectorAll('[data-hero-direction]');
    var SLIDE_INTERVAL = 5000;

    var current = 0;
    var timer = null;

    function showSlide(index) {
      var total = slides.length;
      if (!total) return;
      current = (index + total) % total;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('active', i === current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === current);
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
      timer = setInterval(nextSlide, SLIDE_INTERVAL);
    }

    function stopAutoPlay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    arrows.forEach(function (arrow) {
      arrow.addEventListener('click', function () {
        var direction = arrow.getAttribute('data-hero-direction');
        if (direction === 'next') {
          nextSlide();
        } else {
          prevSlide();
        }
        startAutoPlay();
      });
    });

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = parseInt(dot.getAttribute('data-hero-dot'), 10);
        if (!isNaN(index)) {
          showSlide(index);
          startAutoPlay();
        }
      });
    });

    slider.addEventListener('mouseenter', stopAutoPlay);
    slider.addEventListener('mouseleave', startAutoPlay);

    startAutoPlay();
  }

  /* ----- Feature carousel arrows ----- */

  function initFeatureCarousel(options) {
    options = options || {};

    var trackId = options.trackId || 'featureCarouselTrack';
    var prevId = options.prevId || 'featurePrevBtn';
    var nextId = options.nextId || 'featureNextBtn';
    var cardSelector = options.cardSelector || '.feature-slide-card';
    var fallbackAnimMs = options.fallbackAnimMs || 35000;

    var featureTrack = document.getElementById(trackId);
    var featurePrevBtn = document.getElementById(prevId);
    var featureNextBtn = document.getElementById(nextId);

    if (!featureTrack) return;

    function getAnimationDurationMs(anim) {
      if (anim && anim.effect && anim.effect.getTiming) {
        var timing = anim.effect.getTiming();
        if (timing && typeof timing.duration === 'number') {
          return timing.duration;
        }
      }
      return fallbackAnimMs;
    }

    function nudgeFeatureCarousel(direction) {
      var animations = featureTrack.getAnimations();
      if (!animations.length) return;

      var anim = animations[0];
      var allCards = featureTrack.querySelectorAll(cardSelector);
      var uniqueCount = allCards.length / 2;

      if (!uniqueCount) return;

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
      featureNextBtn.addEventListener('click', function () {
        nudgeFeatureCarousel(1);
      });
    }

    if (featurePrevBtn) {
      featurePrevBtn.addEventListener('click', function () {
        nudgeFeatureCarousel(-1);
      });
    }
  }

  function init() {
    initHeroSlider();
    initFeatureCarousel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.initHeroSlider = initHeroSlider;
  window.initFeatureCarousel = initFeatureCarousel;
})();
