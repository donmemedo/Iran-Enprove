const BASE = process.env.API_URL || "http://localhost:8100";

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export type Kpi = {
  kwh: number; cost: number; change_pct: number; co2_ton: number;
  verified_saving_kwh: number; verified_saving_toman: number;
  open_alerts: number; alert_cost_toman?: number; sites?: number; meters?: number; intensity?: number;
};
export type SiteRow = {
  id: number; slug: string; name_fa: string; name_en: string; city_fa: string; city_en: string;
  industry: string; area_m2: number; tariff_toman_kwh: number; onboarded_at: string;
  kwh: number; cost: number; change_pct: number; intensity: number; open_alerts: number;
};
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
  saving_toman_year: number; payback_months: number;
};
export type Overview = { days: number; kpi: Kpi; trend: Point[]; mix: MixRow[]; sites: SiteRow[] };
export type SiteDetail = {
  site: SiteRow; days: number; kpi: Kpi; trend: Point[]; mix: MixRow[];
  hourly: { hour: number; kw: number }[];
  meters: { id: number; name_fa: string; name_en: string; load_type: string; rated_kw: number; kwh: number; cost: number }[];
  alerts: AlertRow[]; measures: MeasureRow[];
};
