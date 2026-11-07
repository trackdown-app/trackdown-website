import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { GamePage } from "@/components/game/game-page";
import { PlayingFooterLegend } from "@/components/game/playing-footer-legend";
import { stationsQueryOptions } from "@/lib/game/stations.queries";
import { todayNetwork as network } from "@/lib/game/today-network";
import { todayPuzzleQueryOptions } from "@/lib/game/today-puzzle.queries";

export const Route = createFileRoute("/")({
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(todayPuzzleQueryOptions(network)),
            context.queryClient.ensureQueryData(
                stationsQueryOptions(network, getLocale()),
            ),
        ]);
    },
    staticData: { footerLegend: PlayingFooterLegend },
    component: TodayGame,
});

function TodayGame() {
    const { data: puzzle } = useSuspenseQuery(todayPuzzleQueryOptions(network));
    const { data: stations } = useSuspenseQuery(
        stationsQueryOptions(network, getLocale()),
    );
    return <GamePage puzzle={puzzle} stations={stations.stations} />;
}
