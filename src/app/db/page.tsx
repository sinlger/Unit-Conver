import { supabase } from "@/lib/supabase";
import type { UnitDictionary, UnitLocalization, UnitConversionLog } from "@/lib/types";

export const revalidate = 60;

 


async function fetchUnitDictionary(): Promise<UnitDictionary[] | null> {
  const { data } = await supabase
    .from("unit_dictionary")
    .select("symbol,category,category_zh,is_active,created_at")
    .order("symbol", { ascending: true })
    .limit(100);
  return (data as UnitDictionary[]) ?? null;
}

async function fetchUnitLocalizations(): Promise<UnitLocalization[] | null> {
  const { data } = await supabase
    .from("unit_localizations")
    .select("unit_symbol,lang_code,name")
    .order("unit_symbol", { ascending: true })
    .limit(200);
  return (data as UnitLocalization[]) ?? null;
}

async function fetchConversionLogs(): Promise<UnitConversionLog[] | null> {
  const { data } = await supabase
    .from("unit_conversion_logs")
    .select(
      "from_unit,input_value,to_unit,output_value,lang_code,conversion_count,first_seen_at,last_seen_at"
    )
    .order("last_seen_at", { ascending: false })
    .limit(100);
  return (data as UnitConversionLog[]) ?? null;
}

export default async function DBPage() {
  const [units, locales, logs] = await Promise.all([
    fetchUnitDictionary(),
    fetchUnitLocalizations(),
    fetchConversionLogs(),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-6 grid gap-8">
      

      

      <section>
        <h2 className="text-lg font-semibold mb-3">unit_dictionary</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm border border-border">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="border px-3 py-2 whitespace-nowrap">symbol</th>
                <th className="border px-3 py-2 whitespace-nowrap">category</th>
                <th className="border px-3 py-2 whitespace-nowrap">category_zh</th>
                <th className="border px-3 py-2 whitespace-nowrap">is_active</th>
                <th className="border px-3 py-2 whitespace-nowrap">created_at</th>
              </tr>
            </thead>
            <tbody>
              {(units ?? []).map((r) => (
                <tr key={r.symbol}>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.symbol}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.category}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.category_zh}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{String(r.is_active)}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {units === null && <div>暂无数据或读取失败</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">unit_localizations</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm border border-border">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="border px-3 py-2 whitespace-nowrap">unit_symbol</th>
                <th className="border px-3 py-2 whitespace-nowrap">lang_code</th>
                <th className="border px-3 py-2 whitespace-nowrap">name</th>
              </tr>
            </thead>
            <tbody>
              {(locales ?? []).map((r) => (
                <tr key={`${r.unit_symbol}-${r.lang_code}`}>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.unit_symbol}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.lang_code}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {locales === null && <div>暂无数据或读取失败</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">unit_conversion_logs</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm border border-border">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="border px-3 py-2 whitespace-nowrap">from_unit</th>
                <th className="border px-3 py-2 whitespace-nowrap">input_value</th>
                <th className="border px-3 py-2 whitespace-nowrap">to_unit</th>
                <th className="border px-3 py-2 whitespace-nowrap">output_value</th>
                <th className="border px-3 py-2 whitespace-nowrap">lang_code</th>
                <th className="border px-3 py-2 whitespace-nowrap">conversion_count</th>
                <th className="border px-3 py-2 whitespace-nowrap">first_seen_at</th>
                <th className="border px-3 py-2 whitespace-nowrap">last_seen_at</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((r) => (
                <tr key={`${r.from_unit}-${r.input_value}-${r.to_unit}-${r.output_value}-${r.lang_code}`}>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.from_unit}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.input_value}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.to_unit}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.output_value}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.lang_code}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.conversion_count}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.first_seen_at}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">{r.last_seen_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs === null && <div>暂无数据或读取失败</div>}
        </div>
      </section>
    </div>
  );
}