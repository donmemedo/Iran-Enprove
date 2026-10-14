export const BASE = process.env.API_URL || "http://localhost:8100";
export const PROXY_SECRET = process.env.PROXY_SECRET || "";
export const STAFF_COOKIE = "enprove_staff";

/** Visitor IP for per-person rate limits, only behind a reverse proxy that sets it (TRUST_PROXY=1).
 *  X-Real-IP is overwritten by the proxy; otherwise take the rightmost X-Forwarded-For entry, the one
 *  our proxy appended. Without TRUST_PROXY a client could rotate fake IPs, so the API uses one shared bucket. */
export function visitorIp(h: Headers): string | null {
  if (process.env.TRUST_PROXY !== "1") return null;
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").pop()?.trim();
  return ip ? ip.slice(0, 64) : null;
}

/** Server-side read of the API. Cached for a minute per URL: meter data is hourly, and the cache
 *  turns a burst of page views into one upstream request. */
export async function api<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json", "x-proxy-key": PROXY_SECRET },
    next: { revalidate },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export type Kpi = {
  kwh: number; cost: number; change_pct: number; co2_ton: number;
  verified_saving_kwh: number; verified_saving_toman: number;
  open_alerts: number; alert_cost_toman?: number; sites?: number; meters?: number; intensity?: number;
};
export type SiteInfo = {
  id: number; slug: string; name_fa: string; name_en: string; city_fa: string; city_en: string;
  industry: string; area_m2: number; tariff_toman_kwh: number; onboarded_at: string;
};
export type SiteRow = SiteInfo & { kwh: number; cost: number; change_pct: number; intensity: number; open_alerts: number };
export type Point = { date: string; kwh: number; cost: number };
export type MixRow = { load_type: string; kwh: number; pct: number };
export type AlertRow = {
  id: number; site_id: number; meter_id: number; kind: string; severity: string;
  detected_at: string; deviation_pct: number; est_cost_toman: number; status: string;
  site_slug?: string; site_name_fa?: string; site_name_en?: string;
  meter_fa?: string; meter_en?: string; load_type?: string;
};
export type MeasureRow = {
  id: number; key: string; saving_kwh_year: number; capex_toman: number; status: string;
  saving_toman_year: number; payback_months: number | null;
};
export type SiteMeasures = { site: SiteInfo; measures: MeasureRow[] };
export type Overview = { days: number; kpi: Kpi; trend: Point[]; mix: MixRow[]; sites: SiteRow[] };
export type SiteDetail = {
  site: SiteRow; days: number; kpi: Kpi; trend: Point[]; mix: MixRow[];
  hourly: { hour: number; kw: number }[];
  meters: { id: number; name_fa: string; name_en: string; load_type: string; rated_kw: number; kwh: number; cost: number }[];
  alerts: AlertRow[]; measures: MeasureRow[];
};
