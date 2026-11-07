import { z } from "zod";

// The one error format of every API answer (docs/api.md#errors). Holds no
// server code, so the iOS app's contract and the browser can both read it.

/** What went wrong, for code to branch on. Each code has one HTTP status. */
export const apiErrorCodeSchema = z.enum([
    "invalid_input",
    "game_not_over",
    "not_found",
    "method_not_allowed",
    "internal_error",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorStatus: Record<ApiErrorCode, number> = {
    invalid_input: 400,
    game_not_over: 403,
    not_found: 404,
    method_not_allowed: 405,
    internal_error: 500,
};

/** The body of every error answer: `{ error: { code, message } }`. */
export const apiErrorBodySchema = z.object({
    error: z.object({
        code: apiErrorCodeSchema,
        /** For a developer reading the logs, not for a player. */
        message: z.string(),
    }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

/**
 * An error a service throws on purpose, with the code its answer carries. Any
 * other error is answered as `internal_error`, without its message.
 */
export class ApiError extends Error {
    override name = "ApiError";

    constructor(
        readonly code: ApiErrorCode,
        message: string,
    ) {
        super(message);
    }

    get status(): number {
        return apiErrorStatus[this.code];
    }

    toBody(): ApiErrorBody {
        return { error: { code: this.code, message: this.message } };
    }
}
