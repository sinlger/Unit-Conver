import { getVersionLabel } from "@/lib/version";

export const revalidate = 0;

export default function VersionPage() {
  const version = getVersionLabel();
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold">版本信息</h1>
      <p className="mt-2 text-sm text-muted-foreground">{version}</p>
    </div>
  );
}