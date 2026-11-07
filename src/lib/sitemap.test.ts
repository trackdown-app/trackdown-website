import { describe, expect, it } from "vitest";
import { robotsTxt, sitemapPaths, sitemapXml } from "@/lib/sitemap";

describe("sitemapPaths", () => {
    it("lists every network's game and archive, How to play, About, Privacy and Terms", () => {
        expect(sitemapPaths()).toEqual([
            "/nl",
            "/nl/archief",
            "/gb",
            "/gb/archief",
            "/hoe-te-spelen",
            "/over",
            "/privacy",
            "/voorwaarden",
        ]);
    });
});

describe("sitemapXml", () => {
    const xml = sitemapXml();

    it("lists every page in both languages", () => {
        for (const url of [
            "https://trackdown.nl/nl",
            "https://trackdown.nl/en/nl",
            "https://trackdown.nl/nl/archief",
            "https://trackdown.nl/en/nl/archief",
            "https://trackdown.nl/gb",
            "https://trackdown.nl/en/gb/archief",
            "https://trackdown.nl/hoe-te-spelen",
            "https://trackdown.nl/en/hoe-te-spelen",
        ]) {
            expect(xml).toContain(`<loc>${url}</loc>`);
        }
        expect(xml.match(/<url>/g)).toHaveLength(16);
    });

    it("names each page's language versions, as its head does", () => {
        expect(xml).toContain(
            '<xhtml:link rel="alternate" hreflang="en" href="https://trackdown.nl/en/hoe-te-spelen"/>',
        );
        expect(xml).toContain(
            '<xhtml:link rel="alternate" hreflang="x-default" href="https://trackdown.nl/hoe-te-spelen"/>',
        );
    });

    it("lists no API route", () => {
        expect(xml).not.toContain("/api/");
    });
});

describe("robotsTxt", () => {
    it("keeps crawlers out of the API and points to the sitemap", () => {
        const robots = robotsTxt();

        expect(robots).toContain("Disallow: /api/\n");
        expect(robots).toContain("Disallow: /_serverFn/\n");
        expect(robots).toContain("Sitemap: https://trackdown.nl/sitemap.xml\n");
    });
});
