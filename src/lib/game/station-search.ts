import type { StationsOutput } from "@/lib/game/schemas";

// The station search's matching (docs/station-search.md#matching). Holds no
// data, so it may be imported anywhere, the browser included.

/** A station the search offers: the `stations` operation's answer, one row. */
export type StationOption = StationsOutput["stations"][number];

/** Where a query matched a station's name, as offsets into the name. */
export type NameMatch = {
    start: number;
    end: number;
};

/**
 * `text` folded for comparison: lower case, diacritics dropped, and every
 * run of characters that are neither letters nor digits one space. Keeps,
 * per folded character, the offsets of the original characters it came
 * from, so a match in the folded text maps back onto the original.
 */
function fold(text: string): { folded: string; from: number[]; to: number[] } {
    let folded = "";
    const from: number[] = [];
    const to: number[] = [];
    let offset = 0;
    for (const char of text) {
        const end = offset + char.length;
        const plain = char
            .normalize("NFD")
            .replace(/\p{M}/gu, "")
            .toLocaleLowerCase("nl");
        if (/^[\p{L}\p{N}]+$/u.test(plain)) {
            for (const part of plain) {
                folded += part;
                from.push(offset);
                to.push(end);
            }
        } else if (folded.length > 0 && !folded.endsWith(" ")) {
            folded += " ";
            from.push(offset);
            to.push(end);
        }
        offset = end;
    }
    if (folded.endsWith(" ")) {
        folded = folded.slice(0, -1);
        from.pop();
        to.pop();
    }
    return { folded, from, to };
}

/** `text` as the search compares it: case, diacritics and punctuation folded. */
export function foldForSearch(text: string): string {
    return fold(text).folded;
}

/**
 * Where `query` matches `name`: at the start of any word, ignoring case,
 * diacritics and punctuation. The earliest such word wins. `null` when it
 * matches no word start, or when the query is empty once folded.
 */
export function matchName(name: string, query: string): NameMatch | null {
    const folded = fold(query).folded;
    if (folded.length === 0) {
        return null;
    }
    const target = fold(name);
    let at = target.folded.indexOf(folded);
    while (at !== -1) {
        if (at === 0 || target.folded[at - 1] === " ") {
            const start = target.from[at];
            const end = target.to[at + folded.length - 1];
            if (start != null && end != null) {
                return { start, end };
            }
        }
        at = target.folded.indexOf(folded, at + 1);
    }
    return null;
}

/**
 * The stations `query` matches, never one in `guessed` (codes). Names that
 * start with the query come first, then names where a later word does;
 * otherwise in `stations`' order, which `stations.json` keeps by name.
 */
export function searchStations(
    stations: readonly StationOption[],
    query: string,
    guessed: ReadonlySet<string>,
): StationOption[] {
    const first: StationOption[] = [];
    const later: StationOption[] = [];
    for (const station of stations) {
        if (guessed.has(station.code)) {
            continue;
        }
        const match = matchName(station.name, query);
        if (match == null) {
            continue;
        }
        (match.start === 0 ? first : later).push(station);
    }
    return [...first, ...later];
}

/**
 * The station whose whole name is `text`, folded as the search folds it, so
 * a name typed out in full can be guessed without picking it. Never one in
 * `guessed` (codes).
 */
export function findStationByName(
    stations: readonly StationOption[],
    text: string,
    guessed: ReadonlySet<string>,
): StationOption | null {
    const folded = foldForSearch(text);
    if (folded.length === 0) {
        return null;
    }
    return (
        stations.find(
            (station) =>
                !guessed.has(station.code) && foldForSearch(station.name) === folded,
        ) ?? null
    );
}
