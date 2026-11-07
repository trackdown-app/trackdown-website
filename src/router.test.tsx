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
// The archive up to today, by this machine's clock in Amsterdam: puzzle 142
// two days ago, 143 yesterday and 144 today.
vi.mock("@/lib/game/puzzle-archive.functions", async () => {
    const { puzzleDate } = await import("@/lib/game/puzzle-day");
    function dayBefore(date: string): string {
        const day = new Date(`${date}T00:00:00Z`);
        day.setUTCDate(day.getUTCDate() - 1);
        return day.toISOString().slice(0, 10);
    }
    const today = puzzleDate(new Date());
    const yesterday = dayBefore(today);
    return {
        getPuzzleArchiveFn: () =>
            Promise.resolve({
                network: "nl",
                puzzles: [
                    { number: 142, date: dayBefore(yesterday) },
                    { number: 143, date: yesterday },
                    { number: 144, date: today },
                ],
            }),
    };
});
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

    it("answers how to play with its page, inside the header and footer", async () => {
        const { status, html } = await respondAt(getRouter, "/hoe-te-spelen");

        expect(status).toBe(200);
        expect(html).toContain("<title>Hoe speel je · Trackdown</title>");
        expect(html).toContain("Raad een station in Nederland.");
        expect(html).toContain("<header");
        // No legend in the footer here: the page carries it.
        expect(html).toContain("Trackdown, een hobbyproject van Bram Gussekloo");
    });

    it("answers the archive with every puzzle up to today's, newest first", async () => {
        const { status, html } = await respondAt(getRouter, "/archief");

        expect(status).toBe(200);
        expect(html).toContain("<title>Archief · Trackdown</title>");
        const links = [...html.matchAll(/href="(\/archief\/\d+)"/g)].map(
            (match) => match[1],
        );
        expect(links).toEqual(["/archief/143", "/archief/142"]);
        expect(html).toContain("Puzzel 144");
        expect(html).toContain("<header");
    });

    it("plays an earlier puzzle on its own page, with the legend in the footer", async () => {
        const { status, html } = await respondAt(getRouter, "/archief/142");

        expect(status).toBe(200);
        expect(html).toContain("<title>Puzzel 142 · Trackdown</title>");
        expect(html).toContain("puzzel 142");
        expect(html).toContain("Welk station was het mysterie?");
        expect(html).toContain("Legenda");
        // The countdown is today's puzzle's, not this one's.
        expect(html).not.toContain("Volgend station over");
    });

    it("sends today's puzzle in the archive to the home page", async () => {
        const handler = createRequestHandler({
            request: new Request("http://localhost/archief/144"),
            createRouter: getRouter,
        });
        const response = await handler(defaultRenderHandler);

        expect(response.status).toBe(307);
        expect(
            new URL(response.headers.get("location") ?? "", "http://localhost")
                .pathname,
        ).toBe("/");
    });

    it.each(["/archief/145", "/archief/0", "/archief/0142", "/archief/abc"])(
        "answers %s, not a puzzle up to today's, with 404",
        async (pathname) => {
            const { status, html } = await respondAt(getRouter, pathname);

            expect(status).toBe(404);
            expect(html).toContain("Deze pagina bestaat niet");
        },
    );

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
