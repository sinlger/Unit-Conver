import { supabaseServer } from "@/lib/supabaseServer";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const jsonHeaders = { "content-type": "application/json", "cache-control": "no-store" } as const;
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "",
    NODE_ENV: process.env.NODE_ENV ?? "",
  };

  const serverProbe: any = {};
  try {
    const { data, error } = await supabaseServer
      .from("unit_dictionary")
      .select("category")
      .limit(1);
    serverProbe.ok = !error;
    serverProbe.error = error ? { message: String(error.message ?? error), hint: "server" } : null;
    serverProbe.sample = (data ?? []).slice(0, 1);
  } catch (e: any) {
    serverProbe.ok = false;
    serverProbe.error = { message: String(e?.message ?? e), hint: "server-catch" };
  }

  const clientProbe: any = {};
  try {
    const { data, error } = await supabase
      .from("unit_dictionary")
      .select("category")
      .limit(1);
    clientProbe.ok = !error;
    clientProbe.error = error ? { message: String(error.message ?? error), hint: "client" } : null;
    clientProbe.sample = (data ?? []).slice(0, 1);
  } catch (e: any) {
    clientProbe.ok = false;
    clientProbe.error = { message: String(e?.message ?? e), hint: "client-catch" };
  }

  const payload = { env, serverProbe, clientProbe };
  // Raw REST probe for detailed status
  const restProbe: any = {};
  try {
    const url = (env.SUPABASE_URL).replace(/\/$/, "") + "/rest/v1/unit_dictionary?select=category&limit=1";
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
        Accept: "application/json",
      },
    });
    restProbe.status = res.status;
    restProbe.ok = res.ok;
    restProbe.body = res.ok ? await res.json() : await res.text();
  } catch (e: any) {
    restProbe.ok = false;
    restProbe.error = String(e?.message ?? e);
  }

  return new Response(JSON.stringify({ env, serverProbe, clientProbe, restProbe }), { status: 200, headers: jsonHeaders });
}
