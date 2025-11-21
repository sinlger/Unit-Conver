import { supabase } from "@/lib/supabase";
import ConversionCard from "@/components/units/ConversionCard";
import CategoryAside from "@/components/aside/CategoryAside";
import GuessYouLike from "@/components/recommend/GuessYouLike";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ItemGroup, Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator } from "@/components/ui/item";
import ConversionTable from "@/components/units/ConversionTable";

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

export default async function ConvertWithValuePage({ params }: { params: Promise<{ category?: string; pair?: string; valuePair?: string }> }) {
  const { category = "", pair = "", valuePair = "" } = await params;
  const rows = await fetchByCategory(category);
  const symbols = Array.from(new Set(rows.map((r) => r.symbol))).sort();
  let names: Record<string, string> = {};
  let sources: Record<string, string> = {};
  if (symbols.length > 0) {
    const { data } = await supabase
      .from("unit_localizations")
      .select("unit_symbol,lang_code,name,source_description")
      .in("unit_symbol", symbols)
      .in("lang_code", ["zh", "zh-CN"])
      .limit(2000);
    (data as Array<{ unit_symbol: string; name: string; source_description?: string | null }> | null)?.forEach((r) => {
      if (r.unit_symbol && r.name && !(r.unit_symbol in names)) names[r.unit_symbol] = r.name;
      if (r.unit_symbol && r.source_description && !(r.unit_symbol in sources)) sources[r.unit_symbol] = r.source_description;
    });
  }

  let from = "";
  let to = "";
  if (pair) {
    const parts = pair.split("-to-").map(decodeURIComponent);
    from = parts[0] ?? "";
    to = parts[1] ?? "";
  }

  let defaultValue = "1";
  if (valuePair) {
    const parts = valuePair.split("-to-").map(decodeURIComponent);
    const left = parts[0] ?? "";
    const m = left.match(/^([0-9]*\.?[0-9]+)([A-Za-z]+)$/);
    if (m) {
      defaultValue = m[1] ?? "1";
      from = m[2] ?? from;
    }
    to = parts[1] ?? to;
  }

  const pairTitle = from && to ? `${names[from] ?? from} 转 ${names[to] ?? to} 单位换算器` : "单位换算器";

  return (
    <div className="mx-auto max-w-5xl px-6 py-7">
      <div className="grid gap-4 md:grid-cols-4">
        <section className="md:col-span-3">
          <div className=" text-left">
            <ConversionCard title={pairTitle} defaultFrom={from} defaultTo={to} defaultValue={defaultValue} />
          </div>
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>说明</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>{(names[from] ?? from) + ` [${from}]`}</ItemTitle>
                      <ItemDescription>{sources[from] ?? "暂无来源"}</ItemDescription>
                    </ItemContent>
                  </Item>
                  <ItemSeparator />
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>{(names[to] ?? to) + ` [${to}]`}</ItemTitle>
                      <ItemDescription>{sources[to] ?? "暂无来源"}</ItemDescription>
                    </ItemContent>
                  </Item>
                </ItemGroup>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8">
            <ConversionTable
              fromLabel={(names[from] ?? from) + ` [${from}]`}
              toLabel={(names[to] ?? to) + ` [${to}]`}
              fromUnit={from}
              toUnit={to}
            />
          </div>
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