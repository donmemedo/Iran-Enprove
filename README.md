# Enprove Iran — Energy Intelligence Platform

A working web app built from the business plan in this folder
(`05_Enprove.pdf`, `05-Business-plan-toolkit_Enprove_Iran_filled.pdf`): smart energy
monitoring, anomaly detection and audit reporting for Iranian factories, commercial
buildings, cold storage and multi-branch retail.

فارسی: نسخه اجرایی طرح کسب‌وکار «ِان‌پرو ایران» — پایش مصرف، کشف نشتی و بار بیهوده،
داشبورد مدیریتی، گزارش صرفه‌جویی و درخواست پایلوت. رابط کاربری دوزبانه (فارسی/انگلیسی)،
راست‌چین، با حالت روشن و تاریک و کاملاً واکنش‌گرا.

## What it does

| Business-plan item | In the app |
|---|---|
| Product 1 — analysis & temporary monitoring | hourly meter data per load (chiller, compressed air, HVAC, lighting, process), 24-hour profile, load mix |
| Product 2 — dashboard & alerts | portfolio dashboard, per-site pages, energy intensity (kWh/m²), cost in Toman, anomaly alerts with triage |
| Product 3 — audit & energy management | saving measures per site with annual saving, capex and payback (M&V table) |
| Pricing & ROI (500M setup + 120M/month per site) | live ROI calculator on the landing page, computed in the browser by `frontend/src/lib/roi.ts` |
| Sales funnel / pilot requests | pilot request form → `POST /api/leads` |

Anomaly detection is real, not scripted: each meter is compared against **its own
median hour-of-week baseline**, scaled by MAD, and only a sustained excess (≥6 hours)
becomes an alert — so a single production peak doesn't page anyone.
See `backend/app/analytics.py` (`python app/analytics.py` runs its self-check).

## Run it

### Docker (both services)

```bash
cp .env.example .env    # then set ADMIN_TOKEN and PROXY_SECRET: openssl rand -hex 32
docker compose up --build
# web → http://localhost:3200   (the API is internal only; it is not published on the host)
# PyPI blocked? docker compose build --build-arg PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
```

### Local

```bash
# backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
ADMIN_TOKEN=$(openssl rand -hex 32) .venv/bin/uvicorn app.main:app --port 8100   # seeds demo data on first start

# frontend
cd frontend && npm install
API_URL=http://localhost:8100 npm run dev           # http://localhost:3200
```

The browser only ever talks to the frontend origin: `/api/*` is proxied to FastAPI by
`src/app/api/[...path]/route.ts`, which reads `API_URL` at runtime — so there is no CORS
setup, no public API host to leak, and the same image runs anywhere.

## Security

The full audit, pen-test results and performance numbers are in `AUDIT_REPORT.md`.

| Variable | Where | Meaning |
|---|---|---|
| `ADMIN_TOKEN` | API, required | Staff token, 32+ characters. Unlocks the lead list, alert triage and `/login`. Shorter or unset disables staff endpoints (503). |
| `PROXY_SECRET` | API and frontend, required in Docker | Shared secret the proxy sends as `X-Proxy-Key`. The API refuses every other caller except `/api/health`. |
| `TRUST_PROXY` | frontend | `1` only behind a reverse proxy that sets `X-Real-IP` or appends `X-Forwarded-For`. Enables per-visitor rate limits. |
| `DEBUG` | API | `1` turns on Swagger at `/api/docs`. Never in production. |

- **Staff login.** Staff sign in at `/fa/login` with the token. It is kept in an httpOnly,
  `SameSite=Strict` cookie scoped to `/api`, and the browser never sees it again.
- **Limits.** Reads are limited to 120 per minute per visitor.
  Leads are limited to 10 per 10 minutes per visitor and 300 per hour overall. Failed logins
  are limited to 10 per 10 minutes. Request bodies are capped at 16 KB.
- **Workers.** Rate limits and the 60-second response cache live in the API process. Keep
  `WEB_CONCURRENCY=1` until they move to Redis.
- **Checks.** `backend/.venv/bin/python backend/tests/smoke_security.py` runs 31 security
  checks on a throwaway copy of the database.

If `docker compose` cannot reach the daemon, you are on the Docker Desktop context while
the system daemon is the live one: `docker context use default`.

## Layout

```
backend/          FastAPI + SQLModel + SQLite
  app/models.py     Site, Meter, Reading, Alert, Measure, Lead
  app/analytics.py  weekly baseline, MAD anomaly detection, ROI math (+ self-check)
  app/seed.py       6 demo sites, 24 meters, ~52k hourly readings, injected faults
  app/main.py       /api/overview, /api/sites, /api/alerts, /api/measures, /api/leads
frontend/         Next.js 15 (App Router) + Tailwind v4 + Recharts
  src/app/[locale]/ landing, dashboard, sites, site detail, alerts, reports, pilot
  src/app/api/       runtime proxy to FastAPI
  src/lib/i18n.ts   fa/en dictionary (Persian UX-writing vocabulary: پیش‌خوان، هشدارها، …)
  src/lib/format.ts Persian digits, Jalali dates, Toman scaling (میلیون/میلیارد)
```

## Design notes

- Light/dark with no flash: the theme is applied by an inline script before paint and
  stored per browser; it falls back to the OS setting.
- RTL/LTR is driven by `<html dir>`; charts stay LTR inside an isolated container,
  which is how time series are read in both languages.
- Vazirmatn is self-hosted (`public/fonts`), so the app works on a network where
  Google Fonts or a CDN is unreachable.
- Numbers use Persian digits and Jalali dates in `fa`, Latin digits and Gregorian in `en`.

## Next steps (not built yet)

- **PWA**: the manifest and icons are in place (`public/manifest.webmanifest`). Adding a
  service worker (offline shell + cached last dashboard payload) turns it installable.
- **APK / IPA**: wrap the same build with Capacitor (`@capacitor/android`, `@capacitor/ios`)
  pointed at the deployed URL, or ship a TWA for Android.
- **Production data**: swap SQLite for Postgres + TimescaleDB (the API is SQLite-only today:
  `strftime` in the daily and hourly queries and SQLite pragmas on connect), add auth (the plan's
  buyer roles: CEO/CFO, energy manager, facility manager) and per-tenant isolation.

Demo data is synthetic; the financial assumptions come from the business plan and
should be re-checked against real equipment prices, tariffs and contracts.
