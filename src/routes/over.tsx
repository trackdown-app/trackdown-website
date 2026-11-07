import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { AboutPage } from "@/components/legal/about-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/over")({
    head: ({ match }) =>
        seo({
            title: m["about.pageTitle"](),
            description: m["seo.aboutDescription"](),
            path: match.pathname,
        }),
    component: AboutPage,
});
