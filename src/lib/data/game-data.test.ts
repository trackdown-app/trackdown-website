import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { checkNetwork } from "@/lib/data/check-data";
import { createGameData, GameDataError } from "@/lib/data/game-data";
import type { DataReader } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");

function fixtureReader() {
    return vi.fn<DataReader>(readDataDir(fixtureDir));
}

describe("the fixture", () => {
    it("passes every check", async () => {
        const data = createGameData(readDataDir(fixtureDir));

        expect(await checkNetwork(data, "nl")).toEqual([]);
    });
});

describe("createGameData", () => {
    it("reads the stations, puzzles and meta of a network", async () => {
        const data = createGameData(readDataDir(fixtureDir));

        const stations = await data.stations("nl");
        expect(stations.map((station) => station.code)).toEqual([
            "alf",
            "brv",
            "chr",
            "dlt",
            "ech",
        ]);
        expect((await data.puzzles("nl"))[0]).toEqual({
            n: 1,
            date: "2026-06-18",
            station: "chr",
        });
        expect((await data.meta("nl")).stations).toBe(5);
    });

    it("parses a trip into rides and changes", async () => {
        const data = createGameData(readDataDir(fixtureDir));

        const trips = await data.tripsTo("nl", "alf");

        expect(trips["dlt"]).toEqual([
            { kind: "ride", train: "SPR", minutes: 12 },
            { kind: "change", station: "chr", minutes: 4 },
            { kind: "ride", train: "SPR", minutes: 15 },
        ]);
    });

    it("reads only the mystery station's trips file", async () => {
        const read = fixtureReader();
        const data = createGameData(read);

        await data.tripsTo("nl", "chr");

        expect(read.mock.calls.map(([path]) => path)).toEqual([
            "nl/stations.json",
            "nl/to/chr.json",
        ]);
    });

    it("reads each file once and answers again from memory", async () => {
        const read = fixtureReader();
        const data = createGameData(read);

        await Promise.all([data.stations("nl"), data.stations("nl")]);
        await data.tripsTo("nl", "ech");
        await data.tripsTo("nl", "ech");

        expect(read).toHaveBeenCalledTimes(2);
    });

    it("reads a file again after a failed read", async () => {
        const fromDisk = readDataDir(fixtureDir);
        const read = vi
            .fn<DataReader>(fromDisk)
            .mockRejectedValueOnce(new Error("disk on fire"));
        const data = createGameData(read);

        await expect(data.meta("nl")).rejects.toThrow("disk on fire");
        expect((await data.meta("nl")).feed).toBe("fixture");
    });

    it("rejects a code that is not a station without reading it as a path", async () => {
        const read = fixtureReader();
        const data = createGameData(read);

        await expect(data.tripsTo("nl", "../../secret")).rejects.toThrow(
            GameDataError,
        );
        expect(read.mock.calls.map(([path]) => path)).toEqual(["nl/stations.json"]);
    });

    it("names a missing file", async () => {
        const data = createGameData(() => Promise.resolve(null));

        await expect(data.meta("nl")).rejects.toThrow(
            "nl/meta.json is missing from the data directory",
        );
    });

    it("names a file that does not match its schema, and where", async () => {
        const data = createGameData((path) =>
            Promise.resolve(
                path === "nl/stations.json"
                    ? [
                          {
                              code: "ALF",
                              name: "Alfastad",
                              province: "Westmark",
                              lat: 1,
                              lon: 2,
                          },
                      ]
                    : null,
            ),
        );

        const error: unknown = await data.stations("nl").catch((e: unknown) => e);

        expect(error).toBeInstanceOf(GameDataError);
        expect(String(error)).toContain(
            "nl/stations.json does not match its schema",
        );
        expect(String(error)).toContain("lower-case letters and digits");
    });
});

describe("checkNetwork", () => {
    it("lists references the schemas cannot see", async () => {
        const fromDisk = readDataDir(fixtureDir);
        const data = createGameData(async (path) => {
            if (path === "nl/puzzles.json") {
                return [{ n: 1, date: "2026-06-18", station: "zzz" }];
            }
            if (path === "nl/to/brv.json") {
                return { alf: [["IC", 20]] };
            }
            return fromDisk(path);
        });

        expect(await checkNetwork(data, "nl")).toEqual([
            'puzzle 1 (2026-06-18) is station "zzz", which is not in stations.json',
            "to/brv.json has no trip from chr, dlt, ech",
        ]);
    });
});
