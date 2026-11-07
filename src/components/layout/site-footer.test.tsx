import { renderToStaticMarkup } from "react-dom/server";
import {
    RouterProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { overwriteGetLocale } from "@/paraglide/runtime";
import { SiteFooter } from "@/components/layout/site-footer";
import { renderAt } from "@/test/render-at";

function linkedPaths(html: string): string[] {
    return [...html.matchAll(/href="([^"]+)"/g)].flatMap((match) =>
        match[1] == null ? [] : [match[1]],
    );
}

function TestLegend() {
    return <p>Test legend</p>;
}

/** The footer on a page whose route names `TestLegend` as its legend. */
async function renderWithLegend(): Promise<string> {
    const rootRoute = createRootRoute({ component: SiteFooter });
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        staticData: { footerLegend: TestLegend },
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([pageRoute]),
        history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();
    return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe("SiteFooter", () => {
    it("links About, Privacy and Terms and offers Cookie settings in Dutch", async () => {
        const html = await renderAt(SiteFooter, "/");
        const linked = linkedPaths(html);

        expect(linked).toEqual(["/over", "/privacy", "/voorwaarden"]);
        expect(html).toContain('action="/#cookie-title"');
        expect(html).toContain('name="cookie-settings"');
        expect(html).toContain("Cookie-instellingen");
    });

    it("links the same pages under /en in English", async () => {
        overwriteGetLocale(() => "en");
        const html = await renderAt(SiteFooter, "/");

        expect(linkedPaths(html)).toEqual([
            "/en/over",
            "/en/privacy",
            "/en/voorwaarden",
        ]);
        expect(html).toContain('action="/en#cookie-title"');
        expect(html).toContain("Cookie settings");
    });

    it("marks only the current page with aria-current", async () => {
        const html = await renderAt(SiteFooter, "/privacy");
        const current = [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>/g)];

        expect(current).toHaveLength(1);
        expect(current[0]?.[0]).toContain('href="/privacy"');
    });

    it("shows the tagline when the page names no legend", async () => {
        expect(await renderAt(SiteFooter, "/")).toContain(
            "Trackdown, een hobbyproject van Bram Gussekloo",
        );
    });

    it("shows the page's legend instead of the tagline", async () => {
        const html = await renderWithLegend();

        expect(html).toContain("Test legend");
        expect(html).not.toContain("hobbyproject");
        expect(html).toContain("basis-full");
    });
});
