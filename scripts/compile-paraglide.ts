import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { compile } from "@inlang/paraglide-js";
import { paraglideCompilerOptions } from "../paraglide.config.ts";

// Generates `src/paraglide/` outside of Vite. Runs on `postinstall` (editor
// support right after a clone) and as the first step of `typecheck`, `lint`
// and `test`, since CI restores only `node_modules` from cache and would
// otherwise check out a tree without the generated output.
//
// The compile is skipped when the stamp the last finished compile wrote still
// matches both its inputs and its output. `--force` always compiles.

const { project, outdir } = paraglideCompilerOptions;
const settingsFile = join(project, "settings.json");

/** Written after a compile finishes, never before, so a cut-off compile leaves no matching stamp. */
const stampFile = join("node_modules", ".cache", "paraglide-compile.json");

type Stamp = { inputs: string; output: string };

type Settings = { locales: string[]; pathPattern: string };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStamp(value: unknown): Stamp {
    if (
        !isRecord(value) ||
        typeof value["inputs"] !== "string" ||
        typeof value["output"] !== "string"
    ) {
        throw new Error(`${stampFile} is not a stamp`);
    }
    return { inputs: value["inputs"], output: value["output"] };
}

function parseSettings(value: unknown): Settings {
    if (!isRecord(value)) {
        throw new Error(`${settingsFile} must contain an object`);
    }
    const locales = value["locales"];
    const messageFormat = value["plugin.inlang.messageFormat"];
    if (
        !Array.isArray(locales) ||
        !locales.every((locale) => typeof locale === "string") ||
        !isRecord(messageFormat) ||
        typeof messageFormat["pathPattern"] !== "string"
    ) {
        throw new Error(`${settingsFile} lacks locales or a pathPattern`);
    }
    return { locales, pathPattern: messageFormat["pathPattern"] };
}

/**
 * Every file the output is made from: the project settings, the message
 * file of each locale (where the settings put them), the compiler options,
 * and the lockfile, which changes with the Paraglide version.
 */
async function inputFiles(): Promise<string[]> {
    const { locales, pathPattern } = parseSettings(
        JSON.parse(await readFile(settingsFile, "utf8")),
    );
    return [
        settingsFile,
        ...locales.map((locale) =>
            join(dirname(project), pathPattern.replace("{locale}", locale)),
        ),
        "paraglide.config.ts",
        "bun.lock",
    ];
}

/** A hash of the inputs' contents. */
async function inputsHash(): Promise<string> {
    const hash = createHash("sha256");
    for (const file of await inputFiles()) {
        hash.update(file)
            .update("\0")
            .update(await readFile(file))
            .update("\0");
    }
    return hash.digest("hex");
}

/**
 * A hash of every output file's path, size and modification time. Any other
 * writer changes it: the Vite plugin, which writes another layout outside
 * production builds (`locale-modules`), or a compile cut off halfway.
 */
async function outputHash(): Promise<string> {
    const files = (await readdir(outdir, { recursive: true })).sort();
    const hash = createHash("sha256");
    for (const file of files) {
        const info = await stat(join(outdir, file));
        if (info.isFile()) {
            hash.update(`${file}:${info.size}:${info.mtimeMs}\n`);
        }
    }
    return hash.digest("hex");
}

/** Whether the last finished compile's stamp matches the inputs and the output as they are now. */
async function isFresh(inputs: string): Promise<boolean> {
    try {
        const stamp = parseStamp(JSON.parse(await readFile(stampFile, "utf8")));
        return stamp.inputs === inputs && stamp.output === (await outputHash());
    } catch {
        // No stamp, no output, or an unreadable one: compile.
        return false;
    }
}

/**
 * The inputs' hash, or `undefined` when they cannot be read. Then the
 * compile runs, writes no stamp, and reports the actual problem.
 */
async function currentInputs(): Promise<string | undefined> {
    try {
        return await inputsHash();
    } catch {
        return undefined;
    }
}

// Hashed before compiling, so an input saved during the compile does not
// match the stamp and the next run compiles again.
const inputs = await currentInputs();
const force = process.argv.includes("--force");
if (force || inputs == null || !(await isFresh(inputs))) {
    await compile(paraglideCompilerOptions);
    if (inputs != null) {
        const stamp: Stamp = { inputs, output: await outputHash() };
        await mkdir(dirname(stampFile), { recursive: true });
        await writeFile(stampFile, JSON.stringify(stamp));
    }
}
