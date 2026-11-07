import { describe, expect, it } from "vitest";
import type { StoredGame } from "@/lib/game/game-state";
import { computeStatistics } from "@/lib/game/statistics";
import type { ArchivedPuzzle } from "@/lib/game/schemas";
import type { ListedGuess } from "@/lib/game/trip-line";

const miss: ListedGuess = {
    guess: "ut",
    correct: false,
    steps: [{ kind: "ride", train: "IC", minutes: 17 }],
    totalMinutes: 17,
};
const hit: ListedGuess = { guess: "asd", correct: true, steps: [], totalMinutes: 0 };

/** Puzzles 1 to `count`, one a day from 1 November 2026. */
function puzzles(count: number): ArchivedPuzzle[] {
    return Array.from({ length: count }, (_, index) => ({
        number: index + 1,
        date: `2026-11-${String(index + 1).padStart(2, "0")}`,
    }));
}

/** A game won in `count` guesses, on its own day unless played in the archive. */
function won(count: number, archive = false): StoredGame {
    return {
        guesses: [...Array.from({ length: count - 1 }, () => miss), hit],
        archive,
    };
}

const lost: StoredGame = {
    guesses: Array.from({ length: 6 }, () => miss),
    archive: false,
};

function playing(guessCount: number): StoredGame {
    return {
        guesses: Array.from({ length: guessCount }, () => miss),
        archive: false,
    };
}

function games(entries: [number, StoredGame][]): Map<number, StoredGame> {
    return new Map(entries);
}

describe("computeStatistics", () => {
    it("is all zeros before the first game", () => {
        expect(computeStatistics(puzzles(3), games([]), 6)).toEqual({
            played: 0,
            won: 0,
            winPercent: 0,
            currentStreak: 0,
            bestStreak: 0,
            distribution: [0, 0, 0, 0, 0, 0],
            missed: 0,
            today: null,
        });
    });

    it("counts played, won, the percentage and the guesses needed", () => {
        const statistics = computeStatistics(
            puzzles(4),
            games([
                [1, won(3)],
                [2, won(3)],
                [3, lost],
                [4, won(5)],
            ]),
            6,
        );

        expect(statistics.played).toBe(4);
        expect(statistics.won).toBe(3);
        expect(statistics.winPercent).toBe(75);
        expect(statistics.distribution).toEqual([0, 0, 2, 0, 1, 0]);
        expect(statistics.missed).toBe(1);
        expect(statistics.today).toBe(5);
    });

    it("leaves a game still on out of the record", () => {
        const statistics = computeStatistics(
            puzzles(2),
            games([
                [1, won(2)],
                [2, playing(2)],
            ]),
            6,
        );

        expect(statistics.played).toBe(1);
        expect(statistics.today).toBeNull();
    });

    it("names today's game as missed when it ran out of guesses", () => {
        expect(computeStatistics(puzzles(1), games([[1, lost]]), 6).today).toBe(
            "missed",
        );
    });

    it("runs a streak over puzzles won on their own day, today's included", () => {
        const statistics = computeStatistics(
            puzzles(3),
            games([
                [1, won(4)],
                [2, won(2)],
                [3, won(6)],
            ]),
            6,
        );

        expect(statistics.currentStreak).toBe(3);
        expect(statistics.bestStreak).toBe(3);
    });

    it("keeps yesterday's streak while today's puzzle is still to play", () => {
        const notStarted = computeStatistics(
            puzzles(3),
            games([
                [1, won(4)],
                [2, won(2)],
            ]),
            6,
        );
        const onItsWay = computeStatistics(
            puzzles(3),
            games([
                [1, won(4)],
                [2, won(2)],
                [3, playing(1)],
            ]),
            6,
        );

        expect(notStarted.currentStreak).toBe(2);
        expect(onItsWay.currentStreak).toBe(2);
    });

    it("breaks the streak after a skipped day", () => {
        const statistics = computeStatistics(
            puzzles(5),
            games([
                [1, won(3)],
                [2, won(3)],
                [3, won(3)],
                // 4 November skipped.
                [5, won(3)],
            ]),
            6,
        );

        expect(statistics.currentStreak).toBe(1);
        expect(statistics.bestStreak).toBe(3);
    });

    it("breaks the streak after a missed day", () => {
        const statistics = computeStatistics(
            puzzles(3),
            games([
                [1, won(3)],
                [2, lost],
                [3, won(3)],
            ]),
            6,
        );

        expect(statistics.currentStreak).toBe(1);
        expect(statistics.bestStreak).toBe(1);
    });

    it("ends the streak once yesterday was skipped, before today is played", () => {
        const statistics = computeStatistics(puzzles(3), games([[1, won(3)]]), 6);

        expect(statistics.currentStreak).toBe(0);
        expect(statistics.bestStreak).toBe(1);
    });

    it("drops the streak to nothing when today's puzzle is lost", () => {
        const statistics = computeStatistics(
            puzzles(3),
            games([
                [1, won(3)],
                [2, won(3)],
                [3, lost],
            ]),
            6,
        );

        expect(statistics.currentStreak).toBe(0);
        expect(statistics.bestStreak).toBe(2);
    });

    it("counts a puzzle won in the archive as played, but not for the streak", () => {
        const statistics = computeStatistics(
            puzzles(3),
            games([
                [1, won(3)],
                // Played from the archive, after its day.
                [2, won(3, true)],
                [3, won(3)],
            ]),
            6,
        );

        expect(statistics.won).toBe(3);
        expect(statistics.currentStreak).toBe(1);
        expect(statistics.bestStreak).toBe(1);
    });

    it("follows the puzzles' days, not the order they come in", () => {
        const statistics = computeStatistics(
            [...puzzles(3)].reverse(),
            games([
                [2, won(3)],
                [3, won(3)],
            ]),
            6,
        );

        expect(statistics.currentStreak).toBe(2);
        expect(statistics.today).toBe(3);
    });
});
