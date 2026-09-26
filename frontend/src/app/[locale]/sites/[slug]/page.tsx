import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Leaf, PiggyBank, Zap, Gauge } from "lucide-react";
import { Badge, Bar, Card, Kpi, SectionTitle } from "@/components/ui";
import { HourlyBars, MixDonut, TrendChart } from "@/components/charts";
import { RangePicker } from "@/components/range-picker";
import { AlertsTable } from "@/components/alerts-table";
import { api, type SiteDetail } from "@/lib/api";
import { energy, fullDate, num, pct, toman } from "@/lib/format";
import { getDict, isRtl, type Locale, toLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const { days: raw } = await searchParams;
  const days = [7, 30, 90].includes(Number(raw)) ? Number(raw) : 30;
  const t = getDict(locale);

  let d: SiteDetail;
  try {
    d = await api<SiteDetail>(`/api/sites/${slug}?days=${days}`);
  } catch {
    notFound();
  }

  const Back = isRtl(locale) ? ArrowRight : ArrowLeft;
  const e = energy(d.kpi.kwh, locale);
  const c = toman(d.kpi.cost, locale);
  const maxMeter = Math.max(...d.meters.map((m) => m.kwh), 1);

  return (
    <div className="space-y-8">
      <Link href={`/${locale}/sites`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-fg">
        <Back size={14} /> {t.site_back}
      </Link>

      <SectionTitle
        title={locale === "fa" ? d.site.name_fa : d.site.name_en}
        sub={`${locale === "fa" ? d.site.city_fa : d.site.city_en} — ${num(d.site.area_m2, locale)} ${t.unit_m2} — ${t.site_since} ${fullDate(d.site.onboarded_at, locale)}`}
        action={<RangePicker locale={locale} days={days} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t.kpi_energy} value={e.value} unit={t[e.unit]} icon={<Zap size={16} />}
          delta={{ text: `${pct(d.kpi.change_pct, locale)} ${t.vs_prev}`, good: d.kpi.change_pct <= 0 }} />
        <Kpi label={t.kpi_cost} value={c.value} unit={t[c.unit]} icon={<Gauge size={16} />} />
        <Kpi label={t.kpi_intensity} value={num(d.kpi.intensity ?? 0, locale, 2)} unit={t.per_m2} icon={<PiggyBank size={16} />} />
        <Kpi label={t.kpi_co2} value={num(d.kpi.co2_ton, locale, 1)} unit={t.unit_ton} tone="warn" icon={<Leaf size={16} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold">{t.chart_trend}</h3>
          <TrendChart data={d.trend} locale={locale} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold">{t.chart_mix}</h3>
          <MixDonut data={d.mix} locale={locale} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold">{t.chart_hourly}</h3>
          <HourlyBars data={d.hourly} locale={locale} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold">{t.site_meters}</h3>
          <div className="space-y-4">
            {d.meters.map((m) => {
              const me = energy(m.kwh, locale);
              return (
                <div key={m.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{locale === "fa" ? m.name_fa : m.name_en}</span>
                    <span className="latin-nums text-xs font-bold">{me.value} {t[me.unit]}</span>
                  </div>
                  <Bar pct={(m.kwh / maxMeter) * 100} />
                  <div className="mt-1 text-[11px] text-muted">{num(m.rated_kw, locale, 1)} {t.unit_kw}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <section>
        <SectionTitle title={t.alerts_title} sub={t.alerts_sub} />
        <AlertsTable locale={locale} rows={d.alerts} />
      </section>

      <section>
        <SectionTitle title={t.site_measures} sub={t.reports_sub} />
        <MeasureTable locale={locale} measures={d.measures} />
      </section>
    </div>
  );
}

export function MeasureTable({ locale, measures }: { locale: Locale; measures: SiteDetail["measures"] }) {
  const t = getDict(locale);
  const tone = { proposed: "muted", in_progress: "warn", done: "accent" } as const;
  return (
    <Card className="overflow-x-auto p-1">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-start text-xs text-muted">
            <th className="p-4 text-start font-medium">{t.measure_name}</th>
            <th className="p-4 text-start font-medium">{t.measure_saving}</th>
            <th className="p-4 text-start font-medium">{t.measure_capex}</th>
            <th className="p-4 text-start font-medium">{t.measure_payback}</th>
            <th className="p-4 text-start font-medium">{t.measure_status}</th>
          </tr>
        </thead>
        <tbody>
          {measures.map((m) => {
            const sav = toman(m.saving_toman_year, locale);
            const cap = toman(m.capex_toman, locale);
            const kwh = energy(m.saving_kwh_year, locale);
            return (
              <tr key={m.id} className="border-t">
                <td className="p-4 font-semibold">
                  {t[`measure_${m.key}` as "measure_leak_repair"] ?? m.key}
                  <div className="text-[11px] font-normal text-muted">{kwh.value} {t[kwh.unit]}</div>
                </td>
                <td className="latin-nums p-4 font-bold text-accent">{sav.value} <span className="text-[11px] font-medium text-muted">{t[sav.unit]}</span></td>
                <td className="latin-nums p-4">{cap.value} <span className="text-[11px] text-muted">{t[cap.unit]}</span></td>
                <td className="latin-nums p-4">{num(m.payback_months, locale, 1)} {t.roi_months}</td>
                <td className="p-4"><Badge tone={tone[m.status as keyof typeof tone]}>{t[`m_${m.status}` as "m_done"]}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
