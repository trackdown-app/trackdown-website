// Relative, with its extension: `vite.config.ts` loads this file, outside
// the `@/` alias.
import { posthogApiHost } from "./analytics/posthog-hosts.ts";

/**
 * The security headers the site sends. `src/server.ts` puts them, with a
 * per-request Content-Security-Policy, on everything the Start handler
 * answers: pages, the API, server functions, the consent form, the sitemap
 * and `robots.txt`. `vite.config.ts` gives the static files Nitro (or
 * Vercel) serves itself the same headers through a route rule, without the
 * policy, which only matters for documents. See docs/errors-and-headers.md.
 */

/**
 * One year, subdomains included. Browsers only honour it over https, so it
 * does nothing on http://localhost.
 */
const STRICT_TRANSPORT_SECURITY = "max-age=31536000; includeSubDomains";

/** Browser features the site never uses, switched off for every frame. */
const PERMISSIONS_POLICY = [
    "camera=()",
    "geolocation=()",
    "microphone=()",
    "payment=()",
    "usb=()",
].join(", ");

/** The headers every response carries, documents and static files alike. */
export const staticSecurityHeaders: Readonly<Record<string, string>> = {
    "Strict-Transport-Security": STRICT_TRANSPORT_SECURITY,
    "X-Content-Type-Options": "nosniff",
    // The policy's `frame-ancestors 'none'` says the same to any browser that
    // reads it; this covers the static files, which carry no policy.
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": PERMISSIONS_POLICY,
};

/**
 * The hosts of the Vercel Toolbar, which Vercel injects into preview
 * deployments for signed-in team members. Allowed on Preview only, so the
 * toolbar works there without CSP errors; production never names them.
 * The list is Vercel's own:
 * https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy
 */
const vercelToolbarHosts = {
    script: ["https://vercel.live"],
    style: ["https://vercel.live"],
    img: ["https://vercel.live", "https://vercel.com", "data:", "blob:"],
    font: ["https://vercel.live", "https://assets.vercel.com"],
    connect: ["https://vercel.live", "wss://ws-us3.pusher.com"],
    frame: ["https://vercel.live"],
} as const satisfies Record<string, readonly string[]>;

export type ContentSecurityPolicyOptions = {
    /** Whether the Vercel Toolbar's hosts are allowed (Preview only). */
    vercelToolbar?: boolean;
};

/** 128 random bits, base64-encoded: a fresh script nonce for one response. */
export function createCspNonce(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes));
}

/** One directive: its name and its sources, separated by spaces. */
function directive(name: string, ...sources: readonly string[]): string {
    return [name, ...sources].join(" ");
}

/**
 * Allows only what the site loads: its own scripts, styles, fonts and images,
 * plus the inline scripts TanStack Start and the theme initializer write
 * into the page, which carry the nonce, and the PostHog proxy: posthog-js
 * sends events to it and loads its remote configuration from it as a
 * script.
 *
 * `style-src` allows `'unsafe-inline'`: the trip line, the guess rows'
 * time grid, the progress dots and the guess distribution position and
 * size themselves with `style` attributes the server renders, which the
 * policy would otherwise block. Styles cannot run code, so scripts keep the
 * strict rule.
 */
export function contentSecurityPolicy(
    nonce: string,
    options: ContentSecurityPolicyOptions = {},
): string {
    const toolbar = options.vercelToolbar === true;
    function extra(hosts: readonly string[]): readonly string[] {
        return toolbar ? hosts : [];
    }
    return [
        directive("default-src", "'self'"),
        directive(
            "script-src",
            "'self'",
            `'nonce-${nonce}'`,
            posthogApiHost,
            ...extra(vercelToolbarHosts.script),
        ),
        directive(
            "style-src",
            "'self'",
            "'unsafe-inline'",
            ...extra(vercelToolbarHosts.style),
        ),
        directive("img-src", "'self'", ...extra(vercelToolbarHosts.img)),
        directive("font-src", "'self'", ...extra(vercelToolbarHosts.font)),
        directive(
            "connect-src",
            "'self'",
            posthogApiHost,
            ...extra(vercelToolbarHosts.connect),
        ),
        directive("frame-src", "'self'", ...extra(vercelToolbarHosts.frame)),
        directive("object-src", "'none'"),
        directive("base-uri", "'self'"),
        directive("form-action", "'self'"),
        directive("frame-ancestors", "'none'"),
    ].join("; ");
}

/**
 * The headers for one response. Without a nonce there is no
 * Content-Security-Policy: the development server sends none, because Vite
 * injects inline scripts of its own that cannot carry the nonce.
 */
export function securityHeaders(
    nonce?: string,
    options: ContentSecurityPolicyOptions = {},
): Record<string, string> {
    if (nonce == null) {
        return { ...staticSecurityHeaders };
    }
    return {
        ...staticSecurityHeaders,
        "Content-Security-Policy": contentSecurityPolicy(nonce, options),
    };
}

/**
 * Returns the response with the security headers set, replacing any the
 * handler set itself. The response is copied rather than changed, because
 * some responses (`Response.redirect()`, `fetch()`) have immutable headers.
 */
export function withSecurityHeaders(
    response: Response,
    nonce?: string,
    options: ContentSecurityPolicyOptions = {},
): Response {
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(securityHeaders(nonce, options))) {
        headers.set(name, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
