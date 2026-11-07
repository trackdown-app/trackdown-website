import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { SiteHeader } from "@/components/layout/site-header";
import { renderAt } from "@/test/render-at";

function linkedPaths(html: string): string[] {
    return [...html.matchAll(/href="([^"]+)"/g)].flatMap((match) =>
        match[1] == null ? [] : [match[1]],
    );
}

function currentPaths(html: string): string[] {
    return [...html.matchAll(/<a [^>]*>/g)].flatMap((match) => {
        const tag = match[0];
        const href = /href="([^"]+)"/.exec(tag)?.[1];
        return href != null && tag.includes('aria-current="page"') ? [href] : [];
    });
}

describe("SiteHeader", () => {
    it("links the network's game and archive and how to play in Dutch", async () => {
        const linked = linkedPaths(await renderAt(SiteHeader, "/over"));

        expect(linked).toEqual(
            expect.arrayContaining(["/nl", "/nl/archief", "/hoe-te-spelen"]),
        );
    });

    it("links the same pages under /en in English", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(SiteHeader, "/over");

        expect(linkedPaths(html)).toEqual(
            expect.arrayContaining([
                "/en/nl",
                "/en/nl/archief",
                "/en/hoe-te-spelen",
            ]),
        );
        expect(html).toContain("How to play");
    });

    it("marks the current page with aria-current", async () => {
        expect(currentPaths(await renderAt(SiteHeader, "/nl/archief"))).toEqual([
            "/nl/archief",
        ]);
    });

    it("marks the archive as the current page on one of its puzzles", async () => {
        expect(currentPaths(await renderAt(SiteHeader, "/nl/archief/3"))).toEqual([
            "/nl/archief",
        ]);
    });

    it("marks how to play as the current page on its route, in English too", async () => {
        overwriteGetLocale(() => "en");

        expect(currentPaths(await renderAt(SiteHeader, "/hoe-te-spelen"))).toEqual([
            "/en/hoe-te-spelen",
        ]);
    });

    it("shows the network pill as the button that opens the picker", async () => {
        const html = await renderAt(SiteHeader, "/nl");
        const pill = /<button [^>]*aria-haspopup[^>]*>/.exec(html)?.[0];

        expect(pill).toContain('aria-label="Netwerk: Nederland. Kies een netwerk"');
        expect(pill).toContain('aria-expanded="false"');
        expect(html).toContain("Nederland");
    });

    it("names the network in English on an English page", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(SiteHeader, "/nl");

        expect(html).toContain('aria-label="Network: Netherlands. Change network"');
    });

    it("renders the statistics button as an enabled dialog trigger", async () => {
        const html = await renderAt(SiteHeader, "/nl");
        const button = /<button [^>]*aria-label="Statistieken"[^>]*>/.exec(
            html,
        )?.[0];

        expect(button).toContain('aria-haspopup="dialog"');
        expect(button).not.toContain("aria-disabled");
        expect(button).not.toMatch(/\sdisabled(=|\s|>)/);
    });

    it("carries the language switch", async () => {
        const html = await renderAt(SiteHeader, "/nl/archief");

        expect(html).toContain('hrefLang="en"');
        expect(linkedPaths(html)).toContain("/en/nl/archief");
    });
});
