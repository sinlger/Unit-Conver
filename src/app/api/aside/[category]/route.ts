import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import type { NextRequest } from "next/server";

export async function GET(req: NextRequest, ctx: { params: Promise<{ category: string }> }) {
  const jsonHeaders = { "content-type": "application/json", "cache-control": "no-store" };
  const { category = "" } = await ctx.params;
  const decoded = decodeURIComponent(category);
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const locale = url.searchParams.get("locale") || "zh";
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
      const list = symbols.map((s) => `${s}`);
      const inExpr = list.join(",");
      const { data: raw } = await supabaseServer
        .from("unit_conversion_logs")
        .select(sel)
        .or(`from_unit.in.(${inExpr}),to_unit.in.(${inExpr})`)
        .order("last_seen_at", { ascending: false })
        .limit(40);
      const map = new Map<string, any>();
      (raw ?? []).forEach((r: any) => {
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
      const langs = locale.startsWith("en") ? ["en", "en-US", "en-GB"] : ["zh", "zh-CN"];
      const { data: locs } = await supabaseServer
        .from("unit_localizations")
        .select("unit_symbol,lang_code,name")
        .in("unit_symbol", units)
        .in("lang_code", langs)
        .limit(2000);
      (locs ?? []).forEach((r: any) => {
        const k = r.unit_symbol as string;
        const nm = r.name as string;
        if (k && nm && !(k in names)) names[k] = nm;
      });
    }
    const payload = debug
      ? { logs, names, _debug: { symbolCount: symbols.length, logCount: logs.length, unitCount: units.length } }
      : { logs, names };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...jsonHeaders, "cache-control": "public, s-maxage=600, stale-while-revalidate=86400, max-age=0" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ logs: [], names: {}, error: "internal" }), {
      status: 200,
      headers: jsonHeaders,
    });
  }
}
