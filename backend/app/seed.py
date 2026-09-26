"""Deterministic demo dataset: 6 Iranian industrial/commercial sites, 90 days hourly."""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import insert
from sqlmodel import Session, select

from .analytics import detect
from .models import Alert, Measure, Meter, Reading, Site

DAYS = 90

SITES = [
    # slug, fa, en, city_fa, city_en, industry, area, tariff, lat, lon
    ("pakdis-dairy", "کارخانه لبنیات پاک‌دیس", "Pakdis Dairy Plant", "کرج", "Karaj", "food", 18000, 2850, 35.84, 50.94),
    ("sepehr-pharma", "داروسازی سپهر", "Sepehr Pharmaceuticals", "قزوین", "Qazvin", "pharma", 9500, 2850, 36.27, 50.00),
    ("aria-rolling", "نورد فلزی آریا", "Aria Metal Rolling", "اصفهان", "Isfahan", "metal", 26000, 2640, 32.65, 51.67),
    ("alborz-cold", "سردخانه البرز", "Alborz Cold Storage", "تهران", "Tehran", "cold_storage", 12000, 2850, 35.70, 51.34),
    ("setareh-mall", "مرکز خرید ستاره", "Setareh Shopping Center", "مشهد", "Mashhad", "retail", 42000, 3100, 36.30, 59.57),
    ("negin-tower", "برج اداری نگین", "Negin Office Tower", "تبریز", "Tabriz", "office", 15000, 3100, 38.08, 46.29),
]

# load_type -> (fa, en, rated_kw share of a site's mix) per industry
MIX = {
    "food": [("chiller", 0.34), ("compressor", 0.24), ("process", 0.28), ("lighting", 0.14)],
    "pharma": [("hvac", 0.40), ("compressor", 0.22), ("process", 0.24), ("lighting", 0.14)],
    "metal": [("process", 0.52), ("compressor", 0.22), ("hvac", 0.14), ("lighting", 0.12)],
    "cold_storage": [("chiller", 0.62), ("compressor", 0.16), ("hvac", 0.10), ("lighting", 0.12)],
    "retail": [("hvac", 0.42), ("lighting", 0.30), ("chiller", 0.18), ("process", 0.10)],
    "office": [("hvac", 0.46), ("lighting", 0.28), ("chiller", 0.16), ("process", 0.10)],
}

LOAD_NAMES = {
    "chiller": ("چیلر و برودت", "Chillers & Refrigeration"),
    "compressor": ("هوای فشرده", "Compressed Air"),
    "hvac": ("تهویه مطبوع", "HVAC"),
    "lighting": ("روشنایی", "Lighting"),
    "process": ("خط تولید", "Process Line"),
}

SITE_KW = {"food": 780, "pharma": 520, "metal": 1650, "cold_storage": 940, "retail": 1150, "office": 430}

# faults injected into the last third of the window -> what the detector should find
FAULTS = {
    ("pakdis-dairy", "compressor"): ("leak", 0.42),
    ("aria-rolling", "compressor"): ("leak", 0.31),
    ("alborz-cold", "chiller"): ("spike", 0.44),
    ("negin-tower", "hvac"): ("baseload", 0.55),
    ("setareh-mall", "lighting"): ("schedule", 0.48),
}

MEASURES = {
    "food": [("leak_repair", 78000, 120_000_000), ("chiller_setpoint", 121000, 320_000_000), ("vfd_pump", 96000, 680_000_000)],
    "pharma": [("ahu_schedule", 64000, 90_000_000), ("leak_repair", 41000, 110_000_000), ("heat_recovery", 88000, 920_000_000)],
    "metal": [("peak_shaving", 310000, 1_400_000_000), ("leak_repair", 152000, 180_000_000), ("motor_upgrade", 240000, 2_100_000_000)],
    "cold_storage": [("defrost_optimization", 186000, 240_000_000), ("door_curtains", 74000, 90_000_000), ("floating_head", 142000, 560_000_000)],
    "retail": [("lighting_led", 168000, 780_000_000), ("bms_schedule", 96000, 150_000_000), ("free_cooling", 112000, 640_000_000)],
    "office": [("bms_schedule", 58000, 140_000_000), ("lighting_led", 71000, 420_000_000), ("night_setback", 44000, 60_000_000)],
}


def _profile(industry: str, load: str, ts: datetime, rng: random.Random) -> float:
    """Fraction of rated load at this hour: weekly schedule + season + noise."""
    h, wd = ts.hour, ts.weekday()
    friday = wd == 4  # Iranian weekend
    if industry in ("retail",):
        open_h = 9 <= h < 22
        work = 0.95 if open_h else 0.30
    elif industry == "office":
        work = 0.9 if (7 <= h < 18 and not friday) else 0.22
    elif industry == "cold_storage":
        work = 0.85 + 0.15 * (12 <= h < 18)  # runs around the clock
    else:  # factories: two shifts, reduced Friday
        work = (0.95 if 6 <= h < 22 else 0.45) * (0.45 if friday else 1.0)

    if load == "lighting":
        work *= 1.25 if (h < 7 or h >= 18) else 0.55
    if load in ("hvac", "chiller"):
        month_peak = 1.0 + 0.35 * (ts.month in (6, 7, 8, 9))  # summer in Iran
        work *= month_peak * (1.0 + 0.20 * (12 <= h < 18))
    if load == "compressor":
        work *= 0.9
    return max(0.05, work * rng.uniform(0.93, 1.07))


def build(session: Session) -> None:
    rng = random.Random(42)
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=DAYS)

    for slug, fa, en, city_fa, city_en, industry, area, tariff, lat, lon in SITES:
        site = Site(
            slug=slug, name_fa=fa, name_en=en, city_fa=city_fa, city_en=city_en,
            industry=industry, area_m2=area, tariff_toman_kwh=tariff, lat=lat, lon=lon,
            onboarded_at=start - timedelta(days=rng.randint(30, 400)),
        )
        session.add(site)
        session.commit()
        session.refresh(site)

        for key, saving, capex in MEASURES[industry]:
            session.add(Measure(site_id=site.id, key=key, saving_kwh_year=saving, capex_toman=capex,
                                status=rng.choice(["proposed", "proposed", "in_progress", "done"])))

        rows: list[dict] = []
        for load, share in MIX[industry]:
            fa_n, en_n = LOAD_NAMES[load]
            meter = Meter(site_id=site.id, name_fa=fa_n, name_en=en_n, load_type=load,
                          rated_kw=round(SITE_KW[industry] * share, 1))
            session.add(meter)
            session.commit()
            session.refresh(meter)

            fault = FAULTS.get((slug, load))
            fault_start = start + timedelta(days=int(DAYS * 0.68))
            points = []
            for i in range(DAYS * 24):
                ts = start + timedelta(hours=i)
                kwh = meter.rated_kw * _profile(industry, load, ts, rng)
                if fault and ts >= fault_start:
                    kind, size = fault
                    if kind == "baseload":
                        kwh *= 1 + size if (ts.hour >= 20 or ts.hour < 6) else 1.0
                    elif kind == "schedule":
                        kwh *= 1 + size if (ts.hour >= 22 or ts.hour < 7) else 1.0
                    else:
                        kwh *= 1 + size
                kwh = round(kwh, 3)
                points.append((ts, kwh))
                rows.append({"meter_id": meter.id, "ts": ts, "kwh": kwh})

            kind = fault[0] if fault else "spike"
            for found in detect(points, kind)[:3]:
                session.add(Alert(
                    site_id=site.id, meter_id=meter.id, kind=kind,
                    severity="high" if found["deviation_pct"] > 30 else "medium",
                    detected_at=found["detected_at"], deviation_pct=found["deviation_pct"],
                    est_cost_toman=round(found["excess_kwh"] / max(found["hours"], 1) * 24 * 30 * tariff),
                    status="open",
                ))
        session.connection().execute(insert(Reading), rows)
        session.commit()


def ensure(session: Session) -> None:
    if session.exec(select(Site)).first() is None:
        build(session)
