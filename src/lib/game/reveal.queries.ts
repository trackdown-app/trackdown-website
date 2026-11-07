import { queryOptions } from "@tanstack/react-query";
import type { StationCode } from "@/lib/data/data-schema";
import type { NetworkId } from "@/lib/data/networks";
import { revealAnswerFn } from "@/lib/game/reveal.functions";

/**
 * The answer to a finished game: the `reveal` operation for `guesses`, oldest
 * first. A `POST`, because the guesses travel in its body, but it changes
 * nothing, so it is read through a query (docs/data-loading.md#a-read-sent-as-a-post).
 * The answer to the same game never changes.
 */
export function revealQueryOptions(
    network: NetworkId,
    number: number,
    guesses: readonly StationCode[],
) {
    return queryOptions({
        queryKey: ["reveal", network, number, guesses],
        queryFn: () =>
            revealAnswerFn({ data: { network, number, guesses: [...guesses] } }),
        staleTime: Infinity,
    });
}
