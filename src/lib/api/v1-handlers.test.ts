import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { apiErrorBodySchema } from "@/lib/api/api-error";
import type { RestHandler } from "@/lib/api/rest";
import {
    guessHandlers,
    metaHandlers,
    puzzleArchiveHandlers,
    revealHandlers,
    stationsHandlers,
    todayPuzzleHandlers,
    unknownOperationHandlers,
} from "@/lib/api/v1-handlers";
import {
    guessOutputSchema,
    metaOutputSchema,
    puzzleArchiveOutputSchema,
    revealOutputSchema,
    stationsOutputSchema,
    todayPuzzleOutputSchema,
} from "@/lib/game/schemas";
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

    it("is kept by the CDN and a client until the next puzzle starts", async () => {
        const response = await call(todayPuzzleHandlers.GET, path, "GET", {
            network: "nl",
        });

        // 12:00Z to 22:00Z, Amsterdam's midnight in summer time.
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=36000");
        expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
            "public, max-age=36000",
        );
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
        expect(response.headers.get("Cache-Control")).toBe("no-store");
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

describe("GET /api/v1/{network}/puzzles", () => {
    const path = "/api/v1/nl/puzzles";

    it("answers 200 with every puzzle up to today's, never kept", async () => {
        const response = await call(puzzleArchiveHandlers.GET, path, "GET", {
            network: "nl",
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        const json: unknown = await response.json();
        expect(puzzleArchiveOutputSchema.parse(json)).toEqual({
            network: "nl",
            puzzles: [
                { number: 1, date: "2026-06-18" },
                { number: 2, date: "2026-06-19" },
            ],
        });
        // Puzzle 1's and 2's mystery stations.
        expect(JSON.stringify(json)).not.toContain("chr");
        expect(JSON.stringify(json)).not.toContain("ech");
    });

    it("answers 400 invalid_input for a network the game has no data for", async () => {
        const response = await call(
            puzzleArchiveHandlers.GET,
            "/api/v1/be/puzzles",
            "GET",
            { network: "be" },
        );

        expect(response.status).toBe(400);
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "invalid_input",
        );
    });

    it("answers 405 method_not_allowed for another method", async () => {
        const response = await call(puzzleArchiveHandlers.ANY, path, "POST", {
            network: "nl",
        });

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("GET");
    });
});

describe("POST /api/v1/{network}/puzzles/{n}/guesses", () => {
    /** A POST of `body` to puzzle `number`'s guesses. */
    function post(body: string, number = "2"): Promise<Response> {
        return guessHandlers.POST({
            request: new Request(
                new URL(`/api/v1/nl/puzzles/${number}/guesses`, "http://localhost"),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                },
            ),
            params: { network: "nl", number },
        });
    }

    it("answers 200 with the trip, its unguessed changes hidden", async () => {
        const response = await post(
            JSON.stringify({ guess: "dlt", earlierGuesses: ["chr"] }),
        );

        expect(response.status).toBe(200);
        const json: unknown = await response.json();
        expect(guessOutputSchema.parse(json)).toMatchObject({
            number: 2,
            guess: "dlt",
            correct: false,
            totalMinutes: 69,
        });
        // Puzzle 2's mystery station.
        expect(JSON.stringify(json)).not.toContain("ech");
    });

    it("takes the puzzle from the path, not the body", async () => {
        const response = await post(JSON.stringify({ guess: "dlt", number: 3 }));

        expect(response.status).toBe(200);
    });

    it("answers 404 not_found for a puzzle after today's", async () => {
        const response = await post(JSON.stringify({ guess: "dlt" }), "3");

        expect(response.status).toBe(404);
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "not_found",
        );
    });

    it("answers 400 invalid_input for a station that does not exist", async () => {
        const response = await post(JSON.stringify({ guess: "xyz" }));

        expect(response.status).toBe(400);
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "invalid_input",
        );
    });

    it("answers 400 invalid_input for a body that is not a JSON object", async () => {
        for (const body of ["not json", "[]", "null"]) {
            const response = await post(body);

            expect(response.status).toBe(400);
            expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
                "invalid_input",
            );
        }
    });

    it("answers 405 method_not_allowed for another method", async () => {
        const response = await call(
            guessHandlers.ANY,
            "/api/v1/nl/puzzles/2/guesses",
            "GET",
            { network: "nl", number: "2" },
        );

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("POST");
    });
});

describe("POST /api/v1/{network}/puzzles/{n}/reveal", () => {
    /** A POST of `body` to puzzle `number`'s reveal. */
    function post(body: string, number = "2"): Promise<Response> {
        return revealHandlers.POST({
            request: new Request(
                new URL(`/api/v1/nl/puzzles/${number}/reveal`, "http://localhost"),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                },
            ),
            params: { network: "nl", number },
        });
    }

    it("answers 200 with the station and full trips of a finished game", async () => {
        const response = await post(JSON.stringify({ guesses: ["dlt", "ech"] }));

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        const json: unknown = await response.json();
        expect(revealOutputSchema.parse(json)).toMatchObject({
            number: 2,
            station: "ech",
            solved: true,
            guesses: [
                {
                    guess: "dlt",
                    steps: [
                        { kind: "ride" },
                        { kind: "change", station: "chr" },
                        { kind: "ride" },
                        { kind: "change", station: "alf" },
                        { kind: "ride" },
                    ],
                    totalMinutes: 69,
                },
                { guess: "ech", correct: true },
            ],
        });
    });

    it("answers 403 game_not_over and no answer before the game is over", async () => {
        const response = await post(
            JSON.stringify({ guesses: ["alf", "brv", "chr", "dlt"] }),
        );

        expect(response.status).toBe(403);
        const json: unknown = await response.json();
        expect(apiErrorBodySchema.parse(json).error.code).toBe("game_not_over");
        // Puzzle 2's mystery station.
        expect(JSON.stringify(json)).not.toContain("ech");
    });

    it("answers 404 not_found for a puzzle after today's", async () => {
        const response = await post(JSON.stringify({ guesses: ["alf"] }), "3");

        expect(response.status).toBe(404);
    });

    it("answers 405 method_not_allowed for another method", async () => {
        const response = await call(
            revealHandlers.ANY,
            "/api/v1/nl/puzzles/2/reveal",
            "GET",
            { network: "nl", number: "2" },
        );

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("POST");
    });
});

describe("GET /api/v1/{network}/stations", () => {
    const path = "/api/v1/nl/stations";

    it("answers 200 with every guessable station, kept by the CDN", async () => {
        const response = await call(stationsHandlers.GET, path, "GET", {
            network: "nl",
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400");
        expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe(
            "public, max-age=31536000",
        );
        const body = stationsOutputSchema.parse(await response.json());
        expect(body.locale).toBe("nl");
        expect(body.stations).toHaveLength(5);
    });

    it("reads the locale from the query string", async () => {
        const response = await call(
            stationsHandlers.GET,
            `${path}?locale=en`,
            "GET",
            { network: "nl" },
        );

        expect(response.status).toBe(200);
        expect(stationsOutputSchema.parse(await response.json()).locale).toBe("en");
    });

    it("answers 400 invalid_input, never kept, for a locale the site does not have", async () => {
        const response = await call(
            stationsHandlers.GET,
            `${path}?locale=de`,
            "GET",
            { network: "nl" },
        );

        expect(response.status).toBe(400);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(response.headers.get("Vercel-CDN-Cache-Control")).toBeNull();
        const body = apiErrorBodySchema.parse(await response.json());
        expect(body.error.code).toBe("invalid_input");
        expect(body.error.message).toContain("locale");
    });

    it("answers 500 internal_error, never kept, when the data fails", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(serviceContext.data, "stations").mockRejectedValue(
            new Error("nl/stations.json is missing from the data directory"),
        );

        const response = await call(stationsHandlers.GET, path, "GET", {
            network: "nl",
        });

        expect(response.status).toBe(500);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("answers 405 method_not_allowed for another method", async () => {
        const response = await call(stationsHandlers.ANY, path, "POST", {
            network: "nl",
        });

        expect(response.status).toBe(405);
        expect(response.headers.get("Allow")).toBe("GET");
    });
});

describe("the rate limit on a guess and the reveal", () => {
    /** A POST of a guess at puzzle 2 from `ip`. */
    function guessFrom(ip: string): Promise<Response> {
        return guessHandlers.POST({
            request: new Request("http://localhost/api/v1/nl/puzzles/2/guesses", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-real-ip": ip },
                body: JSON.stringify({ guess: "dlt" }),
            }),
            params: { network: "nl", number: "2" },
        });
    }

    it("answers 429 rate_limited with Retry-After past the limit, and logs it once", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        for (let hit = 0; hit < 60; hit += 1) {
            expect((await guessFrom("203.0.113.1")).status).toBe(200);
        }

        const refused = await guessFrom("203.0.113.1");
        const again = await guessFrom("203.0.113.1");

        expect(refused.status).toBe(429);
        expect(apiErrorBodySchema.parse(await refused.json()).error.code).toBe(
            "rate_limited",
        );
        expect(Number(refused.headers.get("Retry-After"))).toBeGreaterThan(0);
        expect(refused.headers.get("Cache-Control")).toBe("no-store");
        expect(again.status).toBe(429);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]?.[1]).toMatchObject({ ip: "203.0.113.1" });
    });

    it("counts each IP on its own", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        for (let hit = 0; hit < 61; hit += 1) {
            await guessFrom("203.0.113.2");
        }

        expect((await guessFrom("203.0.113.3")).status).toBe(200);
    });

    it("shares one limit between a guess and the reveal", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        for (let hit = 0; hit < 60; hit += 1) {
            await guessFrom("203.0.113.4");
        }

        const response = await revealHandlers.POST({
            request: new Request("http://localhost/api/v1/nl/puzzles/2/reveal", {
                method: "POST",
                headers: { "x-real-ip": "203.0.113.4" },
                body: JSON.stringify({ guesses: ["ech"] }),
            }),
            params: { network: "nl", number: "2" },
        });

        expect(response.status).toBe(429);
    });
});

describe("a cross-origin browser call", () => {
    /** A GET of the stations with `headers`. */
    function stations(headers: Record<string, string>): Promise<Response> {
        return stationsHandlers.GET({
            request: new Request("http://localhost/api/v1/nl/stations", { headers }),
            params: { network: "nl" },
        });
    }

    it("answers 403 cross_origin, without CORS headers, for another origin", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});

        const response = await stations({ Origin: "https://scraper.example" });

        expect(response.status).toBe(403);
        expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(
            "cross_origin",
        );
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("refuses a preflight from another origin", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});

        const response = await guessHandlers.ANY({
            request: new Request("http://localhost/api/v1/nl/puzzles/2/guesses", {
                method: "OPTIONS",
                headers: {
                    Origin: "https://scraper.example",
                    "Access-Control-Request-Method": "POST",
                },
            }),
            params: { network: "nl", number: "2" },
        });

        expect(response.status).toBe(403);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("refuses an Origin of null", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});

        expect((await stations({ Origin: "null" })).status).toBe(403);
    });

    it("answers the site's own origin and a call without Origin, such as iOS", async () => {
        expect((await stations({ Origin: "http://localhost" })).status).toBe(200);
        expect((await stations({})).status).toBe(200);
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
