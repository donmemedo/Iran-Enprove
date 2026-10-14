# Security, performance and UI audit

Enprove Iran, branch `security-hardening`, compared with `main` at `92e8fa5`. Work done between 2026-09-30 and 2026-10-15.

## Verdict

`main` is at **critical** risk. Three problems carry that rating:

- Next.js 15.5.4 has a known unauthenticated remote-code-execution advisory.
- Anyone can download every sales lead.
- Anyone can change alert status.

This branch fixes all three, plus every other finding below except the residual risks listed at the end. With the branch merged and deployed with strong secrets, the remaining risk is **low**.

The branch also makes the app faster:
- With an empty cache, every measured API call is faster than on `main`.
- With a warm cache, the main endpoints answer in 15–34 ms.
- The reports page needs one backend call instead of seven.

## Checks that pass on this branch

| Check | Result |
|---|---|
| Backend smoke test, `backend/tests/smoke_security.py` | 31 / 31 |
| Live acceptance suite against the production build (headers, CSP nonce, proxy, auth, cookie, gate) | 50 / 50 |
| ROI parity, `frontend/scripts/roi-check.mjs` (browser formula against the Python one) | 5 / 5 |
| Analytics self-check, `backend/app/analytics.py` | pass |
| `tsc --noEmit` and `next build` (Next 15.5.27) | pass |
| `npm audit` | 0 vulnerabilities (was 3 critical, 13 high on `main`) |
| `pip-audit` on the OSV database | 0 vulnerabilities (was 28 entries in starlette and python-multipart) |
| Semgrep with nine rulesets (OWASP Top 10, Python, TypeScript, React, Next.js, secrets, Dockerfile, compose, FastAPI) | 0 findings |
| Bandit | 0 real findings. The two mediums are the `"0.0.0.0"` fallback string, not a socket bind. The lows are self-check asserts and the demo seeder's `random`. |
| Secrets in the working tree and git history | none |
| Backend Docker image: run read-only, non-root, all capabilities dropped | healthy, uid 999, no host port, 403 without the proxy key |

## How the audit was done

| Skill or tool | What it did here |
|---|---|
| `security-audit` | Full OWASP review of `main` and this branch, with live probing of the original app on a copy of the data. It found four problems in the first version of the fixes (W1–W4 below); all four are fixed. |
| `security-auditor` | OWASP checklist used for the manual read of every source file. |
| `security-scanning-security-sast` | Semgrep, Bandit, `pip-audit` and `npm audit`, results above. |
| `red-team-tactics`, `red-team-tools` | Attack-surface mapping and the live pen test below. The pen test found the Host-header gate bypass (H1). |
| `attack-tree-construction` | **Not completed.** The automated safety check stopped the attack-tree and multi-agent red-team step. Per the owner's instruction, that step was skipped instead of retried. The `security-audit` run and the pen test cover the same attack surface. |
| `apple-design` | The UI pass described below. |
| `ponytail`, `ponytail-review` | Kept the fixes small, then cut what was not needed. See below. |
| `graphify` | Code knowledge graph in `graphify-out/`. The semantic pass over the README and app icons was stopped by the same safety check, so the graph covers code only. |

## Findings and fixes

Severity is for `main`. Every fix is in this branch.

| # | Sev | Finding on `main` | Fix | Verified by |
|---|---|---|---|---|
| F1 | Critical | Next.js 15.5.4 has an unauthenticated RCE (GHSA-9qr9-h5gf-34mp) and about 30 more advisories | Next 15.5.27 and React 19.1.1, pinned. Next's bundled PostCSS is overridden to 8.5.28. | `npm audit` 0 |
| F2 | High | `GET /api/leads` returns every lead's name, phone and email to anyone | Staff bearer token required | smoke, acceptance |
| F3 | High | `PATCH /api/alerts/{id}` lets anyone silence alerts | Staff only, status is an enum, every change is logged | smoke, acceptance |
| F4 | High | The Next proxy forwards any method to any backend path, including encoded `..` paths | Method allowlist, strict path segments, docs/openapi/me blocked, body and query caps, 10 s timeout, header allowlist | acceptance |
| F5 | High | The backend port is published on all interfaces, which bypasses the proxy | `expose` only, plus an `X-Proxy-Key` shared secret | acceptance, container test |
| H1 | High | Found in this audit: a crafted `Host` header made the backend's gate read a different path, so the proxy key could be skipped (Starlette PYSEC-2026-161) | The gate reads the routed path from the ASGI scope. FastAPI 0.143.0 and Starlette 1.7.0. | pen test before/after, acceptance |
| F6 | Medium | No rate limiting, so lead spam and expensive reads are a cheap DoS | Per-IP sliding windows, a global cap of 300 leads per hour, a failed-login lockout | smoke |
| F7 | Medium | Lead fields have no length or format checks and there is no body cap; a 2 MB lead was stored | Strict Pydantic models, a phone regex, a 16 KB cap in both the API and the proxy | smoke, acceptance |
| F8 | Medium | `NaN` in a request crashes the server with a 500 | `allow_inf_nan=False`, and a 422 handler that never echoes the input | smoke, acceptance |
| F9 | Medium | Swagger and OpenAPI are public | Served only when `DEBUG=1` | acceptance |
| F10 | Medium | CORS is `*` with every method | Removed; the app is same-origin through the proxy | code |
| F11 | Medium | No CSP and no security headers | Per-request nonce CSP, `frame-ancestors 'none'`, XFO, nosniff, Referrer-Policy, Permissions-Policy, COOP. HSTS is sent only over https. | acceptance: all 33 scripts carry the nonce |
| F12 | Medium | Containers run as root with no healthcheck or limits | Non-root users, healthchecks, `read_only`, `cap_drop: ALL`, `no-new-privileges`, memory and pid limits | backend container test |
| S1 | Medium | starlette 0.41.3 and python-multipart 0.0.20 have 28 advisory entries | Upgraded Starlette; python-multipart removed because the app has no forms | `pip-audit` 0 |
| W1 | Medium | In the first fix: junk logins could lock out every staff member | A valid token always passes and only failures count. Logins are counted per visitor. | smoke |
| W2 | Medium | In the first fix: the leftmost `X-Forwarded-For` entry is chosen by the client | Use `X-Real-IP` or the rightmost entry, and only when `TRUST_PROXY=1` | smoke |
| W3 | Low | In the first fix: any length of staff token was accepted | Tokens shorter than 32 characters disable staff endpoints | smoke |
| W4 | Low | In the first fix: the PostCSS override had not reached the lockfile | Lockfile regenerated; `npm ls postcss` shows 8.5.28 | `npm audit` 0 |
| F13 | Low | Plant GPS coordinates are public | Removed from public responses | smoke |
| F14 | Low | Bidi-override and control characters in leads can disguise text shown to staff | Stripped; ZWNJ kept for Persian, and Persian digits in phone numbers are normalised | smoke |
| F15 | Low | `payback_months` divides by zero | Returns `null`, which the UI shows as `—` | tsc |
| F16 | Low | No bot protection on the lead form | Hidden honeypot field; bot leads are acknowledged but dropped | acceptance |

## Live pen test

These are the same requests sent to the original API and to this branch. The full suite is 50 checks; this table shows the ones with a direct before-and-after.

| Probe | Original | This branch |
|---|---|---|
| Anonymous `GET /api/leads` | 200, all leads | 401 |
| Anonymous alert `PATCH` | 200 | 401 |
| `/api/docs` | 200 | 404 |
| `NaN` in `/api/roi` | 500 | 422, input not echoed |
| 20 KB lead | 201, stored | 413 |
| API without the proxy key | no gate | 403 |
| API without the key, crafted `Host` header | no gate | 403 (was 200 before the H1 fix) |
| `PUT` or `DELETE` through the proxy | forwarded | 405 |
| Encoded `..` path through the proxy | reached `/api/leads` | 404 |
| Staff cookie | none | `HttpOnly`, `SameSite=Strict`, `Path=/api`; logout clears it |

## Performance

The original and patched APIs were measured on the same data at the same time, alternating requests: median of three, on a heavily loaded machine. The patched cache was cleared before every cold request.

| Endpoint | Original | Patched, cold | Patched, warm |
|---|---|---|---|
| `/api/overview?days=30` | 1461 ms | 699 ms | 34 ms |
| `/api/overview?days=90` | 2190 ms | 1468 ms | 15 ms |
| `/api/sites?days=90` | 2908 ms | 450 ms | 30 ms |
| `/api/sites/{slug}?days=90` | 644 ms | 601 ms | 24 ms |

What made the difference:

- **Grouped queries.** The overview used to run about three queries per site, and `/api/sites` computed the whole overview and threw most of it away. Each is now one grouped query per time window.
- **Composite index on `(meter_id, ts)`.** `EXPLAIN QUERY PLAN` shows every aggregate doing a range seek on it, and the 90-day grouping no longer needs a temporary B-tree. The single-column `meter_id` index is now redundant and was removed from the model.
- **SQLite settings.** WAL mode, `synchronous=NORMAL` and a busy timeout let reads run while a lead is being written.
- **Response cache.** A 60-second per-process cache with ETag and 304 answers a repeat request without running any query. Cache keys come only from validated parameters, so junk query strings cannot grow or flush it. A staff change clears it.
- **One call for the reports page.** It used to fetch the overview plus every site, seven calls taking 23 s under load. The new `/api/measures` endpoint takes 3.4 s cold and is cached for five minutes.
- **Page-level caching.** Five dashboard views caused two backend calls.
- **ROI in the browser.** The calculator computes in the browser, so results follow the sliders with no network round trip. A parity check keeps it equal to the Python formula.
- **Rendering cost.**
  - Glass blur now applies only to floating chrome.
  - The fixed full-screen `blur(40px)` layer is gone.
  - Card glows use plain gradients.
  - A loading skeleton streams the shell immediately.
  - The font is preloaded.

## UI and UX (Apple design)

- **Response on press.** Buttons, links and cards scale down slightly the moment they are pressed.
- **Interruptible drawer.** The mobile menu enters and leaves from the same edge (right in Persian, left in English). It is one reversible transform, closes with Escape or the scrim, and locks page scroll while open.
- **Translucency as hierarchy.** Glass only on the sidebar, sticky header, drawer and tooltips. Cards are solid, so text never sits on two translucent layers. The sticky header fades content under it instead of drawing a hard line.
- **Typography.**
  - Persian text never gets letter-spacing, which would break letter joining.
  - Persian body text has 1.6–1.75 leading.
  - Headings use tight leading, with negative tracking only in English.
- **Accessibility.**
  - Support for `prefers-reduced-motion` (cross-fades instead of slides), `prefers-reduced-transparency` (solid surfaces) and `prefers-contrast: more`.
  - Theme changes ease instead of flashing.
  - Every control has a visible focus ring, and touch targets are at least 44 px.
  - The current page is marked with `aria-current`, and the range buttons with `aria-pressed`.
- **Feedback.**
  - The pilot form validates each field when you leave it, with hints in both languages.
  - The API's 422 and 429 answers become plain messages, including how many minutes to wait.
  - Alert actions show an error instead of failing silently.
- **Staff login.**
  - New `/login` page, with ورود and خروج in the navigation.
  - Alert buttons appear only for logged-in staff.
  - A wrong token shows «رمز نادرست است».
- **Wording.**
  - The vague nav item "Home / خانه" is now "Introduction / معرفی".
  - «رایانامه» became the familiar «ایمیل».
  - New Persian strings follow the owner's UX vocabulary list.

## Simplicity (ponytail review)

- Removed: python-multipart (unused), the CORS knob (the proxy makes it unnecessary), cache eviction code that could never run, and a redundant index.
- Kept on purpose: one smoke test, one ROI parity check, and the analytics self-check.
- `ponytail:` comments mark two deliberate limits: the per-process rate limiter and the per-process cache. Both are exact with one worker and move to Redis if `WEB_CONCURRENCY` goes above 1.

## Code graph

`graphify-out/` holds the code knowledge graph: 332 nodes, 815 edges, 17 communities, all from the AST at zero token cost.

- **Core abstractions:** the most connected nodes are the i18n and formatting helpers (`getDict`, `num`, `toman`, `toLocale`, `energy`) and the backend's `site_detail` and `Site`.
- **Clean structure:** there are no import cycles.
- **Interactive view:** open `graphify-out/graph.html` in a browser.
- **After code changes:** run `graphify update .` to refresh it.

## Residual risks and what was not done

- **Attack tree and the multi-agent red-team pass:** stopped by the safety check and skipped, as described above.
- **Frontend Docker image:** not built. The build machine had about 600 MB of free memory. The backend image was built and tested.
- **Real-browser CSP check:** not done. The served HTML was checked instead: all 33 scripts carry the per-request nonce. Opening each page in a browser and watching the console is still worth doing once.
- **Last UI tweak not in a production build:** two touch-target sizes and one Persian word changed after the last build. The type-check passes.
- **One shared staff token:** there are no per-user accounts or roles yet. Add them before more than one person needs staff access.
- **Lead data:** names and phone numbers are stored unencrypted in SQLite, with no retention period.
- **Unknown site pages return 200, not 404.** Because pages stream, an unknown site shows the not-found screen with `noindex` but a 200 status. Next documents this behavior.
- **Next 16:** not adopted. 15.5.27 is the maintained backport line.

## Re-run the checks

```bash
backend/.venv/bin/python backend/tests/smoke_security.py      # 31 checks, temp copy of the DB
backend/.venv/bin/python backend/app/analytics.py             # analytics self-check
(cd frontend && node scripts/roi-check.mjs)                   # ROI parity, Node >= 23.6
(cd frontend && npx tsc --noEmit && npm audit)
semgrep scan --config p/owasp-top-ten --config p/python --config p/typescript backend frontend/src
```
