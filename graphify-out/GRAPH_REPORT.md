# Graph Report - Iran-Enprove-fix  (2026-10-15)

## Corpus Check
- 41 files · ~18,694 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .woff2 1)

## Summary
- 332 nodes · 815 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92e8fa5d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.py
- getDict
- package.json
- api.ts
- analytics.py
- nav.tsx
- compilerOptions
- smoke_security.py
- Enprove Iran — Energy Intelligence Platform
- Limiter
- roi-check.mjs
- middleware.ts
- BodyLimit
- _validation_error

## God Nodes (most connected - your core abstractions)
1. `getDict()` - 37 edges
2. `num()` - 29 edges
3. `toman()` - 20 edges
4. `toLocale()` - 20 edges
5. `energy()` - 17 edges
6. `compilerOptions` - 16 edges
7. `site_detail()` - 15 edges
8. `Site` - 15 edges
9. `next` - 15 edges
10. `session()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `build()` --calls--> `detect()`  [EXTRACTED]
  backend/app/seed.py → backend/app/analytics.py
- `_per_site()` --uses--> `Meter`  [INFERRED]
  backend/app/main.py → backend/app/models.py
- `_per_site()` --uses--> `Reading`  [INFERRED]
  backend/app/main.py → backend/app/models.py
- `_per_site()` --uses--> `Site`  [INFERRED]
  backend/app/main.py → backend/app/models.py
- `_daily()` --uses--> `Meter`  [INFERRED]
  backend/app/main.py → backend/app/models.py

## Import Cycles
- None detected.

## Communities (17 total, 4 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.06
Nodes (79): AlertStatus, _alert_out(), alerts(), _change(), client_ip(), create_lead(), _daily(), _digest() (+71 more)

### Community 1 - "getDict"
Cohesion: 0.12
Nodes (53): frontend_src_app_globals, AlertsPage(), Dashboard(), generateMetadata(), LocaleLayout(), viewport, Landing(), OFFERS (+45 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (35): allowScripts, sharp@0.35.5, @tailwindcss/oxide@4.1.13, dependencies, lucide-react, next, react, react-dom (+27 more)

### Community 3 - "api.ts"
Cohesion: 0.10
Nodes (24): dynamic, noStore, POST(), BLOCKED, dynamic, GET, handler(), json() (+16 more)

### Community 4 - "analytics.py"
Cohesion: 0.12
Nodes (20): demo(), detect(), hour_of_week(), mad(), Energy analytics: baseline, anomaly detection and ROI math. Baseline = median…, points: [(ts, kwh)] -> {hour_of_week: median kwh}, Flag readings that run above their weekly baseline persistently., Business-plan pricing: setup/audit per site + monthly subscription per site. (+12 more)

### Community 5 - "nav.tsx"
Cohesion: 0.17
Nodes (14): config, SECURITY_HEADERS, Login(), metadata, LoginForm(), Logo(), item(), ITEMS (+6 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "smoke_security.py"
Cohesion: 0.22
Nodes (6): Security smoke test for the hardened API. Runs against a throwaway copy of the…, fastapi_testclient, os, shutil, sys, tempfile

### Community 8 - "Enprove Iran — Energy Intelligence Platform"
Cohesion: 0.22
Nodes (8): Design notes, Docker (both services), Enprove Iran — Energy Intelligence Platform, Layout, Local, Next steps (not built yet), Run it, What it does

### Community 9 - "Limiter"
Cohesion: 0.40
Nodes (3): Limiter, Sliding-window limiter: O(1) amortised per hit, memory bounded by pruning idle…, 0 when allowed, otherwise the seconds until the window frees up.

### Community 10 - "roi-check.mjs"
Cohesion: 0.40
Nodes (4): cases, CO2_KG_PER_KWH, roi, ref_node_assert

### Community 11 - "middleware.ts"
Cohesion: 0.40
Nodes (5): defaultLocale, locales, config, csp(), middleware()

### Community 13 - "_validation_error"
Cohesion: 0.50
Nodes (4): FastAPI's default 422 echoes the raw input; NaN/Infinity there is not valid…, _validation_error(), exception_handler, RequestValidationError

## Knowledge Gaps
- **83 isolated node(s):** `SECURITY_HEADERS`, `config`, `name`, `version`, `private` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 146 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `nav.tsx` to `middleware.ts`, `getDict`, `package.json`, `api.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `getDict` to `package.json`, `nav.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `getDict()` connect `getDict` to `nav.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `SECURITY_HEADERS`, `config`, `name` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0644384221619994 - nodes in this community are weakly interconnected._
- **Should `getDict` be split into smaller, more focused modules?**
  _Cohesion score 0.11514253980007405 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._