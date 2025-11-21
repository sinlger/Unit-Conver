"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Breadcrumb as UIBreadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export function Breadcrumb() {
  const pathname = usePathname() ?? "/";
  if (pathname === "/") return null;
  const parts = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const [zhMap, setZhMap] = useState<Record<string, string>>({});
  const [namesMap, setNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!parts.length) return;
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("unit_dictionary")
          .select("category,category_zh")
          .in("category", parts)
          .limit(500);
        if (error || !data) {
          setZhMap({});
          return;
        }
        const m: Record<string, string> = {};
        for (const r of data as Array<{ category: string; category_zh: string | null }>) {
          if (r.category && !(r.category in m)) m[r.category] = r.category_zh ?? r.category;
        }
        setZhMap(m);
      } catch {
        setZhMap({});
      }
    };
    run();
  }, [parts]);

  useEffect(() => {
    const units: string[] = [];
    for (const p of parts) {
      if (p.includes("-to-")) {
        const [from, to] = p.split("-to-").map(decodeURIComponent);
        const m = from.match(/^([0-9]*\.?[0-9]+)([A-Za-z]+)$/);
        const fromUnit = m ? m[2] : from;
        if (fromUnit) units.push(fromUnit);
        if (to) units.push(to);
      }
    }
    if (!units.length) { setNamesMap({}); return; }
    const run = async () => {
      try {
        const { data } = await supabase
          .from("unit_localizations")
          .select("unit_symbol,lang_code,name")
          .in("unit_symbol", Array.from(new Set(units)))
          .in("lang_code", ["zh", "zh-CN"])
          .limit(2000);
        const m: Record<string, string> = {};
        (data as Array<{ unit_symbol: string; name: string }> | null)?.forEach((r) => {
          if (r.unit_symbol && r.name && !(r.unit_symbol in m)) m[r.unit_symbol] = r.name;
        });
        setNamesMap(m);
      } catch {
        setNamesMap({});
      }
    };
    run();
  }, [parts]);

  const crumbs = useMemo(() => {
    const list: Array<{ href: string; label: string }> = [{ href: "/", label: "首页" }];
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      acc += `/${p}`;
      if (p.includes("-to-")) {
        const [fromRaw, toRaw] = p.split("-to-").map(decodeURIComponent);
        if (i === parts.length - 1) {
          const m = fromRaw.match(/^([0-9]*\.?[0-9]+)([A-Za-z]+)$/);
          const val = m ? m[1] : "";
          const fromUnit = m ? m[2] : fromRaw;
          const fromLabel = namesMap[fromUnit] ?? fromUnit;
          const toLabel = namesMap[toRaw] ?? toRaw;
          list.push({ href: acc, label: `${val}${fromLabel}转${toLabel}` });
        } else {
          const fromLabel = namesMap[fromRaw] ?? fromRaw;
          const toLabel = namesMap[toRaw] ?? toRaw;
          list.push({ href: acc, label: `${fromLabel}转${toLabel}` });
        }
      } else {
        const label = p === "db" ? "数据" : zhMap[p] ?? decodeURIComponent(p);
        list.push({ href: acc, label: `${label}单位换算` });
      }
    }
    return list;
  }, [parts, zhMap, namesMap]);

  return (
    <UIBreadcrumb className="text-sm text-muted-foreground">
      <BreadcrumbList>
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            <BreadcrumbItem>
              {i < crumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={c.href}>{c.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{c.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {i < crumbs.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </UIBreadcrumb>
  );
}