import "@tanstack/react-start/server-only";
import type { GameData } from "@/lib/data/game-data";
import type { NetworkId } from "@/lib/data/networks";

/**
 * Reads every file of `network` through the loader and lists what is wrong:
 * files that are missing or do not match their schema, and references the
 * schemas cannot see on their own (a puzzle's station that is not a station,
 * a station with no `to/` file). An empty list means the data is good.
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
    for (const puzzle of puzzles ?? []) {
        if (!codes.has(puzzle.station)) {
            problems.push(
                `puzzle ${puzzle.n} (${puzzle.date}) is station "${puzzle.station}", which is not in stations.json`,
            );
        }
    }

    for (const station of stations) {
        const trips = await attempt(() => data.tripsTo(network, station.code));
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
    return problems;
}
