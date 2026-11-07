import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openApiDocument } from "@/lib/api/openapi";

// Writes the OpenAPI document of `/api/v1` to `openapi/v1.json`
// (docs/api.md#the-openapi-document): `bun run openapi`. With `--check` it
// writes nothing and exits with 1 when the committed file is not what the
// schemas generate, as CI does.

const openApiFile = resolve(import.meta.dirname, "../openapi/v1.json");

const generated = `${JSON.stringify(openApiDocument, null, 2)}\n`;

if (process.argv.includes("--check")) {
    let committed = "";
    try {
        committed = readFileSync(openApiFile, "utf8");
    } catch {
        // A missing file is out of date too.
    }
    if (committed !== generated) {
        console.error(
            "openapi/v1.json is out of date: run `bun run openapi` and commit it.",
        );
        process.exit(1);
    }
    console.info("openapi/v1.json is up to date.");
} else {
    writeFileSync(openApiFile, generated);
    console.info("Wrote openapi/v1.json.");
}
