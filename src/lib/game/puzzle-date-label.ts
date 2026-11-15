import type { Locale } from "@/paraglide/runtime";

/** The region each language's dates are written as. */
const dateLocales: Record<Locale, string> = {
    nl: "nl-NL",
    en: "en-GB",
    de: "de-DE",
    fr: "fr-FR",
};

function dateFormat(locale: Locale): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(dateLocales[locale], {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    });
}

const dateFormats: Record<Locale, Intl.DateTimeFormat> = {
    nl: dateFormat("nl"),
    en: dateFormat("en"),
    de: dateFormat("de"),
    fr: dateFormat("fr"),
};

/**
 * A puzzle's day, `YYYY-MM-DD`, as the game page names it: "Friday 6
 * November", "Vrijdag 6 november", "Freitag, 6. November", "Vendredi 6
 * novembre". The date is a calendar day, so it is read and written in UTC
 * and never shifts with the reader's time zone.
 */
export function puzzleDateLabel(date: string, locale: Locale): string {
    const label = dateFormats[locale].format(new Date(`${date}T00:00:00Z`));
    return label.charAt(0).toUpperCase() + label.slice(1);
}
