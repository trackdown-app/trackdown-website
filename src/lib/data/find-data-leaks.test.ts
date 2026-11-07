import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { findDataLeaks } from "@/lib/data/find-data-leaks";
import type { TreeFile } from "@/lib/data/find-data-leaks";
import { readTree } from "@/lib/data/read-tree";

// Runs on the fixture in `fixtures/trackdown-data/` only, never the real data.
const fixtureDir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");

let data: TreeFile[] = [];
beforeAll(async () => {
    data = await readTree(fixtureDir);
});

function file(path: string, text: string): TreeFile {
    return { path, content: new TextEncoder().encode(text) };
}

function dataFile(path: string): TreeFile {
    const found = data.find((entry) => entry.path === path);
    if (found == null) {
        throw new Error(`${path} is not in the fixture`);
    }
    return found;
}

const cleanChunk = file(
    "assets/index-abc.js",
    'const a=[[1,2],[3,4]];export{a};const b={n:1,date:"2026-06-18"};',
);

describe("readTree", () => {
    it("lists the fixture by paths inside it", () => {
        expect(data.map((entry) => entry.path).sort()).toEqual([
            "gb/meta.json",
            "gb/puzzles.json",
            "gb/stations.json",
            "gb/to/fxa.json",
            "gb/to/htl.json",
            "nl/meta.json",
            "nl/puzzles.json",
            "nl/stations.json",
            "nl/to/alf.json",
            "nl/to/brv.json",
            "nl/to/chr.json",
            "nl/to/dlt.json",
            "nl/to/ech.json",
        ]);
    });
});

describe("findDataLeaks", () => {
    it("finds nothing in output without data", () => {
        expect(
            findDataLeaks(data, [
                cleanChunk,
                file("assets/styles.css", "body{color:red}"),
                { path: "assets/font.woff2", content: new Uint8Array([1, 2, 3]) },
            ]),
        ).toEqual([]);
    });

    it("finds a data file copied into the output under another name", () => {
        const copy = { ...dataFile("nl/to/alf.json"), path: "assets/x.json" };

        expect(findDataLeaks(data, [copy])).toEqual([
            "assets/x.json is a copy of nl/to/alf.json",
        ]);
    });

    it("finds a file that carries a data file's name", () => {
        expect(findDataLeaks(data, [file("data/nl/to/brv.json", "{}")])).toEqual([
            "data/nl/to/brv.json has the name of nl/to/brv.json",
        ]);
        expect(findDataLeaks(data, [file("stations.json", "[]")])).toEqual([
            "stations.json has the name of gb/stations.json",
        ]);
    });

    it("finds a JSON import inlined into a chunk as a JS object", () => {
        // How rolldown inlines `import trips from ".../to/alf.json"`.
        const chunk = file(
            "assets/index-def.js",
            'var e={brv:[["IC",20]],chr:[["SPR",15]],dlt:[["SPR",12],["chr",4],["SPR",15]],ech:[["ICD",30]]};',
        );

        expect(findDataLeaks(data, [chunk])).toEqual([
            "assets/index-def.js holds a trip (brv:[[IC,20]]) of nl/to/alf.json",
        ]);
    });

    it("finds a JSON import inlined as an escaped string", () => {
        const text = JSON.stringify(
            JSON.parse(new TextDecoder().decode(dataFile("nl/meta.json").content)),
        );
        const chunk = file("assets/m.js", `JSON.parse(${JSON.stringify(text)})`);

        expect(findDataLeaks(data, [chunk])).toEqual([
            "assets/m.js holds its contents of nl/meta.json",
        ]);
    });

    it("finds a single puzzle of the schedule", () => {
        const chunk = file(
            "assets/p.js",
            'const today={n:2,date:"2026-06-19",station:"ech"};',
        );

        expect(findDataLeaks(data, [chunk])).toEqual([
            "assets/p.js holds an entry ({n:2,date:2026-06-19,station:ech}) of nl/puzzles.json",
        ]);
    });

    it("finds a known trip with a change on its own", () => {
        const chunk = file(
            "index.html",
            '<script>window.t=[["SPR",12],["chr",4],["SPR",15]]</script>',
        );

        expect(findDataLeaks(data, [chunk])).toEqual([
            "index.html holds a trip ([[SPR,12],[chr,4],[SPR,15]]) of nl/to/alf.json",
        ]);
    });

    it("ignores a direct trip without its origin code", () => {
        expect(
            findDataLeaks(data, [file("assets/d.js", 'const d=[["IC",20]];')]),
        ).toEqual([]);
    });
});
