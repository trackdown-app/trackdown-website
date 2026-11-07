/**
 * The site's public address. Every absolute URL a page names, such as its
 * canonical URL, its language alternates, its share image and the sitemap's
 * entries, starts with it, whichever host serves the page (docs/seo.md).
 */
export const siteOrigin = "https://trackdown.nl";

/** `path`, a path on the site, as an absolute URL on `siteOrigin`. */
export function absoluteUrl(path: string): string {
    return new URL(path, siteOrigin).href;
}
