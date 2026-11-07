import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { shellContainer } from "@/components/layout/shell-container";
import { ArchivePuzzleRow } from "@/components/archive/archive-puzzle-row";
import type { NetworkId } from "@/lib/data/networks";
import { gameStore } from "@/lib/game/game-store";
import type { GameStore } from "@/lib/game/game-store";
import type { ArchivedPuzzle } from "@/lib/game/schemas";

type ArchivePageProps = {
    network: NetworkId;
    /** Every puzzle up to today's, oldest first: the `puzzleArchive` operation's answer. */
    puzzles: readonly ArchivedPuzzle[];
    /** Today's date, `YYYY-MM-DD`, in Europe/Amsterdam. */
    today: string;
    /** Where games are kept; the page's `localStorage` store unless a test hands its own. */
    store?: GameStore;
};

/**
 * The archive (docs/archive.md): every puzzle so far, newest first, each with
 * the player's result on this device and a link that plays it. The design
 * draws no archive board, so the page takes How to play's title block and
 * the guess list's hairlines.
 */
export function ArchivePage({
    network,
    puzzles,
    today,
    store = gameStore,
}: ArchivePageProps) {
    const newestFirst = [...puzzles].reverse();

    return (
        <main className={cn(shellContainer, "flex flex-col pt-10 pb-16")}>
            <h1 className="font-condensed text-[clamp(44px,7vw,72px)] leading-[0.95] font-extrabold tracking-[-0.01em]">
                {m["archive.title"]()}
            </h1>
            <p className="mt-5 max-w-[36em] text-[19px] leading-normal text-muted-foreground">
                {m["archive.lead"]()}
            </p>
            {newestFirst.length > 0 ? (
                <ol
                    aria-label={m["archive.label"]()}
                    className="mt-10 max-w-[720px] border-t border-rule"
                >
                    {newestFirst.map((puzzle) => (
                        <ArchivePuzzleRow
                            key={puzzle.number}
                            network={network}
                            puzzle={puzzle}
                            isToday={puzzle.date === today}
                            store={store}
                        />
                    ))}
                </ol>
            ) : (
                <p className="mt-10 text-base">{m["archive.empty"]()}</p>
            )}
        </main>
    );
}
