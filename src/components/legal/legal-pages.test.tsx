import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { AboutPage } from "@/components/legal/about-page";
import { PrivacyPage } from "@/components/legal/privacy-page";
import { TermsPage } from "@/components/legal/terms-page";
import { renderAt } from "@/test/render-at";

describe("PrivacyPage", () => {
    it("names who runs the site and how to reach him", async () => {
        const html = await renderAt(PrivacyPage, "/privacy");

        expect(html).toContain("<h1");
        expect(html).toContain("Privacybeleid");
        expect(html).toContain("Laatst bijgewerkt op 7 november 2026");
        expect(html).toContain("Bram Gussekloo");
        expect(html).toContain('href="mailto:info@trackdown.nl"');
    });

    it("describes what the site stores, PostHog, its Cloudflare proxy and the server", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(PrivacyPage, "/privacy");

        expect(html).toContain("The short version");
        expect(html).toContain("local storage");
        expect(html).toContain("Two small cookies");
        expect(html).toContain("Without a cookie, by default.");
        expect(html).toContain("With a cookie, only after Accept.");
        expect(html).toContain("t.trackdown.nl");
        expect(html).toContain("Cloudflare");
        expect(html).toContain("Vercel");
        expect(html).toContain("Autoriteit Persoonsgegevens");
    });
});

describe("TermsPage", () => {
    it("links the privacy policy in the page's language", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(TermsPage, "/voorwaarden");

        expect(html).toContain("Terms of use");
        expect(html).toContain("A game, not a journey planner");
        expect(html).toContain("Dutch law applies.");
        expect(html).toContain('href="/en/privacy"');
        expect(html).toContain('href="mailto:info@trackdown.nl"');
    });
});

describe("AboutPage", () => {
    it("credits the open data under its licences", async () => {
        const html = await renderAt(AboutPage, "/over");

        expect(html).toContain("Over Trackdown");
        expect(html).toContain("OVapi GTFS-NL");
        expect(html).toContain("PDOK Bestuurlijke Gebieden, © Kadaster");
        expect(html).toContain(
            'href="https://creativecommons.org/publicdomain/zero/1.0/"',
        );
        expect(html).toContain(
            'href="https://creativecommons.org/licenses/by/4.0/"',
        );
        expect(html).toContain("niet verbonden aan");
        expect(html).toContain('href="/hoe-te-spelen"');
        expect(html).toContain('href="mailto:info@trackdown.nl"');
    });
});
