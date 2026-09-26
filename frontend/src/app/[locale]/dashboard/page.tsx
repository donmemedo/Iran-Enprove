import Link from "next/link";
import { AlertTriangle, Factory, Gauge, Leaf, PiggyBank, Zap } from "lucide-react";
import { Card, Kpi, SectionTitle, Bar, Badge } from "@/components/ui";
import { MixDonut, TrendChart } from "@/components/charts";
import { RangePicker } from "@/components/range-picker";
import { api, type AlertRow, type Overview } from "@/lib/api";
import { energy, num, pct, pctSign, shortDate, toman } from "@/lib/format";
import { getDict, type Locale, toLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const { days: raw } = await searchParams;
  const days = [7, 30, 90].includes(Number(raw)) ? Number(raw) : 30;
  const t = getDict(locale);

  const [data, alerts] = await Promise.all([
    api<Overview>(`/api/overview?days=${days}`),
    api<AlertRow[]>("/api/alerts?status=open"),
  ]);

  const e = energy(data.kpi.kwh, locale);
  const c = toman(data.kpi.cost, locale);
  const s = toman(data.kpi.verified_saving_toman, locale);
  const a = toman(data.kpi.alert_cost_toman ?? 0, locale);
  const maxCost = Math.max(...data.sites.map((x) => x.cost), 1);

  return (
    <div className="space-y-8">
      <SectionTitle
        title={t.nav_dashboard}
        sub={t.sites_sub}
        action={<RangePicker locale={locale} days={days} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label={t.kpi_energy} value={e.value} unit={t[e.unit]} icon={<Zap size={16} />}
          delta={{ text: `${pct(data.kpi.change_pct, locale)} ${t.vs_prev}`, good: data.kpi.change_pct <= 0 }}
        />
        <Kpi label={t.kpi_cost} value={c.value} unit={t[c.unit]} icon={<Gauge size={16} />} tone="accent" />
        <Kpi label={t.kpi_saving} value={s.value} unit={t[s.unit]} icon={<PiggyBank size={16} />} tone="accent" />
        <Kpi
          label={t.kpi_alerts} value={num(data.kpi.open_alerts, locale)}
          unit={`${a.value} ${t[a.unit]} ${t.kpi_alert_cost}`} tone="danger" icon={<AlertTriangle size={16} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold">{t.chart_trend}</h3>
          <TrendChart data={data.trend} locale={locale} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold">{t.chart_mix}</h3>
          <MixDonut data={data.mix} locale={locale} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold">{t.sites_title}</h3>
          <div className="space-y-4">
            {data.sites.map((site) => {
              const sc = toman(site.cost, locale);
              return (
                <Link key={site.slug} href={`/${locale}/sites/${site.slug}?days=${days}`} className="block rounded-2xl p-2 transition hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <Factory size={15} className="shrink-0 text-muted" />
                      <span className="truncate">{locale === "fa" ? site.name_fa : site.name_en}</span>
                      {site.open_alerts > 0 && <Badge tone="danger">{num(site.open_alerts, locale)}</Badge>}
                    </span>
                    <span className="latin-nums shrink-0 font-bold">
                      {sc.value} <span className="text-[11px] font-medium text-muted">{t[sc.unit]}</span>
                    </span>
                  </div>
                  <Bar pct={(site.cost / maxCost) * 100} tone={site.change_pct > 8 ? "danger" : "accent"} />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                    <span>{locale === "fa" ? site.city_fa : site.city_en}</span>
                    <span className={site.change_pct > 0 ? "text-danger" : "text-accent"}>{pct(site.change_pct, locale)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">{t.alerts_title}</h3>
            <Link href={`/${locale}/alerts`} className="text-xs font-semibold text-accent">{t.site_view}</Link>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 6).map((al) => {
              const ac = toman(al.est_cost_toman, locale);
              return (
                <div key={al.id} className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span className="truncate">{t[`kind_${al.kind}` as "kind_leak"]}</span>
                    <span className="latin-nums shrink-0 text-danger">+{num(al.deviation_pct, locale, 0)}{pctSign(locale)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted">
                    <span className="truncate">{locale === "fa" ? al.site_name_fa : al.site_name_en}</span>
                    <span>{shortDate(al.detected_at, locale)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-warn">{ac.value} {t[ac.unit]}</div>
                </div>
              );
            })}
            {!alerts.length && <p className="py-6 text-center text-sm text-muted">{t.alert_none}</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t.kpi_co2} value={num(data.kpi.co2_ton, locale, 1)} unit={t.unit_ton} icon={<Leaf size={16} />} tone="warn" />
        <Kpi label={t.kpi_sites} value={num(data.kpi.sites ?? 0, locale)} icon={<Factory size={16} />} />
        <Kpi label={t.kpi_meters} value={num(data.kpi.meters ?? 0, locale)} icon={<Gauge size={16} />} />
      </div>
    </div>
  );
}
