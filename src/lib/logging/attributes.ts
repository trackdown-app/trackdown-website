import { z } from "zod";
import type { Attributes } from "@opentelemetry/api";
import { ApiError, apiErrorCodeSchema } from "@/lib/api/api-error";
import { networkIdSchema } from "@/lib/data/networks";

export const functionNameSchema = z.enum([
    "getConsentFn",
    "getMetaFn",
    "getTodayPuzzleFn",
    "getPuzzleArchiveFn",
    "getStationsFn",
    "submitGuessFn",
    "revealAnswerFn",
    "unknown",
]);

export const routeSchema = z.enum([
    "/consent",
    "/",
    "/hoe-te-spelen",
    "/archief",
    "/archief/{number}",
    "/api/v1/meta",
    "/api/v1/openapi.json",
    "/api/v1/{network}/stations",
    "/api/v1/{network}/puzzles",
    "/api/v1/{network}/puzzles/today",
    "/api/v1/{network}/puzzles/{number}/guesses",
    "/api/v1/{network}/puzzles/{number}/reveal",
    "/_serverFn/{id}",
    "unknown",
]);

// Values as well as keys are constrained: an attacker cannot put a station
// code in a URL, an error message or an otherwise approved string field.
const attributesSchema = z.object({
    "http.request.method": z
        .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "OTHER"])
        .optional(),
    "http.response.status_code": z.number().int().min(100).max(599).optional(),
    "http.server.request.duration_ms": z.number().nonnegative().optional(),
    "http.route": routeSchema.optional(),
    "request.kind": z.enum(["page", "api", "server-function", "unknown"]).optional(),
    "code.function.name": functionNameSchema.optional(),
    "trackdown.network": networkIdSchema.optional(),
    "trackdown.puzzle.number": z.number().int().positive().optional(),
    "trackdown.outcome": z
        .enum(["ok", "refused", "error", "cancelled", ...apiErrorCodeSchema.options])
        .optional(),
    "error.type": z
        .enum(["internal_error", ...apiErrorCodeSchema.options])
        .optional(),
});

export type TelemetryAttributes = z.output<typeof attributesSchema>;

/** Last boundary before console output or the span batch; unknown fields disappear. */
export function safeAttributes(attributes: Attributes): TelemetryAttributes {
    const parsed = attributesSchema.safeParse(attributes);
    return parsed.success ? parsed.data : {};
}

/** Never inspect an error's message, stack, cause, name or custom properties. */
export function errorAttributes(error: unknown): TelemetryAttributes {
    const code = error instanceof ApiError ? error.code : "internal_error";
    return { "error.type": code, "trackdown.outcome": code };
}

/** Only the network and puzzle number may leave an operation's input. */
export function operationAttributes(input: unknown): TelemetryAttributes {
    if (typeof input !== "object" || input == null) return {};
    const network = networkIdSchema.safeParse(
        "network" in input ? input.network : undefined,
    );
    const number = z.coerce
        .number()
        .int()
        .positive()
        .safeParse("number" in input ? input.number : undefined);
    return {
        ...(network.success ? { "trackdown.network": network.data } : {}),
        ...(number.success ? { "trackdown.puzzle.number": number.data } : {}),
    };
}
