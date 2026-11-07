import type { ComponentProps } from "react";
import { m } from "@/paraglide/messages";
import { baseLocale, getLocale, localizeHref, locales } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";
import { absoluteUrl } from "@/lib/site-origin";

/**
 * The tags that describe a page to search engines and to the apps that
 * preview a shared link: its title, description, canonical URL, language
 * alternates, Open Graph and Twitter tags (docs/seo.md).
 */

export type HeadMeta = ComponentProps<"meta">;
export type HeadLink = ComponentProps<"link">;

/** The tags a route's `head()` returns. */
export type HeadTags = {
    meta: HeadMeta[];
    links: HeadLink[];
};

export type SeoOptions = {
    /** The document's whole title, such as "Archief · Trackdown". */
    title: string;
    description: string;
    /**
     * The page's path without the locale prefix: the route match's
     * `pathname`. An index route's trailing slash is dropped.
     */
    path: string;
    /** The page's language. Defaults to the current locale. */
    locale?: Locale;
};

/** The share image every page uses: the logo and the name, never an answer. */
export const shareImage = {
    src: "/og-image.png",
    width: 1200,
    height: 630,
};

/** The `og:locale` of each language. */
const openGraphLocales: Record<Locale, string> = {
    nl: "nl_NL",
    en: "en_GB",
};

/** `path` without a trailing slash, but for the root itself. */
function withoutTrailingSlash(path: string): string {
    return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/** The absolute URL of `path` in `locale`: `/nl` is `https://trackdown.nl/en/nl` in English. */
export function pageUrl(path: string, locale: Locale): string {
    return absoluteUrl(localizeHref(withoutTrailingSlash(path), { locale }));
}

/** A language version of a page: a `hreflang` and its absolute URL. */
export type LanguageAlternate = { hrefLang: Locale | "x-default"; href: string };

/**
 * The language versions of the page at `path`: one per locale and
 * `x-default` on the Dutch page, the base locale's. The page head and the
 * sitemap both list these.
 */
export function languageAlternates(path: string): LanguageAlternate[] {
    return [
        ...locales.map((locale) => ({
            hrefLang: locale,
            href: pageUrl(path, locale),
        })),
        { hrefLang: "x-default", href: pageUrl(path, baseLocale) },
    ];
}

/**
 * A page's title, description, canonical URL, language alternates, Open
 * Graph and Twitter tags. Use it as a route's `head()`:
 *
 * ```ts
 * head: ({ match }) => seo({ title: m["archive.pageTitle"](), description: …, path: match.pathname }),
 * ```
 */
export function seo({
    title,
    description,
    path,
    locale = getLocale(),
}: SeoOptions): HeadTags {
    const url = pageUrl(path, locale);
    const imageUrl = absoluteUrl(shareImage.src);
    const imageAlt = m["seo.imageAlt"]({}, { locale });

    const meta: HeadMeta[] = [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: m["site.name"]() },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:locale", content: openGraphLocales[locale] },
        ...locales
            .filter((other) => other !== locale)
            .map((other) => ({
                property: "og:locale:alternate",
                content: openGraphLocales[other],
            })),
        { property: "og:image", content: imageUrl },
        { property: "og:image:alt", content: imageAlt },
        { property: "og:image:width", content: String(shareImage.width) },
        { property: "og:image:height", content: String(shareImage.height) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
        { name: "twitter:image:alt", content: imageAlt },
    ];

    const links: HeadLink[] = [
        { rel: "canonical", href: url },
        ...languageAlternates(path).map(({ hrefLang, href }) => ({
            rel: "alternate",
            hrefLang,
            href,
        })),
    ];

    return { meta, links };
}
