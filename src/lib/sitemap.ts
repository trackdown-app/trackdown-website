import { locales } from "@/paraglide/runtime";
import { networkIds } from "@/lib/data/networks";
import { languageAlternates, pageUrl } from "@/lib/seo";
import { siteOrigin } from "@/lib/site-origin";
import { networkArchivePath, sitePaths } from "@/lib/site-paths";

/**
 * The pages the sitemap lists, without a locale: every network's game and
 * archive, How to play, About, Privacy and Terms. Not `/`, which redirects
 * to a network's game, nor an archive's puzzles, which the archive links to
 * (docs/seo.md#sitemap).
 */
export function sitemapPaths(): string[] {
    return [
        ...networkIds.flatMap((network) => [
            `/${network}`,
            networkArchivePath(network),
        ]),
        sitePaths.howToPlay,
        sitePaths.about,
        sitePaths.privacy,
        sitePaths.terms,
    ];
}

/** `text` with the five characters XML reserves escaped. */
function escapeXml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

/**
 * `/sitemap.xml`: one `<url>` per page and language, each listing the
 * page's language versions as `xhtml:link` alternates, the same its head
 * lists.
 */
export function sitemapXml(): string {
    const urls = sitemapPaths().flatMap((path) => {
        const alternates = languageAlternates(path)
            .map(
                ({ hrefLang, href }) =>
                    `    <xhtml:link rel="alternate" hreflang="${hrefLang}" href="${escapeXml(href)}"/>`,
            )
            .join("\n");
        return locales.map(
            (locale) =>
                `  <url>\n    <loc>${escapeXml(pageUrl(path, locale))}</loc>\n${alternates}\n  </url>`,
        );
    });
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...urls,
        "</urlset>",
        "",
    ].join("\n");
}

/**
 * `/robots.txt`: every crawler may read the pages, but not the REST API,
 * the server functions the pages call or the cookie banner's form, and it
 * points to the sitemap.
 */
export function robotsTxt(): string {
    return [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /_serverFn/",
        "Disallow: /consent",
        "",
        `Sitemap: ${siteOrigin}/sitemap.xml`,
        "",
    ].join("\n");
}
