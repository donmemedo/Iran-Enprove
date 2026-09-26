"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";

export function RangePicker({ locale, days }: { locale: Locale; days: number }) {
  const t = getDict(locale);
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const set = (d: number) => {
    const p = new URLSearchParams(params.toString());
    p.set("days", String(d));
    router.push(`${path}?${p.toString()}`);
  };

  return (
    <div className="glass inline-flex rounded-2xl p-1">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          onClick={() => set(d)}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            days === d ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-accent" : "text-muted hover:text-fg"
          }`}
        >
          {t[`range_${d}` as "range_7"]}
        </button>
      ))}
    </div>
  );
}
