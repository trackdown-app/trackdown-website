import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { TreeFile } from "@/lib/data/find-data-leaks";

/**
 * Reads every file under `dir`, at any depth, with its path relative to `dir`
 * in forward slashes. For the build guard (`scripts/check-build-output.ts`).
 */
export async function readTree(dir: string): Promise<TreeFile[]> {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());
    return Promise.all(
        files.map(async (entry) => {
            const path = join(entry.parentPath, entry.name);
            return {
                path: relative(dir, path).split(sep).join("/"),
                content: await readFile(path),
            };
        }),
    );
}
