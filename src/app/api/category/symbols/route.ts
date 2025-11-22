import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  if (!category) return NextResponse.json([], { status: 200 });

  const { data } = await supabaseServer
    .from("unit_dictionary")
    .select("symbol")
    .eq("category", category)
    .eq("is_active", true)
    .order("symbol", { ascending: true })
    .limit(200);

  const set = new Set<string>();
  (data as Array<{ symbol: string }> | null)?.forEach((r) => {
    if (r.symbol) set.add(r.symbol);
  });
  return NextResponse.json(Array.from(set).sort(), { status: 200 });
}