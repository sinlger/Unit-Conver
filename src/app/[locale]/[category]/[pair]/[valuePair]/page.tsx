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
import { StructuredData, createBreadcrumbSchema } from "@/components/structured-data/StructuredData";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

// ISR配置 - 具体值转换页面每24小时重新验证
export const revalidate = 86400; // 24小时
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ locale?: string; category?: string; pair?: string; valuePair?: string }> }): Promise<Metadata> {
  const { locale = "zh", category = "", pair = "", valuePair = "" } = await params;
  
  let from = "";
  let to = "";
  let value = "1";
  
  if (pair) {
    const parts = pair.split("-to-").map(decodeURIComponent);
    from = parts[0] ?? "";
    to = parts[1] ?? "";
  }
  
  if (valuePair) {
    const parts = valuePair.split("-to-").map(decodeURIComponent);
    const left = parts[0] ?? "";
    const m = left.match(/^([0-9]*\.?[0-9]+)([A-Za-z]+)$/);
    if (m) {
      value = m[1] ?? "1";
      from = m[2] ?? from;
    }
    to = parts[1] ?? to;
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
  
  // 获取单位名称（优先从构建期静态 JSON 读取，减少 supabase 调用）
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
  
  const messages = locale === "en" ? (en as any) : (zh as any);
  const vars = { value, fromName, toName, categoryName, from, to } as Record<string, string>;
  const tpl = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  const pairSeo = messages.pairSeo as any;

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

// 生成静态参数，用于SSG
const LOCALES = ["zh", "en"] as const;

export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("unit_dictionary")
    .select("category, symbol")
    .eq("is_active", true)
    .limit(100);
  
  const params: { locale: string; category: string; pair: string; valuePair: string }[] = [];
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
  
  // 生成常见转换值对
  const commonValues = ["1", "10", "100", "1000"];
  
  Object.entries(categorySymbols).forEach(([category, symbols]) => {
    // 生成一些常见的转换对和值
    for (let i = 0; i < symbols.length && i < 3; i++) {
      for (let j = 0; j < symbols.length && j < 3 && j !== i; j++) {
        const pair = `${symbols[i]}-to-${symbols[j]}`;
        for (const locale of LOCALES) {
          commonValues.forEach((value) => {
            params.push({
              locale,
              category,
              pair,
              valuePair: `${value}${symbols[i]}-to-${symbols[j]}`,
            });
          });
        }
      }
    }
  });
  
  return params.slice(0, 200);
}

 

export default async function ConvertWithValuePage({ params }: { params: Promise<{ locale?: string; category?: string; pair?: string; valuePair?: string }> }) {
  const { locale = "zh", category = "", pair = "", valuePair = "" } = await params;
  let symbols: string[] = [];
  let names: Record<string, string> = {};
  let sources: Record<string, string> = {};
  try {
    const pGuess = path.join(process.cwd(), "public", "data", encodeURIComponent(category), "guess.json");
    const rawGuess = fs.readFileSync(pGuess, "utf-8");
    const jsonGuess = JSON.parse(rawGuess) as { symbols?: string[]; names?: Record<string, string> };
    if (Array.isArray(jsonGuess.symbols)) symbols = jsonGuess.symbols.slice().sort();
    if (jsonGuess.names && typeof jsonGuess.names === "object") names = { ...jsonGuess.names };
  } catch {}
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
    } catch {}
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
    } catch {}
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
  
  // 获取单位名称（先从本地化数据中获取，如果没有则使用符号）
  let fromName = names[from] ?? from;
  let toName = names[to] ?? to;

  const messages = locale === "en" ? (en as any) : (zh as any);
  const pairTitle = `${defaultValue}${fromName} ${messages.common?.unitConverter}`;

  // 创建增强的数学公式结构化数据 - 包含具体数值和翻译信息
  const structured = messages.structured as any;
  const vars = { value: defaultValue, fromName, toName, categoryName, from, to } as Record<string, string>;
  const tpl = (s: string) => s.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? "");
  const enhancedMathSolverSchema = {
    "@context": "https://schema.org",
    "@type": "MathSolver",
    "name": tpl(structured.mathSolver.name.replace("{value}", defaultValue)),
    "description": tpl(structured.mathSolver.description.replace("{value}", defaultValue)),
    "url": `https://unit-converter.com/${category}/${pair}/${valuePair}`,
    "mathExpression": `${defaultValue}${from} = result * ${to}`,
    "inputTypes": (structured.mathSolver.inputTypes as string[]).map(tpl),
    "educationalLevel": structured.mathSolver.educationalLevel,
    "teaches": (structured.mathSolver.teaches as string[]).map(tpl),
    "about": {
      "@type": "Thing",
      "name": tpl(structured.mathSolver.aboutName),
      "description": tpl(structured.mathSolver.aboutDescription)
    }
  };

  // 创建面包屑结构化数据 - 四级面包屑（使用翻译后的名称）
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tpl(structured.breadcrumb.home), url: "https://unit-converter.com" },
    { name: tpl(structured.breadcrumb.category), url: `https://unit-converter.com/${category}` },
    { name: tpl(structured.breadcrumb.pair), url: `https://unit-converter.com/${category}/${pair}` },
    { name: tpl(structured.breadcrumb.valuePair.replace("{value}", defaultValue)), url: `https://unit-converter.com/${category}/${pair}/${valuePair}` }
  ]);

  return (
    <>
      <StructuredData data={enhancedMathSolverSchema} />
      <StructuredData data={breadcrumbSchema} />
      <div className="mx-auto max-w-5xl px-6 py-7">
        <div className="grid gap-4 md:grid-cols-4">
          <section className="md:col-span-3">
            <div className=" text-left">
              <ConversionCard title={pairTitle} defaultFrom={from} defaultTo={to} defaultValue={defaultValue} />
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
                      <ItemDescription>{sources[to] ?? messages.home?.noData}</ItemDescription>
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
            <GuessYouLike category={category} symbols={symbols} names={names} />
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
