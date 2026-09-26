from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


class Site(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    name_fa: str
    name_en: str
    city_fa: str
    city_en: str
    industry: str  # food | pharma | metal | retail | cold_storage | office
    area_m2: int
    tariff_toman_kwh: int
    lat: float
    lon: float
    onboarded_at: datetime = Field(default_factory=now)


class Meter(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    site_id: int = Field(foreign_key="site.id", index=True)
    name_fa: str
    name_en: str
    load_type: str  # chiller | compressor | hvac | lighting | process
    rated_kw: float


class Reading(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    meter_id: int = Field(foreign_key="meter.id", index=True)
    ts: datetime = Field(index=True)
    kwh: float


class Alert(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    site_id: int = Field(foreign_key="site.id", index=True)
    meter_id: int = Field(foreign_key="meter.id")
    kind: str  # leak | baseload | spike | schedule
    severity: str  # high | medium | low
    detected_at: datetime
    deviation_pct: float
    est_cost_toman: float
    status: str = "open"  # open | ack | resolved


class Measure(SQLModel, table=True):
    """A saving action proposed by the audit, with its own M&V numbers."""

    id: int | None = Field(default=None, primary_key=True)
    site_id: int = Field(foreign_key="site.id", index=True)
    key: str
    saving_kwh_year: float
    capex_toman: float
    status: str = "proposed"  # proposed | in_progress | done


class Lead(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    company: str
    contact: str
    phone: str
    email: str = ""
    city: str = ""
    sites: int = 1
    annual_bill_toman: float = 0
    note: str = ""
    locale: str = "fa"
    created_at: datetime = Field(default_factory=now)
    status: str = "pending"
