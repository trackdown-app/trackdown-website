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

/**
 * A change's station by name, or "Station abroad" for a code outside the
 * network's stations: a trip may change trains abroad (Luxembourg on a
 * Belgian trip), at a station no player can guess (docs/data.md#files).
 */
export function changeStationName(code: string, names: StationNames): string {
    return names.get(code) ?? m["tripDetails.stationAbroad"]();
}

/**
 * Each ride label's message: a train type in `nl` and `be`, a train operator
 * in `gb`, an Underground line in `lu`, a metro or tram line in `ret`.
 * A `Record`, so a label added to `trainTypeSchema` fails the typecheck
 * until it has a name.
 */
const trainNames: Record<TrainType, () => string> = {
    IC: m["trains.IC"],
    ICD: m["trains.ICD"],
    SPR: m["trains.SPR"],
    ST: m["trains.ST"],
    SNT: m["trains.SNT"],
    ICE: m["trains.ICE"],
    EC: m["trains.EC"],
    L: m["trains.L"],
    S: m["trains.S"],
    P: m["trains.P"],
    AW: m["trains.AW"],
    CC: m["trains.CC"],
    CH: m["trains.CH"],
    EM: m["trains.EM"],
    GC: m["trains.GC"],
    GN: m["trains.GN"],
    GR: m["trains.GR"],
    GW: m["trains.GW"],
    GX: m["trains.GX"],
    HT: m["trains.HT"],
    HX: m["trains.HX"],
    IL: m["trains.IL"],
    LD: m["trains.LD"],
    LE: m["trains.LE"],
    LF: m["trains.LF"],
    LM: m["trains.LM"],
    LO: m["trains.LO"],
    ME: m["trains.ME"],
    NT: m["trains.NT"],
    SE: m["trains.SE"],
    SN: m["trains.SN"],
    SR: m["trains.SR"],
    SW: m["trains.SW"],
    TL: m["trains.TL"],
    TP: m["trains.TP"],
    VT: m["trains.VT"],
    XC: m["trains.XC"],
    XR: m["trains.XR"],
    BAK: m["trains.BAK"],
    CEN: m["trains.CEN"],
    CIR: m["trains.CIR"],
    DIS: m["trains.DIS"],
    HAM: m["trains.HAM"],
    JUB: m["trains.JUB"],
    MET: m["trains.MET"],
    NTN: m["trains.NTN"],
    PIC: m["trains.PIC"],
    VIC: m["trains.VIC"],
    WAC: m["trains.WAC"],
    A: m["trains.A"],
    B: m["trains.B"],
    C: m["trains.C"],
    D: m["trains.D"],
    E: m["trains.E"],
    "1": m["trains.1"],
    "2": m["trains.2"],
    "3": m["trains.3"],
    "4": m["trains.4"],
    "5": m["trains.5"],
    "6": m["trains.6"],
    "7": m["trains.7"],
    "8": m["trains.8"],
    "11": m["trains.11"],
};

/**
 * A ride label in words, for a player who does not know the code: `SPR` is
 * "Sprinter", `GR` is "LNER", `NTN` is "Northern line", `4` is "Tram 4".
 */
export function trainName(train: TrainType): string {
    return trainNames[train]();
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
    if (only.station == null) {
        return m["trip.changeUnknown"]();
    }
    const station = names.get(only.station);
    return station == null
        ? m["trip.changeAbroad"]()
        : m["trip.changeAt"]({ station });
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
            if (step.station == null) {
                return m["trip.spokenChangeUnknown"]({ duration });
            }
            const changeStation = names.get(step.station);
            return changeStation == null
                ? m["trip.spokenChangeAbroad"]({ duration })
                : m["trip.spokenChangeAt"]({ station: changeStation, duration });
        })
        .join(", ");
    return m["guessList.spokenGuess"]({
        number: String(number),
        station,
        duration: spokenMinutes(guess.totalMinutes),
        steps,
    });
}
