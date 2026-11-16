import type { Locale } from "@/paraglide/runtime";

/**
 * A province's name per locale, keyed by its name in `stations.json`: Dutch
 * for `nl`'s provinces, English for `gb`'s ITL1 regions, Dutch for `ret`'s
 * districts and municipalities (Den Haag is The Hague). Only the names that
 * differ are listed: a province without an entry keeps its data name
 * (docs/api.md#stations). German and French keep the English names of the
 * Midlands, as their own atlases do.
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
        "Den Haag": "The Hague",
    },
    de: {
        Fryslân: "Friesland",
        "Noord-Brabant": "Nordbrabant",
        "Noord-Holland": "Nordholland",
        Zeeland: "Seeland",
        "Zuid-Holland": "Südholland",
        East: "Ostengland",
        "North East": "Nordostengland",
        "North West": "Nordwestengland",
        Scotland: "Schottland",
        "South East": "Südostengland",
        "South West": "Südwestengland",
        "Yorkshire and The Humber": "Yorkshire und Humber",
    },
    fr: {
        Fryslân: "Frise",
        Gelderland: "Gueldre",
        Groningen: "Groningue",
        Limburg: "Limbourg",
        "Noord-Brabant": "Brabant-Septentrional",
        "Noord-Holland": "Hollande-Septentrionale",
        Zeeland: "Zélande",
        "Zuid-Holland": "Hollande-Méridionale",
        East: "Est de l’Angleterre",
        London: "Londres",
        "North East": "Nord-Est de l’Angleterre",
        "North West": "Nord-Ouest de l’Angleterre",
        Scotland: "Écosse",
        "South East": "Sud-Est de l’Angleterre",
        "South West": "Sud-Ouest de l’Angleterre",
        Wales: "Pays de Galles",
        "Yorkshire and The Humber": "Yorkshire-et-Humber",
        "Den Haag": "La Haye",
    },
};

/** `province`, the name `stations.json` gives it, as `locale` names it. */
export function provinceName(province: string, locale: Locale): string {
    return provinceNames[locale][province] ?? province;
}
