/**
 * The site's public origin.
 *
 * Load bearing for more than it looks: metadataBase, og:url, the canonical
 * link, sitemap.xml entries and the sitemap reference inside robots.txt all
 * derive from it. If this is wrong in production, share previews break and the
 * sitemap advertises URLs that do not exist — which is the exact failure
 * metadataBase exists to prevent.
 *
 * Defined once here because three separate files previously re-derived the same
 * fallback, so fixing it in one meant missing the others. APP_URL must be set
 * to the live origin on the deployed host; see DEPLOYMENT.md.
 */
export const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";
