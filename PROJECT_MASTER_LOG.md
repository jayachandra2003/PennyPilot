# PennyPilot — Master Project Development Log & System State

> **Document Status:** Single Source of Truth for PennyPilot Development  
> **Last Updated:** 2026-11-08 01:25:00 IST (UTC+05:30)  
> **Author & Maintainers:** Antigravity (Ang) & ChatGPT Collaborative Engineering  
> **Target Audiences:** AI Agents (Ang, ChatGPT), Engineers, Code Reviewers  
> **Location:** Root directory (`D:\projects\PennyPilot\PROJECT_MASTER_LOG.md`)

---

## 1. Current Project Snapshot

### 1.1 Project Overview & Mission
**PennyPilot** is an institutional-grade personal finance and cash flow intelligence platform engineered under the **Quiet Ledger** design philosophy. It operates on five uncompromised prime directives:
1. **Compute, Then Explain (Zero Financial Hallucination):** Arithmetic, aggregation, and budget pacing happen strictly in deterministic Python functions (`backend/app/domain/`) with integer paise precision (`₹1.00 = 100 paise`). LLMs only receive verified `FactBundle` structures to narrate or explain. Floating-point numbers (`float`) are strictly forbidden for currency storage and calculations.
2. **Strict Integer Paise Convention:** All monetary amounts in database tables, SQLAlchemy models, Pydantic schemas, and calculations are stored as integer paise. Currency formatting to INR (`₹XX,XX,XXX.XX`) happens exclusively at the UI presentation boundary.
3. **Multi-Tenant User Isolation:** Every query for transactions, categories, budgets, and analytics enforces server-side filtering on `user_id`. Client state is untrusted.
4. **Strict Zero-Budget ($0) Guarantee:** No paid APIs or mandatory subscription keys. 3-tier fallback architecture: Hosted Free Tier (Gemini / Groq) $\rightarrow$ Local Ollama (Qwen 2.5:3B) $\rightarrow$ Rule-based Deterministic Python Engine.
5. **Quiet Ledger Design System & Midnight Ledger Dark Mode:** Institutional typography, tabular figures (`font-variant-numeric: tabular-nums`), WCAG AAA contrast, responsive layout ($\ge 44\text{px}$ touch targets), and a premium deep slate-navy dark theme (`#101820`).

---

### 1.2 Technology Stack

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Backend Core** | Python 3.10+, FastAPI 0.110+, Pydantic v2, Uvicorn, AnyIO |
| **Database & ORM** | SQLite 3 (production-grade local), SQLAlchemy 2.0+, Alembic migrations |
| **Authentication** | Argon2 password hashing, JWT Bearer tokens (RS256/HS256), Google OAuth 2.0 (`id_token` verification), secure httpOnly refresh sessions |
| **Email & Recovery** | Asynchronous SMTP delivery, Brevo API integration, time-bound cryptographic tokens |
| **Domain Financial Engine**| Pure Python financial calculus, zero-dependency domain models (`backend/app/domain/`) |
| **AI Copilot** | Multi-tier provider abstraction: Gemini 1.5 Flash (free tier) / Groq Llama 3 / Ollama (Qwen 2.5:3B) / Rule-based fallbacks |
| **Frontend Framework** | React 18, TypeScript 5+, Vite 8, Tailwind CSS 3.4, Lucide React icons |
| **Data Fetching & State** | TanStack React Query v5, Context API (`AuthContext`, `ThemeContext`) |
| **PWA & Offline** | Vite PWA Plugin, Workbox service worker caching static shell only (`dist/sw.js`), custom `usePWAInstallPrompt` hook |
| **Testing Harness** | Pytest 8, pytest-asyncio, Faker, Vitest 5.1, React Testing Library, Playwright / CDP automation |

---

### 1.3 System Architecture

```
PennyPilot/
├── backend/
│   ├── alembic/              # Database migration versions
│   │   └── versions/         # 5b1607c5516d -> f6ad16d353fd -> 8a7b6c5d4e3f -> 9b8c7d6e5f4a -> c1a2b3c4d5e6 -> d2e3f4a5b6c7 (head)
│   ├── app/
│   │   ├── api/              # Versioned API routes under /api/v1 (auth, transactions, budgets, categories, analytics, copilot, income, onboarding, notifications)
│   │   ├── core/             # Configuration, security (Argon2, JWT), database setup
│   │   ├── db/               # SQLAlchemy Base, session generator
│   │   ├── domain/           # Pure Python financial engine (aggregates, pace, anomalies, facts, financial_plan)
│   │   ├── models/           # SQLAlchemy ORM models (User, Category, Transaction, Budget, Token, Session, Notification)
│   │   ├── schemas/          # Pydantic v2 request/response schemas
│   │   └── services/         # Orchestration, AI clients, verification, OAuth, email, notifications
│   ├── tests/                # 162 passing pytest unit, integration, and security tests
├── frontend/
│   ├── src/
│   │   ├── components/       # UI modules: dashboard, transactions, budgets, analytics, categories, copilot, auth, profile, settings, income, onboarding
│   │   ├── context/          # AuthContext (auth state, token), ThemeContext (light, dark, system)
│   │   ├── hooks/            # usePWAInstallPrompt, responsive observers
│   │   ├── lib/              # API client (fetch client), currency formatters (paiseToRupees, formatINR)
│   │   └── types/            # TypeScript domain interfaces
│   ├── dist/                 # Production-built PWA bundle
│   └── tests/                # 77 passing Vitest unit & integration tests
├── penny_pilot.db            # Canonical SQLite database (540,672 bytes, PRAGMA integrity = ok, 14 tables)
├── scripts/                  # Dev automation, database seeding, verification & CDP screenshot scripts
└── PROJECT_MASTER_LOG.md     # Single Source of Truth
```

---

### 1.4 Database Structure & Migration Status
- **Canonical Database File:** `D:\projects\PennyPilot\penny_pilot.db` (anchored at project root via `backend/app/core/config.py`)
- **Current Alembic Revision:** `d2e3f4a5b6c7 (head)`
- **Database Integrity & Health Status (Verified 2026-11-07 18:00 IST):**
  - File Size: `540,672 bytes`
  - `PRAGMA integrity_check`: `ok` (zero corruption detected)
  - `PRAGMA foreign_key_check`: `0 violations`
  - Canonical Script: `scripts/verify_db_status.py` imports `app.core.config.settings.DATABASE_URL` dynamically, guaranteeing all integrity and row count queries run exclusively against the canonical database.
- **Migration History:**
  1. `5b1607c5516d`: Initial schema (users, categories, transactions, budgets, financial_goals, recurring_transactions).
  2. `f6ad16d353fd`: Added `avatar_url` to `users`.
  3. `8a7b6c5d4e3f`: Added `oauth_accounts`, `sessions`, `email_verified` to `users`.
  4. `9b8c7d6e5f4a`: Added `email_verification_tokens` and `password_reset_tokens`.
  5. `c1a2b3c4d5e6`: Added `onboarding_completed` and `monthly_savings_target_paise` to `users`.
  6. `d2e3f4a5b6c7`: Added `notifications` table with user foreign key cascade.

#### Current Canonical Database Record Counts (Verified 2026-11-07 18:00 IST):
| Table Name | Active Row Count | Purpose & Integrity Constraints |
| :--- | :---: | :--- |
| `alembic_version` | 1 | Tracks current migration revision (`d2e3f4a5b6c7`) |
| `users` | 1 | Preserved canonical user account |
| `categories` | 12 | Default standard financial categories |
| `transactions` | 0 | Clean state |
| `budgets` | 0 | Clean state |
| `sessions` | 1 | Verified active session |
| `oauth_accounts` | 1 | Verified link fixture |
| `oauth_transactions` | 1 | Verified link fixture |
| `email_verification_tokens` | 0 | Clean token state |
| `password_reset_tokens` | 0 | Clean token state |
| `notifications` | 0 | Clean notification state |
| `financial_goals` | 0 | Schema preserved for Milestone 5 |
| `recurring_transactions` | 0 | Schema preserved for Milestone 6 |
| `insights` | 0 | Schema preserved |

---

### 1.5 UI, Branding & Design System
- **Visual Direction:** **Restaurant/Cafe Billing Glassmorphism** (Dark & Light Modes) inspired by Sandeep Slaria's Billing System concept. Multi-layered frosted glass panels, ambient aurora light meshes, jewel gradient iconography, and specular hairline borders.
- **Official Brand Assets:**
  - Full Wordmark + Emblem: Teal-to-navy monogram "P" with gold geometric facets and ascending growth arrow.
  - Public Assets: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`.
- **Active Design Tokens (Glassmorphic Midnight / Sapphire Dark Mode):**
  - Viewport Canvas: `#0C131D` with atmospheric aurora glow meshes (deep teal & emerald)
  - Frosted Card Surface: `rgba(20, 31, 46, 0.72)` with `backdrop-blur-xl`
  - Elevated Popover Surface: `rgba(18, 28, 40, 0.95)` with `backdrop-blur-2xl`
  - Specular Hairline Border: `rgba(255, 255, 255, 0.12)`
  - Inner Highlight: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)`
  - Primary Typography: `#F1F5F9` (crisp frosted white)
  - Secondary Typography: `#94A3B8` (slate muted)
  - Bioluminescent Teal Accent: `#2DD4BF` (Hover: `#5EEAD4`, Glow: `rgba(45, 212, 191, 0.25)`)
  - Glowing Surplus / Inflow: `#34D399` with emerald glow
  - Glowing Outflow / Expense: `#F87171` with coral glow
  - Pacing Caution / Warning: `#FBBF24`
- **Active Design Tokens (Glassmorphic Luminous Pearl Light Mode):**
  - Viewport Canvas: `#F4F6F9` with soft ambient radial meshes (warm emerald, teal, sky)
  - Frosted Crystal Card Surface: `rgba(255, 255, 255, 0.75)` with `backdrop-blur-xl`
  - Elevated Popover Surface: `rgba(255, 255, 255, 0.96)` with `backdrop-blur-2xl`
  - Specular Crystal Border: `rgba(255, 255, 255, 0.85)`
  - Outer Shadow: `0 8px 32px 0 rgba(31, 38, 135, 0.07)`
  - Primary Typography: `#0F172A` (deep slate)
  - Secondary Typography: `#475569`
  - Deep Teal Accent: `#0D9488`
- **Iconography:** Multi-layered dimensional `GlassIcon` with translucent jewel gradient fills, top specular highlights, and glowing aura drop shadows.

---

### 1.6 Key API Endpoints (`/api/v1`)

| Module | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user with Argon2 hashing and email verification trigger |
| **Auth** | `POST` | `/api/v1/auth/login` | Email/password login returning JWT and session cookie |
| **Auth** | `POST` | `/api/v1/auth/google` | Google OAuth token exchange and automatic user creation |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch authenticated user profile and preferences |
| **Auth** | `PUT` | `/api/v1/auth/profile` | Update display name, timezone, currency |
| **Auth** | `POST` | `/api/v1/auth/avatar` | Upload profile image (JPEG, PNG, WebP up to 2MB) |
| **Auth** | `DELETE`| `/api/v1/auth/avatar` | Delete profile image |
| **Income** | `GET` | `/api/v1/income` | List monthly income items, total inflow paise, and source breakdown |
| **Income** | `POST`| `/api/v1/income` | Record income entry with recurring rule, category match, and integer paise |
| **Income** | `PUT` | `/api/v1/income/{id}` | Update income entry (amount, source, date, recurring) |
| **Income** | `DELETE`| `/api/v1/income/{id}` | Soft-delete income record and deactivate recurring rule |
| **Onboarding**| `GET` | `/api/v1/onboarding/status` | Get onboarding status, savings target, and setup flags |
| **Onboarding**| `POST`| `/api/v1/onboarding/setup` | Atomically commit income, category budgets, savings target, and complete onboarding |
| **Onboarding**| `POST`| `/api/v1/onboarding/skip` | Defer onboarding setup without blocking app |
| **Onboarding**| `GET` | `/api/v1/onboarding/plan-summary` | Fetch deterministic financial plan summary (income, allocated budget, planned savings cushion) |
| **Categories**| `GET` | `/api/v1/categories/` | Fetch user categories (supports `include_archived=true`) |
| **Categories**| `POST`| `/api/v1/categories/` | Create custom category (name, kind, icon, color_token) |
| **Categories**| `PUT` | `/api/v1/categories/{id}` | Update category name, icon, or color |
| **Categories**| `DELETE`| `/api/v1/categories/{id}` | Safe archive category (blocked if active transactions or budget exist) |
| **Transactions**| `GET` | `/api/v1/transactions/` | List transactions with pagination, search, category & date filters |
| **Transactions**| `POST`| `/api/v1/transactions/` | Record transaction with integer paise |
| **Transactions**| `POST`| `/api/v1/transactions/parse` | Natural language text parsing into structured transaction |
| **Budgets** | `GET` | `/api/v1/budgets/overview` | Monthly budget overview with category-wise status and pacing |
| **Budgets** | `POST`| `/api/v1/budgets/` | Set or update category spending limits |
| **Analytics**| `GET` | `/api/v1/analytics/historical` | 6-month retrospective trends, MoM deltas, category shifts |
| **Copilot** | `POST`| `/api/v1/copilot/query` | Grounded financial intelligence inquiry using FactBundle |
| **Copilot** | `GET` | `/api/v1/copilot/monthly-report`| Comprehensive monthly executive report |
| **Health** | `GET` | `/api/v1/health` | Application health and database connection status |

---

### 1.7 Current Milestone & Verification Status
- **Current Milestone:** Dashboard Final Content Cleanup & Dedicated Insights Page Complete.
- **Verification Status:**
  - Automated Backend Tests: **150 passed**, 0 failed across 25 test files (`pytest backend/tests`, duration: 73.21s).
  - Automated Frontend Tests: **81 passed**, 0 failed across 14 test suites (`npm --prefix frontend test -- --run`, duration: 1.58s).
  - Frontend Production Build: **100% Success** (`tsc -b && vite build` in 3.64s, static precached assets: 27 entries).
  - Database Integrity: `PRAGMA integrity_check` = `ok`, 540,672 bytes, 0 foreign key violations, Alembic revision `d2e3f4a5b6c7`, all 14 tables preserved.
  - Browser CDP Verification: 8 comprehensive screenshots captured across Light & Dark themes, desktop (1440px) and mobile (390px):
    - Monthly Verdict banner completely removed and header height rebalanced.
    - `EXECUTIVE POSITION` removed; greeting enlarged to clear secondary heading.
    - `💡 Insights` navigation item added to top navbar and opens dedicated Financial Insights page.
    - `Financial Insights` card completely removed from Dashboard bottom.
    - `SPENDING VELOCITY` and `AUDIT TRAIL` redundant labels removed.
    - `Transactions` ledger page verified 100% untouched and functional.

---

## 2. Chronological Development History

### Entry 2026-11-07 21:30 IST — Budget Management Polish, Calendar Pickers, Document Exports & Analytics De-Blurring
- **A. Change Request:** The user requested visual improvements and UX refinements across the **Budgets** page and the **Analytics** page:
  1. **Budget Page Calendar:** Add interactive `CalendarMonthPicker` to the header of the Budget Management page (similar to Dashboard).
  2. **Tactile Adjust Budget Limit Buttons:** Upgrade washed-out white buttons to tactile, high-contrast Quiet Ledger styling.
  3. **Humanized Status Badges:** Replace robotic uppercase monospace AI-generated tags (`OVER PACE`, `ON TRACK`) with clean institutional status pills with colored indicator dots (`● On Track`, `● Caution`, `● Over Pace`, `● Over Budget`, `● Uncapped`).
  4. **Streamlined Monthly Spending Velocity Card:** Redesign the bloated "Monthly Spending Velocity & Pacing" card by removing duplicated `Actual Spend` and `Remaining Buffer` boxes and generic AI callouts. Focus exclusively on forward velocity telemetry: `Daily Spending Velocity`, `Allowable Daily Target`, `Projected Month-End Spend`, real-time pacing badge, and dual-indicator timeline track.
  5. **Analytics Page Calendar:** Implement `CalendarMonthPicker` in `HistoricalAnalytics.tsx` range navigator for intuitive month selection.
  6. **Analytics Multi-Format Exports:** Add `Export Report` dropdown menu supporting CSV, PDF, and DOCX statements.
  7. **Analytics Bottom Half De-Blurring:** Fix the blur and haze on the bottom half of the Analytics page caused by background aurora mesh (`blur-[160px]`) bleeding through translucent cards.
- **B. Implementation:**
  - `frontend/src/components/budgets/BudgetManagement.tsx`:
    - Replaced static month label with `CalendarMonthPicker` flanked by `<ChevronLeft>` and `<ChevronRight>` stepper controls.
    - Upgraded `Adjust Budget Limit` button with tactile high-contrast Quiet Ledger styling (`bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-300/90 dark:border-slate-600/80 shadow-xs active:scale-[0.99]`).
    - Humanized status badges in both category cards and the Spending Pace metric with colored status dots (`w-1.5 h-1.5 rounded-full`) and title case typography.
    - Streamlined the "Monthly Spending Velocity" card into a forward-looking velocity instrument (`Daily Spending Velocity: ₹740.00 / day`, `Allowable Daily Target: ₹1,426.96 / day`, `Projected Month-End Spend: ₹22,200.00`).
  - `frontend/src/components/analytics/HistoricalAnalytics.tsx`:
    - Integrated `CalendarMonthPicker` in the period navigation bar with `endYear` / `endMonth` dynamic state update.
    - Added `Export Report` dropdown menu with one-click export actions for `.csv`, `.pdf` (jsPDF + autoTable statement), and `.docx` (OpenXML Word document).
    - De-blurred bottom drilldown panels: replaced semi-transparent `bg-ledger-surface` with solid opaque `bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card rounded-2xl` surfaces.
    - Elevated text contrast to `text-slate-900 dark:text-slate-100` and `text-slate-700 dark:text-slate-300`, with solid inner card backgrounds (`bg-slate-50 dark:bg-slate-800/70`) and solid category progress tracks (`bg-slate-100 dark:bg-slate-800`), completely eliminating all blur and translucency haze.
  - `frontend/src/lib/exportReports.ts` & `exportReports.test.ts`:
    - Implemented and unit-tested pure deterministic builders for historical analytics CSV, PDF, and DOCX reports with integer paise accuracy.
- **C. Verification:**
  - Automated Backend Tests: **150 passed**, 0 failed (`pytest backend/tests`).
  - Automated Frontend Tests: **86 passed**, 0 failed (`npm --prefix frontend test -- --run`).
  - Frontend Production Build: **100% Success** (`npm --prefix frontend run build`, 30 precached assets).
  - Canonical Database: Intact (`PRAGMA integrity_check = ok`, 0 FK violations).
  - Browser CDP Visual Verification (10 screenshots captured across Light & Dark themes):
    - `audit_budget_top_view.png` & `audit_budget_calendar_open.png`: Verified CalendarMonthPicker interactive popover on Budget page.
    - `audit_budget_top_velocity_light.png`: Verified streamlined Monthly Spending Velocity card and forward-looking velocity metrics.
    - `audit_budget_category_cards_tactile.png`: Verified humanized status pills (`● On Track`, `● Over Pace`) and tactile `Adjust Budget Limit` buttons.
    - `audit_analytics_top_trends_verified.png`: Verified Analytics header with CalendarMonthPicker and Export Report button.
    - `audit_analytics_export_dropdown_verified.png`: Verified open Export Report menu with CSV, PDF, DOCX options.
    - `audit_analytics_calendar_popover_verified.png`: Verified open Calendar picker popover on Analytics page.
    - `audit_analytics_deblurred_bottom_verified_light.png` & `audit_analytics_deblurred_bottom_verified_dark.png`: Verified razor-sharp, solid, de-blurred bottom half in both Light and Dark themes.

### Entry 2026-11-07 20:15 IST — Dashboard Final Content Cleanup & Dedicated Insights Page
- **A. Change Request:** The user requested a focused content cleanup and UI alignment pass:
  1. **Remove Monthly Verdict:** Completely remove the green Monthly Verdict banner from the Financial Overview header, eliminate the space reserved for it, and rebalance the header height and spacing without adding another banner.
  2. **Remove Executive Position:** Remove the small uppercase `EXECUTIVE POSITION` label; retain the time-of-day greeting (`Good evening, Jaya!`) and increase its font size to serve as a clear secondary heading above `Financial Overview`.
  3. **Move Financial Insights to Top Navigation:** Add a dedicated `Insights` item to the main top navbar with an appropriate icon (`Lightbulb`); clicking it opens a dedicated `Financial Insights` page (`InsightsView.tsx`); preserve all existing insight calculations, explanations, and working navigation actions; completely remove the Financial Insights card from the bottom of the Dashboard; keep AI Copilot as a separate item.
  4. **Remove Unnecessary Section Labels:** Remove decorative labels `SPENDING VELOCITY` (above Financial Trajectory & Daily Velocity) and `AUDIT TRAIL` (above Recent Transactions) while keeping section titles intact.
  5. **Preserve Transactions Page:** Do not modify the Transactions page.
  6. **Dashboard Final Layout:** Financial Overview header -> 3 KPI cards Row 1 -> 3 KPI cards Row 2 -> Monthly Cash Flow & Expense Distribution -> Financial Trajectory & Daily Velocity -> Recent Transactions and Income Streams side-by-side.
- **B. Implementation:**
  - `frontend/src/components/dashboard/DashboardHeader.tsx`: Removed `Monthly Verdict` banner, removed inner border/reserved spacing, removed `EXECUTIVE POSITION` and bullet, enlarged greeting to `text-sm sm:text-base font-medium text-ledger-teal`, and cleaned up unused alert icons.
  - `frontend/src/components/dashboard/BudgetIntelligenceCard.tsx`: Removed `SPENDING VELOCITY` label above `Financial Trajectory & Daily Velocity`.
  - `frontend/src/components/dashboard/RecentTransactionsCard.tsx`: Removed `AUDIT TRAIL` label above `Recent Transactions`.
  - `frontend/src/components/common/Navbar.tsx`: Added `Lightbulb` icon and `Insights` navigation item to `desktopNavItems` and the mobile navigation drawer, while keeping `AI Copilot` distinct.
  - `frontend/src/components/insights/InsightsView.tsx`: Created the dedicated Financial Insights page with a header banner, 4 high-density summary stat cards (Budget Trajectory, Detected Outliers, Capital Retention, Net Savings), and 4 detailed intelligence panels with working actions (`Adjust Category Allocations →`, `Inspect in Ledger →`, `Explore Historical Trends →`, `Review Active Budgets →`).
  - `frontend/src/components/common/Skeleton.tsx`: Updated `TwoColumnCardsSkeleton` to mirror Recent Transactions (7 cols) and Income Streams (5 cols).
  - `frontend/src/App.tsx`: Added `currentTab === "insights"` route rendering `InsightsView`; removed `InsightCards` from Dashboard; balanced Row 5 with `RecentTransactionsCard` (7 cols) and `IncomeSourceBreakdownCard` (5 cols).
  - `frontend/src/components/insights/insights.test.ts`: Added unit tests covering pacing evaluation, burn velocity, savings discipline thresholds, and statistical anomaly multipliers.
- **C. Verification:**
  - Automated Backend Tests: **150 passed**, 0 failed in 73.21s (`pytest backend/tests`).
  - Automated Frontend Tests: **81 passed**, 0 failed in 1.58s (`npm --prefix frontend test -- --run`).
  - Production Build: **100% Success** in 3.64s (`tsc -b && vite build`, 27 precached assets).
  - Canonical Database: 14 tables verified intact (`PRAGMA integrity_check = ok`, 0 FK violations, revision `d2e3f4a5b6c7`).
  - Browser CDP Verification captures:
    - `audit_clean_dashboard_header_light.png` & `dark.png`: Verified Monthly Verdict gone, Executive Position gone, greeting larger, Insights tab in top navbar.
    - `audit_clean_dashboard_lower_light.png` & `dark.png`: Verified Spending Velocity gone, Audit Trail gone, zero Financial Insights card at bottom of dashboard (only Recent Transactions & Income Streams side-by-side).
    - `audit_clean_insights_page_light.png` & `dark.png`: Verified dedicated Financial Insights page with full signals and working actions.
    - `audit_clean_transactions_page_light.png`: Verified Transactions ledger page completely unchanged and intact.
    - `audit_clean_mobile_dashboard_dark.png` & `mobile_insights_light.png`: Verified mobile responsive rendering.

### Entry 2026-11-07 19:40 IST — Dashboard PDF Layout Alignment & Two-Page Architecture
- **A. Change Request:** The user attached the approved design document **PennyPilot — Dashboard Layout Redesigns** (2-page reference PDF) and requested exact visual and structural implementation across the application without altering backend financial calculations:
  1. **Page 1 Layout Implementation:**
     - Header Panel: Financial Overview title, executive greeting, functional Monthly/Yearly toggle, date picker, `+ Quick Add` button, and Monthly Verdict callout banner.
     - Row 1 KPI (3 cards): Total Income (with `Manage` button), Total Expenses (with entry count badge), Actual Savings (+ Surplus / - Deficit badge).
     - Row 2 KPI (3 cards): Remaining Budget (with `Edit Budget` button), Budget Utilization (with bold primary figure `13.2%`, progress meter, daily pace), Savings Cushion (`Unallocated` badge, surplus above budget ceilings).
     - Row 3 Balanced 2-Column Section:
       - *Left:* `Monthly Cash Flow` featuring mini comparative bars for Inflow (teal) and Outflow (rose), 3 key figure blocks (Total Inflow, Total Outflow, Net Savings), supporting Savings Rate pill, and Cash Flow Allocation ratio bar.
       - *Right:* `Expense Distribution` featuring Donut Chart SVG on the left with center `TOTAL OUTFLOW` & formatted amount, and the Category Legend list on the right (colored dots, names, amounts, percentages) in a responsive side-by-side flex layout.
     - Row 4: `Financial Trajectory & Daily Velocity` (`BudgetIntelligenceCard` with Daily Bars / Cumulative Pace toggle, Day 1–30 chart, and status footer).
  2. **Page 2 Layout Implementation (Asymmetric 2-Column Split):**
     - Left Wider Column (`lg:col-span-7 xl:col-span-8`): `Recent Transactions` Audit Trail card with `+ Add` button, `View All Ledger →` link, and transaction table (`MERCHANT / NOTE`, `CATEGORY`, `DATE`, `TYPE`, `AMOUNT`).
     - Right Column (`lg:col-span-5 xl:col-span-4`):
       - *Top:* `Income Streams` card (`$ Income Streams`, stream count, `Manage` button, source breakdown bars).
       - *Bottom (stacked directly below Income Streams in the same right column):* `Financial Insights` card (`SIGNALS & INTELLIGENCE`, vertically stacked insights with dividers: Budget Pace On Track, Outlier Detected, Strong Savings Discipline, and action links `Adjust Allocations →`, `Inspect in Ledger →`, `Explore Trends →`).
  3. **Yearly Mode Adaptation:**
     - In yearly view (`period === "yearly"`), the monthly ceiling is annualized (`allocatedCeilingPaise * 12`), showing `of ₹4,56,000.00 annual ceiling`, `Annualized budget baseline`, and annual savings cushion, preventing misleading monthly budget deficit warnings while preserving deterministic integer paise domain math.
- **B. Implementation:**
  - `frontend/src/components/dashboard/InsightCards.tsx`: Refactored into a single card container with a vertical stack of insights separated by subtle dividers (`divide-y divide-ledger-borderSubtle`), matching Page 2 of the PDF.
  - `frontend/src/components/dashboard/ExpenseDonutChart.tsx`: Restructured layout into a side-by-side horizontal view (`flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6`): Donut SVG on left, Category Legend on right.
  - `frontend/src/components/dashboard/CompactCashFlowSummary.tsx`: Added comparative mini horizontal bars for Inflow and Outflow right under the card header, above the 3 bold totals and Cash Flow Allocation percentage bar.
  - `frontend/src/components/dashboard/MetricCards.tsx`: Added bold display percentage `utilizationPct.toFixed(1)}%` to Budget Utilization card; added annualized baseline calculations for yearly mode (`effectiveCeilingPaise = isYearly ? monthlyCeilingPaise * 12 : monthlyCeilingPaise`).
  - `frontend/src/components/common/Skeleton.tsx`: Updated `TwoColumnCardsSkeleton` to mirror the asymmetric 7/5 column grid.
  - `frontend/src/App.tsx`: Arranged lower dashboard into the asymmetric 2-column grid: `lg:col-span-7` for `RecentTransactionsCard`, `lg:col-span-5` with `space-y-4` containing `IncomeSourceBreakdownCard` and `InsightCards`.
- **C. Verification:**
  - Automated Backend Tests: **150 passed**, 0 failed in 73.21s (`pytest backend/tests`).
  - Automated Frontend Tests: **77 passed**, 0 failed in 1.08s (`npm --prefix frontend test -- --run`).
  - Production Build: **100% Success** in 2.14s (`tsc -b && vite build`, 27 precached assets).
  - Canonical Database: 14 tables verified intact (`PRAGMA integrity_check = ok`, 0 FK violations, revision `d2e3f4a5b6c7`).
  - Browser CDP Verification captures:
    - `audit_dashboard_1440_light.png` & `dark.png`: Matches Page 1 of the PDF (KPI rows, Cash Flow with mini bars, side-by-side Expense Donut).
    - `audit_pdf_page2_light.png` & `dark.png`: Matches Page 2 of the PDF (Recent Transactions on left, Income Streams & Financial Insights vertically stacked on right).
    - `audit_dashboard_yearly_light.png`: Verified annualized baseline ceiling and adaptive presentation in yearly view.
    - `audit_navbar_scrolled_light.png`: Verified translucent frosted navbar fixed at top during scrolling.
    - `audit_dashboard_768_light.png` & `390_light.png`: Verified tablet and mobile responsive adaptations.

### Entry 2026-11-07 19:15 IST — Dashboard Simplification, Section Removals & Translucent Frosted Navbar
- **A. Change Request:** The user requested a focused PennyPilot dashboard simplification and alignment pass with zero new features and zero backend calculation changes:
  1. **Section Removals:**
     - Remove the standalone Savings Rate KPI card.
     - Remove the Top Outflow Area KPI card.
     - Remove the entire Category Spending section (including its distribution bars and category list).
     - Do not leave empty grid spaces or hidden placeholders.
  2. **Retained Sections:**
     - Total Income (with Manage button), Total Expenses, Actual Savings.
     - Remaining Budget (with Edit Budget button), Budget Utilization, Savings Cushion.
     - Monthly Cash Flow (with Savings Rate integrated as a small supporting metric), Expense Distribution.
     - Financial Trajectory & Daily Velocity (`BudgetIntelligenceCard`).
     - Income Streams (`IncomeSourceBreakdownCard`) and Recent Transactions (`RecentTransactionsCard`).
     - Financial Insights (`InsightCards`).
  3. **Rearranged Dashboard Hierarchy:**
     - Row 1: Total Income, Total Expenses, Actual Savings (3 cards, responsive grid).
     - Row 2: Remaining Budget, Budget Utilization, Savings Cushion (3 cards, responsive grid).
     - Row 3: Monthly Cash Flow and Expense Distribution, balanced side-by-side.
     - Row 4: Financial Trajectory & Daily Velocity.
     - Row 5: Income Streams and Recent Transactions, balanced side-by-side.
     - Row 6: Financial Insights.
  4. **Navbar Opacity & Translucency Correction:**
     - Replaced the completely solid white navbar with a slightly translucent frosted surface (~92% white opacity in Light mode: `bg-white/92 backdrop-blur-md border-b border-slate-200/80`).
     - Consistent Midnight Ledger dark-mode styling: `dark:bg-[#101820]/92 dark:backdrop-blur-md dark:border-[#2A3B45]/80`.
     - Softly diffuses content during scroll without distracting bleed-through.
  5. **Card Alignment & Equal Heights:**
     - Applied `h-full flex flex-col justify-between` to all cards in each row.
     - Standardized padding and typography.
     - Responsive grid avoiding 3-column squeeze on mobile (`grid-cols-1 md:grid-cols-3`).
- **B. Implementation:**
  - `frontend/src/components/dashboard/MetricCards.tsx`: Rewrote component into two 3-card responsive rows (`Row 1: Total Income, Total Expenses, Actual Savings; Row 2: Remaining Budget, Budget Utilization, Savings Cushion`) using `grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0`. Removed standalone Savings Rate and Top Outflow Area cards, leaving zero gaps.
  - `frontend/src/components/dashboard/CompactCashFlowSummary.tsx`: Integrated Savings Rate as a prominent supporting pill in the card header (`Target` icon, rate percentage, disciplined indicator) and in the Net Savings sub-caption. Retained Total Inflow, Total Outflow, Net Savings, and proportional retention bar.
  - `frontend/src/components/common/Navbar.tsx`: Updated `<header>` and mobile bottom `<nav>` to `bg-white/92 dark:bg-[#101820]/92 backdrop-blur-md border-b border-slate-200/80 dark:border-[#2A3B45]/80`.
  - `frontend/src/components/dashboard/RecentTransactionsCard.tsx`: Added `h-full flex flex-col justify-between` to match `IncomeSourceBreakdownCard` in height.
  - `frontend/src/components/common/Skeleton.tsx`: Updated `DashboardMetricCardsSkeleton` to match the two-row 3x2 grid layout.
  - `frontend/src/App.tsx`: Removed `CategoryBreakdownCard` completely; paired `IncomeSourceBreakdownCard` and `RecentTransactionsCard` into a responsive 2-column grid (`grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 min-w-0 items-stretch`) directly beneath `BudgetIntelligenceCard`.
- **C. Verification:**
  - Automated Backend Tests: **150 passed**, 0 failed in 72.28s (`pytest backend/tests`).
  - Automated Frontend Tests: **77 passed**, 0 failed in 1.12s (`npm --prefix frontend test -- --run`).
  - Production Build: **100% Success** in 1.63s (`npm --prefix frontend run build`, 27 precached assets).
  - Canonical Database: 14 tables verified intact (`PRAGMA integrity_check = ok`, 0 FK violations, revision `d2e3f4a5b6c7`).
  - Browser CDP Verification across 1440px, 1280px, 768px, and 390px in both Light and Dark modes:
    - `audit_dashboard_1440_dark.png`, `1440_light.png`: Verified exact 3-card Row 1, 3-card Row 2, side-by-side Cash Flow + Donut Chart. Standalone Savings Rate & Top Outflow Area cards completely absent.
    - `audit_lower_dashboard_dark.png`, `lower_dashboard_light.png`: Verified Income Streams and Recent Transactions side-by-side in 2 columns with equal card heights. Category Spending section completely absent.
    - `audit_navbar_scrolled_dark.png`, `navbar_scrolled_light.png`: Verified translucent frosted navbar (~92% opacity with `backdrop-blur-md` and thin border) softly diffusing scrolling content underneath without distracting bleed-through.
    - `audit_dashboard_768_dark.png`, `768_light.png`: Tablet viewport perfectly proportioned with 3 cards per row.
    - `audit_dashboard_390_dark.png`, `390_light.png`: Mobile single-column stacked layout with zero horizontal scroll and full $\ge 44\text{px}$ touch targets.

### Entry 2026-11-07 18:45 IST — Final Dashboard UI Bug Fix & Visual Polish
- **A. Change Request:** The user requested an exclusive UI bug-fix and visual polish phase for the PennyPilot dashboard with zero feature additions:
  1. **Calendar Popover Layering Fix (Critical):** Eliminate the layering defect where the green Monthly Verdict banner appeared across the open calendar. Investigate CSS stacking contexts, z-index hierarchy, backdrop filters, and parent transforms. Ensure the calendar picker floats cleanly above all cards, banners, and charts without bleed-through in both light and dark themes on desktop and mobile.
  2. **Remove Standalone Income vs Expenses Panel:** Replace the redundant oversized standalone dual-bar chart with a compact, useful `CompactCashFlowSummary` side-by-side with `ExpenseDonutChart`.
  3. **Fix Financial Setup Welcome Modal:** Redesign `FinancialOnboardingWizard.tsx` welcome screen with consistent modal dimensions, centered presentation, readable step indicator, 3 introductory feature cards aligned equally in 3 columns (`01 Inflow`, `02 Budgets`, `03 Target`), and proper primary ("Get Started") / secondary ("I'll Do This Later") button placement.
  4. **Make Navbar More Solid:** Eliminate excessive transparency/blur leaking content during scrolling by establishing solid white/light neutral in Light mode (`bg-white border-b border-slate-200/90 shadow-xs`) and solid Midnight Ledger in Dark mode (`dark:bg-[#101820] dark:border-b dark:border-[#2A3B45]`).
  5. **Make Footer Solid White / Solid Dark:** Solid white in light theme (`bg-white border-t border-slate-200/90`) and solid `#101820` in dark theme (`dark:bg-[#101820] dark:border-[#2A3B45]`) preserving copyright and legal document links.
  6. **Dashboard Alignment Audit:** Correct unequal card heights (`h-full flex flex-col justify-between`), inconsistent gaps, and mobile overflow.
  7. **Browser CDP Verification (Mandatory):** Capture screenshots across 1920px, 1440px, 1280px, 1024px, 768px, 390px, calendar open, navbar scrolled, footer, and onboarding flow in both themes.
- **B. Implementation:**
  - **Stacking Context Fix:** Identified that `backdrop-filter: blur(...)` in `glass-panel` and child containers established implicit stacking contexts that trapped child z-indices beneath siblings later in DOM order. In `DashboardHeader.tsx`, removed `backdrop-blur` from the date navigator container and Monthly Verdict banner. Established strict stacking hierarchy: Header container `relative z-20`, top controller bar `relative z-30`, date navigator `relative z-40`, popover card `z-50` with fully opaque solid backgrounds (`bg-white` and `dark:bg-[#141F2B]`), and Monthly Verdict banner `relative z-10`.
  - **Compact Cash Flow Summary:** Created `frontend/src/components/dashboard/CompactCashFlowSummary.tsx` with 3 key figures (Total Inflow, Total Outflow, Net Savings) + proportional visual cash flow retention bar (Outflows vs Retained Capital) + savings rate target indicator. Integrated it into a balanced 2-column row: Left `CompactCashFlowSummary` (7 cols), Right `ExpenseDonutChart` (5 cols), both with `h-full flex flex-col justify-between`.
  - **Financial Setup Welcome Modal Polish:** In `FinancialOnboardingWizard.tsx`, rebuilt Step 1 with a solid container (`bg-white dark:bg-[#141F2B] rounded-3xl shadow-2xl`), centered content, readable `Step 1 of 5` header, 3 introductory feature cards aligned equally in a 3-column grid, and clean footer buttons with `min-h-[44px]`.
  - **Navbar Solidification:** In `Navbar.tsx`, updated `<header>` to `bg-white dark:bg-[#101820] border-b border-slate-200/90 dark:border-[#2A3B45] shadow-xs`. Changed mobile bottom `<nav>` to `bg-white dark:bg-[#101820] border-t border-slate-200/90 dark:border-[#2A3B45]`.
  - **Footer Solidification:** In `App.tsx`, updated `<footer>` to `border-t border-slate-200/90 bg-white dark:bg-[#101820] dark:border-[#2A3B45]` with high-contrast text and preserved legal links.
  - **Alignment & Card Heights:** Applied `h-full flex flex-col justify-between` across `CategoryBreakdownCard.tsx`, `IncomeSourceBreakdownCard.tsx`, `ExpenseDonutChart.tsx`, and `CompactCashFlowSummary.tsx`.
- **C. Verification:**
  - **Automated Backend Tests:** 150/150 passed in 62.41s (`pytest backend/tests`).
  - **Automated Frontend Tests:** 77/77 passed in 1.46s (`npm --prefix frontend test -- --run`).
  - **Production Build:** 100% Success in 1.92s (`npm --prefix frontend run build`, dist precache: 27 entries).
  - **Database Status:** Canonical `penny_pilot.db` 14 tables verified intact (`PRAGMA integrity_check = ok`, 0 FK violations, Alembic revision `d2e3f4a5b6c7`).
  - **Browser CDP Verification (17 captures verified):**
    - `audit_calendar_open_dark.png` & `audit_calendar_open_light.png`: Calendar popover floats 100% cleanly above all cards and banners. Monthly Verdict stays behind calendar without bleed-through. All dates, weekdays, and controls fully visible and readable. Outside click closes reliably.
    - `audit_dashboard_1920_dark.png`, `1440_dark.png`, `1280_dark.png`, `1024_dark.png`, `768_dark.png`, `390_dark.png`: Flawless responsive layout across all viewport breakpoints. Zero horizontal overflow on mobile (390px).
    - `audit_dashboard_1440_light.png`: Balanced Quiet Ledger light theme with compact cash flow summary and donut chart.
    - `audit_navbar_scrolled_dark.png` & `audit_navbar_scrolled_light.png`: 100% solid navbar with zero content bleed-through during scroll.
    - `audit_footer_dark.png` & `audit_footer_light.png`: Solid footer with high-contrast copyright and legal links.
    - `audit_onboarding_step1_welcome.png`: Perfectly centered modal with 3 equal feature cards and clear primary action.

### Entry 2026-11-07 18:00 IST — UX Refinement, Real Notifications, Period-Based Analytics & Financial Overview Redesign
- **A. Change Request:** The user explicitly requested and authorized a complete reset of the local PennyPilot application user data for a fresh start. Requirements:
  1. Create a timestamped SQLite backup using SQLite's Online Backup API (`src.backup(dst)`).
  2. Verify backup integrity before proceeding (`PRAGMA integrity_check`, `PRAGMA foreign_key_check`, Alembic revision).
  3. Delete all 35 existing user accounts and their associated records: `transactions`, `recurring_transactions`, `budgets`, `categories`, `sessions`, `oauth_accounts`, `oauth_transactions`, `email_verification_tokens`, `password_reset_tokens`, `financial_goals`, `insights`, `users`.
  4. Respect foreign-key relationships and delete in child-first safe order inside a single database transaction.
  5. Preserve: All 13 database tables and schema, Alembic migration history and current head (`c1a2b3c4d5e6`), application code, Google OAuth config, SMTP/Brevo config, default category seed functions.
  6. Do NOT drop tables, do NOT downgrade migrations, do NOT reseed sample or demo users.
  7. Do NOT delete or alter `.env` credentials.
  8. After deletion, verify: `users` table contains 0 users, all user-associated tables contain 0 records, integrity check returns OK, foreign-key check reports 0 violations, Alembic revision remains `c1a2b3c4d5e6`, backend and frontend still start successfully.
- **B. Implementation & Test Decoupling:**
  - **Online Backup:** Executed `scripts/reset_local_user_data.py`. Created timestamped backup `D:\projects\PennyPilot\backups\penny_pilot_backup_20261107_170604.db` (540,672 bytes). Verified with `PRAGMA integrity_check = ok`, `foreign_key_check = []`, and Alembic revision `c1a2b3c4d5e6`.
  - **Transactional Reset:** Opened canonical database `penny_pilot.db` with `PRAGMA foreign_keys = ON`. In a single atomic transaction, purged all child tables before parent `users`:
    - `transactions`: 189 deleted (now 0)
    - `recurring_transactions`: 1 deleted (now 0)
    - `budgets`: 22 deleted (now 0)
    - `financial_goals`: 0 deleted (now 0)
    - `insights`: 0 deleted (now 0)
    - `sessions`: 30 deleted (now 0)
    - `oauth_accounts`: 1 deleted (now 0)
    - `oauth_transactions`: 14 deleted (now 0)
    - `email_verification_tokens`: 11 deleted (now 0)
    - `password_reset_tokens`: 3 deleted (now 0)
    - `categories`: 385 deleted (now 0)
    - `users`: 35 deleted (now 0)
    - Total user records purged: **691 records**.
    - Preserved schema tables: **13 tables**.
  - **Database VACUUM:** Executed SQLite `VACUUM` to defragment and optimize file pages.
  - **Test Suite Decoupling & Isolation:**
    - `backend/tests/test_copilot.py` & `backend/tests/test_copilot_security.py`: Replaced direct `SessionLocal()` insertions with `isolated_db` in-memory SQLite fixture with FastAPI dependency overrides (`app.dependency_overrides[get_db]`), preventing tests from polluting the canonical database.
    - `backend/tests/test_db_path_resolution.py`: Updated `test_canonical_database_accessible_via_session_local` to assert `SessionLocal()` executes clean queries on the canonical `User` and `Transaction` tables without hardcoding assertions for a deleted legacy demo user.
    - `backend/tests/test_stage5a_disposable_migration.py`: Updated line 71 assertions from legacy `>= 23` users to `>= 0`, preserving the strict invariant that canonical database stats, size, and mtime remain 100% frozen throughout disposable migration tests.
    - `backend/tests/test_verification_safety.py`: Updated telemetry helper to assert zero mutation and zero record insertion into the canonical database before and after running `scripts/verify_phase2_flow.py`.
- **C. Verification:**
  - `scripts/verify_db_status.py` confirmed 0 users, 0 transactions, 0 categories across all 12 user tables, `PRAGMA integrity_check` = `ok`, `foreign_key_check` = `[]`, Alembic revision `c1a2b3c4d5e6`.
  - Backend Pytest Suite: **143 passed**, 0 failed in 56.67s (`pytest backend/tests`).
  - Frontend Vitest Suite: **77 passed**, 0 failed in 1.60s (`npm --prefix frontend test -- --run`).
  - Frontend Production Build: **100% Success** (`tsc -b && vite build` in 2.39s).
  - Post-test canonical verification: Confirmed strictly 0 users and 0 transactions persisted in `penny_pilot.db` (zero test leakage).
  - Backend server (`http://127.0.0.1:8000/api/v1/health`): 200 OK, healthy.
  - Frontend server (`http://localhost:5173/`): 200 OK.

### Entry 2026-11-07 18:00 IST — UX Refinement, Real Notifications, Period-Based Analytics & Financial Overview Redesign
- **A. Change Request:** The user requested a comprehensive, multi-phase institutional refinement:
  1. **Phase 1 — Financial Setup UX:** Audit `FinancialOnboardingWizard.tsx` to resolve step count inconsistencies, unify on 5 clear steps (Welcome, Inflow, Budgets, Savings Target, Plan Summary) + completion, replace simultaneous buttons on Step 1 with a single primary "Get Started" and secondary "I'll Do This Later", add a 5-segment visual progress indicator, and enhance dark-mode glass styling and responsive layout.
  2. **Phase 2 — Real Notification System:** Remove fake promotional notifications and introduce a persistent, multi-tenant notification system for genuine account events (registration, email verification, financial setup completion, password reset) and deterministic financial signals (budget caution, overrun alerts, zero-activity onboarding tip). Support live unread badge, read/unread toggling, mark-all-read, and dismissal.
  3. **Phase 3 — Period-Based Financial Views (Monthly vs. Yearly):** Add period selector (`[ Monthly | Yearly ]`). For yearly view, calculate actual annual income, expenses, and net savings from recorded transactions within the calendar year in integer paise. Strictly enforce the Zero Financial Hallucination directive: never multiply monthly income by 12. Keep projected recurring annual income strictly separate and labeled as a projection.
  4. **Phase 4 — Improve Manage and Edit Budget Actions:** Redesign the decorative tags into genuine accessible interactive buttons ($\ge 44\text{px}$ touch target on mobile, clear backgrounds, borders, focus rings, hover/active states, and consistent iconography).
  5. **Phase 5 — Financial Overview Dashboard Redesign:** Redesign Dashboard hierarchy to match reference:
     - Header: Dynamic greeting ("Good morning/afternoon/evening, {Name}!"), period selector pills `[ Monthly | Yearly ]`, Month/Year navigator, and Quick Add button.
     - Main Analytics Row: Large dual-bar Income vs Expenses chart (with 12-month trajectory in yearly view) and Expense Distribution Donut Chart with center total and interactive legend.
     - Financial KPI Cards: 8 primary indicators: Total Income (with redesigned Manage Income button), Total Expenses, Actual Savings (+ Surplus / - Deficit), Savings Rate (with target progress bar), Remaining Budget (with redesigned Edit Budget button), Budget Utilization (with mini meter), Top Outflow Area, and Planned Savings Cushion.
     - Supporting Sections: Budget Intelligence Hero Chart, Category Spending Breakdown, Income Streams Breakdown, Recent Transactions Ledger, and Grounded AI Insights.
     - Empty State: Clean welcoming guidance for zero-activity accounts without false claims (such as "projected to save ₹47,000" on ₹0 income) or broken division.
- **B. Pre-Implementation Architecture & Migration Checks:**
  1. Database Model: Created `Notification` model (`backend/app/models/notification.py`) with `id`, `user_id`, `category`, `title`, `message`, `link_path`, `is_read`, `created_at` and registered it in `backend/app/models/__init__.py`.
  2. Alembic Migration: Created `backend/alembic/versions/d2e3f4a5b6c7_add_notifications_table.py` (`down_revision = 'c1a2b3c4d5e6'`). Tested on disposable SQLite database copy with upgrade $\rightarrow$ FK constraint verification $\rightarrow$ downgrade $\rightarrow$ re-upgrade. Canonical DB was 100% frozen and untouched during tests. Upgraded canonical DB to head `d2e3f4a5b6c7` (14 tables preserved).
- **C. Implementation:**
  - `backend/app/domain/aggregates.py`: Added `calculate_yearly_aggregation` pure function computing actual calendar year sums in integer paise and 12-month trajectory without extrapolation.
  - `backend/app/domain/budget_engine.py`: Corrected pacing verdict sentences to strictly reference budget ceilings (e.g. "Projected to stay ₹X under budget ceiling by month-end"), eliminating false claims of bank savings when income is ₹0.
  - `backend/app/schemas/notification.py` & `backend/app/schemas/income.py` & `backend/app/schemas/domain.py`: Added Pydantic schemas for notifications, period support, and yearly trajectory.
  - `backend/app/services/notification_service.py`: Built persistent notification service with deduplication, dynamic budget alert synchronization, brand new user guidance, mark-as-read, mark-all-read, and dismissal.
  - `backend/app/api/v1/endpoints/notifications.py`: Mounted REST API endpoints under `/api/v1/notifications`.
  - Wired real notification creation into user registration, email verification, financial onboarding completion, and password reset.
  - `frontend/src/components/common/NotificationsPopover.tsx`: Replaced mock notifications with TanStack React Query hooks, live unread badge, relative timestamps, and dismissal.
  - `frontend/src/components/onboarding/FinancialOnboardingWizard.tsx`: Refined wizard to unified 5 steps, single primary "Get Started" action, and responsive dark-mode glass styling.
  - `frontend/src/components/dashboard/DashboardHeader.tsx`: Added time-of-day greeting, period selector `[ Monthly | Yearly ]`, dynamic Month/Year stepper, and Quick Add action.
  - `frontend/src/components/dashboard/IncomeVsExpensesChart.tsx`: Built dual-bar chart supporting monthly comparison and 12-month annual trajectory with hover tooltips and legends.
  - `frontend/src/components/dashboard/ExpenseDonutChart.tsx`: Built SVG donut chart with hover effects, center total, and category legend.
  - `frontend/src/components/dashboard/MetricCards.tsx`: Redesigned into 8 financial KPI indicators with genuine interactive buttons ($\ge 44\text{px}$ touch targets, focus rings) for Manage Income and Edit Budget, plus welcoming zero-activity empty state.
  - `frontend/src/components/dashboard/IncomeSourceBreakdownCard.tsx`: Built dedicated income streams card with source icons, amounts, percentage bars, and manage trigger.
  - `frontend/src/App.tsx`: Wired `period` state, period queries, and new Dashboard layout hierarchy.
- **D. Verification:**
  - Backend Pytest: **150 passed**, 0 failed in 65.40s (`pytest backend/tests`).
  - Frontend Vitest: **77 passed**, 0 failed in 3.05s (`npm --prefix frontend test -- --run`).
  - Frontend Production Build: **100% Success** in 2.03s (`tsc -b && vite build`).
  - Database Status: `scripts/verify_db_status.py` confirmed 14 tables, `PRAGMA integrity_check` = `ok`, 0 foreign key violations, Alembic revision `d2e3f4a5b6c7`.
  - Browser Verification: Captured 5 high-resolution CDP screenshots:
    - `screenshots/redesigned_dashboard_dark.png` (Midnight Ledger dark mode, new header, main analytics row, 8 KPI cards, supporting sections)
    - `screenshots/redesigned_dashboard_light.png` (Quiet Ledger light mode)
    - `screenshots/redesigned_dashboard_yearly.png` (Yearly mode with full 12-month trajectory)
    - `screenshots/redesigned_notifications_dark.png` (Real notifications popover with mark-all-read and category badges)
    - `screenshots/redesigned_onboarding_step1.png` (Refined onboarding wizard with unified 5-step progress and single primary action)

### Entry 2026-11-07 16:55 IST — Financial Onboarding & Multi-Source Income Management Milestone
- **A. Change Request:** The user requested a complete financial setup and income management system across 5 phases:
  1. Phase 1: Income Management — Add monthly income, support multiple sources (salary, freelance, investments, other), edit/delete income records, record date, amount (integer paise), source, description, recurring monthly flag, user isolation, and integrate into monthly financial calculations without treating the budget ceiling as income. Crucial architectural requirement: reuse existing transaction data model (`kind="income"`) avoiding duplicate records.
  2. Phase 2: First-Time Financial Onboarding — Multi-step onboarding wizard for newly registered users after email verification (Welcome $\rightarrow$ Income Sources $\rightarrow$ Category Budgets $\rightarrow$ Monthly Savings Target $\rightarrow$ Financial Plan Summary $\rightarrow$ Finish). Support "Set Up Now" and "I'll Do This Later" (non-blocking skip with dashboard reminder banner). Existing users must NOT be forced into onboarding.
  3. Phase 3: Pure Deterministic Financial Calculations — Separation of:
     - $\text{Actual Savings} = \text{Actual Income} - \text{Actual Expenses}$
     - $\text{Remaining Budget} = \text{Allocated Budget} - \text{Actual Expenses}$
     - $\text{Planned Savings} = \text{Monthly Income} - \text{Allocated Budget}$
     - $\text{Savings Rate} = (\text{Actual Savings} / \text{Actual Income}) \times 100$
     - $\text{Unallocated Income} = \text{Monthly Income} - \text{Allocated Budget}$
     - Strict guarantee: Never display planned savings as actual savings.
  4. Phase 4: Budget Editor Updates — `BudgetEditorModal` displays amounts with ₹, formatted numbers, input editability, total allocated budget, unallocated income, and projected savings cushion.
  5. Phase 5: Dashboard Integration — Integrate income and savings into overview, metric cards (Manage Income trigger), AI Copilot FactBundle, and reminder banner.
- **B. Pre-Implementation Architecture Checks:**
  1. Verified existing transaction table already supports `kind="income"`, `amount_paise`, `occurred_on`, `description`, `merchant` (used for source), and `recurring_id`.
  2. Created Alembic migration `c1a2b3c4d5e6` (`down_revision = '9b8c7d6e5f4a'`) adding `onboarding_completed` (with `server_default='1'` so all 35 existing users automatically evaluate to completed) and `monthly_savings_target_paise`.
  3. Tested migration on a disposable SQLite database (`test_migration_disposable.py`) testing upgrade $\rightarrow$ foreign key verification $\rightarrow$ downgrade $\rightarrow$ re-upgrade. Canonical DB was 100% frozen and untouched during tests. Upgraded canonical DB to `c1a2b3c4d5e6` after testing.
- **C. Implementation:**
  - `backend/app/models/user.py`: Added `onboarding_completed: Mapped[bool]` and `monthly_savings_target_paise: Mapped[Optional[int]]`.
  - `backend/app/domain/financial_plan.py`: Created pure deterministic domain module with integer paise arithmetic.
  - `backend/app/schemas/income.py` & `backend/app/schemas/onboarding.py`: Created complete Pydantic v2 schemas.
  - `backend/app/api/v1/endpoints/income.py`: Created user-isolated CRUD endpoints for income with recurring rule creation.
  - `backend/app/api/v1/endpoints/onboarding.py`: Created onboarding status, atomic setup submission, skip, and plan summary endpoints.
  - `backend/app/api/v1/api.py`: Mounted `/income` and `/onboarding` routers under `/api/v1`.
  - `backend/app/domain/copilot.py`: Extended `FactBundleBuilder.build` and `FactBundleVerifier` with financial plan and savings target tokens for zero arithmetic hallucination.
  - `frontend/src/lib/api.ts`: Added TypeScript interfaces and API client functions for income and onboarding.
  - `frontend/src/components/income/IncomeManagementModal.tsx`: Created glassmorphic modal for managing income records, listing source breakdowns, adding new sources, and editing/deleting entries.
  - `frontend/src/components/onboarding/FinancialOnboardingWizard.tsx`: Created 6-step guided onboarding wizard with dynamic multi-source income rows, category budget allocation with live unallocated income, savings target, and deterministic plan summary.
  - `frontend/src/components/onboarding/OnboardingReminderBanner.tsx`: Created non-intrusive banner on Dashboard with "Set Up Now" and dismiss actions.
  - `frontend/src/components/budgets/BudgetEditorModal.tsx`: Updated live telemetry banner to 4 metrics: Monthly Ceiling, Remaining Buffer, Daily Pace Limit, and Planned Cushion (Unallocated Income).
  - `frontend/src/components/dashboard/MetricCards.tsx`: Added "Manage" button on Monthly Inflow card to trigger `IncomeManagementModal`; clarified Actual Savings vs Planned Cushion.
  - `frontend/src/App.tsx`: Wired up automatic onboarding popup for newly registered and verified users with `onboarding_completed=false`; mounted reminder banner, income modal, and onboarding wizard.
- **D. Verification:**
  - Backend Tests: **143 passed**, 0 failed (`pytest backend/tests`).
  - Frontend Tests: **77 passed**, 0 failed (`npm --prefix frontend test -- --run`).
  - Frontend Build: **100% Success** (`tsc -b && vite build` in 2.62s).
  - Database Status: `PRAGMA integrity_check` = `ok`, 0 FK errors, revision `c1a2b3c4d5e6`, 35 users intact.
  - Browser CDP Verification: 10 screenshots captured & verified:
    1. `dashboard_income_ready_dark.png` (Dashboard with Monthly Inflow Manage button)
    2. `income_management_modal_dark.png` (Dark theme income modal with source breakdown and recorded inflows)
    3. `income_management_modal_light.png` (Light theme income modal)
    4. `budget_editor_with_unallocated_cushion.png` (Budget editor displaying Monthly Ceiling ₹72,000, Remaining Buffer ₹42,970, Daily Pace ₹2,400/d, and Planned Cushion ₹13,000 based on ₹85,000 inflow)
    5. `onboarding_step1_welcome.png` (Onboarding Wizard Step 1: Welcome & architecture intro)
    6. `onboarding_step2_income.png` (Onboarding Wizard Step 2: Multi-source income entries)
    7. `onboarding_step3_budgets.png` (Onboarding Wizard Step 3: Category spending ceilings with live unallocated cushion)
    8. `onboarding_step4_savings_target.png` (Onboarding Wizard Step 4: Monthly savings target)
    9. `onboarding_step5_plan_summary.png` (Onboarding Wizard Step 5: Deterministic Financial Plan Summary)
    10. `onboarding_step6_completed.png` (Onboarding Wizard Step 6: Confirmation & Go to Dashboard)
- **E. Database & Security:**
  - All financial math computed in pure Python domain using integer paise.
  - User isolation enforced on all queries and mutations.
  - Disposable database used for migration testing first. All 35 existing users preserved without forced onboarding.

### Entry 2026-11-07 16:05 IST — Dynamic Budget Buffer Calculation & Edit Budget Workflow
- **A. Change Request:** The user requested an investigation into how the Budget Buffer card on the Dashboard calculates Allocated Monthly Ceiling, Remaining Buffer, and Daily Spending Pace, noting there was no clear option to edit the amount. Requirements:
  1. Identify exactly how the Allocated Monthly Ceiling is calculated.
  2. Add a clearly visible **Edit Budget** action to the Budget Buffer card.
  3. Clicking it should navigate to the Budgets page or open an appropriate budget editor.
  4. Allow users to modify their monthly budget allocations.
  5. Recalculate Remaining Buffer and Daily Spending Pace immediately after saving.
  6. Preserve existing transactions, budgets, and database records.
  7. Do not introduce a separate hardcoded Budget Buffer value; it must remain derived from the actual saved budget allocations and spending.
  8. Test functionality in the browser and update project documentation without redesigning unrelated components.
- **B. Investigation Findings:**
  - **Database & Backend Architecture:** In `penny_pilot.db`, user budgets are stored in the `budgets` table with `user_id`, `category_id`, `month` (first day of month `YYYY-MM-01`), and `limit_paise` (strict integer paise).
  - **Backend Endpoint:** `GET /api/v1/budgets?year=YYYY&month=M` sums all active category limits for the authenticated user and month (`total_limit_paise`), computes `total_spent_paise` from verified expense transactions, and sets `remaining_paise = max(0, total_limit - total_spent)`.
  - **Identified Defect:** In `frontend/src/components/dashboard/MetricCards.tsx`, Panel 3 had a hardcoded literal `5500000` (₹55,000.00) in the JSX (`{formatINR(5500000)}`) instead of consuming `budgetsOverview.total_limit_paise`. Consequently, any user changes to category budgets were ignored by the Dashboard Budget Buffer card.
- **C. Implementation:**
  - `frontend/src/components/dashboard/MetricCards.tsx`:
    - Updated `MetricCardsProps` to accept `budgetsOverview?: MonthlyBudgetOverview`, `totalDays?: number`, and `onEditBudget?: () => void`.
    - Removed hardcoded `5500000` paise. Dynamically derived:
      - `allocatedCeilingPaise = budgetsOverview?.total_limit_paise ?? 0`
      - `remainingBufferPaise = Math.max(0, allocatedCeilingPaise - expensePaise)`
      - `dailyPacePaise = totalDays > 0 ? Math.round(allocatedCeilingPaise / totalDays) : 0`
    - Added clearly visible **Edit Budget** action button in the card header with `SlidersHorizontal` icon.
  - `frontend/src/components/budgets/BudgetEditorModal.tsx`:
    - Created dedicated, glassmorphic budget allocation editor modal.
    - Shows live telemetry header: New Monthly Ceiling, Projected Remaining Buffer, and Daily Pace Limit updating dynamically as the user types.
    - Lists active expense categories with icons, current spend, and numeric rupee inputs.
    - Connects directly to `PUT /api/v1/budgets` with `{ month: "YYYY-MM-01", budgets: [...] }`.
    - On save, invalidates React Query caches (`budgets`, `budgetPace`, `monthlySummary`), triggering instant application-wide recalculation.
    - Provides secondary link "View Full Budgets Page →" for deep analytics navigation.
  - `frontend/src/App.tsx`:
    - Connected `budgetsOverview`, `totalDaysInMonth`, and `setIsBudgetEditorOpen(true)` to `MetricCards`.
    - Removed hardcoded `|| 5500000` fallback from `BudgetIntelligenceCard` (`totalBudgetPaise={budgetsOverview?.total_limit_paise ?? 0}`).
    - Rendered `BudgetEditorModal` in the dashboard modal layer.
  - `frontend/src/components/budgets/budgets.test.ts`:
    - Added unit test suite `E. Dynamic Budget Buffer & Daily Spending Pace Calculations` verifying zero hardcoded values, mathematical remaining buffer computation, and instant recalculation upon mutation.
- **D. Verification:**
  - Automated Frontend Tests: **70 passed**, 0 failed in Vitest across 12 test suites.
  - Frontend Production Build: **100% Success** (`tsc -b && vite build` in 1.88s, 27 precached assets).
  - Automated Backend Tests: **135 passed**, 0 failed in Pytest across 21 test files (83.02s).
  - Database Integrity: `PRAGMA integrity_check` = `ok`, 512,000 bytes, foreign key checks clean, 14 active budget rows.
  - Browser CDP Verification: 5 new screenshots captured and verified:
    1. `budget_buffer_card_with_edit_btn.png` (Dashboard showing visible Edit Budget button)
    2. `budget_editor_modal_open.png` (Modal displaying active category allocations and live telemetry)
    3. `budget_editor_modal_modified.png` (Live reactive recalculation in modal as user edits limits)
    4. `budget_buffer_card_recalculated.png` (Dashboard Budget Buffer card immediately reflecting updated ceiling ₹72,000, remaining buffer ₹42,970, and daily pace ₹2,400/day)
    5. `budget_buffer_card_light.png` (Light mode rendering of recalculated card and edit button)
- **E. Database & Security:**
  - Strict integer paise convention maintained.
  - Zero financial hallucination.
  - User isolation strictly enforced on backend.
- **F. Remaining Work:** None for Budget Buffer card and editing workflow.

---

### Entry 2026-11-07 15:45 IST — Fixed Navbar on Scroll, Enlarged Header Controls, Notification Bell & Dashboard Refinements
- **A. Change Request:** The user identified specific UI bugs and refinement requirements:
  1. Top bar was scrolling away with the page instead of staying fixed at the top of the viewport.
  2. Top bar and its contents (logo, app name, nav links, profile avatar) were slightly too small.
  3. Redundant dual quick add buttons: `+ Quick Add` in the top bar and `+ Record Expense` in `Financial Overview` both opened the exact same modal.
  4. Replace top bar Quick Add button with a Notification Bell icon showing financial tips, budget pace alerts, and system signals in a frosted popover.
  5. In `Financial Overview`, rename `+ Record Expense` to `+ Quick Add`.
  6. Remove the `[✓ ON TRACK]` badge next to the date selector as redundant.
  7. Dark mode UI fixes: illuminate the spending trajectory bars and ensure solid opacity on popovers.
- **B. Implementation:**
  - `frontend/src/components/common/Navbar.tsx`:
    - Converted `<header>` to `fixed top-0 left-0 right-0 z-50` with `min-h-[74px] sm:min-h-[78px] py-3.5 sm:py-4 px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12`.
    - Enlarged brand logo to `size="md"` (`w-9 h-9 sm:w-10 sm:h-10` mark with `text-lg sm:text-xl font-bold tracking-tight`).
    - Enlarged desktop nav buttons to `text-sm font-medium px-3.5 py-2` with `w-4 h-4` Lucide icons.
    - Removed redundant `+ Quick Add` CTA button from the header.
    - Integrated `<NotificationsPopover />` in its place.
  - `frontend/src/components/common/NotificationsPopover.tsx`:
    - Created frosted glass notification bell button with animated unread badge indicator.
    - Built glassmorphic dropdown popover with unread count chip, "Mark all as read" action, and categorized tips/alerts ("Smart Tip", "Budget Pace", "System Signal").
    - Added dismiss button per notification and clean empty state ("All caught up!").
    - Added comprehensive unit test suite in `NotificationsPopover.test.ts`.
  - `frontend/src/App.tsx`:
    - Removed `overflow-hidden` from root app wrapper that was preventing sticky/fixed behavior.
    - Added `pt-[86px] sm:pt-[92px] md:pt-[98px]` to `<main>` ensuring page content is cleanly spaced beneath the fixed top bar and scrolls smoothly behind it.
  - `frontend/src/components/dashboard/DashboardHeader.tsx`:
    - Removed `getPaceBadge()` (`[✓ ON TRACK]`) completely.
    - Renamed action button from `+ Record Expense` to `+ Quick Add`.
  - `frontend/src/components/common/ProfileDropdown.tsx`:
    - Enlarged avatar trigger from `w-8 h-8 sm:w-9 sm:h-9` to `w-9 h-9 sm:w-10 sm:h-10` and typography to `text-sm font-semibold`.
    - Updated popover surface to solid opaque glass (`dark:bg-[#141F2E] border-white/15`).
  - `frontend/src/components/common/CalendarMonthPicker.tsx`:
    - Hardened popover container background to solid `dark:bg-[#141F2E] border-white/15` preventing background banner bleed-through.
  - `frontend/src/index.css`:
    - Updated dark mode chart variables: `--chart-bar-start: #2DD4BF`, `--chart-bar-end: rgba(45, 212, 191, 0.35)`, `--chart-today-start: #34D399`, `--chart-today-end: #10B981` so spending bars glow distinctly in dark mode.
- **C. Verification:**
  - Automated Frontend Tests: **66 passed**, 0 failed in Vitest across 12 test suites.
  - Frontend Production Build: **100% Success** (`tsc -b && vite build` in 1.77s with 27 precached PWA assets).
  - Automated Backend Tests: **135 passed**, 0 failed in Pytest across 21 test files (68.26s).
  - Database Integrity: `PRAGMA integrity_check` = `ok`, 512,000 bytes.
  - Browser Verification: 6 screenshots captured via Chrome DevTools Protocol automation:
    1. `fixed_navbar_dark_top.png` (Enlarged logo, navbar, notification bell, Quick Add in header, removed on-track tag)
    2. `fixed_navbar_dark_scrolled.png` (Verified header stays permanently fixed at top while page scrolls)
    3. `fixed_navbar_notifications_dark.png` (Notification popover open with financial tips and signals)
    4. `fixed_navbar_light_top.png` (Light mode fixed header with enlarged elements)
    5. `fixed_navbar_light_scrolled.png` (Light mode scrolled view with fixed header)
    6. `fixed_navbar_notifications_light.png` (Light mode notification popover)
- **D. Database & Security:**
  - Zero database schema modifications.
  - Strict integer paise preserved.
  - Multi-tenant isolation verified.
- **E. Remaining Work:** None for requested UI fixes.

---

### Entry 2026-11-07 15:10 IST — UI/UX Redesign: Restaurant/Cafe Billing Glassmorphism (Dark & Light Modes)
- **A. Change Request:** The user requested a complete application-wide theme overhaul inspired by the Dribbble concept *Billing system for restaurant/cafe/shop (Glass morphism)* by Sandeep Slaria, with the explicit directive to provide the highest-quality execution in **both** Dark and Light modes.
- **B. Implementation:**
  - `frontend/src/App.tsx`: Added an ambient atmospheric aurora glow canvas with fixed radial light meshes (`pointer-events-none fixed inset-0 overflow-hidden`) behind all content; in dark mode, deep teal and emerald glow meshes bleed organically through frosted cards; in light mode, soft pastel emerald and sky meshes add luminous refractivity.
  - `frontend/src/index.css`: Re-engineered base design tokens to support multi-layered frosted glass panels (`backdrop-blur-xl`, semi-transparent backgrounds with specular borders and inner specular highlights); added `.glass-panel` and `.glass-elevated` utility classes; overhauled `.card-base`, `.input-base`, `.btn-primary` (gradient glass with specular hairline border), `.btn-secondary`, and `.badge-tag`.
  - `frontend/tailwind.config.js`: Added `boxShadow.xs`, refined `card` and `subtle` shadows with diffuse ambient drop, added `backdropBlur.xs`.
  - `frontend/src/components/common/GlassIcon.tsx`: Redesigned all 11 glass icon variants for both Dark and Light modes with translucent jewel gradient fills, top specular highlights, and glowing outer aura shadows.
  - `frontend/src/components/common/Navbar.tsx`: Frosted glass navbar (`backdrop-blur-xl bg-ledger-surface/80 border-b border-ledger-border`), glowing active navigation pills (`dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-400/30 dark:shadow-[0_0_12px_rgba(45,212,191,0.2)]`), frosted mobile bottom navigation bar and slide-up drawer.
  - `frontend/src/components/dashboard/DashboardHeader.tsx`: Frosted glass period controller, rounded-xl month selector, and backdrop-blur verdict banner.
  - `frontend/src/components/dashboard/MetricCards.tsx`: Frosted POS billing metric cards (`glass-panel`), glowing retention ratio bar (`bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(45,212,191,0.35)]`), and tabular figures.
  - `frontend/src/components/dashboard/BudgetIntelligenceCard.tsx`: Frosted trajectory container, glowing gradient lines, and frosted view mode toggle.
  - `frontend/src/components/dashboard/CategoryBreakdownCard.tsx`: Multi-segment composite distribution bar with frosted tracks and category glass chips.
  - `frontend/src/components/dashboard/RecentTransactionsCard.tsx`: Frosted transaction audit trail with translucent hover rows.
  - `frontend/src/components/dashboard/InsightCards.tsx`: Frosted signal cards with glass borders and glowing icons.
  - `frontend/src/components/transactions/TransactionList.tsx`: Frosted financial ledger, translucent search & filter toolbar, frosted summary metric cards.
  - `frontend/src/components/budgets/BudgetManagement.tsx`: Frosted budget ceilings with dual-indicator spending velocity track.
  - `frontend/src/components/analytics/HistoricalAnalytics.tsx`: Frosted 6-month trend container, monthly billing cards, and MoM shifts.
  - `frontend/src/components/categories/CategoryManagement.tsx`: Frosted category cards with category-specific glass icons and safe archival controls.
  - `frontend/src/components/copilot/CopilotView.tsx`: Frosted AI Copilot interface, translucent chat message bubbles, sleek glass prompt pills.
  - `frontend/src/components/common/CalendarMonthPicker.tsx` & `frontend/src/components/common/ProfileDropdown.tsx`: Crisp elevated frosted popovers with solid readability (`bg-white dark:bg-[#121C28] backdrop-blur-2xl border border-ledger-border shadow-float`).
  - Modals (`ProfileModal.tsx`, `AuthModal.tsx`, `NLQuickAddModal.tsx`, `MonthlyReportModal.tsx`): Frosted modal dialogs with backdrop blur.
  - `frontend/src/components/settings/SettingsView.tsx`: Frosted glass settings panels and appearance switcher.
- **C. Verification:**
  - Automated Frontend Tests: **62 passed**, 0 failed in Vitest across 11 test suites.
  - Frontend Production Build: **100% Success** (`tsc -b && vite build` in 2.47s with 27 precached PWA assets).
  - Automated Backend Tests: **135 passed**, 0 failed in Pytest across 21 test files (66.58s).
  - Browser Verification: **15 screenshots captured & verified** via Chrome DevTools Protocol automation:
    1. `glass_dark_dashboard.png` (1440x960 desktop dark dashboard)
    2. `glass_dark_transactions.png` (1440x960 desktop dark transactions)
    3. `glass_dark_budgets.png` (1440x960 desktop dark budgets)
    4. `glass_dark_analytics.png` (1440x960 desktop dark analytics)
    5. `glass_dark_categories.png` (1440x960 desktop dark categories)
    6. `glass_dark_copilot.png` (1440x960 desktop dark copilot)
    7. `glass_dark_profile_dropdown.png` (1440x850 desktop dark profile dropdown)
    8. `glass_dark_calendar_popover.png` (1440x920 desktop dark calendar popover)
    9. `glass_light_dashboard.png` (1440x960 desktop light dashboard)
    10. `glass_light_transactions.png` (1440x960 desktop light transactions)
    11. `glass_light_budgets.png` (1440x960 desktop light budgets)
    12. `glass_light_analytics.png` (1440x960 desktop light analytics)
    13. `glass_light_categories.png` (1440x960 desktop light categories)
    14. `glass_light_copilot.png` (1440x960 desktop light copilot)
    15. `glass_mobile_dashboard.png` (390x844 iPhone mobile viewport)
- **D. Database & Security:**
  - Zero database schema modifications.
  - Zero floats introduced (strict integer paise preserved).
  - Multi-tenant isolation verified.
  - No secrets or sensitive keys exposed.
- **E. Remaining Work:** None for glassmorphism redesign.

---

### Entry 2026-11-07 14:15 IST — Milestone 4: Midnight Ledger Dark Theme Redesign
- **A. Change Request:** The user reviewed the initial dark mode implementation and rejected it as too black, too contrast-heavy, and prone to neon glare. Requested a complete redesign under the **Midnight Ledger** visual direction (`#101820` background, `#192630` surfaces, `#202F39` elevated surfaces, `#2A3B45` hairline borders, `#F1F3EF` soft ivory text, `#43B7A5` muted teal, `#38B283` soft emerald, `#E06D69` muted coral, `#E5A84B` warm amber, and warm gold accents).
- **B. Implementation:**
  - `frontend/src/index.css`: Replaced all dark mode CSS variables with Midnight Ledger tokens; defined `--chart-*` SVG variables for light and dark modes; updated `.btn-primary`, `.btn-secondary`, and `.input-base`.
  - `frontend/tailwind.config.js`: Added semantic `gold` and `overlay` tokens to `colors.ledger`.
  - `frontend/src/context/ThemeContext.tsx`: Updated dynamic `<meta name="theme-color">` to `#101820`.
  - `frontend/src/components/common/GlassIcon.tsx`: Refined all 11 glass icon variants to use subtle dark surface backgrounds and restrained dark glyph colors.
  - `frontend/src/components/common/Navbar.tsx`: Active desktop navigation items updated to dark elevated slate with teal text; mobile drawer modal backdrop updated to `bg-black/60 dark:bg-black/75 backdrop-blur-sm`.
  - `frontend/src/components/dashboard/MetricCards.tsx`: Converted all hardcoded emerald and rose utility classes to semantic tokens (`dark:text-ledger-sage`, `dark:text-ledger-red`, `dark:bg-ledger-surfaceSubtle`).
  - `frontend/src/components/dashboard/DashboardHeader.tsx`: Pacing verdict banner styled with warm amber and soft emerald dark tokens.
  - `frontend/src/components/dashboard/BudgetIntelligenceCard.tsx`: Chart SVG gridlines updated to `var(--color-ledger-borderSubtle)`; bar gradients updated to CSS variables; hover tooltip updated to dark elevated surface, resolving white-on-white text bug.
  - `frontend/src/components/transactions/TransactionList.tsx`: Active kind filter button (`All`, `Expenses`, `Income`) updated to dark elevated surface; edit transaction modal backdrop updated to dark translucent scrim.
  - `frontend/src/components/budgets/BudgetManagement.tsx`: Filter tabs updated to dark elevated pills; edit budget ceiling modal backdrop updated to dark scrim.
  - `frontend/src/components/analytics/HistoricalAnalytics.tsx`: Selected month container updated to `dark:bg-ledger-surfaceSubtle ring-2 ring-ledger-teal`; tooltip and tabular rows updated to dark tokens.
  - `frontend/src/components/categories/CategoryManagement.tsx`: Updated `COLOR_TOKENS` swatches with subtle dark backgrounds; updated create, edit, and archive modal backdrops to dark scrim.
  - `frontend/src/components/copilot/CopilotView.tsx`: User message bubbles styled with `dark:bg-ledger-surfaceElevated dark:text-ledger-ink dark:border dark:border-ledger-border`; active prompt category tabs updated to dark elevated pills.
  - `frontend/src/components/copilot/MonthlyReportModal.tsx`: Backdrop updated to dark scrim; close button styled with dark elevated tokens.
  - `frontend/src/components/settings/SettingsView.tsx`: Sidebar navigation tabs updated to dark elevated slate with teal text; Dark theme card label updated to "Midnight Ledger (Dark)".
  - `frontend/src/components/common/ProfileDropdown.tsx`: Sign-out button updated to muted coral wash.
- **C. Verification:**
  - Automated Frontend Tests: 62 passed in Vitest.
  - Frontend Production Build: Passed in 1.96s with Vite PWA output.
  - Automated Backend Tests: 135 passed in Pytest.
  - Browser Verification: 10 screenshots captured via `scripts/capture_midnight_ui.py`:
    1. `dark_dashboard.png` (1440x920)
    2. `dark_transactions.png` (1440x920)
    3. `dark_budgets.png` (1440x920)
    4. `dark_analytics.png` (1440x960)
    5. `dark_categories.png` (1440x920)
    6. `dark_copilot.png` (1440x920)
    7. `dark_profile_dropdown.png` (1440x850)
    8. `dark_settings.png` (1440x960)
    9. `dark_calendar_popover.png` (1440x920)
    10. `dark_mobile_dashboard.png` (390x844 mobile viewport)
- **D. Database & Security:**
  - Zero database schema modifications.
  - Zero floats introduced.
  - No secrets exposed.
- **E. Remaining Work:** None for dark theme redesign.

---

### Entry 2026-11-07 13:45 IST — Milestone 4: Modern Profile Menu, User Settings, Dark Theme & Calendar Navigation
- **A. Change Request:** The user requested an application header height increase, removal of currency indicator from the navbar to user settings, creation of a modern circular profile avatar with dropdown menu, profile editing modal, user settings screen, theme switcher (light, dark, system), and interactive calendar navigation.
- **B. Implementation:**
  - `frontend/src/components/common/Navbar.tsx`: Increased header height modestly; removed currency indicator; embedded circular profile dropdown.
  - `frontend/src/components/common/ProfileDropdown.tsx`: Created reusable dropdown with identity preview, verified shield badge, theme switcher, and navigation triggers.
  - `frontend/src/components/profile/ProfileModal.tsx`: Created profile modal for display name, avatar upload/preview/removal, optional age, and gender preferences.
  - `frontend/src/components/settings/SettingsView.tsx`: Created dedicated settings view with profile, appearance, currency, and account recovery tabs.
  - `frontend/src/components/common/CalendarMonthPicker.tsx`: Created interactive popover with Day, 12-Month, and Decade Year navigation.
  - `frontend/src/context/ThemeContext.tsx`: Implemented complete theme context supporting `light`, `dark`, and `system` with `localStorage` persistence and OS schedule listener.
- **C. Verification:**
  - Captured verification screenshots: `milestone_desktop_navbar.png`, `milestone_profile_dropdown.png`, `milestone_profile_modal.png`, `milestone_settings_page.png`, `milestone_calendar_picker.png`, `milestone_mobile_interactions.png`, `milestone_mobile_menu.png`.
  - Automated tests: 62 frontend tests passed.

---

### Entry 2026-11-07 12:55 IST — Milestone 3: Brand Identity & Product UI Cleanup
- **A. Change Request:** The user requested removal of development-only badges (`FINTECH`, `Online`, `3-Tier AI`, `Deterministic Accounting`, `FactBundle Verified`) and integration of the official PennyPilot emblem across the app.
- **B. Implementation:**
  - Created `frontend/src/components/common/PennyPilotLogo.tsx` supporting `full`, `symbol`, and `wordmark` variants with `sm`, `md`, `lg` sizes.
  - Replaced temporary SVG badges in `public/` and `src/` with the official logo assets.
  - Cleaned all headers, empty states, and KPI cards across dashboard, transactions, budgets, analytics, categories, and AI copilot.
- **C. Verification:**
  - Responsive audit across 320px, 390px, 430px, 768px, 1024px, 1280px, 1440px, 1640px, and 1920px. Zero horizontal overflow, zero overlapping badges.

---

### Entry 2026-11-07 07:15 IST — Milestone 2: Custom Category Management & 6-Month Analytics
- **A. Change Request:** Build a complete custom category management experience and historical 6-month analytics section.
- **B. Implementation:**
  - Backend: Added `/api/v1/categories/` CRUD endpoints with multi-tenant isolation, safe archive protection (blocking archival if active transactions or budgets reference the category), and default category protection. Added `/api/v1/analytics/historical` computing 6-month income, expense, net savings, savings rate, and Month-over-Month deltas using Asia/Kolkata boundaries.
  - Frontend: Built `CategoryManagement.tsx` (create, edit, archive custom categories with icons and color tokens) and `HistoricalAnalytics.tsx` (interactive trend bars, drilldown panel, category breakdown progress bars, and accessible table view).
- **C. Verification:**
  - Backend pytest: `backend/tests/test_categories_and_analytics.py` (12/12 passed).
  - Frontend vitest: `categories.test.ts` (6/6 passed), `analytics.test.ts` (4/4 passed).

---

### Entry 2026-11-07 01:15 IST — Milestone 1: PWA Installability & Repository Hygiene
- **A. Change Request:** Implement PWA installation banner, standardize skeleton loaders, audit public assets, and ensure safe service worker caching (caching static shell only, never authenticated `/api/*` endpoints).
- **B. Implementation:**
  - Implemented `usePWAInstallPrompt.ts` hook capturing `beforeinstallprompt` event with dismissal persistence in `localStorage`.
  - Built `PWAInstallBanner.tsx` and standardized `Skeleton.tsx` for metric cards, transactions, and budgets.
  - Configured `vite.config.ts` Workbox settings to strictly exclude `/api/*`.
- **C. Verification:**
  - Automated tests: `src/hooks/pwa.test.ts` (6/6 passed).
  - Production build: `dist/sw.js` generated cleanly.

---

## 3. Unresolved Issues & Technical Debt

| Item ID | Category | Description | Severity | Target Resolution |
| :---: | :--- | :--- | :---: | :--- |
| **ISS-01** | Frontend Performance | Vite reports bundle chunk `dist/assets/index-BQV-OTdz.js` is ~592 kB minified (> 500 kB threshold). | Low | Implement dynamic `React.lazy()` code-splitting for secondary tabs (Analytics, Categories, Settings) in Milestone 5. |
| **ISS-02** | Database Schema | Tables `financial_goals`, `recurring_transactions`, and `insights` are initialized with 0 active rows. | Info | Schemas are preserved for upcoming roadmap milestones (Milestone 5 Goal Tracking & OCR Import). |
| **ISS-03** | OAuth Configuration | Google OAuth backend endpoint `/api/v1/auth/google` is verified with mock test suites, but requires valid client credentials in production environment variables (`GOOGLE_CLIENT_ID`). | Low | Documented in deployment guide; development mode operates with seamless mock fallback. |
| **ISS-04** | Postponed Roadmap Feature | **Financial Goal Tracking**: Target savings tracking, goal deadlines, and contribution allocations. | Roadmap | Schema initialized (`financial_goals`); full domain calculation engine, API routes, and UI targeted for Milestone 5. |
| **ISS-05** | Postponed Roadmap Feature | **Receipt OCR & Bank Statement Import**: Automated transaction extraction from bills, receipts, and CSV/PDF bank statements. | Roadmap | Intentionally deferred to Milestone 5 to preserve focus on core financial accuracy and design refinements. |
| **ISS-06** | Postponed Roadmap Feature | **Automated Recurring Outflows Engine**: Subscriptions, rent, and scheduled utility recurring tracking. | Roadmap | Schema initialized (`recurring_transactions`); execution engine scheduled for Milestone 6. |

---

## 4. Supporting Documentation Directory

- **[ARCHITECTURE.md](file:///d:/projects/PennyPilot/ARCHITECTURE.md):** Deep-dive architecture, domain calculations, integer paise rules, and AI fallback chain.
- **[FEATURE_STATUS.md](file:///d:/projects/PennyPilot/FEATURE_STATUS.md):** Detailed matrix of feature implementation, automated test coverage, and browser verification status.
- **[KNOWN_ISSUES.md](file:///d:/projects/PennyPilot/KNOWN_ISSUES.md):** Unresolved items, deployment constraints, and optimization roadmap.
- **[CHANGELOG.md](file:///d:/projects/PennyPilot/CHANGELOG.md):** Chronological release notes.

---

## 5. Development & Startup Reference Commands

### Start Backend Development Server:
```powershell
cd D:\projects\PennyPilot\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Start Frontend Development Server:
```powershell
cd D:\projects\PennyPilot\frontend
npm run dev
```

### Execute Complete Backend Test Suite:
```powershell
cd D:\projects\PennyPilot
pytest backend/tests
```

### Execute Complete Frontend Test Suite:
```powershell
cd D:\projects\PennyPilot
npm --prefix frontend test -- --run
```

### Run Production Build:
```powershell
cd D:\projects\PennyPilot
npm --prefix frontend run build
```

### Check Database Schema Status:
```powershell
cd D:\projects\PennyPilot\backend
python -m alembic current
```

---

## 12. Contrast Polish & Quiet Ledger Alignment Milestone (2026-11-07 22:05 IST)

### 12.1 Legal & Compliance Contrast Polish
- **Issue Addressed:** Legal pages (Privacy Policy, Terms of Service, Security Standards) displayed faint, washed-out text due to absence of document card container allowing ambient aurora background gradients to bleed into light gray ink.
- **Implementation in `LegalLayout.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `SecurityStandards.tsx`:**
  - Enclosed legal content inside a solid Quiet Ledger card (`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card rounded-2xl p-6 sm:p-10 md:p-12 space-y-8`).
  - Document Title upgraded to `font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100`.
  - Body paragraphs and lists upgraded to high-contrast `text-slate-800 dark:text-slate-200 text-sm leading-relaxed`.
  - Financial disclaimer box upgraded with amber border and background with accessible contrast.
  - Verified across light and dark modes with CDP screenshots (`audit_legal_privacy_light.png`, `audit_legal_terms_light.png`, `audit_legal_security_dark.png`).

### 12.2 Historical Financial Analytics Polish
- **Issue Addressed:** Top 4 macro KPI cards, chart title, legend, and axis labels used translucent `glass-panel` and faint ink classes.
- **Implementation in `HistoricalAnalytics.tsx`:**
  - Upgraded 4 macro cards to solid Quiet Ledger cards (`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card`).
  - Elevated labels to uppercase `text-slate-600 dark:text-slate-400 font-semibold` and values to bold `text-slate-900 dark:text-slate-100 font-mono`.
  - Replaced `glass-panel` on the 6-Month Income vs. Expense Trend chart with a solid Quiet Ledger container.
  - De-blurred month drilldown cards and category distribution bars.

### 12.3 Category Management Institutional Realignment
- **Issue Addressed:** Category cards and modals were using legacy `glass-panel` and low-contrast typography, looking disconnected from the rest of the application.
- **Implementation in `CategoryManagement.tsx`:**
  - Upgraded expense and income category cards to solid Quiet Ledger cards (`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card rounded-2xl p-5 hover:border-slate-400 dark:hover:border-slate-600`).
  - Tactile segmented control for "Expense Categories" and "Income Categories" with pill counters.
  - Refined "DEFAULT" and "ARCHIVED" badges with WCAG AA compliance.
  - Upgraded Create, Edit, and Archive modals with solid `#FFFFFF` / `#121C28` surfaces and high-contrast inputs.

### 12.4 Complete Redesign of Financial Insights Page
- **Issue Addressed:** Insights page looked like an "AI generated template" due to colored vertical stripe cards (`border-l-4`), unstyled tables, robotic uppercase badges (`ON_TRACK`, `1 FLAGGED`), and generic black buttons.
- **Implementation in `InsightsView.tsx`:**
  - Top Header: Solid Quiet Ledger card with `Signals & Intelligence` badge and calendar date pill.
  - Top 4 Macro KPI Cards: Replaced AI colored stripe borders with institutional Quiet Ledger KPI cards (`GlassIcon`, bold numbers, clean subtitles, and status tags) matching Dashboard and Budgets.
  - 4 Main Intelligence Signal Panels:
    - Replaced robotic tags with humanized status pills with dots (`● On Track`, `● 1 Outlier Flagged`, `● Disciplined`, `● Active Buffer`).
    - Pacing Velocity card: Clean target vs. actual burn rate comparison grid.
    - Statistical Outlier Analysis card: Elevated amber anomaly box with merchant name and multiple of median (`6.6x median`).
    - Capital Retention card: Crisp progress bar and verifiable metrics.
    - Safety Margin card: Structured buffer, budget limit, and monthly spend metrics.
    - All action buttons redesigned with tactile Quiet Ledger button system.

### 12.5 Test & Build Verification
- **Frontend Test Suite:** 86/86 passing across 15 test suites (`vitest run --run`).
- **Production Build:** `npm --prefix frontend run build` succeeded in 2.27s with zero errors.
- **Backend Test Suite:** 150/150 passing (`pytest backend/tests`).
- **Database Status:** Revision `d2e3f4a5b6c7`, zero integrity or foreign key violations.

### 12.6 Light Mode Global Contrast, Settings & Edit Profile Modal Polish
- **Global Light Mode Contrast:**
  - Lowered full-screen ambient aurora gradient mesh opacity in `App.tsx` from 45%/35% down to 7–9% for Light Mode, eliminating washed-out mint/blue haze while keeping brand identity intact. Dark Mode preserved at 20–25%.
  - Updated `index.css` core CSS variables to institutional Quiet Ledger standards: `--color-ledger-bg: #F8F9FA`, `--color-ledger-surface: #FFFFFF` (solid opaque), `--color-ledger-border: #E2E8F0`, `--color-ledger-ink: #0F172A`, `--color-ledger-inkMuted: #334155`, `--color-ledger-inkSubtle: #475569`.
  - Replaced washed-out glass shadows with commercial financial shadow (`0 1px 3px 0 rgba(15, 23, 42, 0.06)`).
- **Historical Analytics Page Polish (`HistoricalAnalytics.tsx`):**
  - 4 separate solid white macro cards with bold numbers and clear labels.
  - Bounded 6-Month Income vs Expense Trends chart with dotted horizontal reference guidelines.
  - Empty-month indicator (`— No entries`) in dashed enclosure; highlighted active month in distinct rounded container.
- **Account Settings View (`SettingsView.tsx`):**
  - Modern Quiet Ledger heading, subtitle, and badge.
  - Modern sidebar navigation (Profile, Appearance, Currency, Account & Security) with tactile active item.
  - Solid card enclosures (`#FFFFFF` / `#121C28`), high contrast labels, styled inputs, and clear save controls.
  - Profile avatar presentation with 80x80 px circular frame, file requirements, "Upload Picture", "Change Picture", and "Remove" actions.
- **Edit Profile Modal (`ProfileModal.tsx`):**
  - Institutional Quiet Ledger modal shell (`bg-white dark:bg-[#121C28] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl`).
  - Clean header & footer with close button hover state and verified account badge.
  - Removed monospaced uppercase technical labels; replaced with clean `text-xs font-semibold text-slate-700 dark:text-slate-300`.
  - Read-only email address with green "Verified" pill.
  - Optional Age & Gender fields clearly marked as `(Optional)`.
  - Functional timezone selector with clock icon.
  - Fully responsive and verified at 390px mobile viewport without horizontal scroll.
- **Category Management Action Buttons (`CategoryManagement.tsx`):**
  - Upgraded Edit and Archive buttons with distinct tactile borders (`border-slate-200`), subtle backgrounds, and responsive touch targets.
- **CDP Verification Artifacts:**
  - `audit_final_settings_light.png`
  - `audit_final_settings_dark.png`
  - `audit_final_profile_modal_light.png`
  - `audit_final_profile_modal_dark.png`
  - `audit_final_profile_modal_mobile_light.png` (390x844)
  - `audit_final_analytics_light.png`
  - `audit_final_categories_light.png`
  - `audit_final_insights_light.png`

### 12.7 Stacking Context Architectural Solution & Ambient Brand Gradient Restoration
- **Root Cause Analysis:**
  - The previous visual defect where cards appeared tinted by the background gradient was identified as a CSS Stacking Context issue rather than CSS opacity:
    - In `frontend/src/App.tsx`, the fixed ambient background lighting container had `position: fixed; z-index: 0`.
    - `<main>` had default static flow (`position: static`). Under standard CSS stacking order, positioned boxes (`position: fixed; z-index: 0`) paint *in front of* subsequent in-flow non-positioned block elements.
    - Because the background container had `pointer-events-none`, clicks went through, but the blurred gradient blobs were literally rendering *on top of* the content cards in the viewport.
- **Architectural Fix:**
  - In `frontend/src/App.tsx`: Added `relative z-10` to `<main id="main-content" ...>`.
  - Content cards remain strictly solid opaque white (`#FFFFFF` in light mode, `#141F2E` in dark mode) via `.glass-panel`, `.card-base`, and `.glass-elevated` classes.
  - Ambient background gradient blobs restored to full visual brand presence (mint/teal `opacity-45`, cream/amber `opacity-35`, sky/teal `opacity-35`).
  - Result: The brand gradient blooms vividly across page margins, gutters, header spacing, and between cards, while content card surfaces remain 100% solid, crisp, and completely free of color bleed.
- **Verification Across Views (CDP Headless Chrome):**
  - Dashboard Light & Lower View (`audit_restored_dashboard_light.png`, `audit_restored_dashboard_lower_light.png`)
  - Budget Management (`audit_restored_budgets_light.png`, `audit_budgets_category_cards_check.png`)
  - Historical Analytics (`audit_restored_analytics_light.png`, `audit_analytics_lower_check.png`)
  - Financial Insights (`audit_restored_insights_light.png`)
  - Category Management (`audit_restored_categories_light.png`)
  - Account Settings (`audit_restored_settings_light.png`)
  - Legal & Privacy Policy (`audit_privacy_full_check.png`)
  - Dark Mode Midnight Ledger (`audit_restored_dashboard_dark.png`)
  - Mobile Viewport 390px (`audit_restored_dashboard_mobile_light.png`)
- **Automated Verification:**
  - Frontend Vitest: 86/86 passed across 15 suites.
  - Production Build: `npm --prefix frontend run build` succeeded cleanly in 4.30s (0 errors).
  - Backend Pytest: 150/150 passed across all test suites.

### 12.8 First-Time User Guided Onboarding Tutorial & Secure Permanent Account Deletion
- **Architecture & Requirements:**
  1. **Strict UI Design Consistency:** Mandatory reuse of PennyPilot's Quiet Ledger (`#FFFFFF` solid card surfaces, `#F7F5F0` canvas, mint/teal/sky ambient gradient) and Midnight Ledger (`#141F2E` / `#101820`). High contrast typography, tabular figures, no washed-out text, zero generic AI badges.
  2. **First-Time User Guided Onboarding Tutorial:**
     - 6-step contextual walkthrough:
       1. Dashboard: Inflow, expenses, actual savings, budget buffer.
       2. Transactions Ledger: Recording, editing, category filters, multi-format exports (CSV, PDF, DOCX).
       3. Budgets: Category spending ceilings, daily burn velocity, pacing drift indicators.
       4. Analytics: 6-month retrospective progression, MoM category shifts.
       5. Insights: Statistical signals, MAD anomaly spikes, capital buffer telemetry.
       6. AI Copilot: FactBundle grounded intelligence, natural-language quick-add.
     - Non-blocking contextual tour with step counter (`Step X of 6`), progress segments, Next/Back buttons, Skip/Dismiss, and Finish.
     - Auto-navigation across tabs on step progression.
     - Persistent completion state: Alembic migration `e4f5a6b7c8d9` added `tutorial_completed: bool` to `users` table (`server_default='0'`). Endpoints `GET /api/v1/onboarding/tutorial` and `POST /api/v1/onboarding/tutorial`.
     - "Replay Tutorial" action available under Settings $\rightarrow$ Appearance.
     - Fully responsive on mobile (390px viewport) and accessible in both Light and Dark themes.
  3. **Secure Permanent Account Deletion & Active Data Purging:**
     - Located in Settings $\rightarrow$ Account & Security in a designated "Danger Zone" card.
     - GitHub-style confirmation flow requiring exact case-sensitive match for: `DELETE MY ACCOUNT`.
     - Password re-verification required for users with passwords; active session verification for OAuth-only users. CSRF enforcement.
     - Atomic database cascade deletion across 12 tables in foreign-key safe order (`transactions`, `recurring_transactions`, `budgets`, `financial_goals`, `categories`, `insights`, `notifications`, `email_verification_tokens`, `password_reset_tokens`, `oauth_transactions`, `oauth_accounts`, `sessions`, `users`).
     - Physical unlinking of user avatar file from disk (`uploads/avatars/`).
     - HTTP cookies revoked and cleared (`auth_token`, `refresh_token`, `csrf_token`); client cache purged; redirect to public login with toast confirmation.
     - Updated legal disclosures in `PrivacyPolicy.tsx`, `TermsOfService.tsx`, and `SecurityStandards.tsx` outlining active DB purging and 30-day encrypted disaster recovery backup retention.
- **Verification Across Views (CDP Headless Chrome):**
  - `audit_tutorial_step1_dashboard_light.png` (Tour Step 1 on Dashboard, Light Mode)
  - `audit_tutorial_step2_transactions_light.png` (Tour Step 2 on Transactions Ledger, Light Mode)
  - `audit_tutorial_step3_budgets_light.png` (Tour Step 3 on Budgets & Velocity Tracker, Light Mode)
  - `audit_tutorial_step1_dark.png` (Tour Step 1 on Dashboard, Midnight Ledger Dark Mode)
  - `audit_tutorial_mobile_390.png` (Tour Step 1 on Mobile 390px Viewport)
  - `audit_settings_appearance_replay_light.png` (Settings Appearance tab with Replay Tutorial card)
  - `audit_settings_danger_zone_light.png` (Settings Account & Security tab with Danger Zone card, Light Mode)
  - `audit_settings_danger_zone_dark.png` (Settings Danger Zone card, Midnight Ledger Dark Mode)
  - `audit_delete_modal_light.png` (Delete Account confirmation modal open with phrase validation, Light Mode)
  - `audit_delete_modal_dark.png` (Delete Account confirmation modal open, Midnight Ledger Dark Mode)
- **Automated Verification:**
  - Frontend Vitest: **97 / 97 tests passed** across 17 test suites (`npm --prefix frontend test -- --run`).
  - Production Build: **100% Success** (`npm --prefix frontend run build` in 2.12s, 0 errors).
  - Backend Pytest: **156 / 156 tests passed** across 26 test suites (`pytest backend/tests`).
  - Database Integrity: `PRAGMA integrity_check` = `ok`, `PRAGMA foreign_key_check` = `0 violations`, Alembic revision `e4f5a6b7c8d9`.

### 12.9 Comprehensive Product Refinement & Feature Implementation Milestone (Receipt OCR, Floating AI Assistant, Personal Financial Statement, Voice Input, Legal Shell Polish)
- **Architecture & Requirements:**
  1. **Analytics 6-Month Chart Tooltip Polish:**
     - High-contrast Quiet Ledger Light (`#FFFFFF`, slate-800 text, crisp border) and Midnight Ledger Dark (`#121C28`, slate-100 text, slate-700 border) tooltip styles.
     - Formatted tabular INR currency (`tabular-nums`) with separate Inflow, Outflow, and Net Savings rows.
     - Clean handling of empty months with descriptive status.
  2. **Financial Insights Page Dynamic Calendar & Multi-Format Report Exports:**
     - Integrated `CalendarMonthPicker` in the Financial Insights header with dynamic month/year queries.
     - Multi-format `Download Report` dropdown menu supporting CSV Spreadsheet, PDF Statement (jsPDF/autotable), and DOCX Word document (`docx`).
     - Removed redundant `SIGNALS & INTELLIGENCE` uppercase header label.
  3. **AI Copilot Correctness, Voice Input & Response Formatting:**
     - Fixed intent routing bug where questions ("Where do I need to reduce my spending?" vs "Am I good at saving money?") previously returned identical canned summaries.
     - Upgraded `IntentClassifier`, `DeterministicNarrativeGenerator`, and LLM prompt context to include category breakdowns, savings rates, and question-specific advice.
     - Web Speech API integration (`SpeechRecognition` / `webkitSpeechRecognition`) with mic button, listening indicator, reviewable transcription, and graceful permission denial handling.
     - Removed redundant `FINANCIAL INTELLIGENCE` header text; render real Markdown (`**bold**`, bullet lists) instead of raw asterisks.
     - Visible provider and model indicator pills (Gemini, Groq, Ollama Qwen 2.5:3B, Rule-based Deterministic).
  4. **Receipt Capture, Upload & OCR inside Quick Add:**
     - MediaDevices `getUserMedia` camera capture for desktop webcams and mobile rear cameras (`facingMode: { ideal: "environment" }`) with live viewfinder overlay, Capture, Retake, and Use Photo actions.
     - File attachment support for PNG, JPG/JPEG, WebP, PDF, DOCX ($\le 5\text{MB}$, magic byte validation).
     - Local ₹0 extraction pipeline (`/api/v1/receipts/extract`) utilizing `pypdf`, `python-docx`, Pillow contrast/EXIF normalization, regex extraction for merchant, date, amount in integer paise, tax, line items, and category suggestion.
     - Receipt review step with editable Merchant, Amount, Date, Category, Description, and Notes fields before saving; zero auto-creation without explicit user confirmation.
     - Multi-tenant directory partitioning in `uploads/receipts/{user_id}/` with user cleanup on account deletion.
  5. **Floating Draggable AI Copilot Assistant:**
     - Persistent robot-head assistant button in bottom-right corner with gentle wave animation and tooltip `Ask PennyPilot AI Assistant`.
     - Draggable with mouse and touch within viewport boundaries.
     - Opens floating chat drawer with suggested question chips, conversation stream, voice mic input, and expand action to full page.
  6. **Monthly Financial Statement Redesign & Multi-Format Exports:**
     - Formal Personal Financial Statement modal layout: Cover, 1. Executive Summary & Key Telemetry, 2. Expense Analysis & Category Distribution, 3. Budget Performance & Safety Cushion, 4. Statistical Outliers & Spending Spikes (MAD Engine), 5. Key Financial Observations, 6. Certification & Compliance Disclosures.
     - Multi-format export dropdown (PDF, DOCX, CSV) and Print button.
  7. **Legal Pages Shell Polish:**
     - Refactored `LegalLayout.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, and `SecurityStandards.tsx` to eliminate nested full-screen opaque boxes, allowing the ambient background gradient to flourish while document content sits in crisp solid Quiet Ledger cards.
- **Verification Across Views (CDP Headless Chrome):**
  - `artifacts/audit_dashboard_with_floating_copilot.png` (Dashboard with Floating Assistant, Midnight Ledger)
  - `artifacts/audit_floating_copilot_open.png` (Floating Copilot Chat Drawer Open)
  - `artifacts/audit_quick_add_modal.png` (Quick Add Modal with Receipt Upload & Camera Scan)
  - `artifacts/audit_insights_page.png` (Financial Insights Page with Calendar Picker & Download Report)
  - `artifacts/audit_insights_download_menu.png` (Insights Download Dropdown: PDF, DOCX, CSV)
  - `artifacts/audit_copilot_dedicated_page.png` (Dedicated AI Copilot Page with Provider Pill & Voice Mic)
  - `artifacts/audit_monthly_statement_modal.png` (Official Monthly Financial Statement Modal)
  - `artifacts/audit_monthly_statement_download_menu.png` (Monthly Statement Export Menu)
  - `artifacts/audit_legal_privacy_clean.png` (Legal Privacy Policy with Ambient Gradient Shell)
  - `artifacts/audit_mobile_dashboard_390.png` (Mobile 390px Viewport with Stacked Cards & Floating Assistant)
  - `artifacts/audit_dashboard_light_mode.png` (Dashboard in Quiet Ledger Light Mode with Solid Cards & Ambient Gradient)
  - `artifacts/audit_insights_light_mode.png` (Financial Insights in Quiet Ledger Light Mode)
  - `artifacts/audit_copilot_light_mode.png` (AI Copilot in Quiet Ledger Light Mode)
- **Automated Verification:**
  - Frontend Vitest: **104 / 104 tests passed** across 19 test suites (`npm --prefix frontend test -- --run`).
  - Production Build: **100% Success** (`tsc -b && vite build` in 2.78s, 0 errors).
  - Backend Pytest: **162 / 162 tests passed** across 27 test suites (`pytest backend/tests`, 81.70s).
  - Database Integrity: `PRAGMA integrity_check` = `ok`, `PRAGMA foreign_key_check` = `0 violations`.





