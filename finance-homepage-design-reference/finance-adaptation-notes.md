# Adapting CraveMatch Home Page Design → Finance Tracker

Step-by-step notes for applying this reference in your Finance Tracker Express + EJS app.

---

## What to copy

| Reference file | Place in Finance Tracker |
|----------------|--------------------------|
| `homepage-copy-template.ejs` | Merge into `app/views/index.ejs` (or partial) |
| `homepage-copy-style.css` | `app/public/css/homepage.css` or merge into `style.css` |
| `homepage-copy-script.js` | `app/public/js/homepage.js` |
| `homepage-structure.md` | Read-only guide |
| `homepage-style-guide.md` | Read-only guide |
| `homepage-carousel-guide.md` | Read-only guide |

---

## Layout mapping

| CraveMatch section | Finance Tracker equivalent |
|--------------------|----------------------------|
| Hero slider (3 slides) | Finance-themed hero slides (budget, recommendations, FinBot) |
| “What you can do” carousel | Same structure — 6 finance features |
| “Why CraveMatch helps” | “Why Finance Tracker helps” OR keep benefit list |
| “Featured from your menu” marquee | **Optional** — replace with “Live snapshot” stat grid OR omit |
| Footer | Finance Tracker footer text |

CraveMatch has **no** live snapshot on Home. Finance Tracker already uses a stat grid — place it **after** the carousel (as you do now) using the same `.home-section-block` spacing.

---

## Finance Tracker features (carousel)

Use this exact data in `homeFeatures`:

```javascript
const homeFeatures = [
  {
    title: 'Budget Alerts',
    image: '/features/budgetAlert.png',
    desc: 'Set a monthly budget and get warning alerts when spending reaches 80% or goes over 100%.',
    btn: 'Open Budget',
    link: '/budget',
    color: 'green'
  },
  {
    title: 'Smart Recommendation',
    image: '/features/recommendation.jpg',
    desc: 'Check whether a purchase is safe, risky, or not recommended based on your remaining budget.',
    btn: 'Try Recommendation',
    link: '/recommendation',
    color: 'blue'
  },
  {
    title: 'FinBot Chatbot',
    image: '/features/cravebot.png',
    desc: 'Ask finance questions and get AI-assisted replies based on your budget and spending data.',
    btn: 'Open FinBot',
    link: '/chatbot',
    color: 'dark'
  },
  {
    title: 'Dashboard Analytics',
    image: '/features/dashboard.png',
    desc: 'View your total spending, remaining budget, and spending breakdown in one place.',
    btn: 'View Dashboard',
    link: '/',
    color: 'orange'
  },
  {
    title: 'Monthly Report',
    image: '/features/month_report_feature.jpg',
    desc: 'Review your monthly spending summary and understand where your money went.',
    btn: 'Coming soon',
    link: '#',
    color: 'yellow'
  },
  {
    title: 'Savings Goal',
    image: '/features/saving_goal_feature.jpg',
    desc: 'Set a saving target and track your progress toward reaching it.',
    btn: 'Coming soon',
    link: '#',
    color: 'green'
  }
];
```

### Colour assignment rationale

| Feature | Color | Stripe / button |
|---------|-------|-----------------|
| Budget Alerts | `green` | Budget / safe spending |
| Smart Recommendation | `blue` | Insight / analysis |
| FinBot Chatbot | `dark` | AI / premium tool |
| Dashboard Analytics | `orange` | Primary CTA (CraveMatch uses orange for main actions) |
| Monthly Report | `yellow` | Secondary / coming soon |
| Savings Goal | `green` | Growth / savings |

You may swap `orange` and `blue` if Dashboard should be blue — keep one card per color variant for visual variety.

---

## Image assets

Place files in `app/public/features/`:

| Path | Feature |
|------|---------|
| `/features/budgetAlert.png` | Budget Alerts |
| `/features/recommendation.jpg` | Smart Recommendation |
| `/features/cravebot.png` | FinBot (reuse robot image) |
| `/features/dashboard.png` | Dashboard Analytics |
| `/features/month_report_feature.jpg` | Monthly Report |
| `/features/saving_goal_feature.jpg` | Savings Goal |

**Note:** If your project uses `budget_alerts.avif` instead of `budgetAlert.png`, either rename the file or update the `image` path. AVIF works in `<img>` tags in modern browsers. Use `object-fit: contain` if the image crops badly.

---

## Links (do not change routes)

| Feature | Link |
|---------|------|
| Budget Alerts | `/budget` |
| Smart Recommendation | `/recommendation` |
| FinBot Chatbot | `/chatbot` |
| Dashboard Analytics | `/` |
| Monthly Report | `#` |
| Savings Goal | `#` |

---

## Navbar adaptation

Replace CraveMatch links with Finance Tracker nav:

- Home → `/`
- Budget → `/budget`
- Recommendations → `/recommendation`
- FinBot → `/chatbot`

Keep CraveMatch navbar **structure** (dark gradient, two-tone brand, pill hover) or map to your existing `.site-header` while preserving spacing and height (`0.85rem` vertical padding).

---

## Hero slider content (suggested)

Replace CraveMatch slides with finance copy. Keep same HTML classes and JS.

| Slide | Kicker | Title | Primary CTA |
|-------|--------|-------|-------------|
| 1 | Personal finance dashboard | Manage your money with confidence | Set Budget → `/budget` |
| 2 | Spending insight | Know before you buy | View Recommendation → `/recommendation` |
| 3 | FinBot assistant | Ask FinBot for finance help | Open FinBot → `/chatbot` |

Use finance-themed hero images in `public/hero/` or reuse `dashboard.png` with overlay.

---

## Live snapshot section (Finance Tracker only)

Keep your existing stat grid below the carousel:

```ejs
<section class="home-section-block">
  <div class="section-head">...</div>
  <div class="stat-grid">...</div>
</section>
```

Match spacing to CraveMatch:

- Wrap in `.home-section-block` (`margin-bottom: 4rem`)
- Use `.home-section-title` for the H2
- Pass `summary` from Express (budget logic unchanged)

---

## Background and fade colours

CraveMatch Home uses `#fffaf3`. Finance Tracker may use `#f4f6f9` or similar.

**Important:** Update carousel fade gradients to match your page background:

```css
.feature-carousel-window::before {
  background: linear-gradient(90deg, YOUR_BG 0%, transparent 100%);
}
```

If fade covers card text, limit overlay height to image area only (~200–220px) — see Finance Tracker `website-design_branch` fix pattern.

---

## Express route (minimal)

```javascript
app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'Home',
    activePage: 'home',
    summary: buildBudgetSummary() // existing logic — do not change
  });
});
```

Features can stay inline in EJS (like CraveMatch) — no route change required.

---

## Integration checklist

1. [ ] Copy `homepage-copy-style.css` and link in header partial
2. [ ] Copy `homepage-copy-script.js` before footer
3. [ ] Replace Home `index.ejs` body with `homepage-copy-template.ejs` structure
4. [ ] Swap `homeFeatures` array with Finance Tracker features above
5. [ ] Add hero images to `public/`
6. [ ] Update navbar brand to “Finance Tracker”
7. [ ] Match fade gradient to `--bg` / page background
8. [ ] Keep budget `summary` stat section if desired
9. [ ] Do **not** modify budget, recommendation, or chatbot logic
10. [ ] Test carousel arrows + hero autoplay on mobile

---

## Differences to keep

| Item | CraveMatch | Finance Tracker |
|------|------------|-----------------|
| Feature count | 5 | 6 |
| Food memory marquee | Yes (meals DB) | Optional / omit |
| Live snapshot | No | Yes (keep) |
| Colour palette | Orange accent | Blue/green OK if spacing matches |
| Hero images | `/navbar hero/` | Your own paths |

The **layout rhythm** matters most: hero → container sections → full-width optional section → footer.

---

## Cursor prompt for Finance Tracker window

Paste this when applying in the other project:

> Use the `finance-homepage-design-reference` folder to rebuild the Finance Tracker Home page to match CraveMatch layout. Use `homepage-copy-template.ejs`, `homepage-copy-style.css`, and `homepage-copy-script.js`. Follow `finance-adaptation-notes.md` for feature cards, image paths, and links. Keep existing budget summary logic and routes unchanged.
