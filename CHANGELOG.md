# PennyPilot — Chronological Changelog

All notable changes to PennyPilot are documented here.  
Format follows Keep a Changelog guidelines.

---

## [Unreleased] - 2026-11-08
### Comprehensive Product Refinement & Feature Implementation Milestone
- **Receipt Capture, Upload & OCR in Quick Add (`NLQuickAddModal.tsx`, `receipt_extractor.py`, `receipts.py`):**
  - MediaDevices camera capture for desktop webcams and mobile rear cameras (`facingMode: { ideal: "environment" }`) with live viewfinder overlay, frame capture canvas, photo preview, retake, and use-photo actions.
  - File attachment support for PNG, JPG/JPEG, WebP, PDF, DOCX ($\le 5\text{MB}$, magic byte validation).
  - Pure ₹0 local extraction engine using `pypdf`, `python-docx`, Pillow contrast/EXIF normalization, and regex extraction for merchant, date, amount in integer paise, tax, line items, and category suggestion.
  - Mandatory review & edit card before saving to ledger; zero auto-saving without explicit confirmation.
  - Multi-tenant directory partitioning in `uploads/receipts/{user_id}/` with user cleanup on account deletion.
- **Floating Draggable AI Assistant (`FloatingCopilotButton.tsx`, `App.tsx`):**
  - Persistent robot-head assistant button in bottom-right corner with gentle wave animation and tooltip.
  - Draggable with mouse and touch bounded to viewport dimensions.
  - Opens floating chat drawer with suggested question chips, conversation stream, voice mic input, and expand action to full page.
- **Multimodal Web Speech API Voice Input (`VoiceInputButton.tsx`, `CopilotChat.tsx`, `FloatingCopilotButton.tsx`):**
  - Real-time speech-to-text voice input via `webkitSpeechRecognition` and `SpeechRecognition`.
  - Listening pulse indicator, transcription review before sending, and graceful permission denial handling.
- **Official Monthly Financial Statement & Multi-Format Exports (`MonthlyReportModal.tsx`, `exportReports.ts`):**
  - Formal Personal Financial Statement layout with Cover, 1. Executive Summary & Key Telemetry, 2. Expense Analysis & Category Distribution, 3. Budget Performance & Safety Cushion, 4. Statistical Outliers & Spending Spikes (MAD Engine), 5. Key Financial Observations, 6. Certification & Compliance Disclosures.
  - Multi-format export dropdown (PDF Statement via jsPDF/autotable, DOCX Document via `docx`, CSV Spreadsheet) and Print button.
- **Financial Insights Dynamic Calendar & Report Exports (`InsightsView.tsx`, `exportReports.ts`):**
  - Interactive `CalendarMonthPicker` in Insights header for dynamic month/year queries.
  - Multi-format `Download Report` dropdown menu supporting CSV, PDF, and DOCX documents with verified backend data.
  - Removed redundant `SIGNALS & INTELLIGENCE` header text.
- **Analytics 6-Month Chart Tooltip Polish (`HistoricalAnalytics.tsx`):**
  - Redesigned hover tooltip with solid Quiet Ledger Light and Midnight Ledger Dark styling, formatted tabular INR currency, separate inflow/outflow/savings rows, and empty-month handling.
- **AI Copilot Response Correctness & Formatting (`copilot_service.py`, `CopilotChat.tsx`):**
  - Upgraded intent routing, narrative generation, and LLM prompt context to include category breakdowns, savings rates, and question-specific advice.
  - Render real Markdown (`**bold**`, bullet lists) instead of raw asterisks.
  - Visible provider indicator pill (Gemini, Groq, Ollama Qwen 2.5:3B, Rule-based Deterministic).
- **Legal Pages Shell Polish (`LegalLayout.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `SecurityStandards.tsx`):**
  - Replaced nested full-screen opaque boxes with transparent layout, breadcrumb bar, and solid Quiet Ledger card shell, allowing the ambient background gradient to flourish.
- **Automated Verification:**
  - Backend tests: 162/162 passed in Pytest across 27 test files (`pytest backend/tests`).
  - Frontend tests: 104/104 passed in Vitest across 19 test suites (`npm --prefix frontend test -- --run`).
  - Production build: Succeeded with 0 errors (`tsc -b && vite build` in 2.78s).
  - Browser CDP screenshots verified: `audit_dashboard_with_floating_copilot.png`, `audit_floating_copilot_open.png`, `audit_quick_add_modal.png`, `audit_insights_page.png`, `audit_insights_download_menu.png`, `audit_copilot_dedicated_page.png`, `audit_monthly_statement_modal.png`, `audit_monthly_statement_download_menu.png`, `audit_legal_privacy_clean.png`, `audit_mobile_dashboard_390.png`, `audit_dashboard_light_mode.png`, `audit_insights_light_mode.png`, `audit_copilot_light_mode.png`.

## [Unreleased] - 2026-11-08
### First-Time User Guided Onboarding Tutorial & Secure Permanent Account Deletion
- **First-Time User Guided Onboarding Tutorial (`OnboardingTutorialTour.tsx`, `App.tsx`, `SettingsView.tsx`):**
  - Designed and implemented a 6-step contextual interactive product tour introducing:
    1. Financial Overview Dashboard (Verified Inflow, Outflow & Savings).
    2. Deterministic Transactions Ledger (Audit Trail & Multi-Format Exports).
    3. Category Spending Ceilings (Dynamic Pacing & Daily Burn Velocity).
    4. Historical Financial Analytics (6-Month Retrospective Progression).
    5. Statistical Signals & Anomaly Detection (MAD Outlier Engine & Capital Buffer).
    6. Institutional AI Copilot (Zero Hallucination FactBundles & Quick-Add).
  - Non-intrusive floating card with progress segments, step indicator (`Step X of 6`), Next, Back, Skip, and Finish controls.
  - Automatic tab navigation synchronized to tour steps.
  - User persistence via new database column `tutorial_completed` on `users` table (`e4f5a6b7c8d9_add_tutorial_completed.py`) and endpoints `GET/POST /api/v1/onboarding/tutorial`.
  - Added "Replay Tutorial" action under Settings $\rightarrow$ Appearance.
  - Responsive at 390px mobile viewports and accessible across Quiet Ledger Light and Midnight Ledger Dark themes.
- **Secure Permanent Account Deletion & Active Purging (`account.py`, `DeleteAccountModal.tsx`, `SettingsView.tsx`):**
  - Settings Danger Zone card under Account & Security tab.
  - GitHub-style irreversible confirmation modal requiring exact case-sensitive match for `DELETE MY ACCOUNT`.
  - Password re-verification for password-authenticated users; active session checks for OAuth users; CSRF token validation.
  - Atomic backend cascade deletion in SQLite foreign-key safe sequence across 12 tables (`transactions`, `recurring_transactions`, `budgets`, `financial_goals`, `categories`, `insights`, `notifications`, `email_verification_tokens`, `password_reset_tokens`, `oauth_transactions`, `oauth_accounts`, `sessions`, `users`).
  - Physical removal of uploaded avatar files from disk storage (`uploads/avatars/`).
  - Revocation and clearance of authentication, refresh, and CSRF cookies, client cache clearance, and redirection to public login with toast confirmation.
  - Updated legal policies in Privacy Policy, Terms of Service, and Security Standards disclosing active purging and 30-day encrypted disaster recovery backup retention.
- **Verification:**
  - Automated tests: 97/97 frontend Vitest tests passing, 156/156 backend Pytest tests passing.
  - Production build: `npm --prefix frontend run build` succeeded with zero TypeScript/Vite errors.
  - Browser CDP screenshots verified: `audit_tutorial_step1_dashboard_light.png`, `audit_tutorial_step2_transactions_light.png`, `audit_tutorial_step3_budgets_light.png`, `audit_tutorial_step1_dark.png`, `audit_tutorial_mobile_390.png`, `audit_settings_appearance_replay_light.png`, `audit_settings_danger_zone_light.png`, `audit_settings_danger_zone_dark.png`, `audit_delete_modal_light.png`, `audit_delete_modal_dark.png`.

## [Unreleased] - 2026-11-07
### Global Light-Mode Contrast Polish, Settings Modernization & Edit Profile Modal Redesign
- **Global Light Mode Contrast & Background Normalization (`App.tsx`, `index.css`):**
  - Dramatically lowered full-screen ambient aurora gradient mesh opacity in `App.tsx` from 45%/35% down to 7–9% for Light Mode, eliminating washed-out mint/blue haze while keeping brand identity intact. Dark Mode preserved at 20–25%.
  - Upgraded core CSS variables in `index.css` to institutional Quiet Ledger standards: `--color-ledger-bg: #F8F9FA`, `--color-ledger-surface: #FFFFFF` (solid opaque), `--color-ledger-border: #E2E8F0`, `--color-ledger-ink: #0F172A`, `--color-ledger-inkMuted: #334155`, `--color-ledger-inkSubtle: #475569`.
  - Replaced washed-out glass shadows with commercial financial shadow (`0 1px 3px 0 rgba(15, 23, 42, 0.06)`).
- **Historical Financial Analytics Polish (`HistoricalAnalytics.tsx`):**
  - 4 separate solid white macro cards with bold numbers and clear labels.
  - Bounded 6-Month Income vs Expense Trends chart with dotted horizontal reference guidelines.
  - Empty-month indicator (`— No entries`) in dashed enclosure; highlighted active month in distinct rounded container.
- **Account Settings View Modernization (`SettingsView.tsx`):**
  - Modern Quiet Ledger heading, subtitle, and section badge.
  - Modern vertical sidebar navigation pills (Profile, Appearance, Currency, Account & Security) with tactile active styling.
  - Solid card enclosures (`#FFFFFF` / `#121C28`), high contrast labels, styled inputs, and clear save controls.
  - Profile avatar presentation with 80x80 px circular frame, file requirements, "Upload Picture", "Change Picture", and "Remove" actions.
- **Edit Profile Modal Redesign (`ProfileModal.tsx`):**
  - Institutional Quiet Ledger modal shell (`bg-white dark:bg-[#121C28] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl`).
  - Clean header & footer with close button hover state and verified account badge.
  - Removed monospaced uppercase technical labels; replaced with clean `text-xs font-semibold text-slate-700 dark:text-slate-300`.
  - Read-only email address with green "Verified" pill.
  - Optional Age & Gender fields clearly marked as `(Optional)`.
  - Functional timezone selector with clock icon.
  - Fully responsive and verified at 390px mobile viewport without horizontal scroll.
- **Category Management Tactile Action Buttons (`CategoryManagement.tsx`):**
  - Upgraded Edit and Archive buttons with distinct tactile borders (`border-slate-200`), subtle backgrounds, and responsive touch targets.
- **Verification:**
  - Automated tests: 86/86 frontend Vitest tests passing, 150/150 backend Pytest tests passing.
  - Production build: `npm --prefix frontend run build` succeeded with zero TypeScript/Vite errors.
  - Verified across light and dark modes with automated CDP browser tests (`audit_final_settings_light.png`, `audit_final_profile_modal_light.png`, `audit_final_profile_modal_dark.png`, `audit_final_profile_modal_mobile_light.png`).

### Contrast Polish for Legal, Analytics, Categories & Redesign of Financial Insights
- **Legal Documents Contrast & Framing (`LegalLayout.tsx`, `PrivacyPolicy.tsx`, `TermsOfService.tsx`, `SecurityStandards.tsx`):**
  - Enclosed legal policies inside a solid Quiet Ledger & Midnight Ledger card (`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card rounded-2xl p-6 sm:p-10 md:p-12`), eliminating background gradient haze and bleed-through.
  - Replaced faint ink (`text-ledger-inkSubtle` / `text-ledger-inkMuted`) with high-contrast `text-slate-900 dark:text-slate-100`, `text-slate-800 dark:text-slate-200`, and `text-slate-700 dark:text-slate-300`.
  - Upgraded code snippets, lists, and financial disclaimer boxes with accessible contrast in both Light and Dark modes.
- **Historical Analytics Macro Cards & Chart Contrast Polish (`HistoricalAnalytics.tsx`):**
  - Upgraded the 4 top macro KPI cards from translucent `glass-panel` to solid Quiet Ledger cards (`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card`).
  - Upgraded the 6-Month Income vs. Expense Trend chart card to a solid Quiet Ledger container with crisp month bar labels (`Jun '26`, `Jul '26`...), legend, and high-contrast table view.
- **Category Management Alignment (`CategoryManagement.tsx`):**
  - Replaced legacy translucent `glass-panel` category cards with solid Quiet Ledger cards (`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card rounded-2xl p-5`).
  - Implemented crisp badges for `DEFAULT` (system preserved) and `ARCHIVED` categories.
  - Upgraded segmented control for Expense vs. Income tabs with clean pill counters.
  - Upgraded Create, Edit, and Archive confirmation modals with solid surfaces, high-contrast labels, and accessible inputs.
- **Complete Institutional Redesign of Financial Insights Page (`InsightsView.tsx`):**
  - Eliminated the "AI generated" look:
    - Removed all colored vertical stripe cards (`border-l-4`).
    - Replaced with 4 institutional Quiet Ledger KPI cards (`GlassIcon`, uppercase labels, bold values, and clean subtitles).
    - Replaced robotic all-caps tags (`ON_TRACK`, `1 FLAGGED`) with humanized status pills with dots (`● On Track`, `● 1 Outlier Flagged`, `● Disciplined`, `● Active Buffer`).
    - Redesigned 4 main intelligence signal cards (Spending Velocity, Statistical Outlier Analysis, Capital Retention Discipline, Budget Buffer & Safety Margin) with structured telemetry, clean progress bars, and tactile Quiet Ledger action buttons.
  - Verified across light and dark modes with automated CDP browser tests.

### Budget Page Polish, Calendar Pickers, Document Exports & Analytics De-Blurring
- **Budget Page Calendar Month Picker Integration:**
  - Integrated `CalendarMonthPicker` component directly into the `BudgetManagement.tsx` header with `<ChevronLeft>` and `<ChevronRight>` controllers and `z-40` positive stacking.
  - Eliminated clipping by ensuring container uses `overflow-visible` and dynamic calendar month navigation.
- **Budget Page Tactile "Adjust Budget Limit" Button:**
  - Upgraded the washed-out white button with solid Quiet Ledger styling (`bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-300/90 dark:border-slate-600/80 shadow-xs`).
  - Added teal edit icon and responsive tactile click state (`active:scale-[0.99]`).
- **Humanized Institutional Budget Status Badges:**
  - Replaced robotic uppercase monospace badges (`OVER PACE`, `ON TRACK`) with humanized institutional status pills (`● On Track`, `● Caution`, `● Over Pace`, `● Over Budget`, `● Uncapped`).
  - Rendered colored indicator dot (`w-1.5 h-1.5 rounded-full`) with title-case font-sans typography.
- **Streamlined Monthly Spending Velocity Card:**
  - Completely redesigned the card into an actionable, non-redundant velocity instrument:
    - Real-time pacing badge in header (`● 9.4% under pace` / `ahead of pace`).
    - Dual-indicator timeline track comparing budget consumed against calendar days elapsed.
    - 3 forward-looking velocity metrics: `Daily Spending Velocity` (daily average), `Allowable Daily Target` (target for remaining days), and `Projected Month-End Spend` (at current daily velocity).
    - Removed duplicate `Actual Spend` and `Remaining Buffer` boxes already visible in top KPI cards, and removed generic AI speech box.
- **Analytics Page Calendar Month Picker Integration:**
  - Added `CalendarMonthPicker` to the period navigator on `HistoricalAnalytics.tsx`, allowing users to select any ending/reference month directly.
  - Supported 6-month retrospective window recalculation with `<ChevronLeft>` and `<ChevronRight>` stepper.
- **Analytics Page Document Export Engine (CSV, PDF, DOCX):**
  - Added an interactive `Export Report` dropdown menu to the header of `HistoricalAnalytics.tsx`.
  - Supported three pure deterministic export formats:
    - **CSV Spreadsheet (`.csv`)**: 6-month financial performance data and category breakdowns.
    - **Printable Audit Statement (`.pdf`)**: Formatted statement via jsPDF + autoTable with macro metrics box, monthly table, and top spending categories.
    - **Word Document (`.docx`)**: OpenXML-compatible Word document with macro summary table, monthly retrospective, and category breakdown.
- **Analytics Page Bottom Half De-Blurring & Contrast Overhaul:**
  - Diagnosed and fixed the bottom half blur defect caused by background aurora mesh (`blur-[160px]`) bleeding through semi-transparent cards.
  - Replaced semi-transparent `bg-ledger-surface` with solid opaque surfaces: `bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card rounded-2xl`.
  - Upgraded typography to high-contrast ink (`text-slate-900 dark:text-slate-100`, `text-slate-700 dark:text-slate-300`).
  - Implemented solid inner card backgrounds (`bg-slate-50 dark:bg-slate-800/70`) and solid progress bar tracks (`bg-slate-100 dark:bg-slate-800`), eliminating all blur and haze in both Light and Dark modes.

### Equal Card Sizing, 65/35 Trajectory Row, Full-Width Ledger, Modal Theming, Document Exports & Budget Page Polish
- **Equal Card Sizes for Monthly Cash Flow & Expense Distribution:**
  - Placed `CompactCashFlowSummary` and `ExpenseDonutChart` into an equal 50% / 50% desktop split (`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 min-w-0 items-stretch`) with matching heights.
  - Kept original positions (Cash Flow on the left, Expense Distribution on the right).
- **Side-by-Side Financial Trajectory & Income Streams (65% / 35%):**
  - Positioned `BudgetIntelligenceCard` (65% width) and `IncomeSourceBreakdownCard` (35% width) side-by-side using `flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6 min-w-0 items-stretch`.
  - Balanced height stretching with `h-full flex flex-col justify-between`.
- **Full-Width Recent Transactions Card:**
  - Positioned `RecentTransactionsCard` as a full-width section (`w-full min-w-0`) directly below the Trajectory & Income Streams row, giving transaction ledger columns generous horizontal spacing and readability.
- **Income Management Modal Redesign (Liquid Glass Fix):**
  - Re-themed `IncomeManagementModal.tsx` from scratch, replacing the unstyled `bg-ledger-card` and liquid-glass transparent elements with the official Quiet Ledger (light) and Midnight Ledger (dark) solid modal design.
  - Features solid `#FFFFFF` / `#121C28` surfaces, high contrast `#182332` cards, accessible WCAG AAA text contrast, and crisp borders.
- **Transactions Page Header & Document Export Engine (CSV, PDF, DOCX):**
  - Removed decorative uppercase `AUDIT TRAIL` label above the `Financial Ledger` title in `TransactionList.tsx`.
  - Created `exportReports.ts` engine with deterministic integer paise calculations:
    - **CSV Spreadsheet (`.csv`)**: Raw tabular transaction data.
    - **PDF Statement (`.pdf`)**: Formatted audit statement with logo, telemetry summary, colored amounts, and pagination.
    - **DOCX Document (`.docx`)**: Formal Word report with OpenXML styles, metadata, and tabular ledger formatting.
  - Added an interactive `Export Report` dropdown menu in `TransactionList.tsx` for one-click downloading of all three formats.
- **Budget Page Text Cleanups:**
  - In `BudgetManagement.tsx`, removed three decorative uppercase pre-header labels:
    - `Capital Allocation` above `Budget Management`
    - `Timeline Calibration` above `Monthly Spending Velocity & Pacing`
    - `Granular Limits` above `Category Allocation Ceilings`

### Final Dashboard Content Cleanup & Dedicated Insights Page
- **Removed Monthly Verdict Banner:**
  - Completely removed the green Monthly Verdict banner from the Financial Overview header, eliminated all reserved space, and rebalanced header card height without adding placeholders.
- **Removed Executive Position Label & Enlarged Greeting:**
  - Removed small uppercase `EXECUTIVE POSITION` label and separator bullet.
  - Enlarged dynamic time-of-day greeting (`Good evening, Jaya!`) into a clear secondary heading directly above the primary page title (`Financial Overview`).
- **Moved Financial Insights to Dedicated Top Navigation Page:**
  - Added dedicated `Insights` tab to the top navbar with a `Lightbulb` icon, distinct from `AI Copilot`.
  - Built `InsightsView.tsx` dedicated page featuring 4 telemetry stat cards and 4 detailed signals (Budget Pace, Statistical Outlier Analysis, Capital Retention, Budget Buffer) with working navigation actions.
  - Completely removed the Financial Insights card from the bottom of the Dashboard.
- **Removed Redundant Decorative Section Labels:**
  - Removed decorative uppercase labels `SPENDING VELOCITY` (above Financial Trajectory & Daily Velocity) and `AUDIT TRAIL` (above Recent Transactions).
  - Maintained clear, accessible section titles: `Financial Trajectory & Daily Velocity` and `Recent Transactions`.
- **Dashboard Final Balanced Lower Section:**
  - Placed `Recent Transactions` (left, 7 columns) and `Income Streams` (right, 5 columns) side-by-side in a clean, balanced layout.
- **Transactions Page Preservation:**
  - Verified `Transactions` ledger page remains completely intact and unchanged.

### Dashboard PDF Reference Layout Alignment
- **Two-Page Layout Implementation (PDF Reference):**
  - **Page 1:**
    - Executive Header with greeting, Monthly/Yearly toggle, date picker, `+ Quick Add` button, and Monthly Verdict banner.
    - Two 3-card KPI rows: Row 1 (Total Income with `Manage`, Total Expenses, Actual Savings with Surplus/Deficit); Row 2 (Remaining Budget with `Edit Budget`, Budget Utilization with bold `13.2%` figure and pace, Savings Cushion with `Unallocated` badge).
    - Balanced 2-column section: `Monthly Cash Flow` on the left with mini Inflow (teal) and Outflow (rose) comparative bars, 3 bold key figures, supporting savings rate pill, and Cash Flow Allocation ratio bar; `Expense Distribution` on the right with Donut Chart SVG on the left and Category Legend list on the right.
    - Spending Velocity Hero Chart: `Financial Trajectory & Daily Velocity` with Daily Bars / Cumulative Pace toggle, Day 1-30 series, telemetry columns, and timeline footer.
  - **Page 2:**
    - Asymmetric 2-column layout: Left wider column (`lg:col-span-7 xl:col-span-8`) houses `Recent Transactions` Audit Trail card with `+ Add` button, `View All Ledger →` link, and transaction table.
    - Right column (`lg:col-span-5 xl:col-span-4`) houses `Income Streams` on top (stream count, `Manage` button, source progress bar) and `Financial Insights` stacked directly below it in the same column.
- **Financial Insights Vertical Stacking (`InsightCards.tsx`):**
  - Refactored `InsightCards` from a 3-column horizontal grid into a single structured card with vertically stacked insights separated by subtle dividers (`divide-y divide-ledger-borderSubtle`), matching Page 2 of the PDF.
  - Includes Budget Pace, Anomaly Outlier, and Savings Discipline signals with contextual action links (`Adjust Allocations →`, `Inspect in Ledger →`, `Explore Trends →`).
- **Expense Donut Horizontal Split (`ExpenseDonutChart.tsx`):**
  - Converted internal stack into a responsive side-by-side flex layout: Donut SVG on the left with center `TOTAL OUTFLOW` and formatted amount, and category legend list on the right with color indicators, amounts, and percentages.
- **Cash Flow Comparative Mini Bars (`CompactCashFlowSummary.tsx`):**
  - Added Inflow (teal) and Outflow (rose) comparative bars directly below the card header, matching Page 1 of the PDF.
- **Adaptive Annualized Baseline for Yearly Mode:**
  - In yearly view (`period === "yearly"`), dynamically scales budget ceilings to `allocatedCeilingPaise * 12`, presenting `Annualized Budget Baseline`, annual utilization percentage, and annual cushion without false deficit warnings.

### Dashboard Simplification & Translucent Navbar
- **Section Removals & Grid Consolidation:**
  - Completely removed standalone Savings Rate KPI card and Top Outflow Area KPI card from `MetricCards.tsx`, leaving zero empty grid gaps or placeholders.
  - Completely removed the Category Spending section (`CategoryBreakdownCard.tsx`) from the dashboard.
  - Consolidated metric cards into two 3-card responsive rows:
    - **Row 1:** Total Income (with Manage button), Total Expenses, Actual Savings.
    - **Row 2:** Remaining Budget (with Edit Budget button), Budget Utilization, Savings Cushion.
- **Monthly Cash Flow with Integrated Savings Rate (`CompactCashFlowSummary.tsx`):**
  - Integrated Savings Rate as a small, high-density supporting pill in the card header and inside the Net Savings metric block, eliminating the need for a separate KPI card while preserving actual selected-period calculations.
- **Translucent Frosted Navbar Correction (`Navbar.tsx`):**
  - Adjusted `<header>` and mobile `<nav>` to ~92% opacity with subtle backdrop blur (`bg-white/92 backdrop-blur-md border-b border-slate-200/80` in Light mode and `dark:bg-[#101820]/92 dark:backdrop-blur-md dark:border-[#2A3B45]/80` in Midnight Ledger Dark mode).
  - Provides a soft frosted diffusion for scrolling content with crisp text and zero distracting bleed-through.
- **Rearranged Dashboard Layout Hierarchy (`App.tsx`):**
  - Row 1: Total Income, Total Expenses, Actual Savings.
  - Row 2: Remaining Budget, Budget Utilization, Savings Cushion.
  - Row 3: Monthly Cash Flow and Expense Distribution, balanced side-by-side.
  - Row 4: Financial Trajectory & Daily Velocity.
  - Row 5: Income Streams and Recent Transactions, balanced side-by-side.
  - Row 6: Financial Insights.

### Fixed & Polished
- **Calendar Popover Stacking Context Fix:**
  - Resolved CSS stacking context trap caused by `backdrop-blur` on parent navigation containers in `DashboardHeader.tsx`.
  - Re-established strict DOM and stacking levels: Header `relative z-20`, Top Controller Bar `relative z-30`, Date Navigator `relative z-40`, Calendar Popover `z-50`, Monthly Verdict Callout `relative z-10`.
  - Removed transparency and backdrop filters from the calendar popover dialog, making it completely opaque (`bg-white` and `dark:bg-[#141F2B]`), guaranteeing 100% clean layering above all cards and banners without bleed-through.
- **Compact Cash Flow Summary Integration:**
  - Replaced redundant oversized standalone dual-bar chart with `CompactCashFlowSummary` side-by-side with `ExpenseDonutChart`.
  - Displays Total Inflow, Total Outflow, Net Savings, a proportional visual cash flow retention bar, and savings rate target indicator.
- **Financial Setup Welcome Screen Redesign (`FinancialOnboardingWizard.tsx`):**
  - Centered modal layout with solid card background, 5-segment step progress indicator, and clear typography.
  - Aligned 3 introductory feature cards (`01 Inflow`, `02 Budgets`, `03 Target`) into equal 3-column grid without text clipping.
  - Positioned primary "Get Started" and secondary "I'll Do This Later" actions cleanly with $\ge 44\text{px}$ touch targets.
- **Solid Header & Footer Navigation Shell:**
  - Replaced semi-transparent blur in `Navbar.tsx` and application `footer` with solid `#101820` in Dark theme and solid `bg-white` in Light theme, eliminating content bleed-through during vertical scrolling.
- **Dashboard Alignment & Equal Card Heights:**
  - Standardized `h-full flex flex-col justify-between` across Category Spending, Income Streams, Cash Flow Summary, and Expense Donut cards.
  - Eliminated mobile overflow on 390px viewport width.

### Added
- **Real Persistent Notification System (`/api/v1/notifications`):**
  - Database Model `Notification` (`backend/app/models/notification.py`) with fields `id`, `user_id`, `category`, `title`, `message`, `link_path`, `is_read`, `created_at`.
  - Alembic Migration `d2e3f4a5b6c7_add_notifications_table.py` (`down_revision='c1a2b3c4d5e6'`), expanding the schema to 14 canonical tables.
  - Service `notification_service.py` with deduplication, dynamic budget alert synchronization, brand new user guidance, mark-as-read, mark-all-read, and dismissal.
  - Event triggers wired into user registration, email verification, financial onboarding completion, and password reset.
  - Replaced promotional mock notifications in `NotificationsPopover.tsx` with TanStack React Query hooks, live unread badge, category indicators, and dismissal.
- **Period-Based Analytics (Monthly vs. Yearly):**
  - Pure Python domain function `calculate_yearly_aggregation` in `backend/app/domain/aggregates.py` computing actual annual sums, net savings, savings rate, and 12-month trajectory from recorded transactions in integer paise.
  - Enforced zero financial hallucination: annual actual income is never extrapolated by multiplying monthly by 12; projected recurring annual income is kept strictly separate and labeled as a projection.
  - Added `period="monthly" | "yearly"` query support across `/transactions/summary` and `/income` endpoints.
- **Financial Overview Dashboard Redesign:**
  - Header: Time-of-day greeting ("Good morning/afternoon/evening, {Name}!"), period selector pills `[ Monthly | Yearly ]`, dynamic Month/Year stepper, and Quick Add button.
  - Main Analytics Row: Large dual-bar Income vs Expenses chart (with 12-month trajectory on yearly view) and Expense Distribution Donut Chart with interactive legend and center total.
  - 8 Primary Financial Indicators (KPIs): Total Income, Total Expenses, Actual Savings, Savings Rate, Remaining Budget, Budget Utilization, Top Outflow Area, and Planned Savings Cushion.
  - Redesigned "Manage Income" and "Edit Budget" buttons from small tags into genuine accessible buttons ($\ge 44\text{px}$ touch targets, focus rings, hover/active states).
  - Supporting Sections: Budget Intelligence Hero Chart, Category Breakdown, Income Streams Breakdown, Recent Transactions, and AI Copilot Insights.
  - Clean welcoming empty states for zero-activity accounts without false claims or broken ratios.
- **Financial Onboarding UX Refinement:**
  - Unified `FinancialOnboardingWizard.tsx` to 5 steps with 5-segment visual progress indicator and completion step.
  - Single primary action "Get Started" and secondary "I'll Do This Later" on step 1.
  - Dark-mode glass surfaces and enhanced mobile responsiveness.
- **Multi-Source Income Management (`/api/v1/income`):** Full CRUD endpoints, recurring monthly income automation, source breakdown percentage calculations, and integer paise storage reusing the core `Transaction` model (`kind="income"`).
- **First-Time Guided Financial Onboarding (`/api/v1/onboarding`):** 6-step setup wizard (Welcome $\rightarrow$ Multi-Source Inflow $\rightarrow$ Category Budget Ceilings $\rightarrow$ Monthly Savings Target $\rightarrow$ Deterministic Plan Summary $\rightarrow$ Confirmation).
- **Pure Deterministic Financial Domain Engine (`financial_plan.py`):** Pure Python financial calculus distinguishing Actual Savings ($\text{Income} - \text{Expenses}$), Planned Savings Cushion ($\text{Income} - \text{Budgets}$), Remaining Buffer, and Savings Rate with 100% test coverage.
- **Onboarding Reminder Banner (`OnboardingReminderBanner.tsx`):** Non-intrusive dashboard reminder with "Set Up Now" and dismiss actions for users who skip the onboarding wizard.
- **Income Management Modal (`IncomeManagementModal.tsx`):** Glassmorphic interface with source breakdown pills, monthly inflow telemetry, and instant edit/delete capabilities.
- **Dashboard Income Integration (`MetricCards.tsx`):** Added "Manage" trigger directly on the Monthly Inflow card to launch income management.
- **Budget Editor Cushion Indicator (`BudgetEditorModal.tsx`):** Added live 4-column telemetry displaying Planned Savings Cushion / Unallocated Income reactive to user keystrokes.
- **Alembic Migration `c1a2b3c4d5e6`:** Added `onboarding_completed` (server_default='1' preserving all 35 existing users) and `monthly_savings_target_paise` to `users` table; verified with disposable upgrade/downgrade testing.
- Built `BudgetEditorModal` allowing users to directly inspect and modify monthly category budget allocations from the Dashboard.
- Added visible **Edit Budget** action button to the Budget Buffer card on the Dashboard.
- Added unit tests for dynamic budget buffer and daily spending pace derivation in `budgets.test.ts` (70 Vitest tests passing).
- Built `NotificationsPopover` with notification bell trigger, animated unread pulse dot, financial tips ("50/30/20 Budgeting Rule", "Discretionary Spending Tip"), budget velocity alerts, and system signals.
- Added comprehensive unit test suite in `NotificationsPopover.test.ts` (66 Vitest tests passing).
- Complete UI/UX redesign: **Restaurant/Cafe Billing Glassmorphism** overhaul across Dark and Light modes inspired by Sandeep Slaria's Dribbble concept.
- Ambient atmospheric aurora glow mesh canvas with organic radial gradient light orbs behind application content.
- Frosted glass cards and containers (`backdrop-blur-xl`, semi-transparent backgrounds with specular hairline borders and inner specular highlights).
- Translucent jewel gradient `GlassIcon` system with top reflections and glowing aura shadows.
- Bioluminescent teal and soft emerald accents in Dark mode (`#2DD4BF`, `#34D399`) and luminous crystal surfaces in Light mode (`#F4F6F9`).
- Created `PROJECT_MASTER_LOG.md` as the single source of truth for cross-agent collaboration (Antigravity & ChatGPT).
- Created supporting system documentation: `ARCHITECTURE.md`, `FEATURE_STATUS.md`, `KNOWN_ISSUES.md`.
- Redesigned dark mode under the **Midnight Ledger** visual direction (`#101820` canvas, `#192630` surfaces, `#202F39` elevated surfaces, `#2A3B45` hairline borders).
- Integrated official PennyPilot emblem and wordmark across navbar, headers, auth dialogs, and PWA assets.
- Built interactive `CalendarMonthPicker` supporting Day grid, 12-Month grid, and Decade Year selector.
- Built modern circular profile avatar trigger with `ProfileDropdown` and `ProfileModal`.
- Added dedicated `SettingsView` managing user profile preferences, appearance (light/dark/system), and currency.
- Built custom `CategoryManagement` supporting custom income and expense categories, custom icons, color tokens, and safe archival rules.
- Built `HistoricalAnalytics` section with 6-month cash flow trends, monthly net savings, savings rate progression, and MoM category shifts.
- Implemented reusable `usePWAInstallPrompt` hook and standardized `Skeleton` components.

### Fixed
- Fixed hardcoded `5500000` paise in Dashboard `MetricCards.tsx` by deriving Allocated Monthly Ceiling dynamically from `budgetsOverview.total_limit_paise`, Remaining Buffer from `Math.max(0, limit - expenses)`, and Daily Pace from `total_limit / days`.
- Removed hardcoded fallback `|| 5500000` in `BudgetIntelligenceCard` prop mapping in `App.tsx`.
- Fixed navbar scrolling away by converting `<header>` to `fixed top-0 left-0 right-0 z-50` and adding top padding `pt-[86px] sm:pt-[92px] md:pt-[98px]` to main content.
- Enlarged top bar height (`min-h-[74px] sm:min-h-[78px]`), logo mark (`size="md"`), brand text, desktop navigation pills, and user profile avatar.
- Resolved redundant dual quick add buttons by removing `+ Quick Add` from top bar and renaming `+ Record Expense` in `Financial Overview` to `+ Quick Add`.
- Completely removed redundant `[✓ ON TRACK]` badge from the financial dashboard.
- Fixed dark mode spending velocity chart bars by illuminating SVG bars with vibrant jewel cyan/teal gradients (`#2DD4BF`).
- Hardened popover container surfaces in `ProfileDropdown` and `CalendarMonthPicker` (`dark:bg-[#141F2E] border-white/15`) to eliminate background banner bleed-through.
- Fixed white-on-white text bugs in dark mode across active filter pills, user chat message bubbles, and hover tooltips.
- Replaced milky-white overlay veils across all modal backdrops with clean translucent dark scrims (`bg-black/60 dark:bg-black/75 backdrop-blur-sm`).
- Fixed SVG chart gridlines in dark mode by introducing reactive CSS custom properties (`--chart-bar-start`, `--chart-today-start`).
- Fixed calendar popover bottom clipping in `DashboardHeader` by switching from `overflow-hidden` to `relative z-20`.
- Ensured migration tests exclusively use disposable test databases without mutating the canonical `penny_pilot.db`.
