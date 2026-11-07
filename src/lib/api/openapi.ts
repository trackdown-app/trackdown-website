import { z } from "zod";
import {
    apiErrorBodySchema,
    apiErrorCodeSchema,
    apiErrorStatus,
} from "@/lib/api/api-error";
import type { ApiErrorCode } from "@/lib/api/api-error";
import { trainTypeSchema } from "@/lib/data/data-schema";
import { networkIdSchema } from "@/lib/data/networks";
import {
    archivedPuzzleSchema,
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
    /** Kept by the CDN until the next deploy (docs/api.md#caching). */
    cached?: true;
    errors: ReadonlyArray<ApiErrorCode>;
};

const operations: ReadonlyArray<Operation> = [
    {
        method: "get",
        path: "/api/v1/meta",
        operationId: "getMeta",
        summary: "The network's data: its source, service dates and counts",
        input: metaInputSchema,
        output: metaOutputSchema,
        errors: ["invalid_input", "internal_error"],
    },
    {
        method: "get",
        path: "/api/v1/{network}/puzzles/today",
        operationId: "getTodayPuzzle",
        summary: "Today's puzzle, without its answer",
        input: todayPuzzleInputSchema,
        output: todayPuzzleOutputSchema,
        errors: ["invalid_input", "not_found", "internal_error"],
    },
    {
        method: "get",
        path: "/api/v1/{network}/puzzles",
        operationId: "getPuzzleArchive",
        summary: "Every puzzle up to today's, oldest first, without answers",
        input: puzzleArchiveInputSchema,
        output: puzzleArchiveOutputSchema,
        errors: ["invalid_input", "internal_error"],
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
        errors: ["invalid_input", "not_found", "internal_error"],
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
        errors: ["invalid_input", "game_not_over", "not_found", "internal_error"],
    },
    {
        method: "get",
        path: "/api/v1/{network}/stations",
        operationId: "getStations",
        summary: "Every station a player can guess, sorted by name",
        input: stationsInputSchema,
        output: stationsOutputSchema,
        cached: true,
        errors: ["invalid_input", "internal_error"],
    },
];

/** The response component of each error code. */
const errorResponseName: Record<ApiErrorCode, string> = {
    invalid_input: "InvalidInput",
    game_not_over: "GameNotOver",
    not_found: "NotFound",
    method_not_allowed: "MethodNotAllowed",
    internal_error: "InternalError",
};

const errorDescription: Record<ApiErrorCode, string> = {
    invalid_input: "The input does not match the operation's schema.",
    game_not_over: "A reveal before the game is over.",
    not_found: "A puzzle that does not exist, or one after today's.",
    method_not_allowed: "A method other than the operation's.",
    internal_error: "Something went wrong on the server.",
};

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
            description: operation.cached
                ? "The answer. Kept by clients for a day and by the CDN until the next deploy."
                : "The answer. Never kept (`Cache-Control: no-store`).",
            content: jsonContent({ $ref: componentRef(outputId(operation.output)) }),
        },
    };
    for (const code of operation.errors) {
        responses[String(apiErrorStatus[code])] = {
            $ref: `#/components/responses/${errorResponseName[code]}`,
        };
    }

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
            responses: {
                "200": {
                    description: "The OpenAPI document of `/api/v1`.",
                    content: jsonContent({ type: "object" }),
                },
            },
        },
    };

    const responses = Object.fromEntries(
        apiErrorCodeSchema.options.map((code) => [
            errorResponseName[code],
            {
                description: `\`${code}\`: ${errorDescription[code]}`,
                content: jsonContent({ $ref: componentRef("ApiError") }),
            },
        ]),
    );

    return {
        openapi: "3.1.0",
        info: {
            title: "Trackdown API",
            version: "1",
            description:
                "The API the Trackdown iOS app plays the daily puzzle through. Every error answers `ApiError` with the status of its code. See docs/api.md in trackdown-website.",
        },
        paths,
        components: {
            schemas: Object.fromEntries(
                Object.entries(components).sort(([a], [b]) => a.localeCompare(b)),
            ),
            responses,
        },
    };
}

/** The document, built once. */
export const openApiDocument = buildOpenApiDocument();
