import type { Locale } from "./i18n";

const tag = (l: Locale) => (l === "fa" ? "fa-IR" : "en-US");

export function num(v: number, l: Locale, digits = 0): string {
  return new Intl.NumberFormat(tag(l), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
}

/** Toman in, human scale out (the business plan talks in million/billion Toman). */
export function toman(v: number, l: Locale): { value: string; unit: "unit_toman" | "unit_m_toman" | "unit_b_toman" } {
  const a = Math.abs(v);
  if (a >= 1e9) return { value: num(v / 1e9, l, 1), unit: "unit_b_toman" };
  if (a >= 1e6) return { value: num(v / 1e6, l, 0), unit: "unit_m_toman" };
  return { value: num(v, l), unit: "unit_toman" };
}

export function energy(kwh: number, l: Locale): { value: string; unit: "unit_kwh" | "unit_mwh" } {
  return Math.abs(kwh) >= 10_000
    ? { value: num(kwh / 1000, l, 1), unit: "unit_mwh" }
    : { value: num(kwh, l), unit: "unit_kwh" };
}

export const pctSign = (l: Locale) => (l === "fa" ? "٪" : "%");

export function pct(v: number, l: Locale, digits = 1): string {
  const s = num(Math.abs(v), l, digits);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}${pctSign(l)}`;
}

export function shortDate(iso: string, l: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(l === "fa" ? "fa-IR-u-ca-persian" : "en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function fullDate(iso: string, l: Locale): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(l === "fa" ? "fa-IR-u-ca-persian" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
