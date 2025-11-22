"use client";

import dynamic from "next/dynamic";

const Breadcrumb = dynamic(
  () => import("./Breadcrumb").then((mod) => mod),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function BreadcrumbClient() {
  return <Breadcrumb />;
}