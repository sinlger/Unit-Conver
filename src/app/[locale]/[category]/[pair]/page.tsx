import { supabaseServer } from "@/lib/supabaseServer";
import fs from "node:fs";
import path from "node:path";
import ConversionCard from "@/components/units/ConversionCard";
import CategoryAside from "@/components/aside/CategoryAside";
import GuessYouLike from "@/components/recommend/GuessYouLike";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ItemGroup, Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator } from "@/components/ui/item";
import ConversionTable from "@/components/units/ConversionTable";
import type { Metadata } from "next";
import { StructuredData, createMathFormulaSchema, createBreadcrumbSchema } from "@/components/structured-data/StructuredData";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";


export async function generateMetadata({ params }: { params: Promise<{ locale?: string; category?: string; pair?: string }> }): Promise<Metadata> {
  const { locale = "zh", category = "", pair = "" } = await params;
  let from = "";
  let to = "";
  const value = "1";
  if (pair) {
    const parts = pair.split("-to-").map(decodeURIComponent);
    from = parts[0] ?? "";
    to = parts[1] ?? "";
  }
  let categoryName = category;
  try {
    const { data } = await supabaseServer
      .from("unit_dictionary")
      .select("category,category_zh")
      .eq("category", category)
      .limit(1);
    const row = data?.[0] as { category?: string; category_zh?: string } | undefined;
    if (locale === "zh" && row?.category_zh) categoryName = row.category_zh;
  } catch {}
  let fromName = from;
  let toName = to;
  try {
    const pGuess = path.join(process.cwd(), "public", "data", encodeURIComponent(category), "guess.json");
    const rawGuess = fs.readFileSync(pGuess, "utf-8");
    const jsonGuess = JSON.parse(rawGuess) as { names?: Record<string, string> };
    if (jsonGuess.names) {
      fromName = jsonGuess.names[from] ?? fromName;
      toName = jsonGuess.names[to] ?? toName;
    }
  } catch {}
  const messages = locale === "en" ? en : zh;
  const vars = { value, fromName, toName, categoryName, from, to } as Record<string, string>;
  const tpl = (s: string) => s.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? "");
  const pairSeo = messages.pairSeo;

  return {
    title: tpl(pairSeo.title),
    description: tpl(pairSeo.description),
    keywords: (pairSeo.keywords as string[]).map(tpl),
    openGraph: {
      title: tpl(pairSeo.openGraphTitle),
      description: tpl(pairSeo.openGraphDescription),
    },
  };
}
// ISR配置 - 转换对页面每6小时重新验证
export const revalidate = 21600; // 6小时
export const dynamicParams = true;

// 生成静态参数，用于SSG
const LOCALES = ["zh", "en"] as const;

export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("unit_dictionary")
    .select("category, symbol")
    .eq("is_active", true)
    .limit(200);

  const params: { locale: string; category: string; pair: string }[] = [];
  const categorySymbols: Record<string, string[]> = {};
  const RESERVED_SEGMENTS = new Set(["api"]);

  // 按分类组织符号
  data?.forEach((item) => {
    if (!item.category || RESERVED_SEGMENTS.has(item.category)) return;
    if (!categorySymbols[item.category]) {
      categorySymbols[item.category] = [];
    }
    if (!categorySymbols[item.category].includes(item.symbol)) {
      categorySymbols[item.category].push(item.symbol);
    }
  });

  // 生成转换对
  Object.entries(categorySymbols).forEach(([category, symbols]) => {
    // 生成一些常见的转换对
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length && j < i + 5; j++) {
        for (const locale of LOCALES) {
          params.push({ locale, category, pair: `${symbols[i]}-to-${symbols[j]}` });
          params.push({ locale, category, pair: `${symbols[j]}-to-${symbols[i]}` });
        }
      }
    }
  });

  return params.slice(0, 300);
}

export default async function ConvertCategoryPage({ params }: { params: Promise<{ locale?: string; category?: string; pair?: string }> }) {
  const { locale = "zh", category = "", pair = "" } = await params;
  let symbols: string[] = [];
  let names: Record<string, string> = {};
  let sources: Record<string, string> = {};
  try {
    const pGuess = path.join(process.cwd(), "public", "data", encodeURIComponent(category), "guess.json");
    const rawGuess = fs.readFileSync(pGuess, "utf-8");
    const jsonGuess = JSON.parse(rawGuess) as { symbols?: string[]; names?: Record<string, string> };
    if (Array.isArray(jsonGuess.symbols)) symbols = jsonGuess.symbols.slice().sort();
    if (jsonGuess.names && typeof jsonGuess.names === "object") names = { ...jsonGuess.names };
  } catch { }
  if (symbols.length === 0) {
    try {
      const pAside = path.join(process.cwd(), "public", "data", encodeURIComponent(category), "aside.json");
      const rawAside = fs.readFileSync(pAside, "utf-8");
      const jsonAside = JSON.parse(rawAside) as { symbols?: string[]; names?: Record<string, string> };
      if (Array.isArray(jsonAside.symbols)) {
        jsonAside.symbols.forEach((s) => { if (s) symbols.push(s); });
      }
      if (jsonAside.names && typeof jsonAside.names === "object") {
        names = { ...names, ...jsonAside.names };
      }
    } catch { }
    symbols.sort();
  }
  if (symbols.length > 0) {
    const langs = locale.startsWith("en") ? ["en", "en-US", "en-GB"] : ["zh", "zh-CN"];
    try {
      const { data: locs } = await supabaseServer
        .from("unit_localizations")
        .select("unit_symbol,lang_code,name,source_description")
        .in("unit_symbol", symbols)
        .in("lang_code", langs)
        .limit(2000);
      let locNames = { ...names };
      let locSources: Record<string, string> = {};

      (locs ?? []).forEach((r: any) => {
        const k = r.unit_symbol as string;
        const nm = r.name as string;
        const sd = r.source_description as string | undefined;

        if (k && nm) locNames[k] = nm;
        if (k && sd) locSources[k] = sd;

      });
      names = locNames;
      sources = locSources;

    } catch { }
  }
  let from = "";
  let to = "";
  if (pair) {
    const parts = pair.split("-to-").map(decodeURIComponent);
    from = parts[0] ?? "";
    to = parts[1] ?? "";
  }
  const fromName = names[from] ?? from;
  const messages = locale === "en" ? (en as any) : (zh as any);
  const pairTitle = `${fromName} ${messages.common?.unitConverter}`;

  let categoryName = category;
  try {
    const { data } = await supabaseServer
      .from("unit_dictionary")
      .select("category,category_zh")
      .eq("category", category)
      .limit(1);
    const row = data?.[0] as { category?: string; category_zh?: string } | undefined;
    if (locale === "zh" && row?.category_zh) categoryName = row.category_zh;
  } catch { }

  // 创建数学公式结构化数据
  const mathSolverSchema = createMathFormulaSchema(from, to);

  // 创建面包屑结构化数据
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "首页", url: "https://unit-converter.com" },
    { name: `${categoryName}单位转换`, url: `https://unit-converter.com/${category}` },
    { name: `${names[from] ?? from}转${names[to] ?? to}`, url: `https://unit-converter.com/${category}/${pair}` }
  ]);

  return (
    <>
      <StructuredData data={mathSolverSchema} />
      <StructuredData data={breadcrumbSchema} />
      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="grid gap-4 md:grid-cols-4">
          <section className="md:col-span-3">
            <div className="text-left">
              <ConversionCard title={pairTitle} defaultFrom={from} defaultTo={to} />
            </div>
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>{messages.conversion?.backgroundTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ItemGroup>
                    <Item variant="muted">
                      <ItemContent>
                        <ItemTitle>{(names[from] ?? from) + ` [${from}]`}</ItemTitle>
                        <ItemDescription>{sources[from] ?? messages.home?.noData}</ItemDescription>
                      </ItemContent>
                    </Item>
                    <ItemSeparator />
                    <Item variant="muted">
                      <ItemContent>
                        <ItemTitle>{(names[to] ?? to) + ` [${to}]`}</ItemTitle>
                        <ItemDescription>{sources[from] ?? messages.home?.noData}</ItemDescription>
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
                locale={locale}
              />
            </div>
            <div className="mt-8">
              <GuessYouLike locale={locale} category={category} symbols={symbols} names={names} />
            </div>
          </section>
          <aside className="md:col-span-1">
            <CategoryAside title={messages.common?.recentConversions} category={category} />
          </aside>
        </div>
      </div>
    </>
  );
}
