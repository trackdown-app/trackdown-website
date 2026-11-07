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
    it("links home, the archive and how to play in Dutch", async () => {
        const linked = linkedPaths(await renderAt(SiteHeader, "/over"));

        expect(linked).toEqual(
            expect.arrayContaining(["/", "/archief", "/hoe-te-spelen"]),
        );
    });

    it("links the same pages under /en in English", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(SiteHeader, "/over");

        expect(linkedPaths(html)).toEqual(
            expect.arrayContaining(["/en/archief", "/en/hoe-te-spelen"]),
        );
        expect(html).toContain("How to play");
    });

    it("marks the current page with aria-current", async () => {
        expect(currentPaths(await renderAt(SiteHeader, "/archief"))).toEqual([
            "/archief",
        ]);
    });

    it("marks how to play as the current page on its route, in English too", async () => {
        overwriteGetLocale(() => "en");

        expect(currentPaths(await renderAt(SiteHeader, "/hoe-te-spelen"))).toEqual([
            "/en/hoe-te-spelen",
        ]);
    });

    it("shows the network pill with its name for a screen reader", async () => {
        const html = await renderAt(SiteHeader, "/");

        expect(html).toContain('<span class="sr-only">Netwerk: </span>');
        expect(html).toContain("Nederland");
    });

    it("keeps the statistics button reachable by keyboard, announced as unavailable", async () => {
        const button = /<button [^>]*>/.exec(await renderAt(SiteHeader, "/"))?.[0];

        expect(button).toContain('aria-label="Statistieken"');
        expect(button).toContain('aria-disabled="true"');
        expect(button).not.toMatch(/\sdisabled(=|\s|>)/);
        expect(button).not.toContain('tabindex="-1"');
    });

    it("carries the language switch", async () => {
        const html = await renderAt(SiteHeader, "/archief");

        expect(html).toContain('hrefLang="en"');
        expect(linkedPaths(html)).toContain("/en/archief");
    });
});
