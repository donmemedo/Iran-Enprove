"""Enprove Iran API.

Security model: the browser only talks to the Next.js proxy, which forwards to this
service on an internal network and signs each request with X-Proxy-Key. Public read
endpoints (health, overview, sites, alerts, measures, leads POST) stay open; anything that
returns PII or changes state (GET /api/leads, PATCH /api/alerts, /api/me) needs the
staff bearer token from ADMIN_TOKEN. Every endpoint is rate limited per client IP,
bodies are capped, and public reads carry ETag/Cache-Control so repeat views are free.
"""

import hashlib
import hmac
import ipaddress
import json
import logging
import os
import time
import unicodedata
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import event, func
from sqlmodel import Session, SQLModel, create_engine, select

from .analytics import CO2_KG_PER_KWH
from .models import Alert, Lead, Measure, Meter, Reading, Site
from .seed import ensure

log = logging.getLogger("enprove")
logging.basicConfig(level=logging.INFO, format="%(message)s")

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./data/enprove.db")
DEBUG = os.getenv("DEBUG", "0") == "1"
_TOKEN = os.getenv("ADMIN_TOKEN", "")
ADMIN_TOKEN = _TOKEN if len(_TOKEN) >= 32 else ""  # short tokens are guessable; openssl rand -hex 32
PROXY_SECRET = os.getenv("PROXY_SECRET", "")
MAX_BODY = 16 * 1024  # every write here fits in a few KB
PUBLIC_MAX_AGE = 60  # meter data is hourly, so a minute of staleness is free speed

os.makedirs("./data", exist_ok=True)
# SQLite only: the daily and hourly queries use strftime
engine = create_engine(DB_URL, connect_args={"check_same_thread": False, "timeout": 5})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(conn, _record):
    # WAL lets readers run while a lead is being written; busy_timeout replaces "database is locked".
    cur = conn.cursor()
    for pragma in ("journal_mode=WAL", "synchronous=NORMAL", "busy_timeout=5000", "foreign_keys=ON", "temp_store=MEMORY"):
        cur.execute(f"PRAGMA {pragma}")
    cur.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    SQLModel.metadata.create_all(engine)
    with engine.begin() as c:  # databases created before the composite index existed
        c.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_reading_meter_ts ON reading (meter_id, ts)")
    with Session(engine) as s:
        ensure(s)
    if not ADMIN_TOKEN:
        why = "shorter than 32 characters" if _TOKEN else "unset"
        log.warning(json.dumps({"event": "admin_disabled", "detail": f"ADMIN_TOKEN {why}; staff endpoints return 503"}))
    yield


app = FastAPI(
    title="Enprove Iran API",
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if DEBUG else None,
    openapi_url="/api/openapi.json" if DEBUG else None,
    redoc_url=None,
)

# --- request hygiene ---------------------------------------------------------------


@app.exception_handler(RequestValidationError)
async def _validation_error(_request: Request, exc: RequestValidationError):
    """FastAPI's default 422 echoes the raw input; NaN/Infinity there is not valid JSON and became a 500."""
    return JSONResponse(
        {"detail": [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]}, 422
    )


class BodyLimit:
    """Reject bodies above MAX_BODY before they are buffered. Chunked uploads past the cap are cut,
    so the JSON parse fails with 422 instead of holding megabytes in memory."""

    def __init__(self, app, limit: int):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        for k, v in scope["headers"]:
            if k == b"content-length" and v.isdigit() and int(v) > self.limit:
                return await JSONResponse({"detail": "request body too large"}, 413)(scope, receive, send)
        seen = 0

        async def capped():
            nonlocal seen
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > self.limit:
                    return {"type": "http.request", "body": b"", "more_body": False}
            return msg

        await self.app(scope, capped, send)


app.add_middleware(BodyLimit, limit=MAX_BODY)


class Limiter:
    """Sliding-window limiter: O(1) amortised per hit, memory bounded by pruning idle keys."""

    def __init__(self):
        self.hits: dict[str, deque] = defaultdict(deque)
        self.pruned = time.monotonic()

    def hit(self, key: str, limit: int, window: int) -> int:
        """0 when allowed, otherwise the seconds until the window frees up."""
        q, now = self.hits[key], time.monotonic()
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            return max(1, int(q[0] + window - now) + 1)
        q.append(now)
        if now - self.pruned > 60:
            self.pruned = now
            for k in [k for k, v in self.hits.items() if not v or v[-1] < now - 3600]:
                del self.hits[k]
        return 0


limiter = Limiter()  # ponytail: per-process; move to Redis when WEB_CONCURRENCY > 1


def client_ip(request: Request) -> str:
    """Trust X-Forwarded-For only when the peer is the proxy on a private/loopback network."""
    host = request.client.host if request.client else "0.0.0.0"
    try:
        addr = ipaddress.ip_address(host)
        local = addr.is_private or addr.is_loopback
    except ValueError:
        local = False
    # rightmost entry: the one the trusted proxy appended; entries to its left are client-supplied
    xff = request.headers.get("x-forwarded-for", "")
    return xff.split(",")[-1].strip()[:64] if local and xff.strip() else host


def rate_key(request: Request) -> tuple[str, int]:
    """(key, multiplier). With TRUST_PROXY the proxy forwards the visitor's IP and each visitor gets
    their own bucket. Without it, and for the Next server's own page renders, every request shares
    the proxy's bucket, so that bucket is 10x wider and the global caps do the real work."""
    host = request.client.host if request.client else "0.0.0.0"
    ip = client_ip(request)
    return ip, (10 if ip == host else 1)


def throttle(bucket: str, limit: int, window: int):
    def dep(request: Request):
        ip, factor = rate_key(request)
        wait = limiter.hit(f"{bucket}:{ip}", limit * factor, window)
        if wait:
            raise HTTPException(429, "too many requests", headers={"Retry-After": str(wait)})

    return dep


def _digest(s: str) -> bytes:
    return hashlib.sha256(s.encode()).digest()


def require_admin(request: Request):
    if not ADMIN_TOKEN:
        raise HTTPException(503, "staff endpoints disabled: ADMIN_TOKEN is not set")
    auth = request.headers.get("authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if hmac.compare_digest(_digest(token), _digest(ADMIN_TOKEN)):  # hashed first: constant time for any length
        return  # a valid token always works, so junk logins can never lock staff out
    ip, factor = rate_key(request)
    log.warning(json.dumps({"event": "auth_failed", "ip": ip, "path": request.scope["path"]}))
    if limiter.hit(f"authfail:{ip}", 10 * factor, 600):  # slows guessing; a 32+ char token is out of reach anyway
        raise HTTPException(429, "too many failed logins", headers={"Retry-After": "600"})
    raise HTTPException(401, "unauthorized", headers={"WWW-Authenticate": "Bearer"})


@app.middleware("http")
async def gate_log_headers(request: Request, call_next):
    t0 = time.perf_counter()
    # scope["path"] is what the router matched; request.url is rebuilt from the Host header
    if PROXY_SECRET and request.scope["path"] != "/api/health" and not hmac.compare_digest(
        _digest(request.headers.get("x-proxy-key", "")), _digest(PROXY_SECRET)
    ):
        response = JSONResponse({"detail": "forbidden"}, 403)
    else:
        response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers.setdefault("Cache-Control", "no-store")
    log.info(json.dumps({
        "ip": client_ip(request), "method": request.method, "path": request.scope["path"],
        "status": response.status_code, "ms": round((time.perf_counter() - t0) * 1000, 1),
    }))
    return response


# ponytail: per-process, no eviction: keys come only from validated params (~700 max, a few MB).
# Move to Redis when WEB_CONCURRENCY > 1.
_cache: dict[str, tuple[float, bytes, str]] = {}


def public_json(request: Request, key: str, compute, max_age: int = PUBLIC_MAX_AGE) -> Response:
    """JSON with ETag + Cache-Control; answers 304 to a matching If-None-Match.
    The encoded body is cached under `key` for max_age seconds, so a 304 or a repeat view runs no queries.
    Keys are built from validated parameters only (days 7..90, known slugs, status enum), so junk query
    strings cannot grow the cache or flush it."""
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and hit[0] > now:
        _, body, etag = hit
    else:
        body = json.dumps(compute(), separators=(",", ":"), ensure_ascii=False, default=str).encode()
        etag = '"' + hashlib.blake2b(body, digest_size=12).hexdigest() + '"'
        _cache[key] = (now + max_age, body, etag)
    headers = {"Cache-Control": f"public, max-age={max_age}, stale-while-revalidate={max_age * 5}", "ETag": etag}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(body, media_type="application/json", headers=headers)


def session():
    with Session(engine) as s:
        yield s


# --- queries -------------------------------------------------------------------------


def window(days: int):
    end = datetime.now(timezone.utc)
    return end - timedelta(days=days), end


def _change(cur: float, prev: float) -> float:
    return round(100 * (cur - prev) / prev, 1) if prev else 0.0


def _per_site(s: Session, since, until, site_id: int | None = None) -> dict[int, tuple[float, float]]:
    """{site_id: (kwh, cost)} in ONE grouped scan instead of two aggregates per site."""
    q = (
        select(Meter.site_id, func.sum(Reading.kwh), func.sum(Reading.kwh * Site.tariff_toman_kwh))
        .select_from(Reading)
        .join(Meter, Meter.id == Reading.meter_id)
        .join(Site, Site.id == Meter.site_id)
        .where(Reading.ts >= since, Reading.ts < until)
        .group_by(Meter.site_id)
    )
    if site_id:
        q = q.where(Meter.site_id == site_id)
    return {sid: (float(k or 0), float(c or 0)) for sid, k, c in s.exec(q).all()}


def _daily(s: Session, since, until, site_id: int | None = None):
    q = (
        select(func.strftime("%Y-%m-%d", Reading.ts).label("d"), func.sum(Reading.kwh),
               func.sum(Reading.kwh * Site.tariff_toman_kwh))
        .select_from(Reading)
        .join(Meter, Meter.id == Reading.meter_id)
        .join(Site, Site.id == Meter.site_id)
        .where(Reading.ts >= since, Reading.ts < until)
        .group_by("d").order_by("d")
    )
    if site_id:
        q = q.where(Site.id == site_id)
    return [{"date": d, "kwh": round(k, 1), "cost": round(c)} for d, k, c in s.exec(q).all()]


def _mix(s: Session, since, until, site_id: int | None = None):
    q = (
        select(Meter.load_type, func.sum(Reading.kwh))
        .select_from(Reading)
        .join(Meter, Meter.id == Reading.meter_id)
        .where(Reading.ts >= since, Reading.ts < until)
        .group_by(Meter.load_type)
    )
    if site_id:
        q = q.where(Meter.site_id == site_id)
    rows = s.exec(q).all()
    total = sum(k for _, k in rows) or 1
    return sorted(
        [{"load_type": t, "kwh": round(k, 1), "pct": round(100 * k / total, 1)} for t, k in rows],
        key=lambda r: -r["kwh"],
    )


def _verified_savings(s: Session, site_id: int | None = None):
    q = (
        select(func.sum(Measure.saving_kwh_year), Site.tariff_toman_kwh)
        .select_from(Measure)
        .join(Site, Site.id == Measure.site_id)
        .where(Measure.status == "done")
        .group_by(Measure.site_id, Site.tariff_toman_kwh)
    )
    if site_id:
        q = q.where(Measure.site_id == site_id)
    kwh = toman = 0.0
    for k, tariff in s.exec(q).all():
        kwh += float(k or 0)
        toman += float(k or 0) * tariff
    return kwh, toman


def site_dict(site: Site) -> dict:
    d = site.model_dump(exclude={"lat", "lon"})  # plant coordinates are not for the public demo
    d["onboarded_at"] = site.onboarded_at.isoformat()
    return d


def _site_rows(s: Session, days: int):
    since, until = window(days)
    prev_since = since - timedelta(days=days)
    cur, prev = _per_site(s, since, until), _per_site(s, prev_since, since)
    open_by_site = dict(
        s.exec(select(Alert.site_id, func.count(Alert.id)).where(Alert.status == "open").group_by(Alert.site_id)).all()
    )
    rows = []
    for site in s.exec(select(Site)).all():
        k, c = cur.get(site.id, (0.0, 0.0))
        pk, _ = prev.get(site.id, (0.0, 0.0))
        rows.append({
            **site_dict(site),
            "kwh": round(k, 1),
            "cost": round(c),
            "change_pct": _change(k, pk),
            "intensity": round(k / site.area_m2, 2) if site.area_m2 else 0.0,
            "open_alerts": open_by_site.get(site.id, 0),
        })
    rows.sort(key=lambda x: -x["cost"])
    return rows, cur, prev, since, until


def _alert_out(a: Alert, site: Site, meter: Meter | None) -> dict:
    return {
        **a.model_dump(),
        "detected_at": a.detected_at.isoformat(),
        "site_slug": site.slug,
        "site_name_fa": site.name_fa,
        "site_name_en": site.name_en,
        "meter_fa": meter.name_fa if meter else "",
        "meter_en": meter.name_en if meter else "",
        "load_type": meter.load_type if meter else "",
    }


def _measure_out(m: Measure, tariff: int) -> dict:
    saving = m.saving_kwh_year * tariff
    return {
        **m.model_dump(),
        "saving_toman_year": round(saving),
        "payback_months": round(m.capex_toman / (saving / 12), 1) if saving > 0 else None,
    }


# --- public reads --------------------------------------------------------------------

READ = Depends(throttle("read", 120, 60))


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "enprove-api"}


def _overview(s: Session, days: int) -> dict:
    rows, cur, prev, since, until = _site_rows(s, days)
    kwh, cost = (sum(v[0] for v in cur.values()), sum(v[1] for v in cur.values()))
    p_kwh = sum(v[0] for v in prev.values())
    sav_kwh, sav_toman = _verified_savings(s)
    open_alerts, alert_cost = s.exec(
        select(func.count(Alert.id), func.sum(Alert.est_cost_toman)).where(Alert.status == "open")
    ).one()
    return {
        "days": days,
        "kpi": {
            "kwh": round(kwh, 1),
            "cost": round(cost),
            "change_pct": _change(kwh, p_kwh),
            "co2_ton": round(kwh * CO2_KG_PER_KWH / 1000, 1),
            "verified_saving_kwh": round(sav_kwh),
            "verified_saving_toman": round(sav_toman),
            "open_alerts": open_alerts,
            "alert_cost_toman": round(alert_cost or 0),
            "sites": len(rows),
            "meters": s.exec(select(func.count(Meter.id))).one(),
        },
        "trend": _daily(s, since, until),
        "mix": _mix(s, since, until),
        "sites": rows,
    }


@app.get("/api/overview", dependencies=[READ])
def overview(request: Request, days: int = Query(30, ge=7, le=90), s: Session = Depends(session)):
    return public_json(request, f"overview:{days}", lambda: _overview(s, days))


@app.get("/api/sites", dependencies=[READ])
def sites(request: Request, days: int = Query(30, ge=7, le=90), s: Session = Depends(session)):
    return public_json(request, f"sites:{days}", lambda: _site_rows(s, days)[0])


@app.get("/api/sites/{slug}", dependencies=[READ])
def site_detail(request: Request, slug: str, days: int = Query(30, ge=7, le=90), s: Session = Depends(session)):
    site = s.exec(select(Site).where(Site.slug == slug)).first()
    if not site:
        raise HTTPException(404, "site not found")
    return public_json(request, f"site:{site.id}:{days}", lambda: _site_detail(s, site, days))


def _site_detail(s: Session, site: Site, days: int) -> dict:
    since, until = window(days)
    prev_since = since - timedelta(days=days)
    kwh, cost = _per_site(s, since, until, site.id).get(site.id, (0.0, 0.0))
    p_kwh, _ = _per_site(s, prev_since, since, site.id).get(site.id, (0.0, 0.0))
    sav_kwh, sav_toman = _verified_savings(s, site.id)

    hour = func.strftime("%H", Reading.ts)
    hourly = s.exec(
        select(hour, func.avg(Reading.kwh) * func.count(func.distinct(Meter.id)))
        .select_from(Reading)
        .join(Meter, Meter.id == Reading.meter_id)
        .where(Meter.site_id == site.id, Reading.ts >= since, Reading.ts < until)
        .group_by(hour).order_by(hour)
    ).all()

    meters_db = s.exec(select(Meter).where(Meter.site_id == site.id)).all()
    kwh_by_meter = dict(s.exec(
        select(Reading.meter_id, func.sum(Reading.kwh))
        .where(Reading.meter_id.in_([m.id for m in meters_db]), Reading.ts >= since, Reading.ts < until)
        .group_by(Reading.meter_id)
    ).all())
    meters = [
        {**m.model_dump(), "kwh": round(float(kwh_by_meter.get(m.id) or 0), 1),
         "cost": round(float(kwh_by_meter.get(m.id) or 0) * site.tariff_toman_kwh)}
        for m in meters_db
    ]
    by_id = {m.id: m for m in meters_db}
    alerts = s.exec(select(Alert).where(Alert.site_id == site.id).order_by(Alert.detected_at.desc())).all()
    measures = s.exec(select(Measure).where(Measure.site_id == site.id)).all()
    return {
        "site": site_dict(site),
        "days": days,
        "kpi": {
            "kwh": round(kwh, 1),
            "cost": round(cost),
            "change_pct": _change(kwh, p_kwh),
            "co2_ton": round(kwh * CO2_KG_PER_KWH / 1000, 1),
            "intensity": round(kwh / site.area_m2, 2) if site.area_m2 else 0.0,
            "verified_saving_kwh": round(sav_kwh),
            "verified_saving_toman": round(sav_toman),
            "open_alerts": sum(1 for a in alerts if a.status == "open"),
        },
        "trend": _daily(s, since, until, site.id),
        "mix": _mix(s, since, until, site.id),
        "hourly": [{"hour": int(h), "kw": round(float(v), 1)} for h, v in hourly],
        "meters": sorted(meters, key=lambda m: -m["kwh"]),
        "alerts": [_alert_out(a, site, by_id.get(a.meter_id)) for a in alerts],
        "measures": [_measure_out(m, site.tariff_toman_kwh) for m in measures],
    }


AlertStatus = Literal["open", "ack", "resolved"]


@app.get("/api/alerts", dependencies=[READ])
def alerts(request: Request, status: AlertStatus | None = Query(None), s: Session = Depends(session)):
    q = select(Alert, Site, Meter).join(Site, Site.id == Alert.site_id).join(Meter, Meter.id == Alert.meter_id)
    if status:
        q = q.where(Alert.status == status)
    return public_json(
        request, f"alerts:{status}", lambda: [_alert_out(a, site, m) for a, site, m in s.exec(q.order_by(Alert.detected_at.desc())).all()], max_age=15
    )


@app.get("/api/measures", dependencies=[READ])
def measures(request: Request, s: Session = Depends(session)):
    """Every site's saving measures in one call: the reports page used to fetch 1 + N site details."""

    def compute():
        sites = s.exec(select(Site).order_by(Site.id)).all()
        by_site: dict[int, list] = defaultdict(list)
        tariff = {site.id: site.tariff_toman_kwh for site in sites}
        for m in s.exec(select(Measure).order_by(Measure.site_id, Measure.id)).all():
            by_site[m.site_id].append(_measure_out(m, tariff[m.site_id]))
        return [{"site": site_dict(site), "measures": by_site.get(site.id, [])} for site in sites]

    return public_json(request, "measures", compute, max_age=300)


# --- lead capture --------------------------------------------------------------------


_BIDI = {0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067, 0x2068, 0x2069}
_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def clean_text(v):
    """Drop control and bidi-override characters that could disguise text for staff; keep ZWNJ (U+200C)."""
    if not isinstance(v, str):
        return v
    return "".join(ch for ch in v if ch in "\n\t" or (unicodedata.category(ch) != "Cc" and ord(ch) not in _BIDI))


class LeadIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    company: str = Field(min_length=2, max_length=120)
    contact: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20, pattern=r"^\+?[0-9][0-9 \-]{6,18}[0-9]$")
    email: str = Field("", max_length=254, pattern=r"^$|^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
    city: str = Field("", max_length=80)
    sites: int = Field(1, ge=1, le=500)
    annual_bill_toman: float = Field(0, ge=0, le=1e15, allow_inf_nan=False)
    note: str = Field("", max_length=1000)
    locale: Literal["fa", "en"] = "fa"
    website: str = Field("", max_length=200)  # honeypot: the form hides it, bots fill it

    @field_validator("company", "contact", "city", "note", "email", mode="before")
    @classmethod
    def _clean(cls, v):
        return clean_text(v)

    @field_validator("phone", mode="before")
    @classmethod
    def _phone(cls, v):
        return clean_text(v).translate(_DIGITS) if isinstance(v, str) else v


@app.post("/api/leads", status_code=201, dependencies=[Depends(throttle("leads", 10, 600))])
def create_lead(request: Request, body: LeadIn, s: Session = Depends(session)):
    if limiter.hit("leads:global", 300, 3600):  # bounds storage growth even from many addresses
        raise HTTPException(429, "too many requests", headers={"Retry-After": "600"})
    if body.website:  # a human never sees this field
        log.info(json.dumps({"event": "lead_honeypot", "ip": client_ip(request)}))
        return {"id": 0, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    lead = Lead(**body.model_dump(exclude={"website"}))
    s.add(lead)
    s.commit()
    s.refresh(lead)
    return {"id": lead.id, "status": lead.status, "created_at": lead.created_at.isoformat()}


# --- staff only ----------------------------------------------------------------------

STAFF = [Depends(require_admin), Depends(throttle("staff", 60, 60))]


@app.get("/api/me", dependencies=STAFF)
def me():
    return {"role": "staff"}


@app.get("/api/leads", dependencies=STAFF)
def list_leads(s: Session = Depends(session)):
    return [
        {**lead.model_dump(), "created_at": lead.created_at.isoformat()}
        for lead in s.exec(select(Lead).order_by(Lead.created_at.desc())).all()
    ]


class StatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: AlertStatus


@app.patch("/api/alerts/{alert_id}", dependencies=STAFF)
def set_alert_status(request: Request, alert_id: int, body: StatusIn, s: Session = Depends(session)):
    a = s.get(Alert, alert_id)
    if not a:
        raise HTTPException(404, "alert not found")
    log.info(json.dumps({"event": "alert_status", "id": a.id, "from": a.status, "to": body.status, "ip": client_ip(request)}))
    a.status = body.status
    s.add(a)
    s.commit()
    _cache.clear()  # alerts appear in overview, sites and site detail too
    return {"id": a.id, "status": a.status}
