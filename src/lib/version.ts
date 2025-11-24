export function getVersionLabel(): string {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "";
  const ver = process.env.NEXT_PUBLIC_APP_VERSION || "";
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "";
  const base = ver || (sha ? sha.slice(0, 7) : "");
  return base ? `v${base}${env ? ` · ${env}` : ""}` : (env ? `v${env}` : "");
}
