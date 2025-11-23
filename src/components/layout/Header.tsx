"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuContent, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Header() {
  const pathname = usePathname();
  const [cats, setCats] = useState<Array<{ slug: string; label: string }>>([]);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("unit_dictionary")
          .select("category,category_zh")
          .order("category", { ascending: true })
          .limit(500);
        if (error || !data) return;
        const map = new Map<string, string>();
        (data as Array<{ category: string; category_zh: string | null }>).forEach((r) => {
          const prev = map.get(r.category);
          const curr = r.category_zh ?? r.category;
          if (!prev || (r.category_zh && prev === r.category)) map.set(r.category, curr);
        });
        const list = Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
        if (!cancelled) setCats(list);
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const toggleDark = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold text-lg hover:opacity-90">Unit Conver</Link>

          <div className="flex items-center gap-2">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).click(); }}>单位转换</NavigationMenuTrigger>
                  <NavigationMenuContent className="p-3" >
                    <div className="grid sm:grid-cols-3 md:grid-cols-3 gap-2 w-[400px]">
                      {cats.map((c) => (
                        <NavigationMenuLink key={c.slug} className={navigationMenuTriggerStyle()} asChild>
                          <Link href={`/${encodeURIComponent(c.slug)}`}>{c.label}转换</Link>
                        </NavigationMenuLink>
                      ))}
                      {cats.length === 0 && (
                        <div className="text-sm text-muted-foreground px-2 py-1">暂无分类</div>
                      )}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
             <Button
              variant="outline"
              size="icon"
              onClick={toggleDark}
              aria-label="切换主题"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="h-4 w-4 hidden dark:block" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
