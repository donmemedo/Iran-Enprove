"use client";

import { useEffect, useState } from "react";
import { Leaf, TrendingUp, Wallet } from "lucide-react";
import { Card } from "./ui";
import { num, pctSign, toman } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";

type Roi = {
  annual_saving_toman: number; year_one_cost_toman: number; net_year_one_toman: number;
  net_five_year_toman: number; payback_months: number | null; co2_ton_year: number; viable: boolean;
};

export function RoiCalculator({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [bill, setBill] = useState(30000); // million Toman / year
  const [sites, setSites] = useState(1);
  const [savingPct, setSavingPct] = useState(7);
  const [roi, setRoi] = useState<Roi | null>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      const res = await fetch("/api/roi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ annual_bill_toman: bill * 1e6, saving_pct: savingPct, sites }),
      });
      if (res.ok) setRoi(await res.json());
    }, 220);
    return () => clearTimeout(id);
  }, [bill, sites, savingPct]);

  const money = (v: number) => {
    const m = toman(v, locale);
    return `${m.value} ${t[m.unit]}`;
  };

  return (
    <Card className="overflow-hidden p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>{t.roi_bill}</span>
              <span className="latin-nums font-bold text-accent">{num(bill, locale)}</span>
            </label>
            <input
              type="range" min={1000} max={120000} step={500} value={bill}
              onChange={(e) => setBill(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label={t.roi_bill}
            />
          </div>
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>{t.roi_sites}</span>
              <span className="latin-nums font-bold text-accent">{num(sites, locale)}</span>
            </label>
            <input
              type="range" min={1} max={12} step={1} value={sites}
              onChange={(e) => setSites(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label={t.roi_sites}
            />
          </div>
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>{t.roi_pct}</span>
              <span className="latin-nums font-bold text-accent">{num(savingPct, locale)}{pctSign(locale)}</span>
            </label>
            <input
              type="range" min={3} max={15} step={1} value={savingPct}
              onChange={(e) => setSavingPct(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label={t.roi_pct}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted">{t.roi_note}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 self-start">
          <Metric icon={<TrendingUp size={16} />} label={t.roi_annual_saving} value={roi ? money(roi.annual_saving_toman) : "…"} tone="accent" />
          <Metric icon={<Wallet size={16} />} label={t.roi_year_one_cost} value={roi ? money(roi.year_one_cost_toman) : "…"} />
          <Metric
            label={t.roi_net_year_one}
            value={roi ? money(roi.net_year_one_toman) : "…"}
            tone={roi && roi.net_year_one_toman > 0 ? "accent" : "danger"}
          />
          <Metric
            label={t.roi_payback}
            value={roi?.payback_months ? `${num(roi.payback_months, locale, 1)} ${t.roi_months}` : "—"}
          />
          <Metric label={t.roi_five_year} value={roi ? money(roi.net_five_year_toman) : "…"} tone="accent" />
          <Metric icon={<Leaf size={16} />} label={t.roi_co2} value={roi ? `${num(roi.co2_ton_year, locale, 1)} ${t.unit_ton}` : "…"} />
          {roi && !roi.viable && (
            <p className="col-span-2 rounded-2xl bg-[color-mix(in_srgb,var(--warn)_14%,transparent)] p-3 text-xs text-warn">
              {t.roi_not_viable}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: "accent" | "danger"; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: "color-mix(in srgb, var(--fg) 3%, transparent)" }}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        {icon}
        {label}
      </div>
      <div
        className={`latin-nums mt-1.5 text-lg font-extrabold ${tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
