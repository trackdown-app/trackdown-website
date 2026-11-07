import type { NetworkId } from "@/lib/data/networks";

/**
 * The paths of the pages the site shell links to, without a locale;
 * `localizeHref` adds the `/en` prefix on an English page. Paths are the same
 * in both languages (docs/i18n.md), so they are Dutch, the base locale's.
 *
 * Every one has a route, so the header and footer link to it with a typed
 * `<Link>`. These paths are for a link that has no router to type it
 * against, such as the sitemap's (docs/site-shell.md#page-paths).
 */
export const sitePaths = {
    home: "/",
    howToPlay: "/hoe-te-spelen",
    about: "/over",
    privacy: "/privacy",
    terms: "/voorwaarden",
};

/**
 * A network's archive, without a locale, for a link outside a router (the
 * game's "Play an older puzzle"). Inside one, link `/$network/archief`.
 */
export function networkArchivePath(network: NetworkId): string {
    return `/${network}/archief`;
}
