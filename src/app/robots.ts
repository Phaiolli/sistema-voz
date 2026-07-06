import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Robots policy for the public SaaS. Marketing and public event pages are
 * crawlable; authenticated areas, APIs and transactional flows are not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/mediador/",
        "/plataforma/",
        "/dashboard/",
        "/conta",
        "/pos-login",
        "/apresentar/",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
