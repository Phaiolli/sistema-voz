import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { createServerClient } from "@/lib/supabase";
import { logError } from "@/lib/log";

/** Static, always-public marketing routes. */
const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/planos", priority: 0.9, changeFrequency: "monthly" },
  { path: "/entrar", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cadastro", priority: 0.5, changeFrequency: "yearly" },
  { path: "/privacidade", priority: 0.3, changeFrequency: "yearly" },
  { path: "/termos", priority: 0.3, changeFrequency: "yearly" },
];

/**
 * Programmatic sitemap: static marketing pages plus every published event page
 * (`/e/[slug]`). Draft events are excluded so unlisted events stay unindexed.
 * A DB failure degrades gracefully to the static routes rather than 500ing.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("events")
      .select("slug, updated_at")
      .neq("status", "draft");
    if (error) throw error;
    eventEntries = (data ?? []).map(
      (e: { slug: string; updated_at: string | null }) => ({
        url: `${SITE_URL}/e/${e.slug}`,
        lastModified: e.updated_at ? new Date(e.updated_at) : undefined,
        changeFrequency: "daily",
        priority: 0.7,
      }),
    );
  } catch (err) {
    logError("[sitemap] failed to load events", err);
  }

  return [...staticEntries, ...eventEntries];
}
