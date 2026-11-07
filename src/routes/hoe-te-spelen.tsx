import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { HowToPlayPage } from "@/components/how-to-play/how-to-play-page";

export const Route = createFileRoute("/hoe-te-spelen")({
    head: () => ({
        meta: [{ title: m["howToPlay.pageTitle"]() }],
    }),
    component: HowToPlayPage,
});
