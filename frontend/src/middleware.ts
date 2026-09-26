import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const wanted = req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = `/${wanted}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|fonts|icons|manifest.webmanifest|sw.js|favicon.ico).*)"] };
