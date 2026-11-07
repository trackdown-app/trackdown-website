import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { apiErrorBodySchema } from "@/lib/api/api-error";
import type { RestHandler } from "@/lib/api/rest";
import {
    metaHandlers,
    todayPuzzleHandlers,
    unknownOperationHandlers,
} from "@/lib/api/v1-handlers";
import { metaOutputSchema, todayPuzzleOutputSchema } from "@/lib/game/schemas";
import { serviceContext } from "@/lib/game/service-context";

// The REST routes over the fixture, never the real data: the services get
// a context that reads `fixtures/trackdown-data/`.
vi.mock("@/lib/game/service-context", async () => {
    const { createGameData } = await import("@/lib/data/game-data");
    const { readDataDir } = await import("@/lib/data/read-data-dir");
    const dir = resolve(import.meta.dirname, "../../../fixtures/trackdown-data");
    return {
        serviceContext: {
            data: createGameData(readDataDir(dir)),
            dataRef: "abc123",
            // The fixture's puzzle 2.
            now: () => new Date("2026-06-19T12:00:00.000Z"),
        },
    };
});

/** Calls `handler` the way Start does, with a request for `path`. */
function call(
    handler: RestHandler,
    path: string,
    method = "GET",
    params: Record<string, string> = {},
): Promise<Response> {
    return handler({
        request: new Request(new URL(path, "http://localhost"), { method }),
        params,
    });
}

describe("GET /api/v1/meta", () => {
    it("answers 200 with the service's answer as JSON", async () => {
        const response = await call(metaHandlers.GET, "/api/v1/meta");

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain("application/json");
        const body = metaOutputSchema.parse(await response.json());
        expect(body).toMatchObject({
            network: "nl",
            dataRef: "abc123",
            feed: "fixture",
        });
    });

    it("reads the network from the query string", async () => {
        const response = await call(metaHandlers.GET, "/api/v1/meta?network=nl");

        expect(response.status).toBe(200);
    });

    it("answers 400 invalid_input for a network the game has no data for", async () => {
        const response = await call(metaHandlers.GET, "/api/v1/meta?network=be");

        expect(response.status).toBe(400);
        const body = apiErrorBodySchema.parse(await response.json());
        expect(body.error.code).toBe("invalid_input");
        expect(body.error.message).toContain("network");
    });

    it("answers 500 internal_error without the error's own message", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(serviceContext.data, "meta").mockRejectedValue(
            new Error("nl/meta.json is missing from the data directory"),
        );

        const response = await call(metaHandlers.GET, "/api/v1/meta");

        expect(response.status).toBe(500);
        const body = apiErrorBodySchema.parse(await response.json());
        expect(body.error.code).toBe("internal_error");
        expect(body.error.message).not.toContain("meta.json");
    });

    it("answers 405 method_not_allowed for another method", async () => {
        const response = await call(metaHandlers.ANY, "/api/v1/meta", "POST");

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("GET");
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "method_not_allowed",
        );
    });
});

describe("GET /api/v1/{network}/puzzles/today", () => {
    const path = "/api/v1/nl/puzzles/today";

    it("answers 200 with today's puzzle, without its station", async () => {
        const response = await call(todayPuzzleHandlers.GET, path, "GET", {
            network: "nl",
        });

        expect(response.status).toBe(200);
        const json: unknown = await response.json();
        expect(todayPuzzleOutputSchema.parse(json)).toEqual({
            network: "nl",
            number: 2,
            date: "2026-06-19",
            maxGuesses: 6,
            nextPuzzleAt: "2026-06-19T22:00:00.000Z",
        });
        // Puzzle 2's mystery station.
        expect(JSON.stringify(json)).not.toContain("ech");
    });

    it("answers 400 invalid_input for a network the game has no data for", async () => {
        const response = await call(
            todayPuzzleHandlers.GET,
            "/api/v1/be/puzzles/today",
            "GET",
            { network: "be" },
        );

        expect(response.status).toBe(400);
        const body = apiErrorBodySchema.parse(await response.json());
        expect(body.error.code).toBe("invalid_input");
        expect(body.error.message).toContain("network");
    });

    it("takes the network from the path, not the query string", async () => {
        const response = await call(
            todayPuzzleHandlers.GET,
            `${path}?network=be`,
            "GET",
            { network: "nl" },
        );

        expect(response.status).toBe(200);
    });

    it("answers 404 not_found on a day without a puzzle", async () => {
        vi.spyOn(serviceContext, "now").mockReturnValue(
            new Date("2030-01-01T12:00:00.000Z"),
        );

        const response = await call(todayPuzzleHandlers.GET, path, "GET", {
            network: "nl",
        });

        expect(response.status).toBe(404);
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "not_found",
        );
    });

    it("answers 405 method_not_allowed for another method", async () => {
        const response = await call(todayPuzzleHandlers.ANY, path, "POST", {
            network: "nl",
        });

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("GET");
    });
});

describe("an unknown path under /api/v1", () => {
    it("answers 404 not_found in the API's error format", async () => {
        const response = await call(
            unknownOperationHandlers.ANY,
            "/api/v1/stations",
        );

        expect(response.status).toBe(404);
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "not_found",
        );
    });
});
