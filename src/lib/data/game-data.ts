// Marks this module server-only: importing it from client code fails the
// build, so the game data never ships to the browser.
import "@tanstack/react-start/server-only";
import { z } from "@/lib/zod";
import {
    metaFileSchema,
    puzzlesFileSchema,
    stationsFileSchema,
    tripsFileSchema,
} from "@/lib/data/data-schema";
import type {
    Meta,
    Puzzle,
    Station,
    StationCode,
    TripsTo,
} from "@/lib/data/data-schema";
import { networks } from "@/lib/data/networks";
import type { NetworkId } from "@/lib/data/networks";

/**
 * Reads one file of the data directory, by its path inside it
 * (`nl/stations.json`), as parsed JSON. Answers `null` when the file does not
 * exist.
 */
export type DataReader = (path: string) => Promise<unknown>;

/** A data file that is missing or does not match its schema. */
export class GameDataError extends Error {
    override name = "GameDataError";
}

export type GameData = {
    stations: (network: NetworkId) => Promise<Station[]>;
    puzzles: (network: NetworkId) => Promise<Puzzle[]>;
    meta: (network: NetworkId) => Promise<Meta>;
    /**
     * The fastest trip to `code` from every other station. Only reads
     * `to/<code>.json`; a code that is not a station of the network is
     * rejected before any file is read.
     */
    tripsTo: (network: NetworkId, code: StationCode) => Promise<TripsTo>;
};

/**
 * The game data, read through `read`. Every file is read and checked once,
 * on its first use, and kept in memory for as long as the process (on Vercel,
 * the warm function instance) lives. A read that fails is tried again on the
 * next call.
 */
export function createGameData(read: DataReader): GameData {
    async function readFile<S extends z.ZodType>(
        path: string,
        schema: S,
    ): Promise<z.output<S>> {
        const value = await read(path);
        if (value == null) {
            throw new GameDataError(`${path} is missing from the data directory`);
        }
        const result = schema.safeParse(value);
        if (!result.success) {
            throw new GameDataError(
                `${path} does not match its schema:\n${z.prettifyError(result.error)}`,
            );
        }
        return result.data;
    }

    const stations = cached((network: NetworkId) =>
        readFile(`${networks[network].dataDir}/stations.json`, stationsFileSchema),
    );
    const stationCodes = cached(
        async (network: NetworkId) =>
            new Set((await stations(network)).map((station) => station.code)),
    );
    const trips = cached((path: string) => readFile(path, tripsFileSchema));

    return {
        stations,
        puzzles: cached((network: NetworkId) =>
            readFile(`${networks[network].dataDir}/puzzles.json`, puzzlesFileSchema),
        ),
        meta: cached((network: NetworkId) =>
            readFile(`${networks[network].dataDir}/meta.json`, metaFileSchema),
        ),
        tripsTo: async (network, code) => {
            // Also keeps `code` from reaching the reader as a path of its own.
            if (!(await stationCodes(network)).has(code)) {
                throw new GameDataError(
                    `"${code}" is not a station of network ${network}`,
                );
            }
            return trips(`${networks[network].dataDir}/to/${code}.json`);
        },
    };
}

/** `load`, answered from memory after its first success for each key. */
function cached<K, V>(load: (key: K) => Promise<V>): (key: K) => Promise<V> {
    const loading = new Map<K, Promise<V>>();
    return (key) => {
        let value = loading.get(key);
        if (value == null) {
            value = load(key).catch((error: unknown) => {
                loading.delete(key);
                throw error;
            });
            loading.set(key, value);
        }
        return value;
    };
}
