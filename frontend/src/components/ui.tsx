import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl ${className}`}>{children}</div>;
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  accent: "text-accent bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]",
  warn: "text-warn bg-[color-mix(in_srgb,var(--warn)_16%,transparent)]",
  danger: "text-danger bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]",
  muted: "text-muted bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]",
};

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Kpi({
  label,
  value,
  unit,
  delta,
  tone = "accent",
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; good: boolean };
  tone?: keyof typeof TONES;
  icon?: ReactNode;
}) {
  return (
    <Card className="card-hover relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -top-16 end-[-3rem] h-32 w-32 rounded-full opacity-60 blur-2xl"
        style={{ background: tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : "var(--accent)", opacity: 0.16 }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span className="text-muted opacity-70">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="latin-nums text-3xl font-extrabold tracking-tight">{value}</span>
        {unit && <span className="text-xs font-medium text-muted">{unit}</span>}
      </div>
      {delta && (
        <div className={`mt-2 text-xs font-semibold ${delta.good ? "text-accent" : "text-danger"}`}>{delta.text}</div>
      )}
    </Card>
  );
}

export function Bar({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "warn" | "danger" }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : "var(--accent)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: `linear-gradient(90deg, ${color}, var(--accent-2))` }}
      />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <Card className="p-10 text-center text-sm text-muted">{text}</Card>;
}
