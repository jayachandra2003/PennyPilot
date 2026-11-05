# PennyPilot — Deployment Runbook & Zero-Budget Cloud Architecture

This guide details the complete deployment architecture for PennyPilot with a **strict ₹0 budget**.

---

## 1. Architecture Topology

```
                  ┌───────────────────────────────┐
                  │          End User             │
                  │   (Mobile PWA / Desktop Web)  │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ HTTPS                                           │ HTTPS
         ▼                                                 ▼
┌─────────────────────────┐                     ┌─────────────────────────┐
│     Vercel (Hobby)      │                     │   Render (Free Tier)    │
│  React 19 TypeScript    │                     │   FastAPI Python 3.11   │
│  PWA Static Assets      ├────────────────────►│   Uvicorn Modular API   │
│  (Zero-cost, Global CDN)│  API Proxy / CORS   │   (Cold-start mitigated)│
└─────────────────────────┘                     └────────────┬────────────┘
                                                             │
                                                             ▼
                                                ┌─────────────────────────┐
                                                │    Neon (Serverless)    │
                                                │  PostgreSQL Free Tier   │
                                                │  (0.5 GB, SSL enabled)  │
                                                └─────────────────────────┘
```

---

## 2. Zero-Budget Provider Free-Tier Limits

| Component | Provider | Free Plan Details | Credit Card Required? |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | 100 GB bandwidth/month, unlimited builds, free automatic SSL | **No** |
| **Backend** | Render | 750 free instance hours/month (512 MB RAM, shared CPU) | **No** |
| **Database** | Neon.tech | 0.5 GB Postgres storage, serverless autoscaling, branching | **No** |
| **Primary AI** | Google AI Studio | Gemini 2.0 Flash: 15 RPM, 1,500 RPD, 1M TPM free | **No** |
| **Secondary AI** | Local Ollama | Qwen 2.5:3B on local hardware / offline | **No** |

---

## 3. Step-by-Step Deployment Guide

### Step 3.1: Database Setup (Neon PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) (using GitHub authentication, zero cost).
2. Create a new project: `pennypilot-db`. Region: `ap-southeast-1` (Singapore) for lowest latency to India.
3. Copy the Postgres connection string from the dashboard:
   ```
   postgresql://pennypilot_owner:SECRET@ep-sample-12345.ap-southeast-1.aws.neon.tech/pennypilot?sslmode=require
   ```
4. Run migrations from your terminal to initialize tables:
   ```bash
   cd backend
   DATABASE_URL="<YOUR_NEON_URL>" alembic upgrade head
   ```

### Step 3.2: Backend Deployment (Render Free Web Service)
1. Connect your GitHub repository to [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Set the following parameters:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
4. Configure Environment Variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `SECRET_KEY`: Generate a random 64-char string.
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `false`
   - `ALLOWED_ORIGINS`: `https://pennypilot.vercel.app,http://localhost:5173`
   - `GEMINI_API_KEY`: Your free Gemini API key.
   - `DEFAULT_TIMEZONE`: `Asia/Kolkata`
5. Click **Create Web Service**. Your API will be live at `https://pennypilot-backend.onrender.com`.

### Step 3.3: Frontend Deployment (Vercel)
1. Sign in to [vercel.com](https://vercel.com) using GitHub.
2. Import the `PennyPilot` repository.
3. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://pennypilot-backend.onrender.com/api/v1`
5. Click **Deploy**. Vercel will build the React PWA, bundle the Service Worker, and deploy to global edge CDN with free SSL.

---

## 4. Cold-Start Mitigation for Live Recruiter Demos

Render free instances sleep after 15 minutes of inactivity. When asleep, the first request takes **35 to 50 seconds** to wake up the container.

### Mitigation Protocol:
1. **Lead with Localhost for the Live Demo:**
   Always run your primary demo from `http://localhost:5173` connected to `http://localhost:8000` (SQLite). This gives 0ms latency, zero Wi-Fi risk, and instant responses.
2. **Warm the Cloud Instance 10 Minutes Prior:**
   Execute a simple curl keep-alive ping 10 minutes before presenting to ensure Render and Neon are warm:
   ```bash
   curl -s https://pennypilot-backend.onrender.com/health
   ```
3. Share the cloud Vercel link as tangible proof of production CI/CD readiness.
