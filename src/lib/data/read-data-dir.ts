import "@tanstack/react-start/server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DataReader } from "@/lib/data/game-data";

/**
 * Reads the data files straight from a folder on disk, for the unit tests
 * (on the fixture) and `bun run data:check`. The server reads through Nitro's
 * storage instead (`trackdown-data.ts`).
 */
export function readDataDir(dir: string): DataReader {
    return async (path) => {
        let text: string;
        try {
            text = await readFile(join(dir, path), "utf8");
        } catch (error) {
            if (
                error instanceof Error &&
                "code" in error &&
                error.code === "ENOENT"
            ) {
                return null;
            }
            throw error;
        }
        const value: unknown = JSON.parse(text);
        return value;
    };
}
