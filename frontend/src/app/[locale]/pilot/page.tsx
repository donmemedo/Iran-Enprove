import { Check } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { PilotForm } from "@/components/pilot-form";
import { getDict, type Locale, toLocale } from "@/lib/i18n";

export default async function Pilot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDict(locale);
  const steps = [t.offer_1_d, t.offer_2_d, t.offer_3_d];

  return (
    <div className="space-y-6">
      <SectionTitle title={t.pilot_title} sub={t.pilot_sub} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <PilotForm locale={locale} />
        <Card className="h-fit p-6">
          <h3 className="text-sm font-bold">{t.offer_title}</h3>
          <ul className="mt-4 space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-xs leading-relaxed text-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}>
                  <Check size={12} className="text-accent" />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
