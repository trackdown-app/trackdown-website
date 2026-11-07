import { useMemo } from "react";
import type { ReactNode } from "react";
import { m } from "@/paraglide/messages";
import { GuessRow } from "@/components/game/guess-row";
import type { GuessableStation } from "@/lib/game/schemas";
import { boardMinutes, gridMarks } from "@/lib/game/trip-line";
import type { ListedGuess } from "@/lib/game/trip-line";

/** A grid rule's label: "30 min", "1 h", "1 h 30", "2 h", … */
function gridLabel(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    if (hours === 0) {
        return m["guessList.grid30"]();
    }
    return minutes % 60 === 0
        ? m["guessList.gridHours"]({ hours })
        : m["guessList.gridHoursHalf"]({ hours });
}

type GuessListProps = {
    /** The guesses so far, oldest first, as the `guess` operation answered them. */
    guesses: readonly ListedGuess[];
    /** The network's stations, to name the guesses and the known changes. */
    stations: readonly Pick<GuessableStation, "code" | "name">[];
    /** What the header row shows at the left, opposite "Mystery station": the game's progress. */
    progress?: ReactNode;
    /**
     * The station code of a guess just made on this page, whose row plays
     * its arrival (docs/guess-list.md#a-new-guess). Kept guesses a reload
     * shows do not move.
     */
    enteringGuess?: string | undefined;
};

/**
 * The guesses with their trip lines, from the design's Web · Playing board
 * (docs/guess-list.md): newest first, each line running from the guess to
 * the mystery bar at the right, over a 30-minute time grid. Renders nothing
 * before the first guess.
 */
export function GuessList({
    guesses,
    stations,
    progress,
    enteringGuess,
}: GuessListProps) {
    const names = useMemo(
        () => new Map(stations.map((station) => [station.code, station.name])),
        [stations],
    );

    if (guesses.length === 0) {
        return null;
    }

    const rows = guesses
        .map((guess, index) => ({ guess, number: index + 1 }))
        .reverse();
    // One scale for every row: the same minutes, the same width.
    const scaleMinutes = boardMinutes(guesses);

    return (
        <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2.5">
                {progress}
                <div className="ml-auto flex items-center gap-2.5">
                    <span className="text-[15px] font-semibold">
                        {m["guessList.mysteryStation"]()}
                    </span>
                    <span
                        aria-hidden="true"
                        className="flex size-6 items-center justify-center rounded-full bg-ink text-[15px] font-extrabold text-background"
                    >
                        ?
                    </span>
                </div>
            </div>
            <div className="relative">
                <ol
                    aria-label={m["guessList.label"]()}
                    className="border-t border-rule"
                >
                    {rows.map(({ guess, number }) => (
                        <GuessRow
                            key={guess.guess}
                            guess={guess}
                            number={number}
                            names={names}
                            scaleMinutes={scaleMinutes}
                            entering={guess.guess === enteringGuess}
                        />
                    ))}
                </ol>
                <span
                    aria-hidden="true"
                    className="absolute top-[33px] right-0 bottom-[33px] z-2 w-[26px] rounded-[13px] border-4 border-ink bg-surface"
                />
            </div>
            <div aria-hidden="true" className="flex flex-wrap gap-x-4">
                <div className="max-w-[240px] flex-[1_1_240px]" />
                <div className="relative mr-3 h-7 min-w-0 flex-[999_1_320px]">
                    {gridMarks(scaleMinutes).map((mark) => (
                        <span
                            key={mark.minutes}
                            className="absolute top-2 translate-x-1/2 text-[13px] text-muted-foreground transition-[right] duration-500 motion-reduce:transition-none"
                            style={{ right: `${mark.percent}%` }}
                        >
                            {gridLabel(mark.minutes)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
