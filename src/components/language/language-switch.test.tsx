import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { LanguageSwitch } from "@/components/language/language-switch";
import { renderAt } from "@/test/render-at";

function links(html: string): string[] {
    return [...html.matchAll(/<a [^>]*>/g)].map((match) => match[0]);
}

describe("LanguageSwitch", () => {
    it("links to the home page in Dutch at / and in English at /en", async () => {
        const [nl, en] = links(await renderAt(LanguageSwitch, "/"));

        expect(nl).toContain('href="/"');
        expect(nl).toContain('hrefLang="nl"');
        expect(en).toContain('href="/en"');
        expect(en).toContain('hrefLang="en"');
    });

    it("keeps the path and the query string", async () => {
        const [nl, en] = links(await renderAt(LanguageSwitch, "/play?day=3"));

        expect(nl).toContain('href="/play?day=3"');
        expect(en).toContain('href="/en/play?day=3"');
    });

    it("marks the current language with aria-current", async () => {
        overwriteGetLocale(() => "en");
        const [nl, en] = links(await renderAt(LanguageSwitch, "/"));

        expect(nl).not.toContain("aria-current");
        expect(en).toContain('aria-current="true"');
    });

    it("names each link by its code, then the language", async () => {
        const html = await renderAt(LanguageSwitch, "/");

        expect(html).toContain('aria-label="Taal"');
        expect(html).toContain('NL<span class="sr-only"> Nederlands</span>');
        expect(html).toContain('EN<span class="sr-only"> Engels</span>');
    });
});
