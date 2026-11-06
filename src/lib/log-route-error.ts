import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Logs an error a route threw while the server rendered it, to the server's
 * console, which the host collects. In the browser it does nothing: React
 * already reports the error in the console. Server logs to PostHog replace
 * the `console.error` once they exist.
 */
export const logRouteError = createIsomorphicFn().server((error: unknown) => {
    console.error("A route failed while the server rendered it", error);
});
