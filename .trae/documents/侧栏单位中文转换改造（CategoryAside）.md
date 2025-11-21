## 目标
- 在侧栏最近转换列表中，将 `from_unit` 与 `to_unit` 显示为中文名称（例如将 `mA` → “毫安”，`kA` → “千安”）。

## 修改点
1. 数据加载扩展：在现有分类符号 `symbols` 基础上，额外加载中文本地化映射 `unit_localizations` 并构建 `namesMap`。
2. 渲染文案替换：列表中文案由 `{input_value} {from_unit} 等于多少 {to_unit}` 改为 `{input_value} {namesMap[from_unit] ?? from_unit} 等于多少 {namesMap[to_unit] ?? to_unit}`。
3. 覆盖更多单位：为避免遗漏，加载 `namesMap` 时使用 `symbols ∪ recentUnits`（从最近转换记录里提取 `from_unit`、`to_unit`）作为查询范围。

## 实现细节
- 文件：`src/components/aside/CategoryAside.tsx`
- 新增状态：`const [namesMap, setNamesMap] = useState<Record<string, string>>({})`
- 在 `useEffect` 现有流程中，在拿到 `symbols` 与 `recent` 后，追加一次查询：
```ts
const units = Array.from(new Set([...symbols, ...recent.map(r => r.from_unit), ...recent.map(r => r.to_unit)]));
if (units.length) {
  const { data } = await supabase
    .from("unit_localizations")
    .select("unit_symbol,lang_code,name")
    .in("unit_symbol", units)
    .in("lang_code", ["zh", "zh-CN"])
    .limit(2000);
  const m: Record<string, string> = {};
  (data ?? []).forEach((r: any) => {
    const k = r.unit_symbol as string; const nm = r.name as string;
    if (k && nm && !(k in m)) m[k] = nm;
  });
  setNamesMap(m);
}
```
- JSX 渲染替换：
```tsx
<Link href={`/${encodeURIComponent(category)}/${encodeURIComponent(r.from_unit)}-to-${encodeURIComponent(r.to_unit)}/${encodeURIComponent(String(r.input_value) + r.from_unit)}-to-${encodeURIComponent(r.to_unit)}`}>
  {r.input_value} {namesMap[r.from_unit] ?? r.from_unit} 等于多少 {namesMap[r.to_unit] ?? r.to_unit}
</Link>
```

## 兼容与边界
- 若某单位缺少本地化条目，则回退显示英文缩写。
- 查询量控制：`limit(2000)` 足以覆盖常规分类；如后续扩展可改为分页或服务端合并视图。
- 性能：查询在已有加载流程之后执行一次，结果在客户端缓存于状态，不影响交互性能。

## 不更改内容
- 不修改现有跳转链接结构（已指向具体页并包含数量）。
- 不调整数据库结构与表字段，仅新增一次读取本地化名称的查询。