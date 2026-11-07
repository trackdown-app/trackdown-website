import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { HowToPlayPage } from "@/components/how-to-play/how-to-play-page";
import { renderAt } from "@/test/render-at";

describe("HowToPlayPage", () => {
    it("lists the three rules in Dutch", async () => {
        const html = await renderAt(HowToPlayPage, "/hoe-te-spelen");

        expect(html).toContain("<h1");
        expect(html).toContain("Hoe speel je");
        expect(html.match(/<li class="flex items-baseline/g)).toHaveLength(3);
        expect(html).toContain("Raad een station in Nederland.");
        expect(html).toContain("Vind het in zes gokken.");
    });

    it("draws the example trip and reads it out for a screen reader", async () => {
        const html = await renderAt(HowToPlayPage, "/hoe-te-spelen");

        expect(html).toContain("<figure");
        expect(html).toContain("Maastricht");
        expect(html).toContain("<figcaption");
        expect(html).toMatch(
            /<span class="sr-only">Gok 1, Maastricht: 2 uur 25 minuten naar het mysteriestation\./,
        );
    });

    it("carries the line legend", async () => {
        const html = await renderAt(HowToPlayPage, "/hoe-te-spelen");

        expect(html).toContain('aria-label="Legenda"');
        expect(html).toContain("Overstap, raad hem om te onthullen");
    });

    it("speaks English and links to today's puzzle under /en", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(HowToPlayPage, "/hoe-te-spelen");

        expect(html).toContain("How to play");
        expect(html).toContain("Guess any station in the Netherlands.");
        expect(html).toContain('href="/en"');
        expect(html).toContain("Play today&#x27;s station");
    });
});
