import { supabase } from "@/lib/supabase";
import ConversionCard from "@/components/units/ConversionCard";
import CategoryAside from "@/components/aside/CategoryAside";
import GuessYouLike from "@/components/recommend/GuessYouLike";
import { CATEGORY_ARTICLES } from "@/content/categoryMap";

export const revalidate = 60;

type Row = { symbol: string; category: string; is_active: boolean | null };

async function fetchByCategory(cat: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("unit_dictionary")
    .select("symbol,category,is_active")
    .eq("category", cat)
    .order("symbol", { ascending: true })
    .limit(500);
  if (error) return [];
  return (data as Row[]) ?? [];
}

export default async function ConvertCategoryPage({ params }: { params: Promise<{ category?: string }> }) {
  const { category = "" } = await params;
  const rows = await fetchByCategory(category);
  const symbols = Array.from(new Set(rows.map((r) => r.symbol))).sort();
  let names: Record<string, string> = {};
  if (symbols.length > 0) {
    const { data } = await supabase
      .from("unit_localizations")
      .select("unit_symbol,lang_code,name")
      .in("unit_symbol", symbols)
      .in("lang_code", ["zh", "zh-CN"])
      .limit(2000);
    (data as Array<{ unit_symbol: string; name: string }> | null)?.forEach((r) => {
      if (r.unit_symbol && r.name && !(r.unit_symbol in names)) names[r.unit_symbol] = r.name;
    });
  }
  let categoryTitle = category;
  const { data: catRows } = await supabase
    .from("unit_dictionary")
    .select("category,category_zh")
    .eq("category", category)
    .limit(1);
  if (catRows && catRows[0]) {
    categoryTitle = (catRows[0] as { category_zh: string | null }).category_zh ?? category;
  }

  let ArticleComp: any = null;
  const loader = CATEGORY_ARTICLES[category];
  if (typeof loader === "function") {
    const mod = await loader();
    ArticleComp = mod?.default ?? null;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-7">
      <div className="grid gap-4 md:grid-cols-4">
        <section className="md:col-span-3">
          <div className=" text-left">
            <ConversionCard title={`${categoryTitle} 单位换算器`} />
          </div>
          {ArticleComp ? (
            <div className="mt-8">
              <div className="prose prose-neutral dark:prose-invert">
                <ArticleComp />
              </div>
            </div>
          ) : null}
          <div className="mt-8">
            <GuessYouLike category={category} symbols={symbols} names={names} />
          </div>
        </section>
        <aside className="md:col-span-1">
          <CategoryAside title='最近单位换算' category={category} />
        </aside>
      </div>
    </div>
  );
}