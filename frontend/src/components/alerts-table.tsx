"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, Clock } from "lucide-react";
import { Badge, Card, Empty } from "./ui";
import { num, pctSign, shortDate, toman } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";
import { retryMinutes, useStaff } from "@/lib/use-staff";
import type { AlertRow } from "@/lib/api";

const SEV_TONE = { high: "danger", medium: "warn", low: "muted" } as const;

export function AlertsTable({ locale, rows }: { locale: Locale; rows: AlertRow[] }) {
  const t = getDict(locale);
  const staff = useStaff(); // ack/resolve need the staff token; anonymous visitors never see the buttons
  const [items, setItems] = useState(rows);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const patch = async (id: number, status: string) => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      else setError(res.status === 401 ? t.staff_only : res.status === 429 ? t.rate_limited.replace("{m}", num(retryMinutes(res), locale)) : t.action_failed);
    } catch {
      setError(t.action_failed);
    } finally {
      setBusy(null);
    }
  };

  if (!items.length) return <Empty text={t.alert_none} />;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-2xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-danger">
          {error} {error === t.staff_only && <Link href={`/${locale}/login`} className="font-bold underline">{t.nav_login}</Link>}
        </p>
      )}
      {items.map((a) => {
        const cost = toman(a.est_cost_toman, locale);
        return (
          <Card key={a.id} className="card-hover p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: `color-mix(in srgb, var(--${a.severity === "high" ? "danger" : "warn"}) 16%, transparent)` }}
              >
                <AlertTriangle size={20} className={a.severity === "high" ? "text-danger" : "text-warn"} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t[`kind_${a.kind}` as "kind_leak"]}</span>
                  <Badge tone={SEV_TONE[a.severity as keyof typeof SEV_TONE]}>{t[`sev_${a.severity}` as "sev_high"]}</Badge>
                  <Badge tone={a.status === "open" ? "danger" : a.status === "ack" ? "warn" : "accent"}>
                    {t[`status_${a.status}` as "status_open"]}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-muted">
                  {locale === "fa" ? a.site_name_fa : a.site_name_en} — {locale === "fa" ? a.meter_fa : a.meter_en}
                  <span className="mx-2 opacity-40">|</span>
                  <Clock size={12} className="inline" /> {shortDate(a.detected_at, locale)}
                </div>
              </div>

              <div className="flex items-center gap-5 sm:gap-7">
                <div>
                  <div className="text-[11px] text-muted">{t.alert_deviation}</div>
                  <div className="latin-nums font-bold text-danger">+{num(a.deviation_pct, locale, 1)}{pctSign(locale)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted">{t.alert_cost}</div>
                  <div className="latin-nums font-bold">
                    {cost.value} <span className="text-[11px] font-medium text-muted">{t[cost.unit]}</span>
                  </div>
                </div>
              </div>

              {staff === true && (
                <div className="flex gap-2">
                  {a.status === "open" && (
                    <button disabled={busy === a.id} onClick={() => patch(a.id, "ack")} className="btn-ghost">
                      {t.alert_ack}
                    </button>
                  )}
                  {a.status !== "resolved" && (
                    <button disabled={busy === a.id} onClick={() => patch(a.id, "resolved")} className="btn-tint">
                      <Check size={14} /> {t.alert_resolve}
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
