import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { createGameData } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";
import { nextDate } from "@/lib/game/puzzle-day";
import { todayPuzzleInputSchema, todayPuzzleOutputSchema } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";
import { getTodayPuzzle } from "@/lib/game/today-puzzle";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");
const readFixture = readDataDir(fixtureDir);

const stationCodes = ["chr", "ech", "alf", "dlt", "brv"];

/**
 * The fixture's schedule, carried on for 400 days from its puzzle 1 on
 * 18 June 2026, so the tests can reach 6 November 2026 and both clock changes.
 */
function longSchedule() {
    const puzzles = [];
    let date = "2026-06-18";
    for (let n = 1; n <= 400; n++) {
        puzzles.push({ n, date, station: stationCodes[(n - 1) % 5] });
        date = nextDate(date);
    }
    return puzzles;
}

const data = createGameData((path) =>
    path === "nl/puzzles.json" ? Promise.resolve(longSchedule()) : readFixture(path),
);

function at(instant: string): ServiceContext {
    return { data, dataRef: "abc123", now: () => new Date(instant) };
}

describe("getTodayPuzzle", () => {
    it("answers puzzle 142 on 6 November 2026", async () => {
        const puzzle = await getTodayPuzzle(
            { network: "nl" },
            at("2026-11-06T12:00:00.000Z"),
        );

        expect(puzzle).toEqual({
            network: "nl",
            number: 142,
            date: "2026-11-06",
            maxGuesses: 6,
            nextPuzzleAt: "2026-11-06T23:00:00.000Z",
        });
    });

    it("switches at midnight in Amsterdam, not in UTC", async () => {
        const before = await getTodayPuzzle(
            { network: "nl" },
            at("2026-11-06T22:59:59.999Z"),
        );
        const after = await getTodayPuzzle(
            { network: "nl" },
            at("2026-11-06T23:00:00.000Z"),
        );

        expect(before.number).toBe(142);
        expect(after).toMatchObject({ number: 143, date: "2026-11-07" });
    });

    it("switches at midnight summer time in summer", async () => {
        const before = await getTodayPuzzle(
            { network: "nl" },
            at("2026-07-01T21:59:59.999Z"),
        );
        const after = await getTodayPuzzle(
            { network: "nl" },
            at("2026-07-01T22:00:00.000Z"),
        );

        expect(before).toMatchObject({
            date: "2026-07-01",
            nextPuzzleAt: "2026-07-01T22:00:00.000Z",
        });
        expect(after).toMatchObject({
            date: "2026-07-02",
            nextPuzzleAt: "2026-07-02T22:00:00.000Z",
        });
    });

    it("has a 25-hour day when summer time ends", async () => {
        // Clocks go back on 25 October 2026, 03:00 CEST to 02:00 CET.
        const saturday = await getTodayPuzzle(
            { network: "nl" },
            at("2026-10-24T12:00:00.000Z"),
        );
        const sunday = await getTodayPuzzle(
            { network: "nl" },
            at("2026-10-25T12:00:00.000Z"),
        );

        expect(saturday.nextPuzzleAt).toBe("2026-10-24T22:00:00.000Z");
        expect(sunday).toMatchObject({
            date: "2026-10-25",
            nextPuzzleAt: "2026-10-25T23:00:00.000Z",
        });
    });

    it("has a 23-hour day when summer time starts", async () => {
        // Clocks go forward on 28 March 2027, 02:00 CET to 03:00 CEST.
        const saturday = await getTodayPuzzle(
            { network: "nl" },
            at("2027-03-27T12:00:00.000Z"),
        );
        const sunday = await getTodayPuzzle(
            { network: "nl" },
            at("2027-03-28T12:00:00.000Z"),
        );

        expect(saturday.nextPuzzleAt).toBe("2027-03-27T23:00:00.000Z");
        expect(sunday).toMatchObject({
            date: "2027-03-28",
            nextPuzzleAt: "2027-03-28T22:00:00.000Z",
        });
    });

    it("never answers the mystery station", async () => {
        const puzzle = await getTodayPuzzle(
            { network: "nl" },
            at("2026-11-06T12:00:00.000Z"),
        );
        const json = JSON.stringify(puzzle);

        expect(todayPuzzleOutputSchema.parse(puzzle)).toEqual(puzzle);
        expect(puzzle).not.toHaveProperty("station");
        for (const code of stationCodes) {
            expect(json).not.toContain(`"${code}"`);
        }
    });

    it("throws not_found for a day without a puzzle", async () => {
        const answer = getTodayPuzzle(
            { network: "nl" },
            at("2026-06-17T12:00:00.000Z"),
        );

        await expect(answer).rejects.toBeInstanceOf(ApiError);
        await expect(answer).rejects.toMatchObject({ code: "not_found" });
    });
});

describe("todayPuzzleOutputSchema", () => {
    it("refuses an answer that carries the station", () => {
        const withStation = {
            network: "nl",
            number: 1,
            date: "2026-06-18",
            maxGuesses: 6,
            nextPuzzleAt: "2026-06-18T22:00:00.000Z",
            station: "chr",
        };

        expect(todayPuzzleOutputSchema.safeParse(withStation).success).toBe(false);
    });
});

describe("todayPuzzleInputSchema", () => {
    it("needs a network", () => {
        expect(todayPuzzleInputSchema.safeParse({}).success).toBe(false);
    });
});
