import { useMatches } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { sitePaths } from "@/lib/site-paths";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { cn } from "@/lib/utils";
import { PageLink } from "@/components/layout/page-link";
import { shellContainer } from "@/components/layout/shell-container";

const footerLinkClasses =
    "inline-flex min-h-11 items-center text-muted-foreground underline-offset-[0.2em] hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground";

/**
 * The footer every page shares, after the design's Web · Playing and Web ·
 * Privacy policy boards. Above a hairline: the page's legend, when its route
 * names one in `staticData.footerLegend` (the game's line legend and
 * countdown), else the tagline; then About, Privacy, Terms and Cookie
 * settings. With a legend, the links take a row of their own, as on the
 * playing board.
 */
export function SiteFooter() {
    // The deepest matched route's legend, so a child route can name its own.
    const Legend = useMatches({
        select: (matches) =>
            matches
                .map((match) => match.staticData.footerLegend)
                .filter((legend) => legend != null)
                .at(-1),
    });

    return (
        <footer className={cn(shellContainer, "pb-44")}>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-rule pt-5 text-[15px] text-muted-foreground">
                {Legend == null ? (
                    <p>{m["footer.tagline"]()}</p>
                ) : (
                    // A component a route declares at module level, so it is
                    // the same on every render; the rule cannot see that.
                    // eslint-disable-next-line react-hooks/static-components
                    <Legend />
                )}
                <nav
                    aria-label={m["footer.nav"]()}
                    className={cn(Legend != null && "basis-full")}
                >
                    <ul className="flex flex-wrap gap-x-5 gap-y-1">
                        <li>
                            <PageLink
                                path={sitePaths.about}
                                className={footerLinkClasses}
                            >
                                {m["footer.about"]()}
                            </PageLink>
                        </li>
                        <li>
                            <PageLink
                                path={sitePaths.privacy}
                                className={footerLinkClasses}
                            >
                                {m["footer.privacy"]()}
                            </PageLink>
                        </li>
                        <li>
                            <PageLink
                                path={sitePaths.terms}
                                className={footerLinkClasses}
                            >
                                {m["footer.terms"]()}
                            </PageLink>
                        </li>
                        <li>
                            <CookieSettingsButton />
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
