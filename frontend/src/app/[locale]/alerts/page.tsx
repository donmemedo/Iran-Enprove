import { SectionTitle } from "@/components/ui";
import { AlertsTable } from "@/components/alerts-table";
import { api, type AlertRow } from "@/lib/api";
import { getDict, toLocale } from "@/lib/i18n";

export default async function AlertsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDict(locale);
  const rows = await api<AlertRow[]>("/api/alerts");
  return (
    <div className="space-y-6">
      <SectionTitle title={t.alerts_title} sub={t.alerts_sub} />
      <AlertsTable locale={locale} rows={rows} />
    </div>
  );
}
