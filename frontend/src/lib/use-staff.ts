"use client";

import { useEffect, useState } from "react";

const EVT = "enprove:staff";

/** null = unknown yet (hide staff-only controls), then true/false from GET /api/auth. */
export function useStaff(): boolean | null {
  const [staff, setStaff] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/auth", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { staff: false }))
        .then((d: { staff?: boolean }) => live && setStaff(Boolean(d.staff)))
        .catch(() => live && setStaff(false));
    load();
    window.addEventListener(EVT, load);
    return () => {
      live = false;
      window.removeEventListener(EVT, load);
    };
  }, []);
  return staff;
}

/** Call after login/logout so every mounted useStaff() refetches. */
export const staffChanged = () => window.dispatchEvent(new Event(EVT));

/** Minutes to wait from a 429's Retry-After header (seconds), at least 1. */
export const retryMinutes = (res: Response) => Math.max(1, Math.ceil(Number(res.headers.get("retry-after") ?? 600) / 60));
