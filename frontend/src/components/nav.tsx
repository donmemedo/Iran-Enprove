"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle, FileBarChart, Gauge, Home, Languages, Factory, Menu, Moon, Rocket, Sun, X,
} from "lucide-react";
import { Logo } from "./logo";
import { getDict, isRtl, type Locale } from "@/lib/i18n";

const ITEMS = [
  { href: "", key: "nav_home", Icon: Home },
  { href: "/dashboard", key: "nav_dashboard", Icon: Gauge },
  { href: "/sites", key: "nav_sites", Icon: Factory },
  { href: "/alerts", key: "nav_alerts", Icon: AlertTriangle },
  { href: "/reports", key: "nav_reports", Icon: FileBarChart },
  { href: "/pilot", key: "nav_pilot", Icon: Rocket },
] as const;

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };
  return { dark, toggle };
}

export function Shell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = getDict(locale);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const rtl = isRtl(locale);

  const active = (href: string) => {
    const full = `/${locale}${href}`;
    return href === "" ? path === full : path.startsWith(full);
  };
  const otherLocale = locale === "fa" ? "en" : "fa";
  const swapped = path.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;

  useEffect(() => setOpen(false), [path]);

  const nav = (compact = false) => (
    <nav className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1"}>
      {ITEMS.map(({ href, key, Icon }) => (
        <Link
          key={key}
          href={`/${locale}${href}`}
          className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition
            ${active(href)
              ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent"
              : "text-muted hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)] hover:text-fg"}`}
        >
          <Icon size={18} className="shrink-0" />
          <span className="truncate">{t[key]}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="relative z-10 flex min-h-dvh">
      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between p-4 lg:flex">
        <div>
          <Link href={`/${locale}`} className="mb-6 flex items-center gap-3 px-2">
            <Logo />
            <div className="leading-tight">
              <div className="text-sm font-extrabold">{t.brand}</div>
              <div className="text-[11px] text-muted">{t.tagline}</div>
            </div>
          </Link>
          {nav()}
        </div>
        <div className="glass flex items-center justify-between gap-2 rounded-2xl p-2">
          <button onClick={toggle} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted transition hover:text-fg" aria-label={dark ? t.theme_light : t.theme_dark}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? t.theme_light : t.theme_dark}
          </button>
          <Link href={swapped} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted transition hover:text-fg">
            <Languages size={16} />
            {t.lang_switch}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile bar */}
        <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-extrabold">{t.brand}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="rounded-xl p-2 text-muted" aria-label={dark ? t.theme_light : t.theme_dark}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href={swapped} className="rounded-xl p-2 text-muted" aria-label={t.lang_switch}>
              <Languages size={18} />
            </Link>
            <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-muted" aria-label={t.menu}>
              <Menu size={20} />
            </button>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className={`glass absolute top-0 ${rtl ? "right-0" : "left-0"} h-full w-72 p-4`}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-extrabold">{t.brand}</span>
                <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted" aria-label={t.close}>
                  <X size={18} />
                </button>
              </div>
              {nav(true)}
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="mx-auto w-full max-w-7xl px-4 pb-10 text-xs text-muted sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-5">
            <span>© {new Date().getFullYear()} {t.brand}</span>
            <span className="max-w-xl">{t.footer_note}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
