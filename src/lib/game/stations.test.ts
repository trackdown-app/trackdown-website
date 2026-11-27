import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createGameData } from "@/lib/data/game-data";
import { readDataDir } from "@/lib/data/read-data-dir";
import { provinceName } from "@/lib/game/province-names";
import { stationsInputSchema, stationsOutputSchema } from "@/lib/game/schemas";
import type { ServiceContext } from "@/lib/game/service-context";
import { getStations } from "@/lib/game/stations";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");
const readFixture = readDataDir(fixtureDir);

const context: ServiceContext = {
    data: createGameData(readFixture),
    dataRef: "abc123",
    now: () => new Date("2026-06-19T12:00:00.000Z"),
};

describe("getStations", () => {
    it("answers every station of stations.json with its code, name and province", async () => {
        const answer = await getStations({ network: "nl", locale: "nl" }, context);

        expect(answer.network).toBe("nl");
        expect(answer.locale).toBe("nl");
        expect(answer.stations).toHaveLength(5);
        expect(answer.stations[0]).toEqual({
            code: "alf",
            name: "Alfastad Centraal",
            province: "Westmark",
        });
    });

    it("answers what its strict output schema allows: no coordinates, no trips", async () => {
        const answer = await getStations({ network: "nl", locale: "en" }, context);

        expect(stationsOutputSchema.parse(answer)).toEqual(answer);
        const json = JSON.stringify(answer);
        expect(json).not.toContain("lat");
        expect(json).not.toContain("SPR");
    });

    it("leaves out a station that is only a change in a trip", async () => {
        const data = createGameData((path) =>
            path === "nl/to/alf.json"
                ? Promise.resolve({
                      brv: [
                          ["IC", 20],
                          ["aac", 5],
                          ["IC", 10],
                      ],
                      chr: [["SPR", 15]],
                      dlt: [["SPR", 12]],
                      ech: [["ICD", 30]],
                  })
                : readFixture(path),
        );
        await data.tripsTo("nl", "alf");

        const answer = await getStations(
            { network: "nl", locale: "nl" },
            { ...context, data },
        );

        expect(answer.stations.map((station) => station.code)).toEqual([
            "alf",
            "brv",
            "chr",
            "dlt",
            "ech",
        ]);
    });
});

describe("provinceName", () => {
    it("keeps the data's Dutch name in Dutch", () => {
        expect(provinceName("Noord-Holland", "nl")).toBe("Noord-Holland");
        expect(provinceName("Fryslân", "nl")).toBe("Fryslân");
    });

    it("names a province in English where English names it differently", () => {
        expect(provinceName("Noord-Holland", "en")).toBe("North Holland");
        expect(provinceName("Zuid-Holland", "en")).toBe("South Holland");
        expect(provinceName("Noord-Brabant", "en")).toBe("North Brabant");
        expect(provinceName("Fryslân", "en")).toBe("Friesland");
    });

    it("keeps a name English shares, or one it has no entry for", () => {
        expect(provinceName("Utrecht", "en")).toBe("Utrecht");
        expect(provinceName("Westmark", "en")).toBe("Westmark");
    });

    it("names provinces and regions in German and French", () => {
        expect(provinceName("Noord-Holland", "de")).toBe("Nordholland");
        expect(provinceName("Scotland", "de")).toBe("Schottland");
        expect(provinceName("Gelderland", "de")).toBe("Gelderland");
        expect(provinceName("Zuid-Holland", "fr")).toBe("Hollande-Méridionale");
        expect(provinceName("Wales", "fr")).toBe("Pays de Galles");
        expect(provinceName("West Midlands", "fr")).toBe("West Midlands");
    });

    it("names Rotterdam's districts as they are, and The Hague in each language", () => {
        expect(provinceName("Kralingen-Crooswijk", "en")).toBe(
            "Kralingen-Crooswijk",
        );
        expect(provinceName("Den Haag", "nl")).toBe("Den Haag");
        expect(provinceName("Den Haag", "en")).toBe("The Hague");
        expect(provinceName("Den Haag", "de")).toBe("Den Haag");
        expect(provinceName("Den Haag", "fr")).toBe("La Haye");
    });

    it("names a Belgian province in each language, whatever language the data uses", () => {
        expect(provinceName("Hainaut", "nl")).toBe("Henegouwen");
        expect(provinceName("Bruxelles / Brussel", "nl")).toBe("Brussel");
        expect(provinceName("Oost-Vlaanderen", "nl")).toBe("Oost-Vlaanderen");
        expect(provinceName("Oost-Vlaanderen", "en")).toBe("East Flanders");
        expect(provinceName("Bruxelles / Brussel", "en")).toBe("Brussels");
        expect(provinceName("Liège", "en")).toBe("Liège");
        expect(provinceName("Liège", "de")).toBe("Lüttich");
        expect(provinceName("West-Vlaanderen", "de")).toBe("Westflandern");
        expect(provinceName("Antwerpen", "fr")).toBe("Anvers");
        expect(provinceName("Hainaut", "fr")).toBe("Hainaut");
    });
});

describe("stationsInputSchema", () => {
    it("defaults to Dutch", () => {
        expect(stationsInputSchema.parse({ network: "nl" })).toEqual({
            network: "nl",
            locale: "nl",
        });
    });

    it("needs a network", () => {
        expect(stationsInputSchema.safeParse({}).success).toBe(false);
    });

    it("refuses a locale the site does not have", () => {
        expect(
            stationsInputSchema.safeParse({ network: "nl", locale: "es" }).success,
        ).toBe(false);
    });
});
