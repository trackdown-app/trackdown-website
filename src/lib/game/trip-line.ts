import type { TrainType } from "@/lib/data/data-schema";
import type { GuessOutput } from "@/lib/game/schemas";

// How a guess's trip is drawn as a line (docs/guess-list.md#the-trip-line):
// where each ride, change and the guess dot sit on the track, the colour of
// each ride and which label fits inside it. Holds no data and no messages, so
// it runs in the browser and tests without a locale.

/**
 * One guess as the list shows it: the `guess` operation's answer, or a
 * `reveal` guess, whose changes are always named.
 */
export type ListedGuess = Pick<
    GuessOutput,
    "guess" | "correct" | "steps" | "totalMinutes"
>;

/**
 * The fewest minutes the track spans: 2 h 30, five grid columns. A board
 * with a longer trip spans more (`boardMinutes`).
 */
export const trackMinutes = 150;

/** The grid behind the line: one column per 30 minutes. */
export const gridMinutes = 30;

/** The shortest line, so a short trip's dot and a bit of line show beside the bar. */
const minLinePx = 48;

/** More columns than this, and only the whole hours are labelled, so labels never crowd at phone width. */
const maxLabelledColumns = 6;

/**
 * The grid's labelled rules on a track spanning `scaleMinutes`: every
 * half hour between the mystery bar and the track's far end, or only the
 * whole hours once the board has more than six columns. Each with its
 * minutes from the bar and its place, in percent of the track from the
 * right.
 */
export function gridMarks(
    scaleMinutes: number,
): { minutes: number; percent: number }[] {
    const columns = Math.round(scaleMinutes / gridMinutes);
    const step = columns > maxLabelledColumns ? 2 : 1;
    const marks: { minutes: number; percent: number }[] = [];
    for (let column = step; column < columns; column += step) {
        marks.push({
            minutes: column * gridMinutes,
            percent: (column / columns) * 100,
        });
    }
    return marks;
}

/**
 * The minutes the whole board's track spans: 2 h 30, or the longest trip
 * rounded up to the next half hour. Every row shares it, so the same
 * minutes take the same width on every row, however long the longest trip.
 */
export function boardMinutes(
    guesses: readonly Pick<ListedGuess, "totalMinutes">[],
): number {
    const longest = guesses.reduce(
        (most, guess) => Math.max(most, guess.totalMinutes),
        0,
    );
    return Math.max(trackMinutes, Math.ceil(longest / gridMinutes) * gridMinutes);
}

/**
 * The narrowest track, at phone width: what the labels are sized for until
 * the page has measured the real one.
 */
export const narrowTrackPx = 340;
/** Half the guess dot, which covers the start of the first ride. */
const dotHalfPx = 11;
/** A change's ring at its smallest, for a short wait. */
export const changeMinPx = 30;
/** How far a change's pill reaches over each ride beside it, at the least. */
export const changeOverlapPx = 3;
/** Half the mystery bar, which covers the end of the last ride. */
const barHalfPx = 13;
/** A label's width: Barlow bold at 13px, about 7.2px a character, plus padding. */
const labelCharPx = 7.2;
const labelPaddingPx = 10;

/**
 * One ride of the line. Its place is in percent of the track, counted from
 * the right, where the mystery bar is: it runs from `startPercent` (further
 * from the bar) to `endPercent`.
 */
export type TripLineRide = {
    kind: "ride";
    train: TrainType;
    minutes: number;
    /** Which line colour: 1 for the first train, 2 after one change, … */
    line: 1 | 2 | 3;
    startPercent: number;
    endPercent: number;
    /** How far the dot or ring at its start covers it, in px. */
    insetStartPx: number;
    /** How far the ring or mystery bar at its end covers it, in px. */
    insetEndPx: number;
    /** What fits inside: train and time, the time alone, or nothing. */
    label: string | null;
};

/**
 * One change of the line: the station, drawn as a pill as long as the wait
 * between the two rides, a 30px ring for a short one, as a metro map draws
 * an interchange. Empty when its station is known.
 */
export type TripLineChange = {
    kind: "change";
    known: boolean;
    /** The wait's middle, the pill's centre, in percent of the track from the right. */
    atPercent: number;
    /** The wait's length, in percent of the track. */
    spanPercent: number;
};

/** How far a change's pill covers each ride beside it, for a wait `waitPx` long. */
function changeInsetPx(waitPx: number): number {
    return Math.max(changeOverlapPx, (changeMinPx - waitPx) / 2);
}

export type TripLineLayout = {
    /** The line's width, and the guess dot's centre, in percent of the track from the right. */
    widthPercent: number;
    parts: (TripLineRide | TripLineChange)[];
};

const lines = [1, 2, 3] as const;

function labelPx(text: string): number {
    return text.length * labelCharPx + labelPaddingPx;
}

/** The run of a new guess's train: a short trip's, then this much more per percent of track. */
const runBaseMs = 300;
const runPerPercentMs = 7;

/**
 * How long a new guess's train takes from the guess dot to the mystery bar
 * (docs/guess-list.md#a-new-guess): longer the longer the line, from about
 * 0.4 s for the shortest to 1 s across the whole track.
 */
export function tripRunMs(widthPercent: number): number {
    return Math.round(runBaseMs + runPerPercentMs * widthPercent);
}

/**
 * When, into its run, the train reaches the point `atPercent` from the right
 * on a line `widthPercent` wide. The run eases in and out like an
 * ease-in-out sine (CSS `cubic-bezier(0.37, 0, 0.63, 1)`), so this is that
 * curve's inverse: the share of the way covered gives the share of the time.
 */
export function trainReachesMs(widthPercent: number, atPercent: number): number {
    const covered =
        widthPercent > 0
            ? Math.min(1, Math.max(0, (widthPercent - atPercent) / widthPercent))
            : 1;
    return Math.round(
        (tripRunMs(widthPercent) * Math.acos(1 - 2 * covered)) / Math.PI,
    );
}

/**
 * How `guess`'s trip is drawn on a track `trackPx` wide that spans
 * `scaleMinutes` (the board's, `boardMinutes`). Every minute takes the same
 * width, so a ride is as wide as it is long on every row, and the grid
 * behind it reads true. The guess dot sits at the trip's total time; each
 * change is a pill over its own minutes, the wait, so a ride is only ever
 * its own minutes long, whatever the wait after it. Only a line shorter than 48px
 * is stretched to that, so its dot shows beside the mystery bar.
 * `formatMinutes` writes a time the way the label shows it, such as
 * `2h 02m`.
 */
export function tripLineLayout(
    guess: Pick<ListedGuess, "steps" | "totalMinutes">,
    formatMinutes: (minutes: number) => string,
    trackPx: number = narrowTrackPx,
    scaleMinutes: number = trackMinutes,
): TripLineLayout {
    const widthPercent = Math.min(
        100,
        Math.max(
            (minLinePx / trackPx) * 100,
            (guess.totalMinutes / scaleMinutes) * 100,
        ),
    );
    function percentOf(minutes: number): number {
        return guess.totalMinutes > 0
            ? (minutes / guess.totalMinutes) * widthPercent
            : 0;
    }

    // Minutes still to go to the mystery station, from the guess.
    let remaining = guess.totalMinutes;
    let rideIndex = 0;
    const parts: (TripLineRide | TripLineChange)[] = [];
    for (const step of guess.steps) {
        const startPercent = percentOf(remaining);
        remaining -= step.minutes;
        const endPercent = percentOf(remaining);
        const previous = parts.at(-1);

        if (step.kind === "change") {
            const spanPercent = startPercent - endPercent;
            // The pill reaches over the end of the ride before it.
            if (previous?.kind === "ride") {
                previous.insetEndPx = changeInsetPx((spanPercent / 100) * trackPx);
            }
            parts.push({
                kind: "change",
                known: step.station != null,
                atPercent: (startPercent + endPercent) / 2,
                spanPercent,
            });
            continue;
        }

        parts.push({
            kind: "ride",
            train: step.train,
            minutes: step.minutes,
            line: lines[rideIndex % lines.length] ?? 1,
            startPercent,
            endPercent,
            insetStartPx:
                previous?.kind === "change"
                    ? changeInsetPx((previous.spanPercent / 100) * trackPx)
                    : dotHalfPx,
            insetEndPx: barHalfPx,
            label: null,
        });
        rideIndex += 1;
    }

    for (const part of parts) {
        if (part.kind === "ride") {
            const roomPx =
                ((part.startPercent - part.endPercent) / 100) * trackPx -
                part.insetStartPx -
                part.insetEndPx;
            const time = formatMinutes(part.minutes);
            const full = `${part.train} ${time}`;
            part.label =
                labelPx(full) <= roomPx
                    ? full
                    : labelPx(time) <= roomPx
                      ? time
                      : null;
        }
    }

    return { widthPercent, parts };
}
