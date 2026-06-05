# CraveMatch “What you can do” Carousel — Guide

Focused reference for the Home page feature carousel only.  
Source: `views/index.ejs` + `public/style.css` (~2920–3236).

---

## Architecture

| Layer | Role |
|-------|------|
| **CSS animation** | Continuous horizontal scroll on `.feature-carousel-track` |
| **Duplicated cards** | Feature array rendered twice for seamless `-50%` loop |
| **Arrow JS** | Nudges CSS animation `currentTime` via Web Animations API |
| **Overflow + fade** | Partial side cards + soft edge gradients |

No dot indicators. No active index state.

---

## HTML / EJS structure

```html
<section class="home-section-block feature-slider-section">
  <div class="text-center mb-4 mb-lg-5">
    <p class="section-kicker">Features</p>
    <h2 class="home-section-title">What you can do</h2>
    <p class="home-section-lead">Subtitle here.</p>
  </div>

  <div class="feature-slider-wrap feature-carousel-wrapper" id="featureCarousel">
    <button id="featurePrevBtn" class="feature-slider-arrow feature-slider-arrow-prev" type="button">...</button>

    <div class="feature-carousel-window">
      <div class="feature-carousel-track" id="featureCarouselTrack">
        <!-- Set 1: interactive cards -->
        <!-- Set 2: duplicate with aria-hidden="true", tabindex="-1" on links -->
      </div>
    </div>

    <button id="featureNextBtn" class="feature-slider-arrow feature-slider-arrow-next" type="button">...</button>
  </div>
</section>
```

### Card markup

```html
<article class="feature-slide-card home-feature-card feature-slide-card-green">
  <div class="feature-slide-img-wrap">
    <img src="/features/example.png" class="feature-slide-img" alt="Title">
  </div>
  <div class="feature-slide-body">
    <h3 class="feature-slide-title">Title</h3>
    <p class="feature-slide-desc">Description.</p>
    <a href="/path" class="feature-slide-btn feature-slide-btn-green">Button</a>
  </div>
</article>
```

### EJS data shape

```javascript
{
  title: string,
  image: string,
  desc: string,
  btn: string,
  link: string,
  color: 'orange' | 'green' | 'blue' | 'yellow' | 'dark'
}
```

---

## CSS class names

### Shell
- `.feature-slider-section`
- `.feature-slider-wrap` / `.feature-carousel-wrapper`
- `.feature-carousel-window`
- `.feature-carousel-track`

### Card
- `.feature-slide-card` / `.home-feature-card`
- `.feature-slide-card-{color}`
- `.feature-slide-img-wrap` / `.feature-slide-img`
- `.feature-slide-body`
- `.feature-slide-title` / `.feature-slide-desc`
- `.feature-slide-btn` / `.feature-slide-btn-{color}`

### Arrows
- `.feature-slider-arrow`
- `.feature-slider-arrow-prev` / `.feature-slider-arrow-next`
- `.feature-slider-arrow-icon`

### IDs (JS)
- `#featureCarouselTrack`
- `#featurePrevBtn`
- `#featureNextBtn`

---

## CSS values

### Wrapper & window

```css
.feature-carousel-wrapper { position: relative; padding: 0 72px; }
.feature-carousel-window { overflow: hidden; width: 100%; padding: 12px 0 24px; position: relative; }
```

### Track

```css
.feature-carousel-track {
  display: flex;
  gap: 28px;
  width: max-content;
  animation: featureAutoScroll 35s linear infinite;
  will-change: transform;
}

@keyframes featureAutoScroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

### Card sizing

| Breakpoint | Width |
|------------|-------|
| Default | `360px` |
| ≤ 991.98px | `300px` |
| ≤ 575.98px | `270px` |

Height: **not fixed** (~390–420px with 200px image + body).

### Image

| Property | Value |
|----------|-------|
| Wrap height | `200px` (180px mobile) |
| object-fit | `cover` |
| Background | `#fff7ed` |

### Card shell

| Property | Value |
|----------|-------|
| border-radius | `24px` |
| border | `1px solid #f3e7dc` |
| box-shadow | `0 12px 32px rgba(0,0,0,0.08)` |
| top stripe | `6px` via `::before` |

### Body padding

`1.5rem 1.5rem 1.75rem`

### Button

| Property | Value |
|----------|-------|
| padding | `0.7rem 1.25rem` |
| border-radius | `14px` |
| font-weight | `800` |
| align | `flex-start` (left, not full width) |

### Fade overlay

```css
.feature-carousel-window::before,
.feature-carousel-window::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;          /* full height in CraveMatch */
  width: 40px;
  z-index: 3;
  pointer-events: none;
}
.feature-carousel-window::before {
  left: 0;
  background: linear-gradient(90deg, #fffaf3 0%, transparent 100%);
}
.feature-carousel-window::after {
  right: 0;
  background: linear-gradient(270deg, #fffaf3 0%, transparent 100%);
}
```

Match `#fffaf3` to your page background.

### Arrow buttons

| Property | Value |
|----------|-------|
| Size | `52×52px` (44px mobile) |
| Shape | `border-radius: 50%` |
| Border | `2px solid #ffedd5` |
| Background | white → `#fffaf3` gradient |
| Colour | `#f05a1a` |
| Position | `left/right: 10px`, vertically centered |
| z-index | `6` |

---

## Partial side cards

Achieved without JavaScript:

1. `.feature-carousel-window { overflow: hidden }`
2. Track wider than viewport (`width: max-content`)
3. Wrapper side padding `72px` for arrow clearance
4. Edge fade gradients soften clipped cards

---

## Hover effects

**Card:** `translateY(-8px)` + deeper shadow  
**Image:** `scale(1.05)` when card hovered  
**Button:** `opacity: 0.92`, `translateY(-1px)`  
**Arrow:** orange gradient fill, `scale(1.08)`

No pause-on-hover on feature carousel (unlike hero slider).

---

## JavaScript

```javascript
const FEATURE_ANIM_MS = 35000;

function nudgeFeatureCarousel(direction) {
  const anim = featureTrack.getAnimations()[0];
  const uniqueCount = featureTrack.querySelectorAll('.feature-slide-card').length / 2;
  const stepMs = FEATURE_ANIM_MS / uniqueCount;
  let nextTime = anim.currentTime + (direction * stepMs);
  // wrap within [0, duration)
  anim.currentTime = nextTime;
}
```

- **Next:** `direction = 1`
- **Prev:** `direction = -1`
- Cards must be duplicated **exactly twice**
- Sync `FEATURE_ANIM_MS` with CSS `animation-duration` (35s desktop, 45s ≤768px)

Improved copy in `homepage-copy-script.js` reads live animation duration.

---

## Adapting cards to another project

1. Define a `features` array with title, image, desc, btn, link, color.
2. Loop twice in EJS (second pass: `aria-hidden`, `tabindex="-1"`).
3. Place images in `public/features/`.
4. Map colours to accent stripe + button classes.
5. Keep 6 cards or any count — JS auto-calculates step size.
6. For “Coming soon” items use `link: '#'` and optional `btn` text.

### Finance Tracker feature map

See `finance-adaptation-notes.md` for exact titles, paths, and links.

---

## Responsive

| Breakpoint | Changes |
|------------|---------|
| ≤ 991.98px | wrapper `60px` padding, cards `300px` |
| ≤ 768px | animation `45s` |
| ≤ 575.98px | wrapper `52px`, cards `270px`, arrows `44px`, image `180px` |

---

## Checklist

- [ ] Duplicate cards twice in track
- [ ] CSS animation on track
- [ ] Fade colour matches page bg
- [ ] Arrow IDs wired to script
- [ ] Image wrap `200px` height
- [ ] Card width `360px`, gap `28px`
- [ ] `pointer-events: none` on fade overlays
