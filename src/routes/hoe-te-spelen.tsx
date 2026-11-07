import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { HowToPlayPage } from "@/components/how-to-play/how-to-play-page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/hoe-te-spelen")({
    head: ({ match }) =>
        seo({
            title: m["howToPlay.pageTitle"](),
            description: m["seo.howToPlayDescription"](),
            path: match.pathname,
        }),
    component: HowToPlayPage,
});
