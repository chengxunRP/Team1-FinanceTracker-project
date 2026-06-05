# CraveMatch Home Page — Structure Reference

Use this when recreating the CraveMatch Home page layout in **Finance Tracker** (Express + EJS).

---

## Source files in CraveMatch

| Role | File |
|------|------|
| **Home page EJS** | `views/index.ejs` |
| **Header / navbar partial** | `views/partials/header.ejs` |
| **Footer partial** | `views/partials/footer.ejs` |
| **Stylesheet** | `public/style.css` (linked in header) |
| **Bootstrap** | CDN 5.3.8 (grid + navbar collapse) |

Inline JavaScript for hero slider and feature carousel lives at the bottom of `views/index.ejs`.

---

## EJS includes

```ejs
<%- include('partials/header') %>
<!-- main content -->
<%- include('partials/footer') %>
```

`header.ejs` opens `<!DOCTYPE html>`, `<head>`, `<body>`, and the navbar.  
`footer.ejs` closes with footer, Bootstrap JS, and `</body></html>`.

---

## Overall page structure

```
<body>
  <nav class="navbar ... crave-navbar">           ← header partial
  <main class="site-main home-page-pro">
    <section class="hero-slider-section">       ← hero slider (3 slides)
    <div class="container home-sections-wrap">
      <section class="feature-slider-section">  ← “What you can do” carousel
      <section class="benefit-showcase">        ← “Why CraveMatch helps”
    </div>
    <section class="food-memory-section">       ← “Featured from your menu” marquee
  </main>
  <footer class="app-footer">                   ← footer partial
  <script> hero slider JS </script>
  <script> feature carousel JS </script>
</body>
```

**Note:** CraveMatch does **not** have a “Live snapshot” stat grid on the Home page. Finance Tracker can map that section to the benefit showcase area or add it below the carousel while keeping the same spacing tokens.

---

## 1. Navbar / header

**File:** `views/partials/header.ejs`

```html
<nav class="navbar navbar-expand-lg navbar-dark crave-navbar">
  <div class="container">
    <a class="navbar-brand navbar-brand-crave" href="/">
      <span class="navbar-brand-mark">Crave</span>
      <span class="navbar-brand-accent">Match</span>
    </a>
    <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#craveNav">...</button>
    <div class="collapse navbar-collapse" id="craveNav">
      <ul class="navbar-nav ms-lg-auto align-items-lg-center">
        <li class="nav-item"><a class="nav-link" href="...">...</a></li>
      </ul>
    </div>
  </div>
</nav>
```

### Important class names

| Class | Purpose |
|-------|---------|
| `.crave-navbar` | Dark gradient navbar shell |
| `.navbar-brand-crave` | Brand link wrapper |
| `.navbar-brand-mark` | First word (white) |
| `.navbar-brand-accent` | Second word (yellow) |
| `.nav-link` | Nav items |

---

## 2. Hero section (auto-sliding banner)

**Classes:** `.hero-slider-section`, `#heroSlider`

```
<section class="hero-slider-section" id="heroSlider">
  <div class="hero-slides">
    <div class="hero-slide active" style="background-image: url('...');">
      <div class="hero-slide-overlay"></div>
      <div class="container hero-slide-inner">
        <div class="hero-slide-content">
          <span class="hero-slide-kicker">...</span>
          <h1 class="hero-slide-title">...</h1>
          <p class="hero-slide-desc">...</p>
          <div class="hero-slide-actions">
            <a class="hero-slide-btn hero-slide-btn-primary">...</a>
            <a class="hero-slide-btn hero-slide-btn-outline">...</a>
          </div>
        </div>
      </div>
    </div>
    <!-- 2 more .hero-slide -->
  </div>
  <button class="hero-slider-arrow hero-slider-arrow-prev" data-hero-direction="prev">
  <button class="hero-slider-arrow hero-slider-arrow-next" data-hero-direction="next">
  <div class="hero-slider-dots">
    <button class="hero-slider-dot active" data-hero-dot="0">
    ...
  </div>
</section>
```

### Important class names

| Class | Purpose |
|-------|---------|
| `.hero-slider-section` | Fixed-height hero container |
| `.hero-slides` | Slide stack wrapper |
| `.hero-slide` / `.hero-slide.active` | Individual slide (opacity transition) |
| `.hero-slide-overlay` | Dark gradient over background image |
| `.hero-slide-inner` | Bootstrap container, z-index above overlay |
| `.hero-slide-content` | Text block with fade-up animation |
| `.hero-slide-kicker` | Small pill label |
| `.hero-slide-title` | Main H1 |
| `.hero-slide-desc` | Subtitle paragraph |
| `.hero-slide-actions` | Button row |
| `.hero-slide-btn-primary` | Orange gradient CTA |
| `.hero-slide-btn-outline` | Glass outline CTA |
| `.hero-slider-arrow` | Prev/next circles |
| `.hero-slider-dots` / `.hero-slider-dot` | Dot indicators |

**Behaviour:** JS toggles `.active` on slides and dots; autoplay every 5s; pauses on hover.

---

## 3. Feature carousel (“What you can do”)

Inside `.container.home-sections-wrap`:

```
<section class="home-section-block feature-slider-section">
  <div class="text-center mb-4 mb-lg-5">
    <p class="section-kicker">Features</p>
    <h2 class="home-section-title">What you can do</h2>
    <p class="home-section-lead">...</p>
  </div>

  <div class="feature-slider-wrap feature-carousel-wrapper" id="featureCarousel">
    <button id="featurePrevBtn" class="feature-slider-arrow feature-slider-arrow-prev">
    <div class="feature-carousel-window">
      <div class="feature-carousel-track" id="featureCarouselTrack">
        <!-- cards × 2 (duplicated for seamless loop) -->
      </div>
    </div>
    <button id="featureNextBtn" class="feature-slider-arrow feature-slider-arrow-next">
  </div>
</section>
```

### Single card

```
<article class="feature-slide-card home-feature-card feature-slide-card-{color}">
  <div class="feature-slide-img-wrap">
    <img class="feature-slide-img" src="..." alt="...">
  </div>
  <div class="feature-slide-body">
    <h3 class="feature-slide-title">...</h3>
    <p class="feature-slide-desc">...</p>
    <a class="feature-slide-btn feature-slide-btn-{color}" href="...">...</a>
  </div>
</article>
```

**Color variants:** `orange`, `green`, `blue`, `yellow`, `dark`

See `homepage-carousel-guide.md` for full carousel detail.

---

## 4. Benefits section (“Why CraveMatch helps”)

```
<section class="home-section-block benefit-showcase">
  <div class="row g-4 align-items-center">
    <div class="col-lg-5">
      <div class="benefit-showcase-image-wrap">
        <img class="benefit-showcase-img" src="..." alt="...">
      </div>
    </div>
    <div class="col-lg-7">
      <div class="benefit-showcase-content">
        <p class="section-kicker">Benefits</p>
        <h2 class="home-section-title">...</h2>
        <ul class="benefit-list-pro">
          <li><span class="benefit-check">✓</span><span>...</span></li>
        </ul>
        <a class="btn btn-hero-primary btn-sm mt-2">...</a>
      </div>
    </div>
  </div>
</section>
```

### Important class names

| Class | Purpose |
|-------|---------|
| `.benefit-showcase` | White card panel |
| `.benefit-showcase-image-wrap` | Image container |
| `.benefit-showcase-img` | Side image |
| `.benefit-list-pro` | Checklist |
| `.benefit-check` | Orange circle check icon |

**Finance Tracker mapping:** Replace with “Why Finance Tracker helps” or a **Live snapshot** stat grid using `.stat-card` patterns from your budget page.

---

## 5. Food memories marquee (optional for Finance Tracker)

Full-width section below the container:

```
<section class="food-memory-section">
  <div class="container text-center mb-4">
    <p class="section-kicker">Food memories</p>
    <h2 class="home-section-title">Featured from your menu</h2>
    <p class="section-subtitle">...</p>
  </div>
  <div class="food-memory-marquee">
    <div class="food-memory-marquee-track">
      <a class="food-memory-card">...</a>
    </div>
  </div>
</section>
```

Uses backend `meals` data. Finance Tracker may omit this or replace with recent transactions.

---

## 6. Footer

**File:** `views/partials/footer.ejs`

```html
<footer class="app-footer">
  <div class="container text-center">
    <p class="footer-brand">CraveMatch</p>
    <p class="footer-tagline">...</p>
    <p class="small opacity-75">...</p>
  </div>
</footer>
```

### Important class names

| Class | Purpose |
|-------|---------|
| `.app-footer` | Dark gradient footer |
| `.footer-brand` | Yellow brand name |
| `.footer-tagline` | Muted tagline |

---

## Shared section class names

| Class | Purpose |
|-------|---------|
| `.site-main` | Flex grow main wrapper |
| `.home-page-pro` | Cream page background `#fffaf3` |
| `.home-sections-wrap` | Container padding around mid sections |
| `.home-section-block` | Section vertical spacing |
| `.section-kicker` | Orange uppercase label |
| `.home-section-title` | Section H2 |
| `.home-section-lead` | Centered subtitle |
| `.text-center` | Bootstrap utility |

---

## Data passed from Express (CraveMatch)

Home route renders `index` with `meals` array for the food memory marquee. Feature cards are defined **inline** in EJS as `homeFeatures`. Hero slides are **static** in EJS.

Finance Tracker can pass `summary` for a live snapshot section and define `features` inline or from the route.

---

## Files in this reference folder

| File | Purpose |
|------|---------|
| `homepage-copy-template.ejs` | Full reusable layout |
| `homepage-copy-style.css` | Home-only CSS |
| `homepage-copy-script.js` | Hero + carousel JS |
| `homepage-style-guide.md` | All CSS values |
| `homepage-carousel-guide.md` | Carousel deep dive |
| `finance-adaptation-notes.md` | Finance Tracker mapping |
