import Link from "next/link";
import { ArrowLeft, ArrowRight, Factory } from "lucide-react";
import { Badge, Bar, Card, SectionTitle } from "@/components/ui";
import { RangePicker } from "@/components/range-picker";
import { api, type SiteRow } from "@/lib/api";
import { energy, num, pct, toman } from "@/lib/format";
import { getDict, isRtl, type Locale, toLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Sites({
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
  const sites = await api<SiteRow[]>(`/api/sites?days=${days}`);
  const Arrow = isRtl(locale) ? ArrowLeft : ArrowRight;
  const maxCost = Math.max(...sites.map((s) => s.cost), 1);

  return (
    <div className="space-y-6">
      <SectionTitle title={t.sites_title} sub={t.sites_sub} action={<RangePicker locale={locale} days={days} />} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sites.map((s) => {
          const e = energy(s.kwh, locale);
          const c = toman(s.cost, locale);
          return (
            <Card key={s.slug} className="card-hover flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{locale === "fa" ? s.name_fa : s.name_en}</h3>
                  <p className="mt-0.5 text-xs text-muted">{locale === "fa" ? s.city_fa : s.city_en}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}>
                  <Factory size={18} className="text-accent" />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted">{t.kpi_energy}</div>
                  <div className="latin-nums font-bold">{e.value} <span className="text-[11px] font-medium text-muted">{t[e.unit]}</span></div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">{t.kpi_cost}</div>
                  <div className="latin-nums font-bold">{c.value} <span className="text-[11px] font-medium text-muted">{t[c.unit]}</span></div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">{t.kpi_intensity}</div>
                  <div className="latin-nums font-bold">{num(s.intensity, locale, 2)} <span className="text-[11px] font-medium text-muted">{t.per_m2}</span></div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">{t.kpi_change}</div>
                  <div className={`latin-nums font-bold ${s.change_pct > 0 ? "text-danger" : "text-accent"}`}>{pct(s.change_pct, locale)}</div>
                </div>
              </div>

              <div className="mt-4"><Bar pct={(s.cost / maxCost) * 100} tone={s.open_alerts ? "danger" : "accent"} /></div>

              <div className="mt-4 flex items-center justify-between">
                {s.open_alerts > 0
                  ? <Badge tone="danger">{num(s.open_alerts, locale)} {t.kpi_alerts}</Badge>
                  : <Badge tone="accent">{t.alert_none}</Badge>}
                <Link href={`/${locale}/sites/${s.slug}?days=${days}`} className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                  {t.site_view} <Arrow size={14} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
