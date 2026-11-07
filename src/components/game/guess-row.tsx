import type { CSSProperties } from "react";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { TripLine } from "@/components/game/trip-line";
import { gridMinutes } from "@/lib/game/trip-line";
import type { ListedGuess } from "@/lib/game/trip-line";
import { spokenGuess, tripSummary } from "@/lib/game/trip-text";
import type { StationNames } from "@/lib/game/trip-text";

/**
 * The 30-minute grid behind a trip line on a track spanning `scaleMinutes`:
 * a 1px `grid` rule every half hour, counted from the mystery bar at the
 * right (a fifth of the track at 2 h 30).
 */
function gridBackground(scaleMinutes: number): CSSProperties {
    const step = `${(gridMinutes / scaleMinutes) * 100}%`;
    return {
        backgroundImage: `repeating-linear-gradient(to left, transparent 0, transparent calc(${step} - 1px), var(--td-grid) calc(${step} - 1px), var(--td-grid) ${step})`,
    };
}

type GuessRowProps = {
    guess: ListedGuess;
    /** Which guess it was, from 1. */
    number: number;
    names: StationNames;
    /** The minutes the board's track spans, the same for every row (`boardMinutes`). */
    scaleMinutes: number;
    /** A guess just made on this page: the row plays its arrival (docs/guess-list.md#a-new-guess). */
    entering?: boolean;
    /**
     * The finished game's list (Web · Solved): a tighter row without the time
     * grid, and the correct guess on one line with "You're here" at the right.
     */
    revealed?: boolean;
};

/**
 * One row of the guess list (docs/guess-list.md): the guess's number, its
 * station and a summary of the trip, then the trip line on the time grid. A
 * screen reader reads the row as one sentence instead.
 */
export function GuessRow({
    guess,
    number,
    names,
    scaleMinutes,
    entering = false,
    revealed = false,
}: GuessRowProps) {
    const name = names.get(guess.guess) ?? guess.guess;
    const spoken = (
        <span className="sr-only">{spokenGuess(guess, number, names)}</span>
    );
    const numberLabel = (
        <span className="w-3.5 flex-none text-[15px] font-semibold text-muted-foreground">
            {number}
        </span>
    );

    if (revealed && guess.correct) {
        return (
            <li
                data-trip-end
                className="flex min-h-20 items-center justify-between gap-4 border-b border-rule pr-10"
            >
                {spoken}
                <div aria-hidden="true" className="flex items-baseline gap-3">
                    {numberLabel}
                    <span className="font-condensed text-[30px] leading-none font-bold">
                        {name}
                    </span>
                </div>
                <span aria-hidden="true" className="text-[15px] font-semibold">
                    {m["guessList.found"]()}
                </span>
            </li>
        );
    }

    const summary = guess.correct
        ? m["guessList.found"]()
        : tripSummary(guess, names);

    return (
        <li
            className={cn(
                "flex flex-wrap gap-x-4 border-b border-rule",
                revealed ? "min-h-24" : "min-h-[104px]",
                entering && "guess-enter",
            )}
        >
            {spoken}
            <div
                aria-hidden="true"
                className={cn(
                    "flex max-w-[240px] flex-[1_1_240px] items-baseline gap-3",
                    revealed ? "py-3.5" : "py-4",
                )}
            >
                {numberLabel}
                <div className="min-w-0">
                    <div
                        className={cn(
                            "font-condensed leading-none font-bold",
                            revealed ? "text-[28px]" : "text-[30px]",
                        )}
                    >
                        {name}
                    </div>
                    <div className="mt-1.5 text-[15px] leading-[1.35] text-muted-foreground">
                        {summary}
                    </div>
                </div>
            </div>
            <div
                aria-hidden="true"
                data-trip-end
                className={cn(
                    "flex min-w-0 flex-[999_1_320px] items-center justify-end bg-clip-content bg-origin-content pr-3",
                    revealed ? "min-h-16" : "min-h-[72px]",
                )}
                style={revealed ? undefined : gridBackground(scaleMinutes)}
            >
                {!guess.correct && (
                    <TripLine guess={guess} scaleMinutes={scaleMinutes} />
                )}
            </div>
        </li>
    );
}
