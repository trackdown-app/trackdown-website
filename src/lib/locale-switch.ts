import { localizeHref } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";

type CurrentPage = {
    /** The router's `location.pathname`, which the rewrite has stripped of the locale prefix. */
    pathname: string;
    /** The query string with its leading `?`, or empty. */
    search: string;
};

/**
 * The address of the current page in `locale`, query string kept. Route paths
 * are the same in every language (docs/i18n.md), so only the prefix changes.
 */
export function localeSwitchHref(
    locale: Locale,
    { pathname, search }: CurrentPage,
): string {
    return localizeHref(pathname + search, { locale });
}
