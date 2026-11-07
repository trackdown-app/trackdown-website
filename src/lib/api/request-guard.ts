// Marks this module server-only: it guards requests on the server.
import "@tanstack/react-start/server-only";
import { ApiError } from "@/lib/api/api-error";
import { RateLimit } from "@/lib/api/rate-limit";

// The API's abuse protection (docs/api.md#abuse-protection): browsers may only
// call it from the site's own origin, and the game operations (a guess, the
// reveal) are rate limited per IP, so scraping the trips is slow and shows up
// in the logs.

/** A guess or a reveal: 60 a minute per IP, ten games' worth. */
export const gameRateLimit = new RateLimit({ limit: 60, windowMs: 60_000 });

/**
 * The IP the request came from. Vercel sets `x-real-ip` and overwrites
 * `x-forwarded-for` itself, so a client cannot pick its own; elsewhere
 * (locally, in a test) every request without them shares `unknown`.
 */
export function clientIp(request: Request): string {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp != null && realIp !== "") {
        return realIp;
    }
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded != null && forwarded !== "") {
        return forwarded;
    }
    return "unknown";
}

/**
 * `cross_origin` for a browser call from another origin, else `null`. A
 * browser sends `Origin` on every cross-origin call (a preflight included); a
 * call without it is a same-origin page load or not a browser at all, such as
 * the iOS app. The site's own origin is the request's own host.
 */
export function crossOriginError(request: Request): ApiError | null {
    const origin = request.headers.get("Origin");
    if (origin == null) {
        return null;
    }
    const url = new URL(request.url);
    if (originHost(origin) === url.host) {
        return null;
    }
    console.warn("API abuse: a cross-origin call was refused", {
        origin,
        path: url.pathname,
        ip: clientIp(request),
    });
    return new ApiError(
        "cross_origin",
        `${url.pathname} only answers browsers on its own origin`,
    );
}

/** The host of an `Origin` header, or `null` for `null` or one that is not a URL. */
function originHost(origin: string): string | null {
    try {
        return new URL(origin).host;
    } catch {
        return null;
    }
}

export type RateLimitRefusal = { error: ApiError; retryAfterSeconds: number };

/**
 * Counts one hit of `request`'s IP against `limit`: `null` while it is within
 * the limit, else the `rate_limited` error and how long until it may try
 * again. The window's first refused hit is logged, so a scraper shows up once
 * a minute instead of flooding the logs.
 */
export function rateLimitRefusal(
    request: Request,
    limit: RateLimit = gameRateLimit,
): RateLimitRefusal | null {
    const ip = clientIp(request);
    const result = limit.hit(ip);
    if (result.allowed) {
        return null;
    }
    if (result.firstRefusal) {
        console.warn("API abuse: an IP passed the rate limit", {
            ip,
            path: new URL(request.url).pathname,
            limit: limit.limit,
            windowMs: limit.windowMs,
        });
    }
    return {
        error: new ApiError(
            "rate_limited",
            `more than ${limit.limit} calls in ${limit.windowMs / 1000} seconds; try again in ${result.retryAfterSeconds} seconds`,
        ),
        retryAfterSeconds: result.retryAfterSeconds,
    };
}

/**
 * Both guards for a server function's request, which the web calls on its
 * own origin: throws the first error, so it reaches the web's mutation as a
 * thrown error, like a service's.
 */
export function guardGameRequest(request: Request): void {
    const crossOrigin = crossOriginError(request);
    if (crossOrigin != null) {
        throw crossOrigin;
    }
    const refusal = rateLimitRefusal(request);
    if (refusal != null) {
        throw refusal.error;
    }
}
