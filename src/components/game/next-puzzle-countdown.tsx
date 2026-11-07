import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { m } from "@/paraglide/messages";
import type { NetworkId } from "@/lib/data/networks";
import {
    countdownClock,
    countdownDuration,
    secondsUntil,
} from "@/lib/game/countdown";
import { todayPuzzleQueryOptions } from "@/lib/game/today-puzzle.queries";
import { useNow } from "@/lib/use-now";

/** How often to ask again while the server still answers yesterday's puzzle. */
const retryMs = 10_000;

type NextPuzzleCountdownProps = {
    network: NetworkId;
};

/**
 * "Next station in 13:42:08", from the footer of the design's Web · Playing
 * board (docs/game.md#countdown): the time left until today's puzzle's
 * `nextPuzzleAt`. The server renders it, the browser ticks it every second,
 * and at zero it reads today's puzzle again, so the page moves on to the
 * new one.
 */
export function NextPuzzleCountdown({ network }: NextPuzzleCountdownProps) {
    const queryClient = useQueryClient();
    const { data: puzzle } = useQuery(todayPuzzleQueryOptions(network));
    const now = useNow();
    const seconds =
        puzzle == null ? null : secondsUntil(Date.parse(puzzle.nextPuzzleAt), now);
    const expired = seconds === 0;

    useEffect(() => {
        if (!expired) {
            return;
        }
        const { queryKey } = todayPuzzleQueryOptions(network);
        function reload() {
            void queryClient.invalidateQueries({ queryKey });
        }
        reload();
        // A browser clock ahead of the server's reaches zero first, and the
        // answer is still today's puzzle: ask again until the new one is in.
        const retry = setInterval(reload, retryMs);
        return () => {
            clearInterval(retry);
        };
    }, [expired, network, queryClient]);

    // The route's loader has read today's puzzle before the footer renders,
    // so this only happens when that read failed.
    if (seconds == null) {
        return null;
    }
    return (
        <p>
            {m["countdown.nextStation"]()}{" "}
            {/* The server's clock and the browser's first render differ by
                the seconds between them; the next tick puts it right. */}
            <time
                dateTime={countdownDuration(seconds)}
                suppressHydrationWarning
                className="font-bold text-foreground"
            >
                {countdownClock(seconds)}
            </time>
        </p>
    );
}
