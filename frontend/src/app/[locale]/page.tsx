import Link from "next/link";
import { ArrowLeft, ArrowRight, Activity, BarChart3, Cloud, Cpu, Database, Gauge, Leaf, ShieldCheck, Zap } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { RoiCalculator } from "@/components/roi-calculator";
import { api, type Overview } from "@/lib/api";
import { energy, num, toman } from "@/lib/format";
import { getDict, isRtl, type Locale, toLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const OFFERS = [
  { t: "offer_1_t", d: "offer_1_d", Icon: Activity },
  { t: "offer_2_t", d: "offer_2_d", Icon: BarChart3 },
  { t: "offer_3_t", d: "offer_3_d", Icon: ShieldCheck },
] as const;

const TRENDS = [
  { k: "trend_1", Icon: Leaf },
  { k: "trend_2", Icon: Gauge },
  { k: "trend_3", Icon: Cloud },
  { k: "trend_4", Icon: Database },
  { k: "trend_5", Icon: Cpu },
] as const;

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDict(locale);
  const Arrow = isRtl(locale) ? ArrowLeft : ArrowRight;

  let live: Overview | null = null;
  try {
    live = await api<Overview>("/api/overview?days=30");
  } catch {}

  const monitored = live ? energy(live.kpi.kwh, locale) : null;
  const removable = live ? toman(live.kpi.alert_cost_toman ?? 0, locale) : null;

  return (
    <div className="space-y-24 pb-8">
      {/* hero */}
      <section className="rise pt-6 sm:pt-12">
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-accent">
          <Zap size={14} /> {t.hero_badge}
        </span>
        <h1 className="mt-6 text-4xl font-black leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">
          {t.hero_title_1} <br className="hidden sm:block" />
          <span className="grad-text">{t.hero_title_2}</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{t.hero_sub}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/pilot`}
            className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-xl transition hover:opacity-90"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            {t.hero_cta} <Arrow size={16} />
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="glass inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition hover:opacity-80"
          >
            {t.hero_cta2}
          </Link>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-xs text-muted">{t.hero_stat_1}</div>
            <div className="latin-nums mt-1 text-3xl font-extrabold grad-text">{locale === "fa" ? "۳ تا ۱۰٪" : "3–10%"}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs text-muted">{t.hero_stat_2}</div>
            <div className="latin-nums mt-1 text-3xl font-extrabold grad-text">{num(6, locale)}×</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs text-muted">{t.hero_stat_3}</div>
            <div className="mt-1 text-2xl font-extrabold grad-text">{t.hero_stat_3_v}</div>
          </Card>
        </div>

        {live && monitored && removable && (
          <Card className="mt-3 flex flex-wrap items-center justify-between gap-4 p-5">
            <LiveStat label={t.kpi_energy} value={`${monitored.value} ${t[monitored.unit]}`} />
            <LiveStat label={t.kpi_sites} value={num(live.kpi.sites ?? 0, locale)} />
            <LiveStat label={t.kpi_meters} value={num(live.kpi.meters ?? 0, locale)} />
            <LiveStat label={t.kpi_alerts} value={num(live.kpi.open_alerts, locale)} tone />
            <LiveStat label={t.kpi_alert_cost} value={`${removable.value} ${t[removable.unit]}`} tone />
          </Card>
        )}
      </section>

      {/* offerings */}
      <section>
        <SectionTitle title={t.offer_title} sub={t.offer_sub} />
        <div className="grid gap-4 md:grid-cols-3">
          {OFFERS.map(({ t: title, d, Icon }) => (
            <Card key={title} className="card-hover p-6">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
              >
                <Icon className="text-accent" size={22} />
              </div>
              <h3 className="text-lg font-bold">{t[title]}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t[d]}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* trends */}
      <section>
        <SectionTitle title={t.trend_title} />
        <div className="flex flex-wrap gap-3">
          {TRENDS.map(({ k, Icon }) => (
            <span key={k} className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium">
              <Icon size={16} className="text-accent" />
              {t[k]}
            </span>
          ))}
        </div>
      </section>

      {/* roi */}
      <section>
        <SectionTitle title={t.roi_title} sub={t.roi_sub} />
        <RoiCalculator locale={locale} />
      </section>

      {/* closing cta */}
      <section>
        <Card className="relative overflow-hidden p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "var(--accent)", opacity: 0.18 }}
          />
          <h2 className="max-w-2xl text-2xl font-black tracking-tight sm:text-4xl">{t.case_title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{t.case_sub}</p>
          <Link
            href={`/${locale}/pilot`}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-xl transition hover:opacity-90"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            {t.hero_cta} <Arrow size={16} />
          </Link>
        </Card>
      </section>
    </div>
  );
}

function LiveStat({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`latin-nums text-lg font-extrabold ${tone ? "text-warn" : ""}`}>{value}</div>
    </div>
  );
}
