/**
 * The paths of the pages the site shell links to, without a locale;
 * `localizeHref` adds the `/en` prefix on an English page. Paths are the same
 * in both languages (docs/i18n.md), so they are Dutch, the base locale's.
 *
 * The home page, the archive and How to play have a route. The header and footer link to
 * the others with a plain `<a href={localizeHref(...)}>`, which shows the
 * not-found page until the page lands; switch a link to a typed `<Link>` once
 * its route exists (docs/site-shell.md#page-paths).
 */
export const sitePaths = {
    home: "/",
    archive: "/archief",
    howToPlay: "/hoe-te-spelen",
    about: "/over",
    privacy: "/privacy",
    terms: "/voorwaarden",
};
