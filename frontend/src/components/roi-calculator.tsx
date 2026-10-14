"use client";

import { useMemo, useState } from "react";
import { Leaf, TrendingUp, Wallet } from "lucide-react";
import { Card } from "./ui";
import { num, pctSign, toman } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";
import { roi as computeRoi } from "@/lib/roi";

export function RoiCalculator({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [bill, setBill] = useState(30000); // million Toman / year
  const [sites, setSites] = useState(1);
  const [savingPct, setSavingPct] = useState(7);
  // computed locally: the result tracks the slider 1:1 instead of arriving 220 ms + a round trip later
  const roi = useMemo(() => computeRoi(bill * 1e6, savingPct, sites), [bill, sites, savingPct]);

  const money = (v: number) => {
    const m = toman(v, locale);
    return `${m.value} ${t[m.unit]}`;
  };

  return (
    <Card className="overflow-hidden p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Slider label={t.roi_bill} shown={num(bill, locale)} min={1000} max={120000} step={500} value={bill} onChange={setBill} />
          <Slider label={t.roi_sites} shown={num(sites, locale)} min={1} max={12} step={1} value={sites} onChange={setSites} />
          <Slider label={t.roi_pct} shown={`${num(savingPct, locale)}${pctSign(locale)}`} min={3} max={15} step={1} value={savingPct} onChange={setSavingPct} />
          <p className="text-xs leading-relaxed text-muted">{t.roi_note}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 self-start" aria-live="polite">
          <Metric icon={<TrendingUp size={16} />} label={t.roi_annual_saving} value={money(roi.annual_saving_toman)} tone="accent" />
          <Metric icon={<Wallet size={16} />} label={t.roi_year_one_cost} value={money(roi.year_one_cost_toman)} />
          <Metric label={t.roi_net_year_one} value={money(roi.net_year_one_toman)} tone={roi.net_year_one_toman > 0 ? "accent" : "danger"} />
          <Metric label={t.roi_payback} value={roi.payback_months ? `${num(roi.payback_months, locale, 1)} ${t.roi_months}` : "—"} />
          <Metric label={t.roi_five_year} value={money(roi.net_five_year_toman)} tone="accent" />
          <Metric icon={<Leaf size={16} />} label={t.roi_co2} value={`${num(roi.co2_ton_year, locale, 1)} ${t.unit_ton}`} />
          {!roi.viable && (
            <p className="col-span-2 rounded-2xl bg-[color-mix(in_srgb,var(--warn)_14%,transparent)] p-3 text-xs text-warn">
              {t.roi_not_viable}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Slider({ label, shown, value, onChange, ...range }: {
  label: string; shown: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="latin-nums font-bold text-accent">{shown}</span>
      </label>
      <input type="range" {...range} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-label={label} />
    </div>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: "accent" | "danger"; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: "color-mix(in srgb, var(--fg) 3%, transparent)" }}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        {icon}
        {label}
      </div>
      <div className={`latin-nums mt-1.5 text-lg font-extrabold ${tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </div>
    </div>
  );
}
