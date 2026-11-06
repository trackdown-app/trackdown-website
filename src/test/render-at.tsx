import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import {
    RouterProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";

/**
 * `Component`'s server render on `pathname` (without a locale prefix, as the
 * router sees it after the rewrite), inside a router as on the site.
 */
export async function renderAt(
    Component: () => ReactNode,
    pathname: string,
): Promise<string> {
    const rootRoute = createRootRoute({ component: Component });
    // Matches every path, so the component renders without a not-found page.
    const pageRoute = createRoute({ getParentRoute: () => rootRoute, path: "$" });
    const router = createRouter({
        routeTree: rootRoute.addChildren([pageRoute]),
        history: createMemoryHistory({ initialEntries: [pathname] }),
    });
    await router.load();
    return renderToStaticMarkup(<RouterProvider router={router} />);
}
