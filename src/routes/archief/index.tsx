import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { ArchivePage } from "@/components/archive/archive-page";
import { puzzleArchiveQueryOptions } from "@/lib/game/puzzle-archive.queries";
import { puzzleDate } from "@/lib/game/puzzle-day";
import { todayNetwork as network } from "@/lib/game/today-network";

export const Route = createFileRoute("/archief/")({
    head: () => ({
        meta: [{ title: m["archive.pageTitle"]() }],
    }),
    loader: async ({ context }) => {
        await context.queryClient.ensureQueryData(
            puzzleArchiveQueryOptions(network),
        );
        // Read where the loader runs, so the server render and the page it
        // hydrates agree on which puzzle is today's.
        return { today: puzzleDate(new Date()) };
    },
    component: Archive,
});

function Archive() {
    const { today } = Route.useLoaderData();
    const { data: archive } = useSuspenseQuery(puzzleArchiveQueryOptions(network));
    return <ArchivePage network={network} puzzles={archive.puzzles} today={today} />;
}
