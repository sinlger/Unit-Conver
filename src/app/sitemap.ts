import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_SITE_URL ?? "https://unitconver.com"
    : "http://localhost:3000";
  const locales = ["zh", "en"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: `${origin}/${locale}`,
      changeFrequency: "weekly",
      priority: 1,
      lastModified: new Date(),
    });
  }

  let apiEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${origin}/api/sitemap`, { next: { revalidate: 3600 } });
    const json = await res.json();
    if (json && Array.isArray(json.urls)) {
      apiEntries = json.urls.map((u: { url: string; changeFrequency: string; priority: number; lastModified: string }) => ({
        url: u.url,
        changeFrequency: u.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: u.priority,
        lastModified: new Date(u.lastModified),
      }));
    }
  } catch {}

  return [...entries, ...apiEntries];
}