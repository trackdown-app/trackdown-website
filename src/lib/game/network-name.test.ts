import { afterEach, describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { networkIds, networks } from "@/lib/data/networks";
import { networkName } from "@/lib/game/network-name";

afterEach(() => {
    overwriteGetLocale(() => "nl");
});

describe("networkName", () => {
    it("names a country's network after the country", () => {
        overwriteGetLocale(() => "nl");
        expect(networkName("nl")).toBe("Nederland");
        overwriteGetLocale(() => "en");
        expect(networkName("gb")).toBe("United Kingdom");
    });

    it("gives the London Underground a name of its own in every language", () => {
        const names = (["nl", "en", "de", "fr"] as const).map((locale) => {
            overwriteGetLocale(() => locale);
            return networkName("lu");
        });
        expect(names).toEqual([
            "Londense metro",
            "London Underground",
            "Londoner U-Bahn",
            "Métro de Londres",
        ]);
    });

    // Without a region and a name of its own, a network would fall back to
    // its id.
    it.each(networkIds)("names %s by more than its id", (network) => {
        overwriteGetLocale(() => "en");
        expect(networkName(network)).not.toBe(networks[network].code);
    });
});
