import type { Metadata } from "next";
import { SectionTitle } from "@/components/ui";
import { LoginForm } from "@/components/login-form";
import { getDict, toLocale } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Login({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDict(locale);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <SectionTitle title={t.login_title} sub={t.login_sub} />
      <LoginForm locale={locale} />
    </div>
  );
}
