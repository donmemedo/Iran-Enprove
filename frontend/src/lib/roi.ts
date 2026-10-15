// Port of backend/app/analytics.py roi(): the formula is ten lines, so the calculator runs it on
// every slider move with zero latency instead of a debounced round trip. scripts/roi-check.mjs keeps them equal.
export const CO2_KG_PER_KWH = 0.62;

export type Roi = {
  annual_saving_toman: number; year_one_cost_toman: number; net_year_one_toman: number;
  net_five_year_toman: number; payback_months: number | null; co2_ton_year: number; viable: boolean;
};

export function roi(annualBillToman: number, savingPct = 7, sites = 1, setupToman = 500_000_000, monthlyToman = 120_000_000): Roi {
  const annualSaving = (annualBillToman * savingPct) / 100;
  const yearOneCost = sites * (setupToman + monthlyToman * 12);
  const recurring = sites * monthlyToman * 12;
  const monthlyNet = (annualSaving - recurring) / 12;
  const payback = monthlyNet > 0 ? (sites * setupToman) / monthlyNet : null;
  return {
    annual_saving_toman: Math.round(annualSaving),
    year_one_cost_toman: Math.round(yearOneCost),
    net_year_one_toman: Math.round(annualSaving - yearOneCost),
    net_five_year_toman: Math.round(annualSaving * 5 - yearOneCost - recurring * 4),
    payback_months: payback ? Math.round(payback * 10) / 10 : null,
    co2_ton_year: Math.round(((annualSaving / 5_000) * CO2_KG_PER_KWH) / 1000 * 10) / 10,
    viable: monthlyNet > 0,
  };
}
