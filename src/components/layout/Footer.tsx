"use client";
import { usePathname } from "next/navigation";
import { getVersionLabel } from "@/lib/version";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

export function Footer() {
  const pathname = usePathname() ?? "/";
  const locale = pathname.split("/").filter(Boolean)[0] || "zh";
  const m = locale === "en" ? (en as any) : (zh as any);
  const version = getVersionLabel();
  return (
    <footer className="border-t mt-10 bg-background/40">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center">
        <div className="flex items-center gap-3">
          <div className="font-semibold text-sm">Unit Conver</div>
          <div className="text-xs text-muted-foreground">{m.footer?.description}</div>
          <div className="text-xs text-muted-foreground">{version}</div>
        </div>
      </div>
    </footer>
  );
}
