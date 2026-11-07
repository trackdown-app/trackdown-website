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
    it("answers the home page with 200, inside the header and footer", async () => {
        const { status, html } = await respondAt(getRouter, "/");

        expect(status).toBe(200);
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
