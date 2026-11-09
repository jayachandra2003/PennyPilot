# PennyPilot

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Tests](https://img.shields.io/badge/Tests-286%20Passed-success)](https://github.com/jayachandra2003/PennyPilot)

> An intelligent, privacy-first personal finance platform combining deterministic integer accounting, grounded AI intelligence, and multi-format receipt digitization.

---

## Overview

**PennyPilot** is a modern personal finance and expense management platform built on deterministic arithmetic and grounded AI intelligence. Conventional financial tools often force users into tedious manual bookkeeping or present generic, ungrounded charts. PennyPilot couples a **pure, deterministic arithmetic domain engine** with **multimodal AI assistance**—performing all financial math, projections, and aggregations in pure Python integer arithmetic before providing verified `FactBundle` data structures to the language model for narration.

Built on the **"Quiet Ledger"** design philosophy, PennyPilot emphasizes typography-driven readability, high contrast compliance (WCAG AA), tabular financial figures, and a clutter-free editorial aesthetic across desktop, tablet, and mobile devices.

---

## Key Features

### 1. Deterministic Financial Ledger
- **Integer Paise Arithmetic:** All monetary values are calculated and stored strictly as integer paise (`₹1.00 = 100 paise`), eliminating IEEE 754 floating-point rounding discrepancies.
- **Granular Category Taxonomy:** Custom color-coded categories, subcategory tags, and customizable spending limits.
- **Bi-directional Ledger:** Real-time balance calculations, multi-parameter transaction filtering, and period-over-period aggregate reporting.

### 2. Multi-Format Receipt Digitization
- **Spatial OCR Reconstruction:** Intelligent bounding-box clustering reconstructs fragmented receipt rows into aligned tabular line items.
- **Indian Tax Disaggregation:** Accurately parses CGST, SGST, IGST, subtotal breakdowns, and prioritizes the true post-tax grand total over intermediate sub-totals or line items.
- **Review-Before-Commit Workflow:** Extracted transactions are presented in an editable preview modal, giving users full verification before saving to the ledger.

### 3. Grounded AI Financial Copilot ("Compute, Then Explain")
- **FactBundle Verification Architecture:** The generative model is strictly decoupled from financial arithmetic. Backend analytical engines compute verifiable `FactBundle` data structures in pure Python; the LLM receives these structured facts to translate them into clear narrative summaries.
- **Evidence Verification:** Narrative responses are cross-referenced against the underlying FactBundle before rendering.
- **Model Compatibility:** Configured for `gemini-3.8-flash` for multimodal receipt processing and narrative financial analysis (active when a Gemini API key is configured).

### 4. Natural Language Quick-Add
- **Conversational Logging:** Parse multi-item, mixed-currency expenses from plain language phrases (e.g., *"₹450 groceries and 120 coffee today"*).
- **Interactive Review:** Parses amount, category, date, and description into structured drafts for one-click confirmation.

### 5. Proactive Budget Intelligence
- **Velocity Tracking:** Real-time budget burn rate indicators comparing elapsed calendar days against actual spending momentum.
- **Predictive Overrun Alerts:** Proactive warnings flag categories tracking toward deficit before the billing cycle closes.
- **Statistical Anomaly Detection:** Applies Median Absolute Deviation (MAD) algorithms to identify irregular transaction spikes without assuming normal distribution curves.

### 6. Progressive Web App (PWA)
- **Offline Shell Precaching:** Service worker precaches the application shell for offline capability and fast load times.
- **Responsive Touch Architecture:** 44px minimum mobile tap targets, pull-down bottom sheets, and adaptive layouts optimized for viewports from 320px to large displays.

---

## Application Showcase

### Public Landing Page
A polished public entry point featuring ambient lighting, an interactive receipt scanning demo, feature highlights, and seamless onboarding pathways.

![PennyPilot Landing Page](docs/images/landing_page.png)

### Executive Financial Dashboard
The central command center provides high-density net worth indicators, dynamic monthly trend bars, and real-time category distribution.

![PennyPilot Executive Dashboard](docs/images/dashboard.png)

### Budget Velocity & Spending Pace
Visual progress bars and burn-rate metrics contrast calendar day progress against actual consumption to prevent month-end overruns.

![PennyPilot Budget Intelligence](docs/images/budgets.png)

### Multi-Format Receipt Extraction
The automated document pipeline extracts merchant metadata, date, line items, and Indian GST breakdowns into an editable ledger draft.

![PennyPilot Receipt Scanner](docs/images/receipt_scanning.png)

### Cash Flow & Category Analytics
Multi-axis breakdown of spending patterns, monthly burn rates, and discretionary expense distributions.

![PennyPilot Analytics](docs/images/analytics.png)

### Dedicated Full-Page Authentication
Dedicated Sign In and Create Account interfaces with live password complexity indicators, remember-me persistence, and Google OAuth integration.

| Sign In (`/login`) | Create Account (`/signup`) |
| :---: | :---: |
| ![Sign In Page](docs/images/auth_signin.png) | ![Create Account Page](docs/images/auth_signup.png) |

### Responsive Mobile Experience
Full desktop capabilities encapsulated in an ergonomic mobile layout with bottom-sheet modals, tactile cards, and quick-action triggers.

![PennyPilot Mobile Interface](docs/images/mobile_interface.png)

---

## Technology Stack

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PENNYPILOT STACK                                     │
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ Frontend          │ React 19, TypeScript, Vite, Tailwind CSS, TanStack Query v5        │
│ UI & Data Viz     │ Lucide React, Recharts, Custom Quiet Ledger Design System          │
│ Backend Framework │ Python 3.10+, FastAPI (ASGI), Pydantic v2, Uvicorn                 │
│ Database & ORM    │ PostgreSQL 16 / SQLite, SQLAlchemy 2.0, Alembic Migrations         │
│ Storage Provider  │ Pluggable StorageProvider (Local Disk & S3-compatible interfaces)  │
│ Authentication    │ Google OAuth 2.0 (PKCE OpenID Connect), Bcrypt, PyJWT, First-Party │
│                   │ SameSite Session Cookies                                           │
│ AI & Vision       │ Google Gemini 3.8 Flash (Multimodal), RapidOCR Engine              │
│ Quality & Testing │ Pytest (171 tests), Vitest (115 tests), Full TypeScript Validation │
└───────────────────┴────────────────────────────────────────────────────────────────────┘
```

---

## System Architecture

PennyPilot enforces strict separation of concerns across client, gateway, domain, and data layers:

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Layer (PWA)"]
        UI["React 19 SPA (Vite + Tailwind)"]
        SW["Service Worker (Asset Precaching)"]
        State["TanStack Query (Client Cache)"]
    end

    subgraph Gateway ["API & Authentication Gateway"]
        FastAPI["FastAPI Application"]
        AuthMiddleware["Session & CSRF Verification"]
        RateLimiter["IP & Token Rate Limiting"]
    end

    subgraph Domain ["Pure Python Domain Engine (Zero I/O)"]
        MathEngine["Deterministic Arithmetic (Integer Paise)"]
        PaceCalc["Budget Velocity & Projections"]
        AnomalyEngine["Statistical Anomaly Detector (MAD)"]
        FactVerifier["FactBundle Grounding Verifier"]
        ReceiptParser["Spatial Token & Tax Parser"]
    end

    subgraph Infrastructure ["External Services & Persistence"]
        DB[(PostgreSQL / SQLite Database)]
        Storage["Pluggable StorageProvider (Local / S3)"]
        LLM["Google Gemini API (Narrative Generation)"]
        OAuth["Google OAuth 2.0 Provider"]
        SMTP["Brevo SMTP Service"]
    end

    UI <--> State
    State <--> |HTTPS / JSON / Session Cookies| FastAPI
    FastAPI --> AuthMiddleware
    AuthMiddleware --> RateLimiter
    RateLimiter --> Domain
    Domain <--> DB
    Domain <--> Storage
    Domain -.-> FactVerifier -.-> LLM
    FastAPI <--> OAuth
    FastAPI <--> SMTP
```

---

## Getting Started & Local Development

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18.0 or higher (`npm` included)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/jayachandra2003/PennyPilot.git
cd PennyPilot
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (creates local SQLite database)
alembic upgrade head

# Start development server on port 8000
uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
# Open a new terminal in the repository root
cd frontend

# Install dependencies
npm install

# Start Vite development server on port 5173
npm run dev
```
Open `http://localhost:5173` in your browser.

### Windows Quick Startup Batch Scripts
For Windows environments, the repository includes three one-click startup scripts in the root directory:
- `1_Start_Backend.bat` — Activates the virtual environment and starts Uvicorn.
- `2_Start_Frontend.bat` — Installs dependencies (if missing) and starts Vite.
- `3_Start_Cloudflare.bat` — Optionally exposes the application via a local Cloudflare quick tunnel for remote mobile testing.

---

## Environment Variables Configuration

Copy `.env.example` to `.env` in the root directory and configure the variables as needed:

```env
# ==============================================================================
# PENNYPILOT ENVIRONMENT CONFIGURATION (.env)
# ==============================================================================

# Core Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=generate_a_secure_64_character_hex_key_for_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
# Local SQLite (default):
DATABASE_URL=sqlite:///./penny_pilot.db
# Cloud PostgreSQL (Optional):
# DATABASE_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require

# URLs & CORS
FRONTEND_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# AI & OCR Engine (Optional - 3-Tier Fallback Chain)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_VISION_MODEL=gemini-3.8-flash
GEMINI_TEXT_MODEL=gemini-3.8-flash

# Brevo SMTP Configuration (Email Verification & Password Reset)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=your_smtp_login_here
SMTP_PASSWORD=your_smtp_password_here
SMTP_FROM_EMAIL=your_verified_sender_email@example.com
SMTP_FROM_NAME=PennyPilot
SMTP_USE_TLS=true

# Google OAuth 2.0 (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

---

## Verification & Automated Test Suites

PennyPilot enforces comprehensive automated testing across both client and server:

### Run Backend Tests (171 Tests)
```bash
# From repository root or backend/
pytest backend/tests
```
Covers arithmetic precision, tax disaggregation, anomaly detection, session security, CSRF protection, and account lifecycle.

### Run Frontend Tests (115 Tests)
```bash
# From repository root
npm test --prefix frontend -- --run
```
Covers form validation, password strength requirements, offline PWA hooks, report generation, and UI state logic.

### Verify Production Build
```bash
npm run build --prefix frontend
```
Executes TypeScript compilation (`tsc -b`) and Vite production bundle optimization.

---

## Security & Data Integrity

PennyPilot implements strict security-by-design standards across all execution paths:

- **Server-Side Multi-Tenant Isolation:** Every database query strictly filters by `user_id` enforced server-side. Client-side state is treated as untrusted.
- **Strict SameSite First-Party Cookies:** Authentication sessions, CSRF protections, and OAuth PKCE verifiers use `SameSite=Lax`, `Secure=True` (in production/HTTPS), and `HttpOnly` flags to eliminate token theft via Cross-Site Scripting (XSS).
- **Cryptographic Password Hashing:** User passwords are encrypted using `bcrypt` with per-user cryptographic salts and minimum complexity enforcement.
- **Grounded FactBundle Architecture:** AI endpoints are decoupled from numerical calculations. All arithmetic, aggregations, and burn-rate metrics occur in pure Python integer paise, generating immutable `FactBundle` data structures that are cross-referenced with generated narrative output before presentation.
- **Authenticated File Access:** Receipt files are accessed through authenticated backend streaming endpoints (`/api/v1/receipts/{id}/download`), enforcing user session validation rather than exposing direct public storage URLs.

---

## License

This repository does not currently include an open-source license. All rights are reserved. An open-source license may be designated in a future release.
