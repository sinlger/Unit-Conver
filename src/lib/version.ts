export function getVersionLabel(): string {
  const env = process.env.NODE_ENV || "";
  return env ? `v${env}` : "";
}
