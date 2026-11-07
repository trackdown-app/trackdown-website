import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import {
    RouterProvider,
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
} from "@tanstack/react-router";
import { deLocalizeUrl, localizeHref, localizeUrl } from "@/paraglide/runtime";

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
        // The address as the browser has it, `/en` included on an English page.
        history: createMemoryHistory({ initialEntries: [localizeHref(pathname)] }),
        // The site's locale rewrite (src/router.tsx), so a router `<Link>`
        // points under `/en` on an English page, as on the site.
        rewrite: {
            input: ({ url }) => deLocalizeUrl(url),
            output: ({ url }) => localizeUrl(url),
        },
    });
    await router.load();
    return renderToStaticMarkup(<RouterProvider router={router} />);
}
