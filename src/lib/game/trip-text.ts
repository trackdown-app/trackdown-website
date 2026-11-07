import { m } from "@/paraglide/messages";
import type { TrainType } from "@/lib/data/data-schema";
import type { ListedGuess } from "@/lib/game/trip-line";

// A guess's trip in words, in the page's locale (docs/guess-list.md#text):
// the short times and summary the list shows, and the sentence a screen
// reader reads instead of the line.

/** Names a station by its code; a code it does not know stays as it is. */
export type StationNames = ReadonlyMap<string, string>;

function nameOf(code: string, names: StationNames): string {
    return names.get(code) ?? code;
}

/** A train type's name in words, for a player who does not know the code: `SPR` is "Sprinter". */
export function trainName(train: TrainType): string {
    switch (train) {
        case "IC":
            return m["trains.IC"]();
        case "ICD":
            return m["trains.ICD"]();
        case "SPR":
            return m["trains.SPR"]();
        case "ST":
            return m["trains.ST"]();
        case "SNT":
            return m["trains.SNT"]();
        case "ICE":
            return m["trains.ICE"]();
        case "EC":
            return m["trains.EC"]();
    }
}

/** A time as the list shows it: `2h 05m`, or `17m` under an hour. */
export function formatMinutes(minutes: number): string {
    if (minutes < 60) {
        return m["trip.minutes"]({ minutes: String(minutes) });
    }
    return m["trip.hoursMinutes"]({
        hours: String(Math.floor(minutes / 60)),
        minutes: String(minutes % 60).padStart(2, "0"),
    });
}

/**
 * A time as a screen reader reads it, units in words: `2 hours 5 minutes`.
 * `25m` would be read as metres.
 */
export function spokenMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const restText =
        rest === 1
            ? m["trip.spokenMinute"]()
            : m["trip.spokenMinutes"]({ minutes: String(rest) });
    if (hours === 0) {
        return restText;
    }
    const hoursText =
        hours === 1
            ? m["trip.spokenHour"]()
            : m["trip.spokenHours"]({ hours: String(hours) });
    if (rest === 0) {
        return hoursText;
    }
    return m["trip.spokenHoursMinutes"]({
        hours: hoursText,
        minutes: restText,
    });
}

/** How the trip changes trains: direct, at one station, or how many times. */
function changesText(guess: ListedGuess, names: StationNames): string {
    const changes = guess.steps.filter((step) => step.kind === "change");
    const [only] = changes;
    if (only == null) {
        return m["trip.direct"]();
    }
    if (changes.length > 1) {
        return m["trip.changes"]({ count: String(changes.length) });
    }
    return only.station == null
        ? m["trip.changeHidden"]()
        : m["trip.changeAt"]({ station: nameOf(only.station, names) });
}

/** The row's summary: `2h 25m, change at Utrecht Centraal`. */
export function tripSummary(guess: ListedGuess, names: StationNames): string {
    return m["trip.summary"]({
        duration: formatMinutes(guess.totalMinutes),
        changes: changesText(guess, names),
    });
}

/**
 * The whole row as one sentence, for a screen reader: which guess, the
 * station, and the trip ride by ride and change by change.
 */
export function spokenGuess(
    guess: ListedGuess,
    number: number,
    names: StationNames,
): string {
    const station = nameOf(guess.guess, names);
    if (guess.correct) {
        return m["guessList.spokenFound"]({ number: String(number), station });
    }
    const steps = guess.steps
        .map((step) => {
            if (step.kind === "ride") {
                return m["trip.spokenRide"]({
                    train: step.train,
                    duration: spokenMinutes(step.minutes),
                });
            }
            const duration = spokenMinutes(step.minutes);
            return step.station == null
                ? m["trip.spokenChangeHidden"]({ duration })
                : m["trip.spokenChangeAt"]({
                      station: nameOf(step.station, names),
                      duration,
                  });
        })
        .join(", ");
    return m["guessList.spokenGuess"]({
        number: String(number),
        station,
        duration: spokenMinutes(guess.totalMinutes),
        steps,
    });
}
