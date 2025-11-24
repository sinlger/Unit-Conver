import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export const revalidate = 86400;

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

export async function generateMetadata({ params }: { params: Promise<{ locale?: string }> }): Promise<Metadata> {
  const { locale = "zh" } = await params;
  const m = locale === "en" ? (en as any) : (zh as any);
  return {
    title: `${m.common?.unitConverter} | Unit Converter`,
    description: m.common?.unitConversion,
    openGraph: { title: m.common?.unitConverter, description: m.common?.unitConversion },
  };
}

export default async function Home({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale = "zh" } = await params;
  const m = locale === "en" ? (en as any) : (zh as any);
  const rows = await fetchUnitDictionary();
  const categorySet = rows.reduce((set, r) => { if (r.category) set.add(r.category); return set; }, new Set<string>());
  const categories = Array.from(categorySet).sort();
  const categoryTitle = new Map<string, string>();
  rows.forEach((r) => { if (!categoryTitle.has(r.category)) { categoryTitle.set(r.category, r.category_zh ?? r.category); } });
  const catSymbols = new Map<string, string[]>();
  rows.forEach((r) => { if (r.category && r.symbol) { const list = catSymbols.get(r.category) ?? []; if (!list.includes(r.symbol)) list.push(r.symbol); catSymbols.set(r.category, list); } });

  return (
    <div style={{ margin: "0 auto", maxWidth: 1024, padding: "56px 24px" }}>
      <section className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Unit Conver</h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground">{m.common?.unitConversion}</p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{m.common?.unitConversion}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 16 }}>
          {categories.map((c) => (
            <Link key={c} href={`/${encodeURIComponent(locale)}/${encodeURIComponent(c)}`} style={{ display: "block", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, textDecoration: "none" }}>
              <div style={{ fontWeight: 600 }}>{locale === "zh" ? categoryTitle.get(c) ?? c : c}</div>
              <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                <KbdGroup>
                  {(catSymbols.get(c) ?? []).slice(0, 5).map((s) => (
                    <Kbd key={s}>{s}</Kbd>
                  ))}
                </KbdGroup>

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
