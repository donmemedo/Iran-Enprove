"""Energy analytics: baseline, anomaly detection and ROI math.

Baseline = median of the same hour-of-week over the trailing weeks (load
profiles are weekly, not daily: Friday at 3am is nothing like Monday at 3am).
Deviation is scored against MAD so a few spikes don't hide the next one.
"""

from statistics import median

CO2_KG_PER_KWH = 0.62  # Iran grid average, gas-dominated mix
KIND_THRESHOLD = {"spike": 0.35, "leak": 0.25, "baseload": 0.20, "schedule": 0.30}


def hour_of_week(ts) -> int:
    return ts.weekday() * 24 + ts.hour


def weekly_baseline(points: list[tuple]) -> dict[int, float]:
    """points: [(ts, kwh)] -> {hour_of_week: median kwh}"""
    buckets: dict[int, list[float]] = {}
    for ts, kwh in points:
        buckets.setdefault(hour_of_week(ts), []).append(kwh)
    return {h: median(v) for h, v in buckets.items() if v}


def mad(values: list[float]) -> float:
    if not values:
        return 0.0
    m = median(values)
    return median([abs(v - m) for v in values]) or 1e-6


def detect(points: list[tuple], kind_hint: str = "spike") -> list[dict]:
    """Flag readings that run above their weekly baseline persistently."""
    if len(points) < 24 * 14:
        return []
    split = int(len(points) * 0.6)
    base = weekly_baseline(points[:split])
    residuals = [kwh - base.get(hour_of_week(ts), kwh) for ts, kwh in points[:split]]
    scale = mad(residuals)
    threshold = KIND_THRESHOLD.get(kind_hint, 0.3)

    out, run = [], []
    for ts, kwh in points[split:]:
        expected = base.get(hour_of_week(ts))
        if not expected:
            continue
        dev = (kwh - expected) / expected
        if dev > threshold and (kwh - expected) > 2 * scale:
            run.append((ts, dev, kwh - expected))
        else:
            if len(run) >= 6:  # 6h+ of sustained excess, not a one-off peak
                out.append(
                    {
                        "detected_at": run[0][0],
                        "deviation_pct": round(100 * sum(r[1] for r in run) / len(run), 1),
                        "excess_kwh": round(sum(r[2] for r in run), 1),
                        "hours": len(run),
                    }
                )
            run = []
    if len(run) >= 6:
        out.append(
            {
                "detected_at": run[0][0],
                "deviation_pct": round(100 * sum(r[1] for r in run) / len(run), 1),
                "excess_kwh": round(sum(r[2] for r in run), 1),
                "hours": len(run),
            }
        )
    return out


def roi(
    annual_bill_toman: float,
    saving_pct: float = 7.0,
    sites: int = 1,
    setup_toman: float = 500_000_000,
    monthly_toman: float = 120_000_000,
) -> dict:
    """Business-plan pricing: setup/audit per site + monthly subscription per site."""
    annual_saving = annual_bill_toman * saving_pct / 100
    year_one_cost = sites * (setup_toman + monthly_toman * 12)
    recurring_cost = sites * monthly_toman * 12
    net_year_one = annual_saving - year_one_cost
    monthly_net = (annual_saving - recurring_cost) / 12
    payback = (sites * setup_toman) / monthly_net if monthly_net > 0 else None
    return {
        "annual_saving_toman": round(annual_saving),
        "year_one_cost_toman": round(year_one_cost),
        "net_year_one_toman": round(net_year_one),
        "net_five_year_toman": round(annual_saving * 5 - year_one_cost - recurring_cost * 4),
        "payback_months": round(payback, 1) if payback else None,
        "co2_ton_year": round(annual_saving / 5_000 * CO2_KG_PER_KWH / 1000, 1),
        "viable": monthly_net > 0,
    }


def demo() -> None:
    from datetime import datetime, timedelta

    start = datetime(2026, 1, 5)  # a Monday
    pts = []
    for i in range(24 * 60):
        ts = start + timedelta(hours=i)
        base = 40 + 25 * (8 <= ts.hour < 18) - 15 * (ts.weekday() == 4)
        # a compressed-air leak starts on day 45 and never stops
        leak = 22 if i >= 24 * 45 else 0
        pts.append((ts, base + leak))

    found = detect(pts, "leak")
    assert found, "sustained leak must be detected"
    assert found[0]["detected_at"] >= start + timedelta(hours=24 * 45), found[0]
    assert not detect([(t, k - (22 if i >= 24 * 45 else 0)) for i, (t, k) in enumerate(pts)], "leak")

    r = roi(annual_bill_toman=40_000_000_000, saving_pct=8, sites=1)
    assert r["viable"] and 0 < r["payback_months"] < 24, r
    assert not roi(annual_bill_toman=1_000_000_000, saving_pct=3)["viable"]
    print("analytics self-check ok:", found[0], r)


if __name__ == "__main__":
    demo()
