import { z } from "@/lib/zod";
import {
    apiErrorBodySchema,
    apiErrorCodeSchema,
    apiErrorStatus,
} from "@/lib/api/api-error";
import type { ApiErrorCode } from "@/lib/api/api-error";
import { appVersionHeader, clientKeyHeader } from "@/lib/api/client-headers";
import { trainTypeSchema } from "@/lib/data/data-schema";
import { networkIdSchema } from "@/lib/data/networks";
import {
    archivedPuzzleSchema,
    earlierTripSchema,
    guessableStationSchema,
    guessChangeSchema,
    guessInputSchema,
    guessOutputSchema,
    guessRideSchema,
    metaInputSchema,
    metaOutputSchema,
    puzzleArchiveInputSchema,
    puzzleArchiveOutputSchema,
    revealedChangeSchema,
    revealedGuessSchema,
    revealInputSchema,
    revealOutputSchema,
    stationsInputSchema,
    stationsOutputSchema,
    todayPuzzleInputSchema,
    todayPuzzleOutputSchema,
} from "@/lib/game/schemas";

// The OpenAPI 3.1 document of every REST route under `/api/v1`
// (docs/api.md#the-openapi-document), generated from the same zod schemas
// the routes check their input against. The iOS app generates its client
// from it with Swift OpenAPI Generator. Holds no data and no server code.

/** Where a component schema lives in the document. */
function componentRef(id: string): string {
    return `#/components/schemas/${id}`;
}

/**
 * Every output schema the document names, by its component name. A schema
 * used in more than one place is a `$ref` to its component, so the
 * generated client has one type for it.
 */
const outputs = z.registry<{ id: string }>();
outputs.add(networkIdSchema, { id: "NetworkId" });
outputs.add(trainTypeSchema, { id: "TrainType" });
outputs.add(metaOutputSchema, { id: "Meta" });
outputs.add(todayPuzzleOutputSchema, { id: "TodayPuzzle" });
outputs.add(archivedPuzzleSchema, { id: "ArchivedPuzzle" });
outputs.add(puzzleArchiveOutputSchema, { id: "PuzzleArchive" });
outputs.add(guessRideSchema, { id: "Ride" });
outputs.add(guessChangeSchema, { id: "HiddenChange" });
outputs.add(earlierTripSchema, { id: "EarlierTrip" });
outputs.add(guessOutputSchema, { id: "GuessResult" });
outputs.add(revealedChangeSchema, { id: "Change" });
outputs.add(revealedGuessSchema, { id: "RevealedGuess" });
outputs.add(revealOutputSchema, { id: "Reveal" });
outputs.add(guessableStationSchema, { id: "Station" });
outputs.add(stationsOutputSchema, { id: "Stations" });
outputs.add(apiErrorCodeSchema, { id: "ApiErrorCode" });
outputs.add(apiErrorBodySchema, { id: "ApiError" });

/** The component name of `schema`, which must be in `outputs`. */
function outputId(schema: z.core.$ZodType): string {
    const meta = outputs.get(schema);
    if (meta == null) {
        throw new Error("An operation's output schema has no component name");
    }
    return meta.id;
}

type JsonObject = { [key: string]: unknown };

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/** Whether `tidy` leaves the field `key` of `node` out. */
function isDropped(key: string, value: unknown, node: JsonObject): boolean {
    return (
        // The document's dialect and the component's place already say these.
        key === "$schema" ||
        key === "$id" ||
        // A new field is not a break (docs/api.md#versioning), so a client
        // must not reject one.
        (key === "additionalProperties" && value === false) ||
        (key === "maximum" &&
            value === Number.MAX_SAFE_INTEGER &&
            node["type"] === "integer") ||
        (key === "pattern" &&
            (node["format"] === "date" || node["format"] === "date-time"))
    );
}

/** `{ anyOf: [{ type: "string", … }, { type: "null" }] }` as `type: ["string", "null"]`. */
function nullableAsType(node: JsonObject): JsonObject {
    const anyOf = node["anyOf"];
    if (!Array.isArray(anyOf) || anyOf.length !== 2) {
        return node;
    }
    const [inner, nul]: ReadonlyArray<unknown> = anyOf;
    if (
        !isJsonObject(inner) ||
        typeof inner["type"] !== "string" ||
        !isJsonObject(nul) ||
        nul["type"] !== "null" ||
        Object.keys(nul).length !== 1
    ) {
        return node;
    }
    const { anyOf: _anyOf, ...rest } = node;
    return { ...rest, ...inner, type: [inner["type"], "null"] };
}

/** A tuple whose items are all alike as an array of that item. */
function tupleAsArray(node: JsonObject): JsonObject {
    const prefixItems = node["prefixItems"];
    if (!Array.isArray(prefixItems) || prefixItems.length === 0) {
        return node;
    }
    const [first]: ReadonlyArray<unknown> = prefixItems;
    const alike = prefixItems.every(
        (item) => JSON.stringify(item) === JSON.stringify(first),
    );
    if (!alike) {
        return node;
    }
    const { prefixItems: _prefixItems, ...rest } = node;
    return { ...rest, items: first };
}

/** The `const` string properties of a component: a union's possible discriminators. */
function constProperties(component: unknown): Record<string, string> {
    const properties = isJsonObject(component) ? component["properties"] : null;
    if (!isJsonObject(properties)) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(properties).flatMap(([key, property]) => {
            const value = isJsonObject(property) ? property["const"] : null;
            return typeof value === "string" ? [[key, value]] : [];
        }),
    );
}

/**
 * A `oneOf` of components that each fix the same property to a `const` (a
 * zod discriminated union) with its `discriminator` and mapping, which Swift
 * OpenAPI Generator decodes by.
 */
function withDiscriminator(
    node: JsonObject,
    components: Readonly<Record<string, unknown>>,
): JsonObject {
    const oneOf = node["oneOf"];
    if (!Array.isArray(oneOf) || oneOf.length === 0) {
        return node;
    }
    const options = oneOf.map((option: unknown) => {
        const ref = isJsonObject(option) ? option["$ref"] : null;
        if (typeof ref !== "string") {
            return null;
        }
        const id = ref.slice(componentRef("").length);
        return { ref, consts: constProperties(components[id]) };
    });
    const [first] = options;
    if (first == null || options.some((option) => option == null)) {
        return node;
    }
    const key = Object.keys(first.consts).find((name) =>
        options.every((option) => option?.consts[name] != null),
    );
    if (key == null) {
        return node;
    }
    const mapping = Object.fromEntries(
        options.flatMap((option) =>
            option == null ? [] : [[option.consts[key], option.ref]],
        ),
    );
    return { ...node, discriminator: { propertyName: key, mapping } };
}

/**
 * zod's JSON Schema shaped into what Swift OpenAPI Generator reads well, and
 * what keeps an app in the App Store working as v1 grows: no
 * `additionalProperties: false`, a discriminated union with its
 * discriminator, a nullable string as `type: ["string", "null"]`, a tuple of
 * one type as an array of that type, no `pattern` beside a `format`, no
 * `maximum` at `MAX_SAFE_INTEGER`. `components` are the schemas a `$ref`
 * points at.
 */
function tidy(
    node: unknown,
    components: Readonly<Record<string, unknown>> = {},
): unknown {
    if (Array.isArray(node)) {
        return node.map((item: unknown) => tidy(item, components));
    }
    if (!isJsonObject(node)) {
        return node;
    }
    const kept: JsonObject = Object.fromEntries(
        Object.entries(node)
            .filter(([key, value]) => !isDropped(key, value, node))
            .map(([key, value]) => [key, tidy(value, components)]),
    );
    return withDiscriminator(tupleAsArray(nullableAsType(kept)), components);
}

/** An input schema as JSON Schema, as a client sends it: defaults optional. */
function inputJsonSchema(schema: z.ZodType): JsonObject {
    const json = tidy(
        z.toJSONSchema(schema, { io: "input", unrepresentable: "throw" }),
    );
    if (!isJsonObject(json)) {
        throw new Error("An input schema is not a JSON object");
    }
    return json;
}

/** One REST operation as the document describes it. */
type Operation = {
    method: "get" | "post";
    /** The OpenAPI path, `{network}` for a path parameter. */
    path: string;
    operationId: string;
    summary: string;
    /** The input; its fields named in the path are path parameters. */
    input: z.ZodObject;
    /** A `GET`'s other fields are query parameters, a `POST`'s its JSON body. */
    body?: { id: string };
    output: z.ZodType;
    /** How long a successful answer is kept (docs/api.md#caching). */
    cache: keyof typeof cacheDescription;
    /**
     * The errors of the operation itself; every operation can also answer
     * `unknown_client`, `cross_origin` and `internal_error` (`commonErrors`).
     */
    errors: ReadonlyArray<ApiErrorCode>;
};

/** The 200 answer's description, per cache. */
const cacheDescription = {
    none: "The answer. Never kept (`Cache-Control: no-store`).",
    nextPuzzle:
        "The answer. Kept by clients and the CDN until `nextPuzzleAt` (`Cache-Control: public, max-age=<seconds left>`).",
    deploy: "The answer. Kept by clients for a day and by the CDN until the next deploy.",
} as const;

/** What every REST route can answer besides its own errors. */
const commonErrors: ReadonlyArray<ApiErrorCode> = ["cross_origin", "internal_error"];

/** The input of `GET /api/v1/openapi.json`: none. */
export const openApiInputSchema = z.object({});

const operations: ReadonlyArray<Operation> = [
    {
        method: "get",
        path: "/api/v1/meta",
        operationId: "getMeta",
        summary: "The network's data: its source, service dates and counts",
        input: metaInputSchema,
        output: metaOutputSchema,
        cache: "none",
        errors: ["invalid_input"],
    },
    {
        method: "get",
        path: "/api/v1/{network}/puzzles/today",
        operationId: "getTodayPuzzle",
        summary: "Today's puzzle, without its answer",
        input: todayPuzzleInputSchema,
        output: todayPuzzleOutputSchema,
        cache: "nextPuzzle",
        errors: ["invalid_input", "not_found"],
    },
    {
        method: "get",
        path: "/api/v1/{network}/puzzles",
        operationId: "getPuzzleArchive",
        summary: "Every puzzle up to today's, oldest first, without answers",
        input: puzzleArchiveInputSchema,
        output: puzzleArchiveOutputSchema,
        cache: "none",
        errors: ["invalid_input"],
    },
    {
        method: "post",
        path: "/api/v1/{network}/puzzles/{number}/guesses",
        operationId: "submitGuess",
        summary:
            "One guess: the trip from the guessed station to the mystery station",
        input: guessInputSchema,
        body: { id: "GuessRequest" },
        output: guessOutputSchema,
        cache: "none",
        errors: ["invalid_input", "not_found", "rate_limited"],
    },
    {
        method: "post",
        path: "/api/v1/{network}/puzzles/{number}/reveal",
        operationId: "revealAnswer",
        summary:
            "Once the game is over: the mystery station and every guess's whole trip",
        input: revealInputSchema,
        body: { id: "RevealRequest" },
        output: revealOutputSchema,
        cache: "none",
        errors: ["invalid_input", "game_not_over", "not_found", "rate_limited"],
    },
    {
        method: "get",
        path: "/api/v1/{network}/stations",
        operationId: "getStations",
        summary: "Every station a player can guess, sorted by name",
        input: stationsInputSchema,
        output: stationsOutputSchema,
        cache: "deploy",
        errors: ["invalid_input"],
    },
];

const errorDescription: Record<ApiErrorCode, string> = {
    invalid_input: "the input does not match the operation's schema",
    unknown_client: `a call without an accepted \`${clientKeyHeader}\` or a valid \`${appVersionHeader}\``,
    game_not_over: "a reveal before the game is over",
    cross_origin: "a browser call from another origin",
    not_found: "a puzzle that does not exist, or one after today's",
    method_not_allowed: "a method other than the operation's",
    rate_limited:
        "past the rate limit of a guess and the reveal; `Retry-After` says in how many seconds to call again",
    internal_error: "something went wrong on the server",
};

/** The response component of each error status: several codes may share one. */
const errorResponseName: Readonly<Record<number, string>> = {
    400: "BadRequest",
    401: "Unauthorized",
    403: "Forbidden",
    404: "NotFound",
    405: "MethodNotAllowed",
    429: "TooManyRequests",
    500: "InternalServerError",
};

/** The response component of `code`'s status. */
function errorResponseOf(code: ApiErrorCode): string {
    const name = errorResponseName[apiErrorStatus[code]];
    if (name == null) {
        throw new Error(`No response component for the status of ${code}`);
    }
    return name;
}

/** Every error response component, each naming the codes of its status. */
function errorResponses(): JsonObject {
    const codes = apiErrorCodeSchema.options;
    return Object.fromEntries(
        [...new Set(codes.map(errorResponseOf))].map((name) => {
            const own = codes.filter((code) => errorResponseOf(code) === name);
            const retryAfter = own.includes("rate_limited")
                ? {
                      headers: {
                          "Retry-After": {
                              description: "Seconds until the IP may call again.",
                              required: true,
                              schema: { type: "integer", minimum: 0 },
                          },
                      },
                  }
                : {};
            return [
                name,
                {
                    description: own
                        .map((code) => `\`${code}\`: ${errorDescription[code]}.`)
                        .join(" "),
                    ...retryAfter,
                    content: jsonContent({ $ref: componentRef("ApiError") }),
                },
            ];
        }),
    );
}

/** The error responses of an operation answering `errors`, by status. */
function errorResponsesFor(errors: ReadonlyArray<ApiErrorCode>): JsonObject {
    return Object.fromEntries(
        [...errors, ...commonErrors]
            .map((code) => [apiErrorStatus[code], errorResponseOf(code)] as const)
            .sort(([a], [b]) => a - b)
            .map(([status, name]) => [
                String(status),
                { $ref: `#/components/responses/${name}` },
            ]),
    );
}

function jsonContent(schema: JsonObject): JsonObject {
    return { "application/json": { schema } };
}

/** The names in `path` between braces: its path parameters. */
function pathParameterNames(path: string): ReadonlyArray<string> {
    return [...path.matchAll(/\{(\w+)\}/g)].flatMap((match) =>
        match[1] == null ? [] : [match[1]],
    );
}

/** A field of an input as a parameter's schema: its component when it has one. */
function parameterSchema(field: z.core.$ZodType): JsonObject {
    const meta = outputs.get(field);
    if (meta != null) {
        return { $ref: componentRef(meta.id) };
    }
    if (!(field instanceof z.ZodType)) {
        throw new Error("An input field is not a zod schema");
    }
    return inputJsonSchema(field);
}

/** The `required` names of a JSON Schema object. */
function requiredNames(schema: JsonObject): ReadonlySet<string> {
    const required = schema["required"];
    return new Set(
        Array.isArray(required)
            ? required.filter((name) => typeof name === "string")
            : [],
    );
}

/** `operation`'s OpenAPI operation object, and its request body's schema. */
function operationObject(operation: Operation): {
    object: JsonObject;
    body?: [string, JsonObject];
} {
    const pathNames = pathParameterNames(operation.path);
    const shape = operation.input.shape;
    const inputSchema = inputJsonSchema(operation.input);
    const required = requiredNames(inputSchema);
    const otherNames = Object.keys(shape).filter(
        (name) => !pathNames.includes(name),
    );

    const parameters: Array<JsonObject> = [];
    for (const name of pathNames) {
        const field = shape[name];
        if (field == null) {
            throw new Error(`${operation.path}: no input field "${name}"`);
        }
        parameters.push({
            name,
            in: "path",
            required: true,
            schema: parameterSchema(field),
        });
    }

    let body: [string, JsonObject] | undefined;
    if (operation.body == null) {
        for (const name of otherNames) {
            const field = shape[name];
            if (field == null) {
                continue;
            }
            parameters.push({
                name,
                in: "query",
                required: required.has(name),
                schema: parameterSchema(field),
            });
        }
    } else {
        const properties = inputSchema["properties"];
        const bodySchema: JsonObject = {
            type: "object",
            properties: Object.fromEntries(
                otherNames.flatMap((name) => {
                    const property = isJsonObject(properties)
                        ? properties[name]
                        : null;
                    return property == null ? [] : [[name, property]];
                }),
            ),
            required: otherNames.filter((name) => required.has(name)),
        };
        body = [operation.body.id, bodySchema];
    }

    const responses: JsonObject = {
        "200": {
            description: cacheDescription[operation.cache],
            content: jsonContent({ $ref: componentRef(outputId(operation.output)) }),
        },
        ...errorResponsesFor([...operation.errors, "unknown_client"]),
    };

    const object: JsonObject = {
        operationId: operation.operationId,
        summary: operation.summary,
        ...(parameters.length > 0 ? { parameters } : {}),
        ...(body == null
            ? {}
            : {
                  requestBody: {
                      required: true,
                      content: jsonContent({ $ref: componentRef(body[0]) }),
                  },
              }),
        responses,
    };
    return body == null ? { object } : { object, body };
}

/** The path of the document itself. */
export const openApiPath = "/api/v1/openapi.json";

/** The OpenAPI 3.1 document of `/api/v1`, built from the shared schemas. */
export function buildOpenApiDocument(): JsonObject {
    const { schemas } = z.toJSONSchema(outputs, {
        uri: componentRef,
        unrepresentable: "throw",
    });
    const components: Record<string, unknown> = {};
    for (const [id, schema] of Object.entries(schemas)) {
        components[id] = tidy(schema, schemas);
    }

    const paths: Record<string, JsonObject> = {};
    for (const operation of operations) {
        const { object, body } = operationObject(operation);
        paths[operation.path] = {
            ...paths[operation.path],
            [operation.method]: object,
        };
        if (body != null) {
            components[body[0]] = body[1];
        }
    }
    paths[openApiPath] = {
        get: {
            operationId: "getOpenApiDocument",
            summary: "This document",
            // The one route anyone may call, without the client's headers.
            security: [],
            responses: {
                "200": {
                    description: `The OpenAPI document of \`/api/v1\`. ${cacheDescription.deploy.replace("The answer. ", "")}`,
                    content: jsonContent({ type: "object" }),
                },
                ...errorResponsesFor([]),
            },
        },
    };

    return {
        openapi: "3.1.0",
        info: {
            title: "Trackdown API",
            version: "1",
            description:
                "The API the Trackdown iOS app plays the daily puzzle through. Every call but this document's names the app's client key and version in two headers (`ClientKey`, `AppVersion`), else it answers `unknown_client` (401). Every error answers `ApiError` with the status of its code. See docs/api.md in trackdown-website.",
        },
        // Both headers on every operation; the document's own opts out.
        security: [{ ClientKey: [], AppVersion: [] }],
        paths,
        components: {
            schemas: Object.fromEntries(
                Object.entries(components).sort(([a], [b]) => a.localeCompare(b)),
            ),
            responses: errorResponses(),
            securitySchemes: {
                ClientKey: {
                    type: "apiKey",
                    in: "header",
                    name: clientKeyHeader,
                    description:
                        "The app's client key, one the server accepts. It names the client, it is not a secret: a key is rotated or cut off on the server (docs/api.md#client-identification).",
                },
                AppVersion: {
                    type: "apiKey",
                    in: "header",
                    name: appVersionHeader,
                    description:
                        "The app's version, `major.minor` or `major.minor.patch`, such as `1.4.2`.",
                },
            },
        },
    };
}

/** The document, built once. */
export const openApiDocument = buildOpenApiDocument();
