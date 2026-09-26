import { Card, Kpi, SectionTitle } from "@/components/ui";
import { MeasureTable } from "../sites/[slug]/page";
import { api, type Overview, type SiteDetail } from "@/lib/api";
import { energy, num, toman } from "@/lib/format";
import { getDict, type Locale, toLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Reports({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDict(locale);
  const overview = await api<Overview>("/api/overview?days=30");
  const details = await Promise.all(overview.sites.map((s) => api<SiteDetail>(`/api/sites/${s.slug}?days=30`)));

  const all = details.flatMap((d) => d.measures);
  const totalSaving = all.reduce((a, m) => a + m.saving_toman_year, 0);
  const totalCapex = all.reduce((a, m) => a + m.capex_toman, 0);
  const totalKwh = all.reduce((a, m) => a + m.saving_kwh_year, 0);
  const s = toman(totalSaving, locale);
  const c = toman(totalCapex, locale);
  const k = energy(totalKwh, locale);

  return (
    <div className="space-y-8">
      <SectionTitle title={t.reports_title} sub={t.reports_sub} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t.measure_saving} value={s.value} unit={t[s.unit]} tone="accent" />
        <Kpi label={t.measure_capex} value={c.value} unit={t[c.unit]} />
        <Kpi label={t.kpi_saving} value={k.value} unit={t[k.unit]} tone="accent" />
      </div>

      {details.map((d) => (
        <section key={d.site.slug}>
          <h3 className="mb-3 text-base font-bold">
            {locale === "fa" ? d.site.name_fa : d.site.name_en}
            <span className="ms-2 text-xs font-normal text-muted">
              {locale === "fa" ? d.site.city_fa : d.site.city_en} — {num(d.site.tariff_toman_kwh, locale)} {t.unit_toman}/{t.unit_kwh}
            </span>
          </h3>
          <MeasureTable locale={locale} measures={d.measures} />
        </section>
      ))}

      <Card className="p-5 text-xs leading-relaxed text-muted">{t.roi_note}</Card>
    </div>
  );
}
