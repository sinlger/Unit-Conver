"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Breadcrumb as UIBreadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function Breadcrumb() {
  const t = useTranslations();
  const pathname = usePathname() ?? "/";
  const allParts = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const allowed = ["zh", "en"];
  const locale = allowed.includes(allParts[0] ?? "") ? (allParts[0] as "zh" | "en") : "zh";
  const isRoot = useMemo(() => allParts.length === 0 || (allParts.length === 1 && allParts[0] === locale), [allParts, locale]);
  const parts = useMemo(() => {
    const arr = allParts.slice();
    if (arr[0] === locale) arr.shift();
    return arr;
  }, [allParts, locale]);
  const [zhMap, setZhMap] = useState<Record<string, string>>({});
  const [namesMap, setNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!parts.length) return;
    const run = async () => {
      try {
        if (!locale.startsWith("zh")) { setZhMap({}); return; }
        const { data, error } = await supabase
          .from("unit_dictionary")
          .select("category,category_zh")
          .in("category", parts)
          .limit(500);
        if (error || !data) { setZhMap({}); return; }
        const m: Record<string, string> = {};
        for (const r of data as Array<{ category: string; category_zh: string | null }>) {
          if (r.category && !(r.category in m)) m[r.category] = r.category_zh ?? r.category;
        }
        setZhMap(m);
      } catch { setZhMap({}); }
    };
    run();
  }, [parts, locale]);

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
        const langs = locale.startsWith("en") ? ["en", "en-US", "en-GB"] : ["zh", "zh-CN"];
        const { data } = await supabase
          .from("unit_localizations")
          .select("unit_symbol,lang_code,name")
          .in("unit_symbol", Array.from(new Set(units)))
          .in("lang_code", langs)
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
  }, [parts, locale]);

  const crumbs = useMemo(() => {
    const list: Array<{ href: string; label: string }> = [{ href: "", label: t("breadcrumb.home") }];
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
          list.push({ href: acc, label: `${val} ${fromLabel} ${t("breadcrumb.convertJoin")} ${toLabel}` });
        } else {
          const fromLabel = namesMap[fromRaw] ?? fromRaw;
          const toLabel = namesMap[toRaw] ?? toRaw;
          list.push({ href: acc, label: `${fromLabel} ${t("breadcrumb.convertJoin")} ${toLabel}` });
        }
      } else {
        const labelBase = p === "db" ? t("breadcrumb.data") : zhMap[p] ?? t(`categories.${p}` as any);
        list.push({ href: acc, label: `${labelBase}${t("breadcrumb.unitConversionSuffix")}` });
      }
    }
    return list;
  }, [parts, zhMap, namesMap, t, locale]);

  if (isRoot) return null;
  return (
    <UIBreadcrumb className="text-sm text-muted-foreground">
      <BreadcrumbList>
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            <BreadcrumbItem>
              {i < crumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={`/${locale}${c.href}`}>{c.label}</Link>
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
