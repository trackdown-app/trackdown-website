import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { GameLegend } from "@/components/game/game-legend";
import { GamePage } from "@/components/game/game-page";
import { stationsQueryOptions } from "@/lib/game/stations.queries";
import { todayPuzzleQueryOptions } from "@/lib/game/today-puzzle.queries";

/** Today's puzzle on the Dutch network, until the network picker lands. */
const network = "nl";

export const Route = createFileRoute("/")({
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(todayPuzzleQueryOptions(network)),
            context.queryClient.ensureQueryData(
                stationsQueryOptions(network, getLocale()),
            ),
        ]);
    },
    staticData: { footerLegend: GameLegend },
    component: TodayGame,
});

function TodayGame() {
    const { data: puzzle } = useSuspenseQuery(todayPuzzleQueryOptions(network));
    const { data: stations } = useSuspenseQuery(
        stationsQueryOptions(network, getLocale()),
    );
    return <GamePage puzzle={puzzle} stations={stations.stations} />;
}
