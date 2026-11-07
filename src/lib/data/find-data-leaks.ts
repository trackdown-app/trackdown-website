import { createHash } from "node:crypto";
import { basename, extname } from "node:path";

/** A file by its path, relative to the folder it was read from. */
export interface TreeFile {
    path: string;
    content: Uint8Array;
}

// The output files that are read as text: what a browser runs or reads.
// Fonts and images are only compared by name and bytes.
const textExtensions = new Set([
    ".js",
    ".mjs",
    ".cjs",
    ".css",
    ".html",
    ".json",
    ".map",
    ".txt",
    ".svg",
    ".xml",
    ".webmanifest",
]);

// A trip as a bracketed list of `[string, number]` pairs, optionally with the
// origin code in front as an object key: `brv:[[IC,20]]`. Runs on normalized
// text, so it holds no quotes or whitespace.
const tripPattern = /([a-z0-9]+:)?(\[\[[^[\]]*\](?:,\[[^[\]]*\])*\])/g;
// An object with no nested objects, such as a puzzle or a station.
const objectPattern = /\{[^{}]*\}/g;

/**
 * Drops whitespace, quotes and backslashes, so a value reads the same as JSON
 * (`{"n":1}`), as a JS object literal (`{n:1}`), pretty-printed or inside an
 * escaped string (`JSON.parse('{\"n\":1}')`).
 */
function normalize(text: string): string {
    return text.replace(/[\s"'`\\]/g, "");
}

function hash(content: Uint8Array): string {
    return createHash("sha256").update(content).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

interface Needles {
    /** Data path by the hash of its bytes. */
    byHash: Map<string, string>;
    /** Data path by its path inside a network folder (`to/alf.json`). */
    byName: Map<string, string>;
    /** Data path by a whole file, normalized. */
    wholeFiles: Map<string, string>;
    /** Data path by a puzzle or station entry, normalized. */
    objects: Map<string, string>;
    /** Data path by a trip with at least one change, normalized. */
    trips: Map<string, string>;
    /** Data path by `origin:trip`, normalized: a trips file's station codes. */
    keyedTrips: Map<string, string>;
}

function collectNeedles(data: TreeFile[]): Needles {
    const needles: Needles = {
        byHash: new Map(),
        byName: new Map(),
        wholeFiles: new Map(),
        objects: new Map(),
        trips: new Map(),
        keyedTrips: new Map(),
    };
    for (const file of data) {
        needles.byHash.set(hash(file.content), file.path);
        // `nl/to/alf.json` is `to/alf.json` inside its network's folder.
        const inNetwork = file.path.split("/").slice(1).join("/");
        needles.byName.set(inNetwork !== "" ? inNetwork : file.path, file.path);

        if (extname(file.path) !== ".json") {
            continue;
        }
        const value: unknown = JSON.parse(new TextDecoder().decode(file.content));
        const isTrips = file.path.split("/").includes("to");
        if (!isTrips) {
            needles.wholeFiles.set(normalize(JSON.stringify(value)), file.path);
        }
        if (Array.isArray(value)) {
            for (const entry of value) {
                if (isRecord(entry)) {
                    needles.objects.set(normalize(JSON.stringify(entry)), file.path);
                }
            }
        }
        if (isTrips && isRecord(value)) {
            for (const [origin, trip] of Object.entries(value)) {
                const text = normalize(JSON.stringify(trip));
                needles.keyedTrips.set(`${origin}:${text}`, file.path);
                // A direct trip (`[[IC,20]]`) is too short to tell from code.
                if (Array.isArray(trip) && trip.length >= 3) {
                    needles.trips.set(text, file.path);
                }
            }
        }
    }
    return needles;
}

function findInText(text: string, needles: Needles): Map<string, string> {
    const found = new Map<string, string>();
    const haystack = normalize(text);
    for (const [needle, dataPath] of needles.wholeFiles) {
        if (haystack.includes(needle)) {
            found.set(dataPath, "its contents");
        }
    }
    for (const match of haystack.matchAll(objectPattern)) {
        const dataPath = needles.objects.get(match[0]);
        if (dataPath != null && !found.has(dataPath)) {
            found.set(dataPath, `an entry (${match[0]})`);
        }
    }
    for (const match of haystack.matchAll(tripPattern)) {
        const key = match[1] ?? "";
        const trip = match[2] ?? "";
        const keyed = needles.keyedTrips.get(`${key}${trip}`);
        const dataPath = keyed ?? needles.trips.get(trip);
        if (dataPath != null && !found.has(dataPath)) {
            found.set(dataPath, `a trip (${key}${trip})`);
        }
    }
    return found;
}

/**
 * Lists every place a game data file shows up in a build's static output
 * (docs/data.md#the-build-guard): a file of the same name or the same bytes,
 * or, in a text file such as a client chunk, the data file's contents, one of
 * its puzzles or stations, or one of its trips. `data` is a trackdown-data
 * `data/` folder, by paths such as `nl/to/alf.json`; `output` is the static
 * output. An empty list means the output holds no data.
 */
export function findDataLeaks(data: TreeFile[], output: TreeFile[]): string[] {
    const needles = collectNeedles(data);
    const leaks: string[] = [];
    for (const file of output) {
        const byHash = needles.byHash.get(hash(file.content));
        if (byHash != null) {
            leaks.push(`${file.path} is a copy of ${byHash}`);
            continue;
        }
        const byName = [...needles.byName].find(
            ([name]) => file.path === name || file.path.endsWith(`/${name}`),
        );
        if (byName != null) {
            leaks.push(`${file.path} has the name of ${byName[1]}`);
            continue;
        }
        if (!textExtensions.has(extname(basename(file.path)))) {
            continue;
        }
        const text = new TextDecoder().decode(file.content);
        for (const [dataPath, what] of findInText(text, needles)) {
            leaks.push(`${file.path} holds ${what} of ${dataPath}`);
        }
    }
    return leaks;
}
