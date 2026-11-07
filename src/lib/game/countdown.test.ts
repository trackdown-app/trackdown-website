import { describe, expect, it } from "vitest";
import {
    countdownClock,
    countdownDuration,
    secondsUntil,
} from "@/lib/game/countdown";
import { nextDate, puzzleDayStart } from "@/lib/game/puzzle-day";

/** The countdown at `now`, to the start of the day after `date`. */
function clockAt(date: string, now: string): string {
    const next = puzzleDayStart(nextDate(date)).getTime();
    return countdownClock(secondsUntil(next, Date.parse(now)));
}

describe("secondsUntil", () => {
    it("counts whole seconds, rounding a part second up", () => {
        expect(secondsUntil(10_000, 0)).toBe(10);
        expect(secondsUntil(10_000, 500)).toBe(10);
        expect(secondsUntil(10_000, 9_001)).toBe(1);
    });

    it("stops at zero", () => {
        expect(secondsUntil(10_000, 10_000)).toBe(0);
        expect(secondsUntil(10_000, 99_000)).toBe(0);
    });
});

describe("countdownClock", () => {
    it("shows hours, minutes and seconds, two figures each", () => {
        expect(countdownClock(13 * 3600 + 42 * 60 + 8)).toBe("13:42:08");
        expect(countdownClock(59)).toBe("00:00:59");
        expect(countdownClock(0)).toBe("00:00:00");
    });
});

describe("countdownDuration", () => {
    it("is an ISO 8601 duration", () => {
        expect(countdownDuration(13 * 3600 + 42 * 60 + 8)).toBe("PT13H42M8S");
        expect(countdownDuration(0)).toBe("PT0H0M0S");
    });
});

describe("the countdown to the next puzzle", () => {
    it("reaches zero at midnight in Amsterdam, not in UTC", () => {
        expect(clockAt("2026-11-06", "2026-11-06T22:59:59.000Z")).toBe("00:00:01");
        expect(clockAt("2026-11-06", "2026-11-06T23:00:00.000Z")).toBe("00:00:00");
    });

    it("counts 24 hours from one midnight in winter time", () => {
        expect(clockAt("2026-11-07", "2026-11-06T23:00:00.000Z")).toBe("24:00:00");
    });

    it("counts 25 hours on the day summer time ends", () => {
        // 25 October 2026: 03:00 summer time is 02:00 winter time.
        expect(clockAt("2026-10-25", "2026-10-24T22:00:00.000Z")).toBe("25:00:00");
        // 11:00 winter time, after the clocks went back: 13 hours left.
        expect(clockAt("2026-10-25", "2026-10-25T10:00:00.000Z")).toBe("13:00:00");
    });

    it("counts 23 hours on the day summer time starts", () => {
        // 29 March 2026: 02:00 winter time is 03:00 summer time.
        expect(clockAt("2026-03-29", "2026-03-28T23:00:00.000Z")).toBe("23:00:00");
        expect(clockAt("2026-03-29", "2026-03-29T10:00:00.000Z")).toBe("12:00:00");
    });
});
