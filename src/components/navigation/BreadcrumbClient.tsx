"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

function LocalizedLoading() {
  const t = useTranslations();
  return <span className="text-sm text-muted-foreground">{t("breadcrumb.loading")}</span>;
}

const Breadcrumb = dynamic(
  () => import("./Breadcrumb").then((mod) => mod),
  {
    ssr: false,
    loading: LocalizedLoading,
  }
);

export default function BreadcrumbClient() {
  return <Breadcrumb />;
}
