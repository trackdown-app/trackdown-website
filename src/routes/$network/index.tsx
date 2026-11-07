import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { seo } from "@/lib/seo";
import { GamePage } from "@/components/game/game-page";
import { PlayingFooterLegend } from "@/components/game/playing-footer-legend";
import { stationsQueryOptions } from "@/lib/game/stations.queries";
import { todayPuzzleQueryOptions } from "@/lib/game/today-puzzle.queries";

export const Route = createFileRoute("/$network/")({
    loader: async ({ context: { queryClient, network } }) => {
        const [puzzle] = await Promise.all([
            queryClient.ensureQueryData(todayPuzzleQueryOptions(network)),
            queryClient.ensureQueryData(stationsQueryOptions(network, getLocale())),
        ]);
        // For the link preview: the puzzle's number, never its station.
        return { number: puzzle.number };
    },
    // After the loader, so the loader's data keeps its type.
    head: ({ match, params, loaderData }) =>
        seo({
            title:
                loaderData == null
                    ? m["site.name"]()
                    : m["seo.gameTitle"]({
                          network: params.network.toUpperCase(),
                          number: String(loaderData.number),
                      }),
            description:
                loaderData == null
                    ? m["seo.description"]()
                    : m["seo.gameDescription"]({
                          number: String(loaderData.number),
                      }),
            path: match.pathname,
        }),
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
