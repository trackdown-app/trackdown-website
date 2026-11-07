import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { findDataLeaks } from "@/lib/data/find-data-leaks";
import { readTree } from "@/lib/data/read-tree";

// The build guard (docs/data.md#the-build-guard): `bun run build:guard [dir]`
// after a build. Fails when any game data file, or a puzzle, station or trip
// from one, shows up in the static output: `.vercel/output/static` after
// `vercel build`, `.output/public` after a Node build, whichever exist. The
// data directory defaults to `TRACKDOWN_DATA_DIR`, like `data:check`.

const dir = process.argv[2] ?? process.env["TRACKDOWN_DATA_DIR"];
if (dir == null || dir === "") {
    console.error("No data directory: pass one or set TRACKDOWN_DATA_DIR.");
    process.exit(1);
}

const staticDirs = [".vercel/output/static", ".output/public"].filter((path) =>
    existsSync(path),
);
if (staticDirs.length === 0) {
    console.error(
        "No static output: build first (`bun run build` or `vercel build`).",
    );
    process.exit(1);
}

const data = await readTree(resolve(dir));
if (data.length === 0) {
    console.error(`${dir} holds no files, so there is nothing to look for.`);
    process.exit(1);
}

let failed = false;
for (const staticDir of staticDirs) {
    const output = await readTree(staticDir);
    const leaks = findDataLeaks(data, output);
    if (leaks.length > 0) {
        failed = true;
        console.error(`${staticDir}: game data in the static output`);
        for (const leak of leaks) {
            console.error(`- ${leak}`);
        }
    } else {
        console.info(
            `${staticDir}: ${output.length} files, none holds any of ${data.length} data files`,
        );
    }
}
process.exit(failed ? 1 : 0);
