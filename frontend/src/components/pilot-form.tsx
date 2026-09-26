"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Card } from "./ui";
import { getDict, type Locale } from "@/lib/i18n";

const field =
  "w-full rounded-2xl border bg-[color-mix(in_srgb,var(--fg)_4%,transparent)] px-4 py-3 text-sm outline-none transition placeholder:text-muted focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]";

export function PilotForm({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        company: String(f.get("company") ?? ""),
        contact: String(f.get("contact") ?? ""),
        phone: String(f.get("phone") ?? ""),
        email: String(f.get("email") ?? ""),
        city: String(f.get("city") ?? ""),
        sites: Number(f.get("sites") || 1),
        annual_bill_toman: Number(f.get("bill") || 0) * 1e6,
        note: String(f.get("note") ?? ""),
        locale,
      }),
    });
    setState(res.ok ? "ok" : "err");
  };

  if (state === "ok")
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="text-accent" size={40} />
        <p className="max-w-md text-sm">{t.f_ok}</p>
      </Card>
    );

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_company}</span>
          <input name="company" required className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_contact}</span>
          <input name="contact" required className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_phone}</span>
          <input name="phone" required inputMode="tel" dir="ltr" className={field} placeholder="09xx xxx xxxx" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            {t.f_email} <span className="opacity-60">({t.f_optional})</span>
          </span>
          <input name="email" type="email" dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_city}</span>
          <input name="city" className={field} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_sites}</span>
          <input name="sites" type="number" min={1} defaultValue={1} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_bill}</span>
          <input name="bill" type="number" min={0} step={100} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_note}</span>
          <textarea name="note" rows={3} className={field} />
        </label>

        {state === "err" && <p className="text-sm text-danger sm:col-span-2">{t.f_err}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(100deg, var(--accent), var(--accent-2))" }}
          >
            <Send size={16} />
            {state === "sending" ? t.f_sending : t.f_submit}
          </button>
        </div>
      </form>
    </Card>
  );
}
