"use client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ItemGroup, Item, ItemContent, ItemTitle, ItemSeparator } from "@/components/ui/item";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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

export default function GuessYouLike({ category, symbols, names, locale: propLocale }: { category: string; symbols: string[]; names?: Record<string, string>; locale?: string }) {
  const t = useTranslations();
  const pathname = usePathname() ?? "/";
  const allowed = ["zh", "en"] as const;
  const seg = pathname.split("/").filter(Boolean)[0] || "zh";
  const currentLocale = (propLocale && allowed.includes(propLocale as any)) ? propLocale as any : (allowed.includes(seg as any) ? (seg as any) : "zh");
  const pairs = makePairs(symbols);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recommend.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {pairs.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("recommend.empty")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pairs.map((p) => (
              <Item key={`${p.from}-${p.to}`} variant="muted">
                <ItemContent>
                  <ItemTitle>
                    <Link href={`/${currentLocale}/${encodeURIComponent(category)}/${encodeURIComponent(p.from)}-to-${encodeURIComponent(p.to)}`}>
                      {t("recommend.link", { from: (names?.[p.from] ?? p.from), to: (names?.[p.to] ?? p.to) })}
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
