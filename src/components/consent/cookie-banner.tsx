import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { consentSettingsParameter } from "@/lib/analytics/consent";
import type { ConsentChoice } from "@/lib/analytics/consent";
import { sitePaths } from "@/lib/site-paths";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";

/** shadcn/ui has no cookie consent banner; its buttons provide the controls. */
export function CookieBanner({ consent }: { consent: ConsentChoice | null }) {
    const location = useLocation();
    const search = new URLSearchParams(location.searchStr);
    const open = consent == null || search.has(consentSettingsParameter);
    const [statusDismissed, setStatusDismissed] = useState(false);

    useEffect(() => {
        if (open) return;
        const timeout = window.setTimeout(() => setStatusDismissed(true), 5_000);
        return () => window.clearTimeout(timeout);
    }, [open]);

    search.delete(consentSettingsParameter);
    const query = search.toString();
    const returnTo = `${localizeHref(location.pathname)}${query.length > 0 ? `?${query}` : ""}`;

    if (!open && statusDismissed) return null;

    return (
        <aside
            className={cn(
                "fixed inset-x-4 bottom-4 z-40 mx-auto max-h-[calc(100svh-2rem)] max-w-[760px] overflow-y-auto rounded-[14px] border-2 border-foreground bg-card text-card-foreground sm:inset-x-6 sm:bottom-6",
                open && "shadow-[0_16px_40px_var(--td-shadow)]",
            )}
        >
            {open ? (
                <section
                    aria-labelledby="cookie-title"
                    className="flex flex-col gap-4 p-6"
                >
                    <h2
                        id="cookie-title"
                        tabIndex={-1}
                        className="font-condensed text-[30px] leading-none font-bold"
                    >
                        {m["consent.title"]()}
                    </h2>
                    <p className="text-[17px] leading-normal text-muted-foreground">
                        {m["consent.copy"]()}{" "}
                        <a
                            href={localizeHref(sitePaths.privacy)}
                            className="font-semibold text-foreground underline"
                        >
                            {m["consent.privacy"]()}
                        </a>
                    </p>
                    <form
                        method="post"
                        action="/consent"
                        className="grid grid-cols-2 gap-3"
                    >
                        <input type="hidden" name="return" value={returnTo} />
                        <Button
                            type="submit"
                            name="answer"
                            value="decline"
                            variant="outline"
                            size="lg"
                            className="min-w-0 border-2 px-3"
                        >
                            {m["consent.decline"]()}
                        </Button>
                        <Button
                            type="submit"
                            name="answer"
                            value="accept"
                            variant="outline"
                            size="lg"
                            className="min-w-0 border-2 px-3"
                        >
                            {m["consent.accept"]()}
                        </Button>
                    </form>
                </section>
            ) : (
                <div
                    id="cookie-status"
                    tabIndex={-1}
                    className="flex flex-wrap items-center justify-between gap-x-3 px-[18px] py-3.5"
                >
                    <p role="status">
                        {consent.analytics
                            ? m["consent.accepted"]()
                            : m["consent.declined"]()}
                    </p>
                    <CookieSettingsButton />
                </div>
            )}
        </aside>
    );
}
