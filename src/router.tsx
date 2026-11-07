import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { ComponentType } from "react";
import { deLocalizeUrl, localizeUrl } from "@/paraglide/runtime";
import { ErrorPage } from "@/components/errors/error-page";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { routeTree } from "./routeTree.gen";

/**
 * Called once per request on the server and once in the browser, so each
 * request gets its own query cache: a cache shared between requests would
 * keep every request's reads in the server's memory (docs/data-loading.md).
 */
export function getRouter() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                // Long enough that a hover preload, the click after it and a
                // quick Back share one read.
                staleTime: 30_000,
                // A failed read shows the error at once rather than waiting
                // on retries.
                retry: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
            },
        },
    });

    const router = createTanStackRouter({
        routeTree,
        context: { queryClient },
        scrollRestoration: true,
        // A hovered link runs the route's loader ahead of the click. The
        // router itself keeps nothing (a preload is stale at once) and the
        // loaders go through the query cache, which decides whether the
        // server is asked again.
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
        // Every route without its own components shows these, inside the
        // shell: a not-found page, answered with HTTP 404, for an unmatched
        // URL or a thrown `notFound()`, and an error page, answered with
        // HTTP 500, for an error a route throws (docs/site-shell.md).
        defaultNotFoundComponent: NotFoundPage,
        defaultErrorComponent: ErrorPage,
        // Routes are declared once, without a locale. The rewrite strips the
        // `/en` prefix from an incoming URL before matching and puts the
        // current locale's prefix back on every link the router renders, so
        // `/en` matches `/` and a `<Link to="/">` on an English page points
        // at `/en`. See docs/i18n.md.
        rewrite: {
            input: ({ url }) => deLocalizeUrl(url),
            output: ({ url }) => localizeUrl(url),
        },
    });

    // Sends the queries the server render filled to the browser, so the
    // page does not read them again, and puts the query client in React
    // context for `useSuspenseQuery` and `useQuery`.
    setupRouterSsrQueryIntegration({
        router,
        queryClient,
    });

    return router;
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }

    interface StaticDataRouteOption {
        /**
         * What the footer shows above its links instead of the tagline,
         * such as the game's line legend (docs/site-shell.md#footer).
         */
        footerLegend?: ComponentType;
    }
}
