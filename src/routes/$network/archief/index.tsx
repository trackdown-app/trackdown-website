import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { ArchivePage } from "@/components/archive/archive-page";
import { puzzleArchiveQueryOptions } from "@/lib/game/puzzle-archive.queries";
import { puzzleDate } from "@/lib/game/puzzle-day";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/$network/archief/")({
    loader: async ({ context: { queryClient, network } }) => {
        await queryClient.ensureQueryData(puzzleArchiveQueryOptions(network));
        // Read where the loader runs, so the server render and the page it
        // hydrates agree on which puzzle is today's.
        return { today: puzzleDate(new Date()) };
    },
    // After the loader, so the loader's data keeps its type.
    head: ({ match }) =>
        seo({
            title: m["archive.pageTitle"](),
            description: m["seo.archiveDescription"](),
            path: match.pathname,
        }),
    component: Archive,
});

function Archive() {
    const { network } = Route.useRouteContext();
    const { today } = Route.useLoaderData();
    const { data: archive } = useSuspenseQuery(puzzleArchiveQueryOptions(network));
    return <ArchivePage network={network} puzzles={archive.puzzles} today={today} />;
}
