"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Card } from "./ui";
import { num } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";
import { retryMinutes } from "@/lib/use-staff";

// Inline validation is the browser's own: the attributes below mirror the API's Pydantic rules, and
// globals.css shows each field's .hint once it is :user-invalid, so people see the problem on blur,
// not after submit.
export function PilotForm({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [state, setState] = useState<"idle" | "sending" | "ok">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
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
          website: String(f.get("website") ?? ""), // honeypot, see below
        }),
      });
      if (res.ok) return setState("ok");
      setError(res.status === 429 ? t.rate_limited.replace("{m}", num(retryMinutes(res), locale)) : res.status === 422 ? t.f_err : t.action_failed);
    } catch {
      setError(t.action_failed);
    }
    setState("idle");
  };

  if (state === "ok")
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center" role="status">
        <CheckCircle2 className="text-accent" size={40} />
        <p className="max-w-md text-sm">{t.f_ok}</p>
      </Card>
    );

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_company}</span>
          <input name="company" required minLength={2} maxLength={120} className="field" />
          <span className="hint">{t.f_min2}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_contact}</span>
          <input name="contact" required minLength={2} maxLength={120} autoComplete="name" className="field" />
          <span className="hint">{t.f_min2}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_phone}</span>
          <input name="phone" required inputMode="tel" autoComplete="tel" dir="ltr" minLength={8} maxLength={20}
            pattern="\+?[0-9۰-۹][0-9۰-۹ \-]{6,18}[0-9۰-۹]" className="field" placeholder="09xx xxx xxxx" />
          <span className="hint">{t.f_phone_hint}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            {t.f_email} <span className="opacity-60">({t.f_optional})</span>
          </span>
          <input name="email" type="email" autoComplete="email" dir="ltr" maxLength={254} className="field" />
          <span className="hint">{t.f_email_hint}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_city}</span>
          <input name="city" maxLength={80} autoComplete="address-level2" className="field" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_sites}</span>
          <input name="sites" type="number" min={1} max={500} defaultValue={1} className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_bill}</span>
          <input name="bill" type="number" min={0} max={1e9} step={100} className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.f_note}</span>
          <textarea name="note" rows={3} maxLength={1000} className="field" />
        </label>
        {/* honeypot: hidden from people and screen readers, bots fill it and the API drops the lead */}
        <div className="hp" aria-hidden="true">
          <label>website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>

        {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button type="submit" disabled={state === "sending"} className="btn-primary">
            <Send size={16} />
            {state === "sending" ? t.f_sending : t.f_submit}
          </button>
        </div>
      </form>
    </Card>
  );
}
