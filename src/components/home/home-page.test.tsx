import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { HomePage } from "@/components/home/home-page";
import { renderAt } from "@/test/render-at";

describe("HomePage", () => {
    it("renders the site name as the page's heading", async () => {
        const html = await renderAt(HomePage, "/");

        expect(html).toContain("<h1");
        expect(html).toContain("Trackdown");
    });

    it("renders Dutch by default", async () => {
        expect(await renderAt(HomePage, "/")).toContain("Binnenkort beschikbaar.");
    });

    it("renders English when the locale is English", async () => {
        overwriteGetLocale(() => "en");

        expect(await renderAt(HomePage, "/")).toContain("Coming soon.");
    });
});
