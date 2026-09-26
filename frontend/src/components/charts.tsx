"use client";

import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { energy, num, pctSign, shortDate, toman } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";

const PALETTE = ["var(--accent)", "var(--accent-2)", "var(--warn)", "#9b6bff", "var(--danger)"];

function Box({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-2xl px-3 py-2 text-xs shadow-lg">{children}</div>;
}

export function TrendChart({ data, locale }: { data: { date: string; kwh: number; cost: number }[]; locale: Locale }) {
  const t = getDict(locale);
  return (
    <div dir="ltr" className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gkwh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => shortDate(v, locale)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => num(v / 1000, locale, 0)}
          />
          <Tooltip
            cursor={{ stroke: "var(--line)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { kwh: number; cost: number };
              const e = energy(p.kwh, locale);
              const c = toman(p.cost, locale);
              return (
                <Box>
                  <div className="mb-1 font-semibold">{shortDate(String(label), locale)}</div>
                  <div className="text-muted">{t.chart_kwh}: <b className="text-fg">{e.value} {t[e.unit]}</b></div>
                  <div className="text-muted">{t.chart_cost}: <b className="text-fg">{c.value} {t[c.unit]}</b></div>
                </Box>
              );
            }}
          />
          <Area type="monotone" dataKey="kwh" stroke="var(--accent)" strokeWidth={2} fill="url(#gkwh)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MixDonut({ data, locale }: { data: { load_type: string; kwh: number; pct: number }[]; locale: Locale }) {
  const t = getDict(locale);
  const label = (k: string) => t[`load_${k}` as keyof typeof t] ?? k;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div dir="ltr" className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="kwh" nameKey="load_type" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none" isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { load_type: string; kwh: number; pct: number };
                const e = energy(p.kwh, locale);
                return (
                  <Box>
                    <b>{label(p.load_type)}</b>
                    <div className="text-muted">{e.value} {t[e.unit]} — {num(p.pct, locale, 1)}{pctSign(locale)}</div>
                  </Box>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2.5">
        {data.map((d, i) => (
          <li key={d.load_type} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-muted">{label(d.load_type)}</span>
            <span className="latin-nums font-semibold">{num(d.pct, locale, 1)}{pctSign(locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HourlyBars({ data, locale }: { data: { hour: number; kw: number }[]; locale: Locale }) {
  const t = getDict(locale);
  return (
    <div dir="ltr" className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} interval={2} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--muted) 10%, transparent)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <Box>
                  <b>{String(label).padStart(2, "0")}:00</b>
                  <div className="text-muted">{num(Number(payload[0].value), locale, 1)} {t.unit_kw}</div>
                </Box>
              );
            }}
          />
          <Bar dataKey="kw" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.hour >= 7 && d.hour < 19 ? "var(--accent)" : "var(--accent-2)"} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
