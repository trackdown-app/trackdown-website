import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimit } from "@/lib/api/rate-limit";

// TanStack Pacer reads `Date.now()` and sets timers, so the clock is faked.
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T12:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

describe("RateLimit", () => {
    it("allows `limit` hits in a window and refuses the next", () => {
        const limit = new RateLimit({ limit: 3, windowMs: 60_000 });

        expect([limit.hit("a"), limit.hit("a"), limit.hit("a")]).toEqual([
            { allowed: true },
            { allowed: true },
            { allowed: true },
        ]);
        expect(limit.hit("a")).toEqual({
            allowed: false,
            retryAfterSeconds: 60,
            firstRefusal: true,
        });
    });

    it("reports only the window's first refusal as first", () => {
        const limit = new RateLimit({ limit: 1, windowMs: 60_000 });
        limit.hit("a");

        expect(limit.hit("a")).toMatchObject({ firstRefusal: true });
        vi.advanceTimersByTime(20_000);
        expect(limit.hit("a")).toEqual({
            allowed: false,
            retryAfterSeconds: 40,
            firstRefusal: false,
        });
    });

    it("allows the key again once its window has ended", () => {
        const limit = new RateLimit({ limit: 1, windowMs: 60_000 });
        limit.hit("a");
        limit.hit("a");

        vi.advanceTimersByTime(60_001);

        expect(limit.hit("a")).toEqual({ allowed: true });
        expect(limit.hit("a")).toMatchObject({ allowed: false, firstRefusal: true });
    });

    it("counts each key on its own", () => {
        const limit = new RateLimit({ limit: 1, windowMs: 60_000 });
        limit.hit("a");

        expect(limit.hit("b")).toEqual({ allowed: true });
        expect(limit.hit("a")).toMatchObject({ allowed: false });
    });
});
