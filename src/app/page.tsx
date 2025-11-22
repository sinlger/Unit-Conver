import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data/StructuredData";
import { 
  createSoftwareAppSchema, 
  createFAQSchema 
} from "@/components/structured-data/StructuredData";

// ISR配置 - 首页每24小时重新验证
export const revalidate = 86400; // 24小时

// 首页SEO配置
export const metadata: Metadata = {
  title: "单位转换器 | Unit Converter",
  description: "专业的单位转换工具，支持长度、面积、体积、质量、温度等多种物理量单位转换。基于Next.js ISR技术，提供快速准确的转换服务。",
  keywords: ["单位转换", "长度转换", "面积转换", "体积转换", "质量转换", "温度转换"],
  openGraph: {
    title: "单位转换器",
    description: "专业的单位转换工具，支持多种物理量单位转换",
    type: "website",
    locale: "zh_CN",
  },
};

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
      .in("lang_code", ["zh", "zh-CN"])
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
        <p className="mt-4 text-sm md:text-base text-muted-foreground">
          基于 Next.js SSG/ISR 与 Supabase 的单位字典与转换演示。
        </p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>分类入口</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16
        }}>
          {categories.map((c) => (
            <Link key={c} href={`/${encodeURIComponent(c)}`} style={{
              display: "block",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              textDecoration: "none"
            }}>
              <div style={{ fontWeight: 600 }}>{categoryTitle.get(c) ?? c}</div>
              <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                {(() => {
                  const symbols = (catSymbols.get(c) ?? []).slice(0, 6);
                  const names = symbols.map((s) => namesMap[s] ?? s);
                  return names.length ? names.join("、") : "进入该分类进行单位查看与转换";
                })()}
              </div>
            </Link>
          ))}
          {categories.length === 0 && (
            <div style={{ color: "#888" }}>暂无数据或读取失败</div>
          )}
        </div>
      </section>
    </div>
  );
}
