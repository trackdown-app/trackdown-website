import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { RootDocument } from "@/components/layout/root-document";
import appCss from "../styles.css?url";

/** What every route's loader gets in `context`; built in `src/router.tsx`. */
export interface RouterContext {
    /** This request's query cache in the server render, the page's in the browser. */
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: m["site.name"](),
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    shellComponent: RootDocument,
});
