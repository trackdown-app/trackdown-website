import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { createGameData } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";
import { revealAnswer } from "@/lib/game/reveal";
import { revealInputSchema, revealOutputSchema } from "@/lib/game/schemas";
import type { RevealInput } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");
const readFixture = readDataDir(fixtureDir);

/**
 * Five stations more than the fixture's, each one SPR ride from puzzle 2's
 * mystery station, so a game can run to six wrong guesses.
 */
const extraStations = ["fox", "gol", "hot", "ind", "jul"];

const data = createGameData(async (path) => {
    const value = await readFixture(path);
    if (path === "nl/stations.json" && Array.isArray(value)) {
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
    }
    if (path === "nl/to/ech.json" && typeof value === "object" && value != null) {
        return {
            ...value,
            ...Object.fromEntries(
                extraStations.map((code) => [code, [["SPR", 10]]]),
            ),
        };
    }
    return value;
});

// The fixture's puzzle 2, whose mystery station is `ech`.
const context: ServiceContext = {
    data,
    dataRef: "abc123",
    now: () => new Date("2026-06-19T12:00:00.000Z"),
};

function reveal(
    input: Partial<RevealInput> & Pick<RevealInput, "guesses">,
): ReturnType<typeof revealAnswer> {
    return revealAnswer({ network: "nl", number: 2, ...input }, context);
}

async function expectRejection(
    answer: Promise<unknown>,
    code: ApiError["code"],
): Promise<void> {
    await expect(answer).rejects.toBeInstanceOf(ApiError);
    await expect(answer).rejects.toMatchObject({ code });
}

describe("revealAnswer", () => {
    it("answers a solved game's station and every trip with its changes named", async () => {
        const answer = await reveal({ guesses: ["dlt", "brv", "ech"] });

        expect(answer).toEqual({
            network: "nl",
            number: 2,
            station: "ech",
            solved: true,
            guesses: [
                {
                    guess: "dlt",
                    correct: false,
                    steps: [
                        { kind: "ride", train: "SPR", minutes: 12 },
                        { kind: "change", station: "chr", minutes: 4 },
                        { kind: "ride", train: "SPR", minutes: 15 },
                        { kind: "change", station: "alf", minutes: 8 },
                        { kind: "ride", train: "ICD", minutes: 30 },
                    ],
                    totalMinutes: 69,
                },
                {
                    guess: "brv",
                    correct: false,
                    steps: [
                        { kind: "ride", train: "IC", minutes: 20 },
                        { kind: "change", station: "alf", minutes: 7 },
                        { kind: "ride", train: "ICD", minutes: 30 },
                    ],
                    totalMinutes: 57,
                },
                { guess: "ech", correct: true, steps: [], totalMinutes: 0 },
            ],
        });
        expect(revealOutputSchema.parse(answer)).toEqual(answer);
    });

    it("answers a game solved on the first guess", async () => {
        const answer = await reveal({ guesses: ["ech"] });

        expect(answer).toMatchObject({ station: "ech", solved: true });
        expect(answer.guesses).toHaveLength(1);
    });

    it("answers a game solved on the sixth guess", async () => {
        const answer = await reveal({ guesses: [...extraStations, "ech"] });

        expect(answer.solved).toBe(true);
        expect(answer.guesses).toHaveLength(6);
    });

    it("answers a game missed after six wrong guesses", async () => {
        const answer = await reveal({ guesses: ["dlt", ...extraStations] });

        expect(answer).toMatchObject({ station: "ech", solved: false });
        expect(answer.guesses.map((guess) => guess.correct)).toEqual([
            false,
            false,
            false,
            false,
            false,
            false,
        ]);
        expect(answer.guesses[1]).toEqual({
            guess: "fox",
            correct: false,
            steps: [{ kind: "ride", train: "SPR", minutes: 10 }],
            totalMinutes: 10,
        });
    });

    it("answers an earlier puzzle", async () => {
        // Puzzle 1's mystery station is `chr`.
        const answer = await reveal({ number: 1, guesses: ["chr"] });

        expect(answer).toMatchObject({ number: 1, station: "chr", solved: true });
    });

    describe("rejects", () => {
        it("a game with fewer than six wrong guesses with game_not_over", async () => {
            for (const guesses of [
                [],
                ["dlt"],
                ["dlt", ...extraStations.slice(1)],
            ]) {
                await expectRejection(reveal({ guesses }), "game_not_over");
            }
        });

        it("a game not over without a word of the answer", async () => {
            const answer = reveal({ guesses: ["dlt", "brv"] });

            await expect(answer).rejects.toSatisfy(
                (error: unknown) =>
                    error instanceof ApiError &&
                    !JSON.stringify(error.toBody()).includes("ech"),
            );
        });

        it("a puzzle after today's with not_found", async () => {
            await expectRejection(
                reveal({ number: 3, guesses: ["alf"] }),
                "not_found",
            );
        });

        it("a puzzle that does not exist with not_found", async () => {
            await expectRejection(
                reveal({ number: 99, guesses: ["alf"] }),
                "not_found",
            );
        });

        it("a guess that is not a station", async () => {
            await expectRejection(
                reveal({ guesses: ["xyz", "ech"] }),
                "invalid_input",
            );
        });

        it("guesses that repeat a station", async () => {
            await expectRejection(
                reveal({ guesses: ["dlt", "dlt", "ech"] }),
                "invalid_input",
            );
        });

        it("more than six guesses", async () => {
            await expectRejection(
                reveal({ guesses: ["dlt", ...extraStations, "ech"] }),
                "invalid_input",
            );
        });

        it("a guess after the puzzle was solved", async () => {
            await expectRejection(
                reveal({ guesses: ["ech", "dlt"] }),
                "invalid_input",
            );
        });
    });
});

describe("revealInputSchema", () => {
    it("reads the puzzle's number from a path string", () => {
        expect(
            revealInputSchema.parse({
                network: "nl",
                number: "2",
                guesses: ["ech"],
            }),
        ).toEqual({ network: "nl", number: 2, guesses: ["ech"] });
    });

    it("refuses a missing guess list", () => {
        expect(
            revealInputSchema.safeParse({ network: "nl", number: 2 }).success,
        ).toBe(false);
    });
});
