# PennyPilot — Agent Development Guide & Engineering Constitution

This document defines the strict engineering guidelines, architecture constraints, and quality standards for all AI agents and engineers working on **PennyPilot**.

---

## 1. Prime Directives

1. **Compute, Then Explain (Zero Financial Hallucination)**
   - The LLM must **never** perform financial calculations, aggregate totals, or compute budget pace.
   - All arithmetic happens in `backend/app/domain/` with pure, deterministic Python functions.
   - The LLM only receives verified `FactBundle` structures to narrate or explain.
   - All LLM outputs must be verified against the `FactBundle` with numeric validation before presentation.

2. **Strict Integer Paise Convention**
   - Floating-point representations (`float`) must **never** be used for storing or calculating monetary amounts.
   - All monetary amounts in database tables, schemas, and domain functions are integer **paise** (`₹1.00 = 100 paise`).
   - Currency formatting to INR (`₹XX,XX,XXX.XX`) happens exclusively at the UI display layer or presentation boundary.

3. **Multi-Tenant User Isolation**
   - Every database query for user-owned records (transactions, categories, budgets, goals, insights) **must** filter on `user_id`.
   - Never expose an endpoint that performs unbounded queries across users.
   - Authorization is enforced server-side; client-side state is untrusted.

4. **Strict Zero-Budget ($0) Guarantee**
   - Never introduce dependencies requiring paid subscriptions, mandatory credit cards, or paid API keys.
   - AI Fallback Chain: **Hosted Free Tier (Gemini / Groq) → Local Ollama (Qwen 2.5:3B) → Deterministic Python Engine**.
   - If AI is unavailable or offline, the application functions seamlessly using rule-based algorithms.

5. **Design System Adherence: "Quiet Ledger"**
   - Palette: Warm off-white background (`#F7F5F0`), deep green-teal accent (`#0F766E`), neutral slate surfaces, accessible status tones.
   - Strict WCAG AA contrast (minimum 4.5:1 for normal text).
   - Tabular figures (`font-variant-numeric: tabular-nums`) for all numbers and currency.
   - Touch targets must be at least 44x44 px on mobile.
   - Never introduce horizontal page scroll or unstyled loading/error states.

---

## 2. Architecture & Directory Layout

```
PennyPilot/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers versioned under /api/v1
│   │   ├── core/         # Config, security, logging, error handlers
│   │   ├── db/           # SQLAlchemy session, engine, base model
│   │   ├── models/       # Database ORM models (paise, relationships, UUIDs)
│   │   ├── schemas/      # Pydantic v2 validation models
│   │   ├── services/     # Orchestration, AI client abstractions, auth service
│   │   ├── domain/       # Pure Python financial engine (no I/O, no AI, 100% testable)
│   │   └── main.py       # Application factory, middleware, exception handlers
│   ├── tests/            # Pytest test suite (unit, domain, integration, security)
│   ├── alembic/          # Database migrations
│   └── requirements.txt
├── frontend/             # React + TypeScript + Vite + Tailwind CSS + PWA
│   ├── public/           # Manifest, icons, static assets
│   ├── src/
│   │   ├── assets/       # Styles, fonts
│   │   ├── components/   # UI components (buttons, cards, layout, alerts)
│   │   ├── hooks/        # React Query hooks, network status, PWA install prompt
│   │   ├── lib/          # API client, utilities, currency/date formatters
│   │   └── types/        # TypeScript interfaces
│   └── package.json
├── docs/                 # Architecture, security, and deployment documentation
├── scripts/              # Dev automation, database seeding, smoke test scripts
├── .gitignore
├── README.md
└── AGENTS.md
```

---

## 3. Security Rules (from Valarabulities Audit)

1. **No Hardcoded Secrets:** All secrets, keys, and connection strings must come from environment variables.
2. **Safe Error Responses:** Unhandled 500 exceptions must return a generic message without exposing stack traces, SQL syntax, or internal file paths.
3. **Safe Service Worker Caching:** The PWA Service Worker caches **only** the static application shell (HTML, CSS, JS, fonts). It must **never** cache `/api/*` routes, JWT tokens, or financial responses.
4. **Input Validation:** Every incoming request body is validated strictly through Pydantic v2 schemas.
5. **CORS:** Restrict CORS strictly to designated frontend origins; do not use `allow_origins=["*"]` in production.
