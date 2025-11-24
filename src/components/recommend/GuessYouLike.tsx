"use client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ItemGroup, Item, ItemContent, ItemTitle, ItemSeparator } from "@/components/ui/item";
import { usePathname } from "next/navigation";

function makePairs(list: string[], max = 24): Array<{ from: string; to: string }> {
  const pairs: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      pairs.push({ from: list[i], to: list[j] });
      if (pairs.length >= max) return pairs;
    }
  }
  return pairs;
}

export default function GuessYouLike({ category, symbols, names }: { category: string; symbols: string[]; names?: Record<string, string> }) {
  const pathname = usePathname() ?? "/";
  const currentLocale = pathname.split("/").filter(Boolean)[0] || "zh";
  const pairs = makePairs(symbols);
  return (
    <Card>
      <CardHeader>
        <CardTitle>你可能想要</CardTitle>
      </CardHeader>
      <CardContent>
        {pairs.length === 0 ? (
          <div className="text-sm text-muted-foreground">该分类下单位不足以生成组合</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pairs.map((p) => (
              <Item key={`${p.from}-${p.to}`} variant="muted">
                <ItemContent>
                  <ItemTitle>
                    <Link href={`/${currentLocale}/${encodeURIComponent(category)}/${encodeURIComponent(p.from)}-to-${encodeURIComponent(p.to)}`}>
                      {(names?.[p.from] ?? p.from)}换算{(names?.[p.to] ?? p.to)}
                    </Link>
                  </ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
