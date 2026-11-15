/**
 * The pages the browser checks open, each in every language
 * (docs/accessibility.md#the-pages). The game is the Dutch network's: `/nl`,
 * or `/en/nl`, `/de/nl`, `/fr/nl`. An archive puzzle is the fixture's first, which is always
 * before today's (e2e/clock.ts).
 */
export const checkedPages: readonly { name: string; path: string }[] = [
    { name: "the game", path: "/nl" },
    { name: "how to play", path: "/hoe-te-spelen" },
    { name: "the archive", path: "/nl/archief" },
    { name: "an archive puzzle", path: "/nl/archief/1" },
    { name: "about", path: "/over" },
    { name: "the privacy policy", path: "/privacy" },
    { name: "the terms", path: "/voorwaarden" },
];

/** A URL no route matches, for the not-found page. */
export const notFoundPath = "/deze-pagina-bestaat-niet";

/** The site's languages, the base locale, Dutch, first. */
export const pageLocales = ["nl", "en", "de", "fr"] as const;

export type PageLocale = (typeof pageLocales)[number];

/**
 * The path in a locale: Dutch at the root, English, German and French under
 * `/en`, `/de` and `/fr`.
 */
export function localizedPath(path: string, locale: PageLocale): string {
    return locale === "nl" ? path : `/${locale}${path}`;
}
