"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator, ItemGroup } from "@/components/ui/item";
import { supabase } from "@/lib/supabase";
import type { UnitConversionLog } from "@/lib/types";

async function fetchSymbols(cat: string): Promise<string[]> {
  const res = await fetch(`/api/category/symbols?category=${encodeURIComponent(cat)}`);
  if (!res.ok) return [];
  return (await res.json()) as string[];
}

async function fetchRecentLogs(category: string, limit = 20): Promise<UnitConversionLog[]> {
  const res = await fetch(`/api/category/recent?category=${encodeURIComponent(category)}&limit=${limit}`);
  if (!res.ok) return [] as UnitConversionLog[];
  return (await res.json()) as UnitConversionLog[];
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
        const symbols = await fetchSymbols(category);
        const recent = await fetchRecentLogs(category);
        if (!cancelled) setLogs(recent);

        const units = Array.from(new Set([
          ...symbols,
          ...recent.map((r) => r.from_unit),
          ...recent.map((r) => r.to_unit),
        ]));
        if (units.length) {
          const res = await fetch(`/api/units/names?symbols=${encodeURIComponent(units.join(','))}&lang=zh`);
          const m = res.ok ? ((await res.json()) as Record<string, string>) : {};
          if (!cancelled) setNamesMap(m);
        } else {
          if (!cancelled) setNamesMap({});
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