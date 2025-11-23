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
import { StructuredData } from "@/components/structured-data/StructuredData";
import { createMathFormulaSchema, createBreadcrumbSchema } from "@/components/structured-data/StructuredData";


export async function generateMetadata({ params }: { params: Promise<{ category?: string; pair?: string }> }): Promise<Metadata> {
  const { category = "", pair = "" } = await params;
  const [from, to] = pair.split("-to-").map(decodeURIComponent);
  
  return {
    title: `${from}转${to} | ${category}单位转换`,
    description: `在线${from}到${to}转换工具，快速准确地将${from}转换为${to}，支持反向转换。`,
    keywords: [`${from}转${to}`, `${from}到${to}`, "单位转换", category],
  };
}
// ISR配置 - 转换对页面每6小时重新验证
export const revalidate = 21600; // 6小时

// 生成静态参数，用于SSG
export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("unit_dictionary")
    .select("category, symbol")
    .eq("is_active", true)
    .limit(200);
  
  const params: { category: string; pair: string }[] = [];
  const categorySymbols: Record<string, string[]> = {};
  
  // 按分类组织符号
  data?.forEach((item) => {
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
        params.push({
          category: category,
          pair: `${symbols[i]}-to-${symbols[j]}`,
        });
        params.push({
          category: category,
          pair: `${symbols[j]}-to-${symbols[i]}`,
        });
      }
    }
  });
  
  return params.slice(0, 100); // 限制数量以避免构建时间过长
}

type Row = { symbol: string; category: string; is_active: boolean | null };

async function fetchByCategory(cat: string): Promise<Row[]> {
  const { data, error } = await supabaseServer
    .from("unit_dictionary")
    .select("symbol,category,is_active")
    .eq("category", cat)
    .order("symbol", { ascending: true })
    .limit(500);
  if (error) return [];
  return (data as Row[]) ?? [];
}

export default async function ConvertCategoryPage({ params }: { params: Promise<{ category?: string; pair?: string }> }) {
  const { category = "", pair = "" } = await params;
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
      const pGuess = path.join(process.cwd(), "public", "data", encodeURIComponent(category), "guess.json");
      const rawGuess = fs.readFileSync(pGuess, "utf-8");
      const jsonGuess = JSON.parse(rawGuess) as { symbols?: string[]; names?: Record<string, string> };
      if (Array.isArray(jsonGuess.symbols)) {
        jsonGuess.symbols.forEach((s) => { if (s) symbols.push(s); });
      }
      if (jsonGuess.names && typeof jsonGuess.names === "object") {
        names = { ...names, ...jsonGuess.names };
      }
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
    }
    symbols.sort();
  }
  let from = "";
  let to = "";
  if (pair) {
    const parts = pair.split("-to-").map(decodeURIComponent);
    from = parts[0] ?? "";
    to = parts[1] ?? "";
  }
  const pairTitle = from && to ? `${names[from] ?? from} 转 ${names[to] ?? to} 单位换算器` : "单位换算器";
  console.log(pairTitle)
  console.log(from)
  console.log(to)

  // 获取分类中文名称
  let categoryNames: Record<string, string> = {
    length: "长度",
    area: "面积", 
    volume: "体积",
    mass: "质量",
    temperature: "温度",
    pressure: "压力",
    power: "功率",
    speed: "速度",
    frequency: "频率",
    current: "电流",
    voltage: "电压",
    resistance: "电阻",
    energy: "能量",
    illuminance: "照度",
    angle: "角度",
    time: "时间",
    digital: "数字存储",
    volumeFlowRate: "流量"
  };
  
  const categoryName = categoryNames[category] || category;

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
    </>
  );
}