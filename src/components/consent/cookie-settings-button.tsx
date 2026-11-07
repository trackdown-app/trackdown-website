import { useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { consentSettingsParameter } from "@/lib/analytics/consent";
import { localizeHref } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

/** A native GET also reopens settings without JavaScript. */
export function CookieSettingsButton() {
    const location = useLocation();
    const search = new URLSearchParams(location.searchStr);
    search.delete(consentSettingsParameter);
    return (
        <form
            method="get"
            action={`${localizeHref(location.pathname)}#cookie-title`}
        >
            {[...search].map(([name, value], index) => (
                <input key={index} type="hidden" name={name} value={value} />
            ))}
            <Button
                type="submit"
                name={consentSettingsParameter}
                value="open"
                variant="ghost"
                className="h-auto min-h-11 rounded-none px-0 text-[15px] text-muted-foreground underline underline-offset-[0.2em] hover:bg-transparent hover:text-foreground"
            >
                {m["footer.cookieSettings"]()}
            </Button>
        </form>
    );
}
