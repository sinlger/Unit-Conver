import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get("symbols") ?? "";
  const lang = searchParams.get("lang") ?? "zh";
  const symbols = rawSymbols ? rawSymbols.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (symbols.length === 0) return NextResponse.json({}, { status: 200 });

  const { data } = await supabaseServer
    .from("unit_localizations")
    .select("unit_symbol,lang_code,name")
    .in("unit_symbol", symbols)
    .in("lang_code", [lang, `${lang}-CN`])
    .limit(2000);

  const m: Record<string, string> = {};
  (data as Array<{ unit_symbol: string; name: string }> | null)?.forEach((r) => {
    const k = r.unit_symbol as string;
    const nm = r.name as string;
    if (k && nm && !(k in m)) m[k] = nm;
  });
  return NextResponse.json(m, { status: 200 });
}