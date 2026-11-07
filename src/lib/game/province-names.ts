import type { Locale } from "@/paraglide/runtime";

/**
 * A province's name per locale, keyed by its name in `stations.json`: Dutch
 * for `nl`'s provinces, English for `gb`'s ITL1 regions. Only the names that
 * differ are listed: a province without an entry keeps its data name
 * (docs/api.md#stations).
 */
const provinceNames: Record<Locale, Readonly<Record<string, string>>> = {
    nl: {
        East: "Oost-Engeland",
        London: "Londen",
        "North East": "Noordoost-Engeland",
        "North West": "Noordwest-Engeland",
        Scotland: "Schotland",
        "South East": "Zuidoost-Engeland",
        "South West": "Zuidwest-Engeland",
        "Yorkshire and The Humber": "Yorkshire en de Humber",
    },
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
