# JosEnergy Hub

A full-stack Progressive Web App (PWA) for a Jos, Nigeria energy and transport business.
Installable on Android via the browser's "Add to Home Screen" prompt.

## Screens

1. **Overview Dashboard** – Real-time Jos clock, weekly revenue chart (Solar/E-Keke/POS), live fleet battery bars, overdue alert
2. **PAYGO Solar** – Customer enrollment, status badges, one-click pay/lock/unlock, running totals
3. **E-Keke Fleet** – Per-keke battery bars, operator assignment, check-out & revenue collection
4. **Sisi Pay POS** – CBN mandate notice, agent registration with auto terminal IDs, live commission calculator

## Quick Start

### 1. Backend (FastAPI + SQLite)

```bash
cd /home/user/app/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API runs at: http://localhost:8000
API docs: http://localhost:8000/docs

### 2. Frontend (React + Vite)

```bash
cd /home/user/app/frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

The Vite dev server proxies `/api/*` to `localhost:8000` automatically.

### 3. Production Build

```bash
cd /home/user/app/frontend
npm run build
# Serve dist/ with any static file server
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/dashboard | Weekly totals, chart data, fleet status |
| GET | /api/solar/customers | List customers with running totals |
| POST | /api/solar/customers | Enroll new customer |
| POST | /api/solar/pay | Record weekly payment |
| POST | /api/solar/lock/{id} | Lock customer device |
| POST | /api/solar/unlock/{id} | Unlock customer device |
| GET | /api/fleet | Fleet status + today's revenue |
| POST | /api/fleet/assign | Assign operator to keke |
| POST | /api/fleet/checkout | Check out keke + record revenue |
| PUT | /api/fleet/battery | Update battery level |
| GET | /api/pos/agents | List agents with recent transactions |
| POST | /api/pos/agents | Register new POS agent |
| POST | /api/pos/transactions | Record POS transaction |
| GET | /api/pos/transactions/{agent_id} | Agent transaction history |

## Packages & Pricing

| Package | Deposit | Weekly Payment |
|---------|---------|----------------|
| 50W | ₦15,000 | ₦2,500 |
| 100W | ₦25,000 | ₦4,000 |
| 200W | ₦45,000 | ₦7,000 |

- E-Keke daily hire: **₦3,500/day**
- POS commission rate: **0.75%** per transaction

## PWA Installation (Android)

1. Open the app URL in Chrome on Android
2. Tap the browser menu (⋮) → "Add to Home Screen"
3. Confirm installation
4. The app icon appears on your home screen and opens in standalone mode

## Tech Stack

- **Frontend**: React 18, Vite 5, Recharts
- **PWA**: vite-plugin-pwa, Workbox service worker
- **Backend**: FastAPI, SQLite via aiosqlite
- **Styling**: Inline CSS-in-JS, dark theme with green accents
