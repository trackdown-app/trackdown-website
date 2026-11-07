import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "@/lib/zod";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("z from @/lib/zod", () => {
    it("runs jitless", () => {
        expect(z.config().jitless).toBe(true);
    });

    it("builds and parses an object schema without calling Function", () => {
        // The browser blocks `Function` under the Content-Security-Policy;
        // a stub that throws stands in for it.
        const blocked = vi.fn(() => {
            throw new EvalError("Refused to evaluate a string as JavaScript");
        });
        vi.stubGlobal("Function", blocked);

        const schema = z.object({ name: z.string(), guesses: z.number() });

        expect(schema.parse({ name: "Utrecht", guesses: 3 })).toEqual({
            name: "Utrecht",
            guesses: 3,
        });
        expect(blocked).not.toHaveBeenCalled();
    });
});
