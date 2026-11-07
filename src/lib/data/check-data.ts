import "@tanstack/react-start/server-only";
import { MissingDataFileError } from "@/lib/data/game-data";
import type { GameData } from "@/lib/data/game-data";
import type { NetworkId } from "@/lib/data/networks";

/**
 * Reads every file of `network` through the loader and lists what is wrong:
 * files that are missing or do not match their schema, and references the
 * schemas cannot see on their own (a puzzle's station that is not a station,
 * a puzzle's station with no `to/` file, a trips file that misses an
 * origin). Only the mystery stations have a `to/` file (in `gb` about one in
 * six stations, in `nl` all of them), so a station without one is fine
 * unless a puzzle is that station; `meta.json` counts the files there are.
 * An empty list means the data is good.
 */
export async function checkNetwork(
    data: GameData,
    network: NetworkId,
): Promise<string[]> {
    const problems: string[] = [];
    async function attempt<T>(load: () => Promise<T>): Promise<T | null> {
        try {
            return await load();
        } catch (error) {
            problems.push(error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    const [stations, puzzles, meta] = await Promise.all([
        attempt(() => data.stations(network)),
        attempt(() => data.puzzles(network)),
        attempt(() => data.meta(network)),
    ]);
    if (stations == null) {
        return problems;
    }

    const codes = new Set(stations.map((station) => station.code));
    if (meta != null && meta.stations !== stations.length) {
        problems.push(
            `meta.json counts ${meta.stations} stations, stations.json has ${stations.length}`,
        );
    }
    const puzzleStations = new Set<string>();
    for (const puzzle of puzzles ?? []) {
        puzzleStations.add(puzzle.station);
        if (!codes.has(puzzle.station)) {
            problems.push(
                `puzzle ${puzzle.n} (${puzzle.date}) is station "${puzzle.station}", which is not in stations.json`,
            );
        }
    }

    let tripsFiles = 0;
    for (const station of stations) {
        const trips = await attempt(async () => {
            try {
                const read = await data.tripsTo(network, station.code);
                tripsFiles += 1;
                return read;
            } catch (error) {
                if (error instanceof MissingDataFileError) {
                    if (!puzzleStations.has(station.code)) {
                        return null;
                    }
                } else {
                    // There, but not what the schema asks for.
                    tripsFiles += 1;
                }
                throw error;
            }
        });
        if (trips == null) {
            continue;
        }
        const missing = stations.filter(
            (origin) => origin.code !== station.code && trips[origin.code] == null,
        );
        if (missing.length > 0) {
            problems.push(
                `to/${station.code}.json has no trip from ${missing.map((origin) => origin.code).join(", ")}`,
            );
        }
    }
    if (meta != null && meta.mysteryStations !== tripsFiles) {
        problems.push(
            `meta.json counts ${meta.mysteryStations} mystery stations, to/ has ${tripsFiles} trips files`,
        );
    }
    return problems;
}
