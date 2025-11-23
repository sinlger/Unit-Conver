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

// ISR配置 - 具体值转换页面每24小时重新验证
export const revalidate = 86400; // 24小时

export async function generateMetadata({ params }: { params: Promise<{ category?: string; pair?: string; valuePair?: string }> }): Promise<Metadata> {
  const { category = "", pair = "", valuePair = "" } = await params;
  
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
  
  // 获取分类中文名称
  const categoryNames: Record<string, string> = {
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
  
  // 获取单位名称（先从本地化数据中获取，如果没有则使用符号）
  let fromName = from;
  let toName = to;
  
  // 直接从数据库获取单位名称
  const { data: unitData } = await supabaseServer
    .from("unit_localizations")
    .select("unit_symbol,lang_code,name")
    .in("unit_symbol", [from, to])
    .in("lang_code", ["zh", "zh-CN"])
    .limit(10);
  
  (unitData as Array<{ unit_symbol: string; name: string }> | null)?.forEach((r) => {
    if (r.unit_symbol === from) fromName = r.name;
    if (r.unit_symbol === to) toName = r.name;
  });
  
  return {
    title: `${value}${fromName}等于多少${toName}？ | ${categoryName}单位转换计算`,
    description: `在线计算${value}${fromName}等于多少${toName}，详细的转换步骤和计算过程，包含${fromName}到${toName}的换算公式和实例说明。`,
    keywords: [
      `${value}${from}转${to}`, 
      `${from}到${to}`, 
      `${value}${from}等于多少${to}`,
      `${value}${fromName}转${toName}`,
      `${fromName}到${toName}`,
      `${value}${fromName}等于多少${toName}`,
      "单位转换", 
      categoryName,
      `${categoryName}单位换算`
    ],
    openGraph: {
      title: `${value}${fromName}等于多少${toName}？`,
      description: `在线计算${value}${fromName}等于多少${toName}，包含详细的转换步骤和${fromName}到${toName}的换算公式`,
    },
  };
}

// 生成静态参数，用于SSG
export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("unit_dictionary")
    .select("category, symbol")
    .eq("is_active", true)
    .limit(100);
  
  const params: { category: string; pair: string; valuePair: string }[] = [];
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
  
  // 生成常见转换值对
  const commonValues = ["1", "10", "100", "1000"];
  
  Object.entries(categorySymbols).forEach(([category, symbols]) => {
    // 生成一些常见的转换对和值
    for (let i = 0; i < symbols.length && i < 3; i++) {
      for (let j = 0; j < symbols.length && j < 3 && j !== i; j++) {
        const pair = `${symbols[i]}-to-${symbols[j]}`;
        commonValues.forEach((value) => {
          params.push({
            category: category,
            pair: pair,
            valuePair: `${value}${symbols[i]}-to-${symbols[j]}`,
          });
        });
      }
    }
  });
  
  return params.slice(0, 50); // 限制数量
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

export default async function ConvertWithValuePage({ params }: { params: Promise<{ category?: string; pair?: string; valuePair?: string }> }) {
  const { category = "", pair = "", valuePair = "" } = await params;
  const rows = await fetchByCategory(category);
  const symbols = Array.from(new Set(rows.map((r) => r.symbol))).sort();
  let names: Record<string, string> = {};
  let sources: Record<string, string> = {};
  if (symbols.length > 0) {
    const { data } = await supabaseServer
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

  // 获取分类中文名称
  const categoryNames: Record<string, string> = {
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
  
  // 获取单位名称（先从本地化数据中获取，如果没有则使用符号）
  let fromName = names[from] ?? from;
  let toName = names[to] ?? to;

  const pairTitle = from && to ? `${defaultValue}${fromName} 转 ${toName} 单位换算器` : "单位换算器";

  // 创建增强的数学公式结构化数据 - 包含具体数值和翻译信息
  const enhancedMathSolverSchema = {
    "@context": "https://schema.org",
    "@type": "MathSolver",
    "name": `${defaultValue}${fromName}转${toName}计算器`,
    "description": `在线计算${defaultValue}${fromName}等于多少${toName}，详细的转换步骤和计算过程，包含${fromName}到${toName}的换算公式和实例说明`,
    "url": `https://unit-converter.com/${category}/${pair}/${valuePair}`,
    "mathExpression": `${defaultValue}${from} = result * ${to}`,
    "inputTypes": ["unit conversion", "mathematical calculation"],
    "educationalLevel": "intermediate",
    "teaches": [
      `${fromName}单位`,
      `${toName}单位`,
      `${categoryName}单位转换`,
      `数学换算`
    ],
    "about": {
      "@type": "Thing",
      "name": `${fromName}到${toName}转换`,
      "description": `${categoryName}单位转换工具`
    }
  };

  // 创建面包屑结构化数据 - 四级面包屑（使用翻译后的名称）
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "首页", url: "https://unit-converter.com" },
    { name: `${categoryName}单位转换`, url: `https://unit-converter.com/${category}` },
    { name: `${fromName}转${toName}`, url: `https://unit-converter.com/${category}/${pair}` },
    { name: `${defaultValue}${fromName}转${toName}`, url: `https://unit-converter.com/${category}/${pair}/${valuePair}` }
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