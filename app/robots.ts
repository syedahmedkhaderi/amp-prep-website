import type { MetadataRoute } from "next";
import { SITE_URL as siteUrl } from "@/lib/site";


/**
 * Marketing pages are indexable. Everything behind sign-in is not: those pages
 * are per-user, and the runner routes serve question content that should not be
 * sitting in a search index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/dashboard",
          "/topics",
          "/mock",
          "/practice",
          "/attempt",
          // Reset links carry a single-use token; nothing here should be crawled
          // or indexed.
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
