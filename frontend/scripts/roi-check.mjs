// The calculator runs src/lib/roi.ts in the browser; it must match backend/app/analytics.py roi().
// Expected values below were produced by the Python function. Run: node scripts/roi-check.mjs (Node >= 23.6)
import assert from "node:assert/strict";
import { roi } from "../src/lib/roi.ts";

const cases = [
  [[40e9, 8, 1], { annual_saving_toman: 3200000000, year_one_cost_toman: 1940000000, net_year_one_toman: 1260000000, net_five_year_toman: 8300000000, payback_months: 3.4, co2_ton_year: 396.8, viable: true }],
  [[30000e6, 7, 1], { annual_saving_toman: 2100000000, year_one_cost_toman: 1940000000, net_year_one_toman: 160000000, net_five_year_toman: 2800000000, payback_months: 9.1, co2_ton_year: 260.4, viable: true }],
  [[1e9, 3, 1], { annual_saving_toman: 30000000, year_one_cost_toman: 1940000000, net_year_one_toman: -1910000000, net_five_year_toman: -7550000000, payback_months: null, co2_ton_year: 3.7, viable: false }],
  [[120000e6, 15, 12], { annual_saving_toman: 18000000000, year_one_cost_toman: 23280000000, net_year_one_toman: -5280000000, net_five_year_toman: -2400000000, payback_months: 100, co2_ton_year: 2232, viable: true }],
  [[5e9, 10, 3], { annual_saving_toman: 500000000, year_one_cost_toman: 5820000000, net_year_one_toman: -5320000000, net_five_year_toman: -20600000000, payback_months: null, co2_ton_year: 62, viable: false }],
];
for (const [args, want] of cases) assert.deepEqual(roi(...args), want, JSON.stringify(args));
console.log(`roi check ok: ${cases.length} cases match analytics.py`);
