import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { HeadContent, Scripts, useLoaderData } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { ReactNode } from "react";
import { getLocale } from "@/paraglide/runtime";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink, contentId } from "@/components/layout/skip-link";
import { themeInitScript } from "@/lib/theme";
import { CookieBanner } from "@/components/consent/cookie-banner";

/**
 * The document around every page, the root route's `shellComponent`: the
 * skip link, the header, the page (or its not-found or error page) and the
 * footer (docs/site-shell.md).
 */
export function RootDocument({ children }: { children: ReactNode }) {
    const data = useLoaderData({ from: "__root__" });
    return (
        // The request's locale on the server (`src/server.ts`), the URL's in
        // the browser.
        <html lang={getLocale()} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
                <HeadContent />
            </head>
            <body className="flex min-h-svh flex-col">
                <SkipLink />
                <SiteHeader />
                {/* Every page's `main`, or its error page's, is in here. */}
                <div id={contentId} className="flex-1">
                    {children}
                </div>
                <SiteFooter />
                <CookieBanner consent={data?.consent ?? null} />
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
