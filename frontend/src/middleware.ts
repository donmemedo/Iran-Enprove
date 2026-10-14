import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n";

// Per-request CSP nonce: Next.js reads the Content-Security-Policy request header and stamps the
// nonce on its own inline scripts; layout.tsx puts the same nonce on the theme script.
function csp(nonce: string, https: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // React style props and Recharts set inline style attributes
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []), // plain-http localhost keeps working
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    const wanted = req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : defaultLocale;
    const url = req.nextUrl.clone();
    url.pathname = `/${wanted}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }
  const https = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce, https);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("content-security-policy", policy);
  if (https) res.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains");
  return res;
}

export const config = { matcher: ["/((?!api|_next|fonts|icons|manifest.webmanifest|sw.js|favicon.ico).*)"] };
