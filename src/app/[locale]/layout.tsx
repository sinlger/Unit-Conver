import I18nProviderClient from "@/components/i18n/I18nProviderClient";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import BreadcrumbClient from "@/components/navigation/BreadcrumbClient";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale?: string }> }) {
  const { locale = "zh" } = await params;
  const messages = locale === "en" ? en : zh;
  return (
    <I18nProviderClient locale={locale} messages={messages}>
      <div className="mx-auto max-w-5xl px-6 pt-4">
        <BreadcrumbClient />
      </div>
      {children}
    </I18nProviderClient>
  );
}
