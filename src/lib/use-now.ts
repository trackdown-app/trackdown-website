import { useSyncExternalStore } from "react";

// A clock that ticks once a second, on the second, for every component that
// reads it.

/** Calls `onTick` at the start of every second until unsubscribed. */
function subscribe(onTick: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
        // Aimed at the next whole second, so a throttled or late timer
        // does not drift.
        timer = setTimeout(
            () => {
                onTick();
                schedule();
            },
            1000 - (Date.now() % 1000),
        );
    }
    schedule();
    return () => {
        clearTimeout(timer);
    };
}

/** Now, to the second: the same number for every read within one second. */
function currentSecond(): number {
    return Math.floor(Date.now() / 1000) * 1000;
}

/**
 * Now, in epoch milliseconds rounded down to the second, re-rendering the
 * component every second. The server render reads the server's clock and
 * the browser's first render its own, so what it shows can differ by the
 * seconds between them: mark the element that shows it
 * `suppressHydrationWarning`.
 */
export function useNow(): number {
    return useSyncExternalStore(subscribe, currentSecond, currentSecond);
}
