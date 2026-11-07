import { describe, expect, it } from "vitest";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { renderAt } from "@/test/render-at";

describe("CookieBanner server output", () => {
    it("shows Dutch copy and equally styled choices, Decline first", async () => {
        const html = await renderAt(() => <CookieBanner consent={null} />, "/");
        expect(html).toContain("Cookies, alleen als jij het goed vindt");
        expect(html).toContain('action="/consent"');
        expect(html).toContain('method="post"');
        expect(html).toContain('href="/privacy"');
        const buttons = [...html.matchAll(/<button[^>]*>/g)].map(([tag]) => tag);
        expect(buttons).toHaveLength(2);
        expect(buttons[0]).toContain('value="decline"');
        expect(buttons[1]).toContain('value="accept"');
        const classes = buttons.map((tag) => /class="([^"]+)"/.exec(tag)?.[1]);
        expect(classes[0]).toBe(classes[1]);
        expect(html).toContain("grid-cols-2");
    });

    it("shows the canvas's English copy and preserves the localized return path", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(
            () => <CookieBanner consent={null} />,
            "/archief/12?source=footer",
        );
        expect(html).toContain("Cookies, only if you&#x27;re OK with it");
        expect(html).toContain("Trackdown is a hobby project without ads.");
        expect(html).toContain('href="/en/privacy"');
        expect(html).toContain('value="/en/archief/12?source=footer"');
    });

    it.each([true, false])(
        "offers settings after analytics = %s",
        async (analytics) => {
            overwriteGetLocale(() => "en");
            const html = await renderAt(
                () => <CookieBanner consent={{ analytics }} />,
                "/archief/12?source=footer",
            );
            expect(html).not.toContain('action="/consent"');
            expect(html).toContain('role="status"');
            expect(html).toContain(
                analytics ? "Analytics cookie on." : "No analytics cookie.",
            );
            expect(html).toContain('action="/en/archief/12#cookie-title"');
            expect(html).toContain('name="source" value="footer"');
            expect(html).toContain('name="cookie-settings"');
            expect(html).toContain("Cookie settings");
        },
    );
});
