# PENNYPILOT — DESIGN SYSTEM & TOKEN SPECIFICATION
**Version:** 4.0.0 (Stage 1 Foundation)  
**Philosophy:** "Quiet Ledger" Editorial Fintech (Mercury, Linear, Ramp caliber)  
**Design Principles:** Typographic Primacy, Restrained Color, 1px Hairline Boundaries, High Data Density, Accessible Contrast

---

## 1. Design Philosophy & Aesthetic Pillars

PennyPilot's design system elevates personal financial intelligence into an institutional, editorial product experience. It rejects generic SaaS and consumer toy patterns (puffy border radii, gradient washes, pastel pill badges, and playful robot avatars) in favor of high-trust, audit-grade financial tools:

1. **Typographic Primacy:** Typography carries visual hierarchy. Editorial serif typography (*Newsreader*) commands headline verdicts and metric totals; high-legibility sans-serif (*Inter*) guides navigation and tabular labels; monospace (*JetBrains Mono*) enforces tabular alignment for currency, dates, and mathematical scores.
2. **1px Hairline Architecture:** Separation is achieved through crisp 1px borders (`#E5E0D8`) and neutral surface shifts, entirely eliminating muddy drop shadows and heavy card elevations.
3. **Restrained Color with Surgical Accents:** 90% of the interface consists of warm off-white canvas, pure white card surfaces, slate text, and subtle stone dividers. Deep forest teal (`#0F766E`) is reserved strictly for primary interactive focus, confirmed actions, and positive financial metrics.
4. **Information Density with Intentional Breathing Room:** Dense, compact table rows (36–40px) maximize financial data visible above the fold, balanced by clean horizontal whitespace.
5. **Universal Accessibility (WCAG 2.1 AA):** High-contrast text tiers (minimum 7.37:1 for secondary copy [AAA], and 16.93:1 for headline ink [AAA]; subtle metadata and graphical indicators meet 3.46:1–3.77:1 [AA non-text / large text], with essential body copy strictly leveraging inkMuted [7.37:1]), high-visibility 2px focus rings, and guaranteed $\ge 44\text{ px}$ mobile touch targets.

---

## 2. Color Palette & Semantic Roles

All tokens are defined in [`frontend/tailwind.config.js`](file:///d:/projects/PennyPilot/frontend/tailwind.config.js) and mapped to CSS variables in [`frontend/src/index.css`](file:///d:/projects/PennyPilot/frontend/src/index.css):

| Token Name | Hex Value | Semantic Role | Contrast Ratio |
|---|---|---|---|
| `ledger-bg` | `#F7F5F0` | Warm off-white archival canvas background | Baseline Canvas |
| `ledger-surface` | `#FFFFFF` | Pure white card and panel surface | Contrast with canvas |
| `ledger-surfaceSubtle` | `#FAF9F6` | Muted stone tint for table headers, inputs, and tag backgrounds | Subtle shift from surface |
| `ledger-surfaceHover` | `#F5F3ED` | Interactive row hover and secondary button hover | Interactive state |
| `ledger-border` | `#E5E0D8` | Primary 1px hairline structural border | Crisp structural boundary |
| `ledger-borderSubtle` | `#EFECE6` | Secondary inner divider lines and table row separators | Hairline divider |
| `ledger-borderDark` | `#D5CFC3` | Active, focused, or hovered input/button border | Focus transition |
| `ledger-ink` | `#121417` | High-contrast primary typographic ink (Headlines, balance figures) | **16.93:1** vs canvas / **18.45:1** vs white (AAA) |
| `ledger-inkMuted` | `#4A515A` | Secondary descriptive text, labels, notes | **7.37:1** vs canvas / **8.03:1** vs white (AAA) |
| `ledger-inkSubtle` | `#7D848F` | Timestamps, column headers, metadata tags, UI icons | **3.46:1** vs canvas / **3.77:1** vs white (AA Large Text / Non-text SC 1.4.11) |
| `ledger-inkFaint` | `#A4ABB5` | Placeholder text, disabled controls (WCAG exempt) | **2.12:1** vs canvas / **2.32:1** vs white (Inactive UI) |
| `ledger-teal` | `#0F766E` | Surgical primary brand accent, primary CTA, active focus | **5.02:1** vs canvas / **5.47:1** vs white (AA) |
| `ledger-tealHover` | `#0D635C` | Primary button hover and pressed state | **7.10:1** vs white (AAA) |
| `ledger-tealLight` | `#EAF4F2` | Micro-badge background and positive highlight wash | **4.88:1** contrast with `ledger-teal` text (AA) |
| `ledger-amber` | `#B45309` | Restrained warning, budget caution, statistical anomaly | **4.61:1** vs canvas / **5.02:1** vs white (AA) |
| `ledger-amberLight` | `#FEF3C7` | Warning badge background tint | **4.51:1** contrast with `ledger-amber` text (AA) |
| `ledger-red` | `#BE123C` | Critical budget overrun, deficit, delete actions | **5.77:1** vs canvas / **6.29:1** vs white (AA) |
| `ledger-redLight` | `#FEE2E2` | Critical alert badge background tint | **5.15:1** contrast with `ledger-red` text (AA) |
| `ledger-sage` | `#047857` | Confirmed income, savings rate discipline, under-budget | **5.03:1** vs canvas / **5.48:1** vs white (AA) |
| `ledger-sageLight` | `#E8F5EE` | Positive status badge background tint | **4.89:1** contrast with `ledger-sage` text (AA) |

---

## 3. Typography System

The typography system pairs three high-caliber typefaces loaded in [`frontend/index.html`](file:///d:/projects/PennyPilot/frontend/index.html):
- **Editorial Serif:** `Newsreader` (optical size 6–72, serif)
- **Interface Sans:** `Inter` (-apple-system, BlinkMacSystemFont, sans-serif)
- **Financial Monospace:** `JetBrains Mono` (Courier New, monospace)

### Typographic Hierarchy Table
| Style Name | Font Family | Size / Leading | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| **Display Verdict** | Newsreader | 28px (1.75rem) / 1.2 | 600 SemiBold | -0.025em | Main computed monthly verdict |
| **Section Title** | Newsreader | 20px (1.25rem) / 1.3 | 600 SemiBold | -0.015em | Panel and ledger section headers |
| **Metric Hero** | Newsreader | 24px (1.5rem) / 1.2 | 600 SemiBold | -0.02em | Large KPI numbers & net balance |
| **Card Heading** | Inter | 13px (0.8125rem) / 1.4 | 600 SemiBold | +0.02em | Card titles, uppercase micro-headers |
| **Body Primary** | Inter | 13px (0.8125rem) / 1.5 | 400 Regular | 0 | Descriptions, transaction notes |
| **Table Header** | Inter | 11px (0.6875rem) / 1.3 | 600 SemiBold | +0.05em | Uppercase table column headers |
| **Financial Figures** | JetBrains Mono | 13px (0.8125rem) / 1.4 | 500 Medium | -0.01em | Currency values, dates, percentages (`tabular-nums`) |
| **Micro-Tag** | Inter | 10px (0.625rem) / 1.2 | 600 SemiBold | +0.02em | Source badges, status indicators |

---

## 4. Spacing Scale, Layout & Grid

- **Layout Max Width:** `1240px` (`max-w-ledger mx-auto`).
- **Page Gutters:** `px-4 sm:px-6 lg:px-8`.
- **Vertical Section Rhythm:** 20px (`space-y-5`) to 24px (`space-y-6`) between major dashboard sections; 12px (`space-y-3`) inside cards.
- **Fixed Table Row Height:** Dense `36px` to `40px` per row.

### Elevation, Borders & Radii Rules
- **Structural Borders:** Always `1px solid #E5E0D8` (`border border-ledger-border`).
- **Inner Dividers:** `1px solid #EFECE6` (`border-b border-ledger-borderSubtle`).
- **Border Radii Hierarchy:**
  - `rounded` (`4px`): Micro-tags, category badges, status pinstripes. *(Pill shapes eliminated).*
  - `rounded-md` (`6px`): Buttons, text inputs, selects, navigation tabs.
  - `rounded-lg` (`8px`): Cards, containers, tables, charts. *(Bloated `rounded-2xl` eliminated).*
  - `rounded-xl` (`12px`): Floating dialogs and slide-over drawers.
- **Shadow System:**
  - `shadow-hairline`: `0 1px 2px 0 rgba(18, 20, 23, 0.03)`
  - `shadow-subtle`: `0 1px 2px 0 rgba(18, 20, 23, 0.04)` (standard card elevation)
  - `shadow-float`: `0 8px 24px -4px rgba(18, 20, 23, 0.08), 0 2px 6px -1px rgba(18, 20, 23, 0.04)` (modals)

---

## 5. Shared Component Visual Foundations

Reusable utility classes established in [`frontend/src/index.css`](file:///d:/projects/PennyPilot/frontend/src/index.css):

### 5.1 Institutional Buttons
```html
<!-- Primary Button -->
<button class="btn-primary focus-ring">
  <Plus class="w-3.5 h-3.5" />
  <span>Quick Add</span>
</button>

<!-- Secondary Button -->
<button class="btn-secondary focus-ring">
  <span>Export CSV</span>
</button>

<!-- Ghost Button -->
<button class="btn-ghost focus-ring">
  <span>View All</span>
</button>
```

### 5.2 Input & Select Controls
```html
<input 
  type="text" 
  class="input-base focus-ring" 
  placeholder="Search description, merchant, or notes..." 
/>
```

### 5.3 Micro-Badges & Status Tags
```html
<!-- Positive / Income Tag -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase border border-ledger-sage/30 bg-ledger-sageLight text-ledger-sage">
  On Track
</span>

<!-- Warning / Pacing Tag -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase border border-ledger-amber/30 bg-ledger-amberLight text-ledger-amber">
  Over Pace
</span>
```

### 5.4 Card Container
```html
<div class="card-base">
  <div class="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
    <h3 class="font-serif text-lg font-bold text-ledger-ink">Section Title</h3>
  </div>
  <!-- Content -->
</div>
```

---

## 6. Accessibility & Mobile Standards

1. **Focus Ring:** Every interactive element features high-visibility focus management:
   `focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-teal focus-visible:ring-offset-2 focus-visible:ring-offset-ledger-bg`
2. **Mobile Touch Targets:** All navigation links, buttons, and row actions guarantee at least **44x44px** clickable area on mobile screens.
3. **Tabular Numerics:** All currency values, dates, percentages, and metrics enforce `font-variant-numeric: tabular-nums` to prevent horizontal jitter during updates.
4. **Safe Area Insets:** Fixed bottom elements (mobile navigation bar, toasts) enforce `pb-safe` (`padding-bottom: env(safe-area-inset-bottom, 16px)`).
5. **Zero Unintended Scroll:** Root and body containers enforce `overflow-x-hidden`. Horizontal scroll is strictly scoped to wide data tables.

---

## 7. Migration Roadmap for Subsequent Stages

- **Stage 2:** Navigation & App Shell (apply revised `Navbar` across all viewports).
- **Stage 3:** Executive Financial Dashboard & Budget Pace Hero Chart.
- **Stage 4:** Transactions Ledger Data Grid & Command Palette Quick-Add.
- **Stage 5:** Budget Allocation Matrix Table.
- **Stage 6:** Copilot Split-Pane Terminal & Monthly Memorandum Report.
