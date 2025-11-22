"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator, ItemGroup } from "@/components/ui/item";
import type { UnitConversionLog } from "@/lib/types";

async function fetchAside(category: string): Promise<{ logs: UnitConversionLog[]; names: Record<string, string> }> {
  try {
    const res = await fetch(`/data/${encodeURIComponent(category)}/aside.json`, { cache: "force-cache" });
    if (!res.ok) return { logs: [], names: {} };
    const json = await res.json();
    return { logs: (json?.logs ?? []) as UnitConversionLog[], names: (json?.names ?? {}) as Record<string, string> };
  } catch {
    return { logs: [], names: {} };
  }
}

export default function CategoryAside({ title, category }: { title?: string; category: string }) {
  const [logs, setLogs] = useState<UnitConversionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [namesMap, setNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { logs, names } = await fetchAside(category);
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
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无最近转换</div>
        ) : (
          <ItemGroup>
            {logs.map((r, i) => (
              <Fragment key={`${r.from_unit}-${r.input_value}-${r.to_unit}-${r.output_value}-${r.lang_code}`}>
                <Item variant="muted" >
                  <ItemContent>
                    <ItemTitle>
                      <Link href={`/${encodeURIComponent(category)}/${encodeURIComponent(r.from_unit)}-to-${encodeURIComponent(r.to_unit)}/${encodeURIComponent(String(r.input_value) + r.from_unit)}-to-${encodeURIComponent(r.to_unit)}`}>
                        {r.input_value}{namesMap[r.from_unit] ?? r.from_unit}等于多少{namesMap[r.to_unit] ?? r.to_unit}？
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