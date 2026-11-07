import { queryOptions } from "@tanstack/react-query";
import type { NetworkId } from "@/lib/data/networks";
import { getMetaFn } from "@/lib/game/meta.functions";

export function metaQueryOptions(network: NetworkId = "nl") {
    return queryOptions({
        queryKey: ["meta", network],
        queryFn: () => getMetaFn({ data: { network } }),
        // The data only changes with a deploy, which loads a new page.
        staleTime: Infinity,
    });
}
