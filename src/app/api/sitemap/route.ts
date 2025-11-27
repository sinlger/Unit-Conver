import { supabaseServer } from "@/lib/supabaseServer";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import type { NextRequest } from "next/server";
import type { UnitConversionLog } from "@/lib/types";

export async function GET(req: NextRequest) {
  const origin = process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_SITE_URL ?? "https://unitconver.com"
    : "http://localhost:3000";
  const locales = ["zh", "en"];
  const { data, error } = await supabaseServer
    .from("unit_dictionary")
    .select("category,symbol")
    .eq("is_active", true)
    .order("category")
    .limit(2000);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const catSet = new Set<string>();
  const symMap = new Map<string, Set<string>>();
  for (const row of (data ?? []) as any[]) {
    const c = String(row.category || "");
    const s = String(row.symbol || "");
    if (!c) continue;
    catSet.add(c);
    if (s) {
      if (!symMap.has(c)) symMap.set(c, new Set<string>());
      symMap.get(c)!.add(s);
    }
  }
  const categories = Array.from(catSet).sort();
  const symbolsByCategory: Record<string, string[]> = {};
  for (const c of categories) {
    const st = symMap.get(c) ?? new Set<string>();
    symbolsByCategory[c] = Array.from(st).sort();
  }
  const now = new Date().toISOString();
  const urls: Array<{ url: string; changeFrequency: "daily" | "weekly"; priority: number; lastModified: string }> = [];
  for (const locale of locales) {
    for (const category of categories) {
      urls.push({
        url: `${origin}/${locale}/${category}`,
        changeFrequency: "daily",
        priority: 0.8,
        lastModified: now,
      });
      const slugs = pairSlugs(symbolsByCategory[category])
      for(const slug of slugs){
        urls.push({
          url: `${origin}/${locale}/${category}/${encodeURIComponent(slug)}`,
          changeFrequency: "daily",
          priority: 0.8,
          lastModified: now,
        })
      }
    }
  }
  const { data: rawLogs } = await supabaseServer
    .from("unit_conversion_logs")
    .select("from_unit,input_value,to_unit,output_value,lang_code,conversion_count,first_seen_at,last_seen_at")
    .order("last_seen_at", { ascending: false })
  const lastUrl = (rawLogs ?? []).map((v: any) => ({
    lang: v.lang_code,
    slug: `${encodeURIComponent(v.from_unit)}-to-${encodeURIComponent(v.to_unit)}`,
    url: `${v.input_value}${encodeURIComponent(v.from_unit)}-to-${encodeURIComponent(v.to_unit)}`,
  }));
  console.log(lastUrl)
  const valuePairUrls: Array<{ url: string; changeFrequency: "daily" | "weekly"; priority: number; lastModified: string }> = [];
  for (const item of lastUrl) {
    for (const base of urls) {
      if (base.url.includes(`/${item.lang}/`) && base.url.endsWith(`/${item.slug}`)) {
        valuePairUrls.push({
          url: `${base.url}/${item.url}`,
          changeFrequency: base.changeFrequency,
          priority: base.priority,
          lastModified: base.lastModified,
        });
      }
    }
  }
  console.log('valuePairUrls',valuePairUrls)
  const allUrls = [...urls, ...valuePairUrls];
  return Response.json({
    urls: allUrls,
    logs: (rawLogs ?? []) as UnitConversionLog[],
    meta: { level: "category", counts: { categories: categories.length, urls: allUrls.length, logs: (rawLogs ?? []).length } },
  });
}

function uniquePairs(symbols: string[]): Array<[string, string]> {
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const s of symbols) {
    if (!seen.has(s)) {
      seen.add(s)
      dedup.push(s)
    }
  }
  const res: Array<[string, string]> = []
  for (let i = 0; i < dedup.length; i++) {
    for (let j = i + 1; j < dedup.length; j++) {
      res.push([dedup[i], dedup[j]])
    }
  }
  return res
}

function pairSlugs(symbols: string[]): string[] {
  return uniquePairs(symbols).map(([a, b]) => `${a}-to-${b}`)
}