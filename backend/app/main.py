import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, SQLModel, create_engine, select

from .analytics import CO2_KG_PER_KWH, roi
from .models import Alert, Lead, Measure, Meter, Reading, Site
from .seed import ensure

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./data/enprove.db")
os.makedirs("./data", exist_ok=True)
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

app = FastAPI(title="Enprove Iran API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def session():
    with Session(engine) as s:
        yield s


@app.on_event("startup")
def startup() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        ensure(s)


def window(days: int):
    end = datetime.now(timezone.utc)
    return end - timedelta(days=days), end


def _totals(s: Session, since, until, site_id: int | None = None):
    q = (
        select(func.sum(Reading.kwh), func.sum(Reading.kwh * Site.tariff_toman_kwh))
        .join(Meter, Meter.id == Reading.meter_id)
        .join(Site, Site.id == Meter.site_id)
        .where(Reading.ts >= since, Reading.ts < until)
    )
    if site_id:
        q = q.where(Site.id == site_id)
    kwh, cost = s.exec(q).one()
    return float(kwh or 0), float(cost or 0)


def _daily(s: Session, since, until, site_id: int | None = None):
    q = (
        select(func.strftime("%Y-%m-%d", Reading.ts).label("d"), func.sum(Reading.kwh),
               func.sum(Reading.kwh * Site.tariff_toman_kwh))
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
        .join(Reading, Reading.meter_id == Meter.id)
        .join(Site, Site.id == Meter.site_id)
        .where(Reading.ts >= since, Reading.ts < until)
        .group_by(Meter.load_type)
    )
    if site_id:
        q = q.where(Site.id == site_id)
    rows = s.exec(q).all()
    total = sum(k for _, k in rows) or 1
    return sorted(
        [{"load_type": t, "kwh": round(k, 1), "pct": round(100 * k / total, 1)} for t, k in rows],
        key=lambda r: -r["kwh"],
    )


def _verified_savings(s: Session, site_id: int | None = None):
    q = select(func.sum(Measure.saving_kwh_year), Site.tariff_toman_kwh).join(Site, Site.id == Measure.site_id).where(
        Measure.status == "done"
    ).group_by(Site.tariff_toman_kwh)
    if site_id:
        q = q.where(Site.id == site_id)
    kwh = toman = 0.0
    for k, tariff in s.exec(q).all():
        kwh += float(k or 0)
        toman += float(k or 0) * tariff
    return kwh, toman


def site_dict(site: Site) -> dict:
    d = site.model_dump()
    d["onboarded_at"] = site.onboarded_at.isoformat()
    return d


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "enprove-api"}


@app.get("/api/overview")
def overview(days: int = Query(30, ge=7, le=90), s: Session = Depends(session)):
    since, until = window(days)
    prev_since = since - timedelta(days=days)
    kwh, cost = _totals(s, since, until)
    p_kwh, p_cost = _totals(s, prev_since, since)
    sav_kwh, sav_toman = _verified_savings(s)

    sites = s.exec(select(Site)).all()
    per_site = []
    for site in sites:
        k, c = _totals(s, since, until, site.id)
        pk, _ = _totals(s, prev_since, since, site.id)
        open_alerts = s.exec(
            select(func.count(Alert.id)).where(Alert.site_id == site.id, Alert.status == "open")
        ).one()
        per_site.append(
            {
                **site_dict(site),
                "kwh": round(k, 1),
                "cost": round(c),
                "change_pct": round(100 * (k - pk) / pk, 1) if pk else 0.0,
                "intensity": round(k / site.area_m2, 2),
                "open_alerts": open_alerts,
            }
        )

    open_alerts = s.exec(select(func.count(Alert.id)).where(Alert.status == "open")).one()
    alert_cost = s.exec(select(func.sum(Alert.est_cost_toman)).where(Alert.status == "open")).one() or 0
    return {
        "days": days,
        "kpi": {
            "kwh": round(kwh, 1),
            "cost": round(cost),
            "change_pct": round(100 * (kwh - p_kwh) / p_kwh, 1) if p_kwh else 0.0,
            "co2_ton": round(kwh * CO2_KG_PER_KWH / 1000, 1),
            "verified_saving_kwh": round(sav_kwh),
            "verified_saving_toman": round(sav_toman),
            "open_alerts": open_alerts,
            "alert_cost_toman": round(alert_cost),
            "sites": len(sites),
            "meters": s.exec(select(func.count(Meter.id))).one(),
        },
        "trend": _daily(s, since, until),
        "mix": _mix(s, since, until),
        "sites": sorted(per_site, key=lambda x: -x["cost"]),
    }


@app.get("/api/sites")
def sites(days: int = Query(30, ge=7, le=90), s: Session = Depends(session)):
    return overview(days, s)["sites"]


@app.get("/api/sites/{slug}")
def site_detail(slug: str, days: int = Query(30, ge=7, le=90), s: Session = Depends(session)):
    site = s.exec(select(Site).where(Site.slug == slug)).first()
    if not site:
        raise HTTPException(404, "site not found")
    since, until = window(days)
    prev_since = since - timedelta(days=days)
    kwh, cost = _totals(s, since, until, site.id)
    p_kwh, _ = _totals(s, prev_since, since, site.id)
    sav_kwh, sav_toman = _verified_savings(s, site.id)

    hourly = s.exec(
        select(func.strftime("%H", Reading.ts), func.avg(Reading.kwh) * func.count(func.distinct(Meter.id)))
        .join(Meter, Meter.id == Reading.meter_id)
        .where(Meter.site_id == site.id, Reading.ts >= since, Reading.ts < until)
        .group_by(func.strftime("%H", Reading.ts))
        .order_by(func.strftime("%H", Reading.ts))
    ).all()

    meters = []
    for m in s.exec(select(Meter).where(Meter.site_id == site.id)).all():
        mk = s.exec(
            select(func.sum(Reading.kwh)).where(Reading.meter_id == m.id, Reading.ts >= since, Reading.ts < until)
        ).one() or 0
        meters.append({**m.model_dump(), "kwh": round(float(mk), 1), "cost": round(float(mk) * site.tariff_toman_kwh)})

    by_meter = {m["id"]: m for m in meters}
    alerts = s.exec(select(Alert).where(Alert.site_id == site.id).order_by(Alert.detected_at.desc())).all()
    measures = s.exec(select(Measure).where(Measure.site_id == site.id)).all()
    return {
        "site": site_dict(site),
        "days": days,
        "kpi": {
            "kwh": round(kwh, 1),
            "cost": round(cost),
            "change_pct": round(100 * (kwh - p_kwh) / p_kwh, 1) if p_kwh else 0.0,
            "co2_ton": round(kwh * CO2_KG_PER_KWH / 1000, 1),
            "intensity": round(kwh / site.area_m2, 2),
            "verified_saving_kwh": round(sav_kwh),
            "verified_saving_toman": round(sav_toman),
            "open_alerts": sum(1 for a in alerts if a.status == "open"),
        },
        "trend": _daily(s, since, until, site.id),
        "mix": _mix(s, since, until, site.id),
        "hourly": [{"hour": int(h), "kw": round(float(v), 1)} for h, v in hourly],
        "meters": sorted(meters, key=lambda m: -m["kwh"]),
        "alerts": [
            {
                **a.model_dump(),
                "detected_at": a.detected_at.isoformat(),
                "site_slug": site.slug,
                "site_name_fa": site.name_fa,
                "site_name_en": site.name_en,
                "meter_fa": by_meter.get(a.meter_id, {}).get("name_fa", ""),
                "meter_en": by_meter.get(a.meter_id, {}).get("name_en", ""),
                "load_type": by_meter.get(a.meter_id, {}).get("load_type", ""),
            }
            for a in alerts
        ],
        "measures": [
            {**m.model_dump(), "saving_toman_year": round(m.saving_kwh_year * site.tariff_toman_kwh),
             "payback_months": round(m.capex_toman / (m.saving_kwh_year * site.tariff_toman_kwh / 12), 1)}
            for m in measures
        ],
    }


@app.get("/api/alerts")
def alerts(status: str | None = None, s: Session = Depends(session)):
    q = select(Alert, Site, Meter).join(Site, Site.id == Alert.site_id).join(Meter, Meter.id == Alert.meter_id)
    if status:
        q = q.where(Alert.status == status)
    out = []
    for a, site, m in s.exec(q.order_by(Alert.detected_at.desc())).all():
        out.append(
            {
                **a.model_dump(),
                "detected_at": a.detected_at.isoformat(),
                "site_slug": site.slug,
                "site_name_fa": site.name_fa,
                "site_name_en": site.name_en,
                "meter_fa": m.name_fa,
                "meter_en": m.name_en,
                "load_type": m.load_type,
            }
        )
    return out


class StatusIn(BaseModel):
    status: str


@app.patch("/api/alerts/{alert_id}")
def set_alert_status(alert_id: int, body: StatusIn, s: Session = Depends(session)):
    a = s.get(Alert, alert_id)
    if not a:
        raise HTTPException(404, "alert not found")
    if body.status not in ("open", "ack", "resolved"):
        raise HTTPException(422, "bad status")
    a.status = body.status
    s.add(a)
    s.commit()
    return {"id": a.id, "status": a.status}


class RoiIn(BaseModel):
    annual_bill_toman: float
    saving_pct: float = 7.0
    sites: int = 1


@app.post("/api/roi")
def roi_endpoint(body: RoiIn):
    if body.annual_bill_toman <= 0 or body.sites < 1:
        raise HTTPException(422, "invalid input")
    return roi(body.annual_bill_toman, min(max(body.saving_pct, 1), 25), body.sites)


class LeadIn(BaseModel):
    company: str
    contact: str
    phone: str
    email: str = ""
    city: str = ""
    sites: int = 1
    annual_bill_toman: float = 0
    note: str = ""
    locale: str = "fa"


@app.post("/api/leads", status_code=201)
def create_lead(body: LeadIn, s: Session = Depends(session)):
    if not body.company.strip() or len(body.phone.strip()) < 8:
        raise HTTPException(422, "company and a valid phone are required")
    lead = Lead(**body.model_dump())
    s.add(lead)
    s.commit()
    s.refresh(lead)
    return {"id": lead.id, "status": lead.status, "created_at": lead.created_at.isoformat()}


@app.get("/api/leads")
def list_leads(s: Session = Depends(session)):
    return [
        {**l.model_dump(), "created_at": l.created_at.isoformat()}
        for l in s.exec(select(Lead).order_by(Lead.created_at.desc())).all()
    ]
