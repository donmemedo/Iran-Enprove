// Staff sign-in: the token is checked against the API once, then kept in an httpOnly cookie that
// the proxy turns into a bearer header. The browser never stores or sees the token itself.
import { cookies } from "next/headers";
import { BASE, PROXY_SECRET, STAFF_COOKIE, visitorIp } from "@/lib/api";

const secure = process.env.NODE_ENV === "production";
const noStore = { "cache-control": "no-store" };

export async function POST(req: Request) {
  let token = "";
  try {
    token = String(((await req.json()) as { token?: unknown }).token ?? "");
  } catch {}
  if (!token || token.length > 256) return Response.json({ detail: "token required" }, { status: 422, headers: noStore });
  const headers = new Headers({ authorization: `Bearer ${token}`, "x-proxy-key": PROXY_SECRET });
  const ip = visitorIp(req.headers); // failed logins are counted per visitor, not per proxy
  if (ip) headers.set("x-forwarded-for", ip);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/me`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch {
    return Response.json({ detail: "upstream unavailable" }, { status: 502, headers: noStore });
  }
  if (!res.ok) {
    const retry = res.headers.get("retry-after");
    return Response.json(
      { detail: "unauthorized" },
      { status: res.status === 429 ? 429 : 401, headers: retry ? { ...noStore, "retry-after": retry } : noStore },
    );
  }
  (await cookies()).set(STAFF_COOKIE, token, { httpOnly: true, sameSite: "strict", secure, path: "/api", maxAge: 60 * 60 * 12 });
  return Response.json({ ok: true }, { headers: noStore });
}

export async function DELETE() {
  (await cookies()).delete({ name: STAFF_COOKIE, path: "/api" });
  return Response.json({ ok: true }, { headers: noStore });
}

export async function GET() {
  return Response.json({ staff: Boolean((await cookies()).get(STAFF_COOKIE)?.value) }, { headers: noStore });
}

export const dynamic = "force-dynamic";
