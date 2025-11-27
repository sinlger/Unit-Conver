import I18nProviderClient from "@/components/i18n/I18nProviderClient";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import BreadcrumbClient from "@/components/navigation/BreadcrumbClient";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale?: string }> }): Promise<Metadata> {
  const { locale = "zh" } = await params;
  const messages = locale === "en" ? en : zh;

  return {
    title: {
      default: messages.seo.titleDefault,
      template: messages.seo.titleTemplate,
    },
    description: messages.seo.description,
    keywords: messages.seo.keywords as unknown as string[],
    authors: [{ name: "Unit Converter Team" }],
    robots: "index, follow",
    openGraph: {
      title: messages.seo.openGraphTitle,
      description: messages.seo.openGraphDescription,
      type: "website",
      locale: messages.seo.openGraphLocale,
      siteName: messages.seo.openGraphSiteName,
    },
    twitter: {
      card: "summary_large_image",
      title: messages.seo.twitterTitle,
      description: messages.seo.twitterDescription,
    },
  };
}

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
