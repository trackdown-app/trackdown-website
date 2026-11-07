import { useQuery } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";
import type { NetworkId } from "@/lib/data/networks";
import { gameStorageKey, readStoredGame } from "@/lib/game/game-state";
import type { StoredGame } from "@/lib/game/game-state";
import { gameStore } from "@/lib/game/game-store";
import type { GameStore } from "@/lib/game/game-store";
import { puzzleArchiveQueryOptions } from "@/lib/game/puzzle-archive.queries";
import { maxGuesses } from "@/lib/game/rules";
import { computeStatistics } from "@/lib/game/statistics";

// Separates kept games in the store's snapshot; JSON never holds it.
const separator = "\u0000";

/**
 * The player's record at `network` (docs/statistics.md): the archive's
 * puzzles from the `puzzleArchive` operation, each one's game from `store`.
 * Read again after every write to the store, here or in another tab. The
 * server render has no storage, so it has no record: `statistics` is `null`
 * until the archive is in and the page has hydrated.
 */
export function useStatistics(network: NetworkId, store: GameStore = gameStore) {
    const archive = useQuery(puzzleArchiveQueryOptions(network));
    const numbers = useMemo(
        () => archive.data?.puzzles.map((puzzle) => puzzle.number) ?? [],
        [archive.data],
    );
    // One string for every kept game, so `useSyncExternalStore` sees the
    // same snapshot until a game changes.
    const raw = useSyncExternalStore(
        store.subscribe,
        () =>
            numbers
                .map((number) => store.read(gameStorageKey(network, number)) ?? "")
                .join(separator),
        () => null,
    );
    const statistics = useMemo(() => {
        if (archive.data == null || raw == null) {
            return null;
        }
        const kept = raw.split(separator);
        const games = new Map<number, StoredGame>();
        numbers.forEach((number, index) => {
            const entry = kept[index];
            if (entry != null && entry !== "") {
                games.set(number, readStoredGame(entry));
            }
        });
        return computeStatistics(archive.data.puzzles, games, maxGuesses);
    }, [archive.data, numbers, raw]);

    return {
        statistics,
        isError: archive.isError,
        retry: () => {
            void archive.refetch();
        },
    };
}
