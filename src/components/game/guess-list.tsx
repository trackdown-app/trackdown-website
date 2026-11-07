import { useMemo } from "react";
import type { ReactNode } from "react";
import { m } from "@/paraglide/messages";
import { GuessRow } from "@/components/game/guess-row";
import type { GuessableStation } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";

type GuessListProps = {
    /** The guesses so far, oldest first, as the `guess` operation answered them. */
    guesses: readonly ListedGuess[];
    /** The network's stations, to name the guesses and the known changes. */
    stations: readonly Pick<GuessableStation, "code" | "name">[];
    /** What the header row shows at the left, opposite "Mystery station": the game's progress. */
    progress?: ReactNode;
};

/**
 * The guesses with their trip lines, from the design's Web · Playing board
 * (docs/guess-list.md): newest first, each line running from the guess to
 * the mystery bar at the right, over a 30-minute time grid. Renders nothing
 * before the first guess.
 */
export function GuessList({ guesses, stations, progress }: GuessListProps) {
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
    // Static message calls, one per grid line, so only these reach the bundle.
    const gridLabels = [
        { className: "right-[20%]", text: m["guessList.grid30"]() },
        { className: "right-[40%]", text: m["guessList.grid60"]() },
        { className: "right-[60%]", text: m["guessList.grid90"]() },
        { className: "right-[80%]", text: m["guessList.grid120"]() },
    ];

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
                    {gridLabels.map((label) => (
                        <span
                            key={label.className}
                            className={`absolute top-2 translate-x-1/2 text-[13px] text-muted-foreground ${label.className}`}
                        >
                            {label.text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
