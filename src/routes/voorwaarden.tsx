import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { TermsPage } from "@/components/legal/terms-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/voorwaarden")({
    head: ({ match }) =>
        seo({
            title: m["terms.pageTitle"](),
            description: m["seo.termsDescription"](),
            path: match.pathname,
        }),
    component: TermsPage,
});
