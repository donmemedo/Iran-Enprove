import { Badge, Card } from "./ui";
import { energy, num, toman } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";
import type { MeasureRow } from "@/lib/api";

export function MeasureTable({ locale, measures }: { locale: Locale; measures: MeasureRow[] }) {
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
                <td className="latin-nums p-4">{m.payback_months == null ? "—" : `${num(m.payback_months, locale, 1)} ${t.roi_months}`}</td>
                <td className="p-4"><Badge tone={tone[m.status as keyof typeof tone]}>{t[`m_${m.status}` as "m_done"]}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
