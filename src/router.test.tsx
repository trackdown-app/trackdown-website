import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import type { AnyRouter } from "@tanstack/react-router";
import {
    createRequestHandler,
    defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { describe, expect, it, vi } from "vitest";
import { ErrorPage } from "@/components/errors/error-page";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { RootDocument } from "@/components/layout/root-document";
import { getRouter } from "@/router";

// The home page's loader calls server functions, which need the Start server
// these tests render without. They answer with a made-up puzzle instead.
vi.mock("@/lib/game/today-puzzle.functions", () => ({
    getTodayPuzzleFn: () =>
        Promise.resolve({
            network: "nl",
            number: 142,
            date: "2026-11-06",
            maxGuesses: 6,
            nextPuzzleAt: "2026-11-06T23:00:00.000Z",
        }),
}));
vi.mock("@/lib/game/stations.functions", () => ({
    getStationsFn: () =>
        Promise.resolve({
            network: "nl",
            locale: "nl",
            stations: [
                { code: "ut", name: "Utrecht Centraal", province: "Utrecht" },
            ],
        }),
}));
vi.mock("@/lib/game/guess.functions", () => ({
    submitGuessFn: () => Promise.reject(new Error("not in this test")),
}));

/**
 * The server's answer to a request for `pathname`, rendered by the router's
 * own request handler, as `src/server.ts` does through Start.
 */
async function respondAt(
    createRouterForRequest: () => AnyRouter,
    pathname: string,
): Promise<{ status: number; html: string }> {
    const handler = createRequestHandler({
        request: new Request(new URL(pathname, "http://localhost")),
        createRouter: createRouterForRequest,
    });
    const response = await handler(defaultRenderHandler);
    return { status: response.status, html: await response.text() };
}

/**
 * A router with the site's shell and default pages, and one page whose
 * loader throws. The site's query integration stays out: it needs the
 * Start server it is set up for.
 */
function siteRouterWithFailingPage(): AnyRouter {
    const rootRoute = createRootRoute({
        shellComponent: RootDocument,
    });
    const failingRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/kapot",
        loader: () => {
            throw new Error("no trains today");
        },
    });
    return createRouter({
        routeTree: rootRoute.addChildren([failingRoute]),
        defaultNotFoundComponent: NotFoundPage,
        defaultErrorComponent: ErrorPage,
    });
}

describe("the site's router", () => {
    it("answers the home page with today's game, inside the header and footer", async () => {
        const { status, html } = await respondAt(getRouter, "/");

        expect(status).toBe(200);
        expect(html).toContain("Vrijdag 6 november, puzzel 142");
        expect(html).toContain("Welk station is het mysterie van vandaag?");
        // The footer's legend replaces its tagline on the game page.
        expect(html).toContain("Legenda");
        // And the countdown to the next puzzle, rendered on the server.
        expect(html).toMatch(
            /Volgend station over(<!-- -->)? <time[^>]*>\d\d:\d\d:\d\d</,
        );
        expect(html).toContain("<header");
        expect(html).toContain("<footer");
        expect(html).toContain('href="#content"');
    });

    it("answers an unknown path with 404 and the not-found page", async () => {
        const { status, html } = await respondAt(getRouter, "/geen-station");

        expect(status).toBe(404);
        expect(html).toContain("Deze pagina bestaat niet");
        expect(html).toContain("<header");
        expect(html).toContain('href="/privacy"');
    });

    it("shows the error page for an error a route throws", () => {
        expect(getRouter().options.defaultErrorComponent).toBe(ErrorPage);
    });

    it("answers an error a route throws with 500 and the error page, without the error", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { status, html } = await respondAt(
            siteRouterWithFailingPage,
            "/kapot",
        );

        // What the page shows. The router's hydration data, in a script
        // after it, still carries the error for the browser's error page.
        const page = html.slice(0, html.indexOf("<script"));

        expect(status).toBe(500);
        expect(page).toContain("Er ging iets mis");
        expect(page).toContain("Opnieuw proberen");
        expect(page).not.toContain("no trains today");
    });
});
