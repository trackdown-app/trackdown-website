import { describe, expect, it, vi } from "vitest";
import { posthogApiHost } from "@/lib/analytics/posthog-hosts";
import {
    contentSecurityPolicy,
    createCspNonce,
    staticSecurityHeaders,
    withSecurityHeaders,
} from "@/lib/security-headers";

/** The policy's directives by name, e.g. `script-src` to `['self' 'nonce-…']`. */
function parsePolicy(policy: string): Map<string, readonly string[]> {
    return new Map(
        policy.split(";").map((part) => {
            const [name = "", ...sources] = part.trim().split(/\s+/);
            return [name, sources];
        }),
    );
}

describe("withSecurityHeaders", () => {
    it("sets the transport, sniffing, framing, referrer and permissions headers", () => {
        const { headers } = withSecurityHeaders(new Response("ok"), "abc");

        expect(headers.get("Strict-Transport-Security")).toBe(
            "max-age=31536000; includeSubDomains",
        );
        expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(headers.get("X-Frame-Options")).toBe("DENY");
        expect(headers.get("Referrer-Policy")).toBe(
            "strict-origin-when-cross-origin",
        );
        expect(headers.get("Permissions-Policy")).toContain("camera=()");
        expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
    });

    it("sends a Content-Security-Policy with the response's nonce", () => {
        const { headers } = withSecurityHeaders(new Response("ok"), "abc");

        expect(headers.get("Content-Security-Policy")).toBe(
            contentSecurityPolicy("abc"),
        );
    });

    it("sends no Content-Security-Policy without a nonce", () => {
        const { headers } = withSecurityHeaders(new Response("ok"));

        expect(headers.has("Content-Security-Policy")).toBe(false);
        expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("keeps the status, body and the handler's own headers", async () => {
        const response = withSecurityHeaders(
            new Response("<h1>Not found</h1>", {
                status: 404,
                statusText: "Not Found",
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "private, no-store",
                },
            }),
            "abc",
        );

        expect(response.status).toBe(404);
        expect(response.statusText).toBe("Not Found");
        expect(response.headers.get("Content-Type")).toBe(
            "text/html; charset=utf-8",
        );
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(await response.text()).toBe("<h1>Not found</h1>");
    });

    it("replaces a security header the handler set itself", () => {
        const { headers } = withSecurityHeaders(
            new Response("ok", { headers: { "Referrer-Policy": "unsafe-url" } }),
        );

        expect(headers.get("Referrer-Policy")).toBe(
            "strict-origin-when-cross-origin",
        );
    });

    it("works on a response with immutable headers", () => {
        const redirect = Response.redirect("https://trackdown.nl/nl", 307);

        const response = withSecurityHeaders(redirect, "abc");

        expect(response.status).toBe(307);
        expect(response.headers.get("Location")).toBe("https://trackdown.nl/nl");
        expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
});

describe("staticSecurityHeaders", () => {
    it("carries no Content-Security-Policy", () => {
        expect(Object.keys(staticSecurityHeaders)).not.toContain(
            "Content-Security-Policy",
        );
    });
});

describe("contentSecurityPolicy", () => {
    it("allows only the site, the nonce's inline scripts and PostHog's proxy", () => {
        const policy = parsePolicy(contentSecurityPolicy("abc"));

        expect(policy.get("default-src")).toEqual(["'self'"]);
        expect(policy.get("script-src")).toEqual([
            "'self'",
            "'nonce-abc'",
            posthogApiHost,
        ]);
        expect(policy.get("connect-src")).toEqual(["'self'", posthogApiHost]);
        expect(policy.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
        expect(policy.get("img-src")).toEqual(["'self'"]);
        expect(policy.get("font-src")).toEqual(["'self'"]);
        expect(policy.get("frame-src")).toEqual(["'self'"]);
        expect(policy.get("object-src")).toEqual(["'none'"]);
        expect(policy.get("base-uri")).toEqual(["'self'"]);
        expect(policy.get("form-action")).toEqual(["'self'"]);
        expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    });

    it("never allows eval or inline scripts without the nonce", () => {
        const scripts = parsePolicy(contentSecurityPolicy("abc")).get("script-src");

        expect(scripts).not.toContain("'unsafe-eval'");
        expect(scripts).not.toContain("'unsafe-inline'");
    });

    it("names no Vercel host unless the toolbar is allowed", () => {
        expect(contentSecurityPolicy("abc")).not.toContain("vercel");
    });

    it("allows the Vercel Toolbar's hosts on Preview", () => {
        const policy = parsePolicy(
            contentSecurityPolicy("abc", { vercelToolbar: true }),
        );

        expect(policy.get("script-src")).toContain("https://vercel.live");
        expect(policy.get("connect-src")).toContain("wss://ws-us3.pusher.com");
        expect(policy.get("frame-src")).toContain("https://vercel.live");
        expect(policy.get("font-src")).toContain("https://assets.vercel.com");
        expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    });
});

describe("createCspNonce", () => {
    it("returns 128 random bits as base64", () => {
        const nonce = createCspNonce();

        expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
        expect(atob(nonce)).toHaveLength(16);
    });

    it("returns a different nonce every time", () => {
        const spy = vi.spyOn(crypto, "getRandomValues");

        expect(createCspNonce()).not.toBe(createCspNonce());
        expect(spy).toHaveBeenCalledTimes(2);
        spy.mockRestore();
    });
});
