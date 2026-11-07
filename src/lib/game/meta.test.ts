import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createGameData } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";
import { getMeta } from "@/lib/game/meta";
import { metaInputSchema, metaOutputSchema } from "@/lib/game/schemas";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");

const context = {
    data: createGameData(readDataDir(fixtureDir)),
    dataRef: "abc123",
    now: () => new Date("2026-06-18T12:00:00.000Z"),
};

describe("getMeta", () => {
    it("answers the network's meta.json, the network and the data's commit", async () => {
        const meta = await getMeta({ network: "nl" }, context);

        expect(meta).toMatchObject({
            network: "nl",
            dataRef: "abc123",
            feed: "fixture",
            stations: 5,
            builtAt: "2026-11-07T12:00:00.000Z",
        });
    });

    it("answers what its output schema allows", async () => {
        const meta = await getMeta({ network: "nl" }, context);

        expect(metaOutputSchema.parse(meta)).toEqual(meta);
    });
});

describe("metaInputSchema", () => {
    it("defaults to the Dutch network", () => {
        expect(metaInputSchema.parse({})).toEqual({ network: "nl" });
    });

    it("refuses a network the game has no data for", () => {
        expect(metaInputSchema.safeParse({ network: "be" }).success).toBe(false);
    });
});
