import { Link } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore } from "react";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import type { NetworkId } from "@/lib/data/networks";
import { archiveResult } from "@/lib/game/archive-result";
import { gameStorageKey, parseStoredGame } from "@/lib/game/game-state";
import type { GameStore } from "@/lib/game/game-store";
import { puzzleDateLabel } from "@/lib/game/puzzle-date-label";
import { maxGuesses } from "@/lib/game/rules";
import type { ArchivedPuzzle } from "@/lib/game/schemas";

type ArchivePuzzleRowProps = {
    network: NetworkId;
    puzzle: ArchivedPuzzle;
    /** Today's puzzle: links to the home page, where it counts for the streak. */
    isToday: boolean;
    store: GameStore;
};

const rowClasses =
    "flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3.5 text-foreground no-underline hover:bg-soft sm:px-3";

/**
 * One puzzle of the archive (docs/archive.md#the-list): its number and day,
 * and how the player did at it on this device, the whole row a link to the
 * puzzle. The server render has no storage, so it says "Not played yet";
 * the browser reads the kept game as it hydrates.
 */
export function ArchivePuzzleRow({
    network,
    puzzle,
    isToday,
    store,
}: ArchivePuzzleRowProps) {
    const key = gameStorageKey(network, puzzle.number);
    const raw = useSyncExternalStore(
        store.subscribe,
        () => store.read(key),
        () => null,
    );
    const result = useMemo(
        () => archiveResult(parseStoredGame(raw), maxGuesses),
        [raw],
    );

    const content = (
        <>
            <span className="flex flex-col">
                <span className="font-condensed text-2xl leading-tight font-bold">
                    {m["archive.puzzle"]({ number: puzzle.number })}
                    {isToday && (
                        <span className="ml-2.5 align-middle font-sans text-sm font-semibold uppercase">
                            {m["archive.today"]()}
                        </span>
                    )}
                </span>
                <span className="text-base text-muted-foreground">
                    {puzzleDateLabel(puzzle.date, getLocale())}
                </span>
            </span>
            <span className="text-base font-medium">{result}</span>
        </>
    );

    return (
        <li className="border-b border-rule">
            {isToday ? (
                <Link to="/" className={rowClasses}>
                    {content}
                </Link>
            ) : (
                <Link
                    to="/archief/$number"
                    params={{ number: String(puzzle.number) }}
                    className={rowClasses}
                >
                    {content}
                </Link>
            )}
        </li>
    );
}
