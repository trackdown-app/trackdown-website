import { useCallback, useSyncExternalStore } from "react";

function serverSnapshot(): boolean {
    return false;
}

/**
 * Whether the media query `query` matches, kept up to date. `false` in the
 * server render and on the first paint after it, so hydration matches, and
 * where `matchMedia` does not exist.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (listener: () => void) => {
            if (typeof window.matchMedia !== "function") {
                return () => undefined;
            }
            const media = window.matchMedia(query);
            media.addEventListener("change", listener);
            return () => {
                media.removeEventListener("change", listener);
            };
        },
        [query],
    );
    const snapshot = useCallback(
        () =>
            typeof window.matchMedia === "function" &&
            window.matchMedia(query).matches,
        [query],
    );
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
