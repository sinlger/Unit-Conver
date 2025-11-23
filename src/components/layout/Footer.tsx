import { getVersionLabel } from "@/lib/version";

export function Footer() {
  const version = getVersionLabel();
  return (
    <footer className="border-t mt-10 bg-background/40">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center">
        <div className="flex items-center gap-3">
          <div className="font-semibold text-sm">Unit Conver</div>
          <div className="text-xs text-muted-foreground">单位字典与转换示例，基于 Supabase 与 Next.js SSG/ISR。</div>
          <div className="text-xs text-muted-foreground">{version}</div>
        </div>
      </div>
    </footer>
  );
}
