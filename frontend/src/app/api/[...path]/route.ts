// Runtime proxy to FastAPI: keeps one origin for the browser (no CORS) and, unlike
// next.config rewrites, reads API_URL at runtime so the same image works anywhere.
const BASE = process.env.API_URL || "http://localhost:8100";

async function handler(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const { search } = new URL(req.url);
  const res = await fetch(`${BASE}/api/${path.join("/")}${search}`, {
    method: req.method,
    headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    cache: "no-store",
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
export const dynamic = "force-dynamic";
