import type { TrainType } from "@/lib/data/data-schema";
import type { GuessOutput } from "@/lib/game/schemas";

// How a guess's trip is drawn as a line (docs/guess-list.md#the-trip-line):
// its width, the colour of each ride and which label fits inside it. Holds no
// data and no messages, so it runs in the browser and tests without a locale.

/**
 * One guess as the list shows it: the `guess` operation's answer, or a
 * `reveal` guess, whose changes are always named.
 */
export type ListedGuess = Pick<
    GuessOutput,
    "guess" | "correct" | "steps" | "totalMinutes"
>;

/** The trip's minutes that fill the whole track: 2 h 30, five grid columns. */
export const trackMinutes = 150;

/** The grid behind the line: one column per 30 minutes. */
export const gridMinutes = 30;

/** The shortest line, as a share of the track, so a short trip still shows. */
const minWidthPercent = 14;

/**
 * Labels are sized for the narrowest track, at phone width, so they never
 * spill out of their ride at any width.
 */
const narrowTrackPx = 340;
/** The guess dot, less the 4px a ride runs under it. */
const dotPx = 18;
/** A change ring, less the 3px each side a ride runs under it. */
const changePx = 24;
/** The last ride runs this far under the mystery bar. */
const underBarPx = 13;
/** A label's width: Barlow bold at 13px, about 7.2px a character, plus padding. */
const labelCharPx = 7.2;
const labelPaddingPx = 10;

/** One ride of the line: its train, minutes, colour and label. */
export type TripLineRide = {
    kind: "ride";
    train: TrainType;
    minutes: number;
    /** Which line colour: 1 for the first train, 2 after one change, … */
    line: 1 | 2 | 3;
    /** What fits inside: train and time, the time alone, or nothing. */
    label: string | null;
    /** The last ride, which runs under the mystery bar. */
    last: boolean;
};

/** One change of the line: a ring, empty when its station is known. */
export type TripLineChange = { kind: "change"; known: boolean };

export type TripLineLayout = {
    /** The line's width, as a share of the track, from the mystery bar. */
    widthPercent: number;
    parts: (TripLineRide | TripLineChange)[];
};

const lines = [1, 2, 3] as const;

function labelPx(text: string): number {
    return text.length * labelCharPx + labelPaddingPx;
}

/**
 * How `guess`'s trip is drawn: the line's width by its total time, each ride
 * as wide as its share of the ride time, and the longest label that fits each
 * ride at phone width. `formatMinutes` writes a time the way the label shows
 * it, such as `2h 02m`.
 */
export function tripLineLayout(
    guess: Pick<ListedGuess, "steps" | "totalMinutes">,
    formatMinutes: (minutes: number) => string,
): TripLineLayout {
    const widthPercent = Math.max(
        minWidthPercent,
        Math.min(100, (guess.totalMinutes / trackMinutes) * 100),
    );
    const rideMinutes = guess.steps.reduce(
        (total, step) => total + (step.kind === "ride" ? step.minutes : 0),
        0,
    );
    const changes = guess.steps.filter((step) => step.kind === "change");
    const ridesPx =
        (widthPercent / 100) * narrowTrackPx - dotPx - changes.length * changePx;
    const lastRide = guess.steps.reduce(
        (last, step, index) => (step.kind === "ride" ? index : last),
        -1,
    );

    let rideIndex = 0;
    const parts = guess.steps.map((step, index): TripLineRide | TripLineChange => {
        if (step.kind === "change") {
            return { kind: "change", known: step.station != null };
        }
        const line = lines[rideIndex % lines.length] ?? 1;
        rideIndex += 1;
        const last = index === lastRide;
        const roomPx =
            rideMinutes > 0
                ? (ridesPx * step.minutes) / rideMinutes - (last ? underBarPx : 0)
                : 0;
        const time = formatMinutes(step.minutes);
        const full = `${step.train} ${time}`;
        const label =
            labelPx(full) <= roomPx ? full : labelPx(time) <= roomPx ? time : null;
        return {
            kind: "ride",
            train: step.train,
            minutes: step.minutes,
            line,
            label,
            last,
        };
    });

    return { widthPercent, parts };
}
