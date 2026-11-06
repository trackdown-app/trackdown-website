import { Link } from "@tanstack/react-router";
import { ChartNoAxesColumn } from "lucide-react";
import { m } from "@/paraglide/messages";
import { sitePaths } from "@/lib/site-paths";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/language/language-switch";
import { LogoMark } from "@/components/layout/logo-mark";
import { NetworkPill } from "@/components/layout/network-pill";
import { PageLink } from "@/components/layout/page-link";
import { shellContainer } from "@/components/layout/shell-container";

const navLinkClasses =
    "inline-flex min-h-11 items-center px-2 text-base font-medium text-foreground no-underline underline-offset-[0.3em] hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline sm:px-3";

/**
 * The header every page shares, after the design's Web · Playing board: the
 * logo linking home and the network pill on the left; Archive, How to play,
 * the statistics button and the language switch on the right. Both halves
 * wrap, so it fits a 320px screen without scrolling sideways.
 */
export function SiteHeader() {
    return (
        <header
            className={cn(
                shellContainer,
                "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5",
            )}
        >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                    to="/"
                    activeOptions={{ exact: true }}
                    aria-label={m["header.home"]()}
                    className="flex min-h-11 items-center gap-2.5 text-foreground no-underline"
                >
                    <LogoMark />
                    <span className="font-condensed text-[30px] leading-none font-extrabold">
                        {m["site.name"]()}
                    </span>
                </Link>
                <NetworkPill />
            </div>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
                <nav aria-label={m["header.nav"]()}>
                    <ul className="flex items-center gap-1">
                        <li>
                            <PageLink
                                path={sitePaths.archive}
                                className={navLinkClasses}
                            >
                                {m["header.archive"]()}
                            </PageLink>
                        </li>
                        <li>
                            <PageLink
                                path={sitePaths.howToPlay}
                                className={navLinkClasses}
                            >
                                {m["header.howToPlay"]()}
                            </PageLink>
                        </li>
                    </ul>
                </nav>
                {/* Statistics are not kept yet, so the button has nothing to
                    open. It stays reachable by keyboard and is announced as
                    unavailable (`aria-disabled`) until the statistics dialog
                    gives it an `onClick` (docs/site-shell.md#header). */}
                <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={m["header.statistics"]()}
                    disabled
                    focusableWhenDisabled
                >
                    <ChartNoAxesColumn aria-hidden="true" className="size-[22px]" />
                </Button>
                <LanguageSwitch />
            </div>
        </header>
    );
}
