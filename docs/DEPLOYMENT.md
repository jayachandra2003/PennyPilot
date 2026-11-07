# PennyPilot — Free Demo Deployment Runbook & Presentation Architecture

This runbook documents the **100% Free (₹0 / $0) Demonstration Deployment** for the PennyPilot university project review, featuring automatic demo data replay, cold-start mitigation, and presentation-day failover protocols.

---

## 1. Zero-Cost Architecture Topology

```
                  ┌───────────────────────────────┐
                  │       Reviewer / Faculty      │
                  │   (Mobile PWA / Desktop Web)  │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ HTTPS                                           │ HTTPS
         ▼                                                 ▼
┌─────────────────────────┐                     ┌─────────────────────────┐
│     Vercel (Hobby)      │                     │   Render (Free Tier)    │
│  React 19 TypeScript    │  Direct API / CORS  │   FastAPI Python 3.11   │
│  PWA Static Assets      ├────────────────────►│   Uvicorn (Single Instance) │
│  (100% Free Edge CDN)   │                     │   (Cold-start mitigated)│
└─────────────────────────┘                     └────────────┬────────────┘
                                                             │
                                                             ▼
                                                ┌─────────────────────────┐
                                                │   Ephemeral SQLite DB   │
                                                │  (/tmp/penny_pilot.db)  │
                                                │  Auto-seeded on boot    │
                                                └─────────────────────────┘
```

---

## 2. Zero-Budget Provider Free-Tier Limits

| Component | Provider | Free Plan Details | Credit Card Required? | Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | 100 GB bandwidth/month, unlimited builds, global CDN | **No** | **$0.00** |
| **Backend** | Render | 750 free instance hours/month (512 MB RAM, shared CPU) | **No** | **$0.00** |
| **Database** | Render `/tmp` | Ephemeral SQLite block storage (`/tmp/penny_pilot.db`) | **No** | **$0.00** |
| **Demo Seeder** | Local script | Auto-seeds 4 months of realistic Indian financial data | **No** | **$0.00** |
| **Primary AI** | Google AI Studio | Gemini 2.0 Flash: 15 RPM, 1,500 RPD, 1M TPM free | **No** | **$0.00** |
| **Rule Fallback** | Pure Python | Deterministic calculations, budget pace, MAD anomalies | **No** | **$0.00** |
| **Total Cost** | — | — | **No Card Needed** | **$0.00** |

---

## 3. Ephemeral SQLite & Automatic Demo Data Replay

On Render's Free tier, the web service container spins down after 15 minutes of inactivity, and the ephemeral filesystem resets on restart.

To ensure reviewers and evaluators **always see a fully populated financial dashboard**, the container startup command is:
```bash
alembic upgrade head && python ../scripts/seed_demo_data.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Auto-Seeded Demo Account:
- **Email:** `demo@pennypilot.in`
- **Password:** `DemoPassword123!`
- **Display Name:** Aarav Sharma
- **Data Included:**
  - 10 Indian financial categories (Salary, Housing, Groceries, Dining, Utilities, Transportation, etc.)
  - 4 consecutive months of realistic transactions (August, September, October, November 2026)
  - Configured November 2026 budgets with real-time budget pace
  - Deliberate MAD anomaly: Team Celebration Dinner at Toit (₹6,800.00) for anomaly engine demonstration
  - Pre-verified status (`email_verified=True`, `onboarding_completed=True`, `tutorial_completed=True`)

---

## 4. Step-by-Step Deployment Instructions

### Step 4.1: Render Backend Deployment (Free Web Service)

1. Sign in to [render.com](https://render.com) using your GitHub account.
2. Click **New +** &rarr; **Web Service**.
3. Select your private repository: `jayachandra2003/PennyPilot`.
4. Configure service parameters:
   - **Name:** `pennypilot-backend`
   - **Region:** `Singapore` (lowest latency for India)
   - **Branch:** `deployment/free-demo-render`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `alembic upgrade head && python ../scripts/seed_demo_data.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** **Free**
5. Add Environment Variables:
   - `ENVIRONMENT` = `production`
   - `DEBUG` = `false`
   - `PYTHON_VERSION` = `3.11.5`
   - `SECRET_KEY` = *(click "Generate" in Render)*
   - `ACCESS_TOKEN_EXPIRE_MINUTES` = `1440`
   - `DATABASE_URL` = `sqlite:////tmp/penny_pilot.db`
   - `AVATAR_UPLOAD_DIR` = `/tmp/avatars`
   - `RECEIPT_UPLOAD_DIR` = `/tmp/receipts`
   - `FRONTEND_URL` = `https://pennypilot.vercel.app`
   - `FRONTEND_BASE_URL` = `https://pennypilot.vercel.app`
   - `BACKEND_BASE_URL` = `https://pennypilot-backend.onrender.com`
   - `ALLOWED_ORIGINS` = `https://pennypilot.vercel.app,http://localhost:5173`
   - `COOKIE_SECURE` = `true`
   - `COOKIE_SAMESITE` = `none`
   - `GEMINI_API_KEY` = *(your Google AI Studio key)*
   - `DEFAULT_TIMEZONE` = `Asia/Kolkata`
   - `DEFAULT_CURRENCY` = `INR`
6. Click **Create Web Service**. Wait for build to complete.
7. Verify health check: `https://pennypilot-backend.onrender.com/health` returns `{"status":"ok","service":"PennyPilot","version":"1.0.0"}`.

---

### Step 4.2: Vercel Frontend Deployment (Hobby Free)

1. Sign in to [vercel.com](https://vercel.com) using GitHub.
2. Click **Add New...** &rarr; **Project** &rarr; Import `PennyPilot`.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variables (Production scope):
   - `VITE_API_BASE_URL` = `https://pennypilot-backend.onrender.com/api/v1`
   - `VITE_AUTH_BASE_URL` = `https://pennypilot-backend.onrender.com`
5. Click **Deploy**. Vercel will build and deploy the React PWA globally.

---

## 5. Render Free Tier Limitations & Cold-Start Mitigation

### Limitations:
1. **Container Sleep:** Render Free instances spin down after 15 minutes of zero traffic.
2. **Cold-Start Latency:** The first request takes **35 to 50 seconds** to boot the container, apply Alembic migrations, and seed demo records.
3. **Frontend Tolerance:** The API client timeout is configured to **60 seconds** (`DEFAULT_TIMEOUT_MS = 60000`) in `frontend/src/lib/api.ts` so the UI patiently waits without displaying premature network errors.

### Presentation Day Protocol (November 9):
1. **Pre-Warm the Backend:**
   5 to 10 minutes before your project review begins, open:
   `https://pennypilot-backend.onrender.com/health`
   in your mobile or laptop browser. This triggers the container boot ahead of time so the presentation is instant.
2. **Keep-Alive Tab:**
   Leave the PennyPilot tab open in your browser; user interactions prevent the container from sleeping during the demonstration.

---

## 6. Localhost Failover Protocol (Presentation Insurance)

If college Wi-Fi is degraded, firewalled, or offline during the review, execute this instant 10-second failover:

```bash
# Terminal 1: Start Backend locally
cd D:\projects\PennyPilot\backend
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Start Frontend locally
cd D:\projects\PennyPilot\frontend
npm run dev
```

Open `http://localhost:5173` in your browser. All transactions, local RapidOCR, and deterministic Copilot calculations operate 100% offline.

---

## 7. Recovering the Paid Persistent Disk Configuration

The Starter plan + Persistent Disk blueprint is preserved in [`render.persistent-disk.yaml`](../render.persistent-disk.yaml).

To upgrade to permanent paid persistent disk storage in the future:
```bash
cp render.persistent-disk.yaml render.yaml
git commit -am "chore: upgrade to Render Starter Persistent Disk"
git push origin deployment/production-preparation
```
