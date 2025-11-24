"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator, ItemGroup } from "@/components/ui/item";
import type { UnitConversionLog } from "@/lib/types";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

async function fetchAside(category: string, locale: string): Promise<{ logs: UnitConversionLog[]; names: Record<string, string> }> {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = origin ? `${origin}/api/aside/${encodeURIComponent(category)}?locale=${encodeURIComponent(locale)}` : `/api/aside/${encodeURIComponent(category)}?locale=${encodeURIComponent(locale)}`;
    console.log("aside:fetch", url);
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return { logs: [], names: {} };
    const json = await res.json();
    return { logs: (json?.logs ?? []) as UnitConversionLog[], names: (json?.names ?? {}) as Record<string, string> };
  } catch {
    return { logs: [], names: {} };
  }
}

export default function CategoryAside({ title, category }: { title?: string; category: string }) {
  const t = useTranslations();
  const pathname = usePathname() ?? "/";
  const [logs, setLogs] = useState<UnitConversionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [namesMap, setNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        console.log("aside:mount", category);
        const seg = pathname.split("/").filter(Boolean)[0] || "zh";
        const loc = ["zh","en"].includes(seg) ? seg : "zh";
        const { logs, names } = await fetchAside(category, loc);
        if (!cancelled) {
          setLogs(logs);
          setNamesMap(names);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [category]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? "侧栏"}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">{t("aside.loading")}</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("aside.empty")}</div>
        ) : (
          <ItemGroup>
            {logs.map((r, i) => (
              <Fragment key={`${r.from_unit}-${r.input_value}-${r.to_unit}-${r.output_value}-${r.lang_code}`}>
                <Item variant="muted" >
                  <ItemContent>
                    <ItemTitle>
                      <Link href={`/${(["zh","en"].includes(pathname.split("/").filter(Boolean)[0] || "zh") ? (pathname.split("/").filter(Boolean)[0] || "zh") : "zh")}/${encodeURIComponent(category)}/${encodeURIComponent(r.from_unit)}-to-${encodeURIComponent(r.to_unit)}/${encodeURIComponent(String(r.input_value) + r.from_unit)}-to-${encodeURIComponent(r.to_unit)}`}>
                        {t("aside.question", { input: r.input_value, from: namesMap[r.from_unit] ?? r.from_unit, to: namesMap[r.to_unit] ?? r.to_unit })}
                      </Link>
                    </ItemTitle>
                  </ItemContent>
                </Item>
                {i < logs.length - 1 && <ItemSeparator />}
              </Fragment>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
