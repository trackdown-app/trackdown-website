import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { GamePage } from "@/components/game/game-page";
import { PlayingFooterLegend } from "@/components/game/playing-footer-legend";
import { stationsQueryOptions } from "@/lib/game/stations.queries";
import { todayPuzzleQueryOptions } from "@/lib/game/today-puzzle.queries";

export const Route = createFileRoute("/$network/")({
    loader: async ({ context: { queryClient, network } }) => {
        await Promise.all([
            queryClient.ensureQueryData(todayPuzzleQueryOptions(network)),
            queryClient.ensureQueryData(stationsQueryOptions(network, getLocale())),
        ]);
    },
    staticData: { footerLegend: PlayingFooterLegend },
    component: TodayGame,
});

function TodayGame() {
    const { network } = Route.useRouteContext();
    const { data: puzzle } = useSuspenseQuery(todayPuzzleQueryOptions(network));
    const { data: stations } = useSuspenseQuery(
        stationsQueryOptions(network, getLocale()),
    );
    return <GamePage puzzle={puzzle} stations={stations.stations} />;
}
