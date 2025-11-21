"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator, ItemGroup } from "@/components/ui/item";
import { supabase } from "@/lib/supabase";
import type { UnitConversionLog } from "@/lib/types";

async function fetchSymbols(cat: string): Promise<string[]> {
  const { data } = await supabase
    .from("unit_dictionary")
    .select("symbol")
    .eq("category", cat)
    .order("symbol", { ascending: true })
    .limit(200);
  const set = new Set<string>();
  (data as Array<{ symbol: string }> | null)?.forEach((r) => { if (r.symbol) set.add(r.symbol); });
  return Array.from(set).sort();
}

async function fetchRecentLogs(symbols: string[], limit = 20): Promise<UnitConversionLog[]> {
  if (symbols.length === 0) return [] as UnitConversionLog[];
  const sel = "from_unit,input_value,to_unit,output_value,lang_code,conversion_count,first_seen_at,last_seen_at";
  const { data: a } = await supabase
    .from("unit_conversion_logs")
    .select(sel)
    .in("from_unit", symbols)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  const { data: b } = await supabase
    .from("unit_conversion_logs")
    .select(sel)
    .in("to_unit", symbols)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  const map = new Map<string, UnitConversionLog>();
  [...((a ?? []) as UnitConversionLog[]), ...((b ?? []) as UnitConversionLog[])].forEach((r) => {
    const k = `${r.from_unit}-${r.input_value}-${r.to_unit}-${r.output_value}-${r.lang_code}`;
    if (!map.has(k)) map.set(k, r);
  });
  return Array.from(map.values())
    .sort((x, y) => String(y.last_seen_at).localeCompare(String(x.last_seen_at)))
    .slice(0, 20);
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
        const recent = await fetchRecentLogs(symbols);
        if (!cancelled) setLogs(recent);

        const units = Array.from(new Set([
          ...symbols,
          ...recent.map((r) => r.from_unit),
          ...recent.map((r) => r.to_unit),
        ]));
        if (units.length) {
          const { data } = await supabase
            .from("unit_localizations")
            .select("unit_symbol,lang_code,name")
            .in("unit_symbol", units)
            .in("lang_code", ["zh", "zh-CN"])
            .limit(2000);
          const m: Record<string, string> = {};
          (data as Array<{ unit_symbol: string; name: string }> | null)?.forEach((r) => {
            const k = r.unit_symbol as string;
            const nm = r.name as string;
            if (k && nm && !(k in m)) m[k] = nm;
          });
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