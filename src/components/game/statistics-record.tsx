import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { StatisticsSummary } from "@/components/game/statistics-summary";
import type { NetworkId } from "@/lib/data/networks";
import type { GameStore } from "@/lib/game/game-store";
import { useStatistics } from "@/lib/game/use-statistics";

type StatisticsRecordProps = {
    network: NetworkId;
    /** Where the games are kept; the page's `localStorage` store unless a test hands its own. */
    store?: GameStore | undefined;
};

/**
 * The player's record at `network` (docs/statistics.md), without its
 * heading: the solved screen and the statistics dialog each give their own.
 * Until the archive is in, a muted line says it is loading; when it fails,
 * an alert with a button that asks again.
 */
export function StatisticsRecord({ network, store }: StatisticsRecordProps) {
    const { statistics, isError, retry } = useStatistics(network, store);

    if (isError) {
        return (
            <div role="alert" className="flex flex-wrap items-center gap-3">
                <p className="text-base">{m["statistics.failed"]()}</p>
                <Button variant="outline" className="border-2" onClick={retry}>
                    {m["statistics.retry"]()}
                </Button>
            </div>
        );
    }
    if (statistics == null) {
        return (
            <p className="text-base text-muted-foreground">
                {m["statistics.loading"]()}
            </p>
        );
    }
    return <StatisticsSummary statistics={statistics} />;
}
