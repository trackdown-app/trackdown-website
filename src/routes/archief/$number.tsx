import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { GameLegend } from "@/components/game/game-legend";
import { GamePage } from "@/components/game/game-page";
import { puzzleArchiveQueryOptions } from "@/lib/game/puzzle-archive.queries";
import { puzzleDate } from "@/lib/game/puzzle-day";
import { maxGuesses } from "@/lib/game/rules";
import { stationsQueryOptions } from "@/lib/game/stations.queries";
import { todayNetwork as network } from "@/lib/game/today-network";

export const Route = createFileRoute("/archief/$number")({
    loader: async ({ context, params }) => {
        const [archive] = await Promise.all([
            context.queryClient.ensureQueryData(puzzleArchiveQueryOptions(network)),
            context.queryClient.ensureQueryData(
                stationsQueryOptions(network, getLocale()),
            ),
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
        // Today's puzzle is played on the home page, where it counts for
        // the streak.
        if (puzzle.date === puzzleDate(new Date())) {
            throw redirect({ to: "/" });
        }
        return { puzzle: { network, ...puzzle, maxGuesses } };
    },
    // After the loader, so the loader's data keeps its type.
    head: ({ params }) => ({
        meta: [{ title: m["archive.puzzlePageTitle"]({ number: params.number }) }],
    }),
    staticData: { footerLegend: GameLegend },
    component: ArchiveGame,
});

function ArchiveGame() {
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
