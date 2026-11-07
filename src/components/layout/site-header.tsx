import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { LanguageSwitch } from "@/components/language/language-switch";
import { LogoMark } from "@/components/layout/logo-mark";
import { NetworkPill } from "@/components/layout/network-pill";
import { shellContainer } from "@/components/layout/shell-container";
import { StatisticsDialog } from "@/components/layout/statistics-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navLinkClasses =
    "inline-flex min-h-11 items-center px-2 text-base font-medium text-foreground no-underline underline-offset-[0.3em] hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline sm:px-3";

/**
 * The header every page shares, after the design's Web · Playing board: the
 * logo linking home and the network pill on the left; Archive, How to play,
 * statistics, the theme toggle and the language switch on the right. Both halves
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
                            {/* Current on every puzzle of the archive too. */}
                            <Link to="/archief" className={navLinkClasses}>
                                {m["header.archive"]()}
                            </Link>
                        </li>
                        <li>
                            <Link to="/hoe-te-spelen" className={navLinkClasses}>
                                {m["header.howToPlay"]()}
                            </Link>
                        </li>
                    </ul>
                </nav>
                <StatisticsDialog />
                <ThemeToggle />
                <LanguageSwitch />
            </div>
        </header>
    );
}
