"""Security smoke test for the hardened API. Runs against a throwaway copy of the database.

    cd backend && .venv/bin/python tests/smoke_security.py      # needs httpx (pip install httpx)

Exit code 0 only if every check passes.
"""
import os
import shutil
import sys
import tempfile

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix="enprove-smoke-")
src = os.path.join(BACKEND, "data", "enprove.db")
if os.path.exists(src):  # reuse seeded data; otherwise startup seeds a fresh DB (slower)
    shutil.copy(src, os.path.join(TMP, "smoke.db"))
os.environ.update(DATABASE_URL=f"sqlite:///{TMP}/smoke.db", ADMIN_TOKEN="test-admin-token-0123456789abcdef0123", PROXY_SECRET="")
os.chdir(TMP)
sys.path.insert(0, BACKEND)

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

AUTH = {"authorization": "Bearer test-admin-token-0123456789abcdef0123"}
LEAD = {"company": "PENTEST Co", "contact": "Tester", "phone": "09123456789"}
res = []


def check(name, ok, got=""):
    res.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{got}]" if got != "" else ""))


# peer 127.0.0.1 = the Next proxy; X-Forwarded-For then selects the visitor's own bucket (TRUST_PROXY=1 case)
VISITOR = {"x-forwarded-for": "203.0.113.9"}


with TestClient(app, raise_server_exceptions=False, headers=VISITOR, client=("127.0.0.1", 50000)) as c:
    r = c.get("/api/health"); check("health 200", r.status_code == 200, r.status_code)
    r = c.get("/api/overview?days=30"); et = r.headers.get("etag")
    check("overview 200 with ETag", r.status_code == 200 and bool(et), r.status_code)
    check("nosniff header", r.headers.get("x-content-type-options") == "nosniff")
    check("no lat/lon in public site rows", all("lat" not in s and "lon" not in s for s in r.json()["sites"]))
    r = c.get("/api/overview?days=30", headers={"if-none-match": et}); check("overview 304 on matching ETag", r.status_code == 304, r.status_code)
    r = c.get("/api/sites?days=90"); check("sites 200, 6 rows", r.status_code == 200 and len(r.json()) == 6, r.status_code)
    r = c.get("/api/sites/pakdis-dairy?days=90"); check("site detail 200", r.status_code == 200, r.status_code)
    r = c.get("/api/sites/nope"); check("unknown site 404", r.status_code == 404, r.status_code)
    r = c.get("/api/alerts?status=bogus"); check("alerts bad status 422", r.status_code == 422, r.status_code)
    r = c.get("/api/docs"); check("swagger hidden (404)", r.status_code == 404, r.status_code)
    r = c.get("/api/openapi.json"); check("openapi hidden (404)", r.status_code == 404, r.status_code)
    r = c.get("/api/leads"); check("GET leads anon -> 401", r.status_code == 401, r.status_code)
    r = c.get("/api/leads", headers=AUTH); check("GET leads staff -> 200", r.status_code == 200, r.status_code)
    r = c.patch("/api/alerts/1", json={"status": "ack"}); check("PATCH alert anon -> 401", r.status_code == 401, r.status_code)
    r = c.patch("/api/alerts/1", json={"status": "hacked"}, headers=AUTH); check("PATCH bad status -> 422", r.status_code == 422, r.status_code)
    r = c.patch("/api/alerts/1", json={"status": "ack"}, headers=AUTH); check("PATCH alert staff -> 200", r.status_code == 200, r.status_code)
    r = c.post("/api/leads", content='{"company": "NaN Co", "contact": "Tester", "phone": "09123456789", "annual_bill_toman": NaN}',
               headers={"content-type": "application/json"})
    check("lead NaN -> 422 (not 500)", r.status_code == 422, r.status_code)
    check("422 body never echoes the input", r.status_code == 422 and "input" not in r.text and "ctx" not in r.text)
    r = c.get("/api/measures"); check("measures 200, 6 sites with rows", r.status_code == 200 and len(r.json()) == 6 and all(x["measures"] for x in r.json()), r.status_code)
    before = c.get("/api/alerts").headers.get("etag")
    c.patch("/api/alerts/2", json={"status": "resolved"}, headers=AUTH)
    r = c.get("/api/alerts"); fresh = next(a for a in r.json() if a["id"] == 2)["status"]
    check("cache cleared after PATCH (no stale 60s read)", r.headers.get("etag") != before and fresh == "resolved", fresh)
    shared = [c.get("/api/sites?days=7", headers={"x-forwarded-for": ""}).status_code for _ in range(130)]
    check("shared proxy bucket is 10x wider (130 reads, no 429)", 429 not in shared, sorted(set(shared)))
    r = c.post("/api/roi", json={"annual_bill_toman": 3e10}); check("roi endpoint removed (404/405)", r.status_code in (404, 405), r.status_code)
    r = c.post("/api/leads", json={**LEAD, "note": "x" * 20000}); check("lead 20KB body -> 413", r.status_code == 413, r.status_code)
    r = c.post("/api/leads", json={**LEAD, "phone": "abc"}); check("lead bad phone -> 422", r.status_code == 422, r.status_code)
    r = c.post("/api/leads", json={**LEAD, "role": "admin"}); check("lead extra field -> 422", r.status_code == 422, r.status_code)
    r = c.post("/api/leads", json={**LEAD, "phone": "۰۹۱۲۳۴۵۶۷۸۹", "note": "a‮b"}); check("lead Persian digits -> 201", r.status_code == 201, r.status_code)
    stored = [x for x in c.get("/api/leads", headers=AUTH).json() if x["company"] == "PENTEST Co"]
    check("bidi override stripped, digits normalised", stored and stored[0]["note"] == "ab" and stored[0]["phone"] == "09123456789")
    codes = [c.post("/api/leads", json=LEAD).status_code for _ in range(10)]
    check("lead rate limit hits 429", 429 in codes, codes)
    bad = [c.get("/api/leads", headers={"authorization": "Bearer wrong"}).status_code for _ in range(11)]
    check("auth lockout after repeated failures -> 429", bad[-1] == 429, bad)
    r = c.get("/api/leads", headers=AUTH); check("valid token still works during a lockout", r.status_code == 200, r.status_code)
    r = c.get("/api/leads", headers={"authorization": "Bearer wrong", "x-forwarded-for": "6.6.6.6, 203.0.113.9"})
    check("rightmost XFF used (spoofed left entry still locked out)", r.status_code == 429, r.status_code)

shutil.rmtree(TMP, ignore_errors=True)
print(f"\n{sum(res)}/{len(res)} passed")
sys.exit(0 if all(res) else 1)
