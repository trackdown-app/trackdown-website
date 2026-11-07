import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Validator } from "@seriousme/openapi-schema-validator";
import { describe, expect, it, vi } from "vitest";
import { apiErrorCodeSchema } from "@/lib/api/api-error";
import {
    buildOpenApiDocument,
    openApiDocument,
    openApiPath,
} from "@/lib/api/openapi";
import { openApiHandlers } from "@/lib/api/v1-handlers";

const root = resolve(import.meta.dirname, "../../..");
const routesDir = join(root, "src/routes/api/v1");

/** Every route file under `src/routes/api/v1`, recursively. */
function routeFiles(dir: string): ReadonlyArray<string> {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? routeFiles(path) : [path];
    });
}

/**
 * A route file's path as OpenAPI writes it: `$network/puzzles/index.ts` is
 * `/api/v1/{network}/puzzles`, `openapi[.]json.ts` is `/api/v1/openapi.json`.
 */
function openApiPathOf(file: string): string {
    const segments = relative(routesDir, file)
        .replace(/\.ts$/, "")
        .split("/")
        .filter((segment) => segment !== "index")
        .map((segment) =>
            segment.startsWith("$")
                ? `{${segment.slice(1)}}`
                : segment.replaceAll("[.]", "."),
        );
    return ["/api/v1", ...segments].join("/");
}

/** The operations of the document's path `path`. */
function pathItem(path: string): Record<string, unknown> {
    const paths = openApiDocument["paths"];
    if (typeof paths !== "object" || paths == null || !(path in paths)) {
        throw new Error(`no path ${path}`);
    }
    const item: unknown = Object.entries(paths).find(([key]) => key === path)?.[1];
    if (typeof item !== "object" || item == null) {
        throw new Error(`no path ${path}`);
    }
    return Object.fromEntries(Object.entries(item));
}

/** The methods of the document's path `path`, sorted. */
function methods(path: string): ReadonlyArray<string> {
    return Object.keys(pathItem(path)).sort();
}

describe("the OpenAPI document", () => {
    it("validates as OpenAPI 3.1", async () => {
        const validator = new Validator();
        const result = await validator.validate(buildOpenApiDocument());

        expect(result.errors).toBeUndefined();
        expect(result.valid).toBe(true);
        expect(validator.version).toBe("3.1");
    });

    it("resolves every $ref", () => {
        const text = JSON.stringify(openApiDocument);
        const refs = [...text.matchAll(/"\$ref":"#\/components\/(\w+)\/(\w+)"/g)];

        expect(refs.length).toBeGreaterThan(0);
        const components = openApiDocument["components"];
        for (const [ref, kind, name] of refs) {
            expect(kind, ref).toBeDefined();
            expect(name, ref).toBeDefined();
            expect(components).toHaveProperty([kind ?? "", name ?? ""]);
        }
    });

    it("covers every route under /api/v1, and nothing else", () => {
        const routed = routeFiles(routesDir)
            .filter((file) => !file.endsWith("/$.ts"))
            .map(openApiPathOf)
            .sort();
        const documented = Object.keys(openApiDocument["paths"] ?? {}).sort();

        expect(documented).toEqual(routed);
        expect(routed).toContain(openApiPath);
    });

    it("gives every route the methods of its handlers", () => {
        expect(methods("/api/v1/meta")).toEqual(["get"]);
        expect(methods("/api/v1/{network}/puzzles/today")).toEqual(["get"]);
        expect(methods("/api/v1/{network}/puzzles")).toEqual(["get"]);
        expect(methods("/api/v1/{network}/puzzles/{number}/guesses")).toEqual([
            "post",
        ]);
        expect(methods("/api/v1/{network}/puzzles/{number}/reveal")).toEqual([
            "post",
        ]);
        expect(methods("/api/v1/{network}/stations")).toEqual(["get"]);
        expect(methods(openApiPath)).toEqual(["get"]);
    });

    it("gives every error code a response with the ApiError body", () => {
        const text = JSON.stringify(openApiDocument["components"]);

        for (const code of apiErrorCodeSchema.options) {
            expect(text, code).toContain(`\`${code}\``);
        }
        expect(pathItem("/api/v1/{network}/puzzles/{number}/reveal")).toHaveProperty(
            ["post", "responses", "429", "$ref"],
            "#/components/responses/TooManyRequests",
        );
        expect(pathItem("/api/v1/meta")).toHaveProperty(
            ["get", "responses", "403", "$ref"],
            "#/components/responses/Forbidden",
        );
        expect(pathItem("/api/v1/meta")).toHaveProperty(
            ["get", "responses", "401", "$ref"],
            "#/components/responses/Unauthorized",
        );
        expect(pathItem(openApiPath)).not.toHaveProperty([
            "get",
            "responses",
            "401",
        ]);
    });

    it("asks every operation but the document's for the client's two headers", () => {
        expect(openApiDocument["security"]).toEqual([
            { ClientKey: [], AppVersion: [] },
        ]);
        expect(openApiDocument).toHaveProperty(
            ["components", "securitySchemes", "ClientKey", "name"],
            "Trackdown-Client-Key",
        );
        expect(openApiDocument).toHaveProperty(
            ["components", "securitySchemes", "AppVersion", "name"],
            "Trackdown-App-Version",
        );
        expect(pathItem(openApiPath)).toHaveProperty(["get", "security"], []);
    });

    it("lets a client take a new field: no schema forbids extra properties", () => {
        expect(JSON.stringify(openApiDocument)).not.toContain(
            '"additionalProperties":false',
        );
    });

    it("is what openapi/v1.json holds (run `bun run openapi`)", () => {
        const committed = readFileSync(join(root, "openapi/v1.json"), "utf8");

        expect(committed).toBe(`${JSON.stringify(openApiDocument, null, 2)}\n`);
    });
});

describe(`GET ${openApiPath}`, () => {
    it("answers the document without a client key, kept until the next deploy", async () => {
        vi.stubEnv("TRACKDOWN_CLIENT_KEYS", undefined);

        const response = await openApiHandlers.GET({
            request: new Request(new URL(openApiPath, "http://localhost")),
            params: {},
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain("application/json");
        expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
            "public, max-age=31536000",
        );
        expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
        expect(await response.json()).toEqual(openApiDocument);
    });
});
