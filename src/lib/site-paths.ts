import type { NetworkId } from "@/lib/data/networks";

/**
 * The paths of the pages the site shell links to, without a locale;
 * `localizeHref` adds the `/en` prefix on an English page. Paths are the same
 * in both languages (docs/i18n.md), so they are Dutch, the base locale's.
 *
 * The home page and How to play have a route, as do a network's game and
 * archive (`/{network}`, `/{network}/archief`, `networkArchivePath`). The
 * header and footer link to the others with a plain
 * `<a href={localizeHref(...)}>`, which shows the not-found page until the
 * page lands; switch a link to a typed `<Link>` once its route exists
 * (docs/site-shell.md#page-paths).
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

/**
 * Where "Cookie settings" in the footer points until the cookie banner
 * exists: the privacy policy's part on cookies. The banner's own button,
 * which opens it again, replaces the link.
 */
export const cookieSettingsLink = { path: sitePaths.privacy, hash: "cookies" };
