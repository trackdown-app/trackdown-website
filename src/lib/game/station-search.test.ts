import { describe, expect, it } from "vitest";
import {
    findStationByName,
    foldForSearch,
    matchName,
    searchStations,
} from "@/lib/game/station-search";
import type { StationOption } from "@/lib/game/station-search";

function station(code: string, name: string): StationOption {
    return { code, name, province: "Noord-Holland" };
}

// A slice of the real list, in `stations.json`'s order (by name).
const stations: StationOption[] = [
    station("ac", "Abcoude"),
    station("ass", "Amstel"),
    station("asb", "Amsterdam Bijlmer ArenA"),
    station("asd", "Amsterdam Centraal"),
    station("ass2", "Amsterdam Sloterdijk"),
    station("asdz", "Amsterdam Zuid"),
    station("dld", "Den Dolder"),
    station("ht", "'s-Hertogenbosch"),
    station("rsw", "Rotterdam Zuid"),
    station("zl", "Zwolle"),
    station("hlg", "Hoogezand-Sappemeer"),
    station("ldm", "Leeuwarden Camminghaburen"),
    station("frk", "Franeker"),
    station("crs", "Coevorden"),
];

const none = new Set<string>();

function names(found: StationOption[]): string[] {
    return found.map((s) => s.name);
}

describe("foldForSearch", () => {
    it("drops case, diacritics and punctuation", () => {
        expect(foldForSearch("  'S-Hértogenbosch ")).toBe("s hertogenbosch");
        expect(foldForSearch("Fryslân")).toBe("fryslan");
    });
});

describe("matchName", () => {
    it("matches the start of the name", () => {
        expect(matchName("Amsterdam Zuid", "ams")).toEqual({ start: 0, end: 3 });
    });

    it("matches the start of a later word", () => {
        expect(matchName("Amsterdam Zuid", "zu")).toEqual({ start: 10, end: 12 });
    });

    it("does not match inside a word", () => {
        expect(matchName("Amsterdam Zuid", "ster")).toBeNull();
    });

    it("ignores case and diacritics, in both directions", () => {
        expect(matchName("Fryslân", "FRYSLAN")).toEqual({ start: 0, end: 7 });
        expect(matchName("Coevorden", "coë")).toEqual({ start: 0, end: 3 });
    });

    it("maps the match back past leading punctuation", () => {
        expect(matchName("'s-Hertogenbosch", "hert")).toEqual({
            start: 3,
            end: 7,
        });
        expect(matchName("'s-Hertogenbosch", "s hert")).toEqual({
            start: 1,
            end: 7,
        });
    });

    it("matches across words and treats a hyphen as a space", () => {
        expect(matchName("Hoogezand-Sappemeer", "hoogezand sap")).toEqual({
            start: 0,
            end: 13,
        });
        expect(matchName("Hoogezand-Sappemeer", "sap")).toEqual({
            start: 10,
            end: 13,
        });
    });

    it("matches nothing for an empty query", () => {
        expect(matchName("Zwolle", "")).toBeNull();
        expect(matchName("Zwolle", " - ")).toBeNull();
    });
});

describe("searchStations", () => {
    it('offers Amsterdam Centraal, Zuid and Sloterdijk for "ams"', () => {
        const found = names(searchStations(stations, "ams", none));

        expect(found).toEqual(
            expect.arrayContaining([
                "Amsterdam Centraal",
                "Amsterdam Zuid",
                "Amsterdam Sloterdijk",
            ]),
        );
        expect(found).not.toContain("Abcoude");
    });

    it("puts names that start with the query before later words", () => {
        expect(names(searchStations(stations, "zuid", none))).toEqual([
            "Amsterdam Zuid",
            "Rotterdam Zuid",
        ]);
        expect(names(searchStations(stations, "z", none))).toEqual([
            "Zwolle",
            "Amsterdam Zuid",
            "Rotterdam Zuid",
        ]);
    });

    it("never offers a station already guessed", () => {
        const found = names(searchStations(stations, "ams", new Set(["asd"])));

        expect(found).not.toContain("Amsterdam Centraal");
        expect(found).toContain("Amsterdam Zuid");
    });

    it("offers nothing for an empty query", () => {
        expect(searchStations(stations, "  ", none)).toEqual([]);
    });
});

describe("findStationByName", () => {
    it("finds a name typed out in full, folded", () => {
        expect(findStationByName(stations, "amsterdam  zuid", none)?.code).toBe(
            "asdz",
        );
        expect(findStationByName(stations, "s hertogenbosch", none)?.code).toBe(
            "ht",
        );
    });

    it("finds nothing for part of a name or a guessed station", () => {
        expect(findStationByName(stations, "amsterdam", none)).toBeNull();
        expect(
            findStationByName(stations, "Amsterdam Zuid", new Set(["asdz"])),
        ).toBeNull();
    });
});
