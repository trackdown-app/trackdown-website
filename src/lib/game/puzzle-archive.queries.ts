import { queryOptions } from "@tanstack/react-query";
import type { NetworkId } from "@/lib/data/networks";
import { getPuzzleArchiveFn } from "@/lib/game/puzzle-archive.functions";

export function puzzleArchiveQueryOptions(network: NetworkId = "nl") {
    return queryOptions({
        queryKey: ["puzzleArchive", network],
        queryFn: () => getPuzzleArchiveFn({ data: { network } }),
    });
}
