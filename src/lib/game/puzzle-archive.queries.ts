import { queryOptions } from "@tanstack/react-query";
import type { NetworkId } from "@/lib/data/networks";
import { getPuzzleArchiveFn } from "@/lib/game/puzzle-archive.functions";
import { nextDate, puzzleDayStart } from "@/lib/game/puzzle-day";

export function puzzleArchiveQueryOptions(network: NetworkId = "nl") {
    return queryOptions({
        queryKey: ["puzzleArchive", network],
        queryFn: () => getPuzzleArchiveFn({ data: { network } }),
        // The archive grows by one puzzle at the start of the day after its
        // newest; until then it stays the same.
        staleTime: (query) => {
            const newest = query.state.data?.puzzles.at(-1);
            return newest == null
                ? 0
                : Math.max(
                      0,
                      puzzleDayStart(nextDate(newest.date)).getTime() - Date.now(),
                  );
        },
    });
}
