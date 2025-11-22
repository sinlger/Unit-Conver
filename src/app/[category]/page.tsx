import { supabaseServer } from "@/lib/supabaseServer";
import ConversionCard from "@/components/units/ConversionCard";
import CategoryAside from "@/components/aside/CategoryAside";
import GuessYouLike from "@/components/recommend/GuessYouLike";
import { CATEGORY_ARTICLES } from "@/content/categoryMap";
import type { Metadata } from "next";
import { StructuredData } from "@/components/structured-data/StructuredData";
import { createConversionToolSchema, createBreadcrumbSchema } from "@/components/structured-data/StructuredData";

export async function generateMetadata({ params }: { params: Promise<{ category?: string }> }): Promise<Metadata> {
  const { category = "" } = await params;
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
  
  return {
    title: `${categoryName}单位转换 | 单位转换器`,
    description: `专业的${categoryName}单位转换工具，支持各种${categoryName}单位之间的相互转换，如${categoryName}到${categoryName}、${categoryName}到${categoryName}等。`,
    keywords: [`${categoryName}转换`, `${categoryName}单位`, "单位转换"],
    openGraph: {
      title: `${categoryName}单位转换`,
      description: `专业的${categoryName}单位转换工具`,
    },
  };
}
// ISR配置 - 分类页面每小时重新验证
export const revalidate = 3600; // 1小时

// 生成静态参数，用于SSG
export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("unit_dictionary")
    .select("category")
    .eq("is_active", true)
    .limit(100);
  
  const categories = Array.from(new Set(data?.map((item) => item.category) || []));
  
  return categories.map((category) => ({
    category: category,
  }));
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

export default async function ConvertCategoryPage({ params }: { params: Promise<{ category?: string }> }) {
  const { category = "" } = await params;
  const rows = await fetchByCategory(category);
  const symbols = Array.from(new Set(rows.map((r) => r.symbol))).sort();
  let names: Record<string, string> = {};
  if (symbols.length > 0) {
    const { data } = await supabaseServer
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
  const { data: catRows } = await supabaseServer
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

  // 生成分类页面的结构化数据
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
  
  // 创建转换工具结构化数据
  const webAppSchema = createConversionToolSchema(category, categoryName);

  // 创建面包屑结构化数据
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "首页", url: "https://unit-converter.com" },
    { name: `${categoryName}单位转换`, url: `https://unit-converter.com/${category}` }
  ]);

  return (
    <>
      <StructuredData data={webAppSchema} />
      <StructuredData data={breadcrumbSchema} />
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
    </>
  );
}