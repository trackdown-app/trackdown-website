import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { LanguageSwitch } from "@/components/language/language-switch";
import { renderAt } from "@/test/render-at";

function links(html: string): string[] {
    return [...html.matchAll(/<a [^>]*>/g)].map((match) => match[0]);
}

describe("LanguageSwitch", () => {
    it("links to the home page in Dutch at / and the others under their prefix", async () => {
        const [nl, en, de, fr] = links(await renderAt(LanguageSwitch, "/"));

        expect(nl).toContain('href="/"');
        expect(nl).toContain('hrefLang="nl"');
        expect(en).toContain('href="/en"');
        expect(en).toContain('hrefLang="en"');
        expect(de).toContain('href="/de"');
        expect(de).toContain('hrefLang="de"');
        expect(fr).toContain('href="/fr"');
        expect(fr).toContain('hrefLang="fr"');
    });

    it("keeps the path and the query string", async () => {
        const [nl, en, de, fr] = links(
            await renderAt(LanguageSwitch, "/play?day=3"),
        );

        expect(nl).toContain('href="/play?day=3"');
        expect(en).toContain('href="/en/play?day=3"');
        expect(de).toContain('href="/de/play?day=3"');
        expect(fr).toContain('href="/fr/play?day=3"');
    });

    it("links back from a German page to the same page in Dutch", async () => {
        overwriteGetLocale(() => "de");
        const [nl, , de] = links(await renderAt(LanguageSwitch, "/nl/archief"));

        expect(nl).toContain('href="/nl/archief"');
        expect(de).toContain('href="/de/nl/archief"');
        expect(de).toContain('aria-current="true"');
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
        expect(html).toContain('DE<span class="sr-only"> Duits</span>');
        expect(html).toContain('FR<span class="sr-only"> Frans</span>');
    });
});
