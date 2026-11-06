import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
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
}
