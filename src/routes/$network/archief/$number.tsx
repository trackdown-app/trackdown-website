import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { GameLegend } from "@/components/game/game-legend";
import { GamePage } from "@/components/game/game-page";
import { puzzleArchiveQueryOptions } from "@/lib/game/puzzle-archive.queries";
import { puzzleDate } from "@/lib/game/puzzle-day";
import { maxGuesses } from "@/lib/game/rules";
import { seo } from "@/lib/seo";
import { stationsQueryOptions } from "@/lib/game/stations.queries";

export const Route = createFileRoute("/$network/archief/$number")({
    loader: async ({ context: { queryClient, network }, params }) => {
        const [archive] = await Promise.all([
            queryClient.ensureQueryData(puzzleArchiveQueryOptions(network)),
            queryClient.ensureQueryData(stationsQueryOptions(network, getLocale())),
        ]);
        // Only the archive's own numbers, written as it writes them: a
        // puzzle after today's is not in it, so its page is not found, as
        // is "007" or "abc".
        const puzzle = archive.puzzles.find(
            (candidate) => String(candidate.number) === params.number,
        );
        if (puzzle == null) {
            throw notFound();
        }
        // Today's puzzle is played on the network's home page, where it
        // counts for the streak.
        if (puzzle.date === puzzleDate(new Date())) {
            throw redirect({ to: "/$network", params: { network } });
        }
        return { puzzle: { network, ...puzzle, maxGuesses } };
    },
    // After the loader, so the loader's data keeps its type.
    head: ({ match, params }) =>
        seo({
            title: m["archive.puzzlePageTitle"]({ number: params.number }),
            description: m["seo.archivePuzzleDescription"]({
                number: params.number,
            }),
            path: match.pathname,
        }),
    staticData: { footerLegend: GameLegend },
    component: ArchiveGame,
});

function ArchiveGame() {
    const { network } = Route.useRouteContext();
    const { puzzle } = Route.useLoaderData();
    const { data: stations } = useSuspenseQuery(
        stationsQueryOptions(network, getLocale()),
    );
    return (
        <GamePage
            // A new puzzle is a new game: nothing carries over from the last.
            key={puzzle.number}
            puzzle={puzzle}
            stations={stations.stations}
            archive
        />
    );
}
