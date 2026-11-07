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

/** The trip's minutes that fill the whole track: 2 h 30, five grid columns. */
export const trackMinutes = 150;

/** The grid behind the line: one column per 30 minutes. */
export const gridMinutes = 30;

/** The shortest line, as a share of the track, so a short trip still shows. */
const minWidthPercent = 14;

/**
 * The narrowest track, at phone width: what the labels are sized for until
 * the page has measured the real one.
 */
export const narrowTrackPx = 340;
/** Half the guess dot, which covers the start of the first ride. */
const dotHalfPx = 11;
/** Half a change ring, which covers the end of one ride and the start of the next. */
const ringHalfPx = 15;
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
 * One change of the line: a ring where the next ride starts, empty when its
 * station is known.
 */
export type TripLineChange = {
    kind: "change";
    known: boolean;
    /** The ring's centre, in percent of the track from the right. */
    atPercent: number;
};

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
 * How `guess`'s trip is drawn on a track `trackPx` wide. Every minute takes
 * the same width, 150 minutes the whole track, so a ride is as wide as it is
 * long on every row, and the grid behind it reads true. The guess dot sits
 * at the trip's total time; each change ring sits where the next ride
 * starts, the change's own minutes drawn in the colour of the ride before
 * it. Only a trip shorter than 21 minutes (stretched to 14%, so it shows)
 * or longer than 2h 30 (squeezed into the track) leaves that scale.
 * `formatMinutes` writes a time the way the label shows it, such as
 * `2h 02m`.
 */
export function tripLineLayout(
    guess: Pick<ListedGuess, "steps" | "totalMinutes">,
    formatMinutes: (minutes: number) => string,
    trackPx: number = narrowTrackPx,
): TripLineLayout {
    const widthPercent = Math.max(
        minWidthPercent,
        Math.min(100, (guess.totalMinutes / trackMinutes) * 100),
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
            // The wait at the change runs on in the ride before it.
            if (previous?.kind === "ride") {
                previous.endPercent = endPercent;
                previous.insetEndPx = ringHalfPx;
            }
            parts.push({
                kind: "change",
                known: step.station != null,
                atPercent: endPercent,
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
            insetStartPx: previous == null ? dotHalfPx : ringHalfPx,
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
