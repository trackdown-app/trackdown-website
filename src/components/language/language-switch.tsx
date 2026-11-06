import { useLocation } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { m } from "@/paraglide/messages";
import { getLocale, locales } from "@/paraglide/runtime";
import type { Locale } from "@/paraglide/runtime";
import { localeSwitchHref } from "@/lib/locale-switch";
import { cn } from "@/lib/utils";

/**
 * Each language's name. Named one by one: a message looked up by a computed
 * key (`` m[`language.${locale}`] ``) keeps every message of the site in the
 * browser's JavaScript (docs/i18n.md#messages).
 */
const languageNames: Record<Locale, () => string> = {
    nl: m["language.nl"],
    en: m["language.en"],
};

/**
 * Keeps the visitor's place on the page. The browser never sends the hash to
 * the server, so the server-rendered link cannot carry it; it is added when
 * the link is followed, by a click or by a middle click into a new tab.
 */
function keepHash(event: MouseEvent<HTMLAnchorElement>) {
    const link = event.currentTarget;
    link.hash = window.location.hash;
}

/**
 * The NL / EN switch: a link to the current page in each locale. Plain links
 * rather than router links, so the other language loads as a new document
 * and renders on the server in that language. Links rather than toggle
 * buttons, because switching navigates; the current language is marked with
 * `aria-current`. shadcn/ui has no language switch or link group to build on.
 */
export function LanguageSwitch() {
    const currentLocale = getLocale();
    const pathname = useLocation({ select: (location) => location.pathname });
    const search = useLocation({ select: (location) => location.searchStr });

    return (
        <div
            role="group"
            aria-label={m["language.label"]()}
            className="inline-flex items-center gap-1 text-sm whitespace-nowrap"
        >
            {locales.map((locale, index) => {
                const isCurrent = locale === currentLocale;
                return (
                    <span key={locale} className="inline-flex items-center gap-1">
                        {index > 0 && (
                            <span aria-hidden="true" className="text-border">
                                /
                            </span>
                        )}
                        <a
                            href={localeSwitchHref(locale, { pathname, search })}
                            hrefLang={locale}
                            lang={locale}
                            aria-current={isCurrent ? "true" : undefined}
                            onClick={keepHash}
                            onAuxClick={keepHash}
                            // 44px high, and as wide on a touch screen, as a
                            // finger needs.
                            className={cn(
                                "inline-flex min-h-11 items-center justify-center px-1 pointer-coarse:min-w-11",
                                isCurrent
                                    ? "font-semibold text-foreground underline underline-offset-[0.3em]"
                                    : "font-medium text-muted-foreground",
                            )}
                        >
                            {/* The name starts with the visible code, so a
                                voice command "click EN" finds the link
                                (WCAG 2.5.3); the language follows for a
                                screen reader. */}
                            {locale.toUpperCase()}
                            <span className="sr-only">
                                {` ${languageNames[locale]()}`}
                            </span>
                        </a>
                    </span>
                );
            })}
        </div>
    );
}
