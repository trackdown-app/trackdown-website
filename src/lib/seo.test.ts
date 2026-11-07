import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { languageAlternates, pageUrl, seo } from "@/lib/seo";
import type { HeadTags } from "@/lib/seo";

function metaContent(tags: HeadTags, key: string): string | undefined {
    return tags.meta
        .find((tag) => tag.name === key || tag.property === key)
        ?.content?.toString();
}

function link(tags: HeadTags, rel: string, hrefLang?: string): string | undefined {
    return tags.links.find(
        (tag) => tag.rel === rel && (hrefLang == null || tag.hrefLang === hrefLang),
    )?.href;
}

describe("pageUrl", () => {
    it("puts a page on the site's address in each language", () => {
        expect(pageUrl("/nl", "nl")).toBe("https://trackdown.nl/nl");
        expect(pageUrl("/nl", "en")).toBe("https://trackdown.nl/en/nl");
        expect(pageUrl("/hoe-te-spelen", "en")).toBe(
            "https://trackdown.nl/en/hoe-te-spelen",
        );
    });

    it("drops an index route's trailing slash", () => {
        expect(pageUrl("/nl/archief/", "nl")).toBe(
            "https://trackdown.nl/nl/archief",
        );
        expect(pageUrl("/nl/archief/", "en")).toBe(
            "https://trackdown.nl/en/nl/archief",
        );
    });
});

describe("languageAlternates", () => {
    it("lists Dutch, English and the Dutch page as x-default", () => {
        expect(languageAlternates("/nl")).toEqual([
            { hrefLang: "nl", href: "https://trackdown.nl/nl" },
            { hrefLang: "en", href: "https://trackdown.nl/en/nl" },
            { hrefLang: "x-default", href: "https://trackdown.nl/nl" },
        ]);
    });
});

describe("seo", () => {
    const options = {
        title: "Trackdown NL · Puzzel 142",
        description: "Puzzel 142: welk station is het mysterie van vandaag?",
        path: "/nl/",
    };

    it("gives a Dutch page its canonical URL, both hreflang links and x-default", () => {
        const tags = seo(options);

        expect(link(tags, "canonical")).toBe("https://trackdown.nl/nl");
        expect(link(tags, "alternate", "nl")).toBe("https://trackdown.nl/nl");
        expect(link(tags, "alternate", "en")).toBe("https://trackdown.nl/en/nl");
        expect(link(tags, "alternate", "x-default")).toBe("https://trackdown.nl/nl");
        expect(metaContent(tags, "og:locale")).toBe("nl_NL");
        expect(metaContent(tags, "og:locale:alternate")).toBe("en_GB");
    });

    it("points an English page's canonical URL at the English page", () => {
        overwriteGetLocale(() => "en");
        const tags = seo(options);

        expect(link(tags, "canonical")).toBe("https://trackdown.nl/en/nl");
        expect(link(tags, "alternate", "nl")).toBe("https://trackdown.nl/nl");
        expect(link(tags, "alternate", "en")).toBe("https://trackdown.nl/en/nl");
        expect(metaContent(tags, "og:locale")).toBe("en_GB");
        expect(metaContent(tags, "og:locale:alternate")).toBe("nl_NL");
    });

    it("previews a link with the title, description and the share image", () => {
        const tags = seo(options);

        expect(tags.meta).toContainEqual({ title: options.title });
        expect(metaContent(tags, "description")).toBe(options.description);
        expect(metaContent(tags, "og:title")).toBe(options.title);
        expect(metaContent(tags, "og:description")).toBe(options.description);
        expect(metaContent(tags, "og:url")).toBe("https://trackdown.nl/nl");
        expect(metaContent(tags, "og:image")).toBe(
            "https://trackdown.nl/og-image.png",
        );
        expect(metaContent(tags, "og:image:width")).toBe("1200");
        expect(metaContent(tags, "og:image:height")).toBe("630");
        expect(metaContent(tags, "twitter:card")).toBe("summary_large_image");
        expect(metaContent(tags, "twitter:image")).toBe(
            "https://trackdown.nl/og-image.png",
        );
    });
});
