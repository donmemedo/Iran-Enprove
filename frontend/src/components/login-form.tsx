"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { Card } from "./ui";
import { num } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";
import { retryMinutes, staffChanged } from "@/lib/use-staff";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = String(new FormData(e.currentTarget).get("token") ?? "");
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        staffChanged();
        router.push(`/${locale}/alerts`);
        router.refresh();
        return;
      }
      setError(
        res.status === 429 ? t.login_locked.replace("{m}", num(retryMinutes(res), locale))
        : res.status === 401 ? t.login_wrong
        : t.action_failed,
      );
    } catch {
      setError(t.action_failed);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={submit} className="grid gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t.login_token}</span>
          <input name="token" type="password" required autoComplete="current-password" dir="ltr" maxLength={256} className="field" />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={sending} className="btn-primary">
          <LogIn size={16} /> {sending ? t.loading : t.login_submit}
        </button>
      </form>
    </Card>
  );
}
