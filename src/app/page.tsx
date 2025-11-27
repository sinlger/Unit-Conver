import Link from "next/link";
import { supabaseServer as supabase } from "@/lib/supabaseServer";
import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data/StructuredData";
import { 
  createSoftwareAppSchema, 
  createFAQSchema 
} from "@/components/structured-data/StructuredData";
import { headers } from "next/headers";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

// ISR配置 - 首页每24小时重新验证
export const revalidate = 86400; // 24小时

// 首页SEO配置
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const al = h.get("accept-language") || "zh";
  const locale = al.toLowerCase().includes("en") ? "en" : "zh";
  const m = locale === "en" ? (en as any) : (zh as any);
  return {
    title: `${m.common?.unitConverter} | Unit Converter`,
    description: m.common?.unitConversion,
    keywords: [m.common?.unitConversion],
    openGraph: { title: m.common?.unitConverter, description: m.common?.unitConversion, type: "website" },
  };
}

type Row = { symbol: string; category: string; category_zh: string | null; is_active: boolean | null };

async function fetchUnitDictionary(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("unit_dictionary")
    .select("symbol,category,category_zh,is_active")
    .order("category", { ascending: true })
    .limit(500);
  if (error) return [];
  return (data as Row[]) ?? [];
}

export default async function Home() {
  const h = await headers();
  const al = h.get("accept-language") || "zh";
  const locale = al.toLowerCase().includes("en") ? "en" : "zh";
  const m = locale === "en" ? (en as any) : (zh as any);
  const rows = await fetchUnitDictionary();
  const categorySet = rows.reduce((set, r) => {
    if (r.category) set.add(r.category);
    return set;
  }, new Set<string>());
  const categories = Array.from(categorySet).sort();
  const categoryTitle = new Map<string, string>();
  rows.forEach((r) => {
    if (!categoryTitle.has(r.category)) {
      categoryTitle.set(r.category, r.category_zh ?? r.category);
    }
  });

  const catSymbols = new Map<string, string[]>();
  rows.forEach((r) => {
    if (r.category && r.symbol) {
      const list = catSymbols.get(r.category) ?? [];
      if (!list.includes(r.symbol)) list.push(r.symbol);
      catSymbols.set(r.category, list);
    }
  });

  // 创建结构化数据
  const softwareAppSchema = createSoftwareAppSchema();
  const faqSchema = createFAQSchema();
  const allSymbols = Array.from(new Set(rows.map((r) => r.symbol))).slice(0, 2000);
  const namesMap: Record<string, string> = {};
  if (allSymbols.length) {
    const { data: locs } = await supabase
      .from("unit_localizations")
      .select("unit_symbol,lang_code,name")
      .in("unit_symbol", allSymbols)
      .in("lang_code", locale === "en" ? ["en", "en-US", "en-GB"] : ["zh", "zh-CN"]) 
      .limit(2000);
    (locs ?? []).forEach((r: any) => {
      const k = r.unit_symbol as string;
      const nm = r.name as string;
      if (k && nm && !(k in namesMap)) namesMap[k] = nm;
    });
  }

  return (
    <div style={{ margin: "0 auto", maxWidth: 1024, padding: "56px 24px" }}>
      <StructuredData data={softwareAppSchema} />
      <StructuredData data={faqSchema} />
      <section className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Unit Conver</h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground">{m.home?.intro}</p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{m.home?.categoryEntry}</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16
        }}>
          {categories.map((c) => (
            <Link key={c} href={`/${locale}/${encodeURIComponent(c)}`} style={{
              display: "block",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              textDecoration: "none"
            }}>
              <div style={{ fontWeight: 600 }}>{(m as any).categories?.[c] ?? categoryTitle.get(c) ?? c}</div>
              <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                {(() => {
                  const symbols = (catSymbols.get(c) ?? []).slice(0, 6);
                  const names = symbols.map((s) => namesMap[s] ?? s);
                  const sep = locale === "zh" ? "、" : ", ";
                  return names.length ? names.join(sep) : m.common?.unitConversion;
                })()}
              </div>
            </Link>
          ))}
          {categories.length === 0 && (
            <div style={{ color: "#888" }}>{m.home?.noData}</div>
          )}
        </div>
      </section>
    </div>
  );
}
