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

type Row = { symbol: string; category: string };

export default function ConversionCard({ title, defaultFrom, defaultTo, selectDisabled, defaultValue }: { title?: string; defaultFrom?: string; defaultTo?: string; selectDisabled?: boolean; defaultValue?: string }) {
  const pathname = usePathname() ?? "/";
  const category = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[0] ?? "");
  }, [pathname]);

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
            .in("lang_code", ["zh", "zh-CN"])
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
        if (!cancelled) setError(e?.message ?? "查询失败");
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
        setConvertError("无法转换，单位不兼容或未被支持");
      }
    }
  }, [symbols, defaultValue, defaultFrom, defaultTo]);

  const onConvert = async () => {
    setConvertError(null);
    setResult("");
    const { value, from, to } = form.getValues();
    const v = Number(value);
    if (!from || !to || Number.isNaN(v)) {
      setConvertError("请输入有效数值并选择单位");
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
          lang_code: "zh",
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
      toast.success("复制成功");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? `${categoryZh || category} 单位换算器`}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <CardFooter className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-end p-0">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>从：</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 px-4 text-base" disabled={loading || symbols.length === 0 || !!selectDisabled}>
                          <SelectValue placeholder="选择来源单位" />
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
                  aria-label="交换"
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
                    <FormLabel>到：</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 px-4 text-base" disabled={loading || symbols.length === 0 || !!selectDisabled}>
                          <SelectValue placeholder="选择目标单位" />
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
                    <FormLabel>数量：</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="请输入数值" className="h-12 text-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem className="flex items-end">
                <Button size="lg" className="h-12 w-full md:w-44 text-base" disabled={loading || symbols.length < 1} type="button" onClick={onConvert}>转换</Button>
              </FormItem>
            </CardFooter>

            {error && <CardFooter className="p-0 text-sm text-destructive">查询失败：{error}</CardFooter>}
            {convertError && <CardFooter className="p-0 text-sm text-destructive">{convertError}</CardFooter>}

            <CardFooter className="grid gap-2 p-0">
              <Label>结果：</Label>
              <InputGroup className="h-12 text-base">
                <InputGroupInput readOnly value={(() => {
                  const { value, from, to } = form.getValues();
                  return result !== "" ? `${value} ${from} = ${result} ${to}` : "";
                })()} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant="ghost"  size="icon-sm" aria-label="复制结果" onClick={copyResult}>
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
                      即：{value}{fromName}等于{result}{toName}
                      <span className="mx-2">|</span>
                      <a href={`/${encodeURIComponent(category)}/${encodeURIComponent(to)}-to-${encodeURIComponent(from)}`}>{toName}与{fromName}换算</a>
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
                const measureZhMap: Record<string, string> = {
                  speed: "速度",
                  current: "电流",
                  angle: "角度",
                  pressure: "压力",
                  frequency: "频率",
                  volumeFlowRate: "体积流量",
                  digital: "数据存储",
                  temperature: "温度",
                  volume: "体积",
                  energy: "能量",
                  illuminance: "照度",
                  length: "长度",
                  time: "时间",
                  voltage: "电压",
                  power: "功率",
                  mass: "质量",
                  area: "面积",
                };
                const measureZh = (measureZhMap[measure] ?? measure) || "单位";
                return (
                  <div className="grid gap-4">
                    <div>
                      问题：
                      <div className="mt-2">
                        {value} {fromName}（单位符号是：{from}）等于多少{toName}（单位符号是：{to}）？
                      </div>
                    </div>
                    <div>
                      背景说明：
                      <div className="mt-2">
                        {fromName}（单位符号是：{from}）和{toName}（单位符号是：{to}）是{measureZh}单位，它们之间的换算关系是：
                        <div className="mt-1">1 {from} = {ratio} {to}。</div>
                      </div>
                    </div>
                    <div>
                      计算过程：
                      <div className="mt-2">
                        要将 {value} {from} 转换为 {to}，我们可以通过以下公式计算：
                        <div className="mt-1">{value}{from} = {value} × {ratio}{to} = {result}{to}</div>
                      </div>
                    </div>
                    <div>
                      结论：
                      <div className="mt-2">
                        因此，{value} {fromName} 换算成 {toName} 的答案是：
                        <div className="mt-1">{value} {fromName} 等于 {result} {toName}。</div>
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