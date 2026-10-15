// Runtime proxy to FastAPI: one origin for the browser (no CORS), API_URL read at runtime so
// the same image runs anywhere. It is also the security boundary: only known paths and methods
// pass, bodies are capped, upstream calls time out, the staff cookie becomes a bearer token
// the browser never sees, and the API gets the shared proxy key plus, behind a trusted reverse
// proxy, the real client IP.
import { cookies } from "next/headers";
import { BASE, PROXY_SECRET, STAFF_COOKIE, visitorIp } from "@/lib/api";

const MAX_BODY = 16 * 1024;
const MAX_QUERY = 256;
const TIMEOUT_MS = 10_000;
const METHODS = new Set(["GET", "POST", "PATCH"]);
const SEGMENT = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const BLOCKED = new Set(["docs", "openapi.json", "me"]); // staff login goes through /api/auth
const PASS_RES = ["content-type", "cache-control", "etag", "retry-after", "www-authenticate"];

const json = (status: number, detail: string) =>
  Response.json({ detail }, { status, headers: { "cache-control": "no-store" } });

async function handler(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!METHODS.has(req.method)) return json(405, "method not allowed");
  const { path } = await ctx.params;
  if (!path.length || path.length > 3 || path.some((p) => !SEGMENT.test(p)) || BLOCKED.has(path[0])) return json(404, "not found");
  const { search } = new URL(req.url);
  if (search.length > MAX_QUERY) return json(414, "query too long");

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET") {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return json(413, "request body too large");
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return json(413, "request body too large");
  }

  const headers = new Headers({ accept: "application/json", "x-proxy-key": PROXY_SECRET });
  for (const h of ["content-type", "if-none-match", "accept-language"]) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const ip = visitorIp(req.headers);
  if (ip) headers.set("x-forwarded-for", ip);
  const staff = (await cookies()).get(STAFF_COOKIE)?.value;
  if (staff) headers.set("authorization", `Bearer ${staff}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/${path.join("/")}${search}`, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return json(e instanceof Error && e.name === "TimeoutError" ? 504 : 502, "upstream unavailable");
  }
  const out = new Headers();
  for (const h of PASS_RES) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  if (!out.has("content-type")) out.set("content-type", "application/json");
  out.set("x-content-type-options", "nosniff");
  return new Response(res.status === 304 ? null : res.body, { status: res.status, headers: out });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const dynamic = "force-dynamic";
