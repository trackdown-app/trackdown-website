import { resolve } from "node:path";
import { checkNetwork } from "@/lib/data/check-data";
import { createGameData } from "@/lib/data/game-data";
import { networkIds } from "@/lib/data/networks";
import { readDataDir } from "@/lib/data/read-data-dir";

// Checks a data directory with the loader's own schemas (docs/data.md#checking-the-data):
// `bun run data:check [dir]`. The directory defaults to `TRACKDOWN_DATA_DIR`,
// which Bun reads from `.env.local` like Vite does. Exits with 1 when any
// network has a problem.

const dir = process.argv[2] ?? process.env["TRACKDOWN_DATA_DIR"];
if (dir == null || dir === "") {
    console.error("No data directory: pass one or set TRACKDOWN_DATA_DIR.");
    process.exit(1);
}

const data = createGameData(readDataDir(resolve(dir)));
let failed = false;
for (const network of networkIds) {
    const problems = await checkNetwork(data, network);
    if (problems.length > 0) {
        failed = true;
        console.error(`${network}: ${problems.length} problem(s)`);
        for (const problem of problems) {
            console.error(`- ${problem}`);
        }
    } else {
        const stations = await data.stations(network);
        const puzzles = await data.puzzles(network);
        console.info(
            `${network}: ${stations.length} stations, ${puzzles.length} puzzles, all valid`,
        );
    }
}
process.exit(failed ? 1 : 0);
