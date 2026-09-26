import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { Shell } from "@/components/nav";
import { getDict, isRtl, locales, type Locale, toLocale } from "@/lib/i18n";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#05070c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDict(locale);
  return {
    title: { default: `${t.brand} — ${t.tagline}`, template: `%s | ${t.brand}` },
    description: t.hero_sub,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: t.brandShort, statusBarStyle: "black-translucent" },
    icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  };
}

// runs before paint so the theme never flashes
const THEME_SCRIPT = `try{var s=localStorage.getItem('theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!locales.includes(rawLocale as Locale)) notFound();
  const locale = toLocale(rawLocale);

  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Shell locale={locale}>{children}</Shell>
      </body>
    </html>
  );
}
