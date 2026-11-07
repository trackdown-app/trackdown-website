import { queryOptions } from "@tanstack/react-query";
import type { NetworkId } from "@/lib/data/networks";
import { getTodayPuzzleFn } from "@/lib/game/today-puzzle.functions";

export function todayPuzzleQueryOptions(network: NetworkId = "nl") {
    return queryOptions({
        queryKey: ["todayPuzzle", network],
        queryFn: () => getTodayPuzzleFn({ data: { network } }),
        // Today's puzzle stays today's until the next one starts.
        staleTime: (query) => {
            const puzzle = query.state.data;
            return puzzle == null
                ? 0
                : Math.max(0, Date.parse(puzzle.nextPuzzleAt) - Date.now());
        },
    });
}
