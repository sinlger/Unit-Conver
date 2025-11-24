"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import convert from "convert-units";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { ArrowLeftRight, Copy } from "lucide-react";
import { toast } from "sonner";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

type Row = { symbol: string; category: string };

export default function ConversionCard({ title, defaultFrom, defaultTo, selectDisabled, defaultValue }: { title?: string; defaultFrom?: string; defaultTo?: string; selectDisabled?: boolean; defaultValue?: string }) {
  const pathname = usePathname() ?? "/";
  const [locale, category] = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const seg = parts[0] || "zh";
    const loc = ["zh","en"].includes(seg) ? seg : "zh";
    const cat = decodeURIComponent(parts[1] ?? "");
    return [loc, cat];
  }, [pathname]);
  const m: any = locale === "en" ? en : zh;
  const fmt = (t: string | undefined, v: Record<string, any>) => (t ?? "").replace(/\{(\w+)\}/g, (_: string, k: string) => String(v[k] ?? `{${k}}`));

  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryZh, setCategoryZh] = useState<string>("");
  const [namesMap, setNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!category) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("unit_dictionary")
          .select("symbol,category")
          .eq("category", category)
          .order("symbol", { ascending: true })
          .limit(1000);
        if (error) throw error;
        const set = new Set<string>();
        (data as Row[]).forEach((r) => { if (r.symbol) set.add(r.symbol); });
        const list = Array.from(set).sort();
        
        let supported: string[] = [];
        try {
          const measures = convert().measures() as string[];
          let picked: string | null = null;
          for (const m of measures) {
            const abbrs = (convert().list(m) as any[]).map((u: any) => u.abbr as string);
            const inter = list.filter((s) => abbrs.includes(s));
            if (inter.length >= 2) { picked = m; supported = inter; break; }
          }
          if (!picked) {
            supported = list.filter((s) => {
              try {
                const poss = (convert().from(s).possibilities() as string[] | undefined) ?? [];
                return poss.length > 0;
              } catch { return false; }
            });
          }
        } catch { supported = list; }
        if (!cancelled) setSymbols(supported.length ? supported : list);
        const { data: catRows } = await supabase
          .from("unit_dictionary")
          .select("category,category_zh")
          .eq("category", category)
          .limit(1);
        if (!cancelled) {
          const zh = (catRows?.[0]?.category_zh as string | null) ?? null;
          setCategoryZh(zh ?? category);
        }
        const namesSource = supported.length ? supported : list;
        if (namesSource.length) {
          const { data: locs } = await supabase
            .from("unit_localizations")
            .select("unit_symbol,lang_code,name")
            .in("unit_symbol", namesSource)
          .in("lang_code", locale === "en" ? ["en", "en-US", "en-GB"] : ["zh", "zh-CN"]) 
            .limit(2000);
          const m: Record<string, string> = {};
          (locs ?? []).forEach((r: any) => {
            const k = r.unit_symbol as string;
            const nm = r.name as string;
            if (k && nm && !(k in m)) m[k] = nm;
          });
          if (!cancelled) setNamesMap(m);
        } else {
          if (!cancelled) setNamesMap({});
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? m.conversion?.queryFailedPrefix);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [category]);

  const form = useForm<{ from: string; to: string; value: string }>({
    defaultValues: { from: "", to: "", value: "1" },
  });
  const [result, setResult] = useState<string>("");
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    if (symbols.length >= 2) {
      const f = defaultFrom && symbols.includes(defaultFrom) ? defaultFrom : symbols[0];
      const t = defaultTo && symbols.includes(defaultTo) ? defaultTo : symbols[1];
      form.setValue("from", f);
      form.setValue("to", t);
    } else if (symbols.length === 1) {
      const f = defaultFrom && symbols.includes(defaultFrom) ? defaultFrom : symbols[0];
      const t = defaultTo && symbols.includes(defaultTo) ? defaultTo : symbols[0];
      form.setValue("from", f);
      form.setValue("to", t);
    } else {
      form.setValue("from", "");
      form.setValue("to", "");
    }
  }, [symbols, form, defaultFrom, defaultTo]);

  useEffect(() => {
    if (typeof defaultValue === "string" && defaultValue.length > 0) {
      form.setValue("value", defaultValue);
    }
  }, [defaultValue, form]);

  useEffect(() => {
    const { value, from, to } = form.getValues();
    const v = Number(value);
    if (typeof defaultValue === "string" && defaultValue.length > 0 && from && to && !Number.isNaN(v)) {
      try {
        const out = convert(v).from(from).to(to);
        setResult(String(out));
        setConvertError(null);
      } catch {
        setConvertError(m.conversion?.queryFailedPrefix);
      }
    }
  }, [symbols, defaultValue, defaultFrom, defaultTo]);

  const onConvert = async () => {
    setConvertError(null);
    setResult("");
    const { value, from, to } = form.getValues();
    const v = Number(value);
    if (!from || !to || Number.isNaN(v)) {
      setConvertError(m.conversion?.queryFailedPrefix);
      return;
    }
    try {
      const out = convert(v).from(from).to(to);
      setResult(String(out));
      try {
        const now = new Date().toISOString();
        const match = {
          from_unit: from,
          input_value: String(value),
          to_unit: to,
          output_value: String(out),
          lang_code: locale,
        };
        const { data: rows } = await supabase
          .from("unit_conversion_logs")
          .select("conversion_count")
          .eq("from_unit", match.from_unit)
          .eq("input_value", match.input_value)
          .eq("to_unit", match.to_unit)
          .eq("output_value", match.output_value)
          .eq("lang_code", match.lang_code)
          .limit(1);
        const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] as { conversion_count: number | null } : null;
        if (existing) {
          await supabase
            .from("unit_conversion_logs")
            .update({ conversion_count: (existing.conversion_count ?? 0) + 1, last_seen_at: now })
            .eq("from_unit", match.from_unit)
            .eq("input_value", match.input_value)
            .eq("to_unit", match.to_unit)
            .eq("output_value", match.output_value)
            .eq("lang_code", match.lang_code);
        } else {
          await supabase
            .from("unit_conversion_logs")
            .insert({ ...match, conversion_count: 1, first_seen_at: now, last_seen_at: now });
        }
      } catch {}
    } catch {
      setConvertError("无法转换，单位不兼容或未被支持");
    }
  };

  const copyResult = async () => {
    const val = result;
    if (!val) return;
    try {
      await navigator.clipboard.writeText(String(val));
      toast.success(m.conversion?.copyResultAria);
    } catch {
      toast.error(m.conversion?.queryFailedPrefix);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? `${(m.categories?.[category] ?? category)} ${m.categoryPage?.titleSuffix}`}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <CardFooter className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-end p-0">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.conversion?.fromLabel}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 px-4 text-base" disabled={loading || symbols.length === 0 || !!selectDisabled}>
                          <SelectValue placeholder={m.conversion?.selectSource} />
                        </SelectTrigger>
                        <SelectContent>
                          {symbols.map((a) => (
                            <SelectItem key={`from-${a}`} value={a}>{(namesMap[a] ?? a) + ` [${a}]`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const f = form.getValues("from");
                    const t = form.getValues("to");
                    form.setValue("from", t ?? "");
                    form.setValue("to", f ?? "");
                  }}
                  disabled={!form.getValues("from") || !form.getValues("to")}
                  aria-label={m.conversion?.swapAria}
                  type="button"
                  className="h-12 w-12"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                </Button>
              </FormItem>

              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.conversion?.toLabel}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 px-4 text-base" disabled={loading || symbols.length === 0 || !!selectDisabled}>
                          <SelectValue placeholder={m.conversion?.selectTarget} />
                        </SelectTrigger>
                        <SelectContent>
                          {symbols.map((a) => (
                            <SelectItem key={`to-${a}`} value={a}>{(namesMap[a] ?? a) + ` [${a}]`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </CardFooter>

            <CardFooter className="grid gap-3 md:grid-cols-[1fr_auto] items-end p-0">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.conversion?.quantity}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={m.conversion?.inputPlaceholder} className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem className="flex items-end">
                <Button size="lg" className="h-12 w-full md:w-44 text-base" disabled={loading || symbols.length < 1} type="button" onClick={onConvert}>{m.conversion?.convert}</Button>
              </FormItem>
            </CardFooter>

            {error && <CardFooter className="p-0 text-sm text-destructive">{m.conversion?.queryFailedPrefix}{error}</CardFooter>}
            {convertError && <CardFooter className="p-0 text-sm text-destructive">{convertError}</CardFooter>}

            <CardFooter className="grid gap-2 p-0">
              <Label>{m.conversion?.resultLabel}</Label>
              <InputGroup className="h-12 text-base">
                <InputGroupInput readOnly value={(() => {
                  const { value, from, to } = form.getValues();
                  return result !== "" ? `${value} ${from} = ${result} ${to}` : "";
                })()} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant="ghost"  size="icon-sm" aria-label={m.conversion?.copyResultAria} onClick={copyResult}>
                    <Copy className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </CardFooter>
            <CardFooter className="grid gap-2 p-0">
              {(() => {
                const { value, from, to } = form.getValues();
                const fromName = namesMap[from] ?? from;
                const toName = namesMap[to] ?? to;
                if (result === "") return null;
                return (
                  <div className="mt-2">
                    <div className="text-lg">{value} {fromName} ({from}) =</div>
                    <div className="mt-2 text-4xl font-bold tracking-tight">{result} {toName}</div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      {fmt(m.conversion?.equalsInline, { value, from: fromName, result, to: toName })}
                      <span className="mx-2">|</span>
                      <a href={`/${encodeURIComponent(locale)}/${encodeURIComponent(category)}/${encodeURIComponent(to)}-to-${encodeURIComponent(from)}`}>{fmt(m.conversion?.linkReverse, { to: toName, from: fromName })}</a>
                    </div>
                  </div>
                );
              })()}
            </CardFooter>
            <CardFooter className="grid gap-2 p-0">
              {(() => {
                const { value, from, to } = form.getValues();
                const v = Number(value);
                if (result === "" || !from || !to || Number.isNaN(v)) return null;
                const fromName = namesMap[from] ?? from;
                const toName = namesMap[to] ?? to;
                let ratio = "";
                try { ratio = String(convert(1).from(from).to(to)); } catch { ratio = ""; }
                let measure = "";
                try {
                  const measures = convert().measures() as string[];
                  for (const m of measures) {
                    const abbrs = (convert().list(m) as any[]).map((u: any) => u.abbr as string);
                    if (abbrs.includes(from) && abbrs.includes(to)) { measure = m; break; }
                  }
                } catch {}
                const measureName = m.categories?.[measure] ?? measure;
                return (
                  <div className="grid gap-4">
                    <div>
                      {m.conversion?.questionTitle}
                      <div className="mt-2">
                        {fmt(m.conversion?.questionText, { value, fromName, from, toName, to })}
                      </div>
                    </div>
                    <div>
                      {m.conversion?.backgroundTitle}
                      <div className="mt-2">
                        {fmt(m.conversion?.backgroundText, { fromName, from, toName, to, measureName })}
                        <div className="mt-1">{fmt(m.conversion?.backgroundEq, { from, ratio, to })}</div>
                      </div>
                    </div>
                    <div>
                      {m.conversion?.processTitle}
                      <div className="mt-2">
                        {fmt(m.conversion?.processText, { value, from, to })}
                        <div className="mt-1">{fmt(m.conversion?.processEq, { value, from, ratio, result, to })}</div>
                      </div>
                    </div>
                    <div>
                      {m.conversion?.conclusionTitle}
                      <div className="mt-2">
                        {fmt(m.conversion?.conclusionText, { value, fromName, toName })}
                        <div className="mt-1">{fmt(m.conversion?.conclusionEq, { value, fromName, result, toName })}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
}
