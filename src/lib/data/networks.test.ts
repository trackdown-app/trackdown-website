import { describe, expect, it } from "vitest";
import { baseLocale, locales } from "@/paraglide/runtime";
import { networkIds } from "@/lib/data/networks";

describe("network ids", () => {
    // `/en`, `/de` and `/fr` are locale prefixes, stripped before the router
    // matches (docs/i18n.md#locale-routing). A network with one of them as
    // its id would lose its pages at `/{network}` to that language's home.
    // The base locale has no prefix, so `nl` is free for the Dutch network.
    it.each(networkIds)("never take a locale prefix: %s", (network) => {
        const prefixes = locales.filter((locale) => locale !== baseLocale);
        expect(prefixes).not.toContain(network);
    });
});
