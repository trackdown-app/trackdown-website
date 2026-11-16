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
        expect(html).toContain("Laatst bijgewerkt op 11 november 2026");
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
        expect(html).toContain("App Attest");
        expect(html).toContain("Upstash Redis");
        expect(html).toContain("five minutes");
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

    it("credits Great Britain's data under CC BY-SA 4.0 and the OGL", async () => {
        const html = await renderAt(AboutPage, "/over");

        expect(html).toContain(
            "Network Rail SCHEDULE-data, Network Rail Infrastructure Ltd",
        );
        expect(html).toContain("NaPTAN, Department for Transport");
        expect(html).toContain(
            "contains OS data © Crown copyright and database right",
        );
        expect(html).toContain(
            'href="https://creativecommons.org/licenses/by-sa/4.0/"',
        );
        expect(html).toContain(
            'href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"',
        );
    });

    it("credits the London Underground's data with TfL's attribution statements", async () => {
        const html = await renderAt(AboutPage, "/over");

        expect(html).toContain("TfL Journey Planner-dienstregelingen");
        expect(html).toContain(
            'href="https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service"',
        );
        expect(html).toContain("Local Authority District-grenzen");
        // TfL's licence asks for these word for word, whatever the language.
        expect(html).toContain("Powered by TfL Open Data.");
        expect(html).toContain(
            "Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights [2019].",
        );
        expect(html).toContain("NS, Network Rail, Transport for London, RET");
    });

    it("credits Rotterdam's metro and tram data", async () => {
        const html = await renderAt(AboutPage, "/over");

        expect(html).toContain("de metro&#x27;s en trams van RET");
        expect(html).toContain("CBS Wijken en Buurten 2025");
    });
});
