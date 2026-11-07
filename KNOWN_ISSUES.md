# PennyPilot — Known Issues & Technical Debt

> **Reference:** Supporting Technical Debt Register for `PROJECT_MASTER_LOG.md`  
> **Status:** Active  
> **Last Updated:** 2026-11-07

---

## 1. Unresolved Technical Debt

### 1.1 Large Frontend Bundle Warning (Vite)
- **Description:** Vite emits a chunk size warning during production build: `dist/assets/index-BQV-OTdz.js` is ~592 kB minified (> 500 kB recommended threshold).
- **Impact:** Negligible impact on desktop; adds ~140ms initial parse overhead on slow mobile networks.
- **Remediation Plan:** Introduce `React.lazy()` route/tab-level code splitting for secondary tabs (`HistoricalAnalytics`, `CategoryManagement`, `SettingsView`, and `MonthlyReportModal`) in Milestone 5.
- **Status:** Open (Low Severity).

### 1.2 Inactive Schema Tables
- **Description:** Tables `financial_goals` and `insights` exist in canonical schema with 0 rows. `recurring_transactions` has now been activated for recurring monthly income rules.
- **Impact:** None. Schemas were created as part of the initial Alembic foundation.
- **Remediation Plan:** Populate during future milestones (Milestone 5 Goal Tracking & OCR Receipt Parsing).
- **Status:** Open (Informational).

### 1.3 Google OAuth Production Credentials
- **Description:** Backend endpoint `/api/v1/auth/google` is verified with mock test suites. Live Google login in a public deployment requires setting client credentials in `.env` (`GOOGLE_CLIENT_ID`).
- **Impact:** Expected development behavior.
- **Remediation Plan:** Set production environment variables when deploying to hosted infrastructure.
- **Status:** Open (Deployment Limitation).

---

## 2. Postponed Features & Roadmap Register

### 2.1 Financial Goal Tracking
- **Scope:** Target savings goals with target dates, target amounts, and monthly allocation contributions.
- **Status:** Schema prepared (`financial_goals`, 0 rows). Intentionally deferred to Milestone 5 to maintain focus on cash flow tracking and Quiet Ledger UX.

### 2.2 Receipt OCR & Bank Statement Import
- **Scope:** Optical character recognition for physical bills/receipts, and batch parser for bank CSV and PDF statements.
- **Status:** **Receipt OCR Implemented in Milestone 4** using local zero-cost tools (`pypdf`, `python-docx`, Pillow contrast/EXIF normalization, regex rule engine, and Gemini multimodal vision fallback) with mandatory editable review step before ledger persistence. Bank CSV/PDF batch statement imports remain scheduled for Milestone 5.

### 2.3 Automated Recurring Transactions
- **Scope:** Automated scheduler for fixed monthly debits (rent, subscriptions, utilities).
- **Status:** Schema prepared (`recurring_transactions`, 0 rows). Processing engine targeted for Milestone 6.

