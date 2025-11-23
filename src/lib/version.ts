const BUILD_TIME = new Date().toISOString();

export function getVersionLabel(): string {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "";
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || "";
  const ver = process.env.NEXT_PUBLIC_APP_VERSION || "";
  const base = ver || (sha ? sha.slice(0, 7) : BUILD_TIME.replace(/[-:TZ]/g, "").slice(0, 12));
  return `v${base}${env ? ` · ${env}` : ""}`;
}