import type { Locale } from "@/paraglide/runtime";

/**
 * A province's name per locale, keyed by its name in `stations.json`, which
 * is Dutch. Only the names that differ are listed: a province without an
 * entry keeps its data name (docs/api.md#stations).
 */
const provinceNames: Record<Locale, Readonly<Record<string, string>>> = {
    nl: {},
    en: {
        Fryslân: "Friesland",
        "Noord-Brabant": "North Brabant",
        "Noord-Holland": "North Holland",
        "Zuid-Holland": "South Holland",
    },
};

/** `province`, the name `stations.json` gives it, as `locale` names it. */
export function provinceName(province: string, locale: Locale): string {
    return provinceNames[locale][province] ?? province;
}
