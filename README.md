# PennyPilot 🧭
### AI-Powered Expense Tracker & Financial Intelligence Platform

> **NIVUNA Labs Application Development Assignment**  
> **Design Theme:** Quiet Ledger  
> **Budget Constraint:** Strict ₹0 (No paid APIs, subscriptions, or paid infrastructure)

---

## 🌟 Overview

**PennyPilot** is an intelligent, privacy-first personal finance platform engineered for urban Indian salaried professionals and students. Conventional expense trackers suffer from friction-heavy logging and generic, backward-looking pie charts. PennyPilot solves this with:

1. **Natural Language Entry with Review-Before-Save:** Capture multi-item expenses in plain Indian English (e.g., *"₹120 milk and ₹450 groceries today, auto 80 yesterday"*).
2. **Deterministic Financial Domain Engine:** 100% accurate, zero-hallucination arithmetic using integer paise, budget pace projections, and Median Absolute Deviation (MAD) anomaly detection.
3. **Grounded Financial Copilot:** An intelligent assistant mapped to fixed, whitelisted backend query tools that generates answers backed by verified evidence panels.
4. **Resilient 3-Tier AI Chain:** Free cloud API (Gemini/Groq) → Local offline Ollama model (`qwen2.5:3b`) → Deterministic rule-based engine. The app remains 100% functional even when completely offline.
5. **Cross-Platform PWA:** Single codebase running responsively across Mobile (Android/iOS), Tablet, and Desktop with offline app shell caching and installability.

---

## 🏗️ Technology Stack

- **Frontend:** React 18/19, TypeScript, Vite, Tailwind CSS, TanStack Query v5, React Hook Form, Zod, Recharts, Lucide React, `vite-plugin-pwa`.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn.
- **Database:** SQLite (local development with WAL mode) / Neon Serverless PostgreSQL (cloud deployment).
- **Testing:** Pytest (Backend domain & integration tests), Vitest (Frontend unit tests).

---

## 📁 Repository Structure

```
PennyPilot/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API route controllers (/api/v1)
│   │   ├── core/             # Settings, security, error handling, logging
│   │   ├── db/               # Database session, base model
│   │   ├── domain/           # Pure Python financial math & anomaly engine
│   │   ├── models/           # SQLAlchemy ORM models (paise, relationships)
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   └── services/         # AI fallback orchestrator, auth service
│   ├── tests/                # Pytest test suite
│   ├── alembic/              # Database migration scripts
│   └── requirements.txt
├── frontend/                 # React + TypeScript + Vite PWA
│   ├── public/               # Manifest, icons, favicon
│   ├── src/                  # App components, hooks, design tokens
│   └── package.json
├── docs/                     # Architecture, security & deployment guides
├── scripts/                  # Development & verification scripts
├── AGENTS.md                 # Agent guidelines & prime directives
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11 (`py -3.11` or `python`)
- Node.js 20+ and npm
- Git

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be running at `http://localhost:5173`.

---

## 🛡️ Security & Zero-Budget Architecture
- Zero paid API requirement.
- No sensitive financial data or tokens cached in browser Service Workers.
- Server-side authorization and user data isolation on every query.
- All monetary values stored as integer paise to eliminate IEEE floating-point errors.
