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
const changeMinPx = 30;
/** How far a change's pill reaches over each ride beside it, at the least. */
const changeOverlapPx = 3;
/** Half the mystery bar, which covers the end of the last ride. */
const barHalfPx = 13;
/**
 * The least of a ride that shows between two changes, or between a change
 * and the dot or the bar, so short rides never vanish under the rings.
 */
const minRideShowPx = 6;
/** A label's width: Barlow bold at 13px, about 7.2px a character, plus padding. */
const labelCharPx = 7.2;
const labelPaddingPx = 10;

/**
 * One ride of the line. Its place is in percent of the track, counted from
 * the right, where the mystery bar is: its minutes run from `startPercent`
 * (further from the bar) to `endPercent`.
 */
export type TripLineRide = {
    kind: "ride";
    train: TrainType;
    minutes: number;
    /** Which line colour: 1 for the first train, 2 after one change, … */
    line: 1 | 2 | 3;
    startPercent: number;
    endPercent: number;
    /**
     * Where its bar is drawn: on to the centre of a change beside it, so the
     * change's pill covers the join whatever the curve of its ends. Its
     * minutes elsewhere.
     */
    drawStartPercent: number;
    drawEndPercent: number;
    /** How far the dot or pill at its start covers the bar, in px. */
    insetStartPx: number;
    /** How far the pill or mystery bar at its end covers the bar, in px. */
    insetEndPx: number;
    /** What fits inside: train and time, the time alone, or nothing. */
    label: string | null;
};

/**
 * One change of the line: the station, drawn as a pill as long as the wait
 * between the two rides, a 30px ring for a short one, as a metro map draws
 * an interchange. Empty when its station is known.
 *
 * The pill is anchored where the next ride leaves, its right end 3px over
 * that ride, so every ride to the mystery bar shows its own minutes less
 * those 3px whatever the wait before it, and the changes before the same
 * last ride line up from row to row. A ring wider than its wait grows back
 * over the ride before.
 */
export type TripLineChange = {
    kind: "change";
    known: boolean;
    /** The pill's centre, in percent of the track from the right. */
    atPercent: number;
    /** The pill's width, in px: the wait and 3px over each ride, 30px at the least. */
    widthPx: number;
    /** The wait's length, in percent of the track. */
    spanPercent: number;
};

export type TripLineLayout = {
    /** The line's width, and the guess dot's centre, in percent of the track from the right. */
    widthPercent: number;
    parts: (TripLineRide | TripLineChange)[];
};

const lines = [1, 2, 3] as const;

/** The line colour of a trip's ride by its place, from 0: the three in turn. */
export function rideLine(rideIndex: number): TripLineRide["line"] {
    return lines[rideIndex % lines.length] ?? 1;
}

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
    // The line's width by its minutes, before the changes are kept apart.
    const scaledPercent = Math.min(
        100,
        Math.max(
            (minLinePx / trackPx) * 100,
            (guess.totalMinutes / scaleMinutes) * 100,
        ),
    );
    function percentOf(minutes: number): number {
        return guess.totalMinutes > 0
            ? (minutes / guess.totalMinutes) * scaledPercent
            : 0;
    }

    function pxOf(percent: number): number {
        return (percent / 100) * trackPx;
    }
    function percentOfPx(px: number): number {
        return (px / trackPx) * 100;
    }

    // Minutes still to go to the mystery station, from the guess.
    let remaining = guess.totalMinutes;
    let rideIndex = 0;
    const parts: (TripLineRide | TripLineChange)[] = [];
    for (const step of guess.steps) {
        const startPercent = percentOf(remaining);
        remaining -= step.minutes;
        const endPercent = percentOf(remaining);

        if (step.kind === "change") {
            const spanPercent = startPercent - endPercent;
            const widthPx = Math.max(
                changeMinPx,
                pxOf(spanPercent) + 2 * changeOverlapPx,
            );
            parts.push({
                kind: "change",
                known: step.station != null,
                // Its right end 3px over the next ride, its centre half its
                // width back from there.
                atPercent: endPercent + percentOfPx(widthPx / 2 - changeOverlapPx),
                widthPx,
                spanPercent,
            });
            continue;
        }

        parts.push({
            kind: "ride",
            train: step.train,
            minutes: step.minutes,
            line: rideLine(rideIndex),
            startPercent,
            endPercent,
            drawStartPercent: startPercent,
            drawEndPercent: endPercent,
            insetStartPx: dotHalfPx,
            insetEndPx: barHalfPx,
            label: null,
        });
        rideIndex += 1;
    }

    // Keep every change clear of the mystery bar and of the change after it,
    // so a short ride between two changes still shows a bit of its colour
    // and no ring hides another. Worked from the bar outwards: a change that
    // would overlap moves away from the bar, and the guess dot moves past the
    // farthest change. Only these short rides leave the scale.
    let clearPx = barHalfPx + minRideShowPx;
    for (const part of [...parts].reverse()) {
        if (part.kind !== "change") {
            continue;
        }
        const halfPx = part.widthPx / 2;
        const atPx = Math.max(pxOf(part.atPercent), clearPx + halfPx);
        part.atPercent = percentOfPx(atPx);
        clearPx = atPx + halfPx + minRideShowPx;
    }
    const widthPercent = Math.min(
        100,
        Math.max(scaledPercent, percentOfPx(clearPx + dotHalfPx)),
    );

    // Each ride runs from the dot, or from under the pill of the change
    // before it, to its centre, on to under the pill of the change after
    // it, so the pills' rounded ends always cover the joins.
    for (const [index, part] of parts.entries()) {
        if (part.kind !== "ride") {
            continue;
        }
        const before = parts[index - 1];
        const after = parts[index + 1];
        if (before?.kind === "change") {
            part.drawStartPercent = before.atPercent;
            part.insetStartPx = before.widthPx / 2;
        } else {
            part.drawStartPercent = widthPercent;
        }
        if (after?.kind === "change") {
            part.drawEndPercent = after.atPercent;
            part.insetEndPx = after.widthPx / 2;
        }
    }

    for (const part of parts) {
        if (part.kind === "ride") {
            const roomPx =
                ((part.drawStartPercent - part.drawEndPercent) / 100) * trackPx -
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
