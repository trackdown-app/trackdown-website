import { puzzleTimeZone } from "@/lib/game/rules";

// Which day's puzzle an instant belongs to, and when a puzzle's day starts.
// A day runs from midnight to midnight in `puzzleTimeZone`, so it is 23 or 25
// hours long when the clocks change (docs/api.md#todays-puzzle).

const wallClockFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: puzzleTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

type WallClock = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

/** What a clock in `puzzleTimeZone` shows at `at`, to the second. */
function wallClock(at: Date): WallClock {
    const clock: WallClock = {
        year: 0,
        month: 0,
        day: 0,
        hour: 0,
        minute: 0,
        second: 0,
    };
    for (const part of wallClockFormat.formatToParts(at)) {
        const value = Number(part.value);
        switch (part.type) {
            case "year":
            case "month":
            case "day":
            case "hour":
            case "minute":
            case "second":
                clock[part.type] = value;
                break;
            default:
                break;
        }
    }
    return clock;
}

/** How far `puzzleTimeZone` is ahead of UTC at `at`, in milliseconds. */
function offsetAt(at: number): number {
    const clock = wallClock(new Date(at));
    const asUtc = Date.UTC(
        clock.year,
        clock.month - 1,
        clock.day,
        clock.hour,
        clock.minute,
        clock.second,
    );
    // The wall clock drops the milliseconds, so compare it to `at` without them.
    return asUtc - Math.floor(at / 1000) * 1000;
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

/** The date, `YYYY-MM-DD`, whose puzzle is the one at `at`. */
export function puzzleDate(at: Date): string {
    const clock = wallClock(at);
    return `${clock.year}-${pad(clock.month)}-${pad(clock.day)}`;
}

/** The date after `date`, both `YYYY-MM-DD`. */
export function nextDate(date: string): string {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
}

/** The instant `date`'s puzzle starts: midnight in `puzzleTimeZone`. */
export function puzzleDayStart(date: string): Date {
    const midnightAsUtc = Date.parse(`${date}T00:00:00.000Z`);
    // The offset at UTC midnight is the offset at local midnight, unless the
    // clocks change in between; then the second try has the right one.
    let start = midnightAsUtc - offsetAt(midnightAsUtc);
    const offset = offsetAt(start);
    if (midnightAsUtc - start !== offset) {
        start = midnightAsUtc - offset;
    }
    return new Date(start);
}
