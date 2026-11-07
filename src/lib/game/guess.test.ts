import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { createGameData } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";
import { submitGuess } from "@/lib/game/guess";
import { guessInputSchema, guessOutputSchema } from "@/lib/game/schemas";
import type { GuessInput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");
const readFixture = readDataDir(fixtureDir);

/**
 * The fixture's five stations and five more without trips, so a player can
 * reach a seventh guess without repeating a station.
 */
const extraStations = ["fox", "gol", "hot", "ind", "jul"];

const data = createGameData(async (path) => {
    const value = await readFixture(path);
    if (path !== "nl/stations.json" || !Array.isArray(value)) {
        return value;
    }
    return [
        ...value,
        ...extraStations.map((code) => ({
            code,
            name: code,
            province: "Westmark",
            lat: 52,
            lon: 5,
        })),
    ];
});

// The fixture's puzzle 2, whose mystery station is `ech`.
const context: ServiceContext = {
    data,
    dataRef: "abc123",
    now: () => new Date("2026-06-19T12:00:00.000Z"),
};

function guess(
    input: Partial<GuessInput> & Pick<GuessInput, "guess">,
): ReturnType<typeof submitGuess> {
    return submitGuess(
        { network: "nl", number: 2, earlierGuesses: [], ...input },
        context,
    );
}

async function expectRejection(
    answer: Promise<unknown>,
    code: ApiError["code"],
): Promise<void> {
    await expect(answer).rejects.toBeInstanceOf(ApiError);
    await expect(answer).rejects.toMatchObject({ code });
}

describe("submitGuess", () => {
    it("answers the trip with every change hidden on a first guess", async () => {
        // dlt → ech: SPR 12, chr 4, SPR 15, alf 8, ICD 30.
        const answer = await guess({ guess: "dlt" });

        expect(answer).toEqual({
            network: "nl",
            number: 2,
            guess: "dlt",
            correct: false,
            steps: [
                { kind: "ride", train: "SPR", minutes: 12 },
                { kind: "change", station: null, minutes: 4 },
                { kind: "ride", train: "SPR", minutes: 15 },
                { kind: "change", station: null, minutes: 8 },
                { kind: "ride", train: "ICD", minutes: 30 },
            ],
            totalMinutes: 69,
        });
    });

    it("shows a change station only when it is in the earlier guesses", async () => {
        const answer = await guess({ guess: "dlt", earlierGuesses: ["chr"] });

        expect(answer.steps.filter((step) => step.kind === "change")).toEqual([
            { kind: "change", station: "chr", minutes: 4 },
            { kind: "change", station: null, minutes: 8 },
        ]);
    });

    it("shows every change station the player guessed earlier", async () => {
        const answer = await guess({
            guess: "dlt",
            earlierGuesses: ["alf", "chr"],
        });

        expect(answer.steps.filter((step) => step.kind === "change")).toEqual([
            { kind: "change", station: "chr", minutes: 4 },
            { kind: "change", station: "alf", minutes: 8 },
        ]);
    });

    it("does not count an earlier guess that is not on the trip", async () => {
        const answer = await guess({ guess: "chr", earlierGuesses: ["brv"] });

        expect(answer.steps).toEqual([
            { kind: "ride", train: "SPR", minutes: 15 },
            { kind: "change", station: null, minutes: 8 },
            { kind: "ride", train: "ICD", minutes: 30 },
        ]);
    });

    it("answers a direct trip without changes", async () => {
        const answer = await guess({ guess: "alf" });

        expect(answer).toMatchObject({
            correct: false,
            steps: [{ kind: "ride", train: "ICD", minutes: 30 }],
            totalMinutes: 30,
        });
    });

    it("answers a correct guess without a trip", async () => {
        const answer = await guess({ guess: "ech", earlierGuesses: ["dlt"] });

        expect(answer).toEqual({
            network: "nl",
            number: 2,
            guess: "ech",
            correct: true,
            steps: [],
            totalMinutes: 0,
        });
    });

    it("never answers the mystery station on a wrong guess", async () => {
        const answer = await guess({
            guess: "dlt",
            earlierGuesses: ["alf", "brv", "chr"],
        });

        expect(guessOutputSchema.parse(answer)).toEqual(answer);
        expect(JSON.stringify(answer)).not.toContain('"ech"');
    });

    it("takes a guess at an earlier puzzle", async () => {
        // Puzzle 1's mystery station is `chr`; dlt → chr is one SPR ride.
        const answer = await guess({ number: 1, guess: "dlt" });

        expect(answer).toMatchObject({
            number: 1,
            correct: false,
            totalMinutes: 12,
        });
    });

    it("takes a sixth guess", async () => {
        const answer = await guess({
            guess: "dlt",
            earlierGuesses: extraStations,
        });

        expect(answer.correct).toBe(false);
    });

    describe("rejects", () => {
        it("a puzzle after today's with not_found", async () => {
            await expectRejection(guess({ number: 3, guess: "dlt" }), "not_found");
        });

        it("a puzzle that does not exist with not_found", async () => {
            await expectRejection(guess({ number: 99, guess: "dlt" }), "not_found");
        });

        it("a guess that is not a station", async () => {
            await expectRejection(guess({ guess: "xyz" }), "invalid_input");
        });

        it("an earlier guess that is not a station", async () => {
            await expectRejection(
                guess({ guess: "dlt", earlierGuesses: ["xyz"] }),
                "invalid_input",
            );
        });

        it("a guess the player made before", async () => {
            await expectRejection(
                guess({ guess: "dlt", earlierGuesses: ["chr", "dlt"] }),
                "invalid_input",
            );
        });

        it("earlier guesses that repeat a station", async () => {
            await expectRejection(
                guess({ guess: "dlt", earlierGuesses: ["chr", "chr"] }),
                "invalid_input",
            );
        });

        it("a seventh guess", async () => {
            await expectRejection(
                guess({ guess: "dlt", earlierGuesses: [...extraStations, "alf"] }),
                "invalid_input",
            );
        });

        it("a guess after the puzzle was solved", async () => {
            await expectRejection(
                guess({ guess: "dlt", earlierGuesses: ["ech"] }),
                "invalid_input",
            );
        });
    });
});

describe("guessInputSchema", () => {
    it("reads the puzzle's number from a path string and defaults the earlier guesses", () => {
        expect(
            guessInputSchema.parse({ network: "nl", number: "2", guess: "dlt" }),
        ).toEqual({ network: "nl", number: 2, guess: "dlt", earlierGuesses: [] });
    });

    it("refuses a number that is not a puzzle's", () => {
        for (const number of ["0", "-1", "1.5", "two"]) {
            expect(
                guessInputSchema.safeParse({ network: "nl", number, guess: "dlt" })
                    .success,
            ).toBe(false);
        }
    });

    it("refuses a guess that is not a station code", () => {
        expect(
            guessInputSchema.safeParse({ network: "nl", number: 2, guess: "../x" })
                .success,
        ).toBe(false);
    });
});

describe("guessOutputSchema", () => {
    it("refuses an answer that carries the station", () => {
        const withStation = {
            network: "nl",
            number: 2,
            guess: "ech",
            correct: true,
            steps: [],
            totalMinutes: 0,
            station: "ech",
        };

        expect(guessOutputSchema.safeParse(withStation).success).toBe(false);
    });
});
