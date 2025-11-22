import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  const limitParam = searchParams.get("limit") ?? "20";
  const limit = Math.max(1, Math.min(100, Number(limitParam) || 20));
  if (!category) return NextResponse.json([], { status: 200 });

  const { data: dict } = await supabaseServer
    .from("unit_dictionary")
    .select("symbol")
    .eq("category", category)
    .eq("is_active", true)
    .order("symbol", { ascending: true })
    .limit(200);
  const symbols = Array.from(new Set((dict as Array<{ symbol: string }> | null)?.map((r) => r.symbol) ?? [])).sort();
  if (symbols.length === 0) return NextResponse.json([], { status: 200 });

  const sel = "from_unit,input_value,to_unit,output_value,lang_code,conversion_count,first_seen_at,last_seen_at";
  const { data: a } = await supabaseServer
    .from("unit_conversion_logs")
    .select(sel)
    .in("from_unit", symbols)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  const { data: b } = await supabaseServer
    .from("unit_conversion_logs")
    .select(sel)
    .in("to_unit", symbols)
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  const map = new Map<string, any>();
  [...((a ?? []) as any[]), ...((b ?? []) as any[])].forEach((r) => {
    const k = `${r.from_unit}-${r.input_value}-${r.to_unit}-${r.output_value}-${r.lang_code}`;
    if (!map.has(k)) map.set(k, r);
  });
  const merged = Array.from(map.values()).sort((x: any, y: any) => String(y.last_seen_at).localeCompare(String(x.last_seen_at))).slice(0, limit);
  return NextResponse.json(merged, { status: 200 });
}