import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { RootDocument } from "@/components/layout/root-document";
import { consentQueryOptions } from "@/lib/analytics/consent.queries";
import type { ConsentChoice } from "@/lib/analytics/consent";
import { defaultNetwork } from "@/lib/data/networks";
import { readNetworkChoice } from "@/lib/network-choice";
import appCss from "../styles.css?url";

/** What every route's loader gets in `context`; built in `src/router.tsx`. */
export interface RouterContext {
    /** This request's query cache in the server render, the page's in the browser. */
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    // The network this visitor plays when the page has none of its own,
    // such as `/` and How to play (docs/network-picker.md).
    beforeLoad: async () => ({
        chosenNetwork: (await readNetworkChoice()) ?? defaultNetwork,
    }),
    loader: async ({ context }): Promise<{ consent: ConsentChoice | null }> => ({
        consent: await context.queryClient.ensureQueryData(consentQueryOptions()),
    }),
    // Native consent forms reload the page after a change. Client navigation
    // can keep the server-rendered answer for this document's lifetime.
    staleTime: Infinity,
    headers: () => ({ "Cache-Control": "private, no-store" }),
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
