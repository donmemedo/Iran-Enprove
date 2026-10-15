# Graph Report - Iran-Enprove-fix  (2026-10-15)

## Corpus Check
- Corpus is ~21,313 words - fits in a single context window. You may not need a graph.

## Summary
- 342 nodes · 826 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API endpoints and data models
- ROI parity check
- Request body cap
- Layout, i18n lookup and landing
- Alerts table
- Lead input validation
- Translations
- Proxy, staff auth and API types
- App shell and staff session
- Rate limiter
- Pages, charts and number formatting
- CSP and locale middleware
- Validation error handler
- Audit report
- Shared UI and range picker
- Anomaly detection and ROI math
- Security smoke test
- Frontend dependencies
- Security headers config
- TypeScript config
- README

## God Nodes (most connected - your core abstractions)
1. `getDict()` - 38 edges
2. `num()` - 30 edges
3. `toman()` - 21 edges
4. `toLocale()` - 21 edges
5. `energy()` - 18 edges
6. `Site` - 16 edges
7. `site_detail()` - 16 edges
8. `compilerOptions` - 16 edges
9. `next` - 15 edges
10. `_overview()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Site` --references--> `Code graph`  [INFERRED]
  backend/app/models.py → AUDIT_REPORT.md
- `site_detail()` --references--> `Code graph`  [INFERRED]
  backend/app/main.py → AUDIT_REPORT.md
- `getDict()` --references--> `Code graph`  [INFERRED]
  frontend/src/lib/i18n.ts → AUDIT_REPORT.md
- `toLocale()` --references--> `Code graph`  [INFERRED]
  frontend/src/lib/i18n.ts → AUDIT_REPORT.md
- `energy()` --references--> `Code graph`  [INFERRED]
  frontend/src/lib/format.ts → AUDIT_REPORT.md

## Import Cycles
- None detected.

## Communities (24 total, 5 thin omitted)

### Community 0 - "API endpoints and data models"
Cohesion: 0.06
Nodes (81): StatusIn, Alert, Lead, Measure, Meter, Reading, Site, _alert_out() (+73 more)

### Community 10 - "ROI parity check"
Cohesion: 0.40
Nodes (4): roi, cases, CO2_KG_PER_KWH, ref_node_assert

### Community 17 - "Layout, i18n lookup and landing"
Cohesion: 0.19
Nodes (15): Overview, generateMetadata(), LocaleLayout(), Login(), Landing(), Pilot(), LoginForm(), getDict() (+7 more)

### Community 20 - "Alerts table"
Cohesion: 0.36
Nodes (6): AlertRow, AlertsPage(), AlertsTable(), Empty(), shortDate(), SEV_TONE

### Community 21 - "Lead input validation"
Cohesion: 0.38
Nodes (5): LeadIn, clean_text(), BaseModel, field_validator, Drop control and bidi-override characters that could disguise text for staff;…

### Community 22 - "Translations"
Cohesion: 0.29
Nodes (6): Dict, T, TKey, dictionaries, en, fa

### Community 3 - "Proxy, staff auth and API types"
Cohesion: 0.10
Nodes (24): Kpi, MeasureRow, MixRow, Point, SiteDetail, SiteInfo, SiteMeasures, SiteRow (+16 more)

### Community 5 - "App shell and staff session"
Cohesion: 0.20
Nodes (13): Locale, Logo(), item(), Shell(), useTheme(), PilotForm(), Card(), retryMinutes() (+5 more)

### Community 9 - "Rate limiter"
Cohesion: 0.40
Nodes (3): Limiter, Sliding-window limiter: O(1) amortised per hit, memory bounded by pruning idle…, 0 when allowed, otherwise the seconds until the window frees up.

### Community 1 - "Pages, charts and number formatting"
Cohesion: 0.29
Nodes (18): Dashboard(), Reports(), Sites(), SitePage(), HourlyBars(), MixDonut(), TrendChart(), MeasureTable() (+10 more)

### Community 11 - "CSP and locale middleware"
Cohesion: 0.40
Nodes (5): csp(), middleware(), defaultLocale, locales, config

### Community 13 - "Validation error handler"
Cohesion: 0.50
Nodes (4): _validation_error(), exception_handler, RequestValidationError, FastAPI's default 422 echoes the raw input; NaN/Infinity there is not valid…

### Community 18 - "Audit report"
Cohesion: 0.15
Nodes (12): DELETE(), Checks that pass on this branch, Findings and fixes, How the audit was done, Live pen test, Performance, Re-run the checks, Residual risks and what was not done (+4 more)

### Community 19 - "Shared UI and range picker"
Cohesion: 0.36
Nodes (8): RangePicker(), Badge(), Bar(), Kpi(), SectionTitle(), api(), TONES, next

### Community 4 - "Anomaly detection and ROI math"
Cohesion: 0.26
Nodes (11): demo(), detect(), hour_of_week(), mad(), roi(), weekly_baseline(), Energy analytics: baseline, anomaly detection and ROI math. Baseline = median…, points: [(ts, kwh)] -> {hour_of_week: median kwh} (+3 more)

### Community 7 - "Security smoke test"
Cohesion: 0.25
Nodes (6): Security smoke test for the hardened API. Runs against a throwaway copy of the…, fastapi_testclient, os, shutil, sys, tempfile

### Community 2 - "Frontend dependencies"
Cohesion: 0.06
Nodes (35): allowScripts, sharp@0.35.5, @tailwindcss/oxide@4.1.13, dependencies, lucide-react, next, react, react-dom (+27 more)

### Community 6 - "TypeScript config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "README"
Cohesion: 0.20
Nodes (9): Design notes, Docker (both services), Enprove Iran — Energy Intelligence Platform, Layout, Local, Next steps (not built yet), Run it, Security (+1 more)

## Knowledge Gaps
- **93 isolated node(s):** `Dict`, `T`, `TKey`, `Kpi`, `MixRow` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 156 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Code graph` connect `Pages, charts and number formatting` to `API endpoints and data models`, `Layout, i18n lookup and landing`, `Audit report`?**
  _High betweenness centrality (0.426) - this node is a cross-community bridge._
- **Why does `Site` connect `API endpoints and data models` to `Pages, charts and number formatting`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `site_detail()` connect `API endpoints and data models` to `Pages, charts and number formatting`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **What connects `Dict`, `T`, `TKey` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API endpoints and data models` be split into smaller, more focused modules?**
  _Cohesion score 0.06224899598393574 - nodes in this community are weakly interconnected._
- **Should `Proxy, staff auth and API types` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._
- **Should `Frontend dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._