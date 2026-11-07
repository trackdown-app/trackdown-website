import type { Locale } from "@/paraglide/runtime";

const dateFormats: Record<Locale, Intl.DateTimeFormat> = {
    nl: new Intl.DateTimeFormat("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }),
    en: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    }),
};

/**
 * A puzzle's day, `YYYY-MM-DD`, as the game page names it: "Friday 6
 * November", "Vrijdag 6 november". The date is a calendar day, so it is read
 * and written in UTC and never shifts with the reader's time zone.
 */
export function puzzleDateLabel(date: string, locale: Locale): string {
    const label = dateFormats[locale].format(new Date(`${date}T00:00:00Z`));
    return label.charAt(0).toUpperCase() + label.slice(1);
}
