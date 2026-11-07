// The time left until the next puzzle, as the footer's countdown shows it
// (docs/game.md#countdown). Holds no data, so it may be imported anywhere.

/** Whole seconds from `now` until `until`, both epoch milliseconds; never below 0. */
export function secondsUntil(until: number, now: number): number {
    return Math.max(0, Math.ceil((until - now) / 1000));
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

/**
 * `seconds` as a clock, `hh:mm:ss`. The hours do not wrap: the day the
 * clocks go back is 25 hours long, so just after its midnight this is
 * `24:59:59`.
 */
export function countdownClock(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
}

/** `seconds` as an ISO 8601 duration, for a `<time>`'s `dateTime`: `PT13H42M8S`. */
export function countdownDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `PT${hours}H${minutes}M${seconds % 60}S`;
}
