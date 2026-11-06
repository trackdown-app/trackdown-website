import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { localizeHref } from "@/paraglide/runtime";

type PageLinkProps = {
    /** The page's path without a locale, from `sitePaths`. */
    path: string;
    /** A part of the page to jump to, without the `#`. */
    hash?: string;
    className?: string;
    children: ReactNode;
};

/**
 * A plain link to one of the shell's pages in the current language, marked
 * `aria-current="page"` on that page. Plain rather than a router `<Link>`,
 * because most of these pages have no route yet to type it against
 * (docs/site-shell.md#page-paths). A link to a part of a page is never the
 * current page.
 */
export function PageLink({ path, hash, className, children }: PageLinkProps) {
    const pathname = useLocation({ select: (location) => location.pathname });
    const href = localizeHref(path) + (hash == null ? "" : `#${hash}`);
    const isCurrent = hash == null && pathname === path;

    return (
        <a
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={className}
        >
            {children}
        </a>
    );
}
