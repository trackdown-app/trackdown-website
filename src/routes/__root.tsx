import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
    HeadContent,
    Scripts,
    createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { ReactNode } from "react";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
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

function RootDocument({ children }: { children: ReactNode }) {
    return (
        // The request's locale on the server (`src/server.ts`), the URL's in
        // the browser.
        <html lang={getLocale()}>
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                {/* The Vite devtools plugin strips this from production builds. */}
                <TanStackDevtools
                    config={{ position: "bottom-right" }}
                    plugins={[
                        {
                            name: "TanStack Router",
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                        {
                            name: "TanStack Query",
                            render: (_el, { theme }) => (
                                <ReactQueryDevtoolsPanel
                                    theme={theme}
                                    style={{ height: "100%" }}
                                />
                            ),
                        },
                    ]}
                />
                <Scripts />
            </body>
        </html>
    );
}
