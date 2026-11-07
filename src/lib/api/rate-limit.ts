import { RateLimiter } from "@tanstack/pacer";

/**
 * A rate limit per key (an IP): at most `limit` hits in each fixed window of
 * `windowMs` (docs/api.md#rate-limit). Each key gets its own TanStack Pacer
 * `RateLimiter`, which only limits one thing; this keeps one per key.
 *
 * It lives in the memory of one server instance, so on Vercel each warm
 * instance counts on its own: it slows a scraper down and makes it visible,
 * it is not an exact global count.
 */
export type RateLimitOptions = {
    limit: number;
    windowMs: number;
};

export type RateLimitResult =
    | { allowed: true }
    | {
          allowed: false;
          /** Seconds until the key's window ends and it may try again. */
          retryAfterSeconds: number;
          /** Whether this is the window's first refused hit, to log it once. */
          firstRefusal: boolean;
      };

type KeyLimit = {
    limiter: RateLimiter<() => void>;
    /** The start of the last window a refusal was reported in. */
    refusedWindow: number | null;
};

/** How many keys may be held before the ones with an ended window are swept out. */
const sweepAt = 10_000;

export class RateLimit {
    readonly limit: number;
    readonly windowMs: number;
    readonly #keys = new Map<string, KeyLimit>();

    constructor({ limit, windowMs }: RateLimitOptions) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    /** Counts one hit for `key` and says whether it is allowed. */
    hit(key: string): RateLimitResult {
        const keyLimit = this.#keyLimit(key);
        const { limiter } = keyLimit;
        if (limiter.maybeExecute()) {
            return { allowed: true };
        }
        const windowStart = limiter.store.state.executionTimes[0] ?? 0;
        const firstRefusal = keyLimit.refusedWindow !== windowStart;
        keyLimit.refusedWindow = windowStart;
        return {
            allowed: false,
            retryAfterSeconds: Math.max(
                1,
                Math.ceil(limiter.getMsUntilNextWindow() / 1000),
            ),
            firstRefusal,
        };
    }

    #keyLimit(key: string): KeyLimit {
        const existing = this.#keys.get(key);
        if (existing != null) {
            return existing;
        }
        if (this.#keys.size >= sweepAt) {
            this.#sweep();
        }
        const created: KeyLimit = {
            limiter: new RateLimiter(() => {}, {
                limit: this.limit,
                window: this.windowMs,
                windowType: "fixed",
            }),
            refusedWindow: null,
        };
        this.#keys.set(key, created);
        return created;
    }

    /** Drops every key whose window has ended, so the map cannot grow without end. */
    #sweep(): void {
        for (const [key, { limiter }] of this.#keys) {
            if (limiter.getRemainingInWindow() === this.limit) {
                limiter.reset();
                this.#keys.delete(key);
            }
        }
    }
}
