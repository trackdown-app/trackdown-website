// Where the page keeps games between visits (docs/game.md#storage): the
// browser's `localStorage`, guarded, with the page's memory behind it. When
// storage is unavailable (blocked, full, a private window that refuses it)
// the game still plays; it just does not survive a reload.

/** A key-value store `useSyncExternalStore` can read and watch. */
export type GameStore = {
    /** Calls `listener` after every write, here or in another tab. */
    subscribe: (listener: () => void) => () => void;
    /** The value kept at `key`, or `null`. */
    read: (key: string) => string | null;
    write: (key: string, value: string) => void;
};

/**
 * A store over `storage`, which is a function because merely reading
 * `window.localStorage` throws where storage is blocked.
 */
export function createGameStore(storage: () => Storage): GameStore {
    // Values storage refused, so this page still sees what it wrote.
    const unsaved = new Map<string, string>();
    const listeners = new Set<() => void>();

    return {
        subscribe: (listener) => {
            listeners.add(listener);
            // Another tab of the same site wrote to storage.
            window.addEventListener("storage", listener);
            return () => {
                listeners.delete(listener);
                window.removeEventListener("storage", listener);
            };
        },
        read: (key) => {
            const held = unsaved.get(key);
            if (held != null) {
                return held;
            }
            try {
                return storage().getItem(key);
            } catch {
                return null;
            }
        },
        write: (key, value) => {
            try {
                storage().setItem(key, value);
                unsaved.delete(key);
            } catch {
                unsaved.set(key, value);
            }
            for (const listener of listeners) {
                listener();
            }
        },
    };
}

/** The page's store, over `localStorage`. */
export const gameStore = createGameStore(() => window.localStorage);
