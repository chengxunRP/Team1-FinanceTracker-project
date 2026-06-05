# CraveMatch Home Page — Style Guide

Exact or closest values from `public/style.css`. Finance Tracker can swap accent colours but keep spacing and layout tokens.

---

## Global / body

| Property | Value |
|----------|-------|
| Body background | `var(--cream-bg)` → `#faf6f1` |
| Body font | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Body layout | `min-height: 100vh; display: flex; flex-direction: column` |
| Text colour | `var(--text-dark)` → `#1f2937` |
| Line height | `1.5` |

### CSS variables (`:root`)

| Token | Value |
|-------|-------|
| `--primary-dark` | `#1a2332` |
| `--primary-navy` | `#243044` |
| `--accent-orange` | `#e85d04` |
| `--accent-yellow` | `#fbbf24` |
| `--cream-bg` | `#faf6f1` |
| `--text-muted` | `#6b7280` |
| `--shadow-md` | `0 10px 28px rgba(26, 35, 50, 0.12)` |

---

## Main page background

| Class | Background |
|-------|------------|
| `.home-page-pro` | `#fffaf3` |
| | `overflow-x: hidden` |

Hero and food-memory sections sit on top of this cream tone.

---

## Navbar

| Property | Value |
|----------|-------|
| Class | `.navbar.crave-navbar` |
| Background | `linear-gradient(180deg, #1a2332 0%, #243044 100%)` |
| Padding | `0.85rem 0` (≈ **no fixed pixel height**; total ≈ 56–64px with content) |
| Box shadow | `0 10px 28px rgba(26, 35, 50, 0.12)` |
| Border bottom | `2px solid rgba(251, 191, 36, 0.25)` |
| Layout | Bootstrap `.container` + collapse on mobile |

### Brand

| Element | Styles |
|---------|--------|
| `.navbar-brand-crave` | `font-weight: 900; font-size: 1.4rem` |
| `.navbar-brand-mark` | `color: #ffffff` |
| `.navbar-brand-accent` | `color: #facc15` |

### Nav links

| Property | Value |
|----------|-------|
| Colour | `#e8edf5` |
| Font weight | `500` |
| Padding | `0.5rem 0.9rem` |
| Border radius | `8px` |
| Hover colour | `var(--accent-yellow)` |
| Hover background | `rgba(255, 255, 255, 0.08)` |

---

## Hero section

| Property | Value |
|----------|-------|
| Class | `.hero-slider-section` |
| Height | `560px` (desktop) |
| Width | `100%` |
| Overflow | `hidden` |
| Fallback background | `#111827` |

### Responsive hero height

| Breakpoint | Height |
|------------|--------|
| ≤ 991.98px | `500px` |
| ≤ 575.98px | `540px` |

### Background image

Set per slide inline: `style="background-image: url('...');"`  
CSS: `background-position: center; background-size: cover; background-repeat: no-repeat`

### Overlay (`.hero-slide-overlay`)

```css
background: linear-gradient(115deg,
  rgba(17, 24, 39, 0.85) 0%,
  rgba(30, 45, 68, 0.7) 45%,
  rgba(240, 90, 26, 0.55) 100%);
position: absolute; inset: 0; z-index: 1;
```

### Hero kicker (`.hero-slide-kicker`)

| Property | Value |
|----------|-------|
| Display | `inline-block` |
| Background | `rgba(250, 204, 21, 0.18)` |
| Colour | `#fde68a` |
| Border | `1px solid rgba(250, 204, 21, 0.4)` |
| Font size | `0.78rem` |
| Font weight | `800` |
| Letter spacing | `0.12em` |
| Text transform | `uppercase` |
| Padding | `0.5rem 1rem` |
| Border radius | `999px` |
| Margin bottom | `1.25rem` |

### Hero title (`.hero-slide-title`)

| Property | Value |
|----------|-------|
| Font size | `clamp(2.25rem, 5vw, 3.5rem)` |
| Font weight | `900` |
| Colour | `#ffffff` |
| Line height | `1.08` |
| Letter spacing | `-0.03em` |
| Text shadow | `0 4px 18px rgba(0, 0, 0, 0.45)` |

### Hero subtitle (`.hero-slide-desc`)

| Property | Value |
|----------|-------|
| Font size | `clamp(1.05rem, 1.8vw, 1.2rem)` |
| Colour | `#f3f4f6` |
| Line height | `1.65` |
| Max width | `600px` |
| Margin bottom | `2rem` |
| Text shadow | `0 2px 12px rgba(0, 0, 0, 0.35)` |

### Hero buttons

| Class | Padding | Radius | Notes |
|-------|---------|--------|-------|
| `.hero-slide-btn` | `0.85rem 1.7rem` | `14px` | `font-weight: 800; font-size: 0.98rem` |
| `.hero-slide-btn-primary` | — | — | Orange gradient `#f05a1a → #fb923c`, white text, shadow `0 10px 26px rgba(240,90,26,0.4)` |
| `.hero-slide-btn-outline` | — | — | `rgba(255,255,255,0.12)` bg, `2px` white border, backdrop blur `6px` |
| Hover (both) | — | — | `translateY(-2px)` |

### Hero arrows

| Property | Desktop | ≤ 991px | ≤ 575px |
|----------|---------|---------|---------|
| Size | `52×52px` | `46×46px` | `40×40px` |
| Position | `top: 50%; translateY(-50%)` | same | same |
| Prev left | `28px` | `16px` | `8px` |
| Next right | `28px` | `16px` | `8px` |
| Background | `rgba(17,24,39,0.35)` + blur | same | same |
| Border | `2px solid rgba(255,255,255,0.45)` | same | same |

### Hero dots

| Property | Value |
|----------|-------|
| Position | `bottom: 26px`, centered |
| Dot size | `12×12px` |
| Active dot | `width: 34px`, `border-radius: 999px`, `background: #f05a1a` |
| Gap | `10px` |

### Slide transition

`opacity 1s ease-in-out` between slides. Content uses `heroSlideFadeUp 0.9s ease-out`.

---

## Section spacing

| Class | Spacing |
|-------|---------|
| `.home-sections-wrap` | `padding-top: 3rem; padding-bottom: 2rem` |
| `.home-section-block` | `margin-bottom: 4rem` |
| `.section-kicker` | `margin-bottom: 8px` |
| `.home-section-title` | `margin-bottom: 0.5rem` |

### Section header typography

| Class | Values |
|-------|--------|
| `.section-kicker` | `#f05a1a`, `0.85rem`, `800`, `letter-spacing: 1.5px`, uppercase |
| `.home-section-title` | `clamp(1.75rem, 3vw, 2.25rem)`, `900`, `#111827` |
| `.home-section-lead` | `#6b7280`, `1.05rem`, `max-width: 36rem`, centered |

---

## Feature carousel section

| Property | Value |
|----------|-------|
| Wrapper padding | `0 72px` (60px ≤991px, 52px ≤575px) |
| Window padding | `12px 0 24px` |
| Track gap | `28px` |
| Animation | `featureAutoScroll 35s linear infinite` (45s ≤768px) |

---

## Carousel card

| Property | Desktop | ≤ 991px | ≤ 575px |
|----------|---------|---------|---------|
| Width | `360px` | `300px` | `270px` |
| Height | content-driven (~390–420px) | same | same |
| Border radius | `24px` | same | same |
| Border | `1px solid #f3e7dc` | same | same |
| Background | `#ffffff` | same | same |
| Box shadow | `0 12px 32px rgba(0,0,0,0.08)` | same | same |
| Top stripe | `6px` gradient via `::before` | same | same |
| Hover lift | `translateY(-8px)` | same | same |
| Hover shadow | `0 22px 50px rgba(0,0,0,0.14)` | same | same |

---

## Carousel image

| Property | Desktop | ≤ 575px |
|----------|---------|---------|
| Wrap height | `200px` | `180px` |
| Image | `width/height: 100%`, `object-fit: cover` | same |
| Wrap background | `#fff7ed` | same |
| Hover zoom | `scale(1.05)` on card hover | same |

---

## Card body padding

`.feature-slide-body`: `padding: 1.5rem 1.5rem 1.75rem`

### Card title

`1.25rem`, `font-weight: 900`, `#111827`, `margin-bottom: 0.75rem`

### Card description

`0.95rem`, `#6b7280`, `line-height: 1.6`, `margin-bottom: 1.5rem`, `flex-grow: 1`

---

## Card button

| Property | Value |
|----------|-------|
| Padding | `0.7rem 1.25rem` |
| Border radius | `14px` |
| Font | `800`, `0.95rem` |
| Width | auto, `align-self: flex-start` |
| Hover | `opacity: 0.92`, `translateY(-1px)` |

| Variant | Background |
|---------|------------|
| orange | `#f05a1a` |
| green | `#198754` |
| blue | `#2563eb` |
| yellow | `#f59e0b` (text `#111827`) |
| dark | `#111827` |

---

## Carousel arrow buttons

| Property | Desktop | ≤ 575px |
|----------|---------|---------|
| Size | `52×52px` circle | `44×44px` |
| Border | `2px solid #ffedd5` | `1.5px` |
| Background | `linear-gradient(180deg, #fff 0%, #fffaf3 100%)` | same |
| Icon colour | `#f05a1a` | same |
| Position | `left/right: 10px` (4px mobile), vertically centered | same |
| z-index | `6` | same |

---

## Fade overlay (carousel edges)

Applied to `.feature-carousel-window::before/::after`:

| Property | Value |
|----------|-------|
| Width | `40px` each side |
| Height | full window (`top: 0; bottom: 0`) in CraveMatch |
| Gradient | `#fffaf3 → transparent` |
| z-index | `3` |
| pointer-events | `none` |

**Finance Tracker note:** If fade covers card text, limit overlay height to ~200–220px (image area only). CraveMatch uses full-height fade on cream background where text remains readable.

---

## Benefits panel

| Property | Value |
|----------|-------|
| Background | `#ffffff` |
| Border | `1px solid #f3e7dc` |
| Border radius | `24px` |
| Padding | `2rem 1.75rem` |
| Shadow | `0 12px 32px rgba(0,0,0,0.06)` |
| Image height | `320px` (260px ≤991px) |

---

## Food memory marquee

| Property | Value |
|----------|-------|
| Section padding | `70px 0` |
| Background | `linear-gradient(180deg, #fffaf3 0%, #ffffff 100%)` |
| Card width | `300px` (260px ≤768px) |
| Image height | `170px` (150px mobile) |
| Fade width | `120px` (60px mobile) |
| Animation | `foodMemoryMarquee 28s linear infinite` |

---

## Footer

| Property | Value |
|----------|-------|
| Background | `linear-gradient(180deg, #243044 0%, #1a2332 100%)` |
| Colour | `#c5cdd8` |
| Padding | `2.25rem 0` |
| Border top | `2px solid rgba(251, 191, 36, 0.2)` |
| Brand colour | `var(--accent-yellow)` |
| Brand size | `1.15rem`, `font-weight: 800` |

---

## Responsive summary

| Area | ≤ 991px | ≤ 768px | ≤ 575px |
|------|---------|---------|---------|
| Hero height | 500px | — | 540px, stacked buttons |
| Carousel cards | 300px | anim 45s | 270px, smaller arrows |
| Carousel image | 200px | — | 180px |
| Benefit image | 260px | — | — |
| Food memory cards | — | 260px | — |

---

## Finance Tracker integration

1. Link `homepage-copy-style.css` after Bootstrap (if used).
2. Set `.home-page-pro { background: #fffaf3 }` or match your `--bg`.
3. Update fade gradient colour to match page background.
4. Swap hero background image paths.
5. Replace inline `homeFeatures` with Finance Tracker features (see `finance-adaptation-notes.md`).
