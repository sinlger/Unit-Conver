import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ category?: string }> }
) {
  const { category = "" } = await ctx.params;
  const decoded = decodeURIComponent(category);
  try {
    const { data: symRows } = await supabaseServer
      .from("unit_dictionary")
      .select("symbol")
      .eq("category", decoded)
      .eq("is_active", true)
      .order("symbol", { ascending: true })
      .limit(200);
    const symbols = Array.from(new Set((symRows ?? []).map((r: any) => r.symbol))).sort();

    let logs: any[] = [];
    if (symbols.length > 0) {
      const sel = "from_unit,input_value,to_unit,output_value,lang_code,conversion_count,first_seen_at,last_seen_at";
      const { data: a } = await supabaseServer
        .from("unit_conversion_logs")
        .select(sel)
        .in("from_unit", symbols)
        .order("last_seen_at", { ascending: false })
        .limit(20);
      const { data: b } = await supabaseServer
        .from("unit_conversion_logs")
        .select(sel)
        .in("to_unit", symbols)
        .order("last_seen_at", { ascending: false })
        .limit(20);
      const map = new Map<string, any>();
      [...((a ?? []) as any[]), ...((b ?? []) as any[])].forEach((r: any) => {
        const k = `${r.from_unit}-${r.input_value}-${r.to_unit}-${r.output_value}-${r.lang_code}`;
        if (!map.has(k)) map.set(k, r);
      });
      logs = Array.from(map.values())
        .sort((x: any, y: any) => String(y.last_seen_at).localeCompare(String(x.last_seen_at)))
        .slice(0, 20);
    }

    const units = Array.from(new Set([
      ...symbols,
      ...logs.map((r: any) => r.from_unit),
      ...logs.map((r: any) => r.to_unit),
    ]));
    let names: Record<string, string> = {};
    if (units.length > 0) {
      const { data: locs } = await supabaseServer
        .from("unit_localizations")
        .select("unit_symbol,lang_code,name")
        .in("unit_symbol", units)
        .in("lang_code", ["zh", "zh-CN"])
        .limit(2000);
      (locs ?? []).forEach((r: any) => {
        const k = r.unit_symbol as string;
        const nm = r.name as string;
        if (k && nm && !(k in names)) names[k] = nm;
      });
    }

    return NextResponse.json({ logs, names }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ logs: [], names: {} }, { status: 200 });
  }
}