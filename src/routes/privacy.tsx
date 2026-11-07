import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { PrivacyPage } from "@/components/legal/privacy-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
    head: ({ match }) =>
        seo({
            title: m["privacy.pageTitle"](),
            description: m["seo.privacyDescription"](),
            path: match.pathname,
        }),
    component: PrivacyPage,
});
