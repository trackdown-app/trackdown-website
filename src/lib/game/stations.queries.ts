import { queryOptions } from "@tanstack/react-query";
import type { NetworkId } from "@/lib/data/networks";
import { getStationsFn } from "@/lib/game/stations.functions";
import type { Locale } from "@/paraglide/runtime";

export function stationsQueryOptions(network: NetworkId, locale: Locale) {
    return queryOptions({
        queryKey: ["stations", network, locale],
        queryFn: () => getStationsFn({ data: { network, locale } }),
        // The stations only change with a deploy, which loads a new page.
        staleTime: Infinity,
    });
}
