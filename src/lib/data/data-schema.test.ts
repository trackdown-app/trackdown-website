import { describe, expect, it } from "vitest";
import {
    puzzlesFileSchema,
    stationsFileSchema,
    tripSchema,
} from "@/lib/data/data-schema";

describe("tripSchema", () => {
    it("turns alternating entries into rides and changes", () => {
        expect(
            tripSchema.parse([
                ["IC", 116],
                ["ut", 10],
                ["IC", 13],
            ]),
        ).toEqual([
            { kind: "ride", train: "IC", minutes: 116 },
            { kind: "change", station: "ut", minutes: 10 },
            { kind: "ride", train: "IC", minutes: 13 },
        ]);
    });

    it("rejects a trip that ends with a change", () => {
        expect(
            tripSchema.safeParse([
                ["IC", 116],
                ["ut", 10],
            ]).success,
        ).toBe(false);
    });

    it("rejects a ride that is not a train type", () => {
        const result = tripSchema.safeParse([["ut", 10]]);

        expect(result.error?.issues[0]?.message).toBe(
            'entry 0 is a ride, but "ut" is not a train type',
        );
    });

    it("rejects a change that is not a station code", () => {
        const result = tripSchema.safeParse([
            ["IC", 1],
            ["IC", 2],
            ["IC", 3],
        ]);

        expect(result.error?.issues[0]?.message).toBe(
            'entry 1 is a change, but "IC" is not a station code',
        );
    });

    it("rejects minutes that are not whole and positive", () => {
        expect(tripSchema.safeParse([["IC", -1]]).success).toBe(false);
        expect(tripSchema.safeParse([["IC", 1.5]]).success).toBe(false);
    });
});

describe("stationsFileSchema", () => {
    it("rejects a code that appears twice", () => {
        const station = {
            code: "ut",
            name: "Utrecht",
            province: "Utrecht",
            lat: 52,
            lon: 5,
        };

        const result = stationsFileSchema.safeParse([station, station]);

        expect(result.error?.issues[0]?.message).toBe(
            'station code "ut" appears twice',
        );
    });
});

describe("puzzlesFileSchema", () => {
    it("rejects two puzzles on one date", () => {
        const result = puzzlesFileSchema.safeParse([
            { n: 1, date: "2026-06-18", station: "ut" },
            { n: 2, date: "2026-06-18", station: "amf" },
        ]);

        expect(result.error?.issues[0]?.message).toBe(
            "date 2026-06-18 has two puzzles",
        );
    });
});
