import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createGameData } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";
import { getPuzzleArchive } from "@/lib/game/puzzle-archive";
import {
    archivedPuzzleSchema,
    puzzleArchiveInputSchema,
    puzzleArchiveOutputSchema,
} from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data:
// puzzles 1 to 5, 18 to 22 June 2026.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");
const data = createGameData(readDataDir(fixtureDir));

/** The fixture's mystery stations, puzzle 1 to 5. */
const stationCodes = ["chr", "ech", "alf", "dlt", "brv"];

function at(instant: string): ServiceContext {
    return { data, dataRef: "abc123", now: () => new Date(instant) };
}

describe("getPuzzleArchive", () => {
    it("lists every puzzle up to today's, oldest first, ending at today's", async () => {
        const archive = await getPuzzleArchive(
            { network: "nl" },
            at("2026-06-20T12:00:00.000Z"),
        );

        expect(archive).toEqual({
            network: "nl",
            puzzles: [
                { number: 1, date: "2026-06-18" },
                { number: 2, date: "2026-06-19" },
                { number: 3, date: "2026-06-20" },
            ],
        });
    });

    it("takes the next puzzle in at midnight in Amsterdam, not in UTC", async () => {
        const before = await getPuzzleArchive(
            { network: "nl" },
            at("2026-06-19T21:59:59.999Z"),
        );
        const after = await getPuzzleArchive(
            { network: "nl" },
            at("2026-06-19T22:00:00.000Z"),
        );

        expect(before.puzzles.at(-1)).toEqual({ number: 2, date: "2026-06-19" });
        expect(after.puzzles.at(-1)).toEqual({ number: 3, date: "2026-06-20" });
    });

    it("lists the whole schedule once it has ended", async () => {
        const archive = await getPuzzleArchive(
            { network: "nl" },
            at("2030-01-01T12:00:00.000Z"),
        );

        expect(archive.puzzles.map((puzzle) => puzzle.number)).toEqual([
            1, 2, 3, 4, 5,
        ]);
    });

    it("lists nothing before puzzle 1", async () => {
        const archive = await getPuzzleArchive(
            { network: "nl" },
            at("2026-06-17T12:00:00.000Z"),
        );

        expect(archive).toEqual({ network: "nl", puzzles: [] });
    });

    it("never answers a mystery station", async () => {
        const archive = await getPuzzleArchive(
            { network: "nl" },
            at("2030-01-01T12:00:00.000Z"),
        );
        const json = JSON.stringify(archive);

        expect(puzzleArchiveOutputSchema.parse(archive)).toEqual(archive);
        for (const puzzle of archive.puzzles) {
            expect(puzzle).not.toHaveProperty("station");
        }
        for (const code of stationCodes) {
            expect(json).not.toContain(`"${code}"`);
        }
    });
});

describe("archivedPuzzleSchema", () => {
    it("refuses a puzzle that carries its station", () => {
        const withStation = { number: 1, date: "2026-06-18", station: "chr" };

        expect(archivedPuzzleSchema.safeParse(withStation).success).toBe(false);
    });
});

describe("puzzleArchiveInputSchema", () => {
    it("needs a network", () => {
        expect(puzzleArchiveInputSchema.safeParse({}).success).toBe(false);
    });
});
